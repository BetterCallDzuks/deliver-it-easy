/**
 * Core domain models for Deliver It Easy.
 *
 * These types are intentionally UI/DB agnostic so the same shapes flow through
 * the SQLite layer, the services (mock or real), the global route state and the
 * screens. When we swap mock data for the real Google APIs in Phase 2, these
 * shapes should not need to change.
 */

/** A latitude / longitude pair. Matches the shape react-native-maps expects. */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * A saved location in the driver's local "address book".
 *
 * Every address the driver ever selects (from local search or the external API)
 * is persisted here so it can be re-used instantly, offline, on future days.
 */
export interface Address {
  /** Stable local id (uuid-like string). */
  id: string;
  /** Optional friendly label, e.g. "Mrs. Smith" or "Warehouse". */
  label: string | null;
  /** The full, human-readable address line. */
  formattedAddress: string;
  latitude: number;
  longitude: number;
  /** Free-form driver notes (gate code, "leave at back door", etc.). */
  notes: string | null;
  /** Epoch millis when first saved. */
  createdAt: number;
  /** Epoch millis when last added to a route — used to rank local search. */
  lastUsedAt: number;
  /** How many times this address has been used — also used to rank search. */
  useCount: number;
}

/** Delivery progress for a single stop. */
export type StopStatus = 'pending' | 'delivered';

/**
 * A single stop within the route currently being planned / driven.
 *
 * A Stop references the Address it came from (so we can bump useCount etc.) but
 * also denormalizes the address text + coordinates so an in-progress route is
 * self-contained and never breaks if the source address is later edited.
 */
export interface Stop {
  /** Stable id for this stop instance within a route. */
  id: string;
  /** The address-book entry this stop was created from, if any. */
  addressId: string | null;
  label: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  /** 1-based position in the route. Kept in sync with array order. */
  sequence: number;
  status: StopStatus;
}

/**
 * A raw search suggestion returned by locationService.
 *
 * `source` lets the UI show where the hit came from (⚡ instant local match vs
 * a network lookup) and lets the planner know whether it still needs to persist
 * the address to the local DB after selection.
 */
export interface AddressSuggestion {
  /** For local hits this is the Address id; for API hits a provider place id. */
  id: string;
  label: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  source: 'local' | 'remote';
}

/**
 * A named, reusable group of stops — e.g. "Tuesday Center Route".
 *
 * Stored as an ordered snapshot of address references so a template can be
 * loaded into a fresh route with one tap next week.
 */
export interface RouteTemplate {
  id: string;
  name: string;
  stops: TemplateStop[];
  createdAt: number;
}

/** A stop as stored inside a template (snapshot, no live delivery status). */
export interface TemplateStop {
  addressId: string | null;
  label: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  notes: string | null;
}

/** A leg of a computed route (distance/time between two consecutive stops). */
export interface RouteLeg {
  from: Coordinate;
  to: Coordinate;
  /** Metres. */
  distanceMeters: number;
  /** Seconds. */
  durationSeconds: number;
}

/** The result of asking routingService to build/optimize a route. */
export interface RouteResult {
  /** Stops in driving order, with `sequence` re-numbered. */
  stops: Stop[];
  /** Polyline coordinates to draw on the map, in order. */
  polyline: Coordinate[];
  legs: RouteLeg[];
  totalDistanceMeters: number;
  totalDurationSeconds: number;
}
