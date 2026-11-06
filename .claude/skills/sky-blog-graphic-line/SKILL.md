---
name: sky-blog-graphic-line
description: >-
  SOLO para el Blog SKY del servicio SEO / Marca (blog.skyairline.com). Línea gráfica de las imágenes
  del blog: fotografía editorial IMG 1–3 (registros D observación / E experiencia, tipos A–H, primer
  plano declarado, luz del relato), portada que sobrevive al hero del tema (sujeto en la mitad
  superior central, H1 legible sobre el degradado, gate medir-portada), exportación desde el maestro
  (1408×768, og 1200×630, cuadrado 1080×1080, WebP bajo 200 KB) y banner de ruta (opción A color /
  B foto, 1408×400 y 1080×1080, Metric, sin precios ni ofertas). Cárgala para escribir el prompt de
  una foto del blog, medir o exportar una portada, componer un banner de ruta, revisar una pieza del
  blog o llevar la línea a un canvas de Claude Design. NUNCA para las campañas KV / Always On ni las
  126 adaptaciones de SKY Performance (eso es efeonce-creative-workbench + sky-fotografia), ni para
  Berel (berel-graphic-line) o Efeonce (efeonce-graphic-line). Frontera: sky-blog-seo decide QUÉ
  artículo, keyword y spec van; esta skill decide CÓMO SE VE y CÓMO SE PRODUCE en el Creative Workbench.
type: skill
user-invocable: true
argument-hint: '[artículo, pieza IMG/BANNER, portada a medir o banner de ruta]'
---

# Blog SKY — Línea gráfica

> **Skill de cliente y de servicio.** SKY Airline tiene dos servicios con Efeonce: Performance
> (agencia creativa, KV y adaptaciones) y SEO / Marca (este blog). Esta skill es sólo del segundo.
> Los valores viven en los contratos del Workbench; si esta skill y un contrato difieren, manda el
> contrato y se corrige la skill.

## 1. Alcance y aislamiento

- Aplica a las imágenes de blog.skyairline.com: fotos editoriales (IMG 1–3) y banners de ruta.
- **No aplica** a las piezas de Performance: KV, Always On, adaptaciones Figma Brandlift, stickers,
  precios. Ese sistema (`brands/sky-airline/` raíz, `marca:*`, `sky-fotografia`) no se usa como default
  del blog, y las reglas del blog no se llevan allá. El contrato Always On rechaza `service: "blog"`.
- Del sistema de marca SKY sólo se toman tokens (Brandlift 0.1.0), Metric y el logo oficial en SVG.
- Nunca identidad Efeonce, Berel o AXIS en una pieza del blog.
- **Regla de aislamiento:** todo cambio vive en `brands/sky-airline/blog/**` y `projects/sky/<pieza>/**`
  del Workbench. Antes de cerrar, `git -C /Users/jreye/Documents/creative-workbench diff --name-only`:
  si cambió algo fuera de esas rutas (salvo un puntero documental pedido), detente y explica.

## 2. Dónde vive cada cosa

Workbench: `efeoncepro/creative-workbench`, checkout `/Users/jreye/Documents/creative-workbench`.

| Pieza | Ruta (relativa al Workbench) |
|---|---|
| Libro humano | `brands/sky-airline/blog/system/SKY_BLOG_VISUAL_SYSTEM_V1.md` |
| Formatos, maestro, zonas del hero medidas, recetas, banner de ruta, `never` | `brands/sky-airline/blog/contracts/sky-blog-recipes.json` |
| Motores, bloque común, registros D/E, tipos A–H, primer plano, HERO SPACE, negativo | `brands/sky-airline/blog/contracts/sky-blog-photography.json` |
| Zonas, gate de portada, exportación | `brands/sky-airline/blog/compose/hero.mjs` |
| Compositor del banner de ruta (Metric → SVG → sharp) | `brands/sky-airline/blog/compose/route-banner.mjs` |
| CLIs | `brands/sky-airline/blog/scripts/{prompt-plate,medir-portada,exportar,componer-ruta}.mjs` |
| Pruebas | `node --test brands/sky-airline/blog/test/*.test.mjs` |
| Pieza de calibración | `projects/sky/blog-linea-grafica/` (salidas y runs fuera de Git) |
| Lote de varios artículos (caso 2026-11-05, 54 artículos) | `projects/sky/blog-lote-2026-11/`: `specs/`, `jobs/`, `plates/`, `refs-ledger/`, `tools/imagenes/` (salidas y runs fuera de Git) |
| Metric (licencia, local) | `clients/sky/.resources-local/sky-metric-*` |
| Logo oficial | `brands/sky-airline/packages/brand-assets/src/sky-logo-on-photo.svg` |

