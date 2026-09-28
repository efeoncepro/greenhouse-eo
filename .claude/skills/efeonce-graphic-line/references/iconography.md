# Iconografía de la línea: Trazo y Plastilina

> Verificado contra: AXIS `main@5b8ab20` (tokens `0.3.6`, `@efeoncepro/axis-graphic-line` `0.4.0`, publicados con el
> tag `v0.3.6`) y el canvas «Íconos de La órbita» (claude.ai/artifact/Y9mx42L72zYc6iLg4j3Maj, versión 20) — 2026-09-26 ·
> decisiones del operador D16–D22 ([ledger.md](ledger.md)). §12 (Plastilina en volumen, D24): AXIS `main@c18e3d3`
> (`axis-tokens` 0.3.7 y `axis-brand-assets` 0.3.2, **publicados** con el tag `v0.3.7` sobre `main@c0020b6`) —
> 2026-09-27. §13 (catálogo y oficio, D25): AXIS main@aa66225, 2026-09-27 (`@efeoncepro/axis-graphic-line` 0.5.0 y
> `@efeoncepro/axis-brand-assets` 0.3.3, publicados con el tag `v0.5.0`; `axis-tokens` sigue en 0.3.7). §13 (IA,
> social y staff, D26): AXIS main@cf77452 (2026-09-27) (`@efeoncepro/axis-graphic-line` 0.6.0 y `@efeoncepro/axis-brand-assets`
> 0.3.4, publicados con el tag `v0.6.0`; `axis-tokens` iba en 0.3.8 en ese release, publicado por otra sesión con superficies, y no
> cambió por D26).
>
> **Estado: canónica** (el operador la canonizó el 2026-09-26, D22). **La fuente de verdad es AXIS**, no este documento:
> valores en `efeonceGraphicLine.icons` (`@efeoncepro/axis-tokens`), geometría y reglas ejecutables en
> `@efeoncepro/axis-graphic-line/icons`, guía completa en `axis-design-system/docs/agent-composition/iconography.md`,
> página para el equipo en `axis.efeonce.org/references/iconography/` y datos para agentes en
> `/references/iconography.json`. Este documento resume el criterio y la historia; si difiere de AXIS, manda AXIS.

## 0. Cómo lo usa un agente (lo primero)

1. La voz la decide la línea de servicio de la pieza: `iconVoiceForLine(line)` → Trazo (Growth, Engine, Revenue) o
   Plastilina (Brand); Voice, por decidir.
2. El glifo sale de `ICON_CATALOG` (79: 36 de Trazo y 43 de Plastilina, con los 30 de oficio de D25 y los 19 de IA,
   social y staff de D26; lista en §13).
   **Si no existe, no se dibuja dentro de la pieza**: se
   da de alta con `pnpm icons:check` (Trazo) o `pnpm icons:vectorize` + `pnpm icons:check` (Plastilina), en el repo AXIS,
   y con la aprobación del operador.
3. Se pinta con `resolveIcon({ glyph, state, size, line, surface, gesture, label })`: nunca se transcriben HEX ni px.
4. Reposo por defecto; responde uno solo y sólo si la pieza no tiene otra esfera. Antes de entregar,
   `auditIconGroup(items, { pieceHasSphere })`.
5. Plastilina protagonista: `skewedOrbitHeroSvg` (el objeto en reposo, la órbita pone la esfera).
6. Paquetes publicados: el catálogo completo de **86 glifos** (37 Trazo + 49 Plastilina) está en
   `@efeoncepro/axis-graphic-line` `0.9.0` y sus 49 volúmenes en `@efeoncepro/axis-brand-assets` `0.3.6` (tag `v0.9.0`,
   2026-09-28, suma la Plastilina `mano` de D29); la 0.8.0 (tag `v0.8.0`) trae 85 con el Trazo `swipe` de D28; la 0.7.0 (tag `v0.3.12`)
   trae 84 (con las 5 Plastilina de Glitch, D27); la 0.6.0 (tag `v0.6.0`) trae 79; la 0.5.0 (tag `v0.5.0`) trae 60 (sin D26) y la 0.4.0 (tag `v0.3.6`) sólo los 30 de la base. Greenhouse
   fija axis-graphic-line 0.6.0 y axis-brand-assets 0.3.4 (2026-09-27); para una pieza, el paquete o
   `pnpm icons:export` en AXIS.
7. Un objeto protagonista en volumen (D24): usa el PNG de `@efeoncepro/axis-brand-assets` (`volumeIconUrl(glyph)`);
   nunca lo generes de nuevo ni lo uses en listas o UI (§12).

## 1. La idea

Un ícono de la línea tiene **dos estados** del mismo dibujo:

- **Reposo:** trazo limpio, uniforme, sin acento. Es el ícono de todos los días.
- **Respuesta:** una sola **esfera** en el acento de la línea marca el punto donde la acción se resuelve.

La esfera es un **estado**, no parte del dibujo. Es la gramática de la marca aplicada al ícono —«el anillo pregunta, la
esfera responde» ([criteria.md](criteria.md) §1)— sin gastar la esfera en cada ícono: el trazo limpio convive con
cualquier pieza y la respuesta se reserva para lo que importa.

Nació de un híbrido (D16): de tres direcciones exploradas, el trazo limpio (A) quedó como reposo, el punto de respuesta
(B) como respuesta, y la «órbita abierta» (C, cada contorno con un corte) se descartó porque competía con la órbita del
isotipo en vez de acompañarla.

## 2. Construcción

