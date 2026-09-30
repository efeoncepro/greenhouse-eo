# AEO X-Ray — análisis y plan de extensión

Fecha: 2026-09-30. Estado: **Demo autónoma Think publicada y aceptada; kit multicliente verificado; integración gobernada Greenhouse pendiente**.
Owner propuesto: Comercial/Growth (contenido y aceptación), Platform (dominio/acceso), AXIS (contrato visual), Think (renderer).

## 1. Objetivo y alcance autorizado

El operador pidió analizar el X-Ray con subagentes y planear su extensión. Confirmó dos necesidades:
tokens de diseño/composición y enlace tokenizado por cliente. El primer caso será Banco Pichincha Perú:
landing completa con SEO técnico/on-page/AEO y un artículo de blog que demuestren capacidad.

La implementación fue autorizada posteriormente por el operador y ejecutada en TASK-1950/1951. El pedido inicial de análisis no autorizaba esas acciones; publicación, emisión productiva, envío y CRM siguen separados de la construcción local.
No crea una nueva app, servicio o repositorio. Tampoco convierte el X-Ray en un editor universal de websites.

## 2. Qué se verificó

Tres análisis paralelos: código y contratos del X-Ray; Insights/Report/AXIS; experiencia y caso Pichincha.
Se contrastaron documentación y código locales. Se inspeccionaron capturas históricas de julio, útiles como
referencia, **no como QA de la versión actual**. El chequeo local `verify-aeo-xray-scenarios.mjs` pasó sus dos
escenarios (SKY y fixture clínica); no es un build, una prueba integral de schema ni un test de navegador.
No se certificó el runtime productivo ni se consultaron métricas nuevas del banco en esta revisión.

| Hallazgo observado | Consecuencia para la extensión |
| --- | --- |
| Colección Astro `aeoXray`, payload JSON, un artículo y flow fijo de cuatro etapas | La landing y varias piezas requieren contrato versionado; agregar campos sueltos al artículo no resuelve la composición |
| Acoplamiento mediante IDs entre artículo, instrumento, evidencia y átomos | Reutilizar el principio y validadores; ampliar identidad a pieza/bloque y alcance página/sitio |
| Lectura del artículo separada de radiografía | Conservar; el inspector permanente ya produjo pérdida de espacio y calidad editorial |
| Validación de fuentes/fechas de estadísticas y referencias huérfanas | Extender, no reemplazar por validación sólo visual |
| Ruta estática `/muestras/<slug>-<token>`, token de 12 hex en el payload | Es enlace no adivinable, sin grant revocable por request; no es equivalente a Insights |
| BaseLayout activa analytics por defecto; la ruta X-Ray no lo desactiva ni fija canonical genérico | No heredar ese head para nuevos bearer links; potencial exposición de URL en metadata/telemetría, no incidente productivo demostrado |
| CSS X-Ray local, tokens copiados en los adapters Think de Insights y Report | No existe hoy un compositor universal; crear contrato X-Ray propio sobre AXIS, evitando otra copia manual |
| Report AXIS tiene contrato específico de PDF A4 y estado candidate | Reutilizar intent → validator → manifest y QA de adapter, no su schema de seis páginas |
| Insights tiene dominio, ediciones y permisos específicos de clientes con módulo habilitado | Reutilizar primitives/patrón de sharing, no sus tablas ni autorización para un prospecto |
| Sólo se encontró payload productivo SKY en la colección local | Pichincha será un caso nuevo; una fixture adicional deberá probar que el motor no contiene ramas por cliente |
| La ruta concentra 1.844 líneas; flow/JS/CSS están acoplados y los gates suponen cuatro pantallas estáticas | Extraer experiencia ORIGINAL completa dentro de Think como parte de U3; gates separados para legacy estático y V2 SSR |
| El H1 lógico del espécimen se renderiza como H3, y H2 como H4; el schema se exhibe como texto | La demo actual no demuestra el HTML SEO final de una página desplegada; separar semántica del documento objetivo del contenedor de muestra |
| `image()` depende del build y una fuente cliente está importada estáticamente | Definir asset/font registry remoto autorizado para SSR, con dimensiones, formatos, licencias, pesos y fallback |

Fuentes principales, rutas relativas a los repos indicados:

