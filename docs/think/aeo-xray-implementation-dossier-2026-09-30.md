# AEO X-Ray — dossier de implementación y entrega, 30/09/2026

## Alcance y estado que este expediente acredita

Owner: Growth/Comercial + Think; dominio futuro: Platform/Greenhouse; composición portable: AXIS.
Este expediente documenta la extensión del X-Ray existente, su entrega comercial independiente en
Think y las decisiones/correcciones que deben conservarse al producir el siguiente cliente.
No es un reporte de desempeño del banco ni evidencia de rollout del backend Greenhouse.

El usuario dio por terminada la experiencia y pidió documentar, actualizar skills y hacer commit.
El sitio de entrega está publicado en `think.efeoncepro.com`; el caso es Banco Pichincha Perú.
La dirección completa del caso se mantiene en el registro de entrega privado, no se replica aquí.
El brochure y Efeonce Insights son enlaces complementarios del correo previo a la reunión;
Insights mantiene su propio dominio y contrato: X-Ray no hereda tablas, permisos ni grants de Insights.

| Plano | Estado y evidencia | Qué no demuestra |
|---|---|---|
| Think | `main`, SHA `be8d4841e1124818bd7f4c88d0d7ad7b970e5122`; producción `dpl_7AEWYHEiiWWUyCiwrcTj1US1e3vB`, alias Think; evidencia en `.captures/aeo-xray-selector/release.json` | Publicación CMS del banco, autorización de Instagram o rollout Greenhouse |
| Lectura pública de la muestra | Readback HTTP en esta auditoría:200; private/no-store; noindex/nofollow; no-referrer; nosniff; sin JSON-LD activo ni Google Tag Manager en HTML | Login, identidad del receptor, caducidad o revocación inmediata |
| Foundation Greenhouse | Código/API/migración y pruebas locales preparados; no promoción autorizada | Tablas compartidas, actor real, storage/configuración, grant emitido o canary productivo |
| AXIS | Snapshot generado `efeonce.aeo-xray`0.1.0 con provenance y hashes en consumidores | Nueva publicación npm o promoción de otros productos |
| Aceptación | El operador cerró los ajustes de UI y pidió documentación | Aprobación financiera/legal del banco o resultados de búsqueda |

## 1. Se extendió el producto original

La corrección de dirección del usuario fue explícita: robustecer el X-Ray, preservar los derivados y
la coreografía y evitar construir una experiencia reducida paralela. La solución final extrae
`Experience.astro` como recorrido compartido. `Article.astro`, `Instrument.astro`, el acoplamiento,
la evidencia y la atomización continúan; `Landing.astro`, los módulos, selección multipieza,
Opportunity, ValueExplorer, SocialShowcase y WelcomeCurtain son capacidades adicionales.

Legacy sigue usando `src/content/aeo-xray/*.json`, Content Collection, URLs
`/muestras/<slug>-<token>/<step>` y su comportamiento existente. La ruta SSR nueva usa
`/aeo-xray/r/<key>?artifact=<id>&step=<stage>` y adapta una composición aceptada al render original.
No hay un componente duplicado específico para Banco Pichincha ni un segundo DSL editorial.
El payload cliente define contenido, marca, evidencia y relaciones; el renderer define presentación.

## 2. Tres modos de entrega, con garantías distintas

### 2.1 Legacy

La colección estática valida contenido y fuentes en build. La URL no adivinable es distribución
no listada; no tiene un ciclo de grants revocables. Su gate46 conserva las invariantes originales.
No trasladar sus cifras históricas de rendimiento al caso bancario o al nuevo renderer.

### 2.2 Muestra publicada en Think — carril usado para el envío

`published.ts` importa el registro empaquetado `published/pichincha.json`. Una key que empieza por
`sample_` consulta exclusivamente este registro y pasa por `acceptSharedXray`; no hace fetch a
Greenhouse. El registro contiene `model`, `editionId` y mapping assetId→path. Es una entrega
independiente para poder enviar el trabajo sin promover el WIP de Greenhouse.