| Parámetro | Valor |
|---|---|
| Grilla | 24 × 24, con **margen de 2** (el dibujo vive en 20 × 20). Es la grilla de Tabler: el set convive con los íconos de la firma de correo |
| Líneas guía | círculo de radio 10, cuadrado de 18, rectángulo apaisado de 20 × 16 |
| Trazo | **1,5** en unidades de la grilla |
| Trazo en tamaños chicos | **1,75** en 20 px o menos (compensación óptica) |
| Trazo en tamaños grandes | **tope de 4 px** sobre 64 px: el trazo deja de escalar para no pesar más que la órbita (2,4–3,8 px en redes) |
| Remates y uniones | redondos (`stroke-linecap` y `stroke-linejoin` `round`) |
| Esfera | círculo **relleno**, radio **1,75** en la grilla, un solo tamaño en todo el set |
| Aire de la esfera | **0,5** como mínimo entre el borde de la esfera y cualquier trazo (medido con el trazo incluido) |
| Respuesta | desde **20 px**; más chico, el ícono va sólo en reposo (la esfera bajaría de ~2,3 px) |

Las cifras de trazo en tamaños chicos y grandes son **ópticas**: se aplican al exportar cada tamaño, no se dibujan dos
geometrías.

## 3. Cómo nace la esfera en cada glifo

Dos maneras, y cada glifo usa una sola:

- **Reemplaza:** una pieza del reposo se vuelve la esfera. La punta de la flecha de Revenue, el tope de la barra más alta
  de Medición, la onda exterior de Medios, el primer punto de la ventana de Web, la cabeza de la segunda persona de
  Talent, la muesca superior de Finance.
- **Completa:** la esfera aparece donde la acción se resuelve. El centro de la lupa de Búsqueda; el punto final que deja
  el lápiz de Contenido.

Un glifo nuevo se dibuja **ya con el lugar de su esfera previsto**, con su aire de 0,5. Si no hay un lugar con sentido
(una punta, un tope, un centro, un punto final), el glifo no tiene respuesta y queda siempre en reposo.

## 4. Color

- **Fondo:** `#001a33` en **todas** las líneas (D21) o papel `#f7f8f6` (`color.paper`).
- **Tinta:** blanco sobre oscuro; navy `#023c70` sobre papel.
- **La línea es de la pieza, no del objeto:** un ícono no tiene línea propia. Toma el acento de la línea de servicio
  de la pieza donde va (una keynote en un deck de Growth va en teal; en uno de Brand, en naranja sobre oscuro y carmesí
  sobre papel). Sin línea clara,
  la de la marca madre, Growth.
- **Acento:** **sólo la esfera**, en el acento de la línea de servicio. Sobre oscuro, el acento oscuro de la línea; sobre
  papel, el claro (valores en `efeonceGraphicLine.lines[]`, ver [package-and-tokens.md](package-and-tokens.md)).
- El acento mide **≥ 3:1** contra su fondo (D1). El teal claro `#36c8bf` nunca sobre papel (1,94:1).
- **Nunca** el ícono entero en el acento, ni el trazo en el acento, ni la esfera en tinta.

## 5. Cuándo responde

| Situación | Estado | Por qué |
|---|---|---|
| El ícono es la pieza (protagonista, sin otra esfera) | **respuesta** | su esfera es la única |
| Una fila o grupo de íconos | **responde uno solo**: el activo (la sección donde vamos, el servicio que se vende) | la esfera marca lo que importa |
| La pieza ya tiene esfera (la de la órbita o la que cierra la respuesta) | **reposo** | el canon ya cierra con esas esferas; el ícono no suma otra |
| Dentro de una órbita (firma de equipo, post con órbita) | **reposo** | la órbita ya responde |
| Satélites del mapa de canales o de familia | **reposo** | los satélites no llevan esfera |
| Listas, tablas, contacto, navegación | **reposo** | la esfera nunca es viñeta |
| Menos de 20 px | **reposo** | la esfera no se lee |

Regla corta: **responde el que importa, y sólo si nadie más está respondiendo.**

## 6. Contenedores

| Contenedor | Tamaño de referencia | Estado |
|---|---|---|
| Solo | 24–72 px | reposo, salvo que sea protagonista |
| Sobre disco (`#0b2b4a` oscuro, `#eef3f7` claro) | ícono al 40 % del disco | responde si es protagonista |
| Dentro de la órbita | ícono a 72/208 de la caja (la geometría del retrato, `emailSignature.team.areaMark`) | reposo |
| Satélite | disco de 30–36 px, ícono de 18–20 px | reposo |

El ícono dentro de la órbita respeta las reglas de la órbita: un solo anillo, nada cruza el anillo y el ícono vive
adentro con aire ([criteria.md](criteria.md) §3.1 y §3.7).

## 7. En una pieza

- **Deck:** íconos de 48–56 px sobre las columnas; en una fila responde uno solo (el servicio que se vende), y **todos**
  llevan el acento de la línea de la pieza, aunque el uso del catálogo diga otra línea. Composición de fila en la guía
  de AXIS (§«En una fila»).
- **Post con órbita:** el ícono va dentro de la órbita en reposo y con el tope de trazo (a 220 px, el trazo queda en 4 px,
  a la par del arco de 3,8 px). La respuesta con esfera y la esfera de la órbita ya cierran.
- Los íconos nunca se repiten como patrón (la misma regla que la esfera y la órbita, [criteria.md](criteria.md) §2.2).

## 8. No hacer

- Todos los íconos de una fila respondiendo: la esfera se vuelve viñeta.
- Responder junto a otra esfera (órbita o respuesta).
- La esfera fuera de regla: más grande, sin acento (en tinta), hueca o suelta lejos del glifo.
- Volumen, brillo, sombras, degradés o esferas de vidrio en el Trazo o en el plano (el único volumen es Plastilina en
  volumen, §12, que sale del set aprobado; nunca se inventa en la pieza).
- El acento oscuro sobre papel.
- El ícono cruzando el anillo de una órbita.
- Mezclar este set con otra familia de íconos en la misma pieza (salvo Tabler en la firma de correo mientras dure la
  migración).
