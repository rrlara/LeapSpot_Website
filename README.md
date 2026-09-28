# LeapSpot · Astra UI

A responsive travel journal for Rene & Rebecca's Mexico and Southeast Asia trips. Static HTML, CSS, and JavaScript; no build step or API key is required.

## Local preview

```sh
python3 -m http.server 8765
```

Open http://localhost:8765. Desktop pairs a scrollable journal with the map; phones switch between the map and journal using the bottom navigation. Select a moment to view its photo story, use previous/next to follow the journey, or select Explore route to see all stops, including departure and return. The initial map frames the destination region. Press `/` to search and Escape to dismiss a photo or memory. The address bar preserves the trip, map style, position, and selected memory.

## Interactive views

The default split layout is unchanged. Use **Map focus** for a full-width map or **Moments focus** for a larger timeline and an inline memory card. Selecting a memory in moments focus keeps that view open. **Split view** restores both panels; Escape also restores it when no memory or photo is open. Phone layouts retain the map/journal bottom navigation.

Dotted routes follow timestamp order, with arrows pointing from earlier to later moments. Arrow placement adapts to the visible map and zoom; tiny/overlapping segments are suppressed for clarity. As before, date-line crossings are not drawn across the whole world.

Each trip cover cycles through a selection of its own photos every five seconds with a crossfade. Previous, next, and pause/play controls are available, and clicking the cover opens its matching memory. Rotation pauses while hovering, using its controls, viewing a full-screen photo, or hiding the journal/browser tab. Reduced-motion settings disable autoplay by default. Failed images are skipped while retaining the last successful cover.

## Browser checks

Install Playwright in your development environment, then run against the local server:

```sh
node tests/browser.cjs
node tests/interactive.cjs
```

Use `NODE_PATH` if Playwright is installed outside this project, and `TEST_URL` to test another server. The checks cover trip switching, chronological selection, search, image dialogs, shared URLs, all map styles, desktop/tablet/phone layouts, out-of-order requests, and failed-load retry. Screenshots are written to `/tmp/astra-*.png`.

## Data and services

`data/sea.json` (169 moments) and `data/mexico.json` (144 moments) are snapshots of the original `travels2013` S3 GeoJSON files. Original feature indexes are retained in shared marker IDs, and dates are displayed as recorded by the camera. Photos remain hosted in that original bucket, including the existing timestamp filename fallbacks.

Leaflet and marker clustering are loaded from unpkg. Map tiles use OpenStreetMap, Esri, and OpenTopoMap with visible attribution. Light and dark use the same OSM data with CSS color treatments. Fonts use Google Fonts with local sans-serif fallbacks. Photos, map tiles, and CDN libraries require connectivity; the route data ships with the site.

## Publishing

GitHub Pages serves the root of `gh-pages`. The source redesign lives on `astra-ui`; `enhancement-ui` preserves the previous design. Publishing is a normal fast-forward update to `gh-pages` (no generated build artifacts).