La key desconocida devuelve not_found. La edición empaquetada no tiene lifecycle de grant:
`expiresAt:2099-01-01` es compatibilidad de envelope, no promesa de TTL. Retirar exige eliminar
el registro y sus medios del deployment y verificar el redeploy. Un enlace reenviado sigue siendo
usable. La confidencialidad fuerte no forma parte de este carril.

Aunque el manifest conserva refs `protected` por portabilidad, `?asset=<id>` en modo sample
resuelve un path registrado y devuelve302. Los medios del sample están publicados como archivos
estáticos; no es storage privado ni control de acceso para esos bytes. El gate de este carril
comprueba disponibilidad, mapping e integridad de producción, sin atribuir garantías del backend.
SVG oficial y MP4 funcionan en este carril. El futuro reader de grant normaliza/proxifica imágenes;
no asumir que su contrato actual soporta automáticamente vídeo/SVG.

### 2.3 Grant Greenhouse — implementación preparada, rollout pendiente

Un token `xrg_` válido es leído por transport request-scoped con timeout12s, redirects rechazados,
cache no-store y contrato JSON validado. Think sólo usa el provider para ese modo. El reader/API
y la migración del dominio `greenhouse_xray` viven en Greenhouse. Su diseño incluye caso,
borrador editable con revisión esperada, edición inmutable, digest-only de bearer, TTL,
revocación, retirada de edición, organización operativa activa y media privada ligada al caso/hash.

No existe evidencia aquí de migración compartida, storage real, flags activos, permisos reales o
canary completo. No cambiar el carril sample por grant sólo porque existe el cliente transport.
No configurar fixtures como ruta pública: `fixture-`/`fixture-client` se resuelven sólo en DEV.

## 3. Fronteras y mapa de código

| Owner | Entrypoint/archivo | Responsabilidad |
|---|---|---|
| AXIS | contrato generado `src/lib/axis/aeo-xray/{aeo-xray,aeo-xray-experience,aeo-xray-tokens}.*` | Resolver intent, referencias, tokens, checks y versión |
| Think | `src/pages/aeo-xray/r/[token].astro` | SSR, status, headers, selección de pieza/paso, media |
| Think | `accept.ts` | Validar envelope1.0, manifest resolved/schema, header congruente y tokens/checks exactos |
| Think | `client.ts`, `published.ts`, `fixtures.ts`, `transport.ts` | Separar sample/DEV/grant; sin logging de bearers |
| Think | `experience-adapter.ts`, `render-model.ts` | Adaptación aditiva al espécimen e instrumento originales |
| Think | `view.ts` | Links relativos, selección y tokens CSS validados |
| Think | `Experience.astro` | Shell, cuatro etapas, navegación, espécimen, inspector, derivados |
| Think | `SpecimenHeader.astro`, `Landing.astro`, `LandingModules.astro`, `Article.astro` | Marca y lectura del cliente |
| Think | `Opportunity.astro`, `ValueExplorer.astro`, `EvidenceNote.astro` | Narrativa de oportunidad, trazabilidad y límites |
| Think | `Instrument.astro` | SEO, headings, ALT, JSON-LD mostrado, craft y evidencia |
| Think | `SocialShowcase.astro`, `SampleImage.astro` | Medios reales, descarga/ampliación, player y compatibilidad legacy |
| Think | `WelcomeCurtain.astro`, `src/scripts/aeo-xray-motion.ts`, `src/styles/aeo-xray.css` | Apertura, lifecycle Astro, geometría compartida y accesibilidad |
| Think | `copy.ts`, `section-icons.ts`, `SectionIcon.astro` | Copy común e iconos por rol editorial/estructura |
| Greenhouse | `src/lib/aeo-xray`, API App/public, migración X-Ray | Autoría/acceso futuros; source preparado, no runtime publicado |

`acceptSharedXray` vuelve a resolver intent con el contrato distribuido. Compara tokens y
adapterChecks con serialización estable; no acepta CSS arbitrario, un manifest alterado o una
versión silently upgraded. Los headers tienen que coincidir con title/preparedFor del modelo.
El adapter conserva `artifact.experience` completo: thesis/meta/gap/machine/flow/atomsIntro/atoms/
evidence/ui. Nunca suplir una experiencia faltante con una demo parcial.