- Dibujar un glifo nuevo a mano en una pieza: primero entra al set con su construcción y su esfera prevista.

## 9. Geometría canónica (set actual)

`viewBox="0 0 24 24"`, `fill="none"`, trazo en tinta, remates redondos. La respuesta dibuja además
`<circle cx cy r="1.75" fill="acento">`.

Constantes:

```text
LENS   = M4 10a6 6 0 1 0 12 0a6 6 0 1 0 -12 0
PENCIL = M4 20h4l10.5 -10.5a2.83 2.83 0 0 0 -4 -4l-10.5 10.5v4
MEGA   = M4 10v4a1 1 0 0 0 1 1h2l5 4v-14l-5 4h-2a1 1 0 0 0 -1 1
WIN    = M4 7a3 3 0 0 1 3 -3h10a3 3 0 0 1 3 3v10a3 3 0 0 1 -3 3h-10a3 3 0 0 1 -3 -3z
COIN   = M2.5 12a9.5 9.5 0 1 0 19 0a9.5 9.5 0 1 0 -19 0
S2     = M14.55 9.5a1.75 1.75 0 0 0 -1.55 -1h-2a1.75 1.75 0 1 0 0 3.5h2a1.75 1.75 0 1 1 0 3.5h-2a1.75 1.75 0 0 1 -1.55 -1
HEAD   = M6 7a3 3 0 1 0 6 0a3 3 0 1 0 -6 0
BODY   = M3 20v-1a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v1
CARD   = M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2z
DOC    = M6 3h8l4 4v14h-12z
```

| Glifo | Uso | Reposo | Respuesta (trazos) | Esfera (cx, cy) | Modo |
|---|---|---|---|---|---|
| Búsqueda | Engine · SEO | `LENS` · `M20 20l-5.6 -5.6` | igual al reposo | 10, 10 | completa |
| Medición | Growth · datos | `M4 20h16` · `M7 16v-3` · `M12 16v-7` · `M17 16v-11` | `M4 20h16` · `M7 16v-3` · `M12 16v-6` · `M17 16v-6` | 17, 6.5 | reemplaza |
| Contenido | Brand | `PENCIL` · `M13.5 6.5l4 4` | igual al reposo | 18.5, 19.5 | completa |
| Medios | Voice | `MEGA` · `M16 9a4 4 0 0 1 0 6` · `M18.5 6.5a7.5 7.5 0 0 1 0 11` | `MEGA` · `M16 9a4 4 0 0 1 0 6` | 20.35, 12 | reemplaza |
| Revenue | RevOps | `M4 17l5 -5l4 4l7 -7` · `M15 9h5v5` | `M4 17l5 -5l4 4l4.5 -4.5` | 19.75, 9.25 | reemplaza |
| Web | Engine · web | `WIN` · `M4 10h16` · `M7.25 7h.01` · `M10.5 7h.01` | `WIN` · `M4 10h16` · `M10.5 7h.01` | 7.25, 7 | reemplaza |
| Talent | área | `HEAD` · `BODY` · `M16 4.13a3 3 0 0 1 0 5.75` · `M21 20v-1a4 4 0 0 0 -3 -3.85` | `HEAD` · `BODY` · `M21 20v-1a4 4 0 0 0 -3 -3.85` | 17, 7 | reemplaza |
| Finance | área | `COIN` · `S2` · `M12 6.5v2m0 7v2` | `COIN` · `S2` · `M12 15.5v2` | 12, 5.5 | reemplaza |
| Embudo | Revenue · funnel | `M4 4.5h16l-6 8v6l-4 2.5v-8.5z` | igual al reposo | 12, 8 | completa |
| CRM | Revenue · CRM | `CARD` · `M6.5 10a2 2 0 1 0 4 0a2 2 0 1 0 -4 0` · `M6 16.5a2.5 2.5 0 0 1 5 0` · `M13 9.5h5` · `M13 13h5` | `CARD` · cabeza · cuerpo · `M13 9.5h5` · `M13 13h1.5` | 17.5, 13 | reemplaza |
| Automatización | Revenue · RevOps | `M19 12a7 7 0 1 1 -2.05 -4.95` · `M17 3.5v3.6h-3.6` | `M19 12a7 7 0 1 1 -2.95 -5.71` | 18.06, 8.5 | reemplaza |
| Informe | Growth · reportes | `DOC` · `M14 3v4h4` · `M9 17v-3` · `M12 17v-5.5` · `M15 17v-2` | `DOC` · `M14 3v4h4` · `M9 17v-3` · `M12 17v-2.5` · `M15 17v-2` | 12, 10.5 | reemplaza |

Aire verificado a mano el 2026-09-26 (≥ 0,5 en todos; Embudo, CRM, Automatización e Informe entraron ese día, en
revisión del operador). Revenue y Medios se corrigieron para cumplirlo: la línea de
Revenue termina en 17,5 / 11,5 y la esfera de Medios va en x 20,35.

Esta tabla es la **base** (12). Los 15 de Trazo del oficio (D25) y los 9 de IA, social y staff (D26), listados en §13,
no se transcriben aquí: su geometría vive sólo en `STROKE_GLYPHS` de AXIS (`@efeoncepro/axis-graphic-line` 0.6.0) y se
pinta con `resolveIcon`.

### 9.1 Cómo entra un glifo nuevo de trazo

Un glifo nuevo se dibuja una vez, entra al set y recién después se usa en piezas (§8).

1. **Dibujar en la grilla 24** con margen 2 y remates redondos. Llena la guía que corresponde a su forma: círculo de
   radio 10 (objetos redondos), cuadrado de 18 (compactos) o rectángulo de 20 × 16 (apaisados: pantallas, láminas).
