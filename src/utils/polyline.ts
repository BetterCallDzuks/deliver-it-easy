import type { Coordinate } from '@/models/types';

/**
 * Decode a Google "encoded polyline" string into a list of coordinates.
 *
 * The Directions API returns each route's geometry as an encoded polyline
 * (overview_polyline.points). This is the standard algorithm:
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 *
 * Kept dependency-free so it works the same in Expo Go and dev builds.
 */
export function decodePolyline(encoded: string): Coordinate[] {
  const coordinates: Coordinate[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const len = encoded.length;

  while (index < len) {
    lat += decodeSignedValue(encoded, index, (nextIndex) => (index = nextIndex));
    lng += decodeSignedValue(encoded, index, (nextIndex) => (index = nextIndex));
    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coordinates;
}

/**
 * Read one varint-encoded, zig-zag signed delta starting at `start`, reporting
 * the index just past the consumed bytes via `commitIndex`.
 */
function decodeSignedValue(
  encoded: string,
  start: number,
  commitIndex: (nextIndex: number) => void,
): number {
  let index = start;
  let result = 0;
  let shift = 0;
  let byte: number;

  do {
    byte = encoded.charCodeAt(index++) - 63;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  commitIndex(index);

  // Undo the zig-zag encoding (LSB is the sign bit).
  return result & 1 ? ~(result >> 1) : result >> 1;
}
