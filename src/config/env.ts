import Constants from 'expo-constants';

/**
 * Central configuration + the single "mock vs real" switch for the whole app.
 *
 * Phase 1 ships with MOCK_MODE = true so the UI, UX and local-DB flow can be
 * tested with zero API keys. To go live in Phase 2:
 *   1. Set `mockMode: false` in app.json -> expo.extra (or here as a fallback).
 *   2. Drop your keys into expo.extra.googlePlacesApiKey / googleDirectionsApiKey.
 *   3. Fill in the real implementations already stubbed in the service files.
 *
 * Nothing else in the app should read process.env or Constants directly for
 * these values — they all go through this module.
 */

interface AppExtra {
  mockMode?: boolean;
  googlePlacesApiKey?: string;
  googleDirectionsApiKey?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

export const CONFIG = {
  /**
   * When true, all network-backed services return deterministic fake data.
   * Defaults to true so a missing/failed config never silently hits the network.
   */
  MOCK_MODE: extra.mockMode ?? true,

  GOOGLE_PLACES_API_KEY: extra.googlePlacesApiKey ?? '',
  GOOGLE_DIRECTIONS_API_KEY: extra.googleDirectionsApiKey ?? '',

  /** Minimum characters before we bother searching. */
  MIN_QUERY_LENGTH: 2,
} as const;