- Think: `src/content.config.ts:255`, `:300`, `:317`, `:325`, `:382`, `:407`, `:541`.
- Think: `src/pages/muestras/[slug]/[...step].astro:33`, `:141`, `:277`, `:295`, `:324`.
- Think: `src/components/aeo-xray/Article.astro`, `Instrument.astro`, `src/styles/aeo-xray.css`.
- Think: `src/layouts/BaseLayout.astro:36`; `src/pages/insights/r/[token].astro:13` y `:72`.
- Greenhouse: `src/lib/efeonce-insights/contracts/web-model.ts`, `sharing/token.ts`, `sharing/commands.ts`, `sharing/public.ts`.
- AXIS: `packages/contracts/src/ai-visibility-report.ts:133`; tokens/contratos oficiales de producto.
- [Arquitectura vigente](radiografia-aeo-architecture.md), [manual técnico](radiografia-aeo-manual.md),
  [manual comercial](../manual-de-uso/comercial/usar-radiografia-aeo-en-venta.md).

## 3. Dirección de experiencia — extensión del original

Decisión vinculante del operador (2026-09-30): robustecer el X-Ray existente y enriquecer su experiencia.
El renderer paralelo reducido fue rechazado. Preservar es el piso; las nuevas capacidades se suman al
producto actual. No basta reutilizar infraestructura y reemplazar la experiencia por tabs e inspector.

El cuerpo, componentes, estilos y controlador del original se extraen a `Experience.astro` compartido.
Legacy conserva payload y URLs; el acceso por edición adapta el contrato AXIS a esa MISMA experiencia.
El artículo usa `Article.astro`; la landing amplía el catálogo de specimens dentro del mismo recorrido.

1. **La brecha:** diagnóstico con SERP/KW realmente investigados, fuente/fecha, oportunidad y CTA integrado.
2. **La pieza:** landing o blog íntegros, selección secundaria de artefacto, identidad cliente, banners, TOC,
   FAQ y enlaces internos. El selector agrega capacidad; no sustituye la narrativa.
3. **La radiografía:** mismo specimen con SEO/OG/headings/ALT/schema/craft, evidence y fan-out concretos.
   Scope block/page/site y estado propuesto/implementado/verificado/medido enriquecen los datos originales.
4. **Dónde más vive:** derivados sociales, video/guion e imágenes con linaje hacia su pieza/bloque padre.
   Conservar composición de átomos, social destacado, entrega y evidencia. Ausencia de video producido se
   declara mediante guion/poster de muestra; nunca simular un video entregado ni resultados de difusión.

Se conserva coreografía completa: riel sticky/deeplinks, chrome estable, transición cross-document de
lectura a radiografía con specimen/hero persistente e instrumento lateral; CTA pending→floating→done
según lectura real, retorno al CTA inline al final. Cada pieza tiene sus datos/derivados y conserva selección
al avanzar. Navegación relativa por step/artifact evita serializar bearer en HTML/metadata.

El acoplamiento original conserva SSR hero preselected, mapa/enfoque, hover/focus/click pin/Escape, tinte
del origen y outline del destino, chips direccionales con conteo, foco seguro al colapsar, prioridad de
evidencia/tier, scroll interno y aviso de overflow. En móvil: sheet, restauración del foco, controles touch;
sin JS: lectura/instrumento apilados. Reduced-motion conserva los estados sin movimiento innecesario.

Las fotografías v1 fueron rechazadas por parecer artificiales. Su existencia y pruebas de carga no
equivalen a aceptación visual. La siguiente revisión debe probar autenticidad fotográfica y aplicación real
a la pieza, además de fuentes/derechos.

## 4. Tres contratos separados

### 4.1 Diseño y composición — AXIS

Tokens semánticos para superficies, tipografía, spacing, contraste, inspector, foco y motion; recetas para
shell, lectura, landing e inspección; variantes con sentido funcional. Marca cliente como configuración
validada y assets autorizados, sin CSS, HTML o scripts arbitrarios.

Contrato portable propio, nombre propuesto `efeonce.aeo-xray`, en los paquetes existentes de AXIS. Publicación
con versión fija, fixtures y Lab. Consumo nativo Astro en Think; no importar MUI/Vuexy ni renderer Greenhouse.
Preferencia por paquete oficial; si build exige snapshot, debe ser generado con provenance y gate de drift,
nunca copiado a mano. No migrar Insights y Report completos como dependencia de este piloto.

### 4.2 Contenido y edición — Greenhouse

Nombres **propuestos, no APIs existentes**:

