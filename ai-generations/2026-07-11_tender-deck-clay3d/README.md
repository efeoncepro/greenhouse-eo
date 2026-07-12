# Tender Deck Composer — 3D icons clay (gap de la librería)

> **Fecha:** 2026-07-11 · **Modelo:** `gpt-image-2` (1024×1024, quality `high`) vía `pnpm ai:image --batch`
> **Consumidor:** slots `ConceptVisual` de `docs/architecture/tender-deck-composer-prototypes/`
> **Doc:** `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md` → §Dirección de arte de los 3D icons

## Por qué se generaron (y no se curaron)

La regla del deck es **curar antes que generar**. El equipo ya tiene 108 PNG clay curados en
OneDrive (`4. Comercial/01. Propuestas Plantillas/01. Libreria Assets/Iconos 3D`), de los que se
extrajo el subset V1 (7 assets → `prototypes/assets/clay3d/`).

Estos 3 son **el gap**: conceptos de licitación que la librería no cubre con un asset que pase el
criterio (objeto no-cartoon · paleta azul/violeta/teal · render clay).

| Asset | Concepto | Por qué no se curó |
|---|---|---|
| `clay-ai-visibility.png` | medición de visibilidad de marca en motores de respuesta IA (AEO) | El único candidato (`Web y tecnologia/SEO.png`) trae la palabra **"SEO" quemada en la imagen** — es SEO clásico, no AEO, y el texto incrustado es inaceptable en un asset reusable. |
| `clay-method-steps.png` | método secuencial 1→2→3→4 (`ProcessStepsFull`) | La librería no tiene una escalera/secuencia; los candidatos eran flechas circulares (iteración, otra semántica). |
| `clay-guarantee-shield.png` | garantías / boleta de cumplimiento (propio de licitaciones) | `3d-shield-protecti…png` existe en la librería AXIS cruda pero está fuera de paleta y sin el documento sellado que el concepto necesita. |
| `clay-timeline-schedule.png` | cronograma / hitos (`TimelineFull`) | **Corrección post-auditoría** — ver abajo. El curado (`Generales/Calendario 2.png`) es **rojo/naranja dominante**. |
| `clay-requirements-matrix.png` | matriz de cumplimiento (`RequirementsTableFull`) | **Corrección post-auditoría** — el curado (`Metricas y Kpis/34.png`) trae rosa/amarillo fuera de paleta. |
| `clay-search-visibility.png` | visibilidad en búsqueda orgánica | **Corrección post-auditoría** — el curado tenía **"SEO" quemado** + paleta caliente. Regenerado con la barra de búsqueda **vacía** (sin texto). |

## Corrección post-auditoría (mismo día)

La primera curaduría **no aguantó el criterio escrito en este mismo README**. Al montar el set completo
sobre el navy real del deck (`_clay3d-final-on-navy.png`), quedó evidente que 3 assets curados
violaban la paleta y la regla de "cero texto":

| Curado | Defecto | Acción |
|---|---|---|
| `Calendario 2` | rojo/naranja dominante | ❌ removido → **regenerado** en paleta |
| `SEO.png` | **"SEO" quemado** + rosa/rojo/amarillo | ❌ removido → **regenerado** con barra vacía |
| `3d_illustration_sales_funnel` | embudo **negro** + monedas doradas + símbolo `$` | ❌ removido (sin reemplazo: el funnel no es un concepto del bid) |
| `Metricas y Kpis/34` (checklist) | rosa en los bocadillos | ❌ removido → **regenerado** como `clay-requirements-matrix` |
| `Certificacion` | halo blanco del recorte (`trim` sobre fondo semi-transparente) | ✅ **re-recortado** con matting real |

**Segunda pasada** (mismo día, tras montar de nuevo el set): los 3 curados que quedaban tampoco
sobrevivieron.

| Curado | Defecto | Acción |
|---|---|---|
| `Certificacion` | **documento blanco** → el matting AI lo devora sobre fondo claro; quedó fantasmal | ❌ → **regenerado** con el pliego en clay AZUL |
| `Metricas y Kpis/analysis` | puntos **naranjas/amarillos** | ❌ → **regenerado** |
| `Metricas y Kpis/resultados` | trofeo rosa + alpha lavado | ❌ → **regenerado** con trofeo teal |

**Resultado: el set V1 quedó 100% generado.** No es un rechazo de la librería —es que **ninguno de
los curados pasó los tres filtros a la vez** (objeto no-cartoon · paleta azul/violeta/teal · cero
texto). La librería sigue siendo la primera parada obligatoria.

**Lecciones canonizadas:**

1. El criterio de curaduría **se verifica montando el set sobre el fondo real**, no leyendo los
   thumbnails uno por uno. Un asset que "se ve bien" aislado puede romper la cohesión del conjunto
   — y la cohesión es lo que el molde protege.
2. **Nunca recortar con `sharp.trim()`** un asset sobre fondo semi-transparente: deja halo. Y **el
   matting AI devora los objetos blancos sobre fondo claro** — si el asset es blanco/crema, hay que
   generarlo en color, no intentar rescatarlo con el recorte.
3. **`--background transparent` degrada a `gpt-image-1.5`** (gpt-image-2 no tiene alfa). El camino
   correcto es **generar opaco con `gpt-image-2` + recortar con `pnpm ai:image:rmbg`**.

## Dirección de arte (invariantes del prompt)

Anclados al **subset curado**, no a la librería entera:

- Material **clay mate**, formas gruesas muy redondeadas, sin aristas.
- Paleta **estricta**: azul · índigo-violeta · teal + blanco roto. **Prohibidos rojo, naranja, verde**
  (rompen la cohesión sobre el navy del deck).
- Luz key suave arriba-izquierda + **sombra de contacto** sutil. Perspectiva 3/4, objeto centrado.
- **CERO texto, letras, números o logos** en la imagen (los modelos los deforman, y un asset con
  texto quemado no es reusable — la lección de `SEO.png`).
- Fondo **gris claro plano** (no degradado, no escenario) → recorte posterior con matting.

## Post-proceso

Recorte a alpha con el matting del repo: `pnpm ai:image:rmbg <in> <out>` (AI matting, **nunca**
color-key/flood-fill — deja bordes mordidos). Destino final: `prototypes/assets/clay3d/`.

## Prompts (verbatim)

Ver `manifest.json` para los prompts exactos enviados al modelo.
