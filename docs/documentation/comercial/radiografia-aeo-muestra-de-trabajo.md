# Radiografía AEO — Muestra de Trabajo, Educación y Habilitación de Ventas

> **Naming vigente:** la Radiografía AEO conserva su nombre como muestra de trabajo; se relaciona con **Efeonce AEO** y puede seguir al **Efeonce AEO Assessment** / **Efeonce AI Visibility Report**. `AI Visibility Grader` queda como alias técnico/histórico del motor que genera evidencia. [ADR](../../architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md).

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 2.0
> **Creado:** 2026-07-14 por Claude (TASK-1410)
> **Última actualización:** 2026-09-30
> **Documentación técnica:** [Radiografía AEO — Arquitectura](../../think/radiografia-aeo-architecture.md)
> **Manual técnico:** [Radiografía AEO — Manual](../../think/radiografia-aeo-manual.md)
> **Manual comercial:** [Usar la Radiografía AEO en venta y educación](../../manual-de-uso/comercial/usar-radiografia-aeo-en-venta.md)
> **Runtime:** repo `efeonce-think` (**NO** `greenhouse-eo`) → `think.efeoncepro.com`: legacy `/muestras/<slug>-<token>`; compuesto `/aeo-xray/r/<clave>`

---

## Experiencia compuesta publicada — Banco Pichincha Perú, 30/09/2026

La extensión conserva el renderer y las capacidades del X-Ray original. La muestra Pichincha
ya está publicada en Think y lista para acompañar el correo previo a una reunión agendada.
Incluye una landing de Cuenta de Ahorros Preferente y un artículo sobre apertura de cuenta
online; ambos comparten el recorrido y se alternan sin perder el paso actual.

La experiencia suma entrada con telón y marcas oficiales, selector segmentado con iconos,
módulos completos, respuestas con fuentes, exploración de valor SEO/AEO, dos banners dentro
del artículo, tres feeds, una Story y un video vertical reproducible. No reemplaza la radiografía
ni los derivados por una página aislada: cada adaptación permite volver a su contenido de origen.

El enlace `sample_*` se sirve desde Think sin consultas a Greenhouse. Es público no listado,
con noindex, sin analytics y retiro por redeploy; **no tiene autenticación ni revocación central**.
El contrato `xrg_*` para edición inmutable, medios privados, TTL y revocación permanece como
integración pendiente de release/migración/canary. No depender de ese release para enviar
esta demo ni presentar como operativo un control aún no validado en producción.

El enlace concreto del cliente reside en el expediente privado y registro runtime; no se publica
en este documento. [Manual](../../think/radiografia-aeo-manual.md) · [Otro cliente](../../think/aeo-xray-nuevo-cliente.md).

## Qué es

Una **pieza web de cuatro pantallas** que le entregamos a un cliente o a un prospecto **por enlace**, y que hace algo que un PDF **no puede hacer**: escribe un artículo real para ese cliente y después **lo abre en canal** para mostrar la capa técnica que lo vuelve citable por los motores de respuesta con IA.

El contenido se desarrolla completo para poder evaluarlo. La investigación y los medios conservan su procedencia: fotografía licenciada o composición/generación autorizada y declarada según el caso. La propuesta no equivale a contenido publicado en el sitio del cliente ni a resultados alcanzados.

## Los DOS trabajos que hace

La pieza nació como muestra de una licitación, pero **no es un anexo de un bid**. Es una **capacidad reutilizable** con dos trabajos distintos, y conviene tenerlos separados porque cambian cómo se usa.

### 1. Educación (cliente y potencial cliente)

**El problema real del mercado hoy:** casi nadie —ni del lado del cliente— entiende qué significa "aparecer en ChatGPT". Se confunde con SEO, o se cree que es magia, o se piensa que basta con escribir más.

La Radiografía **enseña la diferencia sin una sola diapositiva de teoría**: el evaluador *ve* que el schema solo puede marcar contenido **visible**, *ve* que la cápsula de respuesta es un texto concreto y no un truco, y *ve* que cada elemento técnico apunta a un número de su diagnóstico.

