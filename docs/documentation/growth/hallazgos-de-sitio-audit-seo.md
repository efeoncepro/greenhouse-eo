> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-09-01 por Claude (TASK-1670)
> **Ultima actualizacion:** 2026-09-01 por Claude (TASK-1670)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §10.6 (Delta 2026-09-01)

# Hallazgos de sitio en la Auditoría SEO (Growth)

## Que es

La [Auditoría del sitio](modulo-seo-search-visibility-360.md) revisa **páginas**: entra a cada URL que
alcanza y anota qué encuentra mal en ella (un título duplicado, una imagen sin texto alternativo, un
enlace roto). Eso deja fuera una familia entera de problemas que no viven en ninguna página, sino en el
**dominio completo**: quién tiene permiso para entrar al sitio, si el sitio se presenta ante los motores,
y si existe el índice con el que se lo descubre.

Los **hallazgos de sitio** son esa segunda familia. Son cuatro revisiones nuevas sobre el dominio —acceso
de los rastreadores de IA, acceso en el borde del servidor, datos estructurados en la portada y salud del
mapa del sitio— que se materializan junto al resto de los hallazgos de la auditoría, pero declarando que
su alcance es el sitio y no una página.

Existen por una razón concreta: un sitio puede cerrarle la puerta a los rastreadores que citan contenido
en ChatGPT, Perplexity o Claude —y quedar así fuera de todas las respuestas de IA— mientras la auditoría
lo declara **sano con 95 de 100**. Es el punto ciego más caro del módulo, porque Search Visibility 360 se
vende como SEO **y** AEO, y hasta acá sólo miraba la mitad.

> Detalle técnico: §10.6 (Delta 2026-09-01) en
> [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md).

---

## 🔴 Estado real: la capacidad está APAGADA

**Al 2026-09-01 esto es `code complete, rollout pendiente`.** El motor que hace las revisiones está
construido, verificado contra sitios reales y publicado en `develop`, pero el interruptor
(`GROWTH_SEO_SITE_FINDINGS_ENABLED`) **nace apagado** y no se prende todavía.

**Mientras siga apagado, nada de lo que este documento describe le llega a un usuario del portal.** Un
sitio que bloquea a los rastreadores de IA **sigue** puntuando 95 de 100 en la pantalla de Auditoría y
sigue presentándose como sano. El punto ciego lo cierra el encendido verificado en producción, no el
hecho de que el código exista.

**Por qué está apagado** — no es cautela genérica, es una incompatibilidad concreta con la pantalla
actual: la Auditoría cuenta "páginas afectadas" y **ordena la lista por ese número**. Un hallazgo del
dominio se rotularía "1 página afectada" —lo cual es falso, afecta al sitio entero— y quedaría hundido
debajo de 400 imágenes sin texto alternativo. Prenderlo antes de tener una pantalla que sepa leer el
alcance correcto convertiría el hallazgo más caro del informe en el menos visible.

**Qué falta para prenderlo:** que se despliegue la superficie que sabe renderizar hallazgos de dominio
(**TASK-1671**). Recién ahí se enciende el interruptor, se corre una auditoría real y se contrasta contra
el `robots.txt` verdadero del cliente.

> Detalle técnico: fila de `GROWTH_SEO_SITE_FINDINGS_ENABLED` en
> [FEATURE_FLAG_STATE_LEDGER.md](../../operations/FEATURE_FLAG_STATE_LEDGER.md), con la secuencia exacta
> del encendido. El interruptor vive **sólo en el ops-worker** (es el único que ejecuta las revisiones);
> en el portal es inerte.

---

## Los siete hallazgos, y qué significa cada uno

| Hallazgo | Gravedad | Qué dice |
|---|---|---|
| **Los motores de IA no pueden leer el sitio** | Crítico | El `robots.txt` le niega el paso a los rastreadores que **citan** páginas en las respuestas de ChatGPT, Perplexity y Claude. Sin ese acceso el sitio no puede aparecer en esas respuestas. |
| **Entrenamiento de modelos de IA bloqueado** | Aviso menor | El sitio le niega el paso a los rastreadores que recolectan contenido para **entrenar** modelos. Es una decisión sobre el uso del contenido, no una falla. |
| **El servidor rechaza a los rastreadores** | Crítico | El `robots.txt` permite el paso, pero el servidor o el CDN devuelve un rechazo cuando quien pide la página es un rastreador. Se corrige en el CDN o el firewall, no en un archivo de texto. |
| **Sin datos estructurados en la portada** | Atención | La portada no publica el marcado que le dice a buscadores y motores de IA quién es la marca y a qué se dedica. |
| **Sin mapa del sitio** | Aviso menor | No hay mapa del sitio en la ruta habitual ni declarado en `robots.txt`. Los buscadores descubren las páginas sólo siguiendo enlaces. |
| **El mapa del sitio declarado no responde** | Atención | El `robots.txt` anuncia un mapa del sitio que no se puede leer. Los buscadores lo buscan justo ahí y no encuentran nada. |
| **Chequeo de sitio sin verificar** | Aviso menor | No se pudo completar una de las revisiones. **No significa que esté bien ni que esté mal**: quedó sin medir, y el detalle explica por qué. |

