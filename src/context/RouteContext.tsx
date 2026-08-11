import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import { markAddressUsed } from '@/db/addressRepository';
import type {
  Address,
  AddressSuggestion,
  DriverLocation,
  RouteResult,
  RouteTemplate,
  Stop,
} from '@/models/types';
import { getCurrentLocation } from '@/services/deviceLocationService';
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
  /** Last user-facing error from a live API call (null when all is well). */
  routeError: string | null;
  /** The driver's starting point, or null to start from the first stop. */
  origin: DriverLocation | null;
  /** True while fetching the device location. */
  isLocating: boolean;

  addStopFromSuggestion: (s: AddressSuggestion) => Promise<void>;
  addStopFromAddress: (a: Address) => Promise<void>;
  removeStop: (stopId: string) => void;
  reorderStops: (next: Stop[]) => void;
  clearRoute: () => void;

  optimize: () => Promise<void>;
  markDelivered: (stopId: string) => void;
  loadTemplate: (template: RouteTemplate) => void;
  clearRouteError: () => void;
  setStartToCurrentLocation: () => Promise<void>;
  clearOrigin: () => void;

  pendingStops: Stop[];
}

/** Synthetic stop id for the driver origin injected into routing calls. */
const ORIGIN_STOP_ID = 'origin';

const errorMessage = (err: unknown): string =>
  err instanceof Error ? err.message : 'Something went wrong. Please try again.';

/** Wrap the driver location as a Stop so routing can treat it as the origin. */
function originToStop(origin: DriverLocation): Stop {
  return {
    id: ORIGIN_STOP_ID,
    addressId: null,
    label: origin.label,
    formattedAddress: origin.label,
    latitude: origin.latitude,
    longitude: origin.longitude,
    notes: null,
    sequence: 0,
    status: 'pending',
  };
}

/**
 * Drop the injected origin from a routing result and renumber the remaining
 * delivery stops 1..n. When there's no origin the stops pass through unchanged.
 */
function stripOrigin(resultStops: Stop[], hasOrigin: boolean): Stop[] {
  const delivery = hasOrigin ? resultStops.slice(1) : resultStops;
  return delivery.map((s, i) => ({ ...s, sequence: i + 1 }));
}

/** Straight-line fallback so the map still renders if a live route call fails. */
function straightLineResult(stops: Stop[]): RouteResult {
  return {
    stops,
    polyline: stops.map((s) => ({ latitude: s.latitude, longitude: s.longitude })),
    legs: [],
    totalDistanceMeters: 0,
    totalDurationSeconds: 0,
  };
}

const RouteContext = createContext<RouteContextValue | undefined>(undefined);

export function RouteProvider({ children }: { children: React.ReactNode }) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [origin, setOriginState] = useState<DriverLocation | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // A ref mirrors `origin` so refreshRoute (which many callbacks invoke without
  // re-creating) always reads the latest value without a stale closure.
  const originRef = useRef<DriverLocation | null>(null);
  const setOrigin = useCallback((next: DriverLocation | null) => {
    originRef.current = next;
    setOriginState(next);
  }, []);

  const clearRouteError = useCallback(() => setRouteError(null), []);

  /**
   * Recompute the drawable route (polyline + ETAs) whenever the stops or the
   * origin change. When an origin is set it is injected as the fixed first
   * point so the route (and its ETAs) start from the driver's location, then
   * stripped back out of the returned delivery list.
   */
  const refreshRoute = useCallback(async (nextStops: Stop[]) => {
    const org = originRef.current;
    const totalPoints = nextStops.length + (org ? 1 : 0);
    if (totalPoints < 2) {
      setRoute(null);
      return;
    }
    const input = org ? [originToStop(org), ...nextStops] : nextStops;
    try {
      const result = await buildRoute(input);
      // Keep our delivery-stop numbering aligned with the routed order.
      setStops(stripOrigin(result.stops, org != null));
      setRoute(result);
    } catch (err) {
      // A live Directions failure shouldn't blank the map or drop the stops —
      // fall back to a straight-line route and surface the error.
      setRoute(straightLineResult(input));
      setRouteError(errorMessage(err));
    }
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
      try {
        // Selecting a suggestion resolves its coordinates (Place Details for
        // remote hits) and persists it to the address book (new remote hits
        // get saved; existing local hits get a usage bump).
        const saved = await saveSuggestionToAddressBook(suggestion);
        await appendStop(suggestionStop(saved));
      } catch (err) {
        setRouteError(errorMessage(err));
      }
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
    setOrigin(null);
  }, [setOrigin]);

  const optimize = useCallback(async () => {
    const org = originRef.current;
    // Need at least 3 points (origin + stops) for reordering to mean anything.
    if (stops.length + (org ? 1 : 0) < 3) return;
    setIsBusy(true);
    try {
      const input = org ? [originToStop(org), ...stops] : stops;
      const result = await optimizeRoute(input);
      setStops(stripOrigin(result.stops, org != null));
      setRoute(result);
    } catch (err) {
      // Keep the current order on failure; just tell the driver why.
      setRouteError(errorMessage(err));
    } finally {
      setIsBusy(false);
    }
  }, [stops]);

  /** Read the device location and use it as the route's fixed starting point. */
  const setStartToCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const location = await getCurrentLocation();
      setOrigin(location);
      await refreshRoute(stops);
    } catch (err) {
      setRouteError(errorMessage(err));
    } finally {
      setIsLocating(false);
    }
  }, [stops, refreshRoute, setOrigin]);

  /** Remove the driver origin; the route reverts to starting at the first stop. */
  const clearOrigin = useCallback(() => {
    setOrigin(null);
    void refreshRoute(stops);
  }, [stops, refreshRoute, setOrigin]);

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
      routeError,
      origin,
      isLocating,
      addStopFromSuggestion,
      addStopFromAddress,
      removeStop,
      reorderStops,
      clearRoute,
      optimize,
      markDelivered,
      loadTemplate,
      clearRouteError,
      setStartToCurrentLocation,
      clearOrigin,
      pendingStops,
    }),
    [
      stops,
      route,
      isBusy,
      routeError,
      origin,
      isLocating,
      addStopFromSuggestion,
      addStopFromAddress,
      removeStop,
      reorderStops,
      clearRoute,
      optimize,
      markDelivered,
      loadTemplate,
      clearRouteError,
      setStartToCurrentLocation,
      clearOrigin,
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
