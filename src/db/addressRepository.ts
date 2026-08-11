import type { Address } from '@/models/types';
import { createId } from '@/utils/id';

import { getDatabase } from './database';

/**
 * Data-access layer for the local address book.
 *
 * All SQL lives here; the rest of the app deals only in `Address` objects. This
 * is also the "lightning-fast local search" that we hit BEFORE the external API
 * in the smart-address-input flow.
 */

/** Shape of a row as it comes back from SQLite (snake_case columns). */
interface AddressRow {
  id: string;
  label: string | null;
  formatted_address: string;
  latitude: number;
  longitude: number;
  notes: string | null;
  created_at: number;
  last_used_at: number;
  use_count: number;
}

const rowToAddress = (row: AddressRow): Address => ({
  id: row.id,
  label: row.label,
  formattedAddress: row.formatted_address,
  latitude: row.latitude,
  longitude: row.longitude,
  notes: row.notes,
  createdAt: row.created_at,
  lastUsedAt: row.last_used_at,
  useCount: row.use_count,
});

/**
 * Local, offline search over saved addresses.
 *
 * Matches the query against both the friendly label and the full address line,
 * ranked by how often / recently the address is used so a driver's regulars
 * surface first. This is deliberately cheap so it can run on every keystroke.
 */
export async function searchAddresses(
  query: string,
  limit = 5,
): Promise<Address[]> {
  const db = await getDatabase();
  const like = `%${query.trim()}%`;
  const rows = await db.getAllAsync<AddressRow>(
    `SELECT * FROM addresses
       WHERE formatted_address LIKE ? COLLATE NOCASE
          OR label LIKE ? COLLATE NOCASE
       ORDER BY use_count DESC, last_used_at DESC
       LIMIT ?;`,
    [like, like, limit],
  );
  return rows.map(rowToAddress);
}

/** Every saved address, most-recently-used first (for the Address Book tab). */
export async function getAllAddresses(): Promise<Address[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AddressRow>(
    'SELECT * FROM addresses ORDER BY last_used_at DESC;',
  );
  return rows.map(rowToAddress);
}

export async function getAddressById(id: string): Promise<Address | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<AddressRow>(
    'SELECT * FROM addresses WHERE id = ?;',
    [id],
  );
  return row ? rowToAddress(row) : null;
}

/**
 * Find an existing address at (roughly) the same coordinates so selecting the
 * same place twice doesn't create duplicate rows. ~11 m tolerance.
 */
async function findByCoordinate(
  latitude: number,
  longitude: number,
): Promise<Address | null> {
  const db = await getDatabase();
  const epsilon = 0.0001;
  const row = await db.getFirstAsync<AddressRow>(
    `SELECT * FROM addresses
       WHERE ABS(latitude - ?) < ? AND ABS(longitude - ?) < ?
       LIMIT 1;`,
    [latitude, epsilon, longitude, epsilon],
  );
  return row ? rowToAddress(row) : null;
}

export interface UpsertAddressInput {
  label?: string | null;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  notes?: string | null;
}

/**
 * Save an address selected from the external API (or created manually).
 *
 * If the same location already exists we bump its usage stats instead of
 * inserting a duplicate — this is what makes "remember past customers" work:
 * the more a driver uses an address, the higher it ranks in local search.
 */
export async function upsertAddress(
  input: UpsertAddressInput,
): Promise<Address> {
  const db = await getDatabase();
  const now = Date.now();

  const existing = await findByCoordinate(input.latitude, input.longitude);
  if (existing) {
    await db.runAsync(
      `UPDATE addresses
         SET label = COALESCE(?, label),
             formatted_address = ?,
             notes = COALESCE(?, notes),
             last_used_at = ?,
             use_count = use_count + 1
       WHERE id = ?;`,
      [
        input.label ?? null,
        input.formattedAddress,
        input.notes ?? null,
        now,
        existing.id,
      ],
    );
    return (await getAddressById(existing.id))!;
  }

  const id = createId('addr');
  await db.runAsync(
    `INSERT INTO addresses
       (id, label, formatted_address, latitude, longitude, notes,
        created_at, last_used_at, use_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      input.label ?? null,
      input.formattedAddress,
      input.latitude,
      input.longitude,
      input.notes ?? null,
      now,
      now,
      1,
    ],
  );
  return (await getAddressById(id))!;
}

/** Update the editable fields of a saved address (Address Book edit screen). */
export async function updateAddress(
  id: string,
  fields: { label?: string | null; formattedAddress?: string; notes?: string | null },
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE addresses
       SET label = COALESCE(?, label),
           formatted_address = COALESCE(?, formatted_address),
           notes = COALESCE(?, notes)
     WHERE id = ?;`,
    [
      fields.label ?? null,
      fields.formattedAddress ?? null,
      fields.notes ?? null,
      id,
    ],
  );
}

export async function deleteAddress(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM addresses WHERE id = ?;', [id]);
}

/** Bump usage stats when an address is added to a route. */
export async function markAddressUsed(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE addresses SET last_used_at = ?, use_count = use_count + 1 WHERE id = ?;',
    [Date.now(), id],
  );
}
