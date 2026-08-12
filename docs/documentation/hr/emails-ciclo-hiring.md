# Emails del Ciclo de Hiring — Notificaciones a Candidatos y People

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-12 por Claude (TASK-1689)
> **Ultima actualizacion:** 2026-08-12 por Claude (TASK-1689)
> **Documentacion tecnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md) (Delta 2026-08-12)

## Qué hace

Cuando el proceso de contratación avanza, Greenhouse envía correos automáticos — sin que nadie
tenga que acordarse de escribirlos:

| Momento | Quién lo recibe | Qué dice |
|---|---|---|
| Llega una postulación nueva | Buzón de People (`people@efeoncepro.com`) | Datos completos del postulante (nombre, correo, teléfono, país de residencia, portafolio/LinkedIn, mensaje, vacante, origen) + link para revisarla en el Hiring Desk. Sin dato = "No informado" |
| Llega una postulación nueva | El candidato | Acuse de recibo: "recibimos tu postulación, esto es lo que sigue" |
| Se le asigna un test al candidato | El candidato | Link de acceso a su evaluación, tiempo estimado y vigencia del link |
| La postulación avanza a Preselección o Entrevista | El candidato | "Tu postulación avanzó" con el nombre de la etapa |
| El candidato queda seleccionado | El candidato | Felicitación + aviso de que el equipo lo contactará |
| El candidato no queda seleccionado | El candidato | Agradecimiento genuino, decisión clara y puerta abierta a futuras vacantes |

## Reglas de comportamiento

- **Sólo etapas pensadas para el candidato notifican.** Los movimientos internos del pipeline
  (screening, revisión con cliente, decisión pendiente, etc.) NO generan correo y sus nombres
  internos jamás aparecen en un email.
- **Un scorecard de entrevistador no le escribe al candidato.** Sólo los tests asignados al
  candidato generan el correo de evaluación.
- **Sin duplicados.** Si el sistema reintenta procesar el mismo evento, el correo no se envía
  dos veces.
- **El correo de "no seleccionado" se puede pausar aparte** (kill-switch propio) sin apagar el
  resto — útil si Talent quiere controlar el momento del envío.
- **Los correos al candidato salen a nombre de Efeonce** (la agencia); el aviso interno usa el
  remitente de la plataforma.
- **Los correos se sienten personales**: el asunto y el saludo usan el nombre del candidato y el
  nombre de la vacante (p. ej. "María, recibimos tu postulación a «Content Creator»").
- Todo el sistema está detrás de un interruptor general (`HIRING_LIFECYCLE_EMAILS_ENABLED`),
  prendido en producción desde el 2026-08-12; el interruptor y los kill-switch por tipo siguen
  disponibles para pausar el sistema completo o un correo específico.

> Detalle técnico: consumers en `src/lib/sync/projections/hiring-lifecycle-emails.ts`, política en
> `src/lib/hiring/notifications/`, templates en `src/emails/Hiring*.tsx`.
