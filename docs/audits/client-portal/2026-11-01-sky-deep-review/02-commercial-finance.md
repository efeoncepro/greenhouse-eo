# SKY: ownership comercial y Finance frente a A′ y B

Fecha: 2026-11-01. Auditoría estática local; referencia de checkout observada: `985f84d3c`.
Alcance: complementar ADR de cuentas operativas y revisión crítica previa.
No se consultó ni modificó producción, proveedores, secretos ni datos de clientes.
No se ejecutaron las pruebas propuestas abajo. La evidencia demuestra ramas de código, no su frecuencia en producción.

## Conclusión

La elección no queda resuelta por añadir `commercialOwnerClientId` a un prototipo.
A′ separa identidades operativas, pero introduce dos significados para `clients`: cliente comercial y puente operativo.
Ese segundo significado necesita contrato explícito y consumidores adaptados; hoy hay comandos que interpretan `client` como alta comercial con perfil Finance.
B evita introducir una segunda fila `clients` para SKY; no elimina la ambigüedad de Space ni demuestra aislamiento por servicio.

La recomendación financiera es conservar una identidad comercial canónica, dimensiones operativas explícitas y trazabilidad de cada hecho.
Owner común no obliga a contrato único, factura única, condiciones idénticas ni una sola relación de stakeholders.
Diseño y SEO pueden tener contratos, órdenes y facturas propios y consolidar bajo la misma organización comercial.
Normalizar owner para consolidación no debe borrar `space_id`/`service_id` ni distribuir automáticamente los costos de un servicio al otro.

## 1. Perfiles: corrección importante sobre el supuesto reanclaje automático

El helper de escritura tiene un fallback por Space reciente cuando recibe organización sin cliente resuelto.
Evidencia: `src/lib/finance/postgres-store-slice2.ts:1189–1204`.
No alcanza con leer ese helper para afirmar que editar un perfil existente cambia su cliente a SEO.

La ruta POST resuelve primero `organizationId`, `clientId`, `clientProfileId` y HubSpot.
Entrega explícitamente `resolvedClient.clientId` a `upsertFinanceClientProfileInPostgres`.
Evidencia: `src/app/api/finance/clients/route.ts:650–655,692–697`.
Por tanto, que el navegador omita `clientId` no significa que la escritura lo reciba ausente.

El resolver SQL prioriza `cp.client_id` sobre el puente de Spaces mediante `COALESCE`.
Después, `canonicalClientId` prioriza el parámetro explícito y el perfil antes de otros candidatos.
Evidencia: `src/lib/finance/canonical.ts:177–204,347–352`.
Un perfil existente con cliente no nulo protege la resolución ordinaria organization-only.

La ruta PUT sólo vuelve a resolver si cambia alguno de `clientId`, `hubspotCompanyId` o `clientProfileId`.
Al hacerlo, completa parámetros con los valores del perfil existente.
La escritura usa `resolvedClient?.clientId ?? existing.clientId`.
Evidencia: `src/app/api/finance/clients/[id]/route.ts:935–942,957–977`.
Una edición ordinaria de nombre, moneda o condiciones no alcanza el fallback org-only si el perfil ya tiene cliente.
Esta evidencia corrige cualquier formulación genérica de reanclaje automático en la revisión anterior.

Riesgo residual verificado: la resolución sin perfil/cliente canónico puede usar el Space activo más reciente.
El CTE `client_bridge` selecciona por organización y `updated_at DESC`; el helper conserva otra selección equivalente.
Un alta o reparación de contexto incompleto requiere probarse con dos Spaces y distintos clientes.
No se demostró aquí que la UI actual de SKY produzca esa condición ni que SKY tenga un perfil incompleto.

El resolver también devuelve un Space elegido por recencia cuando falta uno preferido.
Evidencia: `src/lib/finance/canonical.ts:389–405`.
Eso es distinto de cambiar el owner: B puede conservar owner correcto y aun así elegir un Space inadecuado.
La existencia de este fallback no prueba que todos sus consumidores lo persistan.

Protecciones adicionales: errores 409 para cliente/perfil inexistente y conflictos de perfil, cliente o HubSpot.
Evidencia: `src/lib/finance/canonical.ts:310–386`.
No equivalen a una policy completa de `commercial owner` versus `operating client`.

## 2. Alta comercial: A′ no debe reutilizar el comando de nuevo cliente

