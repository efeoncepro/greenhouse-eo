# AEO X-Ray — composición, evidencia y experiencia reutilizable

Actualizado: 2026-09-30. Cargar únicamente cuando se cree, extienda, revise o entregue un X-Ray.
Esta referencia fija criterios del oficio y de ejecución aprendidos en el caso de Banco Pichincha;
no sustituye arquitectura, contracts, manuales ni el estado del runtime.

## 1. Fuentes canónicas y límites del producto

Leer antes de modificar:

- `docs/think/radiografia-aeo-architecture.md`: arquitectura y boundaries del renderer.
- `docs/architecture/EFEONCE_AEO_XRAY_COMPOSITION_AND_SHARING_DECISION_V1.md`: composición y acceso.
- `docs/think/radiografia-aeo-manual.md`: autoría, edición y acceso.
- `docs/think/aeo-xray-nuevo-cliente.md`: expediente neutral y CLI local.
- `docs/think/aeo-xray-release-handoff.md`: estado verificable de cada carril.
- `docs/documentation/comercial/radiografia-aeo-muestra-de-trabajo.md`: encuadre de venta.
- `docs/manual-de-uso/comercial/usar-radiografia-aeo-en-venta.md`: conversación comercial.

| Superficie | Qué muestra | Qué no se debe inferir |
|---|---|---|
| Efeonce AEO Assessment | Diagnóstico de visibilidad según su motor y fuentes | Una muestra editorial no es una medición del Assessment |
| Efeonce AI Visibility Report | Informe compartible del diagnóstico | X-Ray no reemplaza sus scores, umbrales o metodología |
| AEO X-Ray / Radiografía AEO | Una propuesta de contenido y el criterio editorial/técnico que la sostiene | No certifica implementación en el sitio cliente ni futuras citas/rankings |
| Efeonce Insights | Reporte periódico, evidencia y decisiones del servicio | `/insights/muestra` utiliza datos de ejemplo; no son resultados de Pichincha |

**Extender el Experience original.** Mantener las cuatro etapas, los derivados, el inspector,
el acoplamiento por bloque y el motion existente. No crear una microsite alternativa que borre
capacidades para entregar una landing nueva. Reusar adaptadores y añadir campos de presentación
a los contratos tipados; preservar la colección legacy y su regresión.

El runtime vive en el repo hermano `efeonce-think` (Astro y Vercel propios). La documentación,
kit y gobierno viven en `greenhouse-eo`. No imponer un release de Greenhouse para distribuir
una muestra que el carril independiente de Think ya soporta. Preparación, commit, push,
deployment, alias productivo y verificación son estados separados.

## 2. Modelo de composición y acceso: dos significados de tokens

1. **Tokens de diseño/composición:** marca, tipografías, color, layout, slots, IDs de bloques,
anotaciones, SEO, fuentes, assets y conexiones entre piezas. Partir de un intent neutral y
resolverlo mediante AXIS; no editar a mano un manifest congelado ni inyectar CSS desde el payload.
2. **Enlace por cliente:** identifica la muestra/edición compartida; no es un token de diseño.
No registrar el valor completo de un grant, secreto o enlace sensible en Git, logs o evidencias.
Usar placeholders en documentación y expedientes protegidos para los valores operativos.

El runtime acepta el envelope `modelVersion: '1.0'`, manifest
`schema: 'axis.aeo-xray-composition.v1'` y `status: 'resolved'`. `acceptSharedXray`
re-resuelve el intent para comprobar tokens y `adapterChecks`, valida header y falla cerrado
ante versiones no soportadas o drift. No actualiza silenciosamente una edición congelada.
`RenderSample` extiende de forma aditiva el modelo legacy; `adaptExperience` conserva el
renderer original mientras aporta landing, artículo y anotaciones de composición.

**Separar los tres carriles actuales:**

- Fixtures DEV (`fixture-client`, etc.): sólo preview local, nunca enlace para enviar.
- Edición con grant gobernado: reader, estado, expiración/revocación, assets privados y flags
  dependen de sus contratos y runtime Greenhouse. No afirmar rollout por existencia de código.
- Muestra publicada `sample_…`: registry incluido en Think, sin llamada ni grant Greenhouse.
  Es un enlace de distribución no listado, no acceso autenticado. Retirarlo requiere quitar
  registry/medios y desplegar Think. El `expiresAt` de compatibilidad no demuestra expiración
  de un grant. No presentarlo como privado por tener una URL difícil de adivinar.

