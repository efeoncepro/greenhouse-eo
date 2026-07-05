# 11 · VFX y compositing

> **Sello de frescura.** El **craft de VFX** (compositing, keying, roto, tracking, integración
> CGI, simulaciones) es **estable**. El **landscape de AI-VFX** es **volátil** (por mes: qué tool
> automatiza roto/track/relight/mocap). Verificado **as-of 2026-07 — reverificar**. Ver `SOURCES.md`.

> **Doctrina del año.** La IA **no reemplaza al artista de VFX — lo empodera**: automatiza lo
> tedioso (roto, cleanup, tracking, keying) para que el humano decida lo que pide ojo humano.
> Encaja con el "humano + IA" de la skill: la IA acelera, el humano juzga la **credibilidad**.

> **La regla de oro del VFX.** El mejor VFX es **invisible**. Si el espectador nota "eso es un
> efecto", falló. Todo se juega en **integrar** el elemento: perspectiva, luz, color, grano,
> bordes, motion blur y contacto con la escena. Un CGI perfecto mal integrado se ve peor que uno
> simple bien integrado.

---

## 1. Qué es VFX aquí (y qué no)

VFX = crear o combinar imágenes que no se pudieron capturar en cámara, y **integrarlas de forma
creíble**. En un estudio de motion/broadcast, los casos típicos:

- **Compositing**: combinar múltiples elementos (plates, CGI, título, partículas, generación IA)
  en una toma final creíble.
- **Keying**: extraer un sujeto de un fondo (green/blue screen, chroma) y limpiar el spill.
- **Rotoscoping**: aislar un elemento **sin** green screen, cuadro por cuadro (o con IA).
- **Tracking / matchmove**: pegar un elemento al movimiento de la toma (2D, planar, cámara 3D).
- **Integración CGI**: meter 3D en una toma real (o IA) igualando luz, sombra, contacto, reflejo.
- **Simulaciones / dynamics**: humo, fuego, fluidos, partículas, cloth, destrucción (procedural).
- **Matte painting / set extension**: extender o construir un entorno.
- **Cleanup / beauty**: quitar rigs, cables, logos, objetos; retoque.

**No es esta skill:** motion de UI runtime (`motion-design`), la generación de la toma base IA
(módulo 09 — VFX **compositea** sobre lo que 09 genera) ni el color grade final (módulo 08, aunque
finishing y compositing conviven).

## 2. Compositing — el corazón

Integrar un elemento creíblemente exige igualar **7 vectores** (checklist duro):

| Vector | Qué igualar | Falla típica si lo ignoras |
|---|---|---|
| **Perspectiva** | ángulo, lente, punto de fuga | el elemento "flota", escala rara |
| **Luz** | dirección, dureza, temperatura, intensidad | sujeto iluminado distinto que la escena |
| **Sombra / contacto** | sombra propia + contacto con el suelo | objeto "pegado" sin peso, sin ancla |
| **Color** | balance, matiz de ambiente, bounce light | recorte que grita "otra fuente" |
| **Grano / ruido** | matchear el grano de la toma base | elemento demasiado limpio = falso |
| **Bordes** | edge treatment, light wrap, defocus | halo/recorte duro delatador |
| **Motion blur / DoF** | igualar blur de movimiento y profundidad | elemento nítido sobre fondo movido |

**Orden de trabajo:** key/roto → limpiar bordes + spill → color match → integrar luz/sombra →
grano + blur → light wrap final. **Node-based** (Nuke/Fusion) para tomas complejas; **layer-based**
(After Effects) para mograph y compositing ligero.

## 3. Keying y rotoscoping (con IA 2026)

- **Keying (green/blue screen):** pull del key → **spill suppression** (quitar el verde que rebota
  en el sujeto) → **edge treatment** (light wrap, defocus del borde). La IA 2026 detecta bordes,
  siluetas, motion blur y **pelo** con precisión de pixel.
- **Rotoscoping:** aislar sin green screen. **Roto Brush 2** (After Effects, ML): trazos gruesos →
  la IA propaga el matte por el clip. **Runway** / herramientas AI: remove-background isola sujetos
  sin roto manual (temp keys, mattes). Revisa siempre bordes en movimiento — la IA falla en oclusión y pelo fino.
- **Regla:** la IA da el 80% del matte en segundos; el humano corrige el 20% que se nota (bordes,
  frames de transición). No entregues un roto IA sin QC frame-a-frame en los cortes visibles.

## 4. Tracking / matchmove

