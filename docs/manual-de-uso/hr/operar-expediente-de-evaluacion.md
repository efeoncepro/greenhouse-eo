# Operar el Expediente de Evaluación (API)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-16 por Claude (TASK-1735)
> **Documentacion funcional:** [expediente-de-evaluacion.md](../../documentation/hr/expediente-de-evaluacion.md)

## Para qué sirve

Registrar y leer notas de evaluación de una postulación, y generar/confirmar el borrador
asistido por IA — todo por API mientras la pantalla del expediente llega (task ui-ux).

## Antes de empezar

- Rol con capability `hiring.application.annotate` (admin / HR manager / operations) para
  escribir; `hiring.application.read` basta para leer.
- El `applicationId` (formato `happ-…`, visible en la URL de Application 360).
- Para el borrador IA: flag `HIRING_EVALUATION_DOSSIER_AI_ENABLED=true` en el ambiente
  (hoy OFF por defecto) y que el CV del candidato tenga proyección lista (TASK-1718).

## Paso a paso (staging vía carril canónico)

```bash
# Leer el expediente
pnpm staging:request /api/hiring/applications/<happ-id>/notes

# Registrar una nota manual
pnpm staging:request POST /api/hiring/applications/<happ-id>/notes '{"kind":"interview_note","bodyMd":"..."}'

# Generar borrador IA (requiere flag ON)
pnpm staging:request POST /api/hiring/applications/<happ-id>/dossier '{"action":"propose"}'

# Ver la propuesta vigente
pnpm staging:request /api/hiring/applications/<happ-id>/dossier

# Confirmar (con edición opcional) o rechazar
pnpm staging:request POST /api/hiring/applications/<happ-id>/dossier '{"action":"confirm","proposalId":"hdsp-...","editedBodyMd":"..."}'
pnpm staging:request POST /api/hiring/applications/<happ-id>/dossier '{"action":"reject","proposalId":"hdsp-...","decisionNote":"..."}'
```

## Estados y señales

- `409 hiring_dossier_ai_disabled`: el flag está OFF — las notas manuales siguen operando.
- `409 hiring_dossier_cv_not_ready`: la proyección del CV no está lista; reintenta cuando
  el review packet esté `ready`.
- Propose repetido con las mismas fuentes devuelve la MISMA propuesta (idempotente, sin
  costo LLM extra); si cambió el test/CV, genera una nueva.
- Confirmar materializa la nota (`source: agent`) y cierra la propuesta — es terminal: no
  se puede re-confirmar ni revertir (la corrección es una nota nueva).

## Qué no hacer

- No pedir el borrador "por fuera" (chat) y pegarlo a mano: se pierde el provenance.
- No intentar editar/borrar notas por SQL — el trigger y los grants lo bloquean a propósito.
- No exponer contenido del expediente al candidato por ningún canal.

## Problemas comunes

- 403: te falta la capability `annotate` (pídela al tier de gobernanza) o usas una persona
  agente sin el rol correcto.
- La nota no aparece en la lista: verifica que usaste el `applicationId` correcto — las
  notas son por postulación, no por persona.
