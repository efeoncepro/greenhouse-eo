---
name: berel-content-production
description: >-
  Producción editorial del cliente Berel (Pinturas Berel, México) de punta a punta: el ciclo mensual
  completo en su Notion —identificar los artículos del mes, rescatar el contenido publicado, analizar
  SEO/AEO contra la URL en vivo, reescribir o escribir de cero, montar el proyecto con tareas,
  banners y derivados sociales— más la voz de marca es-MX, la spec de banners y la carga al CMS
  Drupal. Es la continuación operativa del research y del brief: el repo cubre `research → brief`,
  esta skill cubre `brief → artículo publicado → átomos sociales`. Encadena craft a `copywriting`,
  descubribilidad a `seo-aeo`, doctrina de motor de contenidos a `content-marketing-studio`, redes a
  `social-media-studio`, operación de Notion a `notion-platform` y métricas `[GH]` a `greenhouse-ico`.
  Usar para producción mensual de Berel, artículos del blog de berel.com, reescrituras, análisis
  SEO/AEO de artículos Berel, fichas de banner, copy de derivados sociales, voz y tono Berel, y carga
  al CMS Drupal de Berel.
type: skill
user-invocable: true
argument-hint: "[fase del ciclo, artículo o pregunta concreta]"
---

# Berel — Producción de contenidos

> **Skill de cliente, no de oficio.** Aquí no se decide *cómo se hace content marketing*: se ejecuta
> **el proceso que Berel y Efeonce ya acordaron**, tal como vive en la wiki de Notion del cliente.
> El oficio general vive en `content-marketing-studio`, `copywriting`, `seo-aeo` y
> `social-media-studio`, y esta skill los **invoca**; no los reemplaza ni los contradice.

**Berel es Pinturas Berel, cliente de Efeonce.** Marca mexicana de pinturas con más de 85 años.
**Opera solo en México.** El blog vive en `berel.com` (sección *Inspiración*), sobre **Drupal**.

## Dónde encaja en la cadena

```
research + priorización  →  brief editorial  →  ESTA SKILL  →  publicado + atomizado
docs/operations/            docs/operations/     ciclo mensual
SEO_EDITORIAL_...           SEO_CONTENT_          en el Notion
PRIORITIZATION_             BRIEF_STRUCTURE_      del cliente
OPERATING_MODEL_V1.md       V1.md
```

Lo que precede a esta skill ya está documentado en el repo. Lo que esta skill aporta **solo existía
en Notion**: el playbook de producción, la spec de imágenes, el playbook de derivados sociales, la
guía de voz y tono, y la guía de carga al CMS.

## Cómo se usa (router)

1. **Determina la modalidad** antes de cualquier otra cosa: ¿la fila del Content Hub tiene `Enlace`?
   Sí → **A · Reescritura**. No → **B · Artículo nuevo**. Cambia todo lo anterior a la Fase 6.
2. Carga **solo** el módulo de la fase en la que estás.
3. Aplica las **reglas duras** de abajo — son las que se rompen en la práctica.
4. Cierra con el **artefacto** (`templates/`) y deja el estado movido en Notion.

### Árbol de decisión

```
¿En qué estás?
├─ Montar o entender el mes completo, las 10 fases, las dos modalidades ....... modules/01_CICLO_MENSUAL
├─ Rescatar lo publicado y auditar SEO/AEO contra la URL en vivo (F3-F4) ...... modules/02_ANALISIS_AUDITORIA
├─ Escribir la reescritura o el artículo nuevo (F5 / B5) ...................... modules/03_REDACCION_ARTICULO
├─ Cómo suena Berel: voz, arco, léxico mexicano, palabras vetadas, auditoría .. modules/04_VOZ_Y_TONO_BEREL
├─ Especificar los 4 banners y sus fichas; la pieza con reciclaje social ...... modules/05_BANNERS_IMAGENES
├─ Redactar el copy social por canal y volcar los subítems .................... modules/06_DERIVADOS_SOCIALES
├─ Propiedades exactas, jerarquías, formato Notion, qué NO tocar .............. modules/07_SISTEMA_NOTION
├─ Subir o reescribir el artículo en el CMS Drupal ............................ modules/08_PUBLICACION_CMS_DRUPAL
├─ Lo que el cliente pidió explícitamente (y dónde corrige la guía de voz) .... modules/09_RECOMENDACIONES_DEL_CLIENTE
├─ Qué NO hacer (errores ya cometidos en este cliente) ....................... ANTIPATTERNS
├─ Vocabulario del cliente y de su sistema ................................... GLOSSARY
├─ De dónde salió cada regla, con page id y fecha de extracción .............. SOURCES
└─ Artefacto de salida ....................................................... templates/
```

## Reglas duras

1. 🔴 **El orden es artículo escrito → banners → derivados sociales.** Nunca al revés. Un banner
   creado antes del artículo es un **placeholder, no un brief**; un copy social sin texto escrito se
   inventa el gancho. (`01`, `05`, `06`)
