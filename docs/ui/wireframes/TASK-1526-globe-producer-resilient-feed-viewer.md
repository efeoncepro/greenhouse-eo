# TASK-1526 — Producer Resilient Feed / Wireframe Contract

## Visual Direction Contract

- Source duradero: surface `/producer` desplegada y visual source de `TASK-1505`.
- Direction mode: `repo-native-benchmark`.
- Decisión: conservar Editorial Creative Desk; extender la card existente, no crear una barra o modal paralelo.
- Targets: desktop `1440×1000` y compact `390×844`.
- Action hierarchy: composer/Generar → card activa → candidato/viewer → acciones de asset.
- Fidelity mapping: tokens, tipografía, bordes, badges, media slot e inspector existentes de Globe.
- Quality profile: `premium`; dossier y baseline definidos abajo.

## Desktop Wireframe

```text
┌──────── Composer ────────┬──────────── Mis generaciones ────────────────────────────┐
│ prompt / route / cost    │ [RUN A · Generando] [RUN B · Conciliando] [Asset listo] │
│ [Calcular] [Generar]     │ [Asset] [Asset degradado] [Asset]                       │
│                          │                                                         │
└──────────────────────────┴─────────────────────────────────────────────────────────┘

Seleccionar/abrir no reconstruye el grid. Cada RUN ocupa la misma geometría base de su futuro asset.
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
- `reauth-required`: CTA visible conserva destino; no muestra “sin acceso” antes de renovar.
- `permission-denied|not-found`: mensajes distintos después de sesión válida.
- `failed|cancelled|timed_out`: terminal, con recovery sólo si capability lo permite.

## Implementation Mapping

- Extend: `.producer-candidate-card` con variantes lifecycle y nodo keyed por `runId|experimentId`.
- Reader: `TASK-1525` `UnifiedProducerFeedItemV1`; no joins browser-side.
- Selection: atributos/toolbar locales; prohibido llamar `renderFeed()` por toggle.
- Media boundary: placeholder → blob ready | error; revocación al replace/remove/destroy.
- Viewer: consume el mismo item y session recovery; restaura foco a la card.
- Copy: módulo centralizado Globe.

## GVC Scenario Plan

- Scenario: fixture determinístico y live `/producer`.
- Steps: crear dos runs, seleccionar durante ejecución, terminalizar uno, fallar preview, abrir/cerrar viewer,
  expirar/renovar sesión.
- Captures: desktop/mobile active×2, reconciliación, asset, preview error, viewer y reauth.
- Markers: `producer-feed`, `producer-run-card`, `producer-candidate-media`, `producer-viewer`,
  `producer-reauth-required`.
- Assertions: dos keys, nodo estable, un retrieval por asset, foco preservado, `scrollWidth === clientWidth`.
- Review dossier: `docs/ui/captures/TASK-1526-globe-producer-resilient-feed-viewer/<run>/review/`.
- Baseline decision / surface ID: `globe.producer.feed-resilience`.

## Design Decision Log

- Elegida: card inline que cambia de estado.
- Rechazadas: barra full-width global, toast-only y modal de espera.
- Motivo: soporta concurrencia, reload, causalidad y recovery sin inventar progreso.
- Primitive: `extend`; no nace primitive compartida hasta probar otro consumer.
- Motion: incidental CSS; reduced motion usa cambio directo y conserva significado.
