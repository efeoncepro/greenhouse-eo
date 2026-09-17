# Codex 3D — biblioteca de poses (2026-09-17)

Pedido del operador: replicar con Codex (mascota de Codex/ChatGPT, partner OpenAI) lo hecho con Clawd — poses 3D de
alta calidad desde distintos ángulos y con accesorios ligados a Efeonce — dejarlo en la carpeta de contenidos y
documentar el método para repetirlo con Nexa.

**Destino OneDrive:** `5. Contenidos/Recursos/Mascotas de partners/Codex (OpenAI)/`
- `Fuente oficial/` — atlas oficial `codex-spritesheet-v6-oficial-app-chatgpt-26.911.webp` + 11 cuadros clave ×4.
- `Poses 3D/v01/` — 8 ángulos × (`-fondo-estudio.png`, `-transparente.png`), PNG 1600×1600.
- `Poses 3D con accesorios/v01/` — 8 accesorios × 2 variantes.

## Fuente oficial

- App ChatGPT de macOS 26.911: `/Applications/ChatGPT.app/Contents/Resources/app.asar` →
  `webview/assets/codex-spritesheet-v6-51045ae208c0.webp` (extraído con `npx @electron/asar extract-file`). El mapa
  `webview/assets/codex-pet-assets-*.js` lista las mascotas incluidas: bsod, codex, dewey, fireball, hoots,
  null-signal, rocky, seedy, stacky.
- Contrato V2 de mascotas (`Resources/skills/.../hatch-pet/references/codex-pet-contract.md`): atlas 1536×2288,
  8 columnas × 11 filas, celdas 192×208; filas 0–8 estados; filas 9–10 = 16 direcciones de mirada (000 = arriba).
- `sprites/extract.mjs` extrae frente, tranquilo, saludo, brazos arriba, pensando, laptop, feliz y cuatro direcciones.

## Anatomía y paleta medidas

Cabeza de nube (~60 % de la altura) · visor rectángulo redondeado navy `#203060` que ES la cara (sin boca ni ojos aparte)
· glifos cian de terminal como expresión: `>_` (predeterminada), `︶︶` tranquilo, `^^` feliz, `><`, `xx`, `||` atento,
`_<` mirada lateral · torso pequeño con emblema `>_` · brazos y piernas cortos. Azules del cuerpo: luz `#70a0ff`, base
`#5080f0`, sombra `#4060e0`; contorno `#101030`.

## Método

1. **Decisión de material:** Codex es blando y redondeado → figura de vinilo suave con visor de vidrio y glifos
   emisivos. Clawd, rígido y pixelado, fue a cubos. Hacer a Codex en cubos habría borrado la nube.
2. **Base validada antes de producir:** `brief/base-frente` y `base-tres-cuartos` con referencias sprite frente +
   miradas 090 y 270 (`sprites/ref-*.png`, aplanadas sobre gris). Se verificó nube, glifos `>_`, emblema y proporción.
3. **Poses:** `gpt-image-2.5-sunburst` xhigh 1600×1600 edit con `out/codex-3d-base-frente.png` + sprite frente (la
   laptop suma el sprite laptop). Plantilla con invariantes de identidad + expresión del visor + pose y cámara.
4. **Recorte:** `pnpm ai:image:rmbg`. El matting dejó transparentes zonas internas (el `_` del emblema en «saludo»);
   desde esta corrida la CLI rellena por defecto los huecos internos que no son fondo (`scripts/ai/fill-alpha-holes.ts`,
   en proceso aparte por el sharp anidado del paquete de matting). Revisión de todos los recortes sobre navy.

## Poses

| # | Pose | Cámara | Visor | Nota |
|---|---|---|---|---|
| 01 | Frente héroe | Frontal | `>_` | — |
| 02 | Saludo | Tres cuartos izquierda | `^^` | Recorte reparado (hueco en el emblema) |
| 03 | Caminando | Perfil | visor de canto | — |
| 04 | Celebrando | Contrapicado | `^^` | — |
| 05 | Mirando arriba | Cenital | `||` | v01 no era cenital; v02 aprobada |
| 06 | Espalda | Tres cuartos trasero | — | — |
| 07 | Salto | Tres cuartos derecha, bajo | `^^` | — |
| 08 | Idea con «!» cian | Tres cuartos derecha | `||` | — |

| # | Accesorio | Visor | Relación con Efeonce |
|---|---|---|---|
| 01 | Detective con lupa | `||` | Auditoría, AEO |
| 02 | Boina y pincel | `^^` | Creatividad y branding |
| 03 | Megáfono | `>_` | Paid media |
| 04 | Casco y llave | `>_` | Implementación CRM |
| 05 | Audífonos y micrófono | `︶︶` | Podcast y comunidad |
| 06 | Claqueta | `>_` | Producción audiovisual |
| 07 | Carpetas y cajas | `^^` | Datos ordenados |
| 08 | Laptop (canónica de su atlas) | `>_` | Contenido y desarrollo |

## Límites

- Interpretación 3D de la mascota de un partner: validar con la guía de marca de OpenAI antes de pautar.
- La cenital es un picado alto (~70°), no un cenital puro.
