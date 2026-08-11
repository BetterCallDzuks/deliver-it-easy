import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Stop } from '@/models/types';
import { captureDeliveryPhoto, deleteDeliveryPhoto } from '@/services/photoService';
import { colors, radius, spacing } from '@/theme/colors';

import { PrimaryButton } from './PrimaryButton';
import { SignaturePad } from './SignaturePad';

/**
 * Proof-of-delivery capture sheet shown when marking a stop delivered.
 *
 * A delivery photo is REQUIRED — the driver can't confirm without one. The
 * recipient name, notes and signature remain optional. The parent persists the
 * returned proof and then advances the route.
 */

export interface DeliveryProofDraft {
  recipientName: string | null;
  notes: string | null;
  photoUri: string | null;
  signatureSvg: string | null;
}

interface Props {
  visible: boolean;
  stop: Stop | null;
  onCancel: () => void;
  onConfirm: (proof: DeliveryProofDraft) => void;
}

export function ProofOfDeliveryModal({ visible, stop, onCancel, onConfirm }: Props) {
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [signatureSvg, setSignatureSvg] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  // Reset the form each time the sheet opens for a new stop.
  useEffect(() => {
    if (visible) {
      setRecipientName('');
      setNotes('');
      setPhotoUri(null);
      setSignatureSvg('');
    }
  }, [visible]);

  const handleTakePhoto = useCallback(async () => {
    setIsCapturing(true);
    try {
      const uri = await captureDeliveryPhoto();
      if (uri) {
        // Replace any prior photo to avoid orphaned files.
        if (photoUri) void deleteDeliveryPhoto(photoUri);
        setPhotoUri(uri);
      }
    } catch (err) {
      Alert.alert(
        'Camera unavailable',
        err instanceof Error ? err.message : 'Could not open the camera.',
      );
    } finally {
      setIsCapturing(false);
    }
  }, [photoUri]);

  const handleRemovePhoto = useCallback(() => {
    if (photoUri) void deleteDeliveryPhoto(photoUri);
    setPhotoUri(null);
  }, [photoUri]);

  const handleConfirm = useCallback(() => {
    // A photo is mandatory — guard even though the button is disabled without one.
    if (!photoUri) return;
    onConfirm({
      recipientName: recipientName.trim() || null,
      notes: notes.trim() || null,
      photoUri,
      signatureSvg: signatureSvg || null,
    });
  }, [recipientName, notes, photoUri, signatureSvg, onConfirm]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={10}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Proof of Delivery</Text>
          <View style={styles.headerSpacer} />
        </View>

        {stop && (
          <Text style={styles.stopLine} numberOfLines={1}>
            {stop.label ? `${stop.label} · ` : ''}
            {stop.formattedAddress}
          </Text>
        )}

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {/* Photo — required */}
            <View style={styles.labelRow}>
              <Text style={styles.sectionLabel}>PHOTO</Text>
              <Text style={styles.requiredTag}>REQUIRED</Text>
            </View>
            {photoUri ? (
              <View style={styles.photoWrap}>
                <Image source={{ uri: photoUri }} style={styles.photo} />
                <TouchableOpacity style={styles.photoRemove} onPress={handleRemovePhoto}>
                  <Ionicons name="close" size={18} color={colors.surface} />
                </TouchableOpacity>
              </View>
            ) : (
              <PrimaryButton
                title="Take delivery photo"
                icon="camera"
                variant="outline"
                loading={isCapturing}
                onPress={handleTakePhoto}
              />
            )}

            {/* Recipient */}
            <Text style={styles.sectionLabel}>RECIPIENT</Text>
            <TextInput
              style={styles.input}
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Name of person who received it"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="next"
            />

            {/* Notes */}
            <Text style={styles.sectionLabel}>NOTES</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Left with neighbour at no. 12"
              placeholderTextColor={colors.textSecondary}
              multiline
            />

            {/* Signature */}
            <Text style={styles.sectionLabel}>SIGNATURE</Text>
            <SignaturePad onChange={setSignatureSvg} />
          </ScrollView>

          <View style={styles.footer}>
            {!photoUri && (
              <Text style={styles.footerHint}>
                Take a delivery photo to confirm.
              </Text>
            )}
            <PrimaryButton
              title="Confirm Delivery"
              icon="checkmark-circle"
              variant="success"
              large
              disabled={!photoUri}
              onPress={handleConfirm}
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  cancel: {
    fontSize: 16,
    color: colors.textSecondary,
    width: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 60,
  },
  stopLine: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  content: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requiredTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 0.5,
    marginTop: spacing.md,
  },
  footerHint: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    fontSize: 16,
    color: colors.textPrimary,
  },
  notesInput: {
    minHeight: 72,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  photoRemove: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
