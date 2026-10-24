# Pricing V3 — catálogo, resolución y mantenimiento local

- Status: Accepted para prototipo local; aprobado por operador 2026-10-09.
- Owner: Finance/Commercial (valores y precio), Operations (kits/capacidad), Platform (contrato).
- Work unit: TASK-2019.
- Predecessor: GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md permanece vigente para kernel/V2.

## Decision

Catálogo versionado de registros tipados, separado de demanda. Resolver por fecha de cotización, país, perfil/variante y policy explícita. No insertar presupuestos de un expediente como tarifa general. JSON local es source of truth de este prototipo, no del catálogo runtime Greenhouse.

Brief → selección/bindings → snapshots por período → kernel V3 existente → quote congelada con explicación. Calendario puede variar actividad/dedicación por mes; es economía de capacidad, no contrato comercial de programa/hitos. Quote usa catálogo válido en quoteDate y fija esos términos para su horizonte; cambios posteriores sólo afectan nuevas cotizaciones o una revisión explícita.

Recursos declaran monto/moneda/unidad/scope, kits declaran cantidad/asignación. Seats no se prorratean por FTE automáticamente. Recursos de cuenta/equipo compartidos sólo por regla explícita y suman una unidad sin duplicación. Recursos provistos por cliente requieren exclusión justificada. No mezclar salarios con fee/software. Faltantes/ambigüedad detienen el cálculo completo; modo simulación permite históricos explícitos, jamás los convierte en actuales.

## Maintenance

Cambios add/replace/retire con fecha efectiva, fuente, responsable, motivo y versión nueva. Preview lista diferencias y recalcula briefs opcionales; apply verifica digest de preview y padre, genera archivo nuevo sin sobrescritura. Intervalos de vigencia no se solapan para una misma clave de resolución. Futuras alzas no se aplican antes de fecha. Retiro no borra historia. Fecha/fuente de un incremento reemplazan datos anteriores, no heredan confirmación automáticamente. Quote y replay conservan catálogo/inputs/resultados congelados.

No automatizar búsqueda de precios/salarios ni promover estados sin revisión. Revisión propuesta trimestral y por evento (factura/licencia, salario, FX/política); dueño Finance/Operations. El contrato no crea un cron ni autorización comercial/contable/laboral.

## Alternatives / boundaries

Rechazado: pricing en agente/CLI, seguir leyendo Excel en runtime, mutar catálogo in-place, reutilizar presupuestos de expediente como catálogo. Elegido: primitive reusable + filesystem adapter. Sin nuevos servicios/dependencias/DB/API/MCP; futuros consumers usan el mismo dominio. Export público continúa su gate, no se exponen costos internos por inferencia.

## Verification / revisit

Resolución ambigua/faltante, seats no lineales, compartidos sin doble cobro, calendarios, cambios efectivos, conflicto base y replay previo tras actualización. Reabrir para promoción runtime, permisos/persistencia, tarifas comerciales y facturación gestionada.

## Mantenimiento completo del flujo local

TASK-2022 extiende el mismo principio al resto del contexto de cálculo. El catálogo monetario mantiene sus
change-sets `add/replace/retire`. Policy de composición y catálogo de créditos usan reemplazo íntegro con
versión sucesora mediante `resources preview|apply`: `baseDigest` del objeto cambiado, digests del contexto
monetario/policy/créditos y resultados before/after de demandas declaradas quedan en el preview confirmado.
Cambiar cualquier contexto o demanda invalida esa confirmación. Apply exige ruta nueva y no activa el sucesor;
la próxima cotización lo selecciona expresamente. Guardas rechazan referencias inconsistentes y cambios de
precio/pack que intenten conservar indebidamente evidencia confirmada de la fuente anterior.

La actualización técnica no aprueba tarifa, gasto o alza contractual. Conservar evidencia, dueño, motivo,
ventana y versiones en cada familia; no reescribir artifacts o baseline. El
[ADR operativo](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md) y el
[manual](../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) gobiernan el recorrido completo.

## Delta 2026-10-11 — puntero a las versiones vigentes

