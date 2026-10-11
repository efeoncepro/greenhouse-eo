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
