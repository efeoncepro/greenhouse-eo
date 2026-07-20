# Efeonce Globe — Infraestructura como código, despliegue sin llaves (viva)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-19 por Claude (TASK-1464)
> **Ultima actualizacion:** 2026-07-19 por Claude
> **Documentacion tecnica:** [`docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md) (repo hermano)

## De qué se trata este documento

Efeonce Globe es la **plataforma hermana de producción creativa** de Efeonce. Greenhouse **no la hospeda**: la **gobierna**. Este documento explica, en lenguaje simple y **desde el punto de vista de Greenhouse**, qué es la **infraestructura como código (IaC)** de Globe que se aplicó en `TASK-1464`, por qué ya está **viva**, y cómo encaja en el gobierno del ecosistema. El detalle técnico paso a paso vive en el repo `efeonce-globe` (enlace arriba y al final).

## Qué es (en simple)

Toda la infraestructura de Globe en la nube (GCP, proyecto aislado `efeonce-globe`) se escribió **como código** con Terraform, en lugar de configurarse a mano por consola. "Como código" significa dos cosas prácticas:

- **Reproducible.** La infraestructura está descrita en archivos versionados; se puede leer, revisar y volver a aplicar sin depender de la memoria de nadie.
- **Idempotente.** Aplicar dos veces lo mismo no rompe ni duplica nada: si ya existe tal como está descrito, se deja igual.

## Qué quedó vivo (se aplicó de verdad, supervisado)

Lo importante de esta tarea es que **no es un plan teórico**: se **aplicó contra GCP de forma supervisada** el 2026-07-19, con un resultado limpio y verificable:

> **23 importados, 13 nuevos, 0 destruidos.**

Ese número cuenta una historia de cuidado:

- Los **23 importados** son recursos que **ya existían y estaban vivos** —las identidades del bridge de identidad (`TASK-1454`), el puente de credenciales de Vercel (WIF), el registro de artefactos, los permisos IAM— y que Terraform **adoptó sin tocarlos ni recrearlos**. Adoptar en vez de recrear evita cualquier interrupción de lo que ya funcionaba.
- Los **13 nuevos** son lo que esta tarea agregó.
- Los **0 destruidos** son la prueba de que **nada vivo se rompió** en el camino.

Entre lo que quedó **vivo y nuevo**:

- **Despliegue sin llaves (GitHub WIF).** El pipeline de despliegue se autentica por identidad federada (OIDC → WIF), **sin claves de service account** guardadas en ningún lado. Menos secretos que rotar, menos superficie de riesgo.
- **Bucket privado de evidencia del Lab.** El almacenamiento privado donde el Model Lab guardará su evidencia — privado por diseño, sin acceso público.
- **Estado remoto.** El "estado" de Terraform (el registro de qué existe) vive en un bucket remoto versionado, no en la máquina de una persona.
- **Alerta anti-llaves.** Una señal de observabilidad que **avisa si alguien crea una clave de service account** — porque el modelo es *keyless* (sin llaves), y crear una llave violaría ese invariante.

## Cómo lo gobierna Greenhouse

- **Greenhouse es el único control plane operativo:** registra la `TASK-1464`, su lifecycle, QA, cierre documental y handoff — aunque el código Terraform y el runtime vivan en `efeonce-globe`, gobernados por `EPIC-028`.
- **Globe conserva su infraestructura y sus secretos.** Greenhouse **no comparte** con Globe base de datos, sesión, bucket, secreto de proveedor, clave de service account ni rol admin. Esta IaC vive del lado de Globe; Greenhouse la gobierna, no la opera por dentro.
- **Base para el Model Lab.** Los outputs versionados de esta infraestructura (bucket privado, credenciales federadas, alertas de presupuesto) son lo que habilita conectar el **primer proveedor real** al [Model Lab](efeonce-globe-model-lab.md) más adelante. El Model Lab **no duplica** esta IaC: la consume.
- **Todo es interno.** No hay producción ni clientes; esta IaC sostiene el piloto interno de Globe.

## Qué NO hace

Esta IaC **no despliega por sí sola** los servicios de la aplicación de Globe (eso lo hace el pipeline sin llaves) ni conecta ningún proveedor de IA: solo deja **lista y gobernada** la base (identidades, despliegue keyless, bucket privado, estado remoto, presupuesto y alertas). Conectar un proveedor real es un paso posterior, con sus propios gates.

> **Detalle técnico y operación (repo hermano `efeonce-globe`):**
>
> - Runbook de infraestructura (bootstrap del state bucket, init/plan/apply supervisado, GitHub WIF, smokes, rollback): [`docs/operations/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md).
> - Contrato de conectividad e identidad con Greenhouse: [`docs/architecture/GREENHOUSE_CONNECTIVITY_V1.md`](../../architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md).
> - Invariantes de fundación de la plataforma: [`docs/architecture/PLATFORM_FOUNDATION_V1.md`](../../architecture/creative-studio/PLATFORM_FOUNDATION_V1.md).
>
> **Gobierno en Greenhouse:**
>
> - Capacidad que se apoya en esta infra: [`Model Lab`](efeonce-globe-model-lab.md).
> - ADR y arquitectura del programa: [`EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md) + [`..._ARCHITECTURE_V1.md`](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md).
> - Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md) · task: `docs/tasks/**/TASK-1464-*.md`.
> - Para trabajar sobre Globe, invocar la skill **`greenhouse-globe`**.
