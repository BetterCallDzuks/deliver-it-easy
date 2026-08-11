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
| 2 | **Route Planner + Interactive Map** — numbered markers, polyline, auto-fit, drag-and-drop reordering | `screens/RoutePlannerScreen.tsx`, `components/RouteMap.tsx` |
| 3 | **Route Optimization** — one-tap "Optimize" (mock: nearest-neighbour TSP) | `services/routingService.ts` |
| 4 | **Active Delivery Mode** — big in-vehicle buttons, external navigation (Google/Waze/Apple Maps), Mark-as-Delivered | `screens/ActiveDeliveryScreen.tsx`, `services/navigationService.ts` |
| 5 | **Address Book + Route Templates** — view/edit saved locations, save & reload routes like "Tuesday Center Route" | `screens/AddressBookScreen.tsx`, `screens/TemplatesScreen.tsx` |

## Getting started

```bash
npm install
npm start          # then press i (iOS), a (Android), or scan the QR in Expo Go
```

> Native Google Maps needs a Dev Build (or Expo Go) — `react-native-maps`
> renders via Apple Maps on iOS by default and Google Maps on Android.

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

## Going live (Phase 2)

1. Set `mockMode: false` in `app.json` → `expo.extra`, and add your keys to
   `googlePlacesApiKey` / `googleDirectionsApiKey` there (plus the native
   `googleMapsApiKey` fields for the map SDK).
2. Fill in the clearly-marked real branches:
   - `remoteSearch()` in `services/locationService.ts` → Google Places
     Autocomplete + Place Details.
   - `buildRoute()` / `optimizeRoute()` in `services/routingService.ts` →
     Google Directions API (use `optimize:true` waypoints for real TSP).

No screen, component, DB or model code needs to change.
