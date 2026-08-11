import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, {
  type RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AddressAutocompleteInput } from '@/components/AddressAutocompleteInput';
import { NamePromptModal } from '@/components/NamePromptModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RouteMap } from '@/components/RouteMap';
import { RouteSummaryBar } from '@/components/RouteSummaryBar';
import { StartLocationBar } from '@/components/StartLocationBar';
import { StopListItem } from '@/components/StopListItem';
import { useRoute } from '@/context/RouteContext';
import { saveTemplate } from '@/db/templateRepository';
import type { Stop } from '@/models/types';
import type { PlannerStackParamList, RootTabParamList } from '@/navigation/types';
import { colors, spacing } from '@/theme/colors';

type Props = CompositeScreenProps<
  NativeStackScreenProps<PlannerStackParamList, 'RoutePlanner'>,
  BottomTabScreenProps<RootTabParamList>
>;

/**
 * The main planning screen:
 *   • Interactive map (top) with numbered markers + polyline, auto-fitting.
 *   • Smart address input to add stops (local-first, API fallback).
 *   • A drag-and-drop list of stops (long-press a row to reorder).
 *   • Optimize / Save-as-template / Start-delivery actions.
 */
export function RoutePlannerScreen({ navigation }: Props) {
  const {
    stops,
    route,
    isBusy,
    routeError,
    origin,
    isLocating,
    addStopFromSuggestion,
    removeStop,
    reorderStops,
    optimize,
    clearRoute,
    clearRouteError,
    setStartToCurrentLocation,
    clearOrigin,
  } = useRoute();

  const [saveVisible, setSaveVisible] = useState(false);

  // Surface any live API error (Places/Directions) once, then clear it.
  useEffect(() => {
    if (!routeError) return;
    Alert.alert('Something went wrong', routeError, [
      { text: 'OK', onPress: clearRouteError },
    ]);
  }, [routeError, clearRouteError]);

  const handleStartDelivery = useCallback(() => {
    if (stops.length === 0) return;
    navigation.navigate('ActiveDelivery');
  }, [navigation, stops.length]);

  const handleSaveTemplate = useCallback(
    async (name: string) => {
      setSaveVisible(false);
      try {
        await saveTemplate(name, stops);
        Alert.alert('Saved', `Route template “${name}” is ready to reload.`);
      } catch {
        Alert.alert('Error', 'Could not save the template. Please try again.');
      }
    },
    [stops],
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Stop>) => (
      <ScaleDecorator>
        <StopListItem
          stop={item}
          onDragStart={drag}
          onRemove={() => removeStop(item.id)}
          isActive={isActive}
        />
      </ScaleDecorator>
    ),
    [removeStop],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Map — top half */}
      <View style={styles.mapSection}>
        <RouteMap stops={stops} polyline={route?.polyline} origin={origin} />
      </View>

      {/* Controls + list — bottom half */}
      <View style={styles.bottomSection}>
        <View style={styles.startWrap}>
          <StartLocationBar
            origin={origin}
            isLocating={isLocating}
            onUseCurrentLocation={setStartToCurrentLocation}
            onClear={clearOrigin}
          />
        </View>

        <AddressAutocompleteInput onSelect={addStopFromSuggestion} />

        <View style={styles.summaryWrap}>
          <RouteSummaryBar route={route} stopCount={stops.length} />
        </View>

        <View style={styles.actionRow}>
          <PrimaryButton
            title="Optimize"
            icon="git-compare"
            variant="accent"
            onPress={optimize}
            loading={isBusy}
            disabled={stops.length + (origin ? 1 : 0) < 3}
            style={styles.flexButton}
          />
          <PrimaryButton
            title="Save"
            icon="bookmark"
            variant="outline"
            onPress={() => setSaveVisible(true)}
            disabled={stops.length === 0}
            style={styles.flexButton}
          />
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>
            Stops {stops.length > 0 ? `(${stops.length})` : ''}
          </Text>
          {stops.length > 0 && (
            <Text style={styles.clear} onPress={clearRoute}>
              Clear all
            </Text>
          )}
        </View>

        <DraggableFlatList
          data={stops}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onDragEnd={({ data }) => reorderStops(data)}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="map-outline"
                size={40}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyText}>
                Search above to add your first stop.
              </Text>
              <Text style={styles.emptyHint}>
                Tip: long-press a stop to drag and reorder.
              </Text>
            </View>
          }
        />

        <PrimaryButton
          title="Start Delivery"
          icon="car-sport"
          variant="success"
          onPress={handleStartDelivery}
          disabled={stops.length === 0}
        />
      </View>

      <NamePromptModal
        visible={saveVisible}
        title="Save as Route Template"
        placeholder="e.g. Tuesday Center Route"
        confirmLabel="Save template"
        onCancel={() => setSaveVisible(false)}
        onConfirm={handleSaveTemplate}
      />
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
  bottomSection: {
    flex: 1.15,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  startWrap: {
    marginBottom: spacing.md,
  },
  summaryWrap: {
    marginTop: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  flexButton: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  clear: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.danger,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: spacing.md,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  emptyHint: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
