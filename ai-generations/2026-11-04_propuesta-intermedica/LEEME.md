# Propuesta Intermedica · marketing digital y performance — 2026-11-04

**Estado:** borrador para revisión de Julio. Nada enviado. Línea **Voice**, registro «ustedes» formal.
Estructura y decisiones: `docs/commercial/accounts/intermedica/ESTRUCTURA-OFERTA-2026-11-04.md`.
Costeo: `docs/commercial/accounts/intermedica/pricing-v3-intermedio-2026-11-04/INTERMEDIO.md` (`requires_review`).

**Canvas de diseño:** https://claude.ai/artifact/2E76BjuHQyB8JvvAx72myh (25 mesas de 1920×1080; versión con cifras V3;
nativas editables, recetas y reutilizadas como imagen). Regenerar: `node native/to-canvas.mjs native/html-montos <root>`
y publicar `project/` en ese canvas.

## Archivos

| PDF | Para quién |
| --- | --- |
| `pdf/1. Propuesta completa - Intermedica - Efeonce.pdf` | Cliente, con cifras aprobadas por Julio el 04/11/2026 (`bash build-deck.sh montos` + `build-pdf.cjs deck-montos`) |

## Cómo se produce cada lámina (25)

Desde el 04/11 incluye **10 · Vívelo** (receta `content-day-live-progress`, `intents/10-vivelo.json`, pieza en revisión = `assets/landing-dermatoestetica.png`). Copia de los PDF en OneDrive: `Licitaciones/Intermedica/1. Marketing digital y performance/05. Diseño y revisión/`.


| Tipo | Láminas | Cómo |
| --- | --- | --- |
| Receta | 01 portada (`cover-proposal` orbit, voz de decisión), 16 plan (`decision-plan`), 24 contraportada (`close-proposal`, plate VOX3 de ARMOR) | `intents/` → `render-decision.ts` de ARMOR (portada) y `pnpm brand:compose` → `out/` |
| Nativa | 02–11, 13, 14, 17, 18, 19, 23 | `native/propuesta.mjs` (`MONTOS=1` para cifras) → `native/shot-all.cjs` |
| Reutilizada aprobada | 12 medición (`M-medicion`), 15 señal (`P3-senal`), 22 partners (`X5-partners`) del brochure Agencia de Medios; 20 Sky y 21 Berel del brochure 360° | copia en `build-deck.sh` |

Rehacer todo: `bash build-deck.sh montos && bash build-deck.sh cliente`, luego `node build-pdf.cjs <deck> <salida.pdf>`.

## Pendientes antes de enviar

1. **Precios:** ✅ aprobados por Julio el 04/11/2026 — las cinco líneas del V3 (Performance 3.640/mes · Medición 940/mes · Creatividad
   590/mes · Preparación 2.270 · Landings 2.140). Un cambio se corre de nuevo en el V3; nunca se edita a mano.
2. **Logo de Intermedica:** ✅ tomado de intermedica.pe y pasado a blanco (`logos/`); uso autorizado por Julio el 04/11/2026.
3. **Registro mixto:** las láminas reutilizadas (12, 15, 20, 21, 22) tutean («mi pauta», «tu venta»); las nativas usan
   «ustedes». Decidir si se aceptan tal cual (precedente ARMOR) o se reemplazan por nativas.
4. **Contraportada:** dice «Empower your Voice» (salida del compositor en línea Voice, como ARMOR).
5. **Equipo:** cinco roles sin personas asignadas; el V3 dimensiona el núcleo en 0,72 FTE (interno).
6. **Cotización A4** (`render-cotizacion-a4.mjs`) y **ruta corta** para gerencia: después de aprobar precios.
7. **Correo a Nikol:** inversión por partes, sin total (regla ARMOR §8); Outlook con firma y CCO HubSpot.
