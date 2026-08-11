import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { RouteResult } from '@/models/types';
import { colors, radius, spacing } from '@/theme/colors';
import { formatDistance, formatDuration } from '@/utils/geo';

/** Compact stops / distance / ETA readout shown under the map. */
export function RouteSummaryBar({
  route,
  stopCount,
}: {
  route: RouteResult | null;
  stopCount: number;
}) {
  return (
    <View style={styles.bar}>
      <Metric icon="location" value={`${stopCount}`} label="stops" />
      <View style={styles.divider} />
      <Metric
        icon="navigate"
        value={route ? formatDistance(route.totalDistanceMeters) : '—'}
        label="distance"
      />
      <View style={styles.divider} />
      <Metric
        icon="time"
        value={route ? formatDuration(route.totalDurationSeconds) : '—'}
        label="drive time"
      />
    </View>
  );
}

function Metric({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
});