> **Es formación disfrazada de demostración.** El cliente sale entendiendo el problema — y entendiendo por qué su equipo actual no lo está resolviendo.

Se puede usar **sin que haya una venta en curso**: con un cliente vigente que quiere entender qué le estamos haciendo, o con un prospecto al que hay que educar antes de que pueda comprar.

### 2. Habilitación de ventas (sales enablement)

**El problema de la venta:** en una licitación o un pitch de contenidos **todas las ofertas dicen lo mismo** ("optimizamos para SEO y AEO"). Las promesas viven como texto en un PDF, idénticas a las del competidor. Nadie **muestra**.

La Radiografía cierra esa distancia. Le da al equipo comercial:

- un **enlace** que se manda antes, durante o después de la reunión;
- una **lámina** para el deck (la 12 del deck de SKY: *"No le describimos el artículo que escribiríamos. **Lo escribimos.**"*);
- algo que **presentar en vivo** —se navega, se toca, responde—;
- y una prueba que el comité **puede verificar por su cuenta** (las fuentes están enlazadas, las licencias son comprobables).

> **El competidor no es la otra agencia: es la indecisión.** La pieza existe para que el comité tenga algo concreto que defender internamente.

## Cómo encaja en el motion SEO/AEO

La Radiografía no es el primer paso ni el último. Es el puente entre medición y compra:

| Etapa | Activo | Trabajo |
|---|---|---|
| 1 | **AI Visibility Grader** | Mide cómo la marca aparece, quién la cita y qué huecos existen |
| 2 | **Radiografía AEO** | Demuestra cómo se transforma un hueco en contenido visible, estructurado y citable |
| 3 | **Propuesta / deck / RFP** | Convierte la demostración en alcance, equipo, precio y plan |
| 4 | **Servicio SEO/AEO** | Opera el sistema: research, contenido, técnica, entidad, distribución y medición |

La frase operativa es simple: **el Grader mide el problema; la Radiografía muestra el método**. Si se salta el Grader, la muestra puede verse bonita pero pierde su raíz de evidencia. Si se salta la Radiografía, el diagnóstico puede quedarse como un score más, fácil de comparar con una herramienta barata.

## Playbook comercial mínimo

### Antes de la reunión

- Define el hueco que la muestra prueba: keyword, sub-pregunta, SERP, cita faltante, competidor que ocupa el espacio o gap de contenido.
- Decide si la pieza se enviará antes, durante o después. Si el comprador no entiende AEO, úsala durante la reunión. Si el comité necesita revisarla solo, envíala después.
- Ten claro el siguiente paso: diagnóstico completo, sample sprint, propuesta, QBR o retainer.

### Durante la reunión

1. **La oportunidad:** explicar qué consulta o necesidad sustenta el ángulo, qué observamos y qué falta verificar; no afirmar ausencia competitiva sin evidencia.
2. **La pieza:** recorrer la landing o el artículo completos y conectar claridad del contenido con la decisión del lector.
3. **La radiografía:** "cada dato de máquina corresponde a contenido visible".
4. **Dónde más vive:** "el artículo es una fuente; no una pieza aislada".

No expliques la interfaz como si el cliente no pudiera verla. Narra el mecanismo y deja que la pieza trabaje.

### Después de la reunión

- Envía el enlace con una lectura breve, no con una defensa larga.
- Si hay Proposal Studio o licitación, regístrala como evidencia `client_facing` cuando el enlace pueda viajar al comité.
- Si viene de un informe del Grader, conecta explícitamente ambos activos: diagnóstico → demostración → alcance.

El runbook completo para venta y educación vive en [el manual comercial](../../manual-de-uso/comercial/usar-radiografia-aeo-en-venta.md).

## Las cuatro pantallas