2. 🔴 **Ningún hallazgo técnico se afirma sin haber abierto la URL en vivo.** El texto rescatado en
   la Fase 2 es plano: **la ausencia en la extracción no es ausencia en la página**. Ya produjo un
   error real —afirmar que un artículo no tenía enlaces de color cuando sí los tenía—. (`02`)
3. 🔴 **No borrar nunca contenido existente en Notion.** Todo se **agrega** como sección desplegable
   nueva. (`07`)
4. 🔴 **Nada se promete sin respaldo documental del cliente.** Ahorros, porcentajes de eficiencia,
   garantías y ciclos de lavado **solo con ficha técnica detrás**. Si dos fuentes se contradicen,
   **ninguna entra**: van al callout de discrepancia y se reportan. (`01`, `04`)
5. 🔴 **Nunca RGB ni HEX en el cuerpo publicable.** Los colores se nombran **nombre + código
   alfanumérico**. El Catálogo RGB es de consumo interno para diseño — es lineamiento del cliente.
   (`03`, `04`)
6. 🔴 **Productos a ficha real; colores a la búsqueda del sitio.** No es simetría arbitraria:
   **Berel no tiene página pública por color**, y por eso ahí la búsqueda es legítima; para producto
   **nunca** lo es. (`04`)
7. 🔴 **La voz es la de Berel, en español de México.** El default es-CL del repositorio **no aplica**
   y el "nosotros" es del cliente, no de Efeonce. La mexicanidad **se muestra en los objetos, no se
   anuncia** — salvo en las fichas de banner, que son instrucción para diseño. (`04`)
8. 🔴 **Ningún texto se cierra sin la auditoría de voz.** "Suena bien" no es criterio: se revisa
   contra la lista de fallas típicas, que son de **detalle**, no de tono general. (`04`)
9. 🔴 **ALT, nombre de archivo y posición se declaran UNA vez** —en la reescritura— y la ficha del
   banner los **copia**. No se reinventan. Las notas para Dev listan solo imágenes que existen.
   (`03`, `05`)
10. 🔴 **La Spec para imágenes manda sobre cualquier otro documento**, incluido el Playbook de
    Producción, si difieren. Y hay que corregir el que divergió. (`05`)
11. 🔴 **Distinguir verificado de estimado, siempre.** Volúmenes de búsqueda y comparaciones de
    competencia sin herramienta van marcados como **estimación**. (`02`)
12. 🔴 **Los pendientes se declaran.** *Un pendiente declarado es gestionable; uno omitido se publica
    como error.* Callout de pendientes obligatorio al cierre de cada reescritura. (`03`)
13. 🔴 **No declarar que algo no existe solo porque no se encontró.** Un listado paginado de catálogo
    **no es un índice completo**: probar el patrón de URL, buscar en el sitio y, si sigue sin
    aparecer, **preguntarle al cliente**. (`01`)
14. 🔴 **Al reportar avance, tres grupos:** listos · faltantes **con el motivo del bloqueo** · fuera
    de alcance. *Un conteo sin el motivo no sirve para decidir nada.* (`01`)
15. 🔴 **Navegar el sitio de a una llamada por vez.** Lanzar búsqueda y extracción en paralelo hace
    que una de las dos se caiga y se pierda el resultado. (`01`, `02`)
16. 🔴 **La petición fechada del cliente le gana a la guía general.** `Recomendaciones Cliente`
    recoge revisiones explícitas —varias de agosto 2026, algunas marcadas como reincidentes— que
    **refinan y en dos puntos corrigen** `6. Voz y Tono`. Ante conflicto, manda lo que pidió el
    cliente, y hay que corregir la guía vieja. (`09`)
17. 🔴 **La marca habla en primera persona del plural.** *Creamos*, *nuestra paleta*, *nuestro blog*
    — **nunca "Berel ofrece…"**. Única excepción: ALT y schema, donde la marca va en tercera persona
    por SEO/AEO. (`09`)
18. 🔴 **Sin series de producto en el cuerpo** (*Serie 800*, *Serie 2300*): son nomenclatura de
    catálogo técnico y solo viven en fichas y notas para Dev — **también en tablas, listas de
    materiales y CTA**. Confirmado por el cliente en agosto 2026. (`09`)
19. 🔴 **Ningún CTA apunta al Home**, y **el texto visible de un enlace nunca es la URL**. Regla
    reincidente: el cliente ya la marcó dos veces. (`09`)

## Lo que NO se toca

| Zona | Por qué |
|---|---|
| Las **22 propiedades fórmula** de `Tareas` y el bloque Frame.io | Son calculadas o las alimenta una Cloud Function (`07`) |
| La propiedad **`[GH] RpA v2`** | Writeback de Greenhouse; en Notion es read-only. **Notion es el OS del cliente, Greenhouse el motor de métricas** → `greenhouse-ico` |
| Las **credenciales del CMS** (página `Accesos CMS`) | Están en texto plano en Notion. **Nunca copiarlas al repo, a un log, a un commit ni a un prompt** (`08`) |
| El **alias de URL** de un artículo existente | Cambiarlo rompe enlaces entrantes e histórico (`08`) |
| La **plantilla de Ebook** del Content Hub | Conserva el título de un caso ajeno a Berel; es herencia del template de Notion, **no doctrina** (`07`) |

