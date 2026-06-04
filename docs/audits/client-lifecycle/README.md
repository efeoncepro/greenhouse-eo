# Client Lifecycle — Audits

Auditorías sobre el nacimiento, ciclo de vida y completitud del objeto Cliente / Organización (canonical 360).

| Audit | Fecha | Resumen |
|---|---|---|
| [CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02](CLIENT_BIRTH_FRAGMENTATION_AUDIT_2026-06-02.md) | 2026-06-02 | Fragmentación del nacimiento del cliente: ≥4 puertas de escritura independientes sin helper SSOT, ninguna escribe la fila `organizations` completa, sin señal de drift. Caso fuente Grupo Berel (nacido a medias por HubSpot). Propone activar/extender `GREENHOUSE_CLIENT_LIFECYCLE_V1` + helper de escritura canónico + puerta única de onboarding + señales de drift. |

> Verificar vigencia antes de confiar: si las puertas de escritura o el modelo `organizations`/`lifecycle_stage`/`organization_type` cambiaron, abrir refresh.
