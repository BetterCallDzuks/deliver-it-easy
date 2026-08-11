import { CONFIG } from '@/config/env';
import type { Coordinate, RouteLeg, RouteResult, Stop } from '@/models/types';
import { haversineMeters } from '@/utils/geo';
import { decodePolyline } from '@/utils/polyline';

import { fetchJson, GoogleApiError, toQuery } from './googleClient';

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  routingService — the ONLY place that builds routes / optimizes order.     │
 * │                                                                            │
 * │  Phase 2: real Google Directions API is wired in below (real driving       │
 * │  polyline, distances, ETAs, and optimize:true waypoint ordering for TSP).  │
 * │  Still gated on CONFIG.MOCK_MODE so the app runs unchanged on fake data.   │
 * │                                                                            │
 * │  Google Cloud APIs to enable: "Directions API".                            │
 * │                                                                            │
 * │  NOTE on optimization scope: the Directions API optimizes the intermediate │
 * │  waypoints while keeping the FIRST stop (start) and LAST stop fixed. So the │
 * │  driver's starting point stays put and everything between it and the final │
 * │  stop is reordered for the fastest drive.                                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';

/** Re-number stops 1..n to match their current array order. */
function resequence(stops: Stop[]): Stop[] {
  return stops.map((stop, index) => ({ ...stop, sequence: index + 1 }));
}

const toCoordinate = (s: Stop): Coordinate => ({
  latitude: s.latitude,
  longitude: s.longitude,
});

const coordString = (s: Stop): string => `${s.latitude},${s.longitude}`;

/**
 * Build a drawable route from an ordered list of stops. Respects the given
 * order (does NOT reorder).
 *
 * MOCK: straight polylines + haversine/flat-speed estimates.
 * REAL: Google Directions with the stops as origin/waypoints/destination.
 */
export async function buildRoute(stops: Stop[]): Promise<RouteResult> {
  const ordered = resequence(stops);

  // Nothing to route between fewer than two points.
  if (ordered.length < 2) return trivialResult(ordered);

  if (CONFIG.MOCK_MODE) return mockBuildRoute(ordered);

  return requestDirections(ordered, false);
}

/**
 * Reorder stops into the fastest driving sequence (Travelling Salesperson).
 *
 * MOCK: nearest-neighbour heuristic (keeps stop 1 as the start).
 * REAL: Directions `optimize:true` waypoints — Google returns the optimal
 * waypoint order, which we apply to the middle stops.
 */
export async function optimizeRoute(stops: Stop[]): Promise<RouteResult> {
  if (stops.length <= 2) {
    // Nothing meaningful to optimize.
    return buildRoute(stops);
  }

  if (CONFIG.MOCK_MODE) {
    const optimized = nearestNeighbourOrder(stops);
    return mockBuildRoute(resequence(optimized));
  }

  return requestDirections(resequence(stops), true);
}

// ───────────────────────────── real Directions ──────────────────────────────

/**
 * Call the Directions API and turn the response into a RouteResult.
 *
 * @param orderedStops stops in their current order (origin first, dest last)
 * @param optimize     when true, ask Google to reorder the intermediate stops
 */
