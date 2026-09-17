# KV paraguas «Tu IA no conoce tu negocio» — versión Clawd (2026-09-17)

Estado: **prueba producida y revisada por el agente**. Pendiente: aprobación del operador, insignia oficial de partner
Claude y guía de marca de Anthropic archivada. Nada publicado ni programado.

Narrativa canónica: [`EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md`](../../docs/strategy/EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md).

## Pieza

`kv-tu-ia-no-conoce-clawd-4x5-v02.png` — 1080×1350 PNG. Fuente editable del texto: `*-overlay.svg` (trazados). QA:
`*-qa.json`. Vista móvil: `*-mobile-390.png`. `v01` conservada (titular sin contraste de pesos).

- **Concepto:** reinterpretación del ángel y el diablo en el hombro. Nexa (versión humana) mira a Clawd, que está en
  su hombro; los dos hacen el mismo gesto de «no sé». La IA es brillante, pero nadie le contó el negocio.
- **Copy:** «Tu IA no conoce» (Bricolage `ideaLead` 420, `softOnDark`) → «tu negocio.» (Bricolage `ideaImpact` 780,
  blanco, 66 % del ancho) · bajada Poppins 500 34 px: «Claude razona increíble. Nadie le ha contado cómo funciona tu
  empresa.» La bajada protege a la mascota del partner: el problema es el contexto, no la capacidad.
- **Firma:** `public/branding/logo-negative.svg` 170 px abajo a la derecha. Insignia de partner Claude pendiente de
  asset oficial.
- **Sistema modular:** el hombro de Nexa es el espacio intercambiable de mascota (Clawd hoy; Codex Pet después), con
  bajada e insignia ligadas a la mascota. Nunca dos mascotas de terceros en la misma imagen.

## Procedencia

| Paso | Herramienta | Detalle |
|---|---|---|
| Sprite de Clawd | `clawd/sprite.mjs` | Reconstruido desde el arte de bloques del binario oficial de Claude Code 2.1.x (` ▐▛███▜▌ / ▝▜█████▛▘ / ▘▘ ▝▝`) y el color `rgb(215,119,87)` del mismo binario. Píxel 1:2 (la celda de terminal mide el doble de alto): renderizarlo cuadrado aplana a Clawd (error corregido en v02) |
| Clawd 3D | `gpt-image-2.5-sunburst` xhigh 1600² edit · `brief/clawd-3d-{neutral,shrug}.prompt.txt` | Figura de cubos de vinilo mate; cada píxel = 1×2 cubos. `v02` fiel en silueta, ojos, brazos y cuatro patas; la pose «shrug» sube los brazos y agrega «?» en cubos (cuerpo algo más alto que el sprite) · usage out 4670 c/u |
| Fondo transparente | `pnpm ai:image:rmbg` (matting medium) | `clawd-3d-*-v02-alpha.png` |
| Referencias Nexa | OneDrive `10. Nexa (Influencer IA)` | `Avatar 3,4 v2`, `Avatar Cuerpo Completo v2`, pose `The Breakdown` (copias locales en `refs/`) |
| Plate | `gpt-image-2.5-sunburst` xhigh 1600×2000 edit con 4 referencias · `brief/plate-kv-4x5.prompt.txt` | v01: Clawd chico y al borde; v02: Clawd ~20 % del ancho, integrado a la luz · usage in 6690 (img 6101) · out 4244 |
| Composición | `compose-kv.mjs` (fontkit + sharp, tokens AXIS) | Scrim navy vertical + radial izquierdo; guardias de margen y firma; contraste mínimo 4,5:1 obligatorio |

## Revisión (juicio del agente, no aprobación humana)

| Nivel | Estado | Observación |
|---|---|---|
| Estratégico | pass | Instala el paraguas: IA capaz + falta de contexto; Efeonce como quien lo construye |
| Creativo | pass | Código del ángel/diablo reconocible al instante; espejo de gestos humano–mascota |
| Marca / partner | condicional | Clawd no se rediseña en forma ni color, pero su versión 3D en cubos y el «?» son interpretación: validar contra la guía de marca de Anthropic. Falta insignia oficial |
| Producción | pass | Contraste peor caso: entrada 5,17:1 · remate 10,95:1 · bajada 12,09:1 · logo 17,21:1. PNG 1080×1350 |

Límites: Nexa y Clawd son generados; el rostro de Nexa se validó a ojo contra sus referencias. El «hombro vacío» del
concepto original no se lee en esta composición y se descartó.