## 3. Los cuatro momentos deben explicar valor verificable

| Paso visible | Objetivo | Evidencia/relación requerida |
|---|---|---|
| **La oportunidad** | Ubicar una pregunta de descubrimiento, comparación o decisión | Investigación fechada, lente de datos y vínculo a la pieza propuesta |
| **La pieza** | Resolver esa pregunta con una landing o artículo completos | Contenido visible, condiciones, módulos útiles, fuentes y siguiente paso coherente |
| **La radiografía** | Abrir las decisiones editoriales y técnicas | Bloque seleccionado → anotación → representación técnica → verificación prevista/real |
| **Dónde más vive** | Mostrar distribución y coherencia | Cada derivado vuelve al bloque que lo originó, con medio producido o estado explícito |

`El hueco` queda como alias histórico/técnico; la interfaz utiliza **La oportunidad**.
Selector Landing / Artículo mantiene el paso elegido, `aria-current`, iconos, foco y navegación
real con links. No confundir un cambio de pieza con un avance de etapa.

En **La oportunidad**, el recorrido **pregunta → respuesta → fuente** es una demostración
ilustrativa si no proviene de una captura verificable de un buscador. Mostrarlo junto a su
aclaración visible. No hacer pasar una animación de AI Mode por ranking, cita o respuesta real
de Google, ChatGPT u otro motor. Una cita real requiere consulta exacta, mercado/idioma,
fecha, motor y evidencia reproducible. No prometer causalidad por usar una tabla, FAQ o schema.

## 4. Contenido completo y YMYL

### Landing

No entregar sólo hero/banner. Construir módulos que apoyen la decisión: propuesta principal,
beneficios concretos, condiciones relevantes, explicación del proceso/requisitos, comparación
cuando corresponda, FAQ y CTA contextual hacia el canal oficial. Ordenarlos según el caso y
la referencia real, no como una plantilla bancaria universal. Evitar repetición de CTAs sin
información nueva y reservar la prominencia para la decisión que cada módulo facilita.

### Artículo

Respuesta inicial útil, byline/revisión cuando exista, fecha, TOC, desarrollo escaneable,
encabezados semánticos, listas o tablas justificadas, preguntas frecuentes y fuentes editoriales.
Los banners contextuales deben aportar al bloque donde aparecen: comparación, preparación o
siguiente paso. No incluir dos interrupciones genéricas para cumplir una cantidad. Iconografía
reutilizable ayuda a ubicar conceptos, sin sustituir textos, ALT ni jerarquía de encabezados.

### Evidencia financiera

Confirmar producto real y nombre oficial antes de escribir. No inventar cuentas corrientes,
productos, tasas, requisitos o aprobaciones por analogía con otro banco. TREA/tasa, moneda,
saldo/tramo, costos y fecha deben conservar juntos su contexto. Revisar fuente oficial y
fuente regulatoria pertinente. Las personas de fotografías de ejemplo no son clientes,
testimonios ni empleados por aparecer en la pieza. La demo requiere revisión del banco para
implementarse; explicar el límite sin convertir cada bloque en un disclaimer comercial.

### Fuentes públicas versus investigación

Las **fuentes consultadas del artículo** respaldan sus afirmaciones visibles (sitio oficial,
regulador, documentación aplicable). **DataForSEO** es insumo de investigación para oportunidad,
volumen, SERP o visibilidad; no trasladarlo a fuentes editoriales como respaldo de condiciones
financieras. Quitar su nombre de esa lista no autoriza borrar provenance del expediente ni
presentar una estimación como medición. Guardar mercado, idioma, dispositivo, fecha, consulta,
lente y costo; usar `pnpm dataforseo` y su skill, con autorización de gasto aplicable al caso.

## 5. Radiografía: pregunta → respuesta → fuente → verificación

Cada anotación conserva ID del bloque/coupleId y declara alcance **block / page / site** y
estado **proposed / implemented / verified / measured**. Un ALT renderizado no demuestra CWV
mejorados; un schema propuesto no prueba indexación, rich result ni citación.

- **Proposed:** especificación para implementar en el canal cliente.
- **Implemented:** comportamiento presente en la muestra o canal identificado, sin extrapolar.
- **Verified:** comprobación concreta con fecha, método y evidencia del objeto identificado.
- **Measured:** observación de resultado/serie con fuente y período; no una expectativa.