| # | Pantalla | Qué hace |
|---|---|---|
| ① | **La oportunidad** | Ángulo y evidencia fechada; recorrido ilustrativo pregunta→respuesta→fuente. Distingue observación de investigación y simulación; no representa una respuesta real de Google/LLM |
| ② | **La pieza** | Landing o artículo completos, sin aparato de auditoría sobre la lectura. Beneficios, condiciones, comparación, proceso, FAQ, banners, fuentes y CTA según artefacto |
| ③ | **La radiografía** | Tocas un párrafo y ves **qué produce** en la capa de máquina. En móvil primero se ve el artículo; la máquina aparece como hoja inferior al tocar |
| ④ | **Dónde más vive** | El video, la pieza social y el set de imágenes que nacen del mismo artículo. La pantalla muestra primero los artefactos derivados en su hábitat, con iconografía funcional de canal y línea de sangre desde el artículo |

Cada etapa admite **enlace directo**: legacy usa rutas; la edición compuesta usa `artifact` y `step`. Los enlaces profundos conservan destino y saltan la bienvenida. Una pestaña nueva en La oportunidad permite ver el telón: logo cliente, invitación, botón, marca Efeonce AEO y burbuja URL; sube durante 1,4 segundos, o continúa de inmediato con movimiento reducido/sin JS.

## Cuándo alcanzarla (y cuándo no)

**Sí:**

- Licitación o RFP de contenidos / SEO / AEO.
- Pitch a un prospecto que **no entiende** por qué su blog no aparece en las respuestas con IA.
- Cliente vigente al que hay que **explicarle** el valor de lo que ya está pagando (retención).
- Reunión donde alguien va a preguntar *"¿y esto cómo se ve?"*.

**No:**

- Como lead magnet. **No captura, no pide email, no tiene formulario** — y no debe tenerlo.
- Sin una oportunidad sustentada. Research puede venir de herramientas SEO, fuentes oficiales y/o diagnóstico de visibilidad; no exigir un Grader si no hay diagnóstico emitido. Lo pendiente se identifica como hipótesis y nunca como score o cita observados.
- Para un competidor directo de un cliente vigente, sin pensarlo dos veces (ver "lo que no hay que hacer").

## Qué demuestra y qué NO demuestra

| Sí demuestra | No demuestra |
|---|---|
| Que Efeonce puede elegir un hueco real y convertirlo en una pieza útil | Que una marca va a rankear o ser citada en una fecha específica |
| Que la capa técnica sale de contenido visible, no de magia | Que basta con agregar schema para ganar AEO |
| Que el artículo puede producir video, social, imágenes y enlaces internos | Que la atomización sea infinita o gratis |
| Que el trabajo es verificable por el comité | Que el cliente ya tiene resuelto su sistema completo de autoridad, entidad y distribución |

Este límite importa comercialmente: en SEO/AEO, prometer menos y demostrar más vende mejor que inflar el alcance.

## Lo que la hace creíble (y frágil)

La pieza **entera** se apoya en una sola cosa: **no exagera**. Por eso, tres reglas que parecen menores y no lo son:

1. **Cada cifra lleva su fuente y su fecha.** Sin eso, un número es una opinión con dígitos.
2. **La muestra dice también lo que le FALTA.** Si el cliente no tiene un autor con credencial, la pieza lo declara en vez de inventarlo. Decir lo que falta **suma**; simularlo **la destruye**.
3. **Nunca se reclama una táctica que no se aplicó.** Un evaluador técnico que nos pille exagerando destruye, en un minuto, la credibilidad que la pieza vino a construir.

> El valor entero de la Radiografía es **el rigor**. Es lo único que la competencia no puede copiar pegando un logo.

## Quién la opera

| Rol | Qué hace |
|---|---|
| **Comercial** | Manda el enlace, presenta en vivo, toma la lámina para el deck |
| **Growth / AEO** | Elige el hueco (con dato, no con intuición) y escribe el artículo |
| **Operador (humano)** | **Elige el ángulo.** El agente no elige el artículo — es un gate humano |

## Un cliente nuevo NO requiere código

El motor es genérico: **el cliente es un payload** (un archivo JSON), no código. Crear la muestra del siguiente cliente es escribir ese payload. Los pasos están en el [manual](../../think/radiografia-aeo-manual.md).

