# 05 · Banners e imágenes del artículo

> **Fuente de verdad:** la página **📋 Spec para imagenes** de la wiki de Berel
> (`38f39c2fefe780aba8e3de74983a23d6`). Este módulo la transcribe y la opera.
> **Regla de precedencia declarada en el origen:** si cualquier medida o campo de otro documento
> —incluido el Playbook de Producción— difiere de la Spec, **manda la Spec** y hay que corregir
> el documento que divergió.

## Principio rector: ninguna imagen es decorativa ni intercambiable

Cada imagen nace del contenido específico de **ese** artículo y se empareja con un elemento real
de su estructura. Cuatro exigencias, y las cuatro se verifican:

- **Anclada a la estructura.** Corresponde a una sección, tabla, paso o concepto concreto del
  texto. No "una foto bonita al inicio".
- **Refleja el contenido, no stock genérico.** La composición muestra lo que el artículo explica:
  el problema, la transformación, el dato, el producto, el proceso.
- **Sirve a la lectura.** O ayuda a entender (didáctica), o sostiene la permanencia (resumen
  citable), o cierra una emoción. **Si una imagen no cumple ninguna de las tres, sobra.**
- **Distribuida a lo largo del texto.** Las imágenes acompañan el avance del artículo y su hilo
  narrativo; no se amontonan al principio.

## 🔴 El orden es artículo escrito → banners → derivados. Nunca al revés

El banner acompaña al artículo de forma **contextual**: la escena del hero, el dato de la
infografía, la comparativa y el cierre **salen del texto**. Sin artículo escrito no hay manera de
saber qué imagen es la adecuada.

- Crear subtareas de banner **solo** para artículos con la reescritura hecha o, como mínimo, con
  el outline aprobado.
- Artículo sin escribir o con tema por definir → **solo la tarea principal**, sin subtareas.
- Si por planeación hay que reservarlas antes de tiempo: `Estado` = `Bloqueado`,
  `Resumen` = "Pendiente de la reescritura del artículo", **sin ficha de contenido**. La ficha se
  escribe cuando exista el texto.
- Si quedaron banners creados antes de la reescritura, al terminar el artículo hay que
  **revisar y reescribir su ficha** contra el texto final: escena, dato de la infografía,
  comparativa, cierre, ALT, nombre de archivo y posición.

> Un banner creado antes del artículo es un **placeholder**, no un brief.

## Propiedades obligatorias al crear la tarea

Cada subtarea de banner nace con `Tipo de pieza = Estatico` y `Canal de pieza = Blog`,
también si es una reserva bloqueada. Son propiedades de Tareas: la ficha, `Formato` y
`Tipo de entregable` no las reemplazan. Conservar el patrón de tareas y el conteo existente.
Matriz completa y verificación: [módulo 07](07_SISTEMA_NOTION.md).

## Los cuatro banners por artículo

| # | Rol | Naming de la subtarea |
|---|---|---|
| N1 | Portada / Hero emocional | `Banner N1 - Portada (Hero [escena])` |
| N2 | Infografía resumen — **base de adaptación social 🔁** · 🔴 **declara formato + variante** (`10`) | `Banner N2 - Infografía: [tema]` |
| N3 | Comparativa / didáctico / paso a paso — 🔴 **casi siempre es infografía**: declara formato + variante (`10`) y usa la ficha de producción (`11`) | `Banner N3 - [Tipo]: [tema]` |
| N4 | Cierre inspiracional | `Banner N4 - Cierre: [tema]` |

**Especificaciones estándar.** Tamaño estándar del blog **1408 × 768 px**; peso objetivo
**menos de 200 KB en todas las piezas, hero incluido**; formato `.webp`.

- **N1 Hero:** 1408 × 768 px + variante `og:image` 1200 × 630 px · menos de 200 KB · es el **LCP**:
  **sin** `loading="lazy"`.
- **N2 Infografía:** master 1408 × 768 px · menos de 200 KB · con lazy · marcada 🔁 como imagen
  base de adaptación social, con las variantes seleccionadas en la matriz del módulo 15 (catálogo abajo).
- **N3 y N4:** 1408 × 768 px · menos de 200 KB · con lazy.

## 🔁 La convención de adaptación social

