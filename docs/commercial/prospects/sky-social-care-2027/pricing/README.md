# SKY · social care 2027 — costeo con el Cotizador V3

Simulación local del 10/10/2026. No es una cotización emitida ni un precio aprobado.

Versiones usadas: `data/pricing/v3-operating/catalog.review-v3.json`, `resources.review-v3.json` y
`data/pricing/v3-resources/ai-credits.review-v1.json`. Oferta `creative-managed-service` (margen objetivo y mínimo
45 %). Dólar a 1.000, el registrado en el catálogo.

| Escenario | Supuestos | Dedicación de especialistas | Costo mensual | Precio al piso de 45 % |
| --- | --- | --- | --- | --- |
| `base` | 1.300 conversaciones, 3 min de persona por conversación, horario hábil | Titular 100 % + respaldo 15 % | CLP 3.355.452 | CLP 6.100.819 |
| `extendida` | 1.300 conversaciones, 5 min, tardes y fines de semana (165 h de presencia) | Titular 100 % + respaldo 95 % | CLP 4.730.922 | CLP 8.601.674 |

Las dos incluyen la bandeja de comentarios (USD 299, precio reportado) y el consumo de agentes (USD 100, hipótesis).

## Con Sprout Social (política `resources.review-v4.json`)

El operador confirmó el 10/10/2026 que la bandeja es Sprout Social, plan Advanced: USD 399 por asiento al mes con
facturación anual (precio público). Tres asientos nominativos: titular, respaldo y líder. Costo: CLP 1.197.000 al mes.

| Escenario | Costo mensual | Bandeja dentro del fee (45 %) | Fee sin bandeja + bandeja al costo | Sólo fee, SKY aporta los asientos |
| --- | --- | --- | --- | --- |
| `base-sprout` | CLP 4.253.452 | CLP 7.733.546 | CLP 6.754.185 | CLP 5.557.185 |
| `extendida-sprout` | CLP 5.628.922 | CLP 10.234.400 | CLP 9.255.040 | CLP 8.058.040 |

Archivos: `*-sprout.demand.json` → `*-sprout.artifact.json`. El fee sin bandeja es el costo sin la licencia dividido
por 0,55; no tiene artefacto propio.

Por escenario: `*.workload.json` (volumen y horas declaradas) → `*.brief.json` → `*.dimensioned.brief.json` →
`*.demand.json` → `*.artifact.json` (congelado y reproducible) → `*.assessment.json` y `*.preview.md`.

Para reproducir, seguir «Cotizar un servicio gestionado por volumen» en
`docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md`.

Lo que sigue siendo estimación: costos de las personas (históricos, sin localizar), provisiones de reemplazos y
guardia, consumo de agentes, bandeja sin contratar, y los 3 minutos por conversación del escenario base. La puesta en
marcha no está en este costeo.

## Una persona dedicada y un asiento (decisión del operador, 10/10/2026)

Titular 100 % + líder 10 % + cuenta 5 % + agentes 10 % + analista 5 %; sin respaldo. Un asiento de Sprout. Para que
quepa en una persona, las horas fijas bajan de 70 a 60: 65 h de conversaciones + 60 h = 125 h, el 100 % de su
capacidad productiva, sin holgura.

| Escenario | Política | Costo mensual | Todo dentro del fee (45 %) | Fee sin bandeja | Fee + bandeja al costo |
| --- | --- | --- | --- | --- | --- |
| `una-persona` (Advanced, USD 399) | v4 | CLP 3.093.290 | CLP 5.624.163 | CLP 4.898.709 | CLP 5.297.709 |
| `una-persona-professional` (USD 299) | v5 | CLP 2.993.290 | CLP 5.442.345 | CLP 4.898.709 | CLP 5.197.709 |

## Tercer servicio de SKY (propuesta de precio, 10/10/2026)

`tercer-servicio.demand.json` → `tercer-servicio.artifact.json` (política v5). Titular 100 % + líder 20 % como respaldo
formal + agentes 10 % + analista 5 %. Sin línea de cuenta: la relación con SKY ya la llevan los otros dos servicios
(supuesto del operador por confirmar). Un asiento de Sprout Advanced.

| Concepto | Costo mensual | Precio al piso de 45 % |
| --- | --- | --- |
| Servicio sin bandeja | CLP 2.731.080 | CLP 4.965.600 |
| Con Sprout dentro del fee | CLP 3.130.080 | CLP 5.691.054 |

