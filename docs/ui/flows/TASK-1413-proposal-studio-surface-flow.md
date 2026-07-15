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