## ⚠️ Conflictos abiertos en el origen — no los resuelvas en silencio

Tres divergencias **reales entre documentos del cliente**, verificadas el 2026-08-25. No están
resueltas y **no te toca resolverlas por tu cuenta**: pregunta cuál rige y luego corrige el
documento desactualizado.

| Tema | Fuente A | Fuente B |
|---|---|---|
| **Canal 2 del set social** | Playbook Derivados: **Instagram Story**, secuencia de 3-4 stories 9:16 | Playbook Producción F8: **Instagram Post estático**, `Diseño gráfico` |
| **Esqueleto del artículo** | Playbook: 4 desplegables (modalidad A) o 2 (modalidad B) | El artículo real observado: **3 desplegables** (`Research` · `Plan Editorial SEO/AEO` · `✍️ Artículo V1`) |
| **Longitud objetivo** | Guía editorial: **900-1.200+** palabras | Artículo de referencia: declara **1.400-1.800**, entregó ~1.500 |

Y dos más donde **sí hay resolución**, porque el cliente habló después (detalle en `09`): las
**series de producto** (Voz y Tono las quiere en el nombre completo; el cliente las prohíbe en el
cuerpo → **gana el cliente**) y la **densidad metafórica** (Voz y Tono pide sostener la metáfora; el
cliente pidió lenguaje más plano → **ante la duda, escribe más plano**).

## ⚠️ Fuentes que el proceso cita y que están VACÍAS

Verificado el 2026-08-25 en la wiki. **No busques ahí la metodología: no está.**

`Keywords / Intención de Búsqueda` · `Redacción` · `Recomendaciones SEO Adicionales` ·
`Programacion` · `Product Placement en Imagenes` → **vacías**.
`Sobre la marca` → **plantilla por defecto de Notion**, cero contenido Berel.
`Brief/Estructura` → ~380 caracteres: es **un prompt suelto** cuyos bloques de referencia están
vacíos.

**Toda la doctrina real vive en tres páginas:** `Playbook Producción`, `6. Voz y Tono` y
`Cómo subir un artículo (CMS Drupal)`.

Y la regla del propio playbook para este caso: si una fuente de la wiki está **vacía o sin permisos
de lectura**, **decirlo explícitamente en el entregable** en lugar de rellenar el hueco con
supuestos.

## Tabla de sinergias

| Terreno | Esta skill | Hand-off a |
|---|---|---|
| **Craft de las palabras** (headline, lead, narrativa, edición) | define la pieza y aplica la voz de Berel | **`copywriting`** — usa su craft, **no** su router de voz: Berel no está en él |
| **Descubribilidad y citabilidad** (schema, chunking, entidad, E-E-A-T, AEO) | aplica los estándares on-page del cliente | **`seo-aeo`** |
| **Doctrina del motor de contenidos** (pillar/cluster, atomización, degradación de convención, medición) | ejecuta el ciclo del cliente | **`content-marketing-studio`** |
| **Oficio por red social + programación** | entrega el copy y las specs del átomo | **`social-media-studio`** |
| **Operar Notion** (API, límites, sync, writeback) | dice qué se llena y dónde | **`notion-platform`** |
| **Métricas `[GH]`, RpA, ICO** | no las toca | **`greenhouse-ico`** |
| **Dirección de arte y generación de imagen** | escribe la ficha del banner | `design-studio` · `greenhouse-ai-image-generator` |
| **Research y priorización editorial que precede al ciclo** | consume su salida | `docs/operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md` |
| **Estructura del brief** | consume su salida | `docs/operations/SEO_CONTENT_BRIEF_STRUCTURE_V1.md` |
| **Derechos de uso de la licencia Frida Kahlo en gráficos** | exige el logo oficial en toda pieza | `legal-privacy-ip-operator` si aparece cualquier duda de alcance |

## Herramientas

- **Notion (MCP)** — leer y escribir en el Content Hub, Tareas y Proyectos. Reglas de formato y qué
  no tocar en `07`.
- **Navegación del sitio** — extracción **completa**, **una URL a la vez**. El modo rápido devuelve
  solo la navegación.
- **Teams** — canal compartido con el cliente: plan mensual, enlaces faltantes, referencias de
  ángulo y producto.
- **SharePoint** — fichas técnicas en PDF, presentaciones, catálogos. **La ficha técnica es la fuente
  de los datos duros.**
- **OneDrive** — carpeta de imágenes del mes; la portada es la que dice "portada" en el nombre.

Si una herramienta no está disponible, **decláralo**: no rellenes el hueco con supuestos.

## Entrega

- **Español de México**, voz de Berel, no la de Efeonce.
- Entrega **con el porqué**: qué fase se corrió, qué se verificó en vivo, qué quedó pendiente y con
  qué bloqueo.
- **Estados movidos en el momento**, no al final del mes.
