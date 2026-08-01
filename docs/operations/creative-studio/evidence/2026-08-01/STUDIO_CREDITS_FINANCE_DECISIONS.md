# Studio Credits — decisiones Finance históricas 2026-08-01

> **Estado:** `accepted`
> **Autoridad:** instrucción explícita del CEO durante el cierre de `TASK-1630`
> **Alcance:** clasificación contable-operativa del bootstrap histórico y adjudicación excepcional de dos
> outcomes sin evidencia recuperable. Estas decisiones no cambian pricing, caja, revenue recognition ni el
> acceso de clientes externos.

## FIN-STUDIO-CREDITS-2026-08-01-01 — bootstrap histórico de 500.000

### Hecho durable

- Workspace: `greenhouse-org:efeonce`.
- Allocation y ledger entry: `6a60af50-f3e9-4bec-9bbb-57566e736413`.
- Créditos: `500000`.
- Fuente: `manual-allocation / internal-pilot-2026-07-22`.
- Motivo: `internal_pilot_bootstrap`.
- Período cerrado: `[2026-07-01T00:00:00Z, 2026-08-01T00:00:00Z)`.
- Actor original: `globe:service:internal-caller`.
- No existe `credit_admin_grant`, pool ni funding source elegible ligado a esa allocation.

### Decisión

Clasificar el asiento como:

`historical_internal_shadow_bootstrap · non_cash · non_revenue · non_customer_liability · period_closed · never_funding_eligible`

Se conserva byte-for-byte la historia append-only. No se elimina, renombra, reposta ni compensa con un adjustment
de `-500000`: ese ajuste no corregiría la capacidad vigente y agregaría una semántica económica inexistente. Los
500.000 quedan excluidos de funding vigente, capacidad efectiva y KPI comercial. El funding efectivo de agosto
proviene exclusivamente del pool/grant mensual gobernado.

### Evidencia de no interferencia

El readback del 2026-08-01 separó ledger histórico de capacidad efectiva: el período agosto quedó con funding 800,
cap 1500 y capacidad efectiva 800 mediante `internal-month:2026-08`. La allocation de julio no aparece entre las
fuentes elegibles del período.

## FIN-STUDIO-CREDITS-2026-08-01-02 — dos submissions sin entregable

### Hechos durables

| Créditos | Reservation | Governed run | Evidencia disponible |
| ---: | --- | --- | --- |
| 14 | `b8ef53f0-de01-49b8-ad67-6366a53db2f8` | `9a5a041c-8f68-4657-8638-234f87432059` | OpenAI GPT Image 2; `providerOperationId=NULL`; `openai_submit_rejected_or_unknown` |
| 16 | `e98eb0ab-2d5c-4755-bf93-c688807bb947` | `856f7796-a7fb-4a54-9cd3-692fb12f88f9` | Vertex Veo 3.1 frames; `providerOperationId=NULL`; `veo_submit_outcome_unknown` |

Ambos casos permanecen `submission_unknown`; no tienen output hash, candidato, governed asset, entrega,
settlement ni evidencia recuperable del provider. La ausencia de un log no prueba que el provider haya rechazado
el submit, por lo que tampoco autoriza un retry ni una conclusión técnica inventada.

### Decisión

Adjudicar ambos casos como `historical_submission_unknown_no_deliverable`. Para Studio Credits, un timeout/error
sin candidato útil consume cero. Una primitive gobernada debe:

1. verificar dentro de la misma frontera transaccional que el run sigue en el estado histórico esperado, que no
   apareció `providerOperationId`, output, asset, delivery o settlement y que la reservation continúa held;
2. terminalizar el run con este `decisionId` y conservar audit append-only;
3. ejecutar release/expiration canónico por 14 y 16 créditos, con entradas de ledger append-only;
4. hacer readback de run, reservation y ledger antes de declarar la adjudicación aplicada.

No se autoriza SQL manual, `UPDATE`/`DELETE` histórico, force-release genérico, retry del provider ni settlement de
30 créditos sin un entregable. Si aparece evidencia tardía del provider después de la adjudicación, no se cobra al
workspace en silencio: cualquier costo no entregado se registra como costo interno de excepción y requiere una
nueva decisión para alterar el tratamiento económico.

### Estado de ejecución

`decision accepted; aplicación runtime pendiente`. La decisión no se considera ejecutada hasta que los dos runs
queden terminales, ambas reservations dejen `held`, existan los ledger entries canónicos y la señal de hold antiguo
baje por resolución real.