- `XRayCaseIntentV1`: objetivo, target, locale, selección de piezas, dirección y fuentes.
- `XRayCompositionManifestV1`: piezas ordenadas, bloques resueltos, anotaciones y referencias validadas.
- `XRayEditionV1`: snapshot sellado, hash de contenido y versiones de modelo/contrato/tokens/assets.
- `XRayWebModelV1`: proyección pública allowlisted, sin notas internas, prompts ni evidencia cruda.

Unión discriminada `landing | article`; IDs estables por pieza y bloque. Catálogo inicial acotado:
hero/propuesta, texto, beneficios, condiciones, requisitos/pasos, tabla, FAQ, fuentes, enlaces, CTA y los
bloques editoriales ya existentes. No todas las landing necesitan todos los bloques. La composición decide
orden y presencia; las recetas gobiernan estructura y responsive. Nada depende del nombre Pichincha/SKY.

Las anotaciones declaran `scope: block | page | site` y familia `on_page | technical | aeo | conversion |
measurement`. Cada referencia apunta a IDs existentes. Una anotación de sitemap no necesita un H2 ficticio.
La representación visible es la autoridad para headings, ALT, texto de FAQ y respuestas: derivar esos campos
cuando sea determinista y contrastar el resto. No mantener dos copias editables que puedan contradecirse.
El documento objetivo conserva un H1 y su árbol semántico; la herramienta puede necesitar otra jerarquía para
encapsularlo. Mostrar esa distinción, y verificar el HTML objetivo en un renderer/fixture aislado si se afirma
que su estructura está implementada. No presentar el DOM envolvente de Think como el código final del banco.
Una exportación instalable/CMS queda fuera del piloto; los snippets o un plan técnico no son un deploy.

Dos ejes para las afirmaciones: **estado** (propuesto, implementado, verificado, medido) y **ámbito** (muestra,
sitio del cliente, fuente externa). `Medido` exige fuente, fecha, método, sujeto/mercado/dispositivo cuando
aplique; métrica, unidad y denominador si corresponde. Un test de preview no demuestra rendimiento del banco.
Recomendación sin dato no se convierte en cero, score o lift. Evidencia inválida bloquea emisión o se retira
explícitamente del caso con su limitación, sin presentar cobertura completa.

### 4.3 Compartir — grant de una edición

Modelo propuesto: **Case → Draft → Edition → ShareGrant**. El caso comercial pertenece al tenant propietario
Efeonce; el prospecto/compañía/deal es una referencia de negocio separada. No crear una organización cliente
ficticia ni habilitar `insights_v1` para permitir el enlace. Las capacidades y el acceso al caso son propios;
un ID HubSpot no concede autoridad.

Draft mutable; emisión congela contenido y versiones. Cada cambio posterior produce una nueva edición.
El grant apunta a una edición exacta, nunca a `latest` ni al borrador. Revocar un enlace y retirar la edición
son operaciones distintas; retirar deniega todos sus grants. Reemitir no reemplaza silenciosamente un envío.

Reutilizar primitives criptográficas existentes y patrón Insights: bearer aleatorio de 256 bits, digest
persistido, revelación una sola vez, TTL y revocación. Propuesta inicial de política: 30 días por defecto,
máximo 90, configurable dentro del límite; aprobar en ADR, no heredar por usar código de Insights.
No es autenticación del destinatario: quien reciba/reenvíe un bearer vigente puede leer esa edición.

Think resuelve server-side por request. Respuestas, assets privados y futuras descargas con `private,
no-store`; sin caches del navegador/service worker/CDN que eludan revocación. Sin GTM/page_location, sin bearer
en logs, canonical u OG; `no-referrer`, noindex y fuera del sitemap. Sanitizar errores y validar URLs/assets
desde referencias registradas; nunca un proxy abierto a URLs elegidas por el payload.

Los assets propios de la edición necesitan el mismo gate o un mecanismo privado equivalente; no basta
proteger HTML y publicar las imágenes de cliente en `/public`. Los recursos genéricos de marca pueden ser
públicos si están autorizados. No prometer recuperar capturas o archivos ya descargados tras revocar.

Estados: desconocido/inválido (sin identidad del cliente), expirado/retirado según política anti-oracle,
límite de solicitudes y error transitorio. Definir matriz HTTP/copy única en el contrato. Si falla un
diagnóstico vinculado pero el dossier está autorizado, mostrar sus piezas y marcar la dependencia ausente;
si falla la autorización del dossier, no servir contenido anterior.

