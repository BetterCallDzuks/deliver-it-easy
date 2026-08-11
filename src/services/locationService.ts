import { CONFIG } from '@/config/env';
import {
  searchAddresses as searchLocalAddresses,
  upsertAddress,
} from '@/db/addressRepository';
import type { Address, AddressSuggestion } from '@/models/types';

import { mockRemoteSearch } from './mock/mockAddresses';

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  locationService — the ONLY place that talks to address search / geocode.  │
 * │                                                                            │
 * │  Swap point for Phase 2: implement `remoteSearch()` against the real       │
 * │  Google Places Autocomplete + Details APIs and flip CONFIG.MOCK_MODE.      │
 * │  Nothing else in the app changes.                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

/** Turn a saved Address row into a suggestion tagged as an instant local hit. */
const addressToSuggestion = (a: Address): AddressSuggestion => ({
  id: a.id,
  label: a.label,
  formattedAddress: a.formattedAddress,
  latitude: a.latitude,
  longitude: a.longitude,
  source: 'local',
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

  // 2) Fallback to the external provider (mock for now).
  return remoteSearch(trimmed);
}

/**
 * External-provider search. Mock implementation returns hardcoded places.
 *
 * PHASE 2 — replace the mock branch with a real call, e.g.:
 *
 *   const url =
 *     `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
 *     `?input=${encodeURIComponent(query)}&key=${CONFIG.GOOGLE_PLACES_API_KEY}`;
 *   const { predictions } = await (await fetch(url)).json();
 *   // then fetch Place Details per prediction to resolve lat/lng, and map to
 *   // AddressSuggestion[] with source: 'remote'.
 */
async function remoteSearch(query: string): Promise<AddressSuggestion[]> {
  if (CONFIG.MOCK_MODE) {
    // Simulate a little network latency so loading states are exercised.
    await delay(180);
    return mockRemoteSearch(query);
  }

  throw new Error(
    'Real Places Autocomplete not implemented yet. Set MOCK_MODE=true or ' +
      'implement remoteSearch() in locationService.ts.',
  );
}

/**
 * Persist a chosen suggestion to the local address book.
 *
 * Called after the user selects a suggestion. For a remote hit this is what
 * "automatically save it for future use" means — next time the same address is
 * typed it comes back instantly from step 1 above. For a local hit this just
 * bumps its usage stats (via upsert dedupe on coordinates).
 *
 * Returns the canonical saved Address (with its local id).
 */
export async function saveSuggestionToAddressBook(
  suggestion: AddressSuggestion,
): Promise<Address> {
  return upsertAddress({
    label: suggestion.label,
    formattedAddress: suggestion.formattedAddress,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
  });
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
