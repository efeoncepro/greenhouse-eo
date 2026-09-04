# Payroll — baseline de confiabilidad y full API parity

Fecha: 2026-09-03. Programa: [EPIC-043](../../epics/to-do/EPIC-043-payroll-reliability-and-agentic-api-parity.md).
Este resumen conserva la evidencia que gobierna el programa; las reproducciones extensas permanecen en los
artefactos locales de la auditoría. No acredita correcciones ni rollout.

## Evidencia y alcance

Código Greenhouse auditado: `f0061576d88b9cc514f0f1fa01df3f8c1cca1419`; portal observado READY sobre
`a824d073a5fb01b916386312f6ae61c0082b67c9`, sin diferencias src/migraciones/setup Payroll entre ambos al
compararlos. Fechas y SHAs son snapshots, no estado permanente. No hubo cálculos reales, envíos ni pagos.

La tercera pasada ejecutó13 tests adversariales más harness de cálculo/SQL local y controles UTC/Santiago.
La pasada de parity ejecutó94 tests focales y cuatro reproducciones de PDF/email con IO simulado. Las pruebas
que pasan reproduciendo un defecto no certifican salud; deben convertirse en regresiones del arreglo.

| Hallazgo | Resultado y límite | Unidad EPIC-043 |
|---|---|---|
| F1/F2 | Reexport conserva retenciones duplicadas y obligación neta anterior cuando nuevo neto es cero. Ciclo real con PostgreSQL local. | U04 |
| F3/F8 | Segunda reapertura sobrescribe v2; carrera y replay pueden producir deltas financieros repetidos/inconsistentes. El wrapper completo con fallo de acknowledgement no se ejercitó. | U01/U04 |
| F4/F5 | Permiso multimes se cuenta completo en ambos meses; fallo específico de participación sustituye prorrateo por factor1. | U03 |
| F6 | Se retira como sobrepago P1 independiente: los1.000 conservados podían ser sueldo previo adeudado. Sí se probó dependencia del historial y limitación multiversión. | U03 |
| F7/F14 | Aprobación puede guardar sobre cálculo cambiado; fallo en segunda persona conserva mezcla approved y close acepta. Control exitoso invalida aprobación. | U01 |
| F9/F10/F11 | UI ofrece edición bloqueada, conserva datos tras refrescar otro período y mezcla selección/dataset cuando falla GET. Fallo GET también inyectado en navegador real, sin modificar servidor. | U11 |
| F12/F15 | Readiness puede aceptar sin UF resoluble; «Sin bloqueos» no comprueba perfiles. Perfil faltante no implica imposibilidad absoluta de orden manual. | U05 |
| F13 | Excluir deja bruto/neto0 y retención15.250 por fallback `||`; aprobación acepta. | U02 |
| D1/D2/D3 | Reenvío puede responder ok con fallo; batch ignora generación fallida; fallos parciales tras pago no disparan retry del trabajo. Hay registros individuales, no ausencia total de trazabilidad. | U08 |
| D4 | Tras aceptación simulada y fallo de persistencia, retry repite llamada al sender. No se demostraron dos entregas reales. | U08 |
| TZ | Septiembre2026:22 weekdays en UTC y21 en Santiago; TZ del proceso desplegado no verificada. | U03 |
| Lectura Nexa | check_payroll suma monedas y rotula CLP, toma último período cronológico. Evidencia por código, no consulta a nómina real. | U05/U10 |

## Full API parity observada

- 44 tools internas y37 en introspección del gateway real con providers fixture habilitados; cero Payroll.
  El conteo del gateway no es tools/list autenticado de producción.
- 31 archivos route.ts bajo Product API Payroll, más admin/Finance; no lane Payroll app/ecosystem encontrado.
- Nexa tiene check_payroll y explain_my_pay; ninguna acción Payroll, aunque su runtime de acciones sirve otros
  dominios. El ledger histórico que decía «sólo mark_notifications_read» ya no es inventario vigente.
- Aprobación/ajustes/documentos tienen orquestación repartida entre routes y helpers. No publicar stores como
  sustituto del command completo. Algunos GET generan/suben/persisten assets.
- Vercel configura on_payment_paid; ops-worker observado sin override de GREENHOUSE_PAYSLIP_DELIVERY_MODE.
  Default del código actual both, imagen worker sin SHA probado: diferencia de configuración, no prueba de
  cuál rama ejecutó el worker ni de envío duplicado real.
- Metadata pública mantiene AS anunciado gateway e issuer Entra. TASK-1813 conserva interoperabilidad;
  no se repitió login nuevo ni se copiaron tokens entre clientes.

## Reproducciones detalladas conservadas

- [Tercera auditoría](/Users/jreye/.codex/visualizations/2026/09/03/01a068f6-57c7-74a3-8aec-17cc873087b2/auditoria-payroll-tercera.md).
- [Auditoría API parity](/Users/jreye/.codex/visualizations/2026/09/03/01a068f6-57c7-74a3-8aec-17cc873087b2/auditoria-payroll-api-parity.md).
- Harnesses locales: `third-finance`, `third-api`, `third-calculation`, `third-readiness`, `parity-documents`,
  `parity-mcp` y `parity-gateway` bajo la misma carpeta de artefactos. No contienen fixtures creadas en producción.

Al formalizar cada task, trasladar su reproducción necesaria a los tests del repositorio conservando los
límites del fixture. Si el artefacto local no está disponible, reconstruir desde el mecanismo/documentación
y verificar; no declarar una regresión cubierta por la sola existencia de este resumen.
