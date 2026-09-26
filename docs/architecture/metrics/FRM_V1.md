# FRM — Flow Risk Management — Spec V1

| Campo | Valor |
|---|---|
| Metric name | Flow Risk Management (FRM) |
| Metric ID (propuesto; no registrado aún) | `leadership_frm (family)` |
| Spec version / methodVersion propuesto | V1 / `leadership_frm_v1.0` |
| Status | In design — ADR Proposed; sin implementación |
| Owner domain | Delivery/Ops + ICO/Data |
| Created / Last updated | 2026-09-19 |
| Writeback state | N.A. — no writeback de liderazgo |
| Cross-refs | EPIC-048; TASK-1879/1880/1881; contrato y ADR de liderazgo |

## 1. Definición canonical

Mide exposición a bloqueos y respuesta operacional comprobable a riesgos. Busca que Daniela detecte temprano, desbloquee, asigne acciones y escale lo que excede su autoridad. No premia cantidad de mensajes, clicks o cambios de fecha; actuar a tiempo y resolver son cosas distintas.

## 2. Fórmula canonical

Contrato de diseño, NO descripción de un helper de liderazgo ya operativo:

```text
V1 descriptiva: counts y edades de Stuck, OCF, riesgo de vencimiento y reprogramaciones con motivo según señales canónicas; no sumarlos como total porque una tarea puede tener varios flags. uniqueAtRiskTasks = DISTINCT task identity.
Componente de respuesta condicionado a instrumentación:
E = episodios de riesgo elegibles detectados en [cohortStart,cohortEnd) y atribuidos por responsabilidad al detectar, no duplicados ni anulados por falso positivo aprobado. Congelar IDs de E por revisión.
deadline(e)=addBusinessMinutes(detected_at, SLA[severity,type], calendarVersion).
M={e∈E | deadline(e) <= observationAsOf}; incluir sin acción y resueltos automáticamente.
R={e∈M | existe acción válida a con detected_at <= a.occurred_at <= min(deadline(e),observationAsOf)}.
Timely Intervention Rate=100×|R|/|M|; |M|=0 → null, aunque haya riesgos aún con plazo abierto.
pendingMaturity=|E-M|. riskEventCoverage=episodios con detección/acción confiable sobre conocidos; población desconocida no permite tasa global plena.
Response Time=businessMinutes(detected_at, earliestValidAction_at), p50/p90 sobre respondidos, acompañado de unanswered count/age.
Resolution Time es diagnóstico distinto; cierre de señal sin acción no cuenta como respuesta.
```

Versionar método, policy, dependencias y manifest por separado. Cambiar semántica exige nueva versión y no reescribe revisiones locked.

### Corte de cohorte vs maduración

cohortEnd es fin exclusivo del mes de detección; observationAsOf es el corte de observación de respuesta, que puede avanzar al mes siguiente sin incorporar nuevos riesgos a E. Guardar ambos, runAsOf, watermark y revisión. Una acción posterior a cohortEnd pero anterior al SLA cuenta al madurar el episodio. El calendario/SLA y responsable de atribución del episodio quedan fijados por policy al detectarlo; una transferencia no reinicia el plazo.

Ejemplo de fixture: riesgo 30 septiembre, deadline 2 octubre, acción válida 1 octubre. Corte 30 septiembre: pendingMaturity; observationAsOf 3 octubre: maduro y respondido a tiempo en cohorte septiembre. Un riesgo detectado 1 octubre no entra en E de septiembre. Evento tardío conocido después de lock propone revisión; nunca mutación silenciosa. Si no se certifica watermark/captura para el intervalo de respuesta, conservar confidence degradada aunque todo E haya madurado.

## 3. Inputs canonical

Señales ICO Stuck/OCF, due-date change reasons y fuente de detección con risk_instance_id/conditionVersion. Eventos propuestos de intervención en greenhouse_delivery.leadership_risk_actions, actor, action_type, occurred_at/recorded_at, evidence_ref, assignment scope e idempotency. Detección observada no equivale al inicio real del problema; capture lag se reporta.

El [contrato compartido](../GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md) gobierna universo, tiempo, source quality y autorización. Fuente primaria registra hechos; ICO deriva el indicador. Campos faltantes no se imputan.

## 4. Helper canonical

Reusar lectores/definiciones de STUCK_ASSETS_V1 y OCF_V1 para exposición. Nuevo cálculo propuesto en src/lib/ico-engine/leadership/calculate.ts; commands.ts registra acciones y validación en servidor (TASK-1880). No tomar desaparición de signal ni output LLM como intervención.

Tests de comportamiento mínimos: ejemplos de §6, null/zero, duplicados, corte temporal/DST, quinto cliente, 51/201 cuentas, dos líderes, fuente incompleta y permisos revocados. Fixtures no son evidencia de producción.

## 5. Agregado canonical

Agrupar episodios por cuenta y cohorte detected_at del período, luego cociente de sumas de R/M. Una misma alerta persistente es un episodio, no uno por poll. Reapertura sin resolución verificada conserva episodio y reloj; recurrencia real posterior inicia otro con vínculo predecessor. Risk type distintos pueden coexistir, con task count separado. Cierre mensual de respuesta requiere maduración completa de su cohorte o se conserva pending_maturity; no declarar tasa final con el último día aún en SLA. El resto del scorecard puede estar locked con ese componente no evaluable, sin fingir validez.