Precio recomendado, sin aprobar: fee de CLP 4.990.000 al mes más IVA (margen 45,3 %) y el asiento de Sprout aparte, al
costo o comprado por SKY. Puesta en marcha y refuerzo de campañas no están en este costeo.

## Estructura final conversada (10/10/2026)

`final.demand.json` → `final.artifact.json` (política v5). Titular 100 % + líder 20 % (respaldo) + especialista que
mantiene los agentes 10 %. Sin analista (Efeonce Insights se calcula de los datos) ni línea de cuenta. Un asiento de
Sprout Advanced al inicio; el operador planea reemplazarlo por una bandeja propia. Puesta en marcha obsequiada.

Costo mensual CLP 2.981.079 (CLP 2.582.079 sin Sprout). Precio todo incluido: CLP 5.420.145 con 45 % sobre todo;
CLP 5.093.689 con Sprout al costo dentro del fee. Candidatos sin aprobar: CLP 5.100.000 (45,1 % sobre el servicio,
41,5 % sobre el total) y CLP 4.990.000 (43,8 % y 40,3 %; 48,3 % el día que no haya Sprout, antes del costo de la
bandeja propia).

## Precio acordado y adicionales (10/10/2026)

Base confirmada por el operador: **CLP 4.990.000 más IVA al mes**, todo incluido (un asiento de Sprout dentro), sobre
`final.artifact.json`. Puesta en marcha obsequiada.

Adicionales opcionales, cotizados como incremento sobre la base (sin aprobar):

| Adicional | Archivo | Qué agrega | Costo incremental | Precio (asiento al costo) |
| --- | --- | --- | --- | --- |
| Cobertura extendida | `adicional-extendida.*` | Segunda persona al 95 % + segundo asiento | CLP 1.814.721 al mes | CLP 2.973.038 → 2.990.000 al mes |
| Refuerzo de campaña | `adicional-campana.*` | Una persona más al 25 % de un mes (una semana completa) + asiento | CLP 806.161 por evento | CLP 1.139.293 con asiento anual; ≈ 1.250.000 si el asiento se paga por un mes suelto |

### Cobertura extendida con agentes autónomos (decisión del operador, 10/10/2026)

Reemplaza al adicional con una segunda persona. `adicional-agentes-autonomos.*`: sobre la base, el especialista que
mantiene los agentes pasa de 10 % a 20 %, el líder de 20 % a 25 % (revisión diaria de lo respondido fuera de horario)
y el consumo de agentes se duplica (USD 200). Las tres cifras son supuestos sin medir; la construcción de la
publicación automática no está en el costo.

Costo incremental CLP 401.122 al mes; precio al piso de 45 %: CLP 729.313. Precio recomendado, sin aprobar:
CLP 1.290.000 al mes (base + adicional quedan en 46,1 % sobre el total).

## Verificación del 10/10/2026

- Los artefactos `final`, `adicional-agentes-autonomos` y `adicional-campana` se reproducen con `pricing:v3 replay`
  (`verified: true`).
- API de Sprout (documentación oficial, leída el 10/10/2026): lee mensajes de la bandeja, casos y analítica, con marcas
  de tiempo de las acciones (responder, etiquetar, completar). No documenta ningún endpoint para responder comentarios
  o mensajes; publicación sólo crea borradores programados. Límite: 60 solicitudes por minuto y 250.000 al mes. El
  sentimiento no viene en el endpoint de mensajes. La nota de producto del 14/04/2026 («Additional API Support») no se
  pudo abrir.
- Consecuencia: los agentes autónomos no pueden publicar a través de Sprout; necesitan conexión directa a cada red.
- Asientos: quitar a una persona libera el asiento para invitar a otra (soporte oficial de Sprout). Con un solo
  asiento, ese usuario es además el dueño de la cuenta; cubrir una ausencia implica transferir la propiedad o editar
  el usuario. Sin validar con Sprout.
- Precio con facturación mensual (USD 499): sólo en guías de terceros; no confirmado en la página oficial.
- Sin verificar: las 125 horas efectivas por persona, los 3 minutos por conversación, el sueldo de mercado del perfil y
  las cargas del empleador según la forma de contratación.

### Exceso sobre 1.300 conversaciones (10/10/2026)

