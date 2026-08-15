/**
 * Precios del proveedor DataForSEO Labs — hecho PURO, runtime-agnóstico.
 *
 * ⚠️ Este módulo NO lleva `import 'server-only'`, y ésa es toda su razón de existir.
 *
 * Los dos números vivían dentro de `keyword-market-data.ts`, que sí es server-only porque
 * habla con el proveedor y escribe en PostgreSQL. Pero un precio no es una capacidad de
 * servidor: es un dato del contrato comercial, y el **preview de costo del builder lo necesita
 * en el browser** para que la banda responda mientras el operador escribe, sin un round-trip
 * por tecla.
 *
 * Mientras estuvieron ahí, cualquier componente cliente que importara el estimador de costo
 * arrastraba `server-only` de forma TRANSITIVA — un fallo que el typecheck no ve (los tipos
 * resuelven perfecto) y que sólo aparece al compilar la ruta. Es el mismo patrón que separa
 * los tokens de diseño del theme para el código que empaqueta el worker: **el dato viaja, la
 * capacidad no**.
 *
 * Verificado contra la doc oficial (as-of 2026-08-06): el modelo es DUAL — se cobra el task
 * setup de cada request Y cada fila devuelta.
 * Fuente: `.claude/skills/dataforseo-operator/references/02-labs.md` §5.
 */

/** Costo fijo por request a un endpoint Labs, independiente de cuántas filas vuelvan. */
export const LABS_TASK_SETUP_USD = 0.012

/** Costo por fila devuelta. Se paga por lo SOLICITADO, así que el `limit` es la palanca real. */
export const LABS_RESULT_ROW_USD = 0.00012