Mantener congruencia de `experience.machine` con título, descripción, canonical propuesta,
encabezados, ALT y schemas del contenido visible. AXIS rechaza drift; no crear una segunda
verdad en el inspector. El foco/inspector debe devolver al bloque real, y el link de origen de
cada pieza social vuelve al contenido correspondiente. Separar validación semántica/estructural,
implementación en demo y resultados posteriores a publicación.

**La muestra no compite en indexación con el cliente.** La ruta SSR usa `private, no-store`,
`X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer` y `nosniff`. El JSON-LD mostrado
como ejemplo permanece inerte, no emitido como `application/ld+json` activo en la muestra.
Validar que no se filtren notas CRM, códigos de internos, precios, prompts de producción,
credenciales o contratos privados al payload público. No tratar `noindex` como autenticación.

## 6. Experiencia y motion: conservar intención y verificar tiempo real

Reusar tokens motion y **native View Transitions**. Compartir geometría sólo entre la misma
entidad (preview de una pieza → su pieza completa). Al cambiar Landing/Artículo son entidades
diferentes: mantener shell/rail estable y usar transición de contenido sin un morph falso.
Probar ida y regreso, posición/foco y reduced-motion; no sustituirlo con un fade genérico.

El indicador del selector segmentado tiene snapshot propio. Sus labels/iconos necesitan una
capa de snapshots por encima: un `z-index` del DOM no garantiza el orden en el top layer de
View Transitions. Inspeccionar frames intermedios; la foto final no detecta la desaparición del
texto durante el movimiento.

### Telón de entrada

Pantalla azul con logo cliente, invitación, botón **Haz click aquí**, firma oficial Efeonce | AEO
y burbuja URL. Native `dialog`, formulario `method=dialog` como salida sin JS y apertura modal
cuando hay JS. La bienvenida sólo corresponde al ingreso al primer paso; no a cada navegación,
Back, cambio de artifact o deep link. `sessionStorage` recuerda la entrada por ruta/caso y sesión;
si storage está bloqueado, permitir salir igualmente. No convertir esta preferencia en acceso.

Al entrar, subir el telón `translateY(-100%)` y acompasar la entrada del contenido. El token
actual es **1400ms**, con arco deliberado `cubic-bezier(0.65, 0, 0.35, 1)`. La oportunidad se
prepara durante `xray:curtain-opening` y comienza su secuencia tras `xray:curtain-opened`.
**Bug aprendido:** el optimizador de producción serializa `1400ms` como `1.4s`; WAAPI exige
milisegundos. `parseFloat` a secas produce 1.4ms. Leer la unidad CSS y convertir `s × 1000`,
conservar `ms`, y comprobar duración y geometría en el build/deployment de producción.
Una captura estática y el CSS fuente no prueban que el telón haya subido durante 1,4 segundos.

Doble click no dispara dos aperturas. Escape permite salir; al terminar, devolver foco al título
con `preventScroll`. Reduced-motion resuelve inmediato, cambio de preferencia/visibilidad puede
finalizar, navegación cancela/limpia listeners. El telón no bloquea impresión ni lectura sin JS.

## 7. Marca, medios y distribución

Logo cliente verificado; lockup **Efeonce | AEO** oficial de AXIS, no reconstrucción tipográfica.
Consultar `efeonce-graphic-line`/`axis-design-system`; burbuja URL sólo acompañada de logo,
según contrato de firma, nunca marca inventada o asset generado. El disclaimer de demostración
vive en el cierre/footer de la experiencia. Mantener personalización y legibilidad en móvil.

Fotografías: revisar píxeles, textura de piel, manos, luz, encuadre y contexto; el prompt por sí
solo no certifica realismo ni aprobación. Respetar reference, licencias, consentimiento y
procedencia. Los masters y expedientes de producción son privados/fuera de source cuando
corresponda; los exports aprobados para entregar al cliente pueden estar en el carril publicado
que su arquitectura autorice. No confundir un directorio `public/` con almacenamiento privado.

Social: diseñar formatos nativos (feed, Story, video), no recortar una única composición. Render,
ampliación, descarga y regreso al origen deben funcionar en desktop/móvil y con teclado.
Un script/storyboard es una propuesta, no un video producido. Rotular el estado correspondiente.

