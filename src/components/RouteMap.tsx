import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';

import type { Coordinate, Stop } from '@/models/types';
import { colors } from '@/theme/colors';

/**
 * Interactive map for the top half of the Route Planner.
 *
 * - One custom numbered Marker per stop (1, 2, 3 …) so the map order matches
 *   the list order below it.
 * - A Polyline through the stops in sequence (straight lines in mock mode;
 *   a real decoded Directions polyline in Phase 2 — this component just draws
 *   whatever coordinate array it's handed).
 * - Auto-fits the viewport to every marker via fitToCoordinates whenever the
 *   stops change.
 */

interface Props {
  stops: Stop[];
  /** Ordered coordinates for the route line. Falls back to stop order. */
  polyline?: Coordinate[];
  /** Highlight one stop (e.g. the current destination in delivery mode). */
  activeStopId?: string;
  /** The driver's start location, shown as a distinct marker if set. */
  origin?: Coordinate | null;
}

// Central Manchester — matches the mock data so an empty map isn't in the ocean.
const DEFAULT_REGION: Region = {
  latitude: 53.4808,
  longitude: -2.2426,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export function RouteMap({ stops, polyline, activeStopId, origin }: Props) {
  const mapRef = useRef<MapView>(null);

  const lineCoords: Coordinate[] =
    polyline && polyline.length > 0
      ? polyline
      : stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude }));

  useEffect(() => {
    // Fit to every marker, including the driver's start location if set.
    const coords: Coordinate[] = [
      ...(origin ? [origin] : []),
      ...stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
    ];
    if (coords.length === 0 || !mapRef.current) return;

    // Give the map a tick to lay out before fitting.
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [stops, origin]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        // Google provider on both platforms for consistent custom markers.
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {lineCoords.length >= 2 && (
          <Polyline
            coordinates={lineCoords}
            strokeColor={colors.polyline}
            strokeWidth={4}
          />
        )}

        {origin && (
          <Marker
            coordinate={origin}
            title="Start"
            description="Your current location"
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.startMarker}>
              <Ionicons name="navigate" size={16} color={colors.markerText} />
            </View>
          </Marker>
        )}

        {stops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            title={stop.label ?? `Stop ${stop.sequence}`}
            description={stop.formattedAddress}
            tracksViewChanges={false}
          >
            <NumberedMarker
              sequence={stop.sequence}
              active={stop.id === activeStopId}
            />
          </Marker>
        ))}
      </MapView>

      {stops.length === 0 && !origin && (
        <View pointerEvents="none" style={styles.emptyOverlay}>
          <Text style={styles.emptyText}>Add stops to see them on the map</Text>
        </View>
      )}
    </View>
  );
}

/** The custom pin: a colored circle with the stop's sequence number. */
function NumberedMarker({ sequence, active }: { sequence: number; active?: boolean }) {
  return (
    <View style={[styles.marker, active && styles.markerActive]}>
      <Text style={styles.markerLabel}>{sequence}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.markerText,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  markerActive: {
    backgroundColor: colors.accent,
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  startMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.markerText,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  markerLabel: {
    color: colors.markerText,
    fontWeight: '800',
    fontSize: 14,
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    color: colors.textSecondary,
    fontSize: 14,
  },
});