## 5. Qué demostrará cada pieza

| Capa | Landing | Artículo | Límite de evidencia |
| --- | --- | --- | --- |
| Intención | Necesidad transaccional, oferta y acción | Decisión previa/pregunta informativa, enlace a landing | Query set fechado; no volumen o ventas inventados |
| On-page | Title, description, H1, jerarquía, copy, ALT, enlaces | Lo mismo más índice, firma y fuentes | DOM visible y representación técnica coherentes |
| SEO técnico de página | URL/canonical propuestos, HTML, imágenes, performance | Configuración adaptada a pieza editorial | Medidas de muestra etiquetadas por entorno |
| SEO técnico de sitio | Sitemap, rastreo, redirecciones, integración | Cluster, enlaces entrantes, canibalización | Especificación y plan de validación; no acceso supuesto al banco |
| AEO | Respuestas autónomas, condiciones, entidad | Subpreguntas, fuentes y pasajes extraíbles | No garantía de citación ni mejora de score |
| Datos estructurados | Tipo apropiado a hechos demostrables | Article/BlogPosting y autoría verdadera | JSON-LD sólo exhibido; no marcado bancario activo en Think |
| Conversión | CTA y continuidad a apertura | CTA contextual a landing | Simulación de recorrido; sin captación financiera |
| Medición | Eventos propuestos y condiciones de atribución | Lectura útil y paso hacia producto | Ninguna interacción de demo equivale a apertura/fondeo real |

Separar siempre **configuración propuesta para el banco** del head de la muestra: canonical/indexación del
sitio objetivo se enseñan como especificación; el dossier real permanece noindex. El CTA bancario del piloto
demuestra el recorrido sin formulario operativo ni colección de DNI/datos financieros. No inventar tasas,
reviews, métricas, expertos, certificaciones o aprobación del banco.

## 6. Arquitectura y alcance mínimo del piloto

```text
Contenido autorado + fuentes verificadas
    → validar intent / resolver composición con contrato AXIS
    → draft del caso en Greenhouse
    → revisión y emisión de edition inmutable
    → share grant propio
    → reader público con proyección segura
    → Think SSR: oportunidad / landing / artículo / inspector
```

Greenhouse aloja dominio y persistencia mediante helpers canónicos, comandos/readers y auditoría existentes;
Think presenta. AXIS no almacena casos ni permisos. El path definitivo del dominio se decide en el slice de
contratos, buscando antes reutilización en Comercial; no forzar las entidades de Insights.

Alternativas de entrega evaluadas:

- **Ampliar sólo JSON estático:** menor esfuerzo, buena para preview; publicar/retirar depende del build y no
  satisface expiración/revocación comparable a Insights. No recomendar como resultado final de este pedido.
- **Dominio acotado + SSR (recomendada):** soporta ediciones y acceso controlado, tiene costo de schema/auth/API.
  Piloto sólo web, authoring con payload tipado y comandos; no editor de arrastrar, no agente generador autónomo.
- **Meter el caso en Insights:** reduce componentes aparentes, mezcla prospectos con client reporting y permisos
  incompatibles. Rechazada; reusar primitives acotadas cuando el contrato sea de verdad neutral.

No nuevos render jobs para la experiencia HTML. Si se agrega PDF/deck después, evaluar el Artifact Worker
multiconsumidor existente, sin convertir esa exportación en dependencia del envío web.

Comandos conceptuales: crear/actualizar draft con revisión optimista; validar; emitir con idempotencia;
crear/revocar grant; retirar edición; lectores de preview/edición. Todos comparten primitives de dominio.
Diseñar exposición UI/API/MCP y matriz de permisos por operación; decidir explícitamente qué emisión es
human-only y cómo se acredita aprobación. La restricción propia de Insights no se traslada por inferencia.
Una ruta pública de lectura no permite autorar, emitir o enumerar casos.

## 7. Plan por unidades y dependencias

IDs de trabajo siguientes son etiquetas del plan, **no TASK registradas**. Registrar tasks dependientes tras
aceptar dirección; separar backend/data de UI conforme al operating loop. No iniciar implementación desde este
documento ni interpretar tareas históricas como autorización nueva.

