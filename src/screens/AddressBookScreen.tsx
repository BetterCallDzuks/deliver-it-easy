import { Ionicons } from '@expo/vector-icons';
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

import { NamePromptModal } from '@/components/NamePromptModal';
import { useRoute } from '@/context/RouteContext';
import {
  deleteAddress,
  getAllAddresses,
  updateAddress,
} from '@/db/addressRepository';
import type { Address } from '@/models/types';
import { colors, radius, spacing } from '@/theme/colors';

/**
 * Address Book tab.
 *
 * Lists every saved location (persisted in SQLite), with quick actions to add
 * one straight into the current route, rename its label, or delete it. This is
 * the "remembers past customers so they don't re-enter them" surface.
 */
export function AddressBookScreen() {
  const { addStopFromAddress } = useRoute();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [editing, setEditing] = useState<Address | null>(null);

  const load = useCallback(async () => {
    setAddresses(await getAllAddresses());
  }, []);

  // Reload every time the tab regains focus so edits elsewhere show up.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleAddToRoute = useCallback(
    async (address: Address) => {
      await addStopFromAddress(address);
      Alert.alert('Added', `“${address.label ?? address.formattedAddress}” added to your route.`);
    },
    [addStopFromAddress],
  );

  const handleDelete = useCallback(
    (address: Address) => {
      Alert.alert(
        'Delete address',
        `Remove “${address.label ?? address.formattedAddress}” from your address book?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await deleteAddress(address.id);
              await load();
            },
          },
        ],
      );
    },
    [load],
  );

  const handleRename = useCallback(
    async (label: string) => {
      if (!editing) return;
      await updateAddress(editing.id, { label });
      setEditing(null);
      await load();
    },
    [editing, load],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Address Book</Text>
        <Text style={styles.subtitle}>
          {addresses.length} saved location{addresses.length === 1 ? '' : 's'}
        </Text>
      </View>

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardMain}
              onPress={() => handleAddToRoute(item)}
            >
              <View style={styles.icon}>
                <Ionicons name="home" size={18} color={colors.primary} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardLabel}>
                  {item.label ?? 'Unnamed location'}
                </Text>
                <Text style={styles.cardAddress} numberOfLines={1}>
                  {item.formattedAddress}
                </Text>
                <Text style={styles.cardMeta}>
                  Used {item.useCount}×
                </Text>
              </View>
              <Ionicons name="add-circle" size={26} color={colors.success} />
            </TouchableOpacity>

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setEditing(item)}
              >
                <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                <Text style={styles.actionText}>Rename</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={[styles.actionText, { color: colors.danger }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bookmarks-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No saved addresses yet.</Text>
            <Text style={styles.emptyHint}>
              Addresses you add to a route are saved here automatically.
            </Text>
          </View>
        }
      />

      <NamePromptModal
        visible={editing !== null}
        title="Rename location"
        placeholder="e.g. Mrs. Smith, Warehouse…"
        initialValue={editing?.label ?? ''}
        confirmLabel="Save"
        onCancel={() => setEditing(null)}
        onConfirm={handleRename}
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
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardBody: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
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
