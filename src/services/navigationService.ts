import { Alert, Linking, Platform } from 'react-native';

import type { Stop } from '@/models/types';

/**
 * navigationService — hands a stop's exact lat/lng off to an external
 * turn-by-turn app (Google Maps, Waze, or Apple Maps).
 *
 * This is real (not mocked) even in Phase 1: it uses OS URL schemes, no API key
 * required. We always navigate by coordinates, never by address string, so the
 * driver is taken to the precise pin — not a fuzzy geocode of the text.
 */

export type NavApp = 'google' | 'waze' | 'apple';

interface NavOption {
  key: NavApp;
  label: string;
  /** Deep-link scheme URL. */
  url: (stop: Stop) => string;
  /** Web fallback if the app isn't installed. */
  fallback: (stop: Stop) => string;
}

const NAV_OPTIONS: Record<NavApp, NavOption> = {
  google: {
    key: 'google',
    label: 'Google Maps',
    url: (s) =>
      `comgooglemaps://?daddr=${s.latitude},${s.longitude}&directionsmode=driving`,
    fallback: (s) =>
      `https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}&travelmode=driving`,
  },
  waze: {
    key: 'waze',
    label: 'Waze',
    url: (s) => `waze://?ll=${s.latitude},${s.longitude}&navigate=yes`,
    fallback: (s) =>
      `https://waze.com/ul?ll=${s.latitude},${s.longitude}&navigate=yes`,
  },
  apple: {
    key: 'apple',
    label: 'Apple Maps',
    url: (s) => `http://maps.apple.com/?daddr=${s.latitude},${s.longitude}&dirflg=d`,
    fallback: (s) =>
      `http://maps.apple.com/?daddr=${s.latitude},${s.longitude}&dirflg=d`,
  },
};

/** Open a specific navigation app, falling back to its web URL if needed. */
export async function navigateWith(app: NavApp, stop: Stop): Promise<void> {
  const option = NAV_OPTIONS[app];
  const deepLink = option.url(stop);

  try {
    const canOpen = await Linking.canOpenURL(deepLink);
    await Linking.openURL(canOpen ? deepLink : option.fallback(stop));
  } catch {
    await Linking.openURL(option.fallback(stop));
  }
}

/**
 * Present the driver with the nav apps that make sense for their platform and
 * launch the one they pick. Apple Maps is offered on iOS only.
 */
export function promptNavigation(stop: Stop): void {
  const apps: NavApp[] = Platform.OS === 'ios'
    ? ['apple', 'google', 'waze']
    : ['google', 'waze'];

  const buttons = apps.map((key) => ({
    text: NAV_OPTIONS[key].label,
    onPress: () => {
      void navigateWith(key, stop);
    },
  }));

  Alert.alert(
    'Navigate to stop',
    stop.formattedAddress,
    [...buttons, { text: 'Cancel', style: 'cancel' }],
    { cancelable: true },
  );
}
