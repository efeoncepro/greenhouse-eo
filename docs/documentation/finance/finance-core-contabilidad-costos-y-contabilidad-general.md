> **Tipo de documento:** Documentación funcional
> **Versión:** 1.0
> **Creado:** 2026-08-02 por Codex
> **Última actualización:** 2026-08-02 por Codex
> **Módulo:** Finance / Cost Accounting / General Accounting foundation
> **Estado:** Dirección aceptada; foundation, Cost Subledger y General Accounting todavía no están implementados como programa completo
> **Documentación técnica:** [ADR-021 — Finance Core accounting-ready](../../architecture/GREENHOUSE_FINANCE_CORE_ACCOUNTING_FOUNDATION_DECISION_V1.md), [EPIC-012](../../epics/to-do/EPIC-012-finance-five-capabilities-operating-system.md), [Agentic Quotation](../../architecture/GREENHOUSE_AGENTIC_QUOTATION_ORCHESTRATION_DECISION_V1.md)

# Finance Core: comenzar por costos sin hipotecar la contabilidad general

## La decisión en una frase

Greenhouse comenzará por contabilidad de costos, pero los datos nacerán sobre una foundation común de plan de
cuentas, entidades, períodos, monedas, dimensiones y eventos económicos. Cuando llegue contabilidad general,
extenderá esa misma base con asientos, cierre y estados financieros; no se construirá otro sistema.

```text
Foundation contable común
        ↓
Costos vivos → Pricing → Cotizaciones → Proposal Studio
        ↓                         ↓
actual vs estándar          Quote-to-Cash
        ↓                         ↓
        Contabilidad general futura
```

## Por qué este es el punto de partida

Hoy Greenhouse ya registra muchas piezas reales: nómina, compensaciones, herramientas, gastos, ingresos, pagos,
FX, distribución de gastos, P&L operativo, precios y cotizaciones. El problema es que esa información todavía no
forma una base de costos completa y viva que cualquier agente autorizado pueda usar con confianza.

Si primero se construyera un módulo aislado de costos, después habría que traducirlo al plan de cuentas y al libro
general. Si se esperara a terminar toda la contabilidad legal, seguiríamos cotizando sin una base confiable. La
solución es separar foundation y vertical:

- se crea ahora la foundation mínima que ambas necesitan;
- costos es la primera vertical que entrega valor;
- General Accounting se incorpora después sobre los mismos contratos.

## Qué incluye la foundation

### Entidad y período

Cada hecho debe saber a qué organización y legal entity pertenece, en qué período se reconoce y en qué ledger
podría registrarse. Esto permite operar Chile, otros países y varias entidades sin asumir que todo ocurre en una
sola empresa o moneda.

### Plan de cuentas

El sistema tendrá conceptos contables comunes para Efeonce y planes de cuentas versionados por entidad/ledger.
Una cuenta cerrada o renombrada no cambia el significado histórico de movimientos anteriores.

Greenhouse puede mantener esta semántica mientras Nubox/SII u otro ERP continúa como sistema fiscal/legal. La
coexistencia se resuelve con mappings y reconciliación, no copiando el plan externo como si fuera todo el modelo.

### Cuentas y dimensiones no son lo mismo

- La cuenta responde: “¿qué naturaleza económica tiene?”
- La dimensión responde: “¿de quién, para quién, dónde o en qué servicio ocurrió?”

Un sueldo puede ser costo laboral directo. El cliente SKY, el servicio SEO, la persona, el proyecto o Globe son
dimensiones. No se abre una cuenta distinta por cada cliente, miembro, herramienta o producto.

### Monedas y UF

El monto original nunca se pierde. El sistema conserva moneda nativa y agrega equivalentes funcionales o de
reporting usando un snapshot de FX. La moneda de costo, contrato, presentación y liquidación pueden ser distintas.

En Chile una oferta puede expresarse en CLP o UF/CLF. La UF es una unidad indexada y se liquida en CLP conforme a
la política vigente. En otros mercados puede usarse USD o una moneda local solo si esa moneda tiene cobertura y FX
listos; no se habilita por inferencia geográfica.

### Evento económico y futuro asiento

Greenhouse distinguirá:

- documento fuente;
- evento económico;
- movimiento de caja;
- candidato a asiento;
- asiento aprobado/posteado.

No son sinónimos. Una cotización no reconoce ingreso. Una factura y su cobro son hechos diferentes. Un pago de una
obligación no vuelve a reconocer el gasto.

La foundation define desde ahora el contrato de diario, pero no activa asientos automáticos. Posting y cierre
requieren reglas, permisos, maker-checker, conciliación y rollout separados.

## Cómo funcionará la contabilidad de costos

El Cost Subledger combinará varias clases de costo sin confundirlas:

| Tipo | Uso | ¿Puede convertirse en asiento? |
| --- | --- | --- |
| Actual | Lo que realmente ocurrió según nómina, gasto, provider o consumo | Puede ser elegible con regla y aprobación. |
| Standard | Base gobernada para cotizar y comparar | No. |
| Modeled | Estimación para algo todavía no observado | No; debe mostrar fuente, supuestos y confianza. |
| Forecast | Proyección futura | No. |

### Costos vivos

“Vivo” significa que la base vigente reacciona a cambios reales:

