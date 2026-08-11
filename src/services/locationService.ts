import { CONFIG } from '@/config/env';
import {
  searchAddresses as searchLocalAddresses,
  upsertAddress,
} from '@/db/addressRepository';
import type { Address, AddressSuggestion } from '@/models/types';
import { createId } from '@/utils/id';

import { fetchJson, GoogleApiError } from './googleClient';
import { mockRemoteSearch } from './mock/mockAddresses';

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  locationService — the ONLY place that talks to address search / geocode.  │
 * │                                                                            │
 * │  Phase 2: real Google Places (New) autocomplete + Place Details are wired  │
 * │  in below. Everything is still gated on CONFIG.MOCK_MODE, so the app runs  │
 * │  unchanged with fake data until keys are configured.                       │
 * │                                                                            │
 * │  Google Cloud APIs to enable: "Places API (New)".                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

const PLACES_BASE = 'https://places.googleapis.com/v1';

/** Turn a saved Address row into a suggestion tagged as an instant local hit. */
const addressToSuggestion = (a: Address): AddressSuggestion => ({
  id: a.id,
  label: a.label,
  formattedAddress: a.formattedAddress,
  latitude: a.latitude,
  longitude: a.longitude,
  source: 'local',
  placeId: null,
});

/**
 * Smart address search.
 *
 * Strategy (the "smart" part of the requirement):
 *   1. Query the local SQLite address book first — instant, offline, free.
 *   2. Only if the local book has NO match do we fall back to the external API.
 *
 * This keeps the common case (a driver's regular customers) lightning fast and
 * avoids burning Places API quota on addresses we already know.
 */
export async function searchAddressSuggestions(
  query: string,
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < CONFIG.MIN_QUERY_LENGTH) return [];

  // 1) Local-first.
  const local = await searchLocalAddresses(trimmed);
  if (local.length > 0) {
    return local.map(addressToSuggestion);
  }

  // 2) Fallback to the external provider.
  return remoteSearch(trimmed);
}

/**
 * External-provider search.
 *
 * MOCK: hardcoded places (already carry coordinates).
 * REAL: Google Places (New) Autocomplete — returns predictions WITHOUT
 * coordinates, so each remote suggestion carries its `placeId` and its
 * lat/lng stay 0 until resolveSuggestion() runs at selection time.
 */
async function remoteSearch(query: string): Promise<AddressSuggestion[]> {
  if (CONFIG.MOCK_MODE) {
    // Simulate a little network latency so loading states are exercised.
    await delay(180);
    return mockRemoteSearch(query);
  }

  if (!CONFIG.GOOGLE_PLACES_API_KEY) {
    throw new GoogleApiError(
      'Missing Google Places API key. Set expo.extra.googlePlacesApiKey.',
    );
  }

  const data = await fetchJson<AutocompleteResponse>(
    `${PLACES_BASE}/places:autocomplete`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': CONFIG.GOOGLE_PLACES_API_KEY,
      },
      body: {
        input: query,
        // One session token spans a whole "type → pick" interaction so Google
        // bills the autocomplete keystrokes + the details lookup as one event.
        sessionToken: getSessionToken(),
      },
    },
  );

  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is PlacePrediction => Boolean(p?.placeId))
    .map((p) => ({
      id: p.placeId,
      placeId: p.placeId,
      label: p.structuredFormat?.mainText?.text ?? null,
      formattedAddress: p.text?.text ?? p.structuredFormat?.mainText?.text ?? '',
      // Coordinates are unknown until Place Details resolves them.
      latitude: 0,
      longitude: 0,
      source: 'remote' as const,
    }));
}

/**
 * Resolve a suggestion to real coordinates.
 *
 * Local suggestions (and mock remote ones) already have coordinates, so this is
 * a no-op for them. A real remote suggestion carries only a placeId, so we call
 * Place Details to fetch its location + canonical address, then close the
 * autocomplete billing session.
 */
export async function resolveSuggestion(
  suggestion: AddressSuggestion,
): Promise<AddressSuggestion> {
  const alreadyResolved =
    suggestion.source === 'local' ||
    (suggestion.latitude !== 0 && suggestion.longitude !== 0);

  if (CONFIG.MOCK_MODE || alreadyResolved || !suggestion.placeId) {
    return suggestion;
  }

  if (!CONFIG.GOOGLE_PLACES_API_KEY) {
    throw new GoogleApiError(
      'Missing Google Places API key. Set expo.extra.googlePlacesApiKey.',
    );
  }

  try {
    const details = await fetchJson<PlaceDetailsResponse>(
      `${PLACES_BASE}/places/${encodeURIComponent(suggestion.placeId)}` +
        `?sessionToken=${encodeURIComponent(getSessionToken())}`,
      {
        headers: {
          'X-Goog-Api-Key': CONFIG.GOOGLE_PLACES_API_KEY,
          // Ask only for the fields we use to keep the request in a cheap tier.
          'X-Goog-FieldMask': 'id,formattedAddress,location,displayName',
        },
      },
    );

    if (!details.location) {
      throw new GoogleApiError('Place has no location data.');
    }

    return {
      ...suggestion,
      latitude: details.location.latitude,
      longitude: details.location.longitude,
      formattedAddress: details.formattedAddress ?? suggestion.formattedAddress,
      label: suggestion.label ?? details.displayName?.text ?? null,
    };
  } finally {
    // A details lookup ends the session; the next search starts a fresh one.
    endSession();
  }
}

/**
 * Persist a chosen suggestion to the local address book.
 *
 * Called after the user selects a suggestion. For a remote hit this resolves
 * its coordinates (Place Details) and then saves it — that's what
 * "automatically save it for future use" means: next time the same address is
 * typed it comes back instantly from the local-first step above. For a local
 * hit this just bumps its usage stats (via upsert dedupe on coordinates).
 *
 * Returns the canonical saved Address (with its local id).
 */
export async function saveSuggestionToAddressBook(
  suggestion: AddressSuggestion,
): Promise<Address> {
  const resolved = await resolveSuggestion(suggestion);
  return upsertAddress({
    label: resolved.label,
    formattedAddress: resolved.formattedAddress,
    latitude: resolved.latitude,
    longitude: resolved.longitude,
  });
}

// ─────────────────────────── autocomplete session ───────────────────────────

/**
 * Google recommends grouping the keystrokes of one autocomplete interaction and
 * the final Place Details call under a single session token for billing. We
 * lazily create one and clear it once details are fetched.
 */
let currentSessionToken: string | null = null;

function getSessionToken(): string {
  if (!currentSessionToken) currentSessionToken = createId('sess');
  return currentSessionToken;
}

function endSession(): void {
  currentSessionToken = null;
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ───────────────────────── Google Places (New) shapes ───────────────────────

interface AutocompleteResponse {
  suggestions?: { placePrediction?: PlacePrediction }[];
}

interface PlacePrediction {
  placeId: string;
  text?: { text?: string };
  structuredFormat?: {
    mainText?: { text?: string };
    secondaryText?: { text?: string };
  };
}

interface PlaceDetailsResponse {
  id?: string;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  displayName?: { text?: string };
}
