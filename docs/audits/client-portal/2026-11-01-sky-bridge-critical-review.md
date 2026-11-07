# SKY — Revisión crítica del puente operativo y del orden de implementación

Fecha: 2026-11-01. Código local contrastado en `17dd51776`. Tres subagentes de revisión independientes
(identidad/acceso, finanzas/historia, sync/medición) y consolidación del agente principal. Sin conexiones DB,
proveedores, producción o cambios de runtime. Los hallazgos son riesgos demostrables en código; no incidentes
confirmados en la cuenta real.

> Ampliado por la [revisión profunda de seis frentes](2026-11-01-sky-deep-review/README.md). Ésta precisa
> reachability y protecciones: el PUT Finance conserva el client existente; la sesión actual selecciona por
> LATERAL; ICO ordinario respeta locked; Notion ya tiene writer PG programado. Usar esa revisión para la
> decisión vigente y las condiciones exactas, conservando este documento como etapa anterior del análisis.

## Dictamen

**Diferir la aceptación de A′ y la elección definitiva del bridge.** Mantener el modelo de una Organization
con Spaces operativos, preservando Diseño. A′ conserva una ventaja en algunos selectores legacy, pero no hay
evidencia suficiente para concluir que su riesgo/costo total sea menor que B. Tampoco se ha demostrado que B
sea implementable sin convertir sus readers/writers client-only.

La recomendación anterior de aceptar A′ era prematura. El [ADR](../../architecture/GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md)
permanece Proposed. TASK-2073 conserva su cierre como experimento acotado; sus PASS no certifican el sistema real.

**Corregir el orden:** filtro/proyección y validación interna del Blog pueden avanzar sin crear otro Space.
Esto ya estaba permitido en el discovery de medición (§ final, línea 295). Apertura departamental, biblioteca,
exportación y distribución requieren el aislamiento completo. La urgencia del informe no justifica dar por
resuelto el bridge; tampoco obliga a detener el desarrollo interno de los productores de medición.

## Hallazgos prioritarios

### 1. Identidad: una persona en ambas cuentas no está resuelta

`src/lib/client-onboarding/invite-client-portal-user.ts:105–155` reutiliza usuario por correo y asigna roles
globales; no concede el Space solicitado. La entrega separada rechaza otro client en `:276–277`.
`src/lib/my/ensure-client-membership.ts:18–29` considera suficiente una membership de la Organization;
`:55` usa `pm-cu-${userId}` como clave única de alta. Ese camino no modela dos memberships por persona.

`src/lib/tenant/identity-store.ts:285–291` toma la primera fila de sesión y `src/lib/auth.ts` reconstruye client,
Space, módulos, flags y scopes desde el tenant. Seleccionar sólo Space o sólo client no prueba un contexto
consistente tras refresh. El prototipo precarga memberships y cambia contexto en memoria, sin estos commands.

**Prueba exigible:** una persona con dos grants mediante command real, selección/refresh/revocación y readers
client-only y org-scoped con caches calientes. Cubrir sesión y App/bearer. No se afirma una fuga explotable
sin recorrer los gates reales de cada ruta.

### 2. El bridge no separa por sí solo lectores de Organization

`src/lib/api-platform/resources/app-insights-scope.ts:19–37` devuelve org/subject sin Space.
`src/lib/account-360/resolve-scope.ts:10–40` agrega Spaces/clients de la organización;
`src/lib/account-360/facet-cache.ts:23–33` usa key por org/facet/versión.
Ambos candidatos necesitan revisar autoridad de los recursos, scope efectivo y caches. Tener un claim Space
no equivale a aplicarlo en todas las lecturas.

### 3. Finance: una edición puede reanclar el perfil existente

`src/lib/finance/postgres-store-slice2.ts:1189–1204`, ante Organization sin client, elige el client del Space
activo más actualizado. El upsert de `:1236–1239` puede sustituir el client del mismo perfil financiero.
Con A′ podría elegir el bridge SEO. El sync masivo tiene otra precedencia y conserva el client existente:
probar un camino no certifica el otro.

La normalización debe abarcar también costos y P&L: `src/lib/service-attribution/materialize.ts:1241–1307`
distribuye labor/overhead mediante pesos por client; `src/lib/finance/postgres-store-intelligence.ts:550–619`
agrupa ingresos/costos por client. Normalizar únicamente candidatos de servicios deja contratos abiertos.

### 4. Historia: rematerializar puede reinterpretar el pasado

`src/lib/service-attribution/materialize.ts:659–672` lee el Space/client actual y servicios activos;
`:1353–1364` elimina facts/unresolved del mes antes de reconstruirlos. Mover o inactivar un servicio y recalcular
un mes anterior puede cambiar su atribución aunque las facturas originales permanezcan intactas.
Es riesgo compartido por A′ y B. Se necesita ownership temporal/versionado o congelación/corrección gobernada.

