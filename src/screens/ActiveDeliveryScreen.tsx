import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { RouteMap } from '@/components/RouteMap';
import { useRoute } from '@/context/RouteContext';
import type { PlannerStackParamList } from '@/navigation/types';
import { promptNavigation } from '@/services/navigationService';
import { colors, radius, spacing } from '@/theme/colors';

type Props = NativeStackScreenProps<PlannerStackParamList, 'ActiveDelivery'>;

/**
 * In-vehicle delivery mode.
 *
 * Deliberately big and low-clutter: the driver sees the CURRENT stop, a glance
 * at what's NEXT, one huge Navigate button (hands the exact lat/lng to Google /
 * Waze / Apple Maps) and one huge Mark-as-Delivered button (drops the stop,
 * updates the map, promotes the next one).
 */
export function ActiveDeliveryScreen({ navigation }: Props) {
  const { pendingStops, route, origin, markDelivered } = useRoute();

  const current = pendingStops[0];
  const next = pendingStops[1];

  const handleNavigate = useCallback(() => {
    if (current) promptNavigation(current);
  }, [current]);

  const handleDelivered = useCallback(() => {
    if (!current) return;
    markDelivered(current.id);
  }, [current, markDelivered]);

  // All stops delivered — celebrate and let them head back.
  if (!current) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.doneWrap}>
          <Ionicons name="checkmark-done-circle" size={96} color={colors.success} />
          <Text style={styles.doneTitle}>All stops delivered!</Text>
          <Text style={styles.doneSubtitle}>Great work. Route complete.</Text>
          <PrimaryButton
            title="Back to Planner"
            icon="arrow-back"
            onPress={() => navigation.navigate('RoutePlanner')}
            style={styles.doneButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.mapSection}>
        <RouteMap
          stops={pendingStops}
          polyline={route?.polyline}
          activeStopId={current.id}
          origin={origin}
        />
      </View>

      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.panelContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.remainingPill}>
          <Text style={styles.remainingText}>
            {pendingStops.length} stop{pendingStops.length === 1 ? '' : 's'} remaining
          </Text>
        </View>

        {/* Current destination */}
        <Text style={styles.sectionLabel}>CURRENT STOP</Text>
        <View style={styles.currentCard}>
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>{current.sequence}</Text>
          </View>
          <View style={styles.currentBody}>
            {current.label ? (
              <Text style={styles.currentLabel}>{current.label}</Text>
            ) : null}
            <Text style={styles.currentAddress}>{current.formattedAddress}</Text>
            {current.notes ? (
              <Text style={styles.currentNotes}>📝 {current.notes}</Text>
            ) : null}
          </View>
        </View>

        {/* Next up */}
        {next ? (
          <View style={styles.nextRow}>
            <Ionicons name="arrow-forward-circle" size={20} color={colors.textSecondary} />
            <Text style={styles.nextLabel}>Next: </Text>
            <Text style={styles.nextAddress} numberOfLines={1}>
              {next.label ?? next.formattedAddress}
            </Text>
          </View>
        ) : (
          <Text style={styles.lastStop}>This is your last stop 🎉</Text>
        )}

        {/* Big in-vehicle actions */}
        <PrimaryButton
          title="Navigate"
          icon="navigate"
          variant="primary"
          large
          onPress={handleNavigate}
          style={styles.bigButton}
        />
        <PrimaryButton
          title="Mark as Delivered"
          icon="checkmark-circle"
          variant="success"
          large
          onPress={handleDelivered}
          style={styles.bigButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapSection: {
    flex: 1,
  },
  panel: {
    flex: 1.2,
    backgroundColor: colors.background,
  },
  panelContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  remainingPill: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  remainingText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  currentCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  currentBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  currentBadgeText: {
    color: colors.surface,
    fontWeight: '800',
    fontSize: 20,
  },
  currentBody: {
    flex: 1,
  },
  currentLabel: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  currentAddress: {
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 2,
  },
  currentNotes: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  nextLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  nextAddress: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  lastStop: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  bigButton: {
    marginTop: spacing.md,
  },
  doneWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  doneSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  doneButton: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
});