## 4. Modelo portable de composición

El manifest `axis.aeo-xray-composition.v1` contiene locale, preparedAt/preparedFor, sources,
assets, artifacts, flow, brand, tokens y adapterChecks. Cada artefacto contiene id/kind/title/summary,
blocks, seo, annotations y experience. Hay dos piezas, no dos casos aislados:
`ahorro-preferente` (landing) y `guia-cuenta-online` (article).
`flow.entryArtifactId` apunta a landing; el correo usa un link explícito hacia el artículo.
Links de contenido cruzan entre piezas y pueden señalar un blockId.

Cada bloque tiene id estable y tipo semántico. IDs alimentan coupling, fan-out, annotations,
TOC, origen social y fragmentos; al editar contenido, mantener las referencias o actualizarlas
juntas. El selector conserva el paso al cambiar de artefacto. Un `step` desconocido o artefacto
inexistente responde404, sin entregar contenido residual de otra pieza.

Brand separa shell Efeonce de espécimen del cliente: Banco Pichincha usa navy `#0F265C`, acción
amarilla `#FFDD00`, texto navy, Roboto Slab en display y sans en cuerpo. Es configuración del caso,
no una regla para todos los clientes. CSS de composición sale de tokens aceptados. Los nuevos
clientes se producen desde el kit documentado en [nuevo cliente](aeo-xray-nuevo-cliente.md);
fixtures sirven para QA local y no sustituyen el registro comercial de producción.

## 5. Recorrido completo y personalización

### 5.1 Cabecera, selector y footer

Cabecera Efeonce AEO utiliza `/branding/aeo-lockup-negative.svg`; el logo oficial del cliente
aparece en una cápsula clara. X-Ray pasa a una franja editorial propia con descriptor
«El contenido, por dentro». La demostración Efeonce se explica al cierre para liberar la entrada.
Footer compacta marca, contexto de muestra, derechos y enlaces; evita el vacío exagerado anterior.

Landing/Artículo es un segmented control de pista navy, estado activo claro y texto navy, iconos
`PanelsTopLeft`/`FileText`, foco visible y `aria-current`. El indicador comparte identidad de
view transition; cada opción tiene identidad separada y grupo por encima del indicador. Esto
corrige el fallo intermedio donde la cápsula clara tapaba la etiqueta en el snapshot de transición.

### 5.2 Telón de bienvenida

Sólo la primera etapa compuesta presenta un dialog azul de viewport completo. Contiene logo del
cliente, «Esto preparamos para ti:», «Haz click aquí» con flecha ascendente; abajo, firma Efeonce AEO
y burbuja URL oficial. No sustituir logos por texto generado ni dibujar la burbuja a mano.
La firma utiliza el asset AXIS original, con hash documentado más adelante.

SSR entrega `dialog open` y `form method=dialog`: sin JS se puede abrir la experiencia. JS lo
convierte en modal real con autofocus, bloqueo de scroll y CTA de una sola ejecución. El cierre
recuerda entrada en sessionStorage por pathname; navegación interna, Back y deep-links no repiten
la invitación. Storage inaccesible no impide el cierre. Escape usa el mismo mecanismo de entrada.

Al pulsar, el telón se traslada desde0 hasta−100% en 1400 ms con
`cubic-bezier(.65,0,.35,1)`; el contenido asciende56px hasta su posición. La aceleración simétrica
hace perceptible el levantamiento. Después cierra el dialog, cancela animaciones, restaura scroll,
focaliza el H1 de La oportunidad y dispara `xray:curtain-opened`.

**Bug productivo resuelto:** el optimizador serializaba 1400 ms como1.4s; `parseFloat` sin considerar
unidad producía1.4ms y el telón desaparecía instantáneamente. SHA `be8d484` convierte explícitamente
segundos/milisegundos antes de llamar WAAPI. Verificar CSS compilado y movimiento real; el código
DEV por sí solo no detecta esta clase de fallo. Reduced motion cierra inmediatamente, manteniendo
el contenido y foco. Cambios a reduced motion o pestaña oculta finalizan limpiamente.