async function requestDirections(
  orderedStops: Stop[],
  optimize: boolean,
): Promise<RouteResult> {
  if (!CONFIG.GOOGLE_DIRECTIONS_API_KEY) {
    throw new GoogleApiError(
      'Missing Google Directions API key. Set expo.extra.googleDirectionsApiKey.',
    );
  }

  const origin = orderedStops[0];
  const destination = orderedStops[orderedStops.length - 1];
  const middle = orderedStops.slice(1, -1);

  const waypointValue =
    middle.length > 0
      ? `${optimize ? 'optimize:true|' : ''}${middle.map(coordString).join('|')}`
      : undefined;

  const url =
    DIRECTIONS_URL +
    toQuery({
      origin: coordString(origin),
      destination: coordString(destination),
      waypoints: waypointValue,
      mode: 'driving',
      key: CONFIG.GOOGLE_DIRECTIONS_API_KEY,
    });

  const data = await fetchJson<DirectionsResponse>(url);

  if (data.status !== 'OK' || !data.routes?.length) {
    throw new GoogleApiError(
      data.error_message ?? `Directions request failed (${data.status}).`,
      data.status,
    );
  }

  const route = data.routes[0];

  // Apply Google's optimal ordering to the middle stops, if we asked for it.
  const resultStops = optimize
    ? resequence([
        origin,
        ...(route.waypoint_order ?? middle.map((_, i) => i)).map((i) => middle[i]),
        destination,
      ])
    : orderedStops;

  const legs: RouteLeg[] = (route.legs ?? []).map((leg) => ({
    from: { latitude: leg.start_location.lat, longitude: leg.start_location.lng },
    to: { latitude: leg.end_location.lat, longitude: leg.end_location.lng },
    distanceMeters: leg.distance?.value ?? 0,
    durationSeconds: leg.duration?.value ?? 0,
  }));

  return {
    stops: resultStops,
    polyline: route.overview_polyline?.points
      ? decodePolyline(route.overview_polyline.points)
      : resultStops.map(toCoordinate),
    legs,
    totalDistanceMeters: legs.reduce((sum, l) => sum + l.distanceMeters, 0),
    totalDurationSeconds: legs.reduce((sum, l) => sum + l.durationSeconds, 0),
  };
}

// ────────────────────────────── mock internals ──────────────────────────────

/** ~30 km/h average city driving speed, in metres/second. */
const CITY_SPEED_MPS = 8.33;

/** A route with no legs — used for 0/1-stop cases in either mode. */
function trivialResult(orderedStops: Stop[]): RouteResult {
  return {
    stops: orderedStops,
    polyline: orderedStops.map(toCoordinate),
    legs: [],
    totalDistanceMeters: 0,
    totalDurationSeconds: 0,
  };
}

function mockBuildRoute(orderedStops: Stop[]): RouteResult {
  const polyline: Coordinate[] = orderedStops.map(toCoordinate);
  const legs: RouteLeg[] = [];
  let totalDistance = 0;
  let totalDuration = 0;

  for (let i = 0; i < orderedStops.length - 1; i++) {
    const from = toCoordinate(orderedStops[i]);
    const to = toCoordinate(orderedStops[i + 1]);
    const distanceMeters = haversineMeters(from, to);
    const durationSeconds = distanceMeters / CITY_SPEED_MPS;

    legs.push({ from, to, distanceMeters, durationSeconds });
    totalDistance += distanceMeters;
    totalDuration += durationSeconds;
  }

  return {
    stops: orderedStops,
    polyline,
    legs,
    totalDistanceMeters: totalDistance,
    totalDurationSeconds: totalDuration,
  };
}

/**
 * Greedy nearest-neighbour ordering. Keeps stops[0] as the start, then always
 * hops to the closest not-yet-visited stop. Cheap, deterministic, good enough
 * to demonstrate "Optimize Route" visibly reordering the list.
 */
function nearestNeighbourOrder(stops: Stop[]): Stop[] {
  const remaining = [...stops];
  const ordered: Stop[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let bestIndex = 0;
    let bestDistance = Infinity;

    remaining.forEach((candidate, index) => {
      const d = haversineMeters(toCoordinate(last), toCoordinate(candidate));
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = index;
      }
    });

    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }

  return ordered;
}

// ───────────────────────── Google Directions shapes ─────────────────────────

interface DirectionsResponse {
  status: string;
  error_message?: string;
  routes?: DirectionsRoute[];
}

interface DirectionsRoute {
  overview_polyline?: { points?: string };
  waypoint_order?: number[];
  legs?: DirectionsLeg[];
}

interface LatLng {
  lat: number;
  lng: number;
}

interface DirectionsLeg {
  start_location: LatLng;
  end_location: LatLng;
  distance?: { value?: number };
  duration?: { value?: number };
}
