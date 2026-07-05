# Nexa fallback characters — familia de poses 3D

**Fecha:** 2026-07-05 · **Motor:** OpenAI GPT Image 2 (modo *edit* image-to-image) · **Fondo:** removido con `pnpm ai:image:rmbg` (matting AI local)

## Propósito

Poses/expresiones del **personaje 3D propietario de Nexa** para las pantallas de **enlace roto / expirado** del hub público **efeonce-think** (`/brand-visibility/r/[token]`, `/s/[code]`, y un 404 global). Una pose honesta por `kind` de fallback, manteniendo estilo 3D + identidad + isotipo del pecho.

## Fuente

`public/images/illustrations/characters/greenhouse-404.png` — personaje 3D full-body, fondo transparente, isotipo cohete-en-órbita en el pecho. Parte de la familia de status-characters (`greenhouse-401/404/coming-soon/maintenance`).

## Cómo se generó (reproducible)

```bash
# Edit con referencia (preserva identidad/estilo/logo; cambia solo el delta)
pnpm ai:image --image public/images/illustrations/characters/greenhouse-404.png \
  --size 1024x1536 --quality high \
  --prompt "<scaffold> Change ONLY her pose and expression to: <DELTA>. …" \
  --out ai-generations/2026-07-05_nexa-fallback-characters/<kind>_opaque.png

# Remover fondo blanco → transparente con matting local
pnpm ai:image:rmbg <kind>_opaque.png <kind>.png
```

**Scaffold fijo** (identity-lock, todas las poses):
> Keep this EXACT 3D animated character (stylized Pixar-like 3D render) — identical identity, face, big expressive eyes, long dark wavy hair, gold hoop earrings, the same royal-blue hoodie with the same white rocket-in-orbit emblem on the chest, black tailored pants and black high heels, full body, same 3D cartoon style, materials and soft lighting. Change ONLY her pose and expression to: **\<DELTA\>**. Same full-body framing, centered. Plain solid white background.

## Assets (por `kind` de fallback)

| `kind` | Archivo (transparente) | Pose / expresión (delta) | Copy del estado |
|---|---|---|---|
| **not-found** (404) | `not-found.png` | *reusa el `greenhouse-404.png`* — sorpresa "¡whoa!", manos arriba | "No encontramos esta página" |
| **expired / invalid** | `expired.png` | encogimiento apenado, manos abiertas hacia abajo, media sonrisa cálida | "Este enlace de informe expiró" |
| **revoked** (gone) | `revoked.png` | serena, una mano al pecho, otra abierta, sonrisa tranquila | "Este enlace fue revocado" |
| **rate-limited** (429) | `rate-limited.png` | paciente, una mano en "aguanta un momento" (palma al frente), sonrisa calma | "Demasiadas solicitudes, dale un segundo" |
| **error** (5xx) | `error.png` | "ups" apenado, mano en la nuca, sonrisa incómoda amable | "No pudimos cargar, reintenta" |

> `_opaque.png` = salida cruda de GPT-2 (fondo blanco). `<kind>.png` = versión transparente final. Prompts verbatim por pose en `manifest.json`.

## Notas de calidad

- Identidad + estilo 3D + outfit: consistentes entre poses (mismo personaje).
- Isotipo del pecho: ~90% fiel (GPT-2 lo redibuja limpio). Para 100% exacto → re-estampar `public/branding/SVG/isotipo-efeonce-negativo.svg` por composición.
- Recorte transparente: matting local con bordes suaves; revisar sobre navy antes de integrar.
