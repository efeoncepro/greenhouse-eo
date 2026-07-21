# Efeonce Globe — Persistencia durable (deja de vivir en la memoria)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-07-21 por Claude (TASK-1465)
> **Ultima actualizacion:** 2026-07-21 por Claude
> **Documentacion tecnica:** [`docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md)

## De qué se trata este documento

Efeonce Globe es la **plataforma hermana de producción creativa** de Efeonce. Greenhouse **no la hospeda**: la **gobierna**. Este documento explica, en lenguaje simple y **desde el punto de vista de Greenhouse**, qué significa que Globe **ya tenga una base de datos durable** (`TASK-1465`): antes recordaba todo en la memoria del servidor y lo perdía en cada reinicio; ahora lo guarda en una base de datos real que sobrevive reinicios y puede correr en varias réplicas a la vez. El detalle técnico vive en la spec enlazada arriba y al final.

## Qué cambió (en simple): de la memoria a una base de datos real

Hasta esta tarea, todo lo que Globe "recordaba" vivía **en la memoria del proceso**: tu sesión de login, el apretón de manos de OAuth, los experimentos del Model Lab, las evaluaciones y el tope de gasto (spend fence). "En memoria" quiere decir dos cosas incómodas:

- **Se borraba en cada reinicio.** Cualquier despliegue nuevo o reinicio del servicio empezaba de cero: la memoria se vaciaba.
- **No se podía crecer a varias réplicas.** Si corrían dos copias del servicio al mismo tiempo, cada una tenía su propia memoria separada, y el tope de gasto —el freno de seguridad— no se podía coordinar entre ellas.

Ahora todo eso vive en una **base de datos real** (PostgreSQL en Google Cloud SQL). Los mismos datos, guardados en disco, que **sobreviven a reinicios** y que **varias réplicas pueden compartir**.

## Qué quedó vivo (desplegado y verificado en el servicio)

Lo importante es que **no es un plan teórico**: se desplegó y se verificó en vivo el 2026-07-21.

- **Base de datos propia de Globe (`globe-pg`).** PostgreSQL 16 en Cloud SQL, región `southamerica-west1`, tamaño chico, con un costo fijo modesto (~US$15–30 al mes). Es **de Globe**, nunca se comparte con Greenhouse.
- **Sin contraseñas en la app (keyless).** La aplicación se conecta como un **usuario de base de datos por identidad IAM**, a través del conector de Cloud SQL — **no hay contraseñas guardadas** en la app corriendo. El acceso es sólo por el conector (no hay puerto abierto a la red).
- **Los cinco almacenes ahora son durables**, detrás de las mismas interfaces de código (cambio transparente, sin reescribir a los consumidores): **experimentos**, **evaluaciones**, el **spend fence** (ahora atómico entre réplicas — el freno de seguridad que recién habilita correr en varias copias), **sesiones + transacciones de OAuth**, y una **bitácora de auditoría** que sólo agrega (append-only), nunca borra.
- **Los dos servicios ya corren durables.** `globe-studio-internal` (la cáscara web de login) y `globe-api-internal` (la API del Model Lab) corren con la base durable y pueden escalar **hasta 3 réplicas** (y bajar a cero cuando no hay uso, así que el extra de plata es prácticamente ~US$0). Cada servicio usa **su propio usuario IAM** de base de datos.
- **Prueba en vivo:** al golpear `/auth/start` en el servicio corriendo, quedó **una fila de transacción de OAuth persistida en Postgres** — la evidencia de que la persistencia durable funciona de verdad, no sólo en un test local.

## Por qué importa

- **Sobrevive reinicios.** Un despliegue o un reinicio ya no borra sesiones, experimentos ni el estado del Model Lab.
- **Habilita alta disponibilidad (varias réplicas).** Con el estado compartido en la base y el spend fence atómico entre réplicas, Globe puede correr en más de una copia sin que el freno de seguridad se descoordine. Ese es el techo que la memoria imponía y que esta tarea levanta.
- **Sigue siendo sin llaves.** El modelo *keyless* del ecosistema se mantiene: identidad IAM en vez de contraseñas, un rol dueño (`globe_owner`) que posee todo y servicios de runtime que sólo leen/escriben. No hay contraseña de administrador viva.

## Cómo lo gobierna Greenhouse

- **Greenhouse es el único control plane operativo:** registra la `TASK-1465`, su lifecycle, QA, cierre documental y handoff — aunque el código de persistencia (`packages/database`) y el runtime vivan en `efeonce-globe`, gobernados por `EPIC-028`.
- **Globe conserva su base de datos y sus secretos.** Greenhouse **no comparte** con Globe base de datos, sesión, bucket, secreto de proveedor, clave de service account ni rol admin. `globe-pg` es de Globe; Greenhouse la gobierna, no la opera por dentro.
- **Todo es interno.** No hay producción ni clientes: esta persistencia sostiene el piloto interno de Globe.

## Qué NO hace

- **No es el ledger de créditos comerciales.** El spend fence durable es un **freno de seguridad** (aborta antes de gastar de más), no el **registro contable** de créditos comerciales. Ese ledger comercial es una capacidad aparte, todavía pendiente. No confundir uno con el otro.
- **No trae el modelo rico de espacios de trabajo / miembros / permisos.** Un modelo detallado de workspace, members y grants queda **diferido** a una tarea posterior.
- **No blindaba el escalado por sí sola.** Al cerrar esta capacidad, `deploy-internal.yml` hardcodeaba `--max-instances=1`. La `TASK-1508` (completa, 2026-07-21) lo cerró: el workflow pasa sólo `--image` y Terraform gobierna los dos topes (servicio y revisión, ambos en 3). No hay workaround que correr.

> **Detalle técnico y operación:**
>
> - Spec técnica canónica de esta capacidad: [`docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md).
> - Manual de operación (correr migraciones, hacer durable un servicio, señales y problemas comunes): [`docs/manual-de-uso/creative-studio/operar-persistencia-globe.md`](../../manual-de-uso/creative-studio/operar-persistencia-globe.md).
> - Continuidad de runtime en vivo: [`docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).
> - Infraestructura keyless que la sostiene: [`efeonce-globe-infra-keyless.md`](efeonce-globe-infra-keyless.md).
> - Capacidad que se apoya en esta persistencia: [`Model Lab`](efeonce-globe-model-lab.md).
> - ADR y arquitectura del programa: [`EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) + [`..._ARCHITECTURE_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md).
> - Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md) · task: `docs/tasks/**/TASK-1465-*.md`.
> - Para trabajar sobre Globe, invocar la skill **`greenhouse-globe`**.
