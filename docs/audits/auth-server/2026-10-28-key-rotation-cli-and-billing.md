# TASK-1833 — CLI de rotación y billing export (28-10-2026)

## Hardening local de argumentos

La CLI manual trataba `--register` o `--retire` sin valor como si no se hubiera pedido esa acción.
Ambos casos podían caer en la ruta por defecto que crea una versión KMS y la activa. La lectura
`--status` también ganaba silenciosamente frente a flags de mutación mezclados. Ahora
`parseRotationArgs` valida una sola acción y sus modificadores antes de cargar el perfil PostgreSQL
o construir el cliente KMS; argumentos faltantes, duplicados, desconocidos o incompatibles fallan.
La ruta histórica sin argumentos sigue creando y activando una versión deliberadamente.

Evidencia local: `rotate-signing-key-args.test.ts` y `signing-keys-store.test.ts` 20 PASS;
ESLint focal y `tsc --noEmit` PASS. La prueba cubre el parser y su orden de llamada en el script;
no ejercita KMS ni PostgreSQL cloud. No se ejecutó rotación.

## Billing export de solo lectura

Consulta a la exportación estándar de `efeonce-group`, ventana móvil de 30 días al 28-10-2026,
`usage_start_time` entre 29-09 y 28-10, suma de `cost` y créditos por línea, agrupada por
`currency`, proyecto, servicio y SKU. La moneda de la factura es **CLP**, no USD.

| Proyecto / SKU | Neto observado en export estándar |
|---|---:|
| `efeonce-group` / Active HSM ECDSA P-256 key versions | CLP 4.580,93 (947 líneas) |
| `efeonce-group` / Cloud Scheduler Jobs | CLP 7.046,29 |
| `efeonce-globe` / Cloud Scheduler Jobs | CLP 261,64 |

La exportación de recursos devolvió CLP 4.621,44 para el SKU HSM P-256 del mismo proyecto y
ventana (957 líneas); las filas relevantes de KMS y Scheduler no traen `resource.name` ni
`resource.global_name`. La diferencia de CLP 40,51 entre exportaciones no está conciliada.
Por ello el costo HSM observado es del **proyecto**, no una medición atribuible a la CryptoKey
de Auth. Tampoco se midió consumo incremental del Job propuesto: no existe runtime para medir.
El modelo tarifario del plan sigue siendo una proyección en USD y no se convierte a CLP ni se
presenta como factura futura. Faltan perfil real de Job, free tier compartido, logs/Cloud SQL
y política de conservación de versiones para aprobar el costo operativo completo.

No se creó ni modificó recurso cloud, llave, Scheduler, flag o PR durante estas consultas.
