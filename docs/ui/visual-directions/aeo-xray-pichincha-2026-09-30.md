# AEO X-Ray · Banco Pichincha Perú · dirección visual

Fecha:2026-09-30. Estado: dirección implementada en muestra Think publicada, no aprobación del banco. Owner: Growth/Think. Rigor: ui-platform. Modo: repo-native-benchmark. Runtime: efeonce-think; evidencia de despliegue de la muestra en Estado verificado de la superficie.

## Estado verificado de la superficie — 2026-09-30

La experiencia extendida está construida y la **muestra Think** está publicada. Evidencia de
release conservada en `../efeonce-think/.captures/aeo-xray-selector/release.json`:
commit `be8d4841e1124818bd7f4c88d0d7ad7b970e5122`, deployment
`dpl_7AEWYHEiiWWUyCiwrcTj1US1e3vB`, estado READY/Production y alias `think.efeoncepro.com`.
No registrar aquí el enlace completo del caso ni tokens. Esto no demuestra un rollout de
Greenhouse: sus grants, flags, migración y assets privados conservan estado propio pendiente.
El sample `sample_…` está incluido en Think y no hace una petición/grant Greenhouse; retirarlo
requiere remover registry/medios y redeploy. Es distribución no listada, no acceso autenticado.
Las rutas legacy y el renderer original se conservan. Arquitectura y detalle operativo:
`docs/think/radiografia-aeo-architecture.md` y `docs/think/aeo-xray-release-handoff.md`.

## Decision

Extender íntegramente el X-Ray original con sus cuatro pasos:①La oportunidad,②La pieza,③La radiografía,④Dónde más vive. Experience/Article/Instrument/Atoms son las primitives activas; Landing se añade al mismo recorrido. Selector landing/artículo secundario conserva paso y contexto. Se descarta el dossier paralelo inicialmente propuesto porque eliminaba parte de la experiencia original.

La landing y el artículo se leen completos en②; la transición②→③convierte la misma pieza en espécimen acoplado.④conserva video, social e imágenes con linaje al bloque padre. Marco Efeonce estable; logo oficial cliente en cabecera y telón además de identidad dentro de pieza. Composición por datos/tokens y acceso por enlace son contratos distintos; no hay editor visual en piloto.

## Desktop target

1440×1000. Riel4 pegajoso y selector de piezas visibles; disclaimer en cierre/footer.①SERP+diagnóstico+evidencia con CTA integrado.②lectura inmersiva, hero, cápsula, TOC, FAQ, tablas y fuentes completos; ningún instrumento roba ancho.③split original, hero seleccionado SSR y máquina SEO/OG/H/ALT/JSONLD/craft/facts/fanout/honesty más annotations técnico/on-page/AEO/conversión.④social central y más ancho, video16:9/reel9:16 e imágenes con ALT, why/spec/fuentes/fecha. CTA Siguiente grande con frase narrativa.

Corrección del operador: la composición de panel vertical fue rechazada por rígida y pobre. La referencia visual vinculante es la captura oficial proporcionada por el usuario (guardada fuera del repo en assets/reference-bank/operator-reference.png). Landing con header bancario blanco compacto, hero panorámico integrado, H1 del producto navy slab a izquierda, CTA amarillo y fotografía a derecha. Beneficios por moneda conservan tasa y condiciones adyacentes desde el payload, con jerarquía visual real. El blog añade lectura editorial con banner horizontal y TOC lateral en desktop. Fuente Roboto Slab licenciada como sustitución explícita de Prelo, no equivalencia exacta. Product Design image-to-code/design-qa guían la comparación sobre el código existente; no se crea otro renderer ni proyecto.

## Mobile target

390×844. Riel centra aria-current step incluso al entrar directamente④.②hero apilado, tabla semántica y TOC disclosure.③contenido primero y máquina cerrada; toque/teclado abre hoja con foco contenido y cierre visible. Sin JS instrumento debajo.④social primero visualmente por propiedad semántica; DOM y class atom originales conservados. Documento sin overflow; código/tablas sólo en wrapper anunciado.

