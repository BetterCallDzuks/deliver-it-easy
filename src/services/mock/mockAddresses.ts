import type { AddressSuggestion } from '@/models/types';

/**
 * Hardcoded fake places used by the mock location service.
 *
 * Coordinates are clustered around central Manchester, UK so the map, markers
 * and polylines look sensible out of the box. In Phase 2 this whole file is
 * deleted and the remote branch of locationService hits Google Places instead.
 */
const MOCK_PLACES: Omit<AddressSuggestion, 'source'>[] = [
  {
    id: 'mock_pl_001',
    label: 'Town Hall',
    formattedAddress: 'Manchester Town Hall, Albert Square, Manchester M2 5DB',
    latitude: 53.4794,
    longitude: -2.2453,
  },
  {
    id: 'mock_pl_002',
    label: 'Central Library',
    formattedAddress: 'Central Library, St Peter’s Square, Manchester M2 5PD',
    latitude: 53.4779,
    longitude: -2.2446,
  },
  {
    id: 'mock_pl_003',
    label: 'Piccadilly Station',
    formattedAddress: 'Manchester Piccadilly Station, London Rd, Manchester M1 2PB',
    latitude: 53.4773,
    longitude: -2.2309,
  },
  {
    id: 'mock_pl_004',
    label: 'Arndale Centre',
    formattedAddress: 'Manchester Arndale, Market St, Manchester M4 3AQ',
    latitude: 53.4831,
    longitude: -2.2402,
  },
  {
    id: 'mock_pl_005',
    label: 'Science & Industry Museum',
    formattedAddress: 'Science and Industry Museum, Liverpool Rd, Manchester M3 4FP',
    latitude: 53.4771,
    longitude: -2.2556,
  },
  {
    id: 'mock_pl_006',
    label: 'Etihad Stadium',
    formattedAddress: 'Etihad Stadium, Ashton New Rd, Manchester M11 3FF',
    latitude: 53.4831,
    longitude: -2.2004,
  },
  {
    id: 'mock_pl_007',
    label: 'Northern Quarter',
    formattedAddress: '12 Oldham St, Northern Quarter, Manchester M1 1JN',
    latitude: 53.4839,
    longitude: -2.2359,
  },
  {
    id: 'mock_pl_008',
    label: 'Salford Quays',
    formattedAddress: 'The Quays, Salford, Manchester M50 3AZ',
    latitude: 53.4709,
    longitude: -2.2967,
  },
];

/**
 * Fake "autocomplete": returns 3-4 places whose label / address contains the
 * query. Falls back to the first few places so a demo always shows results.
 */
export function mockRemoteSearch(query: string): AddressSuggestion[] {
  const q = query.trim().toLowerCase();

  const matches = MOCK_PLACES.filter(
    (p) =>
      p.label?.toLowerCase().includes(q) ||
      p.formattedAddress.toLowerCase().includes(q),
  );

  const chosen = (matches.length > 0 ? matches : MOCK_PLACES).slice(0, 4);
  return chosen.map((p) => ({ ...p, source: 'remote' as const }));
}
