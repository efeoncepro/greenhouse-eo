# Efeonce Rooms — índice de manuales

> **Tipo de documento:** Manual de uso (índice de carpeta)
> **Version:** 1.0
> **Creado:** 2026-11-01 por Claude
> **Ultima actualizacion:** 2026-11-01 por Claude
> **Documentacion tecnica:** [Dossier de Rooms](../../architecture/rooms/README.md) · [API y acceso](../../architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md)

## Para qué sirve esta carpeta

Aquí están los manuales para operar Rooms: la plataforma comercial de Efeonce con salas privadas por oportunidad. El
código vive en el repo `efeoncepro/efeonce-rooms`; la documentación, aquí. Rooms está en producción para el equipo
de Efeonce y todavía no tiene clientes reales.

## Producción

| Manual | Para qué |
|---|---|
| [Operar Rooms en producción](operar-produccion-rooms.md) | Deploy activo y alias manual, interruptores, migraciones con respaldo y gate de migraciones revisadas, rollback e `identity_unbound`. |
| [Administrar el acceso interno](administrar-acceso-interno.md) | Dar, renovar y revocar acceso del equipo; atender un código de solicitud de la página «Casi.». |
| [Nombrar el espacio de trabajo](nombrar-espacio-de-trabajo.md) | Poner o cambiar el nombre legible de una organización (`organization.rename`), con sesión o con la herramienta administrativa. |
| [Operar el worker privado de imágenes](operar-worker-medios.md) | Scheduler/Job, leases, comprobación y rollback. |

## Desarrollo e integración local

| Manual | Para qué |
|---|---|
| [Operar Rooms en desarrollo](operar-primera-experiencia-local.md) | Sesiones y fixtures aislados, sin autoridad productiva. |
| [Operar el backend local](operar-backend-local.md) | Base local, migraciones, suites y recovery. |
| [Integrar Claude Design en local](integrar-claude-design-local.md) | Entorno aislado y SDK tipado; sin publicación ni activación productiva. |

## Relacionados

- Invitación por correo y código: [manual de identidad](../identity/operar-invitacion-rooms-email-otp.md).
- Qué ve cada persona: [quién ve qué en Rooms](../../documentation/rooms/quien-ve-que-en-rooms.md).
- Acceso del equipo, nombre del espacio y entrada sin sesión: [acceso interno](../../documentation/rooms/acceso-interno-rooms.md).