`instantiateClientForParty` obtiene la organización y llama `organizationHasClient` antes de insertar.
Si existe cliente, lanza `OrganizationAlreadyHasClientError`.
Evidencia: `src/lib/commercial/party/commands/instantiate-client-for-party.ts:77–94`.
El comando crea tanto `greenhouse_core.clients` como `greenhouse_finance.client_profiles`.
Evidencia: mismo archivo `:106–158`.

`organizationHasClient` detecta cliente por perfil Finance o por Company HubSpot de la organización.
Evidencia: `src/lib/commercial/party/party-store.ts:89–120`.
Es una protección real contra una segunda alta comercial, no una prueba de soporte para dos cuentas operativas.
El nuevo puente operativo de A′ no debe eludirla fingiendo que SEO es una organización nueva.
Tampoco debe crear un segundo perfil Finance por efecto colateral de ese comando.

A′ exige definir qué operaciones aceptan el puente hijo y cuáles deben resolver primero su owner.
Los listados y conteos deberán distinguir clientes comerciales de cuentas operativas.
No se auditó exhaustivamente el universo de listados: se propone el invariante, no se afirma que todos hoy dupliquen.
B reduce esta superficie porque mantiene una sola fila cliente, pero exige que cada operación sensible reciba Space/servicio.

## 3. Ingreso: owner explícito no equivale a atribución de servicio

El POST de ingresos llama al resolver con `clientId`, `clientProfileId` y `hubspotCompanyId`.
No solicita `organizationId` ni `spaceId` en esa invocación.
Evidencia: `src/app/api/finance/income/route.ts:280–288`.
La escritura usa los identificadores resueltos de cliente, organización y perfil.
Evidencia: mismo archivo `:343–346`.

Esto confirma que cambiar sólo el binding de Spaces no vuelve automáticamente cada factura específica de SEO.
No demuestra que falten todas las vías de atribución: líneas, contratos o reglas posteriores pueden aportar servicio.
La inspección de esas vías y sus UI no se completó en este informe; no se declara una regresión concreta en ellas.

Existe un resolver downstream que combina contexto Finance con `resolveExpenseSpaceScope`.
Usa `requestedSpaceId` si existe y en su ausencia `resolvedClient.spaceId`.
Puede requerir explícitamente un puente legacy y rechazar con 422 si falta.
Evidencia: `src/lib/finance/canonical.ts:506–548`.
Ese control preserva integridad básica; no acredita que elegir el Space reciente sea una decisión de negocio válida.

## 4. P&L y costos: peligro de dividir los hechos por claves distintas

La materialización de atribución construye `clientRevenueWeights` por `fact.clientId`.
Los costos comerciales buscan esos pesos por `row.client_id`.
Evidencia: `src/lib/service-attribution/materialize.ts:1241–1263`.
Si ingresos permanecen bajo owner común y costos de SEO pasan al cliente operativo hijo, no comparten clave.
No se arregla normalizando sólo el índice de servicios: hay que seguir ingresos, costos y allocations hasta el resultado.

Contraargumento importante: el código no reparte ciegamente todos los costos al primer servicio.
Sin ingresos usa fallback sólo cuando hay exactamente un servicio candidato para ese cliente.
Si no consigue pesos, registra unresolved con `no_resolved_revenue_share`.
Evidencia: mismo archivo `:1264–1307`.
Por tanto, los fallos posibles incluyen pérdida de cobertura o filas unresolved, además de atribución incorrecta.

El P&L de clientes también usa mapas por `clientId` para ingresos, allocations, gastos directos y costos comerciales.
Puede crear filas de costos sin ingreso para clientes ausentes del conjunto de ingresos.
Evidencia: `src/lib/finance/postgres-store-intelligence.ts:550–619`.
A′ puede conservar el total global y aun separar margen/ingreso/costo en filas semánticamente engañosas.
No se certificó el consolidado completo de organización en esta revisión; hay que comprobar conservación y deduplicación.

## Fuente única propuesta e invariantes

La relación puente operativo → owner comercial debe pertenecer al modelo canónico de identidad comercial/Core.
Finance debe consumir ese contrato mediante un resolver compartido; no mantener una tabla paralela inferida por recencia.
Esta es una propuesta de diseño, no un campo ya aprobado ni implementado.
Conservar dimensiones separadas: organización, owner comercial, Space, servicio, contrato y documento fuente.
La normalización sirve para identidad/consolidación; la atribución requiere evidencia propia del hecho.