En cada artículo se elige **una sola imagen** como base de adaptación social y se marca con **🔁**
en su título dentro de la spec. Suele ser la más **informativa, estructurada y evergreen** —casi
siempre la infografía N2— porque es la que mejor se busca, se guarda y se reutiliza.

Diseño entrega **master + variantes**:

| Formato | Relación · medida |
|---|---|
| Pin de Pinterest | 2:3 · 1000 × 1500 |
| Facebook | 4:5 · 1080 × 1350 (apto para carrusel) — ⚠️ era la de Instagram hasta la decisión del cliente del 2026-08-25; Instagram pasó a 9:16 |
| Historia de Instagram | 9:16 · 1080 × 1920 |
| Reel | 9:16 (video) |

🔴 **Una sola pieza por artículo lleva 🔁.** Dos marcas anulan el propósito: el derivado social
deja de tener un master único y diseño produce dos veces lo mismo con criterios distintos.

## 🔴 La infografía NO usa esta ficha

Los campos de abajo son la ficha de las piezas **fotográficas**: el hero y el cierre.
🔴 **Cualquier banner que sea INFOGRAFÍA lleva otra ficha, más exigente** —9 secciones + tabla de
contenido por módulo, con todo el copy literal— **y eso incluye al N3 cuando resuelve como
comparativa, didáctica o paso a paso**, no solo al N2
→ [`11_FICHA_DE_PRODUCCION_INFOGRAFIA.md`](11_FICHA_DE_PRODUCCION_INFOGRAFIA.md).
El campo `→ Tipo de gráfico` de abajo solo se usa si la pieza **no** es infografía; si lo es, el
formato y la variante viven en `Tipo de gráfico` y `Sistema / estructura` de la ficha `11`.

## Los campos obligatorios de la ficha

Cada imagen se documenta con **todos** estos campos. La ficha se escribe en el cuerpo de la
subtarea **en el mismo momento en que se crea**: una subtarea de banner sin ficha está incompleta.

| Campo | Qué debe contener |
|---|---|
| **→ Nombre y Número del artículo** | `Artículo N## — [Título]`, para que la pieza sea rastreable a su tarea principal |
| **→ Nombre del Banner** | `N# — [Nombre de la pieza]`. En N1 anotar que también sirve de `og:image`; en N2 marcar 🔁 |
| **→ Formato** | Dimensiones exactas, `.webp`, peso máximo, `loading="lazy"` sí/no, variantes derivadas y punto focal |
| **→ Tipo de gráfico** | Fotográfico / diseño informativo / comparativo / didáctico, con la nota de estilo o luz. 🔴 **Si la pieza es una INFOGRAFÍA, aquí se nombra el formato Y la variante** del catálogo del equipo de diseño: `Infografía — [Pasos \| Señalización \| Tipos de Color \| Técnica-Foto \| Técnica-Gráfica] · variante [...]` → [`10_FORMATOS_DE_INFOGRAFIA.md`](10_FORMATOS_DE_INFOGRAFIA.md) |
| **→ Objetivo (permanencia)** | **comprender** · **retener y compartir** · **cerrar la emoción**. Campo obligatorio: si no cumple ninguna, la pieza sobra |
| **→ Descripción detallada de la imagen** | **Dos bloques obligatorios.** *Qué debe verse:* la escena concreta —encuadre, luz, elementos, qué sí y qué no aparece— de modo que diseño pueda producirla **sin leer el artículo completo**. *Intención:* qué debe lograr en el lector y por qué esa sección del texto la necesita. Aquí se demuestra que el banner es contextual |
| **→ Color pintura Berel** | Nombre + código alfanumérico de cada color. **Nunca** inventar HEX/RGB: si no hay acceso al catálogo, escribir "Tonos reales: Catálogo RGB interno" |
| **→ Producto** | Sí / No. Si es sí: nombre y serie + enlace a la **ficha oficial** del sitio; nunca URLs del backend/CMS. Los datos técnicos salen de la ficha, no se estiman |
| **→ Texto en la imagen** | El texto literal a rotular (título y etiquetas), o "Sin texto". **Nada de párrafos dentro de la pieza** |
| **→ Graficos adicionales en la imagen** | Iconografía, flechas, divisorias, muestrarios, tipografía de marca, o "Ninguno" |
| **→ Estilo y paleta** | Línea visual y colores de marca, con la nota de **legibilidad en móvil** |
| **→ Anti banner-blindness** | Por qué la pieza es editorial o didáctica y **no parece un anuncio**. Campo obligatorio |
| **→ Notas adicionales** | **ALT (exacto)** entre comillas, descriptivo y con la keyword de forma natural · **Archivo:** nombre `.webp` en minúsculas y con guiones · **Posición:** el lugar exacto del artículo donde se inserta |