2. **Prever la esfera desde el dibujo:** elegir el modo (reemplaza o completa, §3) y dejarle su lugar.
3. **Escribirlo en JSON** (`key`, `label`, `use`, `mode`, `rest`, `response`, `dot`); ejemplo en AXIS
   `docs/examples/iconography/stroke-glyph-keynote.json`.
4. **Verificar** con `pnpm icons:check -- --glyph <glifo.json> --out <dir>` (en AXIS): mide el aire (≥ 0,5 con trazo 1,5),
   el margen y deja el control a 160, 64, 32, 24 y 20 px sobre `#001a33` y papel. Sale con 1 si falla.
5. **Alta:** con la aprobación del operador entra a `STROKE_GLYPHS` (`packages/graphic-line/src/icons-stroke-data.ts`),
   cuya prueba mide el aire de todo el set. Antes, no sale en piezas.

Dos reglas que dejó el oficio (D25, ver [lessons.md](lessons.md), 2026-09-27): la **clave es única entre las dos voces**
(el Trazo del teléfono se llama `llamada` porque `telefono` ya es la Plastilina), y el Trazo **no usa arcos
elípticos**: `samplePath` sólo mide arcos circulares, así que un óvalo se dibuja con cuatro arcos circulares tangentes
(caso: `base-de-datos`).

## 10. Implementación y pendientes

- **Hecho y publicado el 2026-09-26 con el tag `v0.3.6` (AXIS `main@5b8ab20`):** tokens `efeonceGraphicLine.icons` (`axis-tokens` 0.3.6) y el
  subpath `@efeoncepro/axis-graphic-line/icons` (0.4.0) con la geometría de este §9, la API y los comandos
  `icons:export|check|vectorize`; página `/references/iconography/`.
- **Hecho y publicado el 2026-09-27 con el tag `v0.5.0` (AXIS main@aa66225, 2026-09-27):** los 30 glifos de oficio (D25, §13)
  en `@efeoncepro/axis-graphic-line` 0.5.0 y sus 15 volúmenes en `@efeoncepro/axis-brand-assets` 0.3.3; el Lab
  mostró entonces los 60 del catálogo y los 33 volúmenes.
- **Hecho y publicado el 2026-09-27 con el tag `v0.6.0` (AXIS main@cf77452 (2026-09-27)):** los 19 glifos de IA, social y staff
  (D26, §13) en `@efeoncepro/axis-graphic-line` 0.6.0 y sus 10 volúmenes en `@efeoncepro/axis-brand-assets` 0.3.4; el
  Lab muestra los 79 del catálogo y los 43 volúmenes. Greenhouse fija axis-graphic-line 0.6.0 y axis-brand-assets 0.3.4.
- **Pendiente (operador):** el inventario del set (qué íconos necesita la marca: líneas, canales, áreas, contacto) y si
  este set reemplaza a los Tabler outline de la firma de correo y de la firma de equipo (`emailSignature.icons`,
  `team.areaMark`). Mientras no se decida, la firma sigue con Tabler.

## 11. Plastilina, la voz blanda (canónica desde D22)

El operador pidió un estilo **complementario** con punch y personalidad para el oficio creativo. Tras descartar los
tratamientos dibujados a mano y dos rondas generadas, eligió la dirección E y la llamó **Plastilina** (D19); la
**órbita sesgada** quedó como su firma (D20) y el **fondo Efeonce `#001a33`** va en todas las líneas (D21). Vive en la
sección 2 del canvas «Íconos de La órbita»: anatomía E1, post E2, set E3, receta E4, no hacer E5, story E6, LinkedIn E7,
stickers E8 e ícono maestro vectorial `IconoE.dc.html`.

> **Estado:** canónica (D22, 2026-09-26): nombre, dirección, color por línea, órbita sesgada, fondo, receta, método,
> los 18 glifos de la base, los «no hacer» y los formatos. El 2026-09-27 entraron 15 de oficio (D25) y 10 de IA,
> social y staff (D26): el set de Plastilina queda en 43 (§13). Siguen abiertos sólo los pendientes del ledger (voz de Voice, aire a
> 20 px, opacidad del anillo sesgado, esfera en voz o ícono).

### 11.1 Dos voces, una familia

Trazo para lo que se mide (Growth, Engine, Revenue; decks, informes, listas); Plastilina para lo que se crea
(Brand/Globe). Voice está por decidir. Comparten la paleta, la esfera (reposo o respuesta), las grillas 24 y 48 y los
remates redondos. En una pieza con las dos manda una (Plastilina grande, Trazo chico de apoyo), una sola esfera responde
y nunca se mezclan en un mismo grupo.

### 11.2 Receta (E4)

| Parte | Valor |
|---|---|
| Grilla | 48 × 48. La silueta cabe en un **círculo de radio 22,5** centrado en (24, 24); en diagonal puede pasar el margen de 2 del cuadrado, en los ejes no |
| Tamaño óptico | Se iguala por **área**, no por caja: la silueta ocupa unos 560 u² (24 % de la grilla), con radio máximo 22,5. Escala `k = min(√(560 / área), 22,5 / radio)`. El área es la de la silueta **sin** calados; el radio se mide desde el **centro de la caja** del objeto hasta su punto más lejano, y la silueta se centra con ese centro en (24, 24). Un objeto alargado (guitarra, pincel) queda bajo 560 porque manda el radio: es correcto |
| Silueta | Masa plana y gorda; el contorno conserva la mano, nunca una esquina viva |
| Giro | El objeto va inclinado, tomado en uso; nunca de frente y quieto |
| Calados | Recortes redondos contra el fondo, con las curvas de la silueta |
| Esfera | Radio 3,4 en la grilla de 48 (casi el mismo tamaño relativo que el Trazo: 7,1 % contra 7,3 %), con 1,1 de aire calado (anillo de 4,5 en máscara) |
| Reposo | Sin esfera y **sin** el anillo calado: el objeto queda entero, con sus calados propios |
| Gesto | Trazo de 2,8 con remate redondo, **en tinta**, sólo en el protagonista (en respuesta, o en reposo cuando la órbita sesgada pone la esfera). Son 2 a 5 trazos cortos (2,5 a 5,6 de largo), fuera de la silueta, que dicen qué hace el objeto: rayos que irradian (bombillo), líneas de velocidad paralelas (rayo), marcas de vibración a los lados (teléfono). Hoy: bombillo, rayo y teléfono |
| Contenido de pantallas | Barras redondeadas de 2,6, en tinta |
| Tamaños | Desde 32 px; más chico, se usa el Trazo. Si un calado se empasta a 32 px, se simplifica el objeto (se funden o se quitan los calados finos), nunca se agranda la esfera |
| Color | Fondo `#001a33` en todas las líneas, tinta blanca (navy `#023c70` sobre papel `#f7f8f6`). El acento de la línea va **sólo en la esfera**: el oscuro sobre `#001a33` y el claro sobre papel (§4). Gesto y barras, en tinta |