No existe agregado productivo de liderazgo en registry hoy. Implementación futura TASK-1880 sobre snapshot de TASK-1879; tablas/nombres nuevos permanecen propuestos. Página/filtro de UI no redefine universo materializado. Conservar conteos y precisión completa, redondear sólo presentación.

## 6. Semántica de casos edge

| Caso | Resultado exigible |
|---|---|
| 10 episodios maduros, 7 con acción válida a tiempo | 70%; 3 fallos permanecen |
| 2 adicionales aún dentro de SLA | pendingMaturity=2, no denominador 12 ni éxito anticipado |
| acknowledge sin plan/evidencia | No satisface respuesta |
| assign/unblock/escalate con acción ejecutada, owner y evidencia | Puede satisfacer si scope/timestamp/policy válidos |
| resolve automático por sync | No se infiere acción humana |
| 3 polls mismo riesgo | Un episodio, no 3 éxitos/fallos |
| Acción bulk | Cuenta sólo para episodios con evidencia individual aplicable |
| Cambio de líder/owner | No reinicia deadline; conservar intervalos y contexto de transferencia |
| Evento tardío/backdated manual | occurred_at confiable del sistema, o recorded_at; corrección auditada, nunca reescribir éxito |
| Sin SLA/calendario/historial | Descriptivo disponible; tasa unavailable/policy_unconfigured |

Toda exclusión conserva reason/count. Status desconocido es gap y requiere mapping gobernado; no se trata como completado.

## 7. Estados / dataStatus

`confidence=valid|low_confidence|unavailable`; lifecycle y freshness independientes según contrato común.
Unavailable si no hay inputs/denominador; low_confidence si existe cálculo diagnóstico con evidencia incompleta, muestra insuficiente o policy de evaluación pendiente; valid sólo con gates satisfechos. Un lock no transforma low_confidence en valid.
Acceso denegado/suppressed no revela valor ni universo protegido. Cada componente de una familia tiene su propio estado; no propagar válido desde un componente al resto.

## 8. Threshold canonical + benchmark

SLA por tipo/severidad y calendario requiere aprobación Ops. No fijar 24 horas universales ni usar metas laborales heredadas. Un 100% de respuesta no significa riesgos resueltos: acompañar volumen/antigüedad/recurrencia y resultados POTD/FTR. Cero riesgos no se convierte en 100%; puede ser falta de detección.

Sin benchmark externo validado en esta propuesta. Configurar minSample, minCoverage, freshnessBudget y vigencia por método; aprobación operativa previa a evaluación. No activar semáforos por defaults de ejemplo.

## 9. Writeback a Notion

N.A. en EPIC-048: KPI agregado de liderazgo se sirve en Greenhouse/API. No crear propiedades, modificar fórmulas Notion ni habilitar flags de writeback. Tampoco escribe Payroll.

## 10. Histórico de decisiones

### 2026-09-19 — V1 in design

Formalización solicitada por el operador. Diseño sobre cartera dinámica, evidencia explícita y shadow; método todavía no implementado ni aprobado para consecuencias laborales.

## 11. Cross-refs

- [Contrato compartido](../GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md).
- [ADR Proposed](../GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_DECISION_V1.md).
- [Metric Spec Pattern](../GREENHOUSE_METRIC_SPEC_PATTERN_V1.md).
- [EPIC-048](../../epics/to-do/EPIC-048-operational-leadership-performance-ico-person-360.md).
- [TASK-1879](../../tasks/to-do/TASK-1879-leadership-accountability-source-foundation.md), [TASK-1880](../../tasks/to-do/TASK-1880-ico-leadership-performance-engine.md), [TASK-1881](../../tasks/to-do/TASK-1881-person-360-leadership-performance-ui.md).
- Dependencias: [OTD](OTD_V1.md), [FTR](FTR_V1.md), [OCF](OCF_V1.md), [Stuck Assets](STUCK_ASSETS_V1.md). No redefinir sus fórmulas base.

## 12. Open questions deliberadamente NO resueltas en V1

Aprobar catálogo de acciones válidas (acknowledge nunca suficiente solo), política de falsos positivos con reviewer, SLA/calendario y confianza de timestamps antes de publicar tasa. No añadir resolución automática ni cambiar deadlines por intervención sin command autorizado.

## 13. Downstream consumers

Person 360 y API común (TASK-1881/1880). Sin bono, ranking de personas ni exportación cliente por este programa; una política futura requiere decisión separada y prospectiva.

### Seguimiento de efectividad

El [contrato compartido §11](../GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md#11-protocolo-operativo-de-medición-y-mejora--contrato-propuesto) gobierna acciones/reviewers/disputas. Responder a tiempo y verificar mejora son hechos distintos: una acción oportuna puede resultar ineffective/inconclusive. No alterar retrospectivamente Timely Intervention Rate ni sumar un KPI nuevo por marcar checklists; conservar resultado y recurrencia como contexto.