**Contexto.** Cada versión del catálogo monetario, de la policy de recursos y del catálogo de créditos es un archivo
inmutable, porque las cotizaciones congeladas dependen de las anteriores. `apply` escribe el sucesor y no lo activa
(«la próxima cotización lo selecciona expresamente»). Seleccionarlo significaba escribir a mano
`catalog.review-vN.json` y `resources.review-vN.json` en cada comando, manual y skill. Entre el 2026-10-09 y el
2026-10-11 se emitieron cinco versiones del catálogo operativo y cinco de la policy (v2 a v6); cada emisión dejaba
comandos documentados apuntando a la versión anterior, que seguían cotizando sin error con valores viejos.

**Decisión.** «Vigente» no puede ser un nombre de archivo. Es un único documento mutable junto a las versiones:
`data/pricing/v3-operating/current.json` (`pricing-v3-current/1`). Nombra el catálogo, la policy y el catálogo de
créditos vigentes, cada uno por ruta relativa a la raíz del repositorio, versión y digest, más `updatedAt` y `reason`.
El código vive en `adapters/current-versions.ts` (funciones puras) y la lectura y escritura en la CLI.

- **Usarlo.** `--current` es un interruptor sin valor. Completa cada una de `--catalog`, `--policy` y `--credits`
  que no pasaste, en toda operación que recibe esas fuentes. Antes de usar una fuente, la CLI recalcula su versión y
  su digest con el mismo parser del comando y exige que coincidan con el puntero; si no, rechaza con
  `CURRENT_VERSIONS_MISMATCH` (exit 1) y no usa nada. Un flag explícito gana y no pasa por el puntero. En
  `resources budget`, `--current` completa `--catalog` con el catálogo de créditos.
- **Sin `--current` nada cambió.** Sin `--catalog` se lee la baseline histórica `v3-catalog/catalog.review-v1.json`,
  y `--policy` y `--credits` siguen siendo obligatorios. El puntero es opt-in, no un default silencioso.
- **Verlo.** `pnpm --silent pricing:v3 current show` imprime el puntero, su `pointerDigest`, el `status` de cada
  fuente (`match | version_mismatch | digest_mismatch | invalid | unreadable`) y `consistent`. Exit 0 si coincide
  todo; exit 2 si no. Informa versiones y digests, nunca contenido. `--input otro.json` revisa un puntero que no es
  el versionado.
- **Moverlo.**
  `pnpm --silent pricing:v3 current set --catalog A --policy B --credits C --reason "…" --confirm <pointerDigest>`.
  Las tres fuentes y el motivo son obligatorios, y las fuentes deben estar dentro del repositorio. El puntero se
  construye desde los tres documentos: versión y digest se calculan, no se escriben. `--confirm` es el
  `pointerDigest` del puntero que se reemplaza, tomado de `current show`: si falta, `MISSING_ARGUMENT`; si no
  coincide, `CURRENT_VERSIONS_CONFLICT`. `--out otro.json` escribe en otra ruta para revisión; si esa ruta todavía no
  existe no hay nada que confirmar, y ofrecer `--confirm` también es `CURRENT_VERSIONS_CONFLICT`.
- **Mantenimiento.** `apply` sigue sin activar nada. Después de que `catalog apply` o `resources apply` emite una
  versión, se mueve el puntero con `current set`, con su motivo. Una prueba
  (`pricing-v3-current-versions.test.ts`) exige que el puntero nombre la versión de número más alto presente en
  cada familia: `catalog.review-vN.json` y `resources.review-vN.json` en `data/pricing/v3-operating/`, y
  `ai-credits.review-vN.json` en `data/pricing/v3-resources/`. Una versión emitida ahí sin mover el puntero deja
  `pnpm pricing:v3:test` en rojo, y la falla trae el comando que lo corrige.
- **Versiones anteriores.** No se borran ni se editan: son los padres de los artefactos congelados que se
  calcularon con ellas y la base (`baseDigest`) de cada change-set posterior.

**Alternativas descartadas.**

- *Un symlink o una copia `latest`.* No lleva versión ni digest, así que no puede verificarse contra el archivo que
  dice nombrar: un archivo editado en su lugar o un enlace movido pasan inadvertidos. Tampoco deja motivo ni fecha.