**Órbita sesgada:** elipse inclinada −16°, alta un tercio de su ancho; pasa detrás del objeto arriba y delante abajo,
con un calado de 12 px del color del fondo; anillo blanco tenue de 2,4 px (en 1080); arco de 3,8 px en el acento por el
frente, de 118° a 52°, y esfera de radio 8,3 con anillo de fondo de 12,5, fuera del objeto. Una por pieza, sólo
alrededor del protagonista; nunca cruza el texto ni mide. Objeto de 320 px o más en 1080. **Opacidad del anillo por
decidir:** 22 % o 30 % (prueba de teléfono a 390 px en E4).

### 11.3 Método para dibujar un ícono nuevo

**El método canónico vive en AXIS** (`docs/agent-composition/iconography.md` §«Un glifo nuevo de Plastilina») y se
ejecuta con sus comandos; esto es el resumen:

1. **Generar la forma, nunca el color:** desde Greenhouse,
   `pnpm ai:image --image ../axis-design-system/docs/agent-composition/iconography/plastilina-style-reference.png --prompt-file <prompt> --size 1024x1024 --out <hoja.png>`
   con el prompt modelo de AXIS (`iconography/plastilina-prompt.txt`, cambia sólo `{{OBJETOS}}`). La referencia es el
   mismo archivo que `ai-generations/2026-09-26_iconos-planos/r2/inflado.png` (no versionado): se usa el de AXIS. Sólo
   fondo y blanco, sin naranja; para un objeto, nueve variantes.
2. **Vectorizar:** `pnpm icons:vectorize` en AXIS (componentes conexos, potrace, normalización por área, calados y
   esfera propuesta en el calado mayor).
3. **Elegir la variante:** inclinada, gorda, con calados legibles y peso dentro del set (394–559 u²).
4. **Esfera** donde está la acción (el centro del calado si la acción es un calado), radio 3,4 con anillo de 4,5.
5. **Gesto** si será protagonista: 2–5 trazos rectos en tinta, 2,4–5,6 de largo, aire ≥ 0,5, dentro de la grilla.
6. **Verificar** con `pnpm icons:check` (mide peso, calados y gesto; deja hojas a 160, 64 y 32 px) y revisar a ojo que
   se lea como familia: el control mide el peso, no el carácter. Caso real: la guitarra de la segunda prueba a ciegas
   pasó todo lo medible pero se leía más liviana por un mástil fino.
7. **Alta** con la aprobación del operador: entra a `PLASTILINA_GLYPHS` en AXIS con su prueba.

### 11.4 Inventario (E3)

Dieciocho glifos en `IconoE.dc.html`: rayo, paleta, pincel, cuentagotas, bombillo, tablet, laptop, escritorio,
teléfono (primera tanda) y cámara, claqueta, micrófono, pluma, cursor, tijeras, megáfono, audífonos, corazón (segunda
tanda). Es la **base**: el 2026-09-27 (D25) entraron 15 de oficio (lápiz, rodillo, aerosol, escuadra, post-it,
encuadre, película, vinilo, guitarra, reproducir, varita, taza, lámpara, trofeo, estrella) y ese mismo día (D26) 10 de
IA, social y staff (chispa, prompt, barra-busqueda, aro-de-luz, television, like, galeria, biblioteca, hoodie, gorra),
que no están en `IconoE.dc.html`; el set queda en 43 (§13). La geometría canónica vive en AXIS: `PLASTILINA_GLYPHS` en
`packages/graphic-line/src/icons-plastilina-data.ts` (`t` transformación, `d` trazado, `dot` esfera, `over` barras,
`gesture` marcas de acción). `resolveIcon` la pinta con su máscara, su gesto y su esfera; no se copia a mano.

### 11.5 No hacer (E5)

- Las dos voces en un mismo grupo o fila.
- La órbita sesgada midiendo un dato: la sesgada es gesto; lo que mide va en la circular.
- Todos los íconos con gesto y con esfera: responde uno solo, el protagonista.
- Un objeto sin carácter: de frente, simétrico, con esquinas vivas y quieto (se lee como stock).
- Volumen, brillo, sombras o degradés en el plano. El volumen es otra capa (§12), con su PNG aprobado; no se «infla» el
  plano dentro de una pieza.
- La órbita cruzando el texto: rodea sólo al objeto; la voz vive fuera, en el tercio inferior.

### 11.6 Formatos