- Abrir SEO no cambia el owner de un perfil o documento existente.
- Una organización SKY, un cliente comercial SKY y dos cuentas operativas son conteos distintos.
- Cada ingreso/costo entra una vez al consolidado, aun si aparece en vistas de owner y Space.
- Ingreso y costo por servicio no colapsan al normalizar owner.
- La suma de atribuido más unresolved conserva el importe fuente, con tolerancia de redondeo declarada.
- La ausencia de atribución no autoriza cargar el residuo a Diseño.
- Contratos y facturas por servicio pueden ser independientes y compartir contraparte comercial.

## Pruebas de integración propuestas: no ejecutadas

Usar PostgreSQL local aislado con schema real y adaptador DB dirigido expresamente a esa instancia.
Fixtures sintéticas: organización `org-test-sky`, cliente comercial `client-owner`, perfil `cp-owner`, Spaces `sp-design`/`sp-seo`.
A′ añade `client-seo`; B mantiene `client-owner` en ambos Spaces.
Documentos y montos inventados: ingreso Diseño 100, SEO 60; costos 40/20; moneda única para aislar identidad.
Sin copiar registros, contactos, RUT ni credenciales. Bloquear fallback externo durante el test.

1. Resolver y POST perfil con organización solamente y perfil no nulo: actualizar `sp-seo.updated_at`; owner permanece `client-owner`.
2. PUT perfil existente cambiando sólo condiciones: ejecutar handler real; perfil conserva client, organización e historial documental.
3. Contexto org-only sin perfil cliente y dos puentes: demostrar selección actual por recencia; el contrato objetivo debe rechazar ambigüedad o usar owner persistido.
4. Resolver con perfil y cliente incompatibles: esperar 409 y cero escrituras; repetir después de agregar el puente A′.
5. `instantiateClientForParty` sobre organización con owner: esperar error existente y ningún cliente/perfil adicional; futura creación operativa debe probar su propio comando separado.
6. Dos ingresos con contratos/servicios distintos y owner común: ejecutar ingreso y atribución reales; conservar owner y producir 100/60 por servicio, sin inferir servicio por Space reciente.
7. Materialización con costo SEO en puente hijo e ingresos en owner: medir estado actual y luego contrato candidato; 20 queda atribuible por evidencia o unresolved explícito, nunca perdido ni trasladado a Diseño por conveniencia.
8. P&L real con ambos Spaces: owner consolidado 160 ingresos/60 costos y servicios 100/40, 60/20; ningún join duplica y la cuenta comercial sigue contando una vez.
9. Factura por servicio con pago parcial y eventual anulación: probar conservación del vínculo factura/pago y separación de ingresos versus caja; localizar primero el comando real de pagos, no simularlo como suma inventada.

Casos 6 y 9 necesitan completar el trazado de contratos, líneas y pagos antes de implementar el harness.
No constituyen afirmaciones de cobertura actual ni resultados aprobados.

## Criterios para elegir o descartar

A′ sólo es defendible si la identidad operativa hija tiene semántica explícita, alta propia y owner inequívoco.
Debe superar pruebas de resolución, atribución y conteos; el éxito del prototipo en memoria no es suficiente.
Su costo cualitativo se concentra en clasificación de clientes, normalización de consumers y compatibilidad de Finance.
B evita la doble semántica de filas `clients`, pero requiere eliminar dependencia implícita de cliente→Space único.
Su costo se concentra en propagación de Space/servicio y rechazo de operaciones ambiguas.
Descartar cualquiera que necesite reasignar el histórico de Diseño para funcionar o que sólo cuadre el total sacrificando el detalle.
No estimar duración sin inventario completo de consumers y una prueba local de extremo a extremo.

## Límites de esta entrega

Se verificaron perfiles, resolver, alta comercial, entrada de ingresos y dos núcleos de atribución/P&L.
No se completó inventario de todas las UI, contratos, cotizaciones, pagos, exportaciones, consolidadores y constraints de DB.
No se probó concurrencia, migración ni estado real de SKY; no se afirma ausencia de duplicados actuales.
El estudio temporal de rematerialización histórica pertenece al otro frente de auditoría.
