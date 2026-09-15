# TASK-1875 — flujo de la vista web compartida de Insights (Think)

Diseño inicial 2026-09-15, sin runtime. Nodo **S6** del master flow
`docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md`. Contrato de datos: TASK-1848 (`InsightWebModelV1`,
resolver y proxy). La UI no decide autorización: cada request se valida en Greenhouse.

## Surface Inventory

- `think.efeoncepro.com/insights/r/<token>` — página SSR del informe compartido (única superficie de esta task).
- Estados a pantalla completa en la misma ruta: `not_found` (404), `gone` (410), `rate_limited` (429), `error` (502).
- Entradas: enlace del correo de entrega (TASK-1848, ShareGrant) · «Copiar enlace» del portal (TASK-1849) ·
  reenvío del cliente a terceros. Salidas: descarga por proxy (TASK-1848) · ninguna navegación privada.

## State and Transition Contract

1. Visitante abre la URL → Astro SSR resuelve el token contra Greenhouse (sin cache, sin pre-render).
2. `200` → render completo del modelo (default / partial / capítulos con o sin hechos / descargas available|unavailable).
3. `404` → `not_found` (desconocido o expirado, indistinto; sin identidad). `410` → `gone` (revocado/retirado).
   `429` → `rate_limited`. `5xx`/red/`modelVersion` no soportada → `error`.
4. Índice → anchor de capítulo (foco al h2). «Ver tabla» abre/cierra `<details>`.
5. Descargar → `GET …/outputs/<output>` por proxy; el proxy revalida el grant (revocado ⇒ 410 en la descarga).
6. Recarga posterior: siempre vuelve al paso 1; un grant revocado entre visitas cambia el resultado (revocar revoca).
7. Deep links autenticados (correo al portal) NO entran aquí: van a Greenhouse; sólo el ShareGrant llega a Think.

## Focus and Recovery

Skip link → contenido; foco inicial en el h1 del masthead; anchors mueven foco; `<details>` conserva foco en su
control; estados de error ofrecen sólo la salida segura (texto de recuperación) sin enlaces a la biblioteca.
Sin dirty state, sin diálogos, sin timers. Preview de correo/escáneres sólo hacen GET: no cambian nada
(no hay «marcar leído» ni commands en esta superficie).

## GVC Scenario Plan

Los 9 escenarios del wireframe con `capture.mjs` (1440 + 390) y `verify-insights-report.mjs`; capturas de los
cuatro estados y del recorrido de teclado; `scrollWidth === clientWidth`; dossier en
`docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/`.

## Design Decision Log

Una sola ruta con estados a pantalla completa (patrón del Grader) en vez de rutas por estado; sin interacción
con estado propio (todo es lectura + anchors + descargas); resolución por request como invariante de producto.
Alternativa descartada: vista compartida dentro del portal (decisión del operador 2026-09-15).