## Token mapping

AXIS gobierna brand/typography/specimen/instrument y motion; Think adapter resuelve CSS. Colores observados#0F265C/#FFDD00 informan roles, no hardcodes por cliente. Marco conserva Geist/Poppins Efeonce; pieza display Roboto Slab (Apache2.0 verificada en google/fonts/apache/robotoslab) y cuerpo autorizado. Prelo original sin licencia verificada no se empaqueta.

Acoplamiento original: fuente tinte+barra, destino outline+pulso+origen←, chip→N datos; móvil↓/↑. CSS cross-document xr-article/hero conserva morph②→③, marco/riel no animan. Reduce elimina morph/pulso/scroll suave manteniendo foco y significado. Tokens de acceso jamás entran en visual tokens o analytics.

## Anti-patterns

No V2 paralela, no tabs de piezas como reemplazo del riel4, no omitir atomización, no sidebar genérico en sustitución de la revelación. No inspector en primera lectura, no cards/KPIs inventados, no article truncado, no social vacío, no nacionalidad/modelos-clientes inferidos ni foto generada presentada como persona real. No tasas sin fecha/condición, no schema bancario activo en Think, noindex nunca reemplaza autorización.

## Referencias observadas en vivo

- Landing: https://www.pichincha.pe/personas/cuenta/ahorro-preferente
- Blog: https://www.pichincha.pe/blog/cuenta-de-ahorro-de-alto-rendimiento-que-es
- Inspección con Chrome/CUA: DOM y capturas desktop y 390×844. Las capturas fueron inspeccionadas en el resultado de herramientas; no se afirma dossier PNG persistido. Sin sesión bancaria ni envío de formularios.
- Landing: encabezado blanco, marca a izquierda, navegación al centro, botón amarillo a derecha; franja contextual azul pálido; hero fotográfico horizontal con texto azul a izquierda y sujeto a derecha. Beneficios por moneda, pasos, documentación y FAQ.
- DOM desktop: H1 `Prelo Slab semibold`, 49 px, color rgb(15,38,92); bajada `Prelo Slab book`, 25 px; botón `Prelo medium`, 16 px, fondo rgb(255,221,0), radio 4 px. H2 principal 31–32 px. Son observaciones del sitio, no valores para pegar en JSX.
- DOM móvil: H1 32 px; ancho y scrollWidth 390 px. Header reducido a marca y menú. Hero claro con copy y CTA a ancho útil; URL de fondo mobile distinta. No comprimir layout desktop.
- Blog: titular slab centrado y contenido de lectura amplio; cuerpo Prelo medium 16/24. El artículo inspeccionado usa H2 y H4, sin H1 observado: la nueva muestra debe corregir semántica, no copiar ese defecto. No se observó banner dentro del primer pliegue de ese artículo; añadir uno es decisión de diseño propuesta.


## Fotografía y derechos

Las dos imágenes generadas v1 fueron rechazadas por el operador: gesto teatral, escenografía perfecta y cuaderno vacío. Permanecen fuera de repo en assets/rejected-generated-v1, excluidas de la propuesta actual. La revisión anterior del agente no constituye aceptación vigente.

Para la revisión local según referencia del operador se emplean banner original `ahorros.webp` y logo oficial del banco, obtenidos del sitio vivo, con procedencia en `assets/reference-bank/provenance.json`. No se atribuyen a Efeonce ni se infiere aprobación del banco o derechos de publicación externa. El retrato vertical 6331254 deja de ser la dirección del hero. El blog conserva fotografía real 5239740 horizontal5249×3504. Fuentes de las fotografías Pexels:
- https://www.pexels.com/photo/crop-hispanic-woman-surfing-internet-on-smartphone-outdoors-6331254/
- https://www.pexels.com/photo/crop-ethnic-businesswoman-chatting-on-smartphone-near-laptop-on-table-5239740/
- Licencia comercial: https://www.pexels.com/license/ (sin endorsement; no equivale a aprobación banco o model release individual verificado).

