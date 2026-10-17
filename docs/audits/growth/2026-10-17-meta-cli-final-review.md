# Revisión final local — CLI Meta y recibos Meta/HubSpot

- Fecha: 2026-10-17. Owner: Growth / Measurement / Integrations.
- Estado: código y documentación revisados; activación y despliegue pendientes por decisión del operador.
- Base revisada: `12e2109e2` (recibos Meta) y `b2ece46e5` (identidad nativa HubSpot).

## Fallos corregidos

1. **Cobertura Meta:** `paging`/`next`/`cursors` malformados podían declararse como fin de lista.
   Se conserva lo leído y se devuelve cobertura parcial con error seguro, sin cursor de reanudación inventado.
2. **Varios destinos HubSpot:** agregar matches exactos convertía la correlación de formulario en
   identidad de contacto; el modelo la degradaba a ambigua mientras la CLI salía con cobertura completa.
   Ahora agrega por la misma ocurrencia `fsub-*`; cada ID nativo sigue en su comprobación individual.
   Un resultado mixto exacto/correlacionado conserva `partial` y exit6.
3. **Historial nativo incompleto:** una fila con marcador exacto pero `conversionId` ausente/inválido
   podía anunciarse como exacta. Ahora queda indisponible/parcial, sin ID ni confirmación fabricados.
4. **Reconciliación bloqueada por fecha:** el cast directo de un `nextCheckAt` inválido abortaba el
   batch. `CASE` con `pg_input_is_valid` evita evaluarlo y permite consultar el siguiente recibo válido.
   El contrato requiere fechas UTC reales y checks/fecha de comprobación coherentes; `verified`
   exige al menos un check y paginación completa, también al leer recibos persistidos.
5. **Historial Meta:** se rechazan intentos reordenados y una observación Graph posterior a su propio
   registro durable más allá de cinco minutos de tolerancia. Se permiten huecos de intentos sin
   evidencia persistida. Un historial inválido nunca acredita recepción.

## Verificación local

- Vitest: **426 pruebas / 26 archivos**, incluidos los 24 nuevos casos de regresión.
- Node test runner: **36 pruebas**, consentimiento/atribución y Client sGTM autenticado.
- TypeScript estricto focalizado y ESLint de los paths propios; cierre documental y contexto estricto.
- PostgreSQL 17.5 aislado (PGlite): Up de ambos SQL pendientes repetido; CAS, historial, identidad,
  terminales y aislamiento Google. Ejecución del store canónico real mediante Kysely en esa base:
  tres filas antiguas con fechas inválidas/null no bloquean un candidato válido con límite uno.
- Template Meta completo bajo VM: mismas peticiones salientes que upstream; opción OFF, contexto,
  permisos, concurrencia y cuerpos malformados conservan la semántica anterior del tag.
- La CLI de escritura mantiene plan/hash, Ads PAUSED, ownership, recibo privado, checkpoint previo
  al POST y recuperación GET sin repetir un resultado desconocido; se reejecutó su suite sin red.

Artefactos privados fuera del repo:
`/Users/jreye/Documents/Meta-Efeonce-Connection/final-review-2026-10-17/`.
Los fixtures y mocks no contienen credenciales ni leads reales. Los tests no certifican publicación
Meta, provisión HubSpot ni recepción de tráfico productivo.

## Estado operativo y cierre documental

Se actualizaron manuales/contratos funcionales de la CLI y ambos recibos, los ADR dueños,
Handoff/changelog y las skills Forms/GTM espejadas Codex/Claude. El índice de decisiones conserva
las mismas decisiones aceptadas; no hay nueva autoridad, servicio o contrato público.

No hubo push, despliegue, migración compartida, activación de flags/checkbox, cambios GTM/HubSpot,
publicación, eventos o reenvíos. Ambos SQL siguen fuera de `migrations/`; el template sigue default
OFF. Pendientes: release autorizado, schema, propiedad/campo/mapping HubSpot, Preview/compilación
nativa GTM y readback del próximo envío real autorizado. El lead histórico conserva su evidencia
anterior: esta revisión no lo reconsultó ni lo promovió a identidad exacta o procesamiento Meta.
