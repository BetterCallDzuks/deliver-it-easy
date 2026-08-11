# Deliver It Easy 🚚

A fast, offline-first route planner for delivery drivers, built with **Expo +
React Native + TypeScript**. It gives drivers the simplest delivery route while
remembering past addresses and routes locally so they never re-enter them.

> **Phase 1 — Mock Data Mode is ON.** The app runs end-to-end with **no API
> keys**: address autocomplete, the map/route and optimization all use built-in
> fake data. Flip one flag to go live (see [Going live](#going-live-phase-2)).

## Features

| # | Feature | Where |
|---|---------|-------|
| 1 | **Smart Address Input** — searches the local SQLite address book first (⚡ instant), only falling back to the external API on a miss, and auto-saves new picks | `components/AddressAutocompleteInput.tsx`, `services/locationService.ts` |
| 2 | **Route Planner + Interactive Map** — start from the driver's **current location** (device GPS), numbered markers, polyline, auto-fit, drag-and-drop reordering | `screens/RoutePlannerScreen.tsx`, `components/RouteMap.tsx`, `services/deviceLocationService.ts` |
| 3 | **Route Optimization** — one-tap "Optimize" (mock: nearest-neighbour TSP) | `services/routingService.ts` |
| 4 | **Active Delivery Mode** — big in-vehicle buttons, external navigation (Google/Waze/Apple Maps), **live position tracking**, **proof of delivery** (photo + signature + recipient + notes) | `screens/ActiveDeliveryScreen.tsx`, `services/navigationService.ts`, `components/ProofOfDeliveryModal.tsx` |
| 5 | **Address Book + Route Templates** — view/edit saved locations, save & reload routes like "Tuesday Center Route" | `screens/AddressBookScreen.tsx`, `screens/TemplatesScreen.tsx` |
| 6 | **Delivery History** — persisted proof-of-delivery log (photo, signature, recipient, notes, timestamp) | `screens/DeliveryHistoryScreen.tsx`, `db/deliveryRepository.ts` |

## Getting started

```bash
npm install
npm start          # then press i (iOS), a (Android), or scan the QR in Expo Go
```

> Native Google Maps needs a Dev Build (or Expo Go) — `react-native-maps`
> renders via Apple Maps on iOS by default and Google Maps on Android.

## Development & CI

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (expo config)
```

Both run automatically on every pull request and on pushes to `main` via
GitHub Actions (`.github/workflows/ci.yml`).

**Live tracking & proof of delivery**
- Active Delivery watches the driver's position (`expo-location`
  `watchPositionAsync`) and re-anchors the route origin once they've moved
  ≥ 75 m, so the ETA stays honest without hammering the routing API. In mock
  mode the position gently drifts so the live marker visibly moves in a
  simulator.
- Marking a stop delivered opens a proof-of-delivery sheet: camera photo
  (`expo-image-picker`, copied into the document dir for durability), a native
  signature pad (`react-native-svg` + PanResponder — no webview), recipient and
  notes. Records persist in SQLite (`delivery_proofs`) and show in the History
  tab. **A photo is required to confirm** a delivery; recipient, notes and
  signature are optional.

## Architecture

```
src/
├── config/env.ts          # ⭐ MOCK_MODE switch + API keys (single source)
├── models/types.ts        # Stop, Address, Route, RouteTemplate, …
├── db/                    # expo-sqlite: persistent, offline address book + templates
│   ├── database.ts
│   ├── addressRepository.ts
│   └── templateRepository.ts
├── services/              # ⭐ ALL external I/O is isolated here
│   ├── locationService.ts #   autocomplete + geocode (local-first, API fallback)
│   ├── routingService.ts  #   build + optimize routes
│   ├── navigationService.ts #  hand-off to Google/Waze/Apple Maps (real, no key)
│   └── mock/mockAddresses.ts
├── context/RouteContext.tsx  # the one in-memory route shared across screens
├── components/            # AddressAutocompleteInput, RouteMap, StopListItem, …
├── screens/               # RoutePlanner, ActiveDelivery, AddressBook, Templates
└── navigation/            # bottom tabs + planner stack
```

**Design rule:** every network/AI/API touch point lives behind a service in
`src/services`. Screens and components never call an external API directly —
they call a service, which internally branches on `CONFIG.MOCK_MODE`.

## Going live (Phase 2 — implemented ✅)

The real Google API calls are now wired in behind `CONFIG.MOCK_MODE`. To switch
from mock data to live:

1. **Enable these APIs** in your Google Cloud project:
   - **Places API (New)** — address autocomplete + place details
   - **Directions API** — routing, ETAs, and `optimize:true` waypoint ordering
   - **Maps SDK for Android** / **Maps SDK for iOS** — the interactive map itself
2. **Add your keys** in `app.json`:
   - `expo.extra.googlePlacesApiKey` and `expo.extra.googleDirectionsApiKey`
     (used by the services; can be the same key)
   - `ios.config.googleMapsApiKey` and `android.config.googleMaps.apiKey`
     (used natively by `react-native-maps`)
3. **Flip the switch:** set `expo.extra.mockMode` to `false`.

That's it — no screen, component, DB or model code changes. What each live
branch does:

| Service | Live behavior |
|---------|---------------|
| `locationService.remoteSearch()` | Places (New) **Autocomplete** (POST `places:autocomplete`), grouped under a billing **session token** |
| `locationService.resolveSuggestion()` | Places (New) **Details** (`places/{id}`, field-masked) to fetch lat/lng at selection, closing the session |
| `routingService.buildRoute()` | **Directions API** — decodes the real `overview_polyline`, uses per-leg distance/duration |
| `routingService.optimizeRoute()` | **Directions API** with `optimize:true` waypoints; applies Google's `waypoint_order` (start stop kept fixed) |

Live API failures (no key, network, quota) surface a friendly alert and fall
back to a straight-line route so the map never goes blank — see
`RouteContext` error handling.

### Route start location

Tapping **"Start from my location"** sets the route's fixed origin to the
driver's device GPS position (`expo-location`, foreground permission). The
origin is injected as the first point when the route is built and is **pinned
by optimization** (only the delivery stops between it and the last stop are
reordered), then stripped back out of the delivery list. In **mock mode** the
location resolves to a fixed central-Manchester point so the flow works in any
simulator without a permission prompt.
