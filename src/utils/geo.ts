import type { Coordinate } from '@/models/types';

/** Metres per degree is not constant, so we use the haversine formula. */
const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

/**
 * Great-circle distance between two coordinates, in metres.
 *
 * Used by the mock router to estimate leg distances and by the mock optimizer
 * (nearest-neighbour TSP) so the fake data behaves plausibly. In Phase 2 the
 * real Directions API supplies true driving distances instead.
 */
export function haversineMeters(a: Coordinate, b: Coordinate): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

/** Format metres as a friendly "1.2 km" / "850 m" string. */
export function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

/** Format seconds as a friendly "1 h 5 min" / "12 min" string. */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
}
