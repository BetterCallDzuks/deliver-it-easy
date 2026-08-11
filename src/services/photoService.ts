import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

import { createId } from '@/utils/id';

/**
 * photoService — capture a delivery photo and persist it durably.
 *
 * expo-image-picker returns a URI in the app cache, which the OS may clear. For
 * proof of delivery we copy the picked image into the document directory so the
 * reference stored in SQLite keeps working long-term.
 */

const PHOTO_DIR = `${FileSystem.documentDirectory}deliveries/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PHOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIR, { intermediates: true });
  }
}

/**
 * Launch the camera and return a durable local file URI, or null if the driver
 * cancels. Throws with a friendly message if camera permission is denied.
 */
export async function captureDeliveryPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      'Camera permission is off. Enable it to attach a delivery photo.',
    );
  }

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.6,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets?.length) return null;

  return persistPhoto(result.assets[0].uri);
}

/** Copy a temporary photo URI into the durable deliveries directory. */
async function persistPhoto(tempUri: string): Promise<string> {
  await ensureDir();
  const extension = tempUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const destination = `${PHOTO_DIR}${createId('photo')}.${extension}`;
  await FileSystem.copyAsync({ from: tempUri, to: destination });
  return destination;
}

/** Delete a stored delivery photo (best effort). */
export async function deleteDeliveryPhoto(uri: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Non-fatal: the DB row may outlive the file; ignore.
  }
}