### 5.3 La oportunidad

El nombre anterior «El hueco» se reemplazó por «La oportunidad». La pantalla compuesta tiene
introducción, tesis, CTA y módulo de búsqueda/respuesta/fuente. La pregunta sale del fan-out y su
`coveredBy`; la respuesta sale del bloque real de la pieza; las fuentes vienen de sus sourceIds.
El módulo no fabrica una respuesta de Google AI Mode ni atribuye una cita inexistente a un motor:
el disclosure indica que es un recorrido ilustrativo del contenido de la muestra.

Secuencia: pregunta, respuesta a 850ms, fuente a 1800ms, completo a 2700 ms; repetición por botón.
IntersectionObserver inicia al entrar en viewport. Si el telón está abierto, espera su evento de
cierre. Al comenzar el telón prepara phasequery sin transición de ocultamiento: evita que se vea
una respuesta completa y luego desaparezca después de la apertura. Reduced motion/noJS muestran
contenido completo. Focus, salida de página y documento oculto terminan timers sin ocultar lectura.
Retorno desde la pieza conserva tarjeta visible y permite replay voluntario.

La evidencia observada está separada de la interpretación y la propuesta. La fecha de investigación,
mercado, idioma, limitaciones y notas de método quedan disponibles, no un «score AEO» inventado.

### 5.4 La pieza: landing completa

Es una landing con módulos y jerarquía del producto, no sólo un banner:

1. Header de marca, titular, contexto, fotografía oficial de referencia y CTA.
2. Introducción y cápsula de respuesta.
3. Beneficios en columnas con iconos funcionales.
4. Condiciones y comparación por moneda/tramo; selector progresivo, cards y tabla completa en details.
5. Explicación de saldo promedio y condición de aplicabilidad.
6. Requisitos/pasos de apertura y documentación.
7. Confianza/respaldo con fuentes y alcance prudente.
8. FAQ por disclosures nativos.
9. Documentos oficiales, enlace a guía relacionada y cierre de acción.

`landing-model.ts` agrupa por estructura: comparación sólo si la tabla lo permite; no impone soles/
dólares a un cliente nuevo. Módulos usan semántica de listas, tablas y headings. Sin JS se ve toda
la comparación. Reveal de módulos fuera de viewport es progresivo, nunca oculta el SSR por defecto.
Corrección preservada: `.landing .landing-photo` tiene especificidad suficiente para que `.blk`
no vuelva relativa la foto hero desktop. En móvil la imagen vuelve a flujo con composición propia.
No introducir cuenta corriente: el ejemplo es cuenta de ahorros.

### 5.5 La pieza: artículo completo

Título: «Antes de abrir una cuenta de ahorros online, haz estas preguntas». El contenido cubre
objetivo de uso, TREA, moneda, saldo promedio, costos, apertura, documentos y respaldo; incluye
TOC, respuestas directas, tabla, FAQ, cierre, CTA al producto y fuentes oficiales.

Los dos banners contextuales aparecen donde ayudan a decidir: comparar moneda/saldo/costos y
preparar documentación/canal oficial. Son composiciones gráficas con copy legible, no texto
inventado dentro de imagen generativa. Fuente de fotografía real: Anete Lusina/Pexels.
El ejemplo de saldo: 15 días con S/3.000 + 15 días con S/1.000 en 30 días da S/2.000: aritmética de promedio,
no cálculo de rentabilidad ni promesa de interés. Mantenimiento S/0 no implica que toda operación
sea gratis. Mantener estas distinciones en narrador, cápsulas, metadata y piezas sociales.

Iconografía en landing/artículo proviene de roles explícitos por id/anchor o estructura de bloque
(FAQ, tabla, lista, fuentes, enlaces); nunca de buscar palabras del copy o del nombre del cliente.
Los iconos son decorativos con texto visible, no sustituyen labels/encabezados. Roles específicos
como costos/protección se declaran editorialmente; una sección genérica no recibe un icono falso.

### 5.6 La radiografía y el valor SEO/AEO

