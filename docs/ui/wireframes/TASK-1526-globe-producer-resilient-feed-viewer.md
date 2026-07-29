# TASK-1526 — Producer Resilient Feed / Wireframe Contract

## Visual Direction Contract

- Source duradero: `docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html`.
- Fuente visual aprobada: `docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html`.
- Direction mode: `source-led`.
- Decisión: conservar Editorial Creative Desk; extender la card existente, no crear una barra o modal paralelo.
- Targets: desktop `1440×1000` y compact `390×844`.
- Action hierarchy: composer/Generar → card activa → candidato/viewer → acciones de asset.
- Fidelity mapping: tokens, tipografía, bordes, badges, media slot e inspector existentes de Globe; filtro,
  búsqueda, orden, hover/focus y reveal de acciones conservan la interacción aprobada sin copiar estados fake.
- Quality profile: `premium`; dossier y baseline definidos abajo.

## Desktop Wireframe

```text
┌──────── Composer ────────┬──────────── Mis generaciones ────────────────────────────┐
│ prompt / route / cost    │ [RUN A · Generando] [RUN B · Conciliando] [Asset listo] │
│ [Calcular] [Generar]     │ [Asset] [Asset degradado] [Asset]                       │
│                          │                                                         │
└──────────────────────────┴─────────────────────────────────────────────────────────┘

Seleccionar/abrir no reconstruye el grid. Cada RUN ocupa la misma geometría base de su futuro asset.
Filtrar, buscar u ordenar mueve/oculta los mismos nodos; una imagen ya visible nunca vuelve a texto alternativo.
```

## Compact Wireframe

```text
┌──────── Composer colapsable ───────┐
│ prompt / estimate / Generar        │
├──────── Feed, una columna ─────────┤
│ RUN A · Generando                  │
│ RUN B · Conciliando                │
│ Asset listo                        │
└────────────────────────────────────┘
```

## States

- `active`: media slot estable, modality/model, coarse state y última actualización.
- `reconciling`: sigue siendo la misma card; acciones que requieren asset están explicadas.
- `asset`: monta bytes sólo cuando retrieval termina.
- `preview-error`: fallback compacto dentro del media slot, metadata intacta y retry acotado.
- `query-refreshing`: resultado local inmediato y feedback no bloqueante; el feed existente no desaparece.
- `reauth-required`: CTA visible conserva destino; no muestra “sin acceso” antes de renovar.
- `permission-denied|not-found`: mensajes distintos después de sesión válida.
- `failed|cancelled|timed_out`: terminal, con recovery sólo si capability lo permite.

## Implementation Mapping

- Extend: `.producer-candidate-card` con variantes lifecycle y nodo keyed por `runId|experimentId`.
- Reader: `TASK-1525` `UnifiedProducerFeedItemV1`; no joins browser-side.
- Selection: atributos/toolbar locales; prohibido llamar `renderFeed()` por toggle.
- Reconciler: registry `key → { node, revision, media }`; patch por revisión y reordenamiento con los mismos nodos.
- Query coordinator: filtro/orden local inmediato; búsqueda debounceada con abort/supersession de resultados stale.
- Media boundary: placeholder → blob ready | error; cache independiente del filtro y revocación sólo al
  replace/remove definitivo/workspace/logout/destroy.
- Viewer: consume el mismo item y session recovery; restaura foco a la card.
- Copy: módulo centralizado Globe.

## GVC Scenario Plan

- Scenario: fixture determinístico y live `/producer`.
- Steps: crear dos runs, seleccionar durante ejecución, terminalizar uno, fallar preview, abrir/cerrar viewer,
  expirar/renovar sesión.
- Captures: desktop/mobile active×2, reconciliación, asset, preview error, viewer y reauth.
- Markers: `producer-feed`, `producer-run-card`, `producer-candidate-media`, `producer-viewer`,
  `producer-reauth-required`.
- Assertions: dos keys, `isSameNode` en refresh/filtro/orden, Blob URL estable, un retrieval por asset,
  reproducción/foco preservados, respuesta de búsqueda stale descartada y `scrollWidth === clientWidth`.
- Review dossier: `docs/ui/captures/TASK-1526-globe-producer-resilient-feed-viewer/<run>/review/`.
- Baseline decision / surface ID: `globe.producer.feed-resilience`.

## Design Decision Log

- Elegida: card inline que cambia de estado.
- Rechazadas: barra full-width global, toast-only y modal de espera.
- Motivo: soporta concurrencia, reload, causalidad y recovery sin inventar progreso.
- Primitive: `extend`; no nace primitive compartida hasta probar otro consumer.
- Motion: contrato explícito en
  `docs/ui/motion/TASK-1526-globe-producer-resilient-feed-viewer-motion.md`; Native View Transitions diferida
  hasta estabilizar identidad/foco/playback.