| Formato | Canvas | Composición |
|---|---|---|
| Post 4:5 | E2 · 1080 × 1350 | Objeto arriba con la órbita sesgada; voz en el tercio inferior (pregunta 38 / respuesta 140), logo centrado al 20 % del lado corto |
| Story 9:16 | E6 · 1080 × 1920 | Objeto de 640 en (220, 330), órbita centrada en (540, 707); voz desde 1270 (42 / 160); logo desde 1600 |
| LinkedIn 1,91:1 | E7 · 1200 × 627 | Objeto de 360 a la derecha, órbita en (950, 302); voz a la izquierda (24 / 76); sin firma |
| Stickers | E8 · 1080 × 1080 | Círculos navy de 300 px con borde blanco de 10 px, el objeto girado en respuesta y con gesto; sin órbita |

La voz sigue siempre el canon de la línea (pregunta Poppins 300 con aro, respuesta Bricolage 760 con esfera de cierre;
ver `criteria.md`).

## 12. Plastilina en volumen (canónica desde D24, 2026-09-27)

> **Estado:** canónica en AXIS `main@c18e3d3` y en el Lab (operador, 2026-09-27: «Bien, ese estilo me gusta,
> canonízalo y mándalo también a la web y a todos los espacios que corresponda»). Los paquetes que la traen
> (`axis-tokens` 0.3.7 y `axis-brand-assets` 0.3.2) están **publicados** con el tag `v0.3.7` (2026-09-27). Greenhouse
> ya fija esas versiones (commit `f3f93c926`, 2026-09-27). Guía completa: AXIS `docs/agent-composition/iconography.md`
> §«Plastilina en volumen»; ADR AXIS `docs/architecture/ICONOGRAPHY_DECISION_V1.md` §«Delta 2026-09-27 — Plastilina en
> volumen (D24)». Si difiere de AXIS, manda AXIS.

### 12.1 Qué es

La **tercera capa** de la iconografía: Trazo · Plastilina plana · **Plastilina en volumen**. Cada glifo de Plastilina en
**arcilla mate, inflada, sin aristas**, generado **desde su vector aprobado**, nunca una forma nueva. **Complementa al
plano, no lo reemplaza.** «Clay» es como el diseño suele llamar a este estilo 3D (claymorphism); el nombre canónico
sigue siendo **Plastilina** (en inglés, «Plasticine»), y el volumen es una capa de ella, no una voz nueva.

### 12.2 Cuándo sí y cuándo no

| Sí | No |
|---|---|
| Portada, key visual | Listas, tablas, navegación |
| Pieza social con un solo objeto | Contenido de deck (columnas, filas de servicios) |
| Escenario, merch | Dashboards y UI (ahí van el plano o el Trazo) |
| El objeto en escena | Un grupo con Plastilina plana o con el Trazo |
| Desde 160 px | Bajo 160 px: se usa el plano |

**Uno por pieza** (`perPiece: 1`). Sólo marca propia Efeonce, igual que toda la iconografía: nunca clientes ni la UI del
producto Greenhouse.

### 12.3 Qué entrega el set

- Los **43 glifos de Plastilina** (18 de la base desde D24, 15 de oficio desde D25 y 10 de IA, social y staff desde
  D26), en **respuesta**, con el acento de **Brand** (naranja; Plastilina es la voz de
  Brand) y el **gesto** donde el glifo lo tiene (rayo, bombillo, teléfono: los gestos son rollitos o cápsulas de
  arcilla).
- PNG de **1024 px** (~130 KB cada uno, paleta con alfa), con **alfa** y los calados abiertos: va sobre cualquier fondo.
- **Sin sombra de contacto**: si la pieza la necesita, se agrega al componer.
- El Trazo **no tiene volumen**.

### 12.4 Dónde vive y API

- Tokens: `efeonceGraphicLine.icons.volume` (`@efeoncepro/axis-tokens` 0.3.7, publicado en `v0.3.7`). Detalle en
  [package-and-tokens.md](package-and-tokens.md) §«Iconografía».
- Archivos: `@efeoncepro/axis-brand-assets` 0.3.4 (publicado en `v0.6.0`; 43 PNG), `assets/volume/<glifo>.png`,
  sellados en `src/volume-manifest.ts`. La 0.3.3 (tag `v0.5.0`) trae 33 y la 0.3.2 (tag `v0.3.7`) sólo los 18 de la base.

```ts
import { AXIS_VOLUME_ICONS, findVolumeIcon, volumeIconUrl } from '@efeoncepro/axis-brand-assets'

const url = volumeIconUrl('bombillo') // lanza con un glifo que no es de Plastilina
```

- Lab: `https://axis.efeonce.org/references/iconography/#volumen` (sección 05: set de 43 con descarga PNG, tabla de
  spec, dónde va y dónde no, método, avisos revisados). Para agentes: `/references/iconography.json`, bloque `volume`.

### 12.5 Cómo se da de alta un glifo en volumen

**Nunca se genera una forma nueva directo en 3D:** el glifo entra primero al set plano (§11.3, con la aprobación del
operador) y el volumen se genera desde ese vector. En AXIS, con `pnpm icons:volume` (`scripts/icons-volume.mjs`):

```bash
pnpm icons:volume -- refs    --out ./ref                 # el plano en respuesta (con gesto), 760 px sobre #001a33, centrado en 1024
# generación (en Greenhouse, necesita la llave):
#   pnpm ai:image --model gpt-image-2.5-sunburst --quality high --size 1024x1024 \
#     --image <ref.png> --prompt-file <volume-prompt.txt> --out <crudo.png>
pnpm icons:volume -- key     --in ./crudo --out ./alfa   # alfa por COLOR contra el fondo liso (nunca matting con IA)
pnpm icons:volume -- check   --refs ./ref --in ./alfa    # silueta, calados y piezas contra el plano
pnpm icons:volume -- publish --in ./alfa                 # comprime (paleta), copia al paquete y al Lab, sella el hash
```

1. **El modelo sólo pone volumen y material.** Sin `--input-fidelity`: la familia 2.5 no lo acepta (el CLI lo
   ignora en silencio); la fidelidad la da el prompt. Prompt canónico: AXIS
   `docs/agent-composition/iconography/volume-prompt.txt` (copia en el Lab: `/media/iconography/volume-prompt.txt`).
   **No se reescribe**; si un detalle falla, se agrega UNA línea que lo nombre.
