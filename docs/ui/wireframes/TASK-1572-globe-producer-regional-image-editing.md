# TASK-1572 — Globe Producer Regional Image Editing

## Visual direction

- Thesis: **Protected Artboard** — el usuario siente que trabaja sobre la imagen original y entiende qué zona cambiará.
- Reuse: Focus Canvas de `TASK-1571`, `MediaStage`, inspector, dialog nativo y primitives existentes.
- New pattern only if required: `ImageEditRail`, patrón contextual del viewer; no galería ni editor paralelo.

## Desktop wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Producer shell / feed permanece detrás                                     │
│                                                                            │
│ Native dialog: Focus Canvas                                                │
│ ┌─────────────────────────────────────────────┬──────────────────────────┐ │
│ │                                             │ Editar imagen             │ │
│ │        imagen con overlay de máscara        │ [Editar imagen] [Editar zona]│
│ │                                             │                          │ │
│ │  [−] [100%] [+] [Ajustar] [Deshacer]       │ [Reemplazar][Eliminar][Agregar]│
│ └─────────────────────────────────────────────┴──────────────────────────┘ │
│                                                                            │
│ Zona seleccionada · 12% · [Preciso] [Natural]                             │
│ Describe el cambio…                                      [Editar zona]     │
└────────────────────────────────────────────────────────────────────────────┘
```

## Mobile wireframe (390px)

```text
┌───────────────────────────────┐
│ ← Editar imagen               │
│       image + mask overlay    │
│ [−] 100% [+] [Ajustar]        │
├───────────────────────────────┤
│ [Editar imagen] [Editar zona] │
│ [Reemplazar] [Eliminar]       │
│ [Agregar]                     │
│ Zona seleccionada · 12%       │
│ [Preciso] [Natural]           │
│ Describe el cambio…           │
│ Costo estimado                │
│ [Editar zona]                 │
└───────────────────────────────┘
```

## Component and token mapping

- Surface: `/producer` → `ProducerViewer`/`MediaStage` de `TASK-1571`.
- Pattern: extender inspector/sidecar existente; `ImageEditRail` sólo si el inspector no basta.
- Mask layer: overlay alineado a dimensiones del `image.viewer-preview@1`; CSS pixels no cruzan el command.
- Copy: `apps/studio-client/src/copy/` namespace `producerImageEdit`.
- Typography: Poppins sólo para display; Geist para controles, metadata y estados.

## Copy ledger

| Key | Copy |
|---|---|
| `imageEdit.open` | Editar imagen |
| `imageEdit.regional` | Editar zona |
| `imageEdit.replace` | Reemplazar |
| `imageEdit.remove` | Eliminar |
| `imageEdit.add` | Agregar |
| `imageEdit.precise` | Preciso |
| `imageEdit.natural` | Natural |
| `imageEdit.maskHint` | Pinta la zona que quieres cambiar. El resto quedará protegido. |
| `imageEdit.maskReady` | Zona seleccionada: {coverage}% de la imagen. |
| `imageEdit.maskInvalid` | Selecciona una zona antes de continuar. |
| `imageEdit.promptPlaceholder` | Describe el cambio que quieres hacer… |
| `imageEdit.edgeNotice` | Pueden variar algunos píxeles alrededor del borde para integrar el cambio. |
| `imageEdit.strictNotice` | El resto de la imagen se conservará. |
| `imageEdit.naturalNotice` | El modelo puede ajustar detalles cercanos para integrar el resultado. |
| `imageEdit.validating` | Validando la zona… |
| `imageEdit.running` | Retoque en curso… |
| `imageEdit.unsupported` | Este modelo no admite edición regional. |
| `imageEdit.originalSafe` | La imagen original permanece intacta. |

## State inventory

- Full edit, regional edit, drawing, empty/invalid mask, ready mask.
- Estimate loading/stale/available/insufficient.
- Capability available/gated/unsupported, permission denied, provider failure, unknown outcome.
- Precise/natural, result pending, result ready, result degraded, retry with same mask.
- Desktop, 390px, touch, keyboard, focus restoration and reduced motion.
