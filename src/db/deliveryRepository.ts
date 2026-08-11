import type { DeliveryProof } from '@/models/types';
import { createId } from '@/utils/id';

import { getDatabase } from './database';

/**
 * Data-access layer for proof-of-delivery records.
 *
 * Each completed stop can store a photo, signature, recipient and notes here,
 * building an offline delivery history the driver can review later.
 */

interface DeliveryProofRow {
  id: string;
  stop_label: string | null;
  formatted_address: string;
  latitude: number;
  longitude: number;
  recipient_name: string | null;
  notes: string | null;
  photo_uri: string | null;
  signature_svg: string | null;
  delivered_at: number;
}

const rowToProof = (row: DeliveryProofRow): DeliveryProof => ({
  id: row.id,
  stopLabel: row.stop_label,
  formattedAddress: row.formatted_address,
  latitude: row.latitude,
  longitude: row.longitude,
  recipientName: row.recipient_name,
  notes: row.notes,
  photoUri: row.photo_uri,
  signatureSvg: row.signature_svg,
  deliveredAt: row.delivered_at,
});

export interface SaveDeliveryInput {
  stopLabel: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  recipientName?: string | null;
  notes?: string | null;
  photoUri?: string | null;
  signatureSvg?: string | null;
}

/** Persist a proof-of-delivery record and return it. */
export async function saveDeliveryProof(
  input: SaveDeliveryInput,
): Promise<DeliveryProof> {
  const db = await getDatabase();
  const id = createId('pod');
  const deliveredAt = Date.now();

  await db.runAsync(
    `INSERT INTO delivery_proofs
       (id, stop_label, formatted_address, latitude, longitude,
        recipient_name, notes, photo_uri, signature_svg, delivered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.stopLabel,
      input.formattedAddress,
      input.latitude,
      input.longitude,
      input.recipientName ?? null,
      input.notes ?? null,
      input.photoUri ?? null,
      input.signatureSvg ?? null,
      deliveredAt,
    ],
  );

  return {
    id,
    stopLabel: input.stopLabel,
    formattedAddress: input.formattedAddress,
    latitude: input.latitude,
    longitude: input.longitude,
    recipientName: input.recipientName ?? null,
    notes: input.notes ?? null,
    photoUri: input.photoUri ?? null,
    signatureSvg: input.signatureSvg ?? null,
    deliveredAt,
  };
}

/** All delivery proofs, most recent first (for the History tab). */
export async function getAllDeliveryProofs(): Promise<DeliveryProof[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<DeliveryProofRow>(
    'SELECT * FROM delivery_proofs ORDER BY delivered_at DESC;',
  );
  return rows.map(rowToProof);
}

export async function deleteDeliveryProof(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM delivery_proofs WHERE id = ?;', [id]);
}