2. **Recorte por color, nunca con IA** (ver [lessons.md](lessons.md), 2026-09-27).
3. **El QA avisa; la persona decide.** `check` mide la silueta normalizada por caja (≥ 0,75) y la misma cantidad de
   calados y de piezas sueltas; sale con 1 si hay avisos, pero un aviso **no** es un rechazo. Se mira al 100 % y se
   rechaza sólo si la forma se reinventó, un calado se volvió relieve o figura y fondo se invirtieron.
4. **Publicar sella:** la prueba del paquete falla si un PNG cambia sin `publish`, si queda uno sin sellar o si pierde
   el alfa.
5. **Alta** con la aprobación del operador, mirando el resultado junto al set aprobado.

### 12.6 Avisos del set del 2026-09-27 (revisados y aceptados)

Se refiere a los 18 de la base (los 15 volúmenes de oficio se aprobaron el mismo día con D25 y los 10 de IA, social y
staff con D26). 11 de 18 pasaron sin
avisos. Aceptados tras mirarlos: laptop (silueta 0,44, algo menos inclinado, tercera pasada),
escritorio (0,64) y teléfono (0,73) por perspectiva y grosor; pluma, tijeras y audífonos juntan piezas que se tocan;
megáfono deja el anillo de la esfera como hueco.

### 12.7 Qué no es

- **No** es extruir el vector en Blender: el operador lo rechazó (plano, «galleta cortada»). El volumen aprobado salió de
  GPT Image 2.5 Sunburst **editando** el ícono plano aprobado.
- **No** son las librerías «Clay 3D» del equipo en OneDrive (283 + 108 PNG heterogéneos, ilustraciones para
  propuestas): esas son ilustración clay genérica; Plastilina en volumen es iconografía de marca derivada del vector.
  **No se mezclan en una pieza.**
- **No** se anima con el paquete: es un PNG, y el motion de los íconos sigue diferido (ver [ledger.md](ledger.md)).

## 13. Catálogo aprobado (86 glifos; oficio desde D25, IA, social y staff desde D26, redes de Glitch D27, swipe D28 y mano D29)

> **Estado:** canónico. Oficio (D25; operador, 2026-09-27: «Bien, subamos esos íconos al package de axis y a su web,
> cuidando el diseño que ya tiene la web y documentando para agentes y el equipo»). IA, social y staff (D26; operador,
> 2026-09-27: «Subelos todos a excepción del hoodie de trazo que no parece un hoodie»). Vive en AXIS main@cf77452 (2026-09-27):
> `ICON_CATALOG` en `@efeoncepro/axis-graphic-line` **0.6.0** y los volúmenes en `@efeoncepro/axis-brand-assets`
> **0.3.4**, publicados con el tag `v0.6.0` (`axis-tokens` iba en 0.3.8 en ese release, publicado por otra sesión con superficies, y no
> cambió por D26). Guía: AXIS `docs/agent-composition/iconography.md` §«Catálogo aprobado»; ADR AXIS, deltas «Oficio:
> 30 glifos nuevos (D25)» e «IA, social y staff: 19 glifos nuevos (D26)». Lab: `/references/iconography/` (los 79 del
> catálogo y los 43 volúmenes). Si difiere de AXIS, manda AXIS.

**37 Trazo + 49 Plastilina = 86 glifos** (desde `axis-graphic-line` 0.9.0). Volumen: 49 PNG, uno por cada Plastilina.
La tabla lista la base, el oficio y D26; después de ella entraron **redes de Glitch (D27, 2026-09-27)**, cinco Plastilina
(`guardar`, `compartir`, `recomendar`, `comentar`, `deslizar`\*), **redes (D28, 2026-09-28)**, un Trazo: `swipe` («Desliza»), y **su par en Plastilina (D29, 2026-09-28)**: `mano`.

| Voz | Base (D22, 2026-09-26) | Oficio (D25, 2026-09-27) | IA, social y staff (D26, 2026-09-27) |
|---|---|---|---|
| **Trazo (36)** | búsqueda, medición, contenido, medios, revenue, web, talent, finanzas, embudo, CRM, automatización, informe (12) | `correo`, `llamada`, `calendario`, `reunion`, `objetivo`, `presentacion`, `contrato`, `checklist`, `codigo`, `base-de-datos`, `nube`, `integracion`, `seguridad`, `ubicacion`, `reloj` (15) | `ia`, `composer`, `buscador`, `influencer`, `prensa`, `social`, `multimedia`, `assets`, `staff-gorra` («Staff») (9) |
| **Plastilina (43)** | rayo\*, paleta, pincel, cuentagotas, bombillo\*, tablet, laptop, escritorio, teléfono\*, cámara, claqueta, micrófono, pluma, cursor, tijeras, megáfono, audífonos, corazón (18) | `lapiz`, `rodillo`, `aerosol`, `escuadra`, `postit`, `encuadre`, `pelicula`, `vinilo`, `guitarra`, `reproducir`, `varita`, `taza`, `lampara`, `trofeo`, `estrella` (15) | `chispa`, `prompt`, `barra-busqueda`, `aro-de-luz`, `television`, `like` («Me gusta»), `galeria`, `biblioteca` («Biblioteca de assets»), `hoodie` («Hoodie Efeonce»), `gorra` («Gorra Efeonce») (10) |

\* Con gesto dibujado. Las 43 Plastilina tienen su versión en volumen (§12): 18 desde D24, las 15 de oficio desde D25
y las 10 de IA, social y staff desde D26.

