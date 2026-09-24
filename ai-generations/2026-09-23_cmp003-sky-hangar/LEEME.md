# CMP-003 · Hangar SKY — plates del avión (4 vistas)

Estado: **plates aprobables, sin texto** (2026-09-23). Falta: letras del tablero, capa de texto (foto:componer:cta), firma, gate.

| Vista | Uso | Archivo |
|---|---|---|
| V1 4:5 1536×1920 | estático feed (master) · ancla de continuidad | `v1-hero-4x5-final.png` |
| V2 9:16 1152×2048 | stories/reels · cuadro final del encendido vertical | `v2-9x16-final.png` |
| V3 16:9 2560×1440 | video: plano abierto · cuadro final del encendido | `v3-16x9-final.png` |
| V4 16:9 2048×1152 | video: inserto logo + cabina | `v4-detalle-16x9-final.png` |
| V5 16:9 | video: hangar a oscuras (cuadro inicial del encendido, par de V3) | `v5-oscuro-16x9-final.png` |
| V6 16:9 | video: tablero de cerca (base para animar las paletas) | `v6-tablero-16x9-final.png` |
| V7 16:9 | video/estático alt: contraplano, el avión frente al tablero | `v7-contraplano-16x9-final.png` |
| V8 9:16 | video vertical: oscuro (par de V2) | `v8-oscuro-9x16-final.png` |
| V9 9:16 | video vertical: tablero de cerca | `v9-tablero-9x16-final.png` |

Escala corregida (operador, 2026-09-23): hangar narrow-body, tablero ~7×3 m, 50 mm. La serie anterior (avión chico) queda en `v1-escala-descartada/`.
QA: logo letra por letra ✓ en V1–V4 · cola morada con chevron ✓ en todas (V2 se corrigió con máscara) · sin textos ni logos ajenos.

## Receta (3 capas)
1. **Recursos:** `refs/` con SHA256SUMS — renders oficiales A320neo SKY (`00_Assets/11_Avion-PNG`), fotos reales del banco SKY, logo oficial `logo-SKY_3.png` (mismo diseño que `src/lib/artifact-composer/catalogs/deck-axis/assets/clients/sky.svg`, a color #701C74 / #26DE00).
2. **Contrato de resultado:** avión en tierra con tren abajo, livery exacto, **logo exacto letra por letra** (K = chevron verde «>» + barra vertical morada), tablero split-flap con todas las paletas en blanco, sin otros textos ni logos, realismo fotográfico.
3. **Vía:** GPT Image 2.5 Sunburst xhigh (edit con referencias) → V2–V4 anclados en V1 → **logo: borrar pintura generada (máscara) → aplicar logo oficial con homografía + sombreado (`aplicar-logo.cjs`, `quad-v*.json`) → terminación del modelo con máscara** (material/luz, sin cambiar letras). Prompts: `*.prompt.txt`.

Lección: el modelo NO sostiene la K de SKY (dibujó «X» o barra inclinada 4 de 4 veces, incluso con el logo oficial como referencia). Lo sensible se compone; el modelo sólo termina.
Costo aprox.: ~USD 4 en total (≈30 pasadas Sunburst xhigh, incluida la serie descartada).

## Delta 2026-09-23 — flujo kit → set → composición (reemplaza las 9 vistas anteriores)

1. **Kit del avión** (`kit-avion/avion-A/B/C-kit.png`): avión sobre fondo blanco, logo oficial aplicado con `aplicar-logo.cjs` + pasada de terminación, tobera LEAP lisa, recortado.
2. **Set** (`set/S1-set-final.png`): hangar vacío, armado con `pnpm foto:prompt fichas/S1-set-4x5.json`.
3. **Composición** (`escenas/E1-4x5-comp.png`) → **integración** con máscara de SILUETA (avión dilatado + franja de piso, 12,8 % editable; set y logo protegidos) → `E1-4x5-integrada.png` → pasada chica sólo sobre el logo para igualar la luz (`mask-E1-logo.png`) → **`E1-4x5-final.png`**.
- Lección: una máscara casi toda editable hace que el modelo REINVENTE la escena (avión espejado, set nuevo) → `E1-4x5-integrada-DESCARTADA-*`.
- QA letra por letra de E1: S morada · chevrón verde hacia la derecha + barra morada vertical (K) · Y morada ✓.
