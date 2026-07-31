# Aumentar el presupuesto de GitHub Actions

## Alcance

Procedimiento para modificar el presupuesto mensual que permite consumo adicional de GitHub Actions en la organización `efeoncepro`. No cambia la cuota de minutos incluidos en el plan.

## Estado aplicado

- Fecha: 2026-07-31.
- Organización: `efeoncepro` / Efeonce Group.
- Producto: Actions, presupuesto a nivel organización.
- Presupuesto mensual: USD 20.
- Detención al alcanzar el límite: activada.
- Alertas: activas para la cuenta operadora.
- Método de pago: verificado en GitHub; nunca copiar datos sensibles al repositorio.
- Presupuesto GitHub: `7f36dec2-18a4-4575-9f49-c5b0470ff929`.

## Procedimiento

1. Abre GitHub con el navegador autenticado del operador; no introduzcas contraseñas ni tokens en el flujo automatizado.
2. Entra a `Organization settings → Billing and licensing → Budgets and alerts` para `efeoncepro`.
3. Localiza la fila `Product: Actions` y abre su menú de acciones.
4. Elige `Edit`, cambia `Budget amount` al límite mensual aprobado y conserva activado `Stop usage when budget limit is reached`.
5. Mantén las alertas y sus destinatarios salvo instrucción explícita en contrario.
6. Elige `Update budget`.
7. Verifica en la tabla que la fila muestre el nuevo importe, `Stop usage: Yes` y el gasto actual.

## Verificación y límites

El aviso de GitHub puede mostrar minutos incluidos consumidos sin que exista un cargo inmediato. El presupuesto en USD gobierna el consumo metered posterior a la cuota incluida; no compra minutos por adelantado ni modifica el plan de GitHub.

No registres números de tarjeta, tokens, cookies ni credenciales. Si el método de pago no está disponible, detén el procedimiento y solicita intervención de una persona con permisos de billing.