`adicional-exceso.*`: 10 puntos más del líder cubren 12,5 horas, unas 250 conversaciones a 3 minutos. Costo
incremental CLP 196.120; precio al piso CLP 356.582, o CLP 1.426 por conversación. En el deck: CLP 290.000 por bloque de
200 conversaciones. Referencia de campañas en el deck: tres semanas al año (CLP 3.750.000); es un supuesto, el
calendario lo define SKY. Total de 12 meses del servicio base: CLP 59.880.000 más IVA.

## Tarifa promedio para el caso de negocio (10/10/2026)

Fuente: base «Precios y Rutas» de la página «Precios y Rutas SKY» en Notion (armada para el piloto; última edición
23/05/2026). Rutas activas con origen en el mercado Chile, precio «desde» en CLP por tramo:

| Grupo | Rutas | Promedio | Mediana |
| --- | --- | --- | --- |
| Todas | 55 | CLP 80.012 | CLP 52.890 |
| Nacionales | 42 | CLP 49.609 | — |
| Internacionales | 13 | CLP 178.236 | — |

Uso en el deck: reserva de ida y vuelta = 2 × 80.012 = CLP 160.024; el fee de CLP 4.990.000 se cubre con 32 reservas
(51 si todas fueran nacionales, a CLP 99.218). Límites: promedio simple sin ponderar por demanda; «desde» es la tarifa
mínima publicada, no la pagada; que el precio sea por tramo se infiere de que cada sentido tiene su fila; los otros
mercados están en otras monedas y no entran.

El operador indicó el 10/10/2026 que los precios de esa base vienen de planillas que entregó SKY y que entiende que son por tramo (no confirmado con SKY).

## Refuerzo de campaña dentro del fee (decisión del operador, 10/10/2026)

El refuerzo de campaña deja de ser un opcional: va incluido en los CLP 4.990.000, hasta cinco semanas al año (Travel
Sale y Cyber SKY dos veces, Black Friday). La lámina de campañas pasa a la versión para enviar. Efecto en el costo,
sobre `adicional-campana.*`: CLP 407.161 por semana de la persona de refuerzo, unos CLP 169.650 al mes.

| Situación | Costo mensual | Margen sobre CLP 4.990.000 |
| --- | --- | --- |
| Con Sprout y un segundo asiento en los meses de campaña (USD 499, sin confirmar) | CLP 3.358.646 | 32,7 % |
| Con Sprout, sin segundo asiento | CLP 3.150.729 | 36,9 % |
| Con consola propia, sin Sprout (antes del costo de operarla) | CLP 2.751.729 | 44,9 % |

## Cotización de 12 meses y corrección del margen con campañas (11/10/2026)

La sesión del cotizador V3 emitió la cotización del precio acordado: `cotizacion-12-meses.*` y la nota
`COTIZACION-12-MESES-2026-10-11.md`; el documento para el cliente está en `../cotizacion/v1/cotizacion.pdf`.
12 meses × CLP 4.990.000 = CLP 59.880.000 neto; IVA CLP 11.377.200; total CLP 71.257.200.

Corrige la tabla de «Refuerzo de campaña dentro del fee» de más arriba. El cotizador exige un asiento nominativo de
Sprout para la persona de refuerzo y no puede expresar «un asiento anual más uno mensual sólo en campaña», que era el
supuesto de mis 32,7 % (y los 36,9 % asumían que el refuerzo no necesitaba asiento). Lo que el cotizador respalda:

| Lectura | Margen sobre CLP 4.990.000 |
| --- | --- |
| Dos asientos anuales todo el año | 28,4 % |
| Cuenta con facturación mensual (USD 499, sin confirmar) y segundo asiento en cinco meses | 30,7 % |
| Sin refuerzo de campaña | 40,3 % |

### Decisión posterior del mismo día (11/10/2026): un solo asiento, facturación mensual

El operador decidió en la sesión del cotizador que Sprout va con facturación mensual y un único asiento, compartido
entre la persona dedicada y la de refuerzo. Margen: 34,9 % (costo promedio CLP 3.247.719 al mes); con el mismo asiento
en plan anual sería 36,9 %. Respaldo vigente: `cotizacion-12-meses-asiento-compartido.*` y `../cotizacion/v2/cotizacion.pdf`.
La tabla anterior (28,4 % y 30,7 %) queda como historia. Sin validar: el precio mensual de USD 499 y que Sprout permita
compartir un asiento nominativo; con un solo asiento, la persona dedicada y la de refuerzo no pueden trabajar la bandeja
al mismo tiempo.
