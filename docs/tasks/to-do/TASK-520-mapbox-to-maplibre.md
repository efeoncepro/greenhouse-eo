# TASK-520 — `mapbox-gl` → `maplibre-gl`

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio` (costo operativo + license independence)
- Effort: `Bajo-Medio`
- Type: `dependency` + `refactor`
- Status real: `Backlog — Ola 4 stack modernization`
- Rank: `Post-TASK-511`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-520-mapbox-to-maplibre`

## Summary

Reemplazar `mapbox-gl 3.17` por `maplibre-gl` (open-source fork desde mapbox-gl v1 pre-licencia propietaria). `react-map-gl 8` (ya instalado) soporta ambos — migración es cambio de import + quitar token de Mapbox.

Parent: TASK-511 (Stack Modernization Roadmap) · Ola 4.

## Why This Task Exists

Mapbox cambió a licencia propietaria en 2020 y cobra por map views a escala. MapLibre es fork 100% open-source, mismo API, compatible con tiles OSM gratuitos (o tiles Mapbox si queremos pagar). Beneficio:
- Elimina dependencia de `NEXT_PUBLIC_MAPBOX_TOKEN` secret.
- Cero fee de map views.
- Misma UX porque `react-map-gl 8` unifica el API.

## Goal

1. Instalar `maplibre-gl`.
2. En consumers: cambiar `import mapboxgl from 'mapbox-gl'` → `import maplibregl from 'maplibre-gl'`, y `react-map-gl/mapbox` → `react-map-gl/maplibre`.
3. Cambiar tile source a OSM o MapTiler (free tier).
4. Remover `mapbox-gl` + `@types/mapbox-gl` del `package.json`.
5. Remover env var `NEXT_PUBLIC_MAPBOX_TOKEN` de `.env.local` + Vercel.

## Acceptance Criteria

- [ ] `maplibre-gl` instalado; `mapbox-gl` + `@types/mapbox-gl` removidos.
- [ ] Maps renderizan con tiles OSM o MapTiler free tier.
- [ ] `NEXT_PUBLIC_MAPBOX_TOKEN` deprecado del env catalog.
- [ ] Smoke staging: map views operacionales (si hay).
- [ ] Gates tsc/lint/test/build verdes.

## Scope

- Grep `mapbox-gl` / `mapboxgl` → reemplazar imports.
- Grep `react-map-gl/mapbox` → `react-map-gl/maplibre`.
- Tile source config en componentes de map.

## Out of Scope

- Rediseño visual de mapas (preservar).
- Integración con MapTiler paid (free tier suficiente para staging/prod).

## Follow-ups

- Evaluar self-hosted tile server si escalamos mucho (protomaps.com es una opción futura).