- si sube un sueldo, cambia el costo futuro de esa persona o perfil;
- si una licencia o provider cambia de precio, cambian los próximos cálculos;
- si cambia el FX, los drafts se reevalúan según policy;
- si aparece evidencia real de un rol nunca contratado, mejora o reemplaza su costo modelado;
- si Globe cambia el costo de una ruta/modelo, se actualiza el costo futuro de esa capability.

“Vivo” no significa reescribir el pasado. Una cotización o propuesta enviada conserva el snapshot de costos, FX,
margen y política que usó. Si se necesita modificarla, nace una nueva versión.

### Perfiles nunca contratados

Cuando se pida cualquier rol que Efeonce nunca haya contratado, el sistema no inventará un salario ni copiará sin
contexto un valor de mercado. Resolverá el perfil contra evidencia gobernada:

1. rol real observado;
2. banda o mezcla de roles comparables;
3. modelo con geografía, seniority, modalidad, skills y fecha;
4. proxy explícito;
5. bloqueo o revisión manual si no hay evidencia suficiente.

El resultado conserva rango, fuente, supuestos, confidence y approval state. Un perfil modelado puede servir para
cotizar con el riesgo visible; no se registra como gasto actual.

## Relación con pricing y agentes

Codex, Claude, Agentica, Nexa, Portal, API o MCP deben consultar el mismo kernel y los mismos costos:

```text
solicitud en lenguaje natural
→ QuoteIntent
→ resolución del perfil y service plan
→ Cost Subledger
→ kernel determinista de costo/margen/precio
→ CostCard y recomendación
```

El agente interpreta, descompone, busca evidencia, pregunta y explica. El kernel calcula, aplica FX, márgenes,
vigencias, floor y approvals. El agente no puede autoaprobar una excepción ni crear un costo permanente desde un
prompt.

El primer rollout es read-only/recommendation. Crear drafts, emitir o enviar una cotización requiere fases
posteriores con commands, idempotencia, scopes, evals y confirmación humana.

## Relación con Proposal Studio

Una propuesta puede ser técnica sola, económica sola, combinada o entregar ambas por separado. La viabilidad
interna y la oferta client-facing son objetos diferentes:

- `BidEconomicAssessment`: si conviene participar y si podemos entregar con ese costo;
- `QuotationVersion`: precio y condiciones que Efeonce ofrece;
- `ProposalEconomicPackage`: snapshot congelado de líneas, impuestos, FX, términos, approvals y requisitos;
- `ProposalEconomicProjection`: versión sanitizada que alimenta deck, PDF, Excel o cotización formal.

Proposal Studio compone y renderiza; no recalcula costos ni precios. Todos los artefactos económicos salen del mismo
package para evitar que el deck diga una cifra y el PDF otra.

## Relación con Quote-to-Cash y contabilidad general

Cuando una oferta se gana, Q2C debe conservar el hilo completo:

```text
quote/version → contrato → income/AR → factura → cobro
       ↓
cost snapshot estándar → ejecución real → actual → variance
       ↓
economic events → journal candidates → posting/close futuros
```

Así el sistema aprende cuánto costó realmente entregar y puede mejorar próximos estándares y modelos sin confundir
forecast con realidad.

General Accounting agregará posting rules, journal, cuentas por cobrar/pagar, devengos, provisiones, cierre,
restatements, trial balance y estados financieros. Usará el mismo plan de cuentas, entidades, períodos, monedas,
dimensiones y eventos que el Cost Subledger.

## Qué existe y qué falta

| Plano | Estado al 2026-08-02 |
| --- | --- |
| Ingresos, egresos, pagos, treasury, FX, payroll y parte del P&L | Existen en runtime. |
| Costos cargados de miembros, atribución comercial y distribución de gastos | Existen parcialmente y se reutilizan. |
| Pricing engine, simulación headless, quote versioning y Proposal foundation | Existen, con gaps de cost basis y package. |
| Plan de cuentas versionado compartido, entity/ledger y período contable común | Falta materializar. |
| Economic Event y Journal Candidate canónicos | Faltan. |
| Cost Subledger vivo y unificado | Falta. |
| Orquestador agentic con golden set | Propuesto; no implementado completo. |
| Contabilidad general operativa y posting | No implementados ni autorizados por este documento. |

## Orden de implementación

1. Finance Core reference foundation, sin posting.
2. Economic Event y Journal-Ready Shadow, todavía sin asientos reales.
3. Cost Subledger vivo y canonical cost reader.
4. Profile Resolution, CostCard, golden set y cotización agentic read-only/recommendation.
5. Quotation Version inmutable y economic package.
6. Composición económica, gates y finalización de artefactos en Proposal Studio.
7. Provider MCP read/recommend y luego adapters de write gobernados sobre commands existentes.
8. Q2C y feedback actual-versus-standard.
9. General Accounting sobre la misma foundation.

## Qué no debe ocurrir

- crear un plan de cuentas diferente dentro de costos;
- usar una cuenta por cada cliente, persona, tool o producto;
- convertir standard, model, forecast o quote en asientos;
- recalcular cotizaciones emitidas por cambios de sueldo, FX o licencias;
- permitir que cada agente tenga su propio cálculo;
- declarar que Greenhouse ya reemplaza Nubox/SII;
- exponer costo, margen o supuestos internos al cliente;
- crear un GL completo dentro de la primera task de costos.

## Manual de uso

No se agrega manual operativo todavía porque no existe una surface o workflow nuevo implementado. Cada task que
materialice commands, readers o UI deberá crear o actualizar su manual con estado runtime verificable.