Fuera del Workbench:

| Qué | Dónde |
|---|---|
| Spec Imágenes, Skill de imágenes, Sistema de selección, Playbook, fichas | Notion, teamspace «Sky Ariline - SEO+AEO» (ver [sources.md](references/sources.md)) |
| Entregas por artículo | OneDrive `Sky - Efeonce - General/SKY Blog SEO/04 Entregables/` |
| Generación de maestros | Greenhouse `pnpm ai:image` (este repo) |
| Expansión de portada y retoque de letras | Greenhouse `pnpm ai:mask` + `pnpm ai:inpaint image` con `gpt-image-2.5-flare` |
| Referencias reales (REF-01) | Shutterstock (API, licencia Standard) y Wikimedia Commons; procedencia en `refs-ledger/` de la pieza ([sources.md](references/sources.md) §5) |
| Revisión por versión | Frame.io; estado en Notion |
| Estrategia SEO del blog, specs de artículos | skills `sky-blog-seo` (cuenta) y `sky-blog-seo-editorial` (método; la spec de imagen está en `references/produccion-editorial.md`) |

## 3. Invariantes

1. **Foto editorial sin texto.** Si la pieza necesita texto, es un banner de ruta.
2. **Nunca avión, cabina, uniforme ni tripulación SKY generados.** El avión sólo existe como ícono de
   línea en el banner de ruta.
3. **El prompt sale de `prompt-plate.mjs`.** Nunca concatenar bloques a mano.
4. **El primer plano es una decisión explícita**: elemento real del lugar o razón de por qué no lleva.
   No inventar flores, manos ni rodillas para cumplir.
5. **La portada pasa `medir-portada.mjs`** con el sujeto declarado mirando la foto: sujeto ≥ 85 % en la
   ventana (mitad superior central), H1 blanco legible en escritorio y móvil.
6. **Todo sale del maestro.** Artículo, og y cuadrado se recortan del mismo maestro; nunca se regenera
   para obtener una variante ni se genera directo a 1408×768.
7. **El banner de ruta no lleva precios, moneda, «Oferta», «Imperdible», «Está bueno SKY» ni
   comparaciones**, y sólo existe con la ruta verificada (`verificadaEl` + `fuente`). El CTA y la ruta
   («Origen → Destino») los escribe el compositor; la ruta va arriba y manda, y el titular (máx. 6 palabras) no
   repite el H1. Nunca se achica la letra: se acorta el titular o, si la ruta no cabe con foto, se usa la receta A.
8. **Metric sin fallback; logo oficial intacto.** Un logo SKY por pieza.
9. **Medir no aprueba.** `qa.approval` queda `pending-human-and-pixel-review`; ejecución, criterio de
   marca, aprobación y entrega son estados separados.
10. **La IA no inventa geografía.** Lugar identificable = REF-01 real cargada; la referencia de estilo
    (REF-ESTILO-D) guía el lenguaje, no el lugar. Antes de licenciar o usar una REF se lee su descripción y se mira:
    el buscador devuelve otros países con el nombre del lugar. Sin REF válida, la pieza queda `Bloqueado`.
11. **Ninguna letra legible en la foto.** Letras falsas o reales (arcos, carteles, fachadas) se retocan con máscara
    antes de exportar; el prompt del retoque describe la superficie limpia y nunca nombra «logo».