El espécimen se conserva y se abre el instrumento: SEO/on-page, OG, árbol de headings, ALT,
JSON-LD exhibido, craft y evidencia. `data-couple` enlaza bloque y nodo. La fuente tiene tinte/barra,
el destino outline/pulso; scope page/site no se atribuye artificialmente al hero. Móvil usa hoja
inferior con cierre y focus return; noJS conserva contenido técnico estático.

ValueExplorer, plegado por defecto en lectura/radiografía, conecta pregunta → bloque de respuesta
→ decisiones/anotaciones → fuentes. Sirve para explicar por qué el trabajo existe y cómo se
comprobaría, sin obligar al cliente a leer código para comprender el valor.
`EvidenceNote` y el modelo aditivo muestran estado, alcance, fecha y sources de la prueba.

### 5.7 Dónde más vive

`SocialShowcase` presenta el artefacto primero, explicación después, con formatos navegables:
feed comparación, Story+video, feed saldo promedio y feed comisiones. Cada pieza tiene copy,
CTA, formato, propósito, bloque de origen y disclosure. Tres feeds1080×1350 y Story 1080×1920
son ejemplos producidos; no campañas publicadas. Artefactos comparten mensaje pero tienen
coupleId de origen propio para landing y artículo.

Tabs mejorados tienen teclado ArrowLeft/Right/Home/End, roving tabindex, aria-controls/selected,
fragmento compartible con replaceState que conserva el estado de historia Astro. Sin JS son
links a panels visibles. Ampliación usa dialog nativo; descargas usan reload/anchors explícitos.
Cambiar tab/panel o navegar pausa videos. Galería tiene contador y controles sólo si procede.

El video existe: MP4 H.264 720×1280,24fps,10 segundos,sin audio, poster y transcripción visual.
Toma ilustrativa generada con Gemini Omni 1.1; textos y marca compuestos por separado. No representa
una clienta real/testimonio. La reproducción se corrigió con CTA visible Play, `play()` desde
click directo del usuario, carga ante error, reset al finalizar y estado de error/descarga.
No afirmar autoplay ni depender de ese comportamiento; controles nativos siguen disponibles.

## 6. Inventario de medios y procedencia

El manifest registra once assets con dimensiones, ALT, sourceId, credit, approval y sha256.
`approval:approved` es el estado del paquete de muestra, no consentimiento del banco para pauta.

| ID | Dimensiones | Procedencia/rol |
|---|---|---|
| landing-banner |1280×536| Imagen oficial Banco Pichincha de referencia; persona real del banner facilitado |
| article-banner |1672×1116| Anete Lusina/Pexels, fotografía referencial de manos/teléfono/laptop |
| bank-logo |114×24| SVG original del sitio del banco; no una reconstrucción generativa |
| banner-compare |1440×640| Composición editorial Efeonce |
| banner-prepare |1440×640| Composición Efeonce + fotografía Pexels |
| social-compare |1080×1350| Feed1: moneda, saldo y costos |
| social-average |1080×1350| Feed2: promedio con barras proporcionales |
| social-costs |1080×1350| Feed3: mantenimiento vs operaciones |
| social-story |1080×1920| Story de ejemplo sin enlace de plataforma publicado |
| social-video |720×1280| Video producido con toma Gemini Omni 1.1 y composición aparte |
| social-video-poster |720×1280| Fotograma/composición del video |

Hashes de contenido viven en el manifest de producción, no se mantienen a mano en dos registros.
La firma del telón reutiliza `url-bubble-baked-dark.svg` oficial con SHA256
`cdc09b6b0250cffc442aec76e3415136396400baf433194e594e99496ab73c29`.
Fuentes de producción y provenance de generación están fuera del source repo; el payload conserva
créditos/disclosures. Generación inicial de personas ficticias fue rechazada por el operador; la
solución aprobada para imágenes estáticas usa fotografía real/oficial. Esa corrección no convierte
la toma generada del video en una persona real.

## 7. SEO/AEO: evidencia, ámbito y límites