El cuerpo de la subtarea lleva **dos secciones**, cada una como encabezado 1 seguido de un divisor:
`# Ficha de contenido 📝` (tabla de dos columnas, una fila por campo, en el orden de arriba) y
`# Referencias Visuales 👁️‍🗨️` (callout vacío para que diseño cargue sus referencias).

→ Plantilla copiable: [`../templates/ficha-banner.md`](../templates/ficha-banner.md)

## 🔴 ALT, archivo y posición son una sola fuente de verdad

Los tres se especifican **una vez**, en la reescritura del artículo (módulo `03`), dentro del
callout 🖼️ que va en la posición exacta del texto. La ficha de la subtarea los **copia**; no los
reinventa.

Corolarios que el origen declara explícitamente:

- Los **ALT escritos en cada banner** deben coincidir **exactamente** con los ALT listados en las
  notas para diseño/Dev. Una sola fuente de verdad.
- Las notas para Dev listan **solo imágenes que existen** como banner especificado. Nada de
  imágenes fantasma.
- ALT descriptivo y específico al contenido; **nunca la URL ni el nombre de archivo**.
- La imagen principal (LCP) se sirve **sin** `loading="lazy"`; el resto, con lazy.

## Checklist antes de pasar a diseño

- [ ] Cada imagen está anclada a una sección/tabla/paso/concepto real del artículo
- [ ] La composición refleja el contenido específico, no es stock genérico
- [ ] Cada tarea de banner tiene `Tipo de pieza = Estatico` y `Canal de pieza = Blog`, confirmados por lectura fresca
- [ ] Banners numerados por orden de lectura
- [ ] Todos los campos de la ficha están completos en cada imagen
- [ ] Una imagen marcada con 🔁 como base de adaptación social, con sus variantes seleccionadas según el módulo 15
- [ ] Los ALT del banner y de las notas para Dev coinciden exactamente
- [ ] Imágenes del artículo en el tamaño estándar 1408 × 768 px
- [ ] Formatos `.webp`, peso menos de 200 KB, lazy-load (LCP sin lazy)
- [ ] Cada ficha declara su objetivo de permanencia y su justificación anti banner-blindness
- [ ] 🔴 Si la pieza es infografía: formato y variante declarados, y el acento usa Rojo Editorial `#B3153A` o la paleta complementaria, nunca el rojo corporativo

## Cross-links

- Dónde y cuándo se crea la subtarea → [`01_CICLO_MENSUAL.md`](01_CICLO_MENSUAL.md) (Fase 8)
- Dónde se especifica el banner dentro del texto → [`03_REDACCION_ARTICULO.md`](03_REDACCION_ARTICULO.md)
- Qué pasa con la pieza 🔁 después → [`06_DERIVADOS_SOCIALES.md`](06_DERIVADOS_SOCIALES.md)
- Excepción de lenguaje en fichas de banner → [`04_VOZ_Y_TONO_BEREL.md`](04_VOZ_Y_TONO_BEREL.md)
- 🔴 **Los formatos con los que diseño produce una infografía** →
  [`10_FORMATOS_DE_INFOGRAFIA.md`](10_FORMATOS_DE_INFOGRAFIA.md)
- 🔴 **La ficha propia de la infografía** →
  [`11_FICHA_DE_PRODUCCION_INFOGRAFIA.md`](11_FICHA_DE_PRODUCCION_INFOGRAFIA.md)
- Oficio de imagen editorial y su contrato HTML/SEO → `seo-aeo/references/editorial-image-seo.md`
- Dirección de arte y sistema visual editorial →
  `content-marketing-studio/references/agentic-editorial-visual-system.md`
