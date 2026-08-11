import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRoute } from '@/context/RouteContext';
import { deleteTemplate, getAllTemplates } from '@/db/templateRepository';
import type { RouteTemplate } from '@/models/types';
import type { RootTabParamList } from '@/navigation/types';
import { colors, radius, spacing } from '@/theme/colors';

type Props = BottomTabScreenProps<RootTabParamList, 'TemplatesTab'>;

/**
 * Route Templates tab.
 *
 * Saved groups of stops (e.g. "Tuesday Center Route") that a driver can reload
 * into a fresh route with one tap, then jump straight to the planner.
 */
export function TemplatesScreen({ navigation }: Props) {
  const { loadTemplate } = useRoute();
  const [templates, setTemplates] = useState<RouteTemplate[]>([]);

  const load = useCallback(async () => {
    setTemplates(await getAllTemplates());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleLoad = useCallback(
    (template: RouteTemplate) => {
      Alert.alert(
        'Load template',
        `Load “${template.name}” (${template.stops.length} stops) into your current route? This replaces the route you're planning now.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Load',
            onPress: () => {
              loadTemplate(template);
              navigation.navigate('PlanTab', { screen: 'RoutePlanner' });
            },
          },
        ],
      );
    },
    [loadTemplate, navigation],
  );

  const handleDelete = useCallback(
    (template: RouteTemplate) => {
      Alert.alert('Delete template', `Delete “${template.name}”?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(template.id);
            await load();
          },
        },
      ]);
    },
    [load],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Route Templates</Text>
        <Text style={styles.subtitle}>
          {templates.length} saved route{templates.length === 1 ? '' : 's'}
        </Text>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleLoad(item)}>
            <View style={styles.icon}>
              <Ionicons name="repeat" size={20} color={colors.primary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {item.stops.length} stop{item.stops.length === 1 ? '' : 's'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item)}
              hitSlop={10}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="albums-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No route templates yet.</Text>
            <Text style={styles.emptyHint}>
              Build a route in the Plan tab, then tap “Save” to store it here for
              one-tap reloading next week.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardMeta: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  deleteBtn: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  empty: {
    flex: 1,
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
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});