- *Una convención de nombre («el número más alto es el vigente»).* Resuelve listando un directorio, no detecta un
  archivo editado en su lugar y convierte «emitir» en «activar» sin motivo registrado. La convención sobrevive sólo
  como guarda: la prueba exige que puntero y número más alto coincidan, pero lo que se usa es el puntero verificado.
- *Cambiar el default de la CLI a la versión más nueva.* Cambiaría en silencio lo que calcula un comando ya escrito;
  sin `--catalog` la CLI sigue leyendo la baseline histórica, como antes.
- *Seguir nombrando la versión en manuales y skills.* Es lo que había, con el resultado descrito en el contexto.

**Reglas duras.**

- **NUNCA** nombrar a mano `catalog.review-vN.json` o `resources.review-vN.json` para cotizar con lo vigente: se usa
  `--current`. El flag explícito queda para reproducir o comparar con una versión determinada.
- **NUNCA** editar `current.json` a mano: se reemplaza con `current set`.
- **NUNCA** emitir una versión en `v3-operating/` o `v3-resources/` sin mover el puntero en el mismo cambio. Un
  sucesor que todavía no debe ser el vigente se escribe con `--out` en otra carpeta.
- **NUNCA** borrar ni editar una versión anterior.
- **NUNCA** seguir un puntero inconsistente ni «corregirlo» retocando un digest: `current show` dice qué fuente no
  coincide y se corrige esa causa.
- **SIEMPRE** correr `current show` antes de `current set` y pasar su `pointerDigest` en `--confirm`.
- **SIEMPRE** escribir en `--reason` por qué cambian las versiones vigentes.

**Límites.** Nombrar una versión como vigente no valida sus costos ni aprueba un precio. El puntero es local a este
repositorio: no es un registro del runtime de Greenhouse ni un default del cotizador canónico. La revisión periódica
que esta decisión proponía por calendario tiene desde hoy una fecha por precio de herramienta (`reviewBy`):
[modelo de revisión de precios](GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--un-precio-unitario-no-vence-vigencia-dura-y-fecha-de-revisión).

*Nota 2026-10-11 (tarde):* «cinco versiones del catálogo operativo y cinco de la policy (v2 a v6)» es el conteo de
esa mañana. El mismo día se emitieron más; cuáles rigen lo imprime `current show`.

## Delta 2026-10-11 — provisiones de puesta en marcha costeadas (catálogo v9)

**Contexto.** El workbook de pricing cobra la puesta en marcha con una regla: «recruiting & onboarding fee = un mes
del costo del recurso». En el catálogo V3 el requisito `setup` de los kits de staffing apuntaba a `trial-setup`, un
placeholder de USD 100 marcado «test only», una vez por cuenta. Ninguno de los dos es un costo: la regla del
workbook es un precio de protección, y el placeholder nunca se midió.

**Decisión.** La regla del workbook **no** entra al cotizador. La puesta en marcha se costea con dos provisiones del
catálogo, las dos `estimated`, propuestas por el agente y aceptadas por el operador (CEO) el 2026-10-11:

| Registro | Importe | Unidad y alcance | Cuándo entra |
| --- | --- | --- | --- |
| `provision-account-onboarding` | USD 200 | una vez, por persona que entra a una cuenta | Por defecto: es el requisito `setup` de los siete kits de staffing |
| `provision-recruiting` | USD 500 | una vez, por persona | Opcional: sólo cuando hay que contratar a una persona nueva para ese cliente |

- **Base de las cifras.** La incorporación (accesos, brief e inmersión de marca) es el importe redondo aceptado
  sobre unos dos días del líder, tomados del costo de catálogo de ese perfil; el reclutamiento, sobre cerca de una
  semana de trabajo de selección. Son estimaciones, no mediciones: se medirán en las próximas dos incorporaciones
  reales y entonces se reemplazan.
- **Cómo se pide el reclutamiento.** Por línea, en el brief:
  `"choices": [{ "requirementId": "recruiting", "resourceId": "provision-recruiting" }]`. Nunca entra por defecto.