| Tipo | Qué hace | Herramienta |
|---|---|---|
| **2D point track** | seguir un punto (pegar texto/logo a una superficie) | AE, Mocha |
| **Planar track** | seguir una superficie plana (pantalla, cartel, pared) | **Mocha Pro** (referencia) |
| **3D camera track / matchmove** | reconstruir la cámara para meter 3D creíble | Nuke, AE 3D tracker, Blender |

Para el **through-object move** que la IA no resuelve (módulo 09): plate estático + **cámara 3D en
post** (matchmove) + el move animado en el compositor. El VFX resuelve lo que el modelo no puede.

## 5. Integración CGI y simulaciones

- **CGI en toma real/IA:** rendea el 3D con la **misma luz** (HDRI del entorno), agrega **sombra de
  contacto**, **reflejos/bounce** y **oclusión**, y matchea grano + motion blur (§2). Sin sombra de
  contacto, el 3D flota.
- **Simulaciones (Houdini/C4D/Blender):** humo, fuego, fluidos, partículas, cloth, destrucción.
  Procedural = caro pero controlable. Alternativa barata: **stock elements** (ActionVFX-style:
  humo/fuego/polvo pregrabado) composited con blend modes — 90% de los casos de marca no necesitan sim propia.
- **Híbrido IA:** genera **plates de fondo, partículas y atmósfera** con el modelo IA (encuadre
  exacto no importa — módulo 09) y **compositea** el elemento clave (logo, título, personaje) encima.

## 6. AI-VFX 2026 — qué automatiza y cuándo *(as-of 2026-07 — reverificar)*

| Herramienta | Automatiza | Notas |
|---|---|---|
| **Nuke** (Foundry) | rey del **compositing 2D** node-based: keying, roto, deep, 3D camera track, ensamblado final | estándar de cine; el destino final de casi todo pass renderizado |
| **After Effects** (+ Roto Brush 2) | compositing layer-based + **roto ML semi-auto** | caballo de batalla del mograph/broadcast |
| **DaVinci Resolve — Fusion** | compositing node-based integrado a la edición/color | **gratis**; potente para el pipeline all-in-one |
| **Mocha Pro** (Boris FX) | **planar tracking** (Academy Award), roto, object removal, screen insert | el estándar de tracking planar |
| **Wonder Dynamics / Autodesk Flow Studio** | **mocap markerless** desde 1 cámara → mapea a rig CG (cara/cuerpo/manos) | outputs FBX/USD/EXR/PNG para Blender/Unreal/Maya/Nuke |
| **Runway** | roto/masking automático, remove-bg, estilización | acelera temp keys y mattes |
| **Beeble** | **relighting** IA de video (SwitchLight) | recuperar/cambiar luz en post |
| **Houdini / C4D / Blender** | simulaciones/dynamics procedurales | Blender gratis; Houdini cuando el FX lo justifica |

**Regla de encaje:** compositing serio → Nuke; all-in-one gratis → Fusion (Resolve); mograph +
roto rápido → After Effects; tracking planar → Mocha; mocap sin traje → Wonder/Flow Studio; roto/
matte express → Runway; relighting → Beeble; sim propia → Houdini (o stock elements si alcanza).

## 7. Borde y handoff

- **Genera** plates/partículas/atmósfera → módulo 09 (pipeline IA) + `greenhouse-ai-image-generator` (stills).
- **Compositea + integra** → acá (este módulo).
- **Grade final** → módulo 08 (color/finish). **Upscale del master** → Magnific (`SOURCES.md`).
- Craft humano de precisión (Nuke/Houdini) = **handoff con spec** (`templates/vfx-shot-breakdown.md`).

---

## 8. Reglas duras del VFX

- **NUNCA** entregues un composite sin matchear los **7 vectores** (§2) — sobre todo grano, bordes y
  sombra de contacto. Un elemento demasiado limpio o sin sombra delata el efecto.
- **NUNCA** confíes un roto/key IA sin **QC frame-a-frame** en los cortes visibles (falla en pelo/oclusión).
- **NUNCA** metas CGI sin sombra de contacto ni luz matcheada — flota.
- **NUNCA** cites de memoria qué tool AI-VFX domina — reverifica (`SOURCES.md`).
- **NUNCA** hagas una simulación cara cuando un **stock element** composited resuelve (gasto gobernado).
- **NUNCA** olvides: el mejor VFX es **invisible**. Si se nota, falló.

> **Cierre.** VFX es integrar creíblemente lo que no se capturó en cámara. La IA automatiza roto,
> tracking, keying, mocap y relighting; el humano juzga la credibilidad y hace el composite final.
> Genera con 09, compositea acá, gradea con 08. Cierra con `templates/vfx-shot-breakdown.md`.
