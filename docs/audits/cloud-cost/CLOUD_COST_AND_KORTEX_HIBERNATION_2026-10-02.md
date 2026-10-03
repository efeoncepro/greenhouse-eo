# Auditoría de costo GCP y hibernación de Kortex — 2026-10-02

> **Corte operativo:** `2026-10-02T13:44:27Z`
> **Moneda:** CLP
> **Alcance:** cuenta de facturación GCP `013340-4C7071-668441`, Kortex y forecast consolidado
> **Modo:** runtime verificado + Billing Export read-only

## Objetivo

Dejar una línea base auditable después de hibernar Kortex y separar tres conceptos que no deben mezclarse:

- **observado:** cargo ya presente en Billing Export o factura;
- **modelado:** proyección basada en una ventana completa y en el estado esperado de los recursos;
- **realizado:** reducción confirmada sólo después de comparar ventanas completas posteriores al corte, con el
  desfase de Billing Export absorbido.

## Estado runtime verificado de Kortex

Desde `2026-10-02T13:44:27Z`, Kortex permanece en hibernación profunda y reversible:

| Superficie | Estado verificado |
| --- | --- |
| Vercel | proyecto pausado; la superficie responde `503 DEPLOYMENT_PAUSED` |
| Cloud Run `kortex-control-plane` | ingress interno, IAM obligatorio y mínimo de 0 instancias |
| Cloud Tasks | cola pausada, 0 tareas pendientes |
| Cloud SQL `kortex-pg-dev` | `STOPPED`, `activationPolicy=NEVER` |
| Callers de Greenhouse | no deben ejecutar comandos ni smokes contra Kortex mientras siga hibernado |

No se eliminaron datos, secretos, imágenes, instalaciones HubSpot ni deployments. La secuencia detallada de
reactivación vive en el repo hermano Kortex, `docs/ops/KORTEX_DEEP_HIBERNATION_RUNBOOK_V1.md`; Greenhouse conserva
el gate de consumo en [`docs/architecture/kortex/operations/runbook.md`](../../architecture/kortex/operations/runbook.md).

## Costo de Kortex observado

Billing Export registró para septiembre de 2026 en `efeonce-kortex-dev`:

| Medida observada | CLP |
| --- | ---: |
| Gross | 10.480,64 |
| Credits | 0,00 |
| Net | 10.480,64 |

La factura cerrada mostró un subtotal de proyecto de CLP 10.474. La diferencia de CLP 6,64 frente al export se
conserva como reconciliación export/factura; no se redondea ni se presenta como crédito.

## Residual modelado de Kortex

Con SQL detenido, Tasks pausado, Vercel pausado y Cloud Run en mínimo cero, el residual se modela en
**aproximadamente CLP 3.500/mes**. El remanente corresponde principalmente a almacenamiento conservado de Cloud
SQL, Artifact Registry, Secret Manager y almacenamiento menor.

La diferencia contra septiembre es una **reducción proyectada**, no ahorro realizado. El efecto real se mide con
ventanas completas posteriores al corte y sin atribuir al apagado consumo ocurrido antes de
`2026-10-02T13:44:27Z`.

## Forecast consolidado de Google Cloud

La ventana completa `2026-09-25T00:00:00Z`–`2026-10-02T00:00:00Z` se normalizó a 30 días para los componentes que
seguían operativos. A Kortex se le reemplazó su run-rate anterior por el residual de hibernación modelado.

| Componente | CLP/mes | Naturaleza |
| --- | ---: | --- |
| `efeonce-group` | 194.352,81 | run-rate modelado desde ventana completa |
| Globe hibernado | 30.727,36 | run-rate modelado; no ahorro realizado |
| Kortex hibernado | 3.500,00 | residual modelado post-corte |
| Sin proyecto / Looker Studio | 8.323,71 | run-rate modelado desde ventana completa |
| Creative Workbench | 164,26 | run-rate modelado desde ventana completa |
| Duet AI / Gemini Code Assist | 0,00 | supuesto del forecast tras cancelación; confirmar en factura/export |
| **Total central** | **237.068,14** | **forecast, no factura** |

Rango operativo razonable: **CLP 230.000–245.000/mes**. Para presupuesto conservador se usa el extremo superior,
**CLP 245.000/mes**, hasta contar con una ventana mensual completa posterior a ambos apagados.

## Qué todavía no está realizado

- No existe aún un mes calendario completo post-hibernación de Kortex.
- El valor CLP 3.500 es un modelo de residual, no una factura cerrada.
- El valor cero de Code Assist depende de que la cancelación se refleje efectivamente en billing.
- El forecast consolidado no reemplaza la factura oficial ni el saldo pendiente de la cuenta.

## Próximas mediciones

1. Reconsultar Billing Export tras su desfase natural y registrar `gross`, `credits` y `net` por proyecto/servicio.
2. Comparar la primera ventana UTC completa posterior al corte con una ventana equivalente anterior.
3. Confirmar que Kortex no recibió requests, tareas ni reactivó SQL durante la ventana.
4. Reemplazar el residual modelado por costo observado cuando exista un mes completo.
5. Alertar si Kortex supera materialmente CLP 4.500/mes o si aparece compute que debería estar apagado.

## Evidencia y fuentes canónicas

- Auditoría anterior: [`CLOUD_COST_AUDIT_2026-05-24.md`](CLOUD_COST_AUDIT_2026-05-24.md).
- Modelo funcional FinOps: [`cloud-cost-intelligence-finops.md`](../../documentation/operations/cloud-cost-intelligence-finops.md).
- Manual de monitoreo: [`monitorear-costos-cloud-finops.md`](../../manual-de-uso/operations/monitorear-costos-cloud-finops.md).
- Operación Kortex desde Greenhouse: [`runbook.md`](../../architecture/kortex/operations/runbook.md).
