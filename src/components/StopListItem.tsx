import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Stop } from '@/models/types';
import { colors, radius, spacing } from '@/theme/colors';

/**
 * A single row in the draggable stop list under the map.
 *
 * The whole row is a drag handle (long-press to reorder). Shows the sequence
 * badge — matching the numbered marker on the map — plus label/address and a
 * delete button.
 */

interface Props {
  stop: Stop;
  /** Long-press handler wired to react-native-draggable-flatlist. */
  onDragStart: () => void;
  onRemove: () => void;
  isActive?: boolean;
}

export function StopListItem({ stop, onDragStart, onRemove, isActive }: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onLongPress={onDragStart}
      delayLongPress={150}
      style={[styles.row, isActive && styles.rowActive]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{stop.sequence}</Text>
      </View>

      <View style={styles.body}>
        {stop.label ? <Text style={styles.label}>{stop.label}</Text> : null}
        <Text style={styles.address} numberOfLines={1}>
          {stop.formattedAddress}
        </Text>
      </View>

      <TouchableOpacity onPress={onRemove} hitSlop={10} style={styles.action}>
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>

      <Ionicons
        name="reorder-three"
        size={24}
        color={colors.textSecondary}
        style={styles.dragHint}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowActive: {
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  badgeText: {
    color: colors.markerText,
    fontWeight: '800',
    fontSize: 14,
  },
  body: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  address: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  action: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  dragHint: {
    marginLeft: spacing.xs,
  },
});