**Un concepto, una clave por voz (D26).** Trazo / Plastilina: `ia` / `chispa`, `composer` / `prompt`, `buscador` /
`barra-busqueda`, `influencer` / `aro-de-luz`, `prensa` / `television`, `social` / `like`, `multimedia` / `galeria`,
`assets` / `biblioteca`, `staff-gorra` / `gorra`. El hoodie existe sólo en Plastilina: el Trazo `staff-hoodie` no entró
porque no se leía como hoodie.

**Cómo entró el oficio.** Treinta objetos que el trabajo diario pedía y el set no tenía, producidos con el método de
alta de cada voz (§9.1 y §11.3, y §12.5 para el volumen) y revisados juntos por el operador en el canvas «Íconos de La
órbita», sección 7. Los 19 de IA, social y staff (D26) siguieron el mismo método y el operador los aprobó todos salvo el
Trazo del hoodie. Material de producción en [sources-and-assets.md](sources-and-assets.md).

### 13.1 Notas de diseño que conservó la aprobación

- **checklist:** la esfera cae en la columna de vistos. No se usa en una lista de verdad: ahí sería viñeta (§5).
- **integración:** en reposo se lee «desconectado»; es el más liviano a 20 px.
- **correo:** a 20 px el aire de la esfera baja a 0,48, dentro del pendiente del aire a 20 px ([ledger.md](ledger.md)).
- **llamada** es el Trazo del teléfono; **teléfono** sigue siendo la Plastilina del móvil. Las claves son únicas entre
  voces, a propósito.
- **presentación** entra al catálogo; la keynote de ejemplo de AXIS
  (`docs/examples/iconography/stroke-glyph-keynote.json`) no entra: queda sólo como ejemplo del método (así lo dice la guía de AXIS).
- **varita** y **estrella** comparten la estrella: no van en el mismo grupo.
- **encuadre** es composición y formatos, no recorte (recortar es **tijeras**).
- **aerosol:** la esfera en la boquilla se lee como tapa.
- **vinilo** puede leerse como CD a tamaño chico.
- **base-de-datos:** el Trazo no usa arcos elípticos (`samplePath` sólo mide arcos circulares); los óvalos son cuatro
  arcos circulares tangentes. Vale para cualquier glifo nuevo con óvalos.

### 13.2 Notas de D26 (IA, social y staff)

- **Sin interfaz ni logo de terceros:** ninguno imita la interfaz ni el logo de un asistente de terceros (ChatGPT,
  Gemini).
- **hoodie** y **gorra** van sin logo dibujado: la marca la pone la esfera (en la capucha en el hoodie, en el panel
  frontal en la gorra).
- **influencer** (Trazo) al responder se parece a **talent**: no van juntos.
- **chispa** no va con **estrella** ni con **varita**.
- **galería** y **biblioteca** se parecen: se usan separados.
- **prompt** es el más débil a 32 px.

### 13.3 Notas de D28 (swipe)

> **Estado:** canónico (operador, 2026-09-28: «ese ícono queda aprobado y hay que canonizarlo»). AXIS `main@3e1d971`,
> `@efeoncepro/axis-graphic-line` **0.8.0** (tag `v0.8.0`, CI y publicación verdes). Guía AXIS §«Catálogo aprobado» y
> delta «Redes: 1 glifo Trazo (D28)» del ADR de iconografía.

- **swipe** («Desliza») es el Trazo de la señal de deslizar de un carrusel (nació para Marketing con Manzanitas): la mano
  inclinada 15° hacia donde se mueve, un arco sobre el dedo y la **esquina del set** como flecha (la de `revenue` y
  `automatizacion`), nunca una punta simétrica girada. `replace`: la esfera toma el lugar de la flecha y el arco queda como
  una órbita pequeña. Aire de la esfera 0,640.
- Llegó en tres correcciones del operador que valen para cualquier glifo nuevo: **sin líneas de movimiento** (son rasgo de
  Plastilina), **con la redondez del set** (dedos de radio 1,75, palma de radio 6, nada de bloques planos) y **en
  movimiento** (inclinado, no recto; el arco con aire medido sobre el dedo: 0,19 se funde a tamaño chico, 1,5 no).
- La clave es `swipe` porque `deslizar` ya es la Plastilina (D27): las claves son únicas entre voces (precedente `like`).
- En las piezas va **sola, en reposo, a 64 px, a la derecha de la respuesta y alineada con ella**; nunca en la fila de la
  firma, donde compite con los logos (operador, 2026-09-28).
- **Su par en Plastilina es `mano` (D29, aprobada el 2026-09-28, «Aprobada»):** la misma composición en la voz blanda —mano
  inclinada y, sobre el dedo, una flecha curva **maciza** con punta **compacta**—. La esfera va en la punta del dedo, donde
  toca, y la flecha queda entera. AXIS `main@efe4d32`, `axis-graphic-line` 0.9.0 y `axis-brand-assets` 0.3.6 (tag `v0.9.0`);
  volumen: silueta 0,794, aviso de piezas 3 → 2 aceptado. **Convive** con la `deslizar` de Glitch por decisión del operador:
  en piezas de marca propia el par de `swipe` es `mano`; Glitch sigue con la suya.
- **Lo que costó la Plastilina (no repetir):** la primera candidata —la mano girada con el arco convertido en guiones de
  gesto y sin flecha— fue rechazada: «el objetivo no es la mano, es que se entienda el concepto del swipe»; «debe llevar la
  mano y una flecha como la primera que te aprobé». Sin flecha no hay dirección, y la esfera en el dedo se leía como una
  pelota en equilibrio. Dos trampas del método: una referencia de composición **en línea** hace que el modelo dibuje en
  línea (se usa sólo la referencia de estilo y se pide «solid filled, never outlines»), y una punta de flecha grande deja
  restos tras la esfera (el anillo de 4,5 no la cubre; en volumen sale «una bola con espina»): la punta va compacta.