12. **Clave personal en toda generación creativa operada por agente.** `ai:image` con `--openai-key personal`;
    `ai:inpaint` no tiene esa flag: se corre con `OPENAI_API_KEY_PROFILE=personal` delante o paga la clave de empresa.

## 4. Flujo (detalle y comandos en [workflow.md](references/workflow.md))

1. Leer el callout de spec del artículo (manda sobre la ficha) y la ficha de Notion: tipo A–H, registro
   D/E, escena, hora, clima, REF y prohibiciones. Estado `Brief listo`; si está `Bloqueado`, no se genera.
2. Decidir el primer plano (elemento o razón) y, si es E, quién fotografía y hacia dónde mira el compañero.
3. `prompt-plate.mjs` → prompt BASE + NEGATIVE (con `--portada` para IMG 1).
4. Generar el maestro en Greenhouse con `gpt-image-2.5-sunburst` (`--quality max`, 3840×2160, `--model` explícito:
   el default de `ai:image` es Flare); con REF-01 real, el mismo motor con `--image`. Es el único motor de foto del
   blog ([photography.md](references/photography.md) §7). Una intención por corrida, sin reintentos pagados a ciegas.
5. Mirar el maestro al 100 %. Si es portada: `medir-portada.mjs --sujeto … --vista …` con la caja desde la coronilla.
   Si el sujeto quedó bajo, alejar la cámara por expansión ([hero-and-export.md](references/hero-and-export.md) §7).
   Si hay letras legibles, retocarlas con máscara.
6. `exportar.mjs` (con `--portada` para og y cuadrado). Si no baja de 200 KB, desenfoque leve del maestro (§5 del
   mismo archivo), nunca menos resolución.
7. QA ([qa-review.md](references/qa-review.md)) → Frame.io → estado en Notion → WordPress.
8. Banner de ruta, si la spec lo pide: job → `componer-ruta.mjs` → QA → Frame.io.
9. Toda corrección del operador queda en [lessons.md](references/lessons.md) + contrato + prueba.

Para un lote de varios artículos (specs → plates → prompts → generación en paralelo → hojas de contacto → gate →
exportación → banners), ver [workflow.md](references/workflow.md) §9.

## 5. Referencias

| Archivo | Cuándo |
|---|---|
| [photography.md](references/photography.md) | Escribir o revisar una foto: D/E, A–H, microescena, mirada, piel, color, primer plano |
| [hero-and-export.md](references/hero-and-export.md) | Portada, zonas del tema, gate, maestro y exportación |
| [route-banners.md](references/route-banners.md) | Banner de ruta A/B: copy, job, compositor, pendientes de Marca |
| [qa-review.md](references/qa-review.md) | Revisión al píxel, secuencia del artículo, estados, Frame.io, canvas de Claude Design |
| [workflow.md](references/workflow.md) | Punta a punta con comandos exactos, por artículo y por lote |
| [sources.md](references/sources.md) | Páginas de Notion, qué decide cada una, contradicciones resueltas, búsqueda de REF-01 reales |
| [lessons.md](references/lessons.md) | Casebook fechado: qué pasó, regla, dónde quedó codificada |

## 6. Frontera con otras skills

- `sky-blog-seo` y `sky-blog-seo-editorial`: keyword, intención, estructura del artículo y la spec de cada imagen (qué escena,
  qué pregunta responde). Esta skill no decide la escena; la produce.
- `efeonce-creative-workbench`: reglas del harness (una marca por corrida, recursos sellados, gates).
  Leer su `references/state-continuity.md` al operar en el Workbench.
- `greenhouse-ai-image-generator` / `ai-model-selection`: oficio del motor y costos. No cambiar de
  motor para el blog sin autorización ni sin medir.
- `design-studio`: dirección de arte general. Esta skill es su aplicación al Blog SKY.

## 7. Skill viva

Al cerrar trabajo en esta línea: lección fechada en `lessons.md` (cita del operador → regla → dónde
quedó), contrato y prueba si aplica, espejo en `.codex/skills/sky-blog-graphic-line/`, y la entrada
de `HARNESS_STATUS.md` del Workbench si cambió el runtime.