---

## Las tres familias de rastreadores, y por qué no comparten gravedad

Esta es la distinción que sostiene todo el resto. Los rastreadores de IA no hacen todos lo mismo, y
tratarlos como un solo grupo produce un informe que miente.

### Familia que te cita (*retrieval*) — bloquearla es **crítico**

`OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Claude-SearchBot`, `ChatGPT-User`.

Son los que entran al sitio **para responderle a alguien que está preguntando ahora**. Si están
bloqueados, la marca no puede aparecer citada en esa respuesta: no es que aparezca peor, es que no
aparece. Por eso es el hallazgo más grave del informe.

`ChatGPT-User` está en esta familia con su razón escrita: bloquearlo no protege un corpus, le niega el
contenido a un usuario que lo pidió explícitamente.

### Familia que entrena (*training*) — bloquearla es una **postura legítima**, jamás un error

`GPTBot`, `Google-Extended`, `CCBot`, `anthropic-ai`, `Applebot-Extended`.

Son los que recolectan contenido para entrenar modelos. **Muchas marcas los bloquean a propósito, y hacen
bien**: es una decisión sobre los derechos de su propio contenido, no un descuido técnico. Bloquearlos no
afecta que el sitio aparezca en las respuestas de IA.

Por eso este hallazgo se informa como **aviso menor con lectura de postura, y nunca en rojo**. La regla
es load-bearing y no cosmética: pintar de crítico una decisión deliberada del cliente le enseña a
desconfiar de la severidad más alta del informe, y a partir de ahí el hallazgo que sí importa deja de
leerse.

### Familia ambigua — se registra, pero nunca genera hallazgo propio

`Bytespider`, `Amazonbot`.

No hay una lectura limpia de qué hacen. Aparecen como **evidencia en el detalle** del hallazgo para que
quien lo revise los vea, pero el sistema **no fabrica un hallazgo por ellos** ni les pone gravedad. Decir
menos es preferible a decir algo que no se puede sostener frente al cliente.

> Detalle técnico: `src/lib/growth/seo/site-audit/site-findings.ts` (mapa de familias y severidades),
> `src/lib/copy/growth.ts` (los textos en español de cada hallazgo).

---

## El bloqueo más común no está en `robots.txt`, está en el borde

Lo primero que uno esperaría es que un sitio que rechaza rastreadores lo haga en su `robots.txt`. En la
práctica es al revés.

**Medido:** en una muestra de 12 dominios de LatAm y Chile, **2 de cada 3 casos con problema** tenían el
`robots.txt` impecable —permitía el paso sin restricción— y aun así el servidor devolvía un rechazo
(401, 403 o 429) cuando quien pedía la página era un rastreador. El bloqueo lo aplica el CDN o el
firewall, no el archivo de texto.

Por eso esto tiene un hallazgo **propio y separado** (*El servidor rechaza a los rastreadores*) en vez de
mezclarse con el anterior: **la remediación es otra**. Editar el `robots.txt` no arregla nada; hay que
tocar la configuración del CDN o del WAF.

**Cómo se comprueba, y su límite declarado.** La revisión compara cómo responde el sitio a nuestro
rastreador identificado contra cómo responde a una variante de **nuestro propio identificador**. Nunca se
suplanta a un bot de terceros: hacerse pasar por `GPTBot` es evasión verificable —los firewalls la validan
por DNS inverso— y el costo reputacional lo pagaría el dominio que estamos auditando. La consecuencia
honesta es que el chequeo prueba que **el borde filtra rastreadores identificados**, no *cuál* bot ajeno
en particular está bloqueado; eso exige leer las reglas del firewall junto con el cliente.

> Detalle técnico: punto 3 del Delta 2026-09-01 (TASK-1670) en
> [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md).

---

## El mapa del sitio: lo que el `robots.txt` declara manda

