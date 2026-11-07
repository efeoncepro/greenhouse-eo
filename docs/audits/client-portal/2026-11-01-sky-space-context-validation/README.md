# SKY — Permisos y contexto por Space, validación local

2026-11-01 · TASK-2094 · incremento autorizado después de `149aed558`.
**167/167 pruebas PASS, cuatro suites; 78 nuevas de permisos/contexto (39 idénticas por variante)**.
[Recibo por caso y hashes](results.json). Se conservan las 89 anteriores; no son 167 pruebas de autorización.
El runner terminó con exit 0 y retiró su cluster. Datos exclusivamente sintéticos. Ningún cambio en `src`,
producción, credenciales o historia real de Diseño. Task in-progress y ADR Proposed.

## Resultado para la decisión

**La frontera de permisos debe ser Organization + Space + Service + verbo, con identidad vigente por request.**
A′ y B pueden cumplir la misma batería con el contexto candidato; ninguno ofrece ese aislamiento de serie.
A′ no es una solución de seguridad por duplicar `client_id`: Insights sigue leyendo por Organization. B evita
el identificador adicional, pero no permite conservar el default de sesión dependiente de metadata.

La seguridad deja de ser un argumento suficiente para preferir A′. La decisión restante depende de cuánto
cuesta adaptar consumidores legacy y preservar owner/allocations/historia en cada alternativa. No se midió
todavía ese costo ni se implementaron bridges completos. **No aceptar A′ ni B como listos por este PASS.**

## Reproducciones del código vigente

| Caso | Resultado ejecutado | Qué prueba |
| --- | --- | --- |
| Usuarios Diseño, SEO y ambos | Cookie real conserva un solo Space; en A′ SEO resuelve su client, dual sigue Diseño; B toma el Space más reciente | La sesión singular no representa el conjunto de permisos |
| Metadata SEO + refresh | Sólo B cambia el default a SEO | La fecha de edición no puede elegir cuenta operativa |
| Revocar membership | Cookie y App siguen resolviendo identidad; App permite renovar | Membership descriptiva no equivale a permiso revocable |
| Revocar rol manager | Cookie conserva claims antes de 5 min y exactamente a los 5 min; a +1 ms relee y retira rol | Ventana de caché real, con reloj controlado |
| Desactivar usuario | Callback cookie mantiene claims anteriores y actualiza su timestamp; App resolve/refresh rechazan inmediatamente | Diferencia real entre carriles; no se afirma explotación o sesión de navegador productiva |
| Listado Insights con spaceId | Recurso App → reader → authz → store SQL devuelve ambos reports SKY para Diseño, SEO y dual | A′ tampoco recorta ese listado por departamento |
| Otra organización / módulo revocado | Recurso devuelve error 404 | Controles existentes preservados |
| Refresh App | Firma/validación reales, rotación y rechazo de reutilización secuencial; token de acceso anterior sigue válido mientras la sesión durable esté activa | No prueba protección frente a dos refresh concurrentes |
| Revocar sesión App | Token anterior y refresh rechazados; otro user no puede revocarla | Revocación durable real |
| Sesión App expirada / usuario o token falsificados | Denegación; expiración marca estado expired | Controles reales del carril App |
| Space persistido en sesión App | Refresh devuelve contexto actual aunque fila conserve Space original | La columna almacenada no fija el contexto efectivo |

CURRENT GAP caracteriza un incumplimiento respecto del futuro aislamiento departamental; no corrige runtime.
No equiparar refresh de claims NextAuth con OAuth refresh de Efeonce ID, Entra, Google o MCP: no se ejecutaron.

## Contexto candidato probado

`space-context-candidate.ts` sólo existe en experiments. Usa reader PostgreSQL estricto de identidad,
capabilities/entitlement Insights reales, tabla experimental de grants y vínculo experimental report→Space/Service.
No importa ni amplía authority a partir del `client_id` que sugiera el payload. El usuario autenticado llega por
parámetro del servidor y también se contrasta al reutilizar contexto; el contexto seleccionado no es un bearer.

