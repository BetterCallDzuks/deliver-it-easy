import type { RouteTemplate, Stop, TemplateStop } from '@/models/types';
import { createId } from '@/utils/id';

import { getDatabase } from './database';

/**
 * Data-access layer for saved "Route Templates" (e.g. "Tuesday Center Route").
 *
 * A template is an ordered snapshot of stops that a driver can reload into a
 * fresh route with one tap. Stored across two tables (header + ordered stops).
 */

interface TemplateRow {
  id: string;
  name: string;
  created_at: number;
}

interface TemplateStopRow {
  id: string;
  template_id: string;
  position: number;
  address_id: string | null;
  label: string | null;
  formatted_address: string;
  latitude: number;
  longitude: number;
  notes: string | null;
}

const rowToTemplateStop = (row: TemplateStopRow): TemplateStop => ({
  addressId: row.address_id,
  label: row.label,
  formattedAddress: row.formatted_address,
  latitude: row.latitude,
  longitude: row.longitude,
  notes: row.notes,
});

/** All templates with their stops, newest first. */
export async function getAllTemplates(): Promise<RouteTemplate[]> {
  const db = await getDatabase();
  const headers = await db.getAllAsync<TemplateRow>(
    'SELECT * FROM route_templates ORDER BY created_at DESC;',
  );
  const stopRows = await db.getAllAsync<TemplateStopRow>(
    'SELECT * FROM route_template_stops ORDER BY template_id, position ASC;',
  );

  const stopsByTemplate = new Map<string, TemplateStop[]>();
  for (const row of stopRows) {
    const list = stopsByTemplate.get(row.template_id) ?? [];
    list.push(rowToTemplateStop(row));
    stopsByTemplate.set(row.template_id, list);
  }

  return headers.map((h) => ({
    id: h.id,
    name: h.name,
    createdAt: h.created_at,
    stops: stopsByTemplate.get(h.id) ?? [],
  }));
}

/**
 * Persist the current route's stops as a named template.
 *
 * Wrapped in a transaction so a template is never half-written.
 */
export async function saveTemplate(
  name: string,
  stops: Stop[],
): Promise<RouteTemplate> {
  const db = await getDatabase();
  const templateId = createId('tmpl');
  const now = Date.now();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO route_templates (id, name, created_at) VALUES (?, ?, ?);',
      [templateId, name.trim(), now],
    );

    for (let i = 0; i < stops.length; i++) {
      const stop = stops[i];
      await db.runAsync(
        `INSERT INTO route_template_stops
           (id, template_id, position, address_id, label,
            formatted_address, latitude, longitude, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          createId('tstop'),
          templateId,
          i,
          stop.addressId,
          stop.label,
          stop.formattedAddress,
          stop.latitude,
          stop.longitude,
          stop.notes,
        ],
      );
    }
  });

  return {
    id: templateId,
    name: name.trim(),
    createdAt: now,
    stops: stops.map((s) => ({
      addressId: s.addressId,
      label: s.label,
      formattedAddress: s.formattedAddress,
      latitude: s.latitude,
      longitude: s.longitude,
      notes: s.notes,
    })),
  };
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDatabase();
  // ON DELETE CASCADE removes the stops too.
  await db.runAsync('DELETE FROM route_templates WHERE id = ?;', [id]);
}