Fuentes financieras: producto Pichincha, tarifario16/07/2026, cartilla enlazada desde el producto,
SBS y Fondo de Seguro de Depósitos, consultados30/09/2026. Tasas y cobertura no se congelan como
verdad perpetua: verificar vigencia y aplicabilidad antes de un nuevo envío o publicación.
No sustituir documento vigente por un PDF histórico mejor rankeado.

Observación DataForSEO: Perú2604/español, volumen estimado mensual sin segmento dispositivo;
«cuenta de ahorros»2.900 actualizado17/09; «abrir cuenta de ahorros»210(14/09);
«como abrir una cuenta de ahorros»90(15/09); «cuenta de ahorros online»30(12/09).
No sumar volúmenes ni convertirlos en tráfico/conversiones esperados. La documentación del proveedor
es método, no el snapshot concreto. Resultados/costo se conservan en expediente externo privado.

Por petición del usuario, DataForSEO desaparece de «Fuentes consultadas» editorial. No se borró su
provenance en annotations/research: es correcto separar fuentes que respaldan consejos financieros
de fuentes que informan la investigación de mercado. Esto no autoriza inventar una atribución distinta.

| Estado | Lectura correcta |
|---|---|
| proposed | Recomendación a implementar/validar en el destino del cliente |
| implemented | Existe en la muestra y puede inspeccionarse; no implica que existe en pichincha.pe |
| verified | Comprobación específica con fuente/fecha/ámbito |
| measured | Observación medida externa con método; no desempeño causado por Efeonce |

Scopeblock/page/site delimita el objeto al que corresponde la afirmación. Title, description,
canonical y robots de artefacto son propuestas para su destino; la página Think es noindex y su
canonical genérico es `/aeo-xray`. Datos estructurados bancarios se muestran como código inerte,
nunca `application/ld+json` activo en dominio Efeonce. FAQ útil no equivale a richresult garantizado;
el payload conserva la advertencia actualizada y el carácter opcional del marcado.

La demo de pregunta/respuesta no demuestra cita real en Google/ChatGPT. Tampoco prueba incremento
de visibilidad, apertura, CTR o rendimiento del banco. Medición futura requiere publicación real,
Search Console/analytics/eventos y acuerdos de medición: mantener separado propuesta, ejecución,
observación de SERP y resultado comercial.

## 8. Coreografía y comportamiento progresivo

Rutas por query necesitan `ClientRouter`: navegación entre steps comparte pathname; el script lee
destino real, identidad de artefacto y dirección. Legacy también comparte Experience sin romper sus
URLs. El shell/navegación conservan identidad; la tarjeta preview crece hacia el espécimen y la
pieza se transforma en espécimen bajo instrumento en el siguiente paso.

| Token/secuencia | Valor actual | Uso |
|---|---|---|
| `--xr-motion-morph` |620 ms| Morph estándar |
| `--xr-motion-open` |820 ms| La oportunidad→La pieza |
| `--xr-motion-return` |700 ms| Retorno a tarjeta |
| `--xr-motion-control` |300 ms| Selector de artefacto |
| `--xr-motion-curtain` |1400 ms| Telón de viewport |
| `--xr-motion-ease` |`.2,0,0,1`| Movimiento UI |
| `--xr-motion-curtain-ease` |`.65,0,.35,1`| Levantamiento perceptible |

Cambiar artifact cambia entidad: no morph de fotografías o landing/artículo sin relación. La
selección navega sin recargar documento y conserva paso, Back y Forward. Los grupos de snapshots
separan selector/textos para conservar legibilidad. En ausencia de API de transitions hay fallback
Astro; reduced motion elimina movimiento y mantiene correspondencia/lectura. Nada exige GSAP nuevo:
se usan View Transitions nativas y WAAPI para reveals/interacciones acotadas.

## 9. Verificación y artefactos de evidencia

Los counts son resultados del cierre de sus iteraciones, no una promesa de que todos esos scripts
se hayan reejecutado en este commit documental. La última corrección telón fue comprobada local y
producción; evidencia visual privada incluye frames y GIF, no se añade media volumétrica a Git.