| Unidad | Entrega / owner | Depende de | Criterio de salida |
| --- | --- | --- | --- |
| U0 — decisión y diseño | ADR de ownership/ediciones/sharing; matriz permisos; dirección visual, wireframe/flow/motion; Platform + Diseño | Este análisis | Decisión aceptada; rutas/modelos/actores claros; primer fold especificado para desktop/móvil |
| U1 — contratos y compatibilidad | Intent, manifest, modelo público, schema, grafo de referencias y adaptador legacy; AXIS + Growth | U0 | Dos casos diferentes válidos; payload inválido falla; SKY conserva contenido/rutas |
| U2 — dominio y sharing | Persistencia, draft/edition, comandos/readers, proyección, grants, assets y adapters de acceso; Platform | U1 | Aislamiento, idempotencia, versiones y revocación verificadas; flags en oscuro |
| U3 — renderer de piezas | Experience original compartida; Article/Instrument/atoms/coreografía preservados; landing y selector de pieza añadidos; Think | U1 + dirección U0 | Primer fold aceptado antes de ampliar; fixtures completas, teclado/touch y sin JS |
| U4 — integración pública | SSR, cliente headless, estados, version-skew, privacidad y deep links; Think + Platform | U2, U3 | Readback de edición real y negativos en staging; assets no eluden grant |
| U5 — contenido Pichincha | Oportunidad elegida, fuentes actuales, landing/artículo completos y revisados; Comercial + SEO/editorial | U1; producción visual sobre U3 | Ángulo aprobado, coherencia editorial, derechos y cifras verificables |
| U6 — aceptación y rollout | Gates locales, staging, revisión visual/editorial, release y readback del enlace final | U4, U5 | Dos piezas navegables para la edición aprobada; envío de correo sigue siendo acción separada |

Tras U1, U2 y U3 pueden ejecutarse en paralelo con ownership disjunto. La investigación/editorial de U5 puede
avanzar sin esperar todo el backend. Publicación de contrato AXIS precede al pin final del consumer; nunca
dejar una dependencia flotante. La fecha de reunión no justifica etiquetar como operativo lo no verificado.

## 8. Pichincha: contenido inicial y dependencias

Fuente: [Prospect Case](../commercial/prospects/banco-pichincha-peru-seo-2026/PROSPECT-CASE.md).
Hipótesis para seleccionar con el operador: landing de una necesidad/producto de ahorro concreto y artículo
que resuelva una decisión previa, evitando dos URLs que compitan por la misma intención. Moneda, segmento,
producto y ángulo todavía no están aprobados para producción.

La muestra SERP de 28/09/2026 observó oportunidades en apertura online/sin mantenimiento; no aporta GSC/GA4,
volumen, conversión ni pérdida de ingresos. Revalidar fuentes oficiales de tasas, condiciones, requisitos y
destino de apertura antes de redactar. Si no hay respaldo de una cifra, se omite; no se rellena la composición.

El informe del Grader figura sin QA comercial aprobado; no convertir su score global 46,2 en AI Visibility
12,5, ni citar cinco proveedores exitosos cuando el expediente registra cuatro. El dossier puede sustentarse
en evidencia SERP independiente mientras se verifica/corrige el informe. Su corrección no se oculta editando
la muestra. Los casos bancarios del deck con cifras provisionales no alimentan evidencia del X-Ray.

## 9. Verificación y aceptación

- **Contrato:** rechazar referencias rotas, IDs duplicados por pieza, stats sin procedencia, URLs inseguras,
  versiones major no soportadas y bloques desconocidos. Recorrido original completo y derivados demostrables; fixtures landing-only,
  article-only y conjunto landing+article. Un nuevo cliente no cambia renderer.
  Validar unicidad/orden del flow, H1 lógico, jerarquía y filas de tablas; restringir IDs y escaparlos al usarlos
  en selectores. Campos fuente/fecha válidos no certifican por sí solos la verdad de la afirmación.
- **Fidelidad:** conservar muestra SKY y deep links legacy. No migrar su audiencia a grants silenciosamente;
  planear transición explícita si se retira el contenido estático. Adaptador legacy no expone otros casos.
- **Permisos:** actores de dos tenants, prospect reference que no amplía permiso, draft no público, enlace de
  una edición incapaz de abrir otra. Grant inválido/expirado/revocado y edición retirada, incluso en assets.
- **Edición:** modificar draft no cambia edición compartida; emisión repetida con misma clave no duplica;
  disputa de revisión no sobrescribe cambios; manifest/hash/versiones reproducibles.
