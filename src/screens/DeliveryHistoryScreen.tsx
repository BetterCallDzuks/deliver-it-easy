import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SignaturePreview } from '@/components/SignaturePad';
import {
  deleteDeliveryProof,
  getAllDeliveryProofs,
} from '@/db/deliveryRepository';
import type { DeliveryProof } from '@/models/types';
import { deleteDeliveryPhoto } from '@/services/photoService';
import { colors, radius, spacing } from '@/theme/colors';

/**
 * Delivery History tab — the persisted proof-of-delivery log.
 *
 * Shows each completed delivery with its photo, recipient, signature, notes and
 * timestamp. All read from SQLite, so it works offline and survives restarts.
 */
export function DeliveryHistoryScreen() {
  const [proofs, setProofs] = useState<DeliveryProof[]>([]);

  const load = useCallback(async () => {
    setProofs(await getAllDeliveryProofs());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleDelete = useCallback(
    (proof: DeliveryProof) => {
      Alert.alert(
        'Delete record',
        `Delete the delivery record for “${proof.stopLabel ?? proof.formattedAddress}”?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (proof.photoUri) await deleteDeliveryPhoto(proof.photoUri);
              await deleteDeliveryProof(proof.id);
              await load();
            },
          },
        ],
      );
    },
    [load],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery History</Text>
        <Text style={styles.subtitle}>
          {proofs.length} completed deliver{proofs.length === 1 ? 'y' : 'ies'}
        </Text>
      </View>

      <FlatList
        data={proofs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.stopLabel ?? item.formattedAddress}
                </Text>
                <Text style={styles.cardMeta}>{formatTimestamp(item.deliveredAt)}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </View>

            {item.stopLabel && (
              <Text style={styles.cardAddress} numberOfLines={1}>
                {item.formattedAddress}
              </Text>
            )}

            {item.photoUri && (
              <Image source={{ uri: item.photoUri }} style={styles.photo} />
            )}

            {item.recipientName && (
              <Detail icon="person" text={`Received by ${item.recipientName}`} />
            )}
            {item.notes && <Detail icon="document-text" text={item.notes} />}

            {item.signatureSvg && (
              <View style={styles.signatureBox}>
                <Text style={styles.signatureLabel}>Signature</Text>
                <SignaturePreview serialized={item.signatureSvg} />
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No deliveries recorded yet.</Text>
            <Text style={styles.emptyHint}>
              Completed deliveries with photo, signature and notes appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function Detail({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={15} color={colors.textSecondary} />
      <Text style={styles.detailText}>{text}</Text>
    </View>
  );
}

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
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
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  cardAddress: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  photo: {
    width: '100%',
    height: 180,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  signatureBox: {
    marginTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  signatureLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
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