| Gate | Evidencia/objetivo |
|---|---|
| `pnpm type-check`, `pnpm build` | Compilación y análisis Astro antes de publicar |
| `pnpm test:aeo-xray-v2` | Contratos/adapter y fallos cerrados;19 tests en iteración final previa |
| `pnpm verify:aeo-xray-v2` |198 checks:2 piezas×4 etapas,1440/390/320, privacidad/layout/coupling/noJS |
| `node scripts/verify-aeo-xray-motion.mjs` |49 checks local: movimiento real, geometría, historia, identidad, reduced/noJS |
| `node scripts/verify-aeo-xray-curtain.mjs` |44 checks local y producción: modal, viewport, movimiento gradual, foco, memoria, deep-links, reduced/noJS |
| `node scripts/verify-aeo-xray-media.mjs` | Assets, derivados, reproducción y estado de entrega; consultar JSON del run |
| `node scripts/verify-aeo-xray-value.mjs` | Explorador y trazabilidad; consultar JSON del run |
| `pnpm verify:aeo-xray` |46 checks legacy; regresión del producto original |
| `node scripts/qa/verify-aeo-xray-distribution.mjs` | Consistencia snapshot AXIS entre fuentes y consumidor |

Root reejecutó al documentar: foundation Greenhouse 22 PASS / 1 PostgreSQL opt-in SKIP, kit 1 PASS,
distribución byte-identical en 7 archivos; AXIS 34 PASS y export check de 8 archivos. Esta evidencia
es local; no acredita el entorno compartido ni publicación de paquetes.

Evidencia de trabajo: `.captures/aeo-xray-extension/`, `aeo-xray-motion/`, `aeo-xray-media/`,
`aeo-xray-value/`, `aeo-seo-audit/`, `aeo-opportunity/`, `aeo-xray-curtain/`, `aeo-xray-selector/`
en Think. Son carpetas ignoradas, pueden contener URLs privadas y no se copian completas al commit.
Capturas desktop/mobile revisadas por píxel son necesarias: verde estructural no aprueba tipografía,
crop, legibilidad o duración percibida. QA no certifica conformidadWCAG integral ni field CWV.

## 10. Continuidad, mantenimiento y rollback

Para otro cliente: nuevo intent validado, sources fechadas, marca/logos legítimos, piezas y medios
con referencias coherentes, cuatro fases completas, annotations con scope/status, lectura editorial
de todas las capas y QA. Reusar kit y componentes; no buscar/reemplazar «Pichincha» dentro del motor.
Acordar carril de distribución antes de producir: sample para material no confidencial independiente;
grant cuando el dominio y canary real estén habilitados. No volver a bloquear un envío comercial
por un release general que el operador no autorizó.

Para corregir sample publicado: editar payload/media con ownership, revisar manifest/hash y gates,
commit/push Think, esperar deployment READY, comprobar SHA exacto/alias y abrir enlace real. No tocar
Greenhouse ni promover cambios ajenos. Para retirar, eliminar registry entry y medios y leer404 en
alias después del redeploy; borrado local/commit no son retiro efectivo.

Pendiente aparte: rollout gobernado de provider, migración, storage/actor/flags/canary y compatibilidad
media completa para grants. Registro de tareas conserva esos pendientes; el cierre comercial de
Pichincha no equivale a completar foundation compartida. Ver [handoff](aeo-xray-release-handoff.md)
y [auditoría](aeo-xray-completion-audit-2026-09-30.md).

## Verificación posterior al commit y distribución generada

El hook `lint-staged` reformateó el snapshot generado de AXIS en el primer commit de cierre; el gate posterior detectó drift de hashes en `aeo-xray-experience.js`. Se restauraron los ocho archivos desde el exportador AXIS y se excluyó únicamente `src/lib/axis/aeo-xray/**` de ESLint. El código fuente continúa lintado en AXIS; el snapshot se valida con `node scripts/qa/verify-aeo-xray-distribution.mjs`, no se edita ni formatea manualmente. Las 22 pruebas de foundation y el test del kit pasaron tras el hook; la restauración debe comprobarse otra vez después del commit correctivo.
