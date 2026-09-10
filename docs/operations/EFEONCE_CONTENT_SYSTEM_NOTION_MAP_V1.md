# Sistema de contenidos Efeonce en Notion — mapa canónico V1

> **Tipo:** mapa operativo del runtime real (Notion) + reconciliación con `PDR-020`.
> **Corte de verificación:** 2026-09-10, lectura MCP en vivo de las tres bases.
> **Fuente vigente:** Notion. Este documento es una fotografía fechada de estructura e IDs, no
> reemplaza el contenido de las páginas. Releer antes de escribir.
> **Regla de escritura:** ninguna mutación en Notion se ejecuta sin autorización explícita del
> operador (`propose → confirm → execute`).

## 1. Las tres bases y cómo se encadenan

El sistema de contenidos **no es el calendario**: son tres bases relacionadas, con un eje temático
que gobierna y dos capas de ejecución.

```text
Pilares JTBD  ──gobierna──>  Content Hub  ──se atomiza en──>  Calendario de Contenidos
(el eje temático)            (la pieza ancla)                  (cada publicación)
```

| Base | Data source | Rol real |
|---|---|---|
| **Pilares JTBD** | `collection://33ecce0f-f806-409d-b193-6f6a23e6f9d2` | 7 pilares con job, buyers, tier, territorio, canales y formatos permitidos. **Es el eje temático canónico.** |
| **Content Hub** | `collection://9540b2c0-c621-4ccf-986b-efefe63feb7e` | Backlog de piezas ancla (blog, pillar page, newsletter, storytime) con estado editorial |
| **Calendario de Contenidos** | `collection://38339c2f-efe7-8113-9c92-000b50674fa8` | Cada publicación con canal, plataforma, tipo de pieza, flujo, métricas y tiempos |
| **Wiki de Contenidos** | `collection://15839c2f-efe7-819d-90b7-000b9011a403` | 89 páginas de doctrina, formatos, SOPs, playbooks, prompts y manuales |

Bases satélite referenciadas por el calendario: Buyer Persona
(`collection://825e73f9-4b4d-4e61-b714-2fcdff9a1af6`), Campañas
(`collection://02d40d85-d205-4115-8f6b-2a7791dcc10f`), Tareas Efeonce
(`collection://5126d7d8-bf3f-454c-80f4-be31d1ca38d4`), Sprints
(`collection://27c39c2f-efe7-8043-8a5d-000b16376e2c`), Email Marketing
(`collection://1b239c2f-efe7-81e6-8cde-000b6e6d75f0`).

## 2. Los 7 Pilares JTBD (el hallazgo que `PDR-020` no contemplaba)

| Pilar | Territorio Arc | Tier | Canales declarados |
|---|---|---|---|
| Autoridad & Social Proof | Social Proof | T1 Motor | LinkedIn Julio · LinkedIn Página · Blog · Instagram |
| Operaciones Creativas (CSC) | CSC | T1 Motor | LinkedIn Julio · LinkedIn Página · Blog · YouTube · Instagram |
| Voz & Criterio de Marca | Nested Loops | T1 Motor | LinkedIn Julio · LinkedIn Página · Blog · YouTube · Instagram |
| Descubrimiento & IA (AEO+SD) | AEO+SD | T1 Motor | LinkedIn Julio · LinkedIn Página · Blog · YouTube · Email |
| Distribución & Growth (Reach) | AEO+SD | T1 Motor | LinkedIn Julio · LinkedIn Página · Blog · Email |
| Data & Medición (Wave) | Agentic Web | T2 Aceleración | LinkedIn Página · Blog · YouTube · Email |
| Partners & Ecosistema | Social Proof | T3 Amplificación | LinkedIn Julio · LinkedIn Página · YouTube · Instagram |

Cada pilar declara además **Registro de voz** (Estratégico-Ejecutivo · Comercial-Operativo ·
Creativo-Visual · Técnico-Digital), **Split** de mezcla, **Buyers** (BP1–BP8) y su **Job** explícito.

## 3. Reconciliación con `PDR-020` — no compiten, son ejes distintos

**`PDR-020` se escribió sin conocer esta base y quedó con dos supuestos incorrectos.** La corrección
está en `PDR-020` rev 1.5; acá queda el modelo resultante.

| Eje | Dueño canónico | Qué responde |
|---|---|---|
| **Pilar JTBD** | Notion (7 pilares) | de qué habla, para qué buyer, qué job resuelve, con qué registro de voz |
| **Franquicia** | `PDR-020` (7 líneas) | qué forma recurrente tiene la pieza y en qué canal nace |
| **Territorio editorial** | `PDR-019` (taxonomía WordPress) | bajo qué categoría se archiva y se hace citable en el blog |

Son **ortogonales**: un *Versus* (franquicia) puede servir al pilar *Operaciones Creativas* y
archivarse bajo el territorio *Inteligencia Artificial*. Una pieza bien formada declara los tres.

**Dos correcciones que esto obliga sobre `PDR-020`:**

1. **`Territorio Arc` ≠ territorio de `PDR-019`.** Arc (Social Proof, CSC, AEO+SD, Nested Loops,
   Agentic Web) es la narrativa de marca; `PDR-019` es la taxonomía del blog WordPress. Son dos
   taxonomías vivas y distintas. **NUNCA** mezclarlas ni asumir que una reemplaza a la otra.
2. **`LinkedIn Julio 👤` existe como canal separado de `LinkedIn Página 💼`** en las tres bases.
   `PDR-020` trataba "LinkedIn" como un solo canal. El vocero personal ya está modelado en el
   runtime — y es coherente con la decisión de talking head con Julio Reyes como cara.

## 4. Schema vigente del Calendario (lo que ya existe)

