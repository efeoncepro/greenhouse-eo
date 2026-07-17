# TASK-1413 — Flow: Proposal Studio (lista ⇄ sidecar ⇄ descarga)

> **Tipo:** Flow contract · superficie única con sidecar contextual + descarga nativa
> **Wireframe:** `docs/ui/wireframes/TASK-1413-proposal-studio-surface.md`
> **Programa:** no pertenece a un master flow multi-superficie; es la ventana operador del runtime
> Proposal Studio (TASK-1392/1391/1412). Si nace el portal-cliente de proposals, se creará el master
> flow y esta superficie será su nodo operador (dejar Delta aquí).

## Nodos y transiciones

```
[Nav: Admin → Comercial → Propuestas]
        │ (viewCode administracion.commercial_proposals · redirect defensivo si tenant client)
        ▼
(A) /admin/commercial/proposals · tabla operator-view
        │ click fila (aria-expanded · foco al sidecar)
        ▼
(B) ContextualSidecar de la proposal seleccionada
        │ carga lazy: reader de versiones (TASK-1412) + transitions
        ├─ Esc / click-fuera / botón cerrar → vuelve a (A) con foco en la fila origen
        ├─ click [Descargar vN] → (C)
        ▼
(C) GET .../assets/[proposalAssetId]/download
        ├─ 302 URL firmada → descarga NATIVA del browser (la superficie NO navega; sin blob/fetch)
        ├─ 403/404 → snackbar es-CL canónico (código actionable=false ⇒ sin «Reintentar»)
        ▼
(A/B) el usuario permanece donde estaba
```

## Reglas del flow

- Selección única: abrir otra fila reemplaza el contenido del sidecar (sin apilar).
- Deep-link: `?proposal=<id>` abre (B) al cargar — soporta compartir «mírate esta» por Teams; id
  inválido → (A) + snackbar suave, nunca 500.
- El sidecar es lazy: la lista NO espera al historial de versiones; degradación honesta por bloque.
- Ninguna transición muta estado del aggregate: superficie 100% read + download.
- Errores del download JAMÁS navegan a página de error: snackbar + permanencia.

## Estados cross-nodo

| Evento | (A) tabla | (B) sidecar |
|---|---|---|
| reader lista falla | error page-level canónico | n/a |
| reader versiones falla | intacta | bloque `versions_unavailable` (degraded) |
| descarga 403 (audience interno / rol) | intacta | snackbar `audience` — botón oculto para no autorizados desde el reader (defensa doble) |

## GVC Scenario Plan

Dos scenarios committeados como contrato repetible (`scripts/frontend/scenarios/`):

| Scenario | Viewport | Pasos | Marks |
|---|---|---|---|
| `proposal-studio` | 1440×900 | wait `tbody tr` → mark → click primera fila → wait `.MuiAccordion-root` (contenido real, no skeleton) → mark | `lista`, `sidecar` |
| `proposal-studio-mobile` | 390×844 | idéntico al desktop | `lista-mobile`, `sidecar-mobile` |

Complemento one-off: `pnpm fe:capture --route="/admin/commercial/proposals?proposal=<id>"` para el
deep-link (sidecar abierto al cargar). Ejecutado 2026-07-15 contra dev local con data real de SKY
(deck v1–v3). Gotcha operativo: tras editar el view, la primera corrida puede caer por timeout de
compile frío de Turbopack — calentar la ruta con `curl` y reintentar.

## Design Decision Log

| # | Decisión | Por qué |
|---|---|---|
| 1 | `AdaptiveSidecarLayout` con `kind='inspector'` + `preferredMode='temporary'` + anchos 480/420–560 | El default inline desbordaba el viewport móvil (contenido cortado a 390px). Temporary = Drawer full-width en xs + overlay con scrim en desktop; espejo del consumer productivo `AdminReviewView`. |
| 2 | `includeClosed=true` literal en el fetch | El route handler parsea `=== 'true'`; `=1` excluía los estados cerrados en silencio mientras el chip decía «Todos los estados». |
| 3 | Sin UUID `prop-…` en la celda de título | Ruido de máquina en superficie premium; el id vive en el deep-link `?proposal=`, no en el ojo del operador. |
| 4 | Metadata de versión en 2 líneas (filename / `tamaño · fecha`) | La línea única truncaba la fecha con ellipsis. |
| 5 | Descarga por anchor nativo (`component='a'` → endpoint 302) | Cero blob en memoria; el browser gestiona la descarga; la UI jamás conoce URLs de storage (invariante TASK-1412). |
| 6 | Fechas vía `formatDate` canónico de `@/lib/format` | Regla `no-raw-locale-formatting`; consistencia es-CL en tabla y sidecar. |