Hay dos formas de que un sitio publique su mapa: en la ruta convencional (`/sitemap.xml`) o
**declarándolo en el `robots.txt`**. La segunda gana.

**3 de esos mismos 12 dominios devuelven 404 en la ruta convencional y están perfectamente bien**: tienen
su índice declarado en `robots.txt`, en otra ruta, y funcionando. Marcarlos con un aviso sería ruido puro,
y el ruido en un diagnóstico que se le muestra a un cliente cuesta credibilidad.

De ahí los dos hallazgos separados:

- **No hay mapa por ningún lado** → aviso menor. Es una carencia real, pero de impacto acotado.
- **El propio sitio declara un mapa y ese mapa está roto** → atención. Es peor: los buscadores lo buscan
  exactamente ahí, siguiendo la instrucción del sitio, y no encuentran nada.

---

## "Sin verificar" no es ni sano ni roto

Cuando una revisión no se puede completar —el sitio no responde, se agota el tiempo, o el propio
`robots.txt` nos prohíbe la ruta que necesitábamos leer— el resultado **no se omite**.

Omitir un chequeo fallido sería la peor opción disponible: quien lee el informe vería cuatro revisiones
donde no aparece ningún problema y concluiría que el sitio está bien. La ausencia se lee como buena
noticia. Por eso el hueco se declara explícitamente, con el nombre de la revisión que quedó pendiente y
**la razón por la que quedó pendiente**.

Un caso real encontrado probando el motor contra `reuters.com`: su `robots.txt` nos prohíbe la ruta del
mapa del sitio que él mismo declara. La primera versión lo reportaba como "el mapa declarado no responde"
—o sea, le inventaba un defecto a partir de un archivo que nunca llegamos a mirar. Eso es exactamente el
modo de falla que esta capacidad combate, con el signo cambiado: en vez de declarar sano lo que está roto,
declarar roto lo que no se midió.

---

## Alcance: por qué "1 página afectada" sería falso

Cada hallazgo de la auditoría ahora declara si su alcance es una **página** o el **sitio**. No es una
sutileza de catálogo: es lo que impide que un bloqueo de rastreadores de IA se cuente como si afectara a
una sola URL.

Un hallazgo de sitio **nunca** se cuenta como página afectada. Y como la pantalla actual todavía ordena la
lista por ese número, esa es precisamente la razón por la que la capacidad está apagada hasta que exista
la superficie que sabe leer el alcance (ver el estado, arriba).

El alcance viaja en el contrato canónico de la auditoría, así que le llega por construcción a todos los
consumidores —la pantalla, el asistente Nexa y el carril programático— sin que ninguno tenga que
interpretarlo por su cuenta.

---

## Qué NO revisa, y por qué

| Fuera de alcance | Razón |
|---|---|
| Velocidad medida en laboratorio (*Core Web Vitals*) | Es una medición de banco de pruebas, igual que los checks de velocidad que el proveedor ya entrega. La señal de campo del módulo —la que Google efectivamente usa— viene de Search Console. |
| `llms.txt` | Retorno marginal: Google no lo usa. |
| Ausencia de datos estructurados en páginas internas | Hoy sólo se revisa la portada. |
| Cuál bot de terceros bloquea exactamente el firewall | Requiere leer las reglas del WAF junto con el cliente (ver el límite declarado del chequeo de borde). |

---

## Relación con el resto del módulo

- La **[Auditoría del sitio](modulo-seo-search-visibility-360.md)** es donde estos hallazgos aparecen: se
  suman a los del crawl de páginas, en la misma lista y con la misma escala de gravedad.
- El **[AI Visibility Grader](ai-visibility-grader.md)** mide el otro lado del mismo problema: el grader
  pregunta si la marca **aparece** en las respuestas de IA; estos hallazgos explican si el sitio siquiera
  **deja entrar** a quien podría citarla. Un grader en cero con los rastreadores bloqueados no es un
  problema de contenido, es una puerta cerrada.
- Aunque las revisiones nacieron de verificaciones ya probadas del motor AEO, **el juicio vive en el
  módulo SEO** y no reutiliza el vocabulario del grader. La separación es deliberada: compartirlo haría
  que recalibrar la auditoría SEO invalidara informes AEO ya entregados a clientes.

> Detalle técnico: puntos 1, 6 y 7 del Delta 2026-09-01 (TASK-1670) en
> [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md).
> Código: `src/lib/growth/seo/site-audit/site-findings.ts` (evaluadores),
> `src/lib/growth/site-substrate/` (fetcher y parseo compartidos),
> `src/lib/copy/growth.ts` (textos en español).