- **Canal** (select): Social Media · Blog · Email Marketing · Paid Media · Video
- **Plataforma** (multi): Twitter · LinkedIn 💼 · **LinkedIn Julio 👤** · Instagram · **Threads 🧵** ·
  TikTok · YouTube · Facebook · Reddit · Meta ads · Google Ads · Blog 📰 · Newsletter 📰
- **Tipo de pieza** (select): Carrusel · Reel/Short · Post estático · Video largo · Infografía/Guía ·
  Historia · Blogpost · Newsletter · Meme · **Portafolio**
- **Intención** (select): Reach · Conversion · Engagement · Educación · Nurturing · Brand Awareness · Retención
- **CTA** (select): Visitar web · Agendar reunión · Descargar recurso · Seguir cuenta ·
  Comentar/Interactuar · Comprar · Suscribirse
- **Status**: Sin empezar · En espera · En feedback · En Produccion Contenido · En Produccion Diseño ·
  Listo para revisión · Aprobado · Diseñado · Programado · Publicado
- **Métricas**: Impresiones · Clicks · Engagement Rate
- **Fórmulas de flujo**: Lead time · Cycle Time · Aging · Desviación · Cumplimiento · Buffer de
  planificación · Tiempo en producción · Tiempo post-aprobación

La instrumentación de flujo es fuerte y **conecta conceptualmente con las métricas ICO**
(RpA/OTD/FTR). Esa conexión no está hecha y no se hace en este documento.

## 5. Brechas detectadas

### 5.1 Wiki — la taxonomía existe y nadie la usa

**Las 89 páginas tienen `Etiquetas` vacío.** Las 8 etiquetas están definidas con descripción
(Estrategia · Marca y Tono · Formatos · SOPs y Procesos · Prompts e IA · Playbooks · Plantillas y
Reportes · Herramientas) y **cero páginas etiquetadas**. La wiki sólo es navegable por título.
Es la brecha más barata de cerrar y la de mayor retorno.

Faltan páginas de doctrina para: las franquicias de `PDR-020`, **seasonalities**, **talking head**,
**Threads**, **YouTube** y la doctrina de **casos de éxito** (existe `Case Studies Carrusel (Diseño)`,
que es un formato de pieza, no la doctrina de tres profundidades).

Páginas a revisar por posible conflicto con `PDR-020`: `Estrategia de Content Repurposing`,
`Aplicación del Tono por Canal`, `Distribución del Contenido Mensual`, `Tipos y Subtipos de Contenido`,
`Pilares de Contenido`, `Formatos y Subtipos - Definiciones`.

### 5.2 Calendario — cuatro propiedades faltantes

| Falta | Por qué importa |
|---|---|
| **Franquicia / Serie** | Las 7 líneas de `PDR-020` no son marcables ni medibles. Sin esto, no se puede saber si Behind the Build rinde |
| **Canal-hogar vs satélite** | `Plataforma` es multi-select: una pieza puede marcar Instagram + LinkedIn sin distinguir dónde nace y qué recibe un corte. Es exactamente lo que `PDR-020` restringe, y el schema no lo puede expresar |
| **Territorio (`PDR-019`)** | El eje de archivo/citabilidad del blog no existe en el calendario |
| **Métricas de la doctrina** | Se mide Impresiones/Clicks/Engagement Rate. `PDR-020` declara **sends, saves, watch time y dwell**, y demota explícitamente la métrica de vanidad. Hoy no hay dónde registrarlas |

Además: `Tipo de pieza` conserva **`Portafolio`**, descartado por `PDR-020` como formato principal de
Instagram; y `Canal = Video` se solapa con `Plataforma = YouTube` sin regla de desempate.

### 5.3 Seasonalities sin representación estructural

El plan 2026–2027 vive como 13 tareas en `Tareas Efeonce` + 13 entradas de calendario. **No hay forma
de expresar la ventana de una temporada** (entrada, pico, cierre) ni de agrupar sus piezas por mercado.
Es coherente con la corrección de `PDR-020` rev 1.4: la unidad es la ventana, no el día.

## 6. Propuesta de cambios (requiere autorización — nada aplicado)

**Orden recomendado, de más barato a más invasivo:**

1. **Etiquetar las 89 páginas de la Wiki** con la taxonomía ya definida. Sin cambios de schema.
2. **Agregar `Franquicia` (select)** al Calendario con las 7 líneas de `PDR-020`.
3. **Agregar `Rol de canal` (select: hogar · satélite)** o desdoblar `Plataforma` en
   `Plataforma origen` (select) + `Plataforma satélite` (multi).
4. **Agregar `Territorio` (select)** con la taxonomía de `PDR-019`.
5. **Agregar métricas** `Saves`, `Sends/Shares`, `Watch time` y `Dwell` como number.
6. **Retirar `Portafolio`** de `Tipo de pieza` (o marcarlo deprecado sin borrar histórico).
7. **Escribir en la Wiki** las páginas de doctrina faltantes y revisar las seis en conflicto.

**NUNCA** ejecutar ninguno de estos pasos sin autorización explícita del operador. Retirar una opción
de un select con histórico es destructivo: se marca deprecada, no se borra.

## 7. Referencias

- Decisión de canales: [`PDR-020`](../public-site/decisions/PDR-020-canales-propios-sistema-editorial.md)
- Taxonomía del blog: [`PDR-019`](../public-site/decisions/PDR-019-taxonomia-editorial-canonica-blog-wordpress.md)
- Plan de seasonalities: [`EFEONCE_SEASONAL_CONTENT_PLAN_2026_2027`](../audits/social/EFEONCE_SEASONAL_CONTENT_PLAN_2026_2027.md)
- Skills: `content-marketing-studio` · `social-media-studio` · `notion-platform`
