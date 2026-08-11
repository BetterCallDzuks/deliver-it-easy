import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { DriverLocation } from '@/models/types';
import { colors, radius, spacing } from '@/theme/colors';

/**
 * Route start control.
 *
 * When no origin is set it's a single "Start from my location" button; once set
 * it shows the start location with a clear (×). The origin becomes the route's
 * fixed first point and is pinned by route optimization.
 */

interface Props {
  origin: DriverLocation | null;
  isLocating: boolean;
  onUseCurrentLocation: () => void;
  onClear: () => void;
}

export function StartLocationBar({
  origin,
  isLocating,
  onUseCurrentLocation,
  onClear,
}: Props) {
  if (origin) {
    return (
      <View style={[styles.bar, styles.barSet]}>
        <View style={styles.dot}>
          <Ionicons name="navigate" size={13} color={colors.markerText} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.startLabel}>Start</Text>
          <Text style={styles.startValue} numberOfLines={1}>
            {origin.label}
          </Text>
        </View>
        <TouchableOpacity onPress={onClear} hitSlop={10}>
          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.bar}
      onPress={onUseCurrentLocation}
      disabled={isLocating}
      activeOpacity={0.8}
    >
      {isLocating ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons name="locate" size={18} color={colors.primary} />
      )}
      <Text style={styles.prompt}>
        {isLocating ? 'Getting your location…' : 'Start from my location'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  barSet: {
    borderColor: colors.success,
  },
  prompt: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  startLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  startValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
