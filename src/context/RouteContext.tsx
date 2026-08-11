import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { markAddressUsed } from '@/db/addressRepository';
import type {
  Address,
  AddressSuggestion,
  RouteResult,
  RouteTemplate,
  Stop,
} from '@/models/types';
import { saveSuggestionToAddressBook } from '@/services/locationService';
import { buildRoute, optimizeRoute } from '@/services/routingService';
import { createId } from '@/utils/id';

/**
 * RouteContext holds the ONE route the driver is currently planning / driving,
 * in memory, and exposes the actions every screen shares (add / remove /
 * reorder / optimize / mark delivered). The address book + templates are
 * persisted in SQLite; the live route only persists if saved as a template.
 *
 * Keeping this in a single context means the Planner, the Active Delivery
 * screen and the map all read from the same source of truth and stay in sync.
 */

interface RouteContextValue {
  stops: Stop[];
  route: RouteResult | null;
  isBusy: boolean;

  addStopFromSuggestion: (s: AddressSuggestion) => Promise<void>;
  addStopFromAddress: (a: Address) => Promise<void>;
  removeStop: (stopId: string) => void;
  reorderStops: (next: Stop[]) => void;
  clearRoute: () => void;

  optimize: () => Promise<void>;
  markDelivered: (stopId: string) => void;
  loadTemplate: (template: RouteTemplate) => void;

  pendingStops: Stop[];
}

const RouteContext = createContext<RouteContextValue | undefined>(undefined);

export function RouteProvider({ children }: { children: React.ReactNode }) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  /** Recompute the drawable route (polyline + ETAs) whenever order changes. */
  const refreshRoute = useCallback(async (nextStops: Stop[]) => {
    if (nextStops.length < 2) {
      setRoute(null);
      return;
    }
    const result = await buildRoute(nextStops);
    // buildRoute re-sequences; keep our stop list numbering aligned with it.
    setStops(result.stops);
    setRoute(result);
  }, []);

  const appendStop = useCallback(
    async (stop: Stop) => {
      const next = [...stops, stop].map((s, i) => ({ ...s, sequence: i + 1 }));
      setStops(next);
      await refreshRoute(next);
    },
    [stops, refreshRoute],
  );

  const addStopFromSuggestion = useCallback(
    async (suggestion: AddressSuggestion) => {
      // Selecting a suggestion always persists it to the address book (new
      // remote hits get saved; existing local hits get a usage bump).
      const saved = await saveSuggestionToAddressBook(suggestion);
      await appendStop(suggestionStop(saved));
    },
    [appendStop],
  );

  const addStopFromAddress = useCallback(
    async (address: Address) => {
      await markAddressUsed(address.id);
      await appendStop(suggestionStop(address));
    },
    [appendStop],
  );

  const removeStop = useCallback(
    (stopId: string) => {
      setStops((prev) => {
        const next = prev
          .filter((s) => s.id !== stopId)
          .map((s, i) => ({ ...s, sequence: i + 1 }));
        void refreshRoute(next);
        return next;
      });
    },
    [refreshRoute],
  );

  const reorderStops = useCallback(
    (next: Stop[]) => {
      const renumbered = next.map((s, i) => ({ ...s, sequence: i + 1 }));
      setStops(renumbered);
      void refreshRoute(renumbered);
    },
    [refreshRoute],
  );

  const clearRoute = useCallback(() => {
    setStops([]);
    setRoute(null);
  }, []);

  const optimize = useCallback(async () => {
    if (stops.length < 3) return;
    setIsBusy(true);
    try {
      const result = await optimizeRoute(stops);
      setStops(result.stops);
      setRoute(result);
    } finally {
      setIsBusy(false);
    }
  }, [stops]);

  const markDelivered = useCallback(
    (stopId: string) => {
      setStops((prev) => {
        // Drop the delivered stop entirely and renumber what's left.
        const next = prev
          .filter((s) => s.id !== stopId)
          .map((s, i) => ({ ...s, sequence: i + 1 }));
        void refreshRoute(next);
        return next;
      });
    },
    [refreshRoute],
  );

  const loadTemplate = useCallback(
    (template: RouteTemplate) => {
      const loaded: Stop[] = template.stops.map((ts, i) => ({
        id: createId('stop'),
        addressId: ts.addressId,
        label: ts.label,
        formattedAddress: ts.formattedAddress,
        latitude: ts.latitude,
        longitude: ts.longitude,
        notes: ts.notes,
        sequence: i + 1,
        status: 'pending',
      }));
      setStops(loaded);
      void refreshRoute(loaded);
    },
    [refreshRoute],
  );

  const pendingStops = useMemo(
    () => stops.filter((s) => s.status === 'pending'),
    [stops],
  );

  const value = useMemo<RouteContextValue>(
    () => ({
      stops,
      route,
      isBusy,
      addStopFromSuggestion,
      addStopFromAddress,
      removeStop,
      reorderStops,
      clearRoute,
      optimize,
      markDelivered,
      loadTemplate,
      pendingStops,
    }),
    [
      stops,
      route,
      isBusy,
      addStopFromSuggestion,
      addStopFromAddress,
      removeStop,
      reorderStops,
      clearRoute,
      optimize,
      markDelivered,
      loadTemplate,
      pendingStops,
    ],
  );

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

/** Build a fresh route Stop from a saved Address / suggestion. */
function suggestionStop(a: Address): Stop {
  return {
    id: createId('stop'),
    addressId: a.id,
    label: a.label,
    formattedAddress: a.formattedAddress,
    latitude: a.latitude,
    longitude: a.longitude,
    notes: a.notes,
    sequence: 0, // renumbered by the caller
    status: 'pending',
  };
}

export function useRoute(): RouteContextValue {
  const ctx = useContext(RouteContext);
  if (!ctx) {
    throw new Error('useRoute must be used within a RouteProvider');
  }
  return ctx;
}