Originales y hashes en `/Users/jreye/Documents/Banco Pichincha Peru — Prospect Case/05-XRay-production/assets/real-photography-provenance.json`. Crédito y ALT factual, no llamar peruanas o clientes del banco. WebP sin recorte conserva originales/fuente. El operador cerró la revisión visual de esta entrega tras publicación. No se infiere aprobación del banco, derechos adicionales ni scorecard formal.

## Contenido, estados y aceptación

Contenido externo en05-XRay-production. Autor Efeonce muestra editorial, revisor banco no asignado. Datos DataForSEO2026-09-30 Perú/es: volúmenes estimados sin segmentación dispositivo, SERP móvil snapshot; no confundir seeds y consultas con sufijo Perú. Propuesto/implementado/verificado/medido incluyen ámbito, fecha y evidencia. No prometer ranking/citas/conversión.

Rutas step/pieza direccionables, back/reload preservan contexto válido. Invalid/expired/revoked sin cliente ni payload; error recuperable sin raw errors/token. Edición fija no se actualiza silenciosamente. No-JS preserva cuatro pasos y lectura.

Aceptación exige capturas cuatro pantallas desktop/móvil,②→③normal y reduce, riel④activo visible, social real protagonista y linaje de ambas piezas, fotografía sin cortes, piezas completas, regresión SKY, no-JS/teclado/foco/contraste/performance y negativos de acceso. Scorecard premium posterior a capturas, sin autocalificación anticipada. Los docs wireframe/flow/motion TASK-1951 definen contrato detallado vigente.

## Dirección final y capacidades incorporadas

**Personalización y apertura.** Logo oficial Banco Pichincha en cabecera y bienvenida. La firma
principal es lockup oficial Efeonce AEO de AXIS, con X-Ray como descriptor aparte. Telón azul
profundo abre hacia arriba durante1400ms; burbuja URL acompaña al logo. Se verifica la duración
después de minificación CSS (1.4s→1400ms en WAAPI), no sólo en fuente o captura final.

**La oportunidad.** Stage navy, tipografía amplia y tarjeta clara de búsqueda ilustrativa con
respuesta/fuente; rótulo explicita que no es resultado real de buscador. Observaciones de SERP
fechadas/metodología conservan lente diferente. Preview a la pieza usa continuidad nativa de
la misma entidad; cambiar pieza usa crossfade de contenido y shell estable. Selector pill con
iconos y labels por encima del indicador durante el snapshot, no sólo en estado de reposo.

**Piezas completas.** Landing modular: hero, beneficios/tasas con condiciones, requisitos/proceso,
FAQ y CTA oficial. Artículo: estructura editorial extensa, TOC, dos banners contextuales y cierre.
Iconografía ayuda ubicación sin reemplazar encabezados. La radiografía hace verificable
pregunta→respuesta→fuente→implementación/medición prevista; no anuncia lift, ranking o citas
por tener schema. Fuentes editoriales públicas separadas del proveedor de investigación.

**Derivados reales.** Galería con piezas gráficas producidas para formatos nativos, ampliación,
descarga y linaje; video vertical10s720×1280, H.264/MP4 web-compatible y faststart, poster y play.
Playback se verifica por avance del tiempo y cambio de paused, selección y reanudación; metadata
cargada no basta. No autoplay/loop forzado; cambiar formato pausa. Sin JS conserva materiales.

**Cierre y calidad.** Footer compacto explica autoría/demostración y contiene links útiles. QA
responsive incluye320px; teclado, reduce, almacenamiento bloqueado y salida sin JS conservan
recorrido. Los JSON de pruebas y frames de producción están en `.captures` de Think; esta
actualización documental no vuelve a ejecutar producción ni sustituye aprobación de derechos.
Scorecard premium formal pendiente; tareas/grants Greenhouse conservan estados propios.