- **Privacidad:** no token en logs/analytics/OG/canonical; no-store efectivo hasta CDN; fallos de upstream
  no sirven contenido antiguo. Rate limit y redacción ejercitados con bearer sintético.
- **SEO de muestra:** sin JSON-LD del banco activo, noindex/sitemap excluido, links seguros, CTA sin captura;
  distinguir DOM de la muestra de configuración objetivo. No evaluar `noindex` deliberado como defecto SEO.
- **Editorial:** leer juntos artículo/landing, anotaciones y fuentes; narración coherente y relación de
  intenciones. Claims con ámbito; no autores, tasas, resultado o review bancario inventados.
- **UX:** desktop y 390px, teclado/touch, reduced-motion y lectura sin JS; conteos exactos del inspector;
  foco/restauración y overflow medidos; contraste, fuentes y contenido largo en ambas identidades.
- **Calidad visual:** capturas nuevas miradas por pieza/modo/estados principales y scorecard premium;
  promedio ≥4,5, ningún eje <4 y pisos del estándar. Capturas históricas no cierran el nuevo diseño.
- **Performance:** benchmark local/staging del dossier, peso de assets y señales de layout/render; presupuestos
  numéricos fijados con baseline en U0/U3. No atribuirlos al dominio del cliente ni simular field CWV.
- **Runtime:** flags/env/migración/deploy/readback de consumer y provider; revocación comprobada mediante nueva
  petición. Desactivar entrada nueva preserva legacy; rollback no revierte una retirada ya aplicada.

Gates existentes a conservar/ampliar en Think: `pnpm read:aeo-xray`, build/type-check, `verify:aeo-xray` y
`verify:aeo-xray:scenarios`. Leer help/contratos reales antes de ejecutar sobre V2. Añadir pruebas de acceso
en Greenhouse y validación/adapter QA en AXIS; un PASS de payload no sustituye navegador y revisión editorial.
El script actual usa `XRAY_SAMPLE`, no `XRAY_SLUG` como dice parte de la documentación; alinear también las
rutas de imágenes y el mínimo de pasos/átomos. Conservar la experiencia original de cuatro pasos y verificar sus derivados; ampliar los gates para dos piezas sin recortar capacidades.

## 10. Decisión arquitectónica propuesta y cierre de planeación

**Status:** Proposed. **Date:** 2026-09-30. **Reversibility:** two-way-but-slow.
**Confidence:** alta sobre necesidad de separar composición y acceso; media sobre placement exacto hasta U0.
**Validated as of:** código/documentos locales al 30/09; runtime público no certificado en este análisis.

**Decisión propuesta:** X-Ray como demostración comercial compuesta por piezas, con contrato portable AXIS,
dominio propio de caso/edición en Greenhouse y renderer Think; grants específicos a ediciones. Mantener las
fronteras de Insights/Report y compatibilidad de muestras legacy. Alternativas y costos: §§3, 6.

**Consecuencias:** permite enviar trabajo completo y verificable sin ramas por cliente; agrega persistencia,
permisos, versionado y pruebas cross-runtime. Scope inicial acotado a landing+artículo web. Antes de construir,
formalizar ADR aceptado en el dueño canónico e indexarlo; no tratar esta propuesta como contrato vigente.

**Reabrir si:** se necesita login del destinatario, contenido confidencial, coedición del cliente, deployment de
las páginas en su CMS, exportación multiformato, generación automática o casos a gran volumen.

Documentación de implementación: actualizar arquitectura, manual técnico, manual comercial y doc funcional;
añadir contrato/Lab AXIS y tasks con evidencia. Corregir drift «atenuar» frente a «colapsar» y narrativa que
promete arreglar puntos del score; no reescribir historia. Este plan se enlaza desde Think para continuidad.

**Estado vigente:** ADR aceptado y TASK-1950/1951 registradas; contrato AXIS, dominio de ediciones/grants,
API privada, renderer original extendido y migración escrita. Landing y blog Pichincha tienen preview local,
fuentes y medios revisados; el kit neutral permite otro cliente sin modificar componentes. No hay migración
compartida aplicada, release ni grant productivo emitido. Ver [auditoría de cierre](aeo-xray-completion-audit-2026-09-30.md).
Las descripciones de propuesta anteriores conservan el análisis inicial; ADR, código y tareas gobiernan el estado actual.
