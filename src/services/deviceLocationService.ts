import * as Location from 'expo-location';

import { CONFIG } from '@/config/env';
import type { DriverLocation } from '@/models/types';

/**
 * deviceLocationService — reads the driver's current GPS position.
 *
 * MOCK: returns a fixed point in central Manchester (matching the mock places)
 * so the "start from my location" flow works in any simulator/demo without a
 * permission prompt or a real GPS fix.
 *
 * REAL: asks for foreground location permission, then reads a single fix.
 */

/** Central Manchester — sits amongst the mock delivery stops. */
const MOCK_LOCATION: DriverLocation = {
  latitude: 53.4795,
  longitude: -2.2451,
  label: 'My location (demo)',
};

/** Raised when we can't get a position (permission denied, GPS off, etc.). */
export class LocationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocationUnavailableError';
  }
}

/**
 * Get the driver's current location as a route origin.
 *
 * Throws LocationUnavailableError with a driver-friendly message if permission
 * is denied or a fix can't be obtained.
 */
export async function getCurrentLocation(): Promise<DriverLocation> {
  if (CONFIG.MOCK_MODE) {
    await delay(150);
    return MOCK_LOCATION;
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) {
    throw new LocationUnavailableError(
      'Location permission is off. Enable it to start routes from where you are.',
    );
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      label: 'My location',
    };
  } catch {
    throw new LocationUnavailableError(
      "Couldn't get your location. Make sure GPS is on and try again.",
    );
  }
}

/** A live-location subscription; call remove() to stop watching. */
export interface LocationSubscription {
  remove: () => void;
}

/**
 * Continuously watch the driver's position (for Active Delivery live tracking).
 * Calls onUpdate with each new fix. Remember to remove() the subscription when
 * leaving the screen.
 *
 * MOCK: emits a position that gently drifts every couple of seconds so the live
 * marker visibly moves in a simulator with no real GPS.
 * REAL: expo-location watchPositionAsync (foreground permission required).
 */
export async function watchLocation(
  onUpdate: (location: DriverLocation) => void,
): Promise<LocationSubscription> {
  if (CONFIG.MOCK_MODE) {
    return mockWatch(onUpdate);
  }

  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) {
    throw new LocationUnavailableError(
      'Location permission is off. Enable it to track your position live.',
    );
  }

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 20, // metres between updates
      timeInterval: 4000, // ms between updates
    },
    (position) =>
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        label: 'My location',
      }),
  );

  return { remove: () => subscription.remove() };
}

/** Simulated live movement for MOCK_MODE demos. */
function mockWatch(
  onUpdate: (location: DriverLocation) => void,
): LocationSubscription {
  let { latitude, longitude } = MOCK_LOCATION;
  onUpdate({ latitude, longitude, label: MOCK_LOCATION.label });

  const timer = setInterval(() => {
    // Small biased drift so the marker meanders around central Manchester.
    latitude += (Math.random() - 0.4) * 0.0009;
    longitude += (Math.random() - 0.4) * 0.0009;
    onUpdate({ latitude, longitude, label: MOCK_LOCATION.label });
  }, 2500);

  return { remove: () => clearInterval(timer) };
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
