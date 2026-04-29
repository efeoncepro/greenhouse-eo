# Sugerencias asistidas de conciliacion

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-04-29 por Codex
> **Ultima actualizacion:** 2026-04-29 por Codex
> **Modulo:** Finanzas / Conciliacion bancaria
> **Ruta en portal:** `/finance/reconciliation/[id]`
> **Documentacion relacionada:** [Conciliacion bancaria](../../documentation/finance/conciliacion-bancaria.md), [TASK-723](../../tasks/complete/TASK-723-ai-assisted-reconciliation-intelligence.md), [Arquitectura Finance](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)

## Para que sirve

Las sugerencias asistidas ayudan a revisar movimientos bancarios que todavia no estan conciliados.

Greenhouse puede proponer un candidato de match, explicar por que parece razonable y mostrar una simulacion de como cambiaria la diferencia del periodo si lo confirmas.

Importante: la sugerencia **no concilia sola**. Solo abre el dialog de conciliacion con un candidato preseleccionado. El match real ocurre cuando una persona presiona **Conciliar** en el dialog existente.

## Antes de empezar

Necesitas:

- Entrar a Finanzas con permisos sobre conciliacion.
- Tener un periodo de conciliacion creado.
- Haber importado movimientos de cartola o tener filas pendientes en el periodo.
- Que la inteligencia asistida este habilitada por configuracion: `FINANCE_RECONCILIATION_AI_ENABLED=true`.

Si el flag esta apagado, veras el panel, pero Greenhouse no llamara al modelo AI para generar nuevas sugerencias.

## Paso a paso

1. Entra a **Finanzas → Conciliacion**.
2. Abre el periodo que quieres revisar.
3. Busca el panel **Sugerencias asistidas** sobre la tabla de movimientos.
4. Presiona **Generar sugerencias**.
5. Revisa cada sugerencia:
   - confianza estimada.
   - razon de la sugerencia.
   - simulacion de diferencia actual vs diferencia proyectada.
   - aviso si el target es legacy payment-only.
6. Presiona **Revisar match** en una sugerencia.
7. Greenhouse abre el dialog de conciliacion con el movimiento bancario y el candidato sugerido.
8. Revisa monto, fecha, descripcion, referencia y tipo de candidato.
9. Si estas conforme, presiona **Conciliar**.
10. Si no corresponde, cierra el dialog y presiona **Descartar** en la sugerencia.

## Que significan los estados

| Estado o señal | Significado |
|---|---|
| Alta confianza | Las reglas y/o el modelo encontraron señales fuertes de monto, fecha, referencia o descripcion. Igual requiere revision humana. |
| Confianza media | Hay señales utiles, pero no suficientes para tratarlo como obvio. Revisar con cuidado. |
| Baja confianza | La sugerencia es debil o exploratoria. Usala solo como pista. |
| Legacy payment-only | El candidato apunta a un payment antiguo sin `settlement_leg` canonica. Revisar con especial cuidado antes de conciliar. |
| Sin sugerencias pendientes | No hay filas pendientes o Greenhouse no encontro una propuesta util para ese periodo. |
| Inteligencia apagada | El kill switch esta en `false`; no se generan sugerencias nuevas. |

## Que no hacer

- No trates una sugerencia como conciliacion aplicada. Hasta presionar **Conciliar**, no cambia el match.
- No cierres un periodo solo porque hay sugerencias de alta confianza.
- No uses una sugerencia legacy payment-only sin revisar el candidato.
- No esperes que el panel arregle saldos por si solo. La fuente de verdad siguen siendo los matches canonicos y la materializacion contable.
- No actives el flag AI en ambientes compartidos sin validar primero con un periodo de prueba o un periodo de bajo riesgo.

## Seguridad de saldos

Esta feature fue disenada para no afectar saldos por accidente.

No hace:

- writes automaticos sobre matches.
- updates directos a `account_balances`.
- re-materializacion de saldos.
- cierre de periodos.
- creacion de `income_payments` o `expense_payments`.

Si aceptas una sugerencia desde el panel, solo queda marcada como revisada. Para aplicar un match, siempre debes usar el dialog de conciliacion.

## Problemas comunes

| Problema | Que revisar |
|---|---|
| No aparece el panel | Confirma que estas en el detalle de un periodo (`/finance/reconciliation/[id]`) y tienes permisos de Finanzas. |
| El panel dice que la inteligencia esta apagada | Revisa `FINANCE_RECONCILIATION_AI_ENABLED`. Con `false`, no se generan sugerencias nuevas. |
| No se generan sugerencias | Puede que no haya filas pendientes, que el periodo este cerrado/archivado o que no existan candidatos suficientes. |
| La sugerencia abre el dialog pero no aplica nada | Es correcto. Debes confirmar manualmente con **Conciliar**. |
| El candidato sugerido no aparece | Puede haber cambiado el set de candidatos desde que se genero la sugerencia. Genera sugerencias nuevamente o busca el candidato manualmente. |
| La confianza parece alta pero el match se ve raro | No lo concilies. Descarta la sugerencia y revisa el movimiento como caso manual. |

## Como estimar costo

El costo depende de cuantas veces presiones **Generar sugerencias** y cuantas filas/candidatos entren al contexto.

Con el volumen actual de Greenhouse, el costo esperado es bajo: normalmente centavos al mes. Si no hay filas pendientes, no hay llamada util al modelo. Si `FINANCE_RECONCILIATION_AI_ENABLED=false`, el costo LLM es `US$0`.

## Referencias tecnicas

- Runtime: `src/lib/finance/reconciliation-intelligence/`
- API listar/generar: `src/app/api/finance/reconciliation/[id]/intelligence/route.ts`
- API revisar sugerencia: `src/app/api/finance/reconciliation/[id]/intelligence/[suggestionId]/route.ts`
- UI: `src/views/greenhouse/finance/ReconciliationDetailView.tsx`
- Dialog de match: `src/views/greenhouse/finance/dialogs/ReconciliationMatchDialog.tsx`
- Tabla: `greenhouse_finance.reconciliation_ai_suggestions`
- Kill switch: `FINANCE_RECONCILIATION_AI_ENABLED`
- Modelo LLM: runtime canonico `src/lib/ai/google-genai`, configurado por `GREENHOUSE_AGENT_MODEL`
