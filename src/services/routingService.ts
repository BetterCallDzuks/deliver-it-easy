import { CONFIG } from '@/config/env';
import type { Coordinate, RouteLeg, RouteResult, Stop } from '@/models/types';
import { haversineMeters } from '@/utils/geo';

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │  routingService — the ONLY place that builds routes / optimizes order.     │
 * │                                                                            │
 * │  Swap point for Phase 2:                                                    │
 * │    • buildRoute()    -> Google Directions API (real polyline + ETAs)       │
 * │    • optimizeRoute() -> Directions API with optimize:true waypoints, or a  │
 * │                         proper TSP solver.                                  │
 * │  Flip CONFIG.MOCK_MODE and fill in the marked branches; screens unchanged. │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

/** Re-number stops 1..n to match their current array order. */
function resequence(stops: Stop[]): Stop[] {
  return stops.map((stop, index) => ({ ...stop, sequence: index + 1 }));
}

const toCoordinate = (s: Stop): Coordinate => ({
  latitude: s.latitude,
  longitude: s.longitude,
});

/**
 * Build a drawable route from an ordered list of stops.
 *
 * MOCK: draws straight polylines directly between consecutive stops and
 * estimates distance with the haversine formula and a flat 30 km/h city speed.
 * The `stops` order is respected as-is (this does NOT reorder).
 */
export async function buildRoute(stops: Stop[]): Promise<RouteResult> {
  const ordered = resequence(stops);

  if (CONFIG.MOCK_MODE) {
    return mockBuildRoute(ordered);
  }

  // PHASE 2 — real Directions API:
  //   Request origin = first stop, destination = last stop,
  //   waypoints = the middle stops (order preserved), and decode the returned
  //   overview_polyline into Coordinate[] for `polyline`. Use each leg's
  //   distance.value / duration.value for legs + totals.
  throw new Error(
    'Real Directions routing not implemented yet. Set MOCK_MODE=true or ' +
      'implement buildRoute() in routingService.ts.',
  );
}

/**
 * Reorder stops into the fastest driving sequence (Travelling Salesperson).
 *
 * MOCK: nearest-neighbour heuristic from the first stop using straight-line
 * distance — enough to visibly reshuffle the list and demo the UI update. The
 * very first stop is treated as the driver's starting point and kept in place.
 *
 * PHASE 2 — replace with Directions `optimize:true` waypoints (Google returns
 * an optimized waypoint_order) or a dedicated TSP solver for larger routes.
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

  throw new Error(
    'Real route optimization not implemented yet. Set MOCK_MODE=true or ' +
      'implement optimizeRoute() in routingService.ts.',
  );
}

// ────────────────────────────── mock internals ──────────────────────────────

/** ~30 km/h average city driving speed, in metres/second. */
const CITY_SPEED_MPS = 8.33;

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
