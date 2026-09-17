# Mascotas de partners — bibliotecas de poses 3D

Inventario local verificado el 2026-09-17. Recurso de Marketing Efeonce para piezas sociales y key visuals con
mascotas de partners (Anthropic, OpenAI). Son **interpretaciones 3D hechas por Efeonce** a partir de la fuente oficial,
no assets entregados por los partners.

## Ubicación

`/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/Recursos/Mascotas de partners`

En otra máquina localizar esa biblioteca OneDrive, no crear esta ruta personal. `Alineación` puede venir descompuesto
en Unicode: resolver con listado real, no renombrar originales.

| Carpeta relativa | Uso |
| --- | --- |
| `<Mascota (Partner)>/Fuente oficial` | Material extraído del producto oficial del partner; base de identidad de toda generación. |
| `<Mascota (Partner)>/Poses 3D/v01` | 8 ángulos de cámara × 2 variantes (fondo de estudio y transparente). |
| `<Mascota (Partner)>/Poses 3D con accesorios/v01` | 8 accesorios ligados a servicios Efeonce × 2 variantes. |

Nombre de cada pose: `efeonce-<mascota>-3d-<nn>-<pose>-1x1-1600x1600-v01-{fondo-estudio|transparente}.png`
(PNG 1600×1600). Una versión nueva va a `v02/`, sin sobrescribir `v01/`.

## Inventario por mascota

| Campo | Clawd (Claude · Anthropic) | Codex (Codex/ChatGPT · OpenAI) |
| --- | --- | --- |
| Carpeta | `Clawd (Claude)` | `Codex (OpenAI)` |
| Fuente oficial | Arte de bloques del binario de Claude Code 2.1.x y su color `rgb(215,119,87)`; píxel 1:2 (la celda de terminal mide el doble de alto). | Atlas `webview/assets/codex-spritesheet-v6-*.webp` del `app.asar` de la app ChatGPT para macOS 26.911 (contrato V2: 1536×2288, 8×11 celdas de 192×208; filas 9–10 = 16 direcciones de mirada). |
| Contenido de `Fuente oficial` | `clawd-sprite-reconstruido-claude-code-2.1.png` y `clawd-3d-referencia-neutral-transparente.png` (Clawd 3D validado en el KV). | `codex-spritesheet-v6-oficial-app-chatgpt-26.911.webp` y 11 cuadros clave ×4 (frente, tranquilo, saludo, brazos arriba, pensando, laptop, feliz, 4 miradas). |
| Material 3D | Cubos de vinilo mate (anatomía rígida y pixelada): cuerpo en bloque, ojos rectangulares, brazos y cuatro patas en cubos 1×2, sin boca. | Vinilo suave con visor de vidrio y glifos cian emisivos (anatomía blanda y redondeada): cabeza de nube, visor navy que es la cara, emblema `>_`. |
| Poses 3D | 01 frente héroe · 02 saludo tres cuartos izquierda · 03 perfil caminando · 04 contrapicado celebrando · 05 cenital mirando arriba · 06 espalda tres cuartos · 07 salto en el aire · 08 idea tres cuartos derecha. | Mismos 8 ángulos; el visor cambia de glifo según la emoción (`>_`, `^^`, `||`). |
| Accesorios | 01 detective y lupa · 02 boina y pincel · 03 megáfono · 04 casco y llave · 05 audífonos y micrófono · 06 claqueta · 07 carpetas y cajas · 08 birrete y libro. Todos en cubos. | Mismos 01–07 en estilo de juguete liso; 08 = laptop canónica de su propio atlas (reemplaza al birrete). |
| Versión | `v01` (16 + 16 PNG). | `v01` (16 + 16 PNG). |
| Producción | [`ai-generations/2026-09-17_clawd-poses-3d/`](../../../ai-generations/2026-09-17_clawd-poses-3d/LEEME.md) | [`ai-generations/2026-09-17_codex-poses-3d/`](../../../ai-generations/2026-09-17_codex-poses-3d/LEEME.md) |
| Límites conocidos | Algunas poses salen con el cuerpo algo más alto que el sprite; el perfil tomó 3 intentos y la cenital 2. La variante transparente del salto pierde la sombra. | La cenital es un picado alto (~70°), no cenital puro. El recorte de «saludo» se reparó (hueco en el emblema). |

## Reglas de uso

1. **Una sola mascota de partner por imagen.** Nexa puede acompañar; dos mascotas de terceros juntas, nunca
   (sistema modular del [KV «Tu IA no conoce tu negocio»](2026-09-17-kv-tu-ia-no-conoce-production-method.md)).
2. **Validar la guía de marca del partner antes de pautar** (Anthropic para Clawd, OpenAI para Codex). Las poses, el
   material 3D y los accesorios son interpretación: sirven para exploración y orgánico aprobado, no certifican uso
   pagado. Registrar la validación y la insignia oficial de partner cuando existan.
3. **No alterar a la mascota.** Forma, proporción, colores y rasgos canónicos se mantienen; un accesorio se agrega en
   el estilo de la mascota y nunca la redibuja. No usar copias de fans como referencia.
4. Usar la variante `transparente` para componer y la de `fondo-estudio` como pieza autónoma o referencia. Revisar el
   recorte sobre fondo oscuro antes de publicar.
5. Conservar originales; derivados de campaña en la carpeta de esa campaña. No mover ni subir la biblioteca completa.

## Método y extensión

El método (fuente oficial primero → decisión de material por anatomía → base validada → 8 ángulos con descripción
geométrica explícita → accesorios → `pnpm ai:image:rmbg` con relleno de huecos → QA sobre gris y navy → OneDrive)
vive en [`mascot-3d-pose-library.md`](../../../.claude/skills/greenhouse-ai-image-generator/references/mascot-3d-pose-library.md).
El mismo método se aplicará a Nexa con destino propio (ver
[biblioteca creativa de Nexa](NEXA_CREATIVE_RESOURCE_LIBRARY.md)), no dentro de `Mascotas de partners`.