**Prueba exigible:** calcular un mes anterior, introducir split, repetir y contrastar hechos, totales, errores
y correcciones. Incluir gastos, staffing, labor, overhead, períodos cerrados e inactivación del servicio.

### 5. Services y Notion pueden volver a asignar datos

`src/lib/services/service-sync.ts:117–121` elige Space por Company con LIMIT 1, sin filtrar active.
`src/lib/services/upsert-service-from-hubspot.ts:146–147` sobrescribe Space/Organization.
Un Space inactivo no evita el riesgo; afecta a A′ y B.

`src/lib/space-notion/space-notion-store.ts:33–39` selecciona fuente por client con LIMIT 1.
`scripts/sync-source-runtime-projections.ts:1376–1379` hace upsert por notion_project_id y reemplaza Space/client.
Una fuente duplicada puede reatribuir proyectos. La prueba debe ejecutar el writer real con replay y ownership
conflictivo; no copiar la base de Diseño para alimentar SEO.

### 6. Medición: el modelo de URLs no equivale a los productores reales

- **GA4:** `src/lib/growth/analytics-ga4/reader.ts:11,27–45` sólo admite reglas de landing path, sin hostName.
  El prototipo usa una landingUrl absoluta inventada. Definir separadamente sesiones cuya entrada es el blog
  y actividad en páginas del blog; probar navegación raíz↔blog y el alcance de las dimensiones/aggregations.
- **Requisitos:** `src/lib/efeonce-insights/commands/generation.ts:140–142` verifica hechos por módulo y permite
  allowPartial; los hechos GA4 pueden integrarse al módulo SEO. Necesitamos requisitos por productor y cobertura
  para el encargo Blog: GA4, GSC y corrida AEO, sin sustituir fuentes ausentes por cero o AI referrals.
- **AEO:** `src/lib/growth/ai-visibility/observation.ts:81–87` conserva dominio del proveedor y URL original;
  una URL puede ser redirect. `report/citation-breakdown.ts:125–128` excluye observaciones fallidas y agrupa
  dominios registrables. El simulador cuenta todas sus observaciones y parsea URLs directas. No resuelve destino
  desconocido, fallos, duplicados ni comparabilidad de paneles.
- **Comportamiento que conservar:** `src/lib/efeonce-insights/adapters/aeo-adapter.ts:37–64` selecciona corrida
  terminada dentro de ventana y comprueba readiness; no corresponde afirmar que siempre usa el último run global.

## Qué demuestran realmente las pruebas previas

Se reejecutó el wrapper restringido: **97/97 PASS**, sin omitidos. El evaluador `evaluate.mjs:11–12` elige A′
por cardinalidad de fuentes y sesiones, no por una comparación completa de Finance/acceso. Los anchors prueban
presencia de snippets, no que se ejecutaron sus contratos. El path auth del ADR había quedado stale: ahora es
`src/lib/auth.ts`, no `src/auth.ts`; ese archivo no está cubierto por los anchors.

El hash de `state.history` (`scenarios.mjs:136–137`) permanece igual porque las operaciones del modelo no ejecutan
la rematerialización de esa estructura. Es evidencia válida de no mutación del fixture, no protección histórica real.

Dos contraejemplos adicionales ejecutados por el agente principal, sólo con fixtures en memoria:

| Caso | Resultado del prototipo | Límite demostrado |
| --- | --- | --- |
| Dos servicios en el Space SEO; leer con serviceId SEO | devuelve project-seo y project-second-service | readProjects filtra Space, no Service |
| Factura con spaceId Diseño; candidatos normalizados | devuelve service-design y service-seo | modelo ignora prioridad explícita de Space; el código real la aplica en materialize:527–530 |

No son afirmaciones de bugs idénticos en producción. Muestran por qué ampliar sólo los fixtures no sustituye
una prueba de integración. El rol `operating` y `commercialOwner` del simulador tampoco son schema aprobado.

## Próximo paso recomendado

1. **Medición interna:** especificar poblaciones/métodos/cobertura del Blog y ejercitar los productores reales
   con fixtures representativos. Reutilizar los owners de TASK-2033/1960. Sin emitir informes ni abrir acceso.
2. **Experimento de integración A′/B:** PostgreSQL local aislado, tablas/vistas y commands/readers reales;
   misma batería para ambas variantes. Primero reproducir los fallos existentes, después probar cambios.
3. **Matriz obligatoria:** grant de segunda cuenta, refresh/revoke, API/portal/cache, edición/sync de perfil Finance,
   P&L/costos, replay Services/Notion y rematerialización histórica. Definir schema/ownership del puente y rollback.
4. **Decidir con resultados:** comparar superficies reales a modificar y riesgos residuales; entonces aceptar
   el ADR o cambiar la alternativa. Hasta ese punto, no crear un segundo Space/client en una base compartida.

No se calcula una estimación de esfuerzo sin inventario y prueba de esos contratos. Las mediciones reales de
SKY/cobertura del 27-10 no se refrescaron en esta revisión; no se presentan como vigentes al 01-11.
