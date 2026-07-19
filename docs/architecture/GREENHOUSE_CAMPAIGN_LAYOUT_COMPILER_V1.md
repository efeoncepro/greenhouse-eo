# Greenhouse Campaign Layout Compiler V1

> **Estado:** operativo para producción creativa out-of-band
>
> **Última validación:** 2026-07-19
>
> **Owner:** Creative Production / Design Studio
>
> **Implementación:** `scripts/creative/layout-compiler/`
>
> **Contrato:** `.codex/skills/design-studio/templates/layout-design-contract.yaml`

## Objetivo

El Campaign Layout Compiler convierte un contrato declarativo de campaña en una familia estática reproducible:
plan de producción, fuentes SVG editables, masters, manifests con hashes, contact sheet y QA técnico. Separa el
acabado generativo del ensamblaje exacto de tipografía, marca y export.

Es una herramienta local determinística. No llama a Seedream, GPT Image, Gemini Omni, fal.ai ni OpenAI; tampoco
activa medios, publica piezas o modifica el runtime de Greenhouse.

## Frontera arquitectónica

```text
dirección + anchor + clean plates
  → finish generativo aprobado fuera del compiler
  → contract YAML/JSON
  → plan
  → checkpoint anchor/layout/finish
  → compile Sharp + fontkit
  → SVG editable + master + manifest + contact sheet + QA
  → checkpoint humano de release
```

La arquitectura de campaña sigue gobernada por
[`GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md`](../operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md).
Este documento define únicamente su compositor estático ejecutable. No requiere ADR propio porque implementa de
forma reversible el contrato ya aceptado, sin cambiar source of truth, runtime, proveedor, autonomía ni acceso.

## Source of truth

| Plano                     | Fuente                                                                        |
| ------------------------- | ----------------------------------------------------------------------------- |
| intención y parámetros    | contrato `campaign-layout-compiler.v1`                                        |
| anchor y locks            | `anchor.id`, `anchor.revision`, `anchor.asset`, `anchor.locks`                |
| source y finish por ratio | `formats[].source_plate`, `formats[].finished_plate` + hashes y finish        |
| composición exacta        | `formats[].layout`, `message`, `brand`, `visual_system`                       |
| aprobación                | `anchor.status`, `approvals.layout`, `formats[].finish.status`, human release |
| output y lineage          | composition manifest + SHA-256                                                |
| release creativo          | QA técnico aprobado + `approvals.human_release=approved`                      |
| activación en medios      | fuera de este compiler                                                        |

## Modos

```bash
pnpm creative:layout -- --contract <contract.yaml> --mode plan
pnpm creative:layout -- --contract <contract.yaml> --mode compile
pnpm creative:layout -- --contract <contract.yaml> --mode check
```

- `plan`: valida el schema, resuelve inputs, registra hashes y checkpoints. Funciona aunque falten aprobaciones.
- `compile`: bloquea si anchor, layout o cualquier finish no están aprobados o falta un input obligatorio.
  Produce SVGs y masters; `human_release=pending` conserva estado `masters_compiled_human_release_pending`.
- `check`: vuelve a abrir los outputs existentes y verifica dimensiones, color, peso, copy, assets, hashes y
  comparación de baseline sin recomponer.

Ningún modo consume presupuesto de modelo.

## Contrato V1

El schema ejecutable vive en `scripts/creative/layout-compiler/contract.mjs` y acepta YAML o JSON. Sus bloques
obligatorios son:

- `anchor`: asset, revisión, locks y aprobación;
- `brand_mode` y `channel_mode`;
- `message`: kicker, hasta cuatro líneas de headline, support, URL y opcionalmente CTA/legal;
- `brand`: logo, tres pesos de fuente y paleta;
- `visual_system`: underlay óptico y hook `frequency-rail|none`;
- `composition`: renderer, formato, calidad, peso máximo y columnas del contact sheet;
- `approvals` y `gates`;
- `artifacts`: rutas de plan, manifest, QA, contact sheet y fuentes editables;
- `formats[]`: ratio/canvas/grid, plates, output, copy field, safe zones, finish y posiciones de layout.

Las rutas del manifest se normalizan respecto de `run_root`; no se guardan usernames ni paths absolutos del
operador. `baseline` es opcional y permite bloquear una migración si el master nuevo supera
`max_normalized_mae` contra una pieza aprobada anterior.

## Outputs

Por formato se generan:

- `<id>-layout-source.svg`: fuente editable con capas `clean_plate`, `optical_underlay`, `campaign_hook`, `type`
  y `brand`;
- `<id>-overlay.svg`: overlay vectorial independiente;
- `<id>-underlay.png`: raster intermedio de integración óptica;
- master JPEG o PNG sRGB;
- registro de dimensiones, bytes, hash, contraste, baseline y lineage en el composition manifest.

Por set se generan además plan, QA JSON y contact sheet. El SVG enlaza el plate aprobado; es una fuente vectorial
editable e interoperable, no un PSD ni un sustituto de Figma/Adobe para artes con lógica más compleja.

## Gates y estados

| Gate          | Dueño                | Bloquea `compile`     | Qué prueba                                             |
| ------------- | -------------------- | --------------------- | ------------------------------------------------------ |
| anchor        | director creativo    | sí                    | identidad, tesis, locks y revisión                     |
| layout        | director de arte     | sí                    | composición nativa, copy field, safe zones y jerarquía |
| finish        | responsable de craft | sí                    | plate limpio, delta acotado y aceptación por ratio     |
| technical     | compiler             | sí, por QA            | archivo, color, dimensiones, peso, hashes y contenido  |
| baseline      | compiler             | sí, si se declara     | fidelidad respecto del master aprobado                 |
| human release | campaign owner       | no compila/ sí libera | claims, marca, derechos y aprobación del set completo  |

`creative_release_candidate` no significa campaña activada. Trafficking, media, UTMs, legal final, print
vendor, ICC, bleed y rollout siguen siendo workflows separados.

## Extensión segura

V1 implementa `frequency-rail` y `none`. Un hook nuevo debe añadir schema, renderer, fixture, QA y documentación;
no debe entrar como SVG libre sin validación. Cambios de compositor deben preservar:

1. contrato declarativo versionado;
2. bloqueo por checkpoints;
3. outputs editables separados del raster generativo;
4. paths portables y hashes;
5. modo `check` sin recomposición;
6. cero provider calls dentro del compiler;
7. aprobación humana independiente del estado técnico.

## Evidencia High Frequency

El worked example usa tres formatos `16:9`, `4:5` y `9:16` sin nuevas inferencias. Los tres pasaron QA y la
comparación contra los masters previos dio MAE normalizado `0,001096–0,001155`, bajo el gate `0,002`. La salida
vive en [`ai-generations/2026-07-18_high-frequency-campaign-e2e/`](../../ai-generations/2026-07-18_high-frequency-campaign-e2e/).

## Límites V1

- Un solo sistema de mensajes por contrato; variantes de copy se modelan como contratos/runs separados.
- Layout por coordenadas explícitas; no hay editor visual ni auto-layout semántico.
- No genera ni aprueba finishes.
- No evalúa calidad artística por sí solo; el QA automatizado complementa, no sustituye, el scorecard humano.
- No hace prepress final sin especificaciones del proveedor.
- No empaqueta ni publica medios.