- **Dónde caen.** En la única fila `setup` de la línea, y llevan el margen de la oferta, porque la política forma el
  precio sobre todos los costos. Bajo el contrato 1.3.0 toman además la razón de la forma del engagement, como toda
  la fila.
- **`trial-setup` se retira** desde el 2026-10-11. Una cotización con fecha anterior lo sigue resolviendo, y los
  artefactos que lo usaron no cambian.
- **`managed-service-core` no tiene requisito de puesta en marcha**, ni antes ni después. Sus dos provisiones
  mensuales opcionales (cobertura de reemplazo y guardia de alertas) no cambiaron.
- **Consecuencia que hay que decir.** Antes la puesta en marcha era una vez por cuenta; ahora es por persona. Una
  persona que se suma después paga su propia incorporación.
- **Lo que la regla del workbook buscaba proteger** va en los términos del contrato: plazo mínimo cuando hubo
  reclutamiento y cláusula de conversión. Es materia legal, no del cotizador.

**Cómo se registró.** Con el flujo de siempre: change-set `engagement-forms-setup-clp.change.json` sobre el catálogo
v8, `catalog preview|apply`, sucesor `catalog.review-v9.json` (versión `operating-review-2026-10-11-v9`) y puntero
movido con `current set`. El change-set agrega las dos provisiones, emite la revisión 2 de los siete kits de
staffing con los requisitos `setup` (obligatorio) y `recruiting` (opcional), y retira `trial-setup`. El mismo
change-set lleva otras dos adiciones que se deciden en otro ADR: la clase de registro `engagement_factor`
([ADR del motor](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-130-la-forma-del-engagement-como-dato-propio))
y el tipo de cambio `fx:CLP:USD`
([ADR de composición](GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md#delta-2026-10-11--plazo-de-compromiso-de-una-licencia-adobe-como-se-factura-y-costos-en-clp)).
Las políticas de precio y los pisos no se tocaron.

**Alternativas descartadas.**

- *Llevar la regla del workbook al cotizador (un mes del costo del recurso).* En un refuerzo de un mes duplicaría el
  precio. Es un precio de protección, no un costo, y el cotizador forma el precio desde costos.
- *Mantener el placeholder de USD 100.* Estaba marcado como prueba y no representaba ningún trabajo.
- *Cobrar el reclutamiento por defecto.* Sólo ocurre cuando hay que contratar a alguien para ese cliente; cobrarlo
  siempre pondría un costo que en los demás casos no existe.

La primera es el motivo de la decisión. Las otras dos describen lo que el dato fija; no fueron alternativas
presentadas al operador.

**Reglas duras.**

- **NUNCA** cobrar «un mes del recurso» como puesta en marcha ni sumarlo a mano a una cotización.
- **NUNCA** seleccionar `provision-recruiting` si no hay que contratar a alguien para ese cliente, ni quitar
  `provision-account-onboarding` para bajar un precio.
- **NUNCA** tratar los USD 200 y USD 500 como costos medidos: son estimaciones aceptadas y se reportan como
  `ESTIMATED_SOURCE`.
- **NUNCA** resolver en el precio lo que es del contrato: plazo mínimo y conversión van a legal.
- **SIEMPRE** decirle al operador que una persona que se suma después lleva su propia incorporación.
- **SIEMPRE** reemplazar las dos cifras con una versión nueva del catálogo cuando estén medidas, sin heredar la
  confirmación de la estimación.

**Sigue abierto.** Medir las dos provisiones en las próximas dos incorporaciones reales. Si un servicio gestionado
debe llevar puesta en marcha (hoy `managed-service-core` no la tiene). Los términos de contrato que reemplazan la
protección del workbook son materia legal y quedan fuera de este ADR.

## Delta 2026-10-11 — clases de registro del catálogo y dos nuevas (catálogo v10)

Registro, no decisión nueva: la decisión de motor está en el
[delta 1.4.0 del ADR del motor](GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md#delta-2026-10-11--contrato-140-costos-de-terceros-y-reserva-de-contingencia)
y los valores en el
[delta del flujo operativo](GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md#delta-2026-10-11--contrato-140-y-catálogo-v10-cómo-se-lee-una-cotización-con-terceros-y-reserva).

**Clases de registro del catálogo monetario** (`pricing-v3-catalog/1`): trece. La fuente es la unión
`catalogRecordSchema` en `catalog/contracts.ts`, no esta tabla. Cada clase declara qué **no** puede cambiar una
revisión: su identidad.

| Clase | Existe desde | Identidad que una revisión no puede cambiar |
| --- | --- | --- |
| `profile`, `cost` | TASK-2019 | perfil y seniority |
| `resource` | TASK-2019 | `resourceId` |
| `kit` | TASK-2019 | `kitId` |
| `allocation` | TASK-2019 | `policyId` |
| `pricing` | TASK-2019 | perfil, tier, oferta y `engagementCode` |
| `talent_factor` | TASK-2019 (primeros registros en el catálogo v5) | país y país de referencia |
| `market_factor` | TASK-2019 (`floorBasis` desde el contrato `1.2.0`) | país |
| `fx` | TASK-2019 | par de monedas |
| `price_rounding` | contrato `1.1.0` | moneda y oferta |
| `engagement_factor` | contrato `1.3.0` | forma y oferta |
| `third_party_policy` | contrato `1.4.0` | categoría y oferta |
| `contingency_reserve` | contrato `1.4.0` | oferta y forma del engagement |

- **Validación de las dos nuevas.** `third_party_policy`: un piso que pide más margen del que da su método, o un
  margen objetivo de 1 o más, es `INVALID_THIRD_PARTY_POLICY`. `contingency_reserve`: una tasa fuera de
  `0 < rate < 1` es `INVALID_CONTINGENCY_RESERVE`.
- **Identidad exhaustiva.** Una revisión que cambia la identidad de un registro es `CATALOG_IDENTITY_CONFLICT`,
  en las trece clases. Una clase agregada a la unión sin declarar su identidad deja de compilar; antes, dos
  identidades `undefined` habrían comparado iguales y la revisión habría pasado.
- **CLI.** `catalog search|show --kind` acepta las trece; una clase desconocida sigue siendo `INVALID_ARGUMENT`.
- **Cómo se registró v10.** Con el flujo de siempre: change-set `third-party-contingency-factors.change.json` sobre
  el catálogo v9, `catalog preview|apply`, sucesor `catalog.review-v10.json` (versión
  `operating-review-2026-10-11-v10`) y puntero movido con `current set`. Son 15 operaciones: 7 `add` (cinco
  `third_party_policy` y dos `contingency_reserve`, vigentes desde el 2026-10-11) y 8 `replace` (cinco
  `talent_factor` y tres `market_factor`, que pasan de `estimated` a `confirmed` desde el 2026-10-12 sin cambiar de
  valor).

**Regla dura de secuencia.**

- **NUNCA** emitir un registro `contingency_reserve` en una versión del catálogo que una cotización ya congelada
  pueda volver a resolver. La resolución elige la reserva por oferta y forma sin que el brief la pida: una
  cotización congelada contra una versión que después «ganara» una reserva resolvería a otro contrato y su replay
  fallaría. Se emite sólo en una versión más nueva que toda cotización a la que no debe alcanzar. Un
  `third_party_policy` es inerte hasta que un brief declara un costo de su categoría.
- **SIEMPRE** dar a un registro de reserva una vigencia pensada: cuando termina, la cotización siguiente sale sin
  reserva y ningún diagnóstico lo dice. La lectura de fechas (`priceReview`) lista esa vigencia con
  `blocksWith: null` y un `consequence` que lo explica, cuando la fecha entra en su ventana o ya pasó. Los dos
  registros de v10 no tienen fecha de término.



## Evidencia de mantenimiento — 22/10/2026

Aplicación del contrato existente, sin nuevo schema o motor: catálogo v12→v13 y policy v12, con preview/apply y activación del puntero por CLI. Nuevos perfiles y costos CO estimados, referencia Awario y recíproco derivado del FX existente. Se conservaron los rechazos por fecha y datos faltantes, ejemplos y artefactos históricos. [Evidencia](../commercial/tenders/gana-loti-agencia-digital-2027-1552/research/COSTOS-RESTO-ALCANCE-CLI-2026-10-22.md).