La muestra SKY y la composición Pichincha están publicadas; además existe un kit neutral y fixtures de segundo dominio para probar reutilización. El próximo cliente requiere investigación, marca, derechos, validación de contenido y QA propios. El kit no automatiza esas decisiones ni transforma aprobación de un caso en aprobación de otro.

## Lo que NO hay que hacer

- **Nunca** prometer "la cajita de FAQ en Google" — Google la restringió en 2023 a gobierno y salud.
- **Nunca** inventar datos para tapar un hueco del cliente.
- **Nunca** tratar un enlace no listado como autenticación. Elegir `sample_*` sólo para entregas cuya distribución pública esté autorizada; usar el carril privado cuando sea operativo para confidencialidad, TTL y revocación.
- **Nunca** dejar que la pieza hable de **nuestros** documentos ("nuestra oferta dice…") ni que le narre la interfaz al lector. La muestra **se defiende sola**.

> **Detalle técnico:** los invariantes vigentes, el gate de 46 asserts y las razones de cada decisión están en la [arquitectura](../../think/radiografia-aeo-architecture.md). Cómo se crea la muestra de un cliente nuevo, paso a paso, en el [manual](../../think/radiografia-aeo-manual.md). El caso vivo (SKY, licitación Wherex 2026 — adjudicada a Efeonce el 2026-09-23; la Radiografía con artículo real figura entre la evidencia verificable que explica el cierre) en [`TASK-1410`](../../tasks/complete/TASK-1410-aeo-article-xray.md).


## Qué puede evaluar el cliente en la extensión

| Capa | Trabajo visible | Límite que debe acompañarlo |
|---|---|---|
| Contenido | Respuestas directas, desarrollo útil, TOC, tablas, FAQ y condiciones | Demostración propuesta, revisión del banco pendiente para implementación |
| Conversión | Jerarquía de landing y CTA a canal oficial | No hay apertura, formulario ni captura bancaria en Think |
| SEO técnico/on-page | Meta, encabezados, enlaces, ALT, canonical y marcado propuesto | No son cambios aplicados a pichincha.pe ni auditoría completa de infraestructura |
| AEO | Pregunta relacionada con respuesta, bloque y fuente, estructura autocontenida | Simulación pedagógica; no ranking, frecuencia de prompts ni cita garantizada |
| Distribución | Gráficas/feed/Story/video con linaje y detalle de producción | Ejemplos de producción, no campaña ya publicada ni alcance medido |
| Medición futura | Estados y evidencias por bloque/página/sitio; qué se verificaría después | Propuesto/implementado/verificado/medido no son equivalentes |

DataForSEO aparece como procedencia de investigación, no en «Fuentes consultadas» del
artículo/landing. Las fuentes del producto respaldan moneda, tasas, saldos y condiciones.
Una cifra se interpreta con fecha y unidad; no extrapolar volumen a aperturas ni rendimientos.

El footer reúne atribución de Efeonce, legal y enlaces. La lectura de la pieza mantiene voz
cliente; la atribución de demostración está en el marco de Efeonce. Marca, iconografía y motion
ayudan a orientarse y a entender el vínculo entre contenido/técnica; no son evidencia de éxito SEO.

## Roles y responsabilidades para repetición

Comercial define el uso y próximo paso y comparte sólo enlaces autorizados; el operador
aprueba ángulo/medio/gasto/publicación cuando corresponda; SEO/AEO conserva fuente y
contexto; diseño revisa marcas y píxeles; implementación extiende renderer genérico; QA
verifica rutas, acoplamiento, reproducción, accesibilidad y build; release publica Think con
SHA/deployment/readback. La integración Greenhouse tiene aceptación independiente.

Preparación → composición → revisión de contenido y medios → QA → publicación autorizada
→ lectura live → envío autorizado. No mover el deal ni enviar correo por haber desplegado.
El cierre comercial puede registrar la demo como material de presentación, sin inventar
entrega, implementación en el banco, acuerdos de alcance ni resultados de negocio.