Pruebas positivas/negativas para ambas variantes:

- Usuario de un departamento accede al propio y recibe denegación en el otro; dual selecciona ambos sin mutar
  su cookie ni el contexto de otra petición, incluidas dos selecciones concurrentes.
- Revocar sólo el grant SEO invalida contexto previo y nuevas selecciones; conserva Diseño del dual. Renovar
  token App no resucita SEO. Cambio de versión invalida selección anterior incluso tras reotorgamiento.
- Grant futuro, vencido, de otra Organization, usuario ausente/inactivo, Space o Service inactivo: denegación.
- Grant de lectura no concede creación aunque el rol global sea manager; quitar rol global impide crear
  aunque el grant local diga create. No se ejecuta un command de creación ni se certifican sus transacciones.
- Membership sola no otorga acceso. Debe existir un permiso explícito vigente. Revocar una membership descriptiva
  no es el command candidato para revocar permisos: la futura operación debe revocar el grant/version correspondiente.
- IDs de identidad inyectados en el target no sustituyen al principal servidor; un contexto de otra persona
  no autoriza al caller. Organization/Space/Service y report deben pertenecer al mismo vínculo verificado.
- Cambiar metadata SEO no cambia el target explícito. Después de cada uno de los 78 casos se compara el digest
  del report histórico sintético de Diseño, su Space y el perfil Finance owner: permanecen iguales.

## Real, fixture y fuera de alcance

| Capa | Lógica real | Sustitución explícita |
| --- | --- | --- |
| Identidad | session_360, identity-store, tenant/access y normalización | DDL dependiente mínimo; derivación de vistas UI devuelve vacío y conserva routeGroups reales |
| Cookie | callbacks jwt/session de auth.ts, cifrado/descifrado NextAuth | Secret sintético, reloj Date.now controlado para TTL; no navegador/login HTTP |
| App | create/resolve/refresh/revoke y JWT jose, tabla original TASK-617 | Secret sintético, contraseña bcrypt local; sin tráfico HTTP ni proveedor SSO |
| Insights | listAppInsightReports, resolveScope, reader, authz/can y store SQL | Tabla reports/module_assignments mínima, contexto servidor construido desde tenant real; no wrapper HTTP/rate-limit/auditoría |
| Candidato | SQL real de grants/relaciones + gate Insights existente | Grants y report bindings nuevos sólo en sky_experiment; no schema productivo aprobado |
| Fuera de la lógica bajo prueba | Sin llamados externos | Locale sólo su consulta, observabilidad/intentos y outbox stub; BQ lanza error |

Los users de dos departamentos comparten una identidad; no se crean dos credenciales para simular permisos.
Los client/Space/grants son seed sintético, **no provisioning real**. La tabla App se extrae de la migración
versionada antes de conceder DML al rol local no-superuser. No se certifica paridad de RBAC ni de todo el DDL.
El sandbox bloquea IP; permite UNIX sockets en general y el runner fija/verifica su propio destino PG.

## Límites pendientes y siguiente corte

La selección candidata relee autoridad por request y antes de leer el objeto. No resuelve atomicidad entre
revocación concurrente y un write ya iniciado, cachés distribuidas, UI/menu, session switching real, adopción
de grants, consentimiento externo, enlaces ya emitidos, OAuth, delivery ni la totalidad de rutas legacy.
No se debe integrar simplemente al listado vigente y confiar en él: éste sigue retornando toda la Organization;
los stores deben consumir un scope autorizado o un binding equivalente antes de consultar datos.

Siguiente comparación local: **owner comercial y routing de escrituras**. A′ necesita alta operativa sin perfil
Finance duplicado y normalización de owner; B necesita consumidores Space-aware. Probar mismo Service/evento,
replays fuera de orden, allocations y salida histórica en ambos; después ICO/rematerialización/distribución.
Con eso podrá decidirse por compatibilidad y preservación de historia, no por una promesa de aislamiento.

[Manual](../../../manual-de-uso/insights/validar-blog-y-bridge-localmente.md) ·
[ADR](../../../architecture/GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md) · [QA](QA.md).