Video de entrega web: codificar export compatible **H.264**, pixel format web-compatible,
MP4 con **faststart**, poster y proporción declarada; controles accesibles, sin autoplay/loop
forzado, pausa al cambiar de formato. Comprobar respuesta HTTP y decodificación, pero también
playback real: que `currentTime` avance, que `paused` cambie y que reanudar funcione después de
seleccionar el formato. Éxito del generador, archivo existente o metadata cargada no certifican
reproducción. Seguir skill/CLI de video disponible; no regenerar para reparar sólo un codec.

## 8. Otro cliente: procedimiento y gates proporcionales

1. Inicializar expediente nuevo con `scripts/aeo-xray/client-kit.mjs init`, fuera del repositorio,
   desde Greenhouse. Nunca clonar Pichincha y reemplazar strings como método de authoring.
2. Completar BRIEF, intent y assets neutrales: mercado/idioma, objetivo, producto, ángulo autorizado,
   marca, fuentes, landing/artículo, anotaciones, derivados y procedencia de medios.
3. `validate` y `build`: draft permite pendientes para preview; publicación exige resolverlos.
   La compilación local no emite grant ni autoriza release. Leer los flags y códigos en el manual.
4. Preview Think con `XRAY_CASE_DIR` y fixture-client DEV. Mapear IDs lógicos a assets del expediente,
   rutas dentro de su carpeta, SHA y dimensiones reales. No sobrescribir el servidor de otro agente.
5. Render QA de ambas piezas/cuatro pasos a desktop, móvil y compact; contenido completo, no
   overflow, contraste, teclado, TOC/FAQ/CTA, fuentes, inspector/origen, reduced-motion/sin JS.
   Comprobar ausencia de nombres, datos, productos y aprobaciones del caso anterior.
6. Compartir por carril autorizado. Un sample Think publicado no habilita APIs/grants Greenhouse;
   una edición gobernada exige migraciones, flags, identidad, assets y readback del reader.
7. Registrar evidencia concreta, commit propio y estado del deployment. No desplegar Greenhouse
   si el operador sólo autorizó Think. Probar el alias final, no sólo la URL local/de Preview.

Gates disponibles en Think (consultar scripts actuales antes de invocarlos):

- `pnpm type-check`, `pnpm build`: compatibilidad y build del renderer.
- `pnpm test:aeo-xray-v2`: acceptance, drift, adaptación y contratos de composición.
- `pnpm verify:aeo-xray`, `pnpm verify:aeo-xray:scenarios`: legado y escenarios.
- `pnpm verify:aeo-xray-v2`: pasos/artifacts, responsive, privacidad y experiencia.
- `node scripts/verify-aeo-xray-motion.mjs`: shared geometry, artifact isolation, reduced motion.
- `node scripts/verify-aeo-xray-curtain.mjs`: entrada/sesión/deep links, modal/foco, noJS, storage.
- `node scripts/verify-aeo-xray-value.mjs`: cadena de evidencia y estados SEO/AEO.
- `node scripts/verify-aeo-xray-media.mjs`: banners, sociales, teclado, origen y reproducción real.
- `node scripts/qa/verify-aeo-xray-distribution.mjs`: distribución, según contrato del script.

No afirmar gates pasados por enumerarlos. Las suites actuales verifican el caso/fixture que
usan: no validan contenido editorial, derechos o claims del siguiente cliente. Para cambios
pequeños ejecutar checks pertinentes; un cambio de unidades motion exige build/live frame QA.
Greenhouse: tests del client-kit y `pnpm skills:mirrors` protegen el kit y bundles espejo.

## 9. Handoff y correo previo a reunión

Conservar expediente de investigación, referencia visual, manifest validado, asset manifest,
procedencia, QA, commit, deployment/alias y limitaciones. Nunca llevar tokens sensibles al repo.
Brochure, X-Ray e Insights son tres links/artefactos con funciones diferentes. Explicar que el
X-Ray se preparó para el cliente, qué puede explorar y qué se implementaría sólo tras revisión.
Identificar Insights muestra como datos de ejemplo. Reunión ya agendada no requiere otra agenda.
Enviar correo, mover CRM o publicar requiere la autorización aplicable a esas acciones; preparar
la muestra no la concede. El CRM debe verificarse en HubSpot, no inferirse del correo redactado.
