# Revisión de privacidad — datos de contacto en postulaciones Careers (TASK-1688/1689)

> **Tipo de documento:** Revisión operativa de privacidad (orientación, NO asesoría legal)
> **Fecha:** 2026-08-12 · **Autor:** Claude (sesión de rollout, autorizada por el operador)
> **Marco:** Ley 21.719 (protección de datos personales, Chile) + prácticas del repo
> **Alcance:** `phone_e164`, `residence_country_code` (candidate_facet) y `candidate_message`
> (hiring_application) + los 6 emails del ciclo de hiring que los transportan.

## Veredicto

**Apto para operar** con los controles vigentes. Dos recomendaciones menores abajo. Si Efeonce
requiere un dictamen legal formal (p. ej. ante fiscalización), esta revisión debe ratificarla
un abogado — el rol de este documento es dejar el análisis y la evidencia listos.

## Análisis por dato

| Criterio | Teléfono (`phone_e164`) | País de residencia | Mensaje |
|---|---|---|---|
| Finalidad | Contactar al candidato durante el proceso de selección | Segmentar viabilidad operativa del proceso (huso, modalidad, legal) | Contexto de la postulación |
| Base de licitud | Consentimiento explícito (checkbox obligatorio del apply) | Ídem | Ídem |
| Minimización | Opcional; sólo E.164 normalizado, sin metadatos | Autodeclarado, ISO alpha-2; **prohibida la inferencia** desde prefijo/IP/CV (invariante del ADR) | Opcional, ≤4.000 chars, application-scoped (no se copia al perfil) |
| Aviso | Checkbox "Acepto que Efeonce trate mis datos para este proceso de selección" + link a `https://efeoncepro.com/privacy` + leyenda "Conforme al aviso de privacidad (Ley 21.719). Puedes revocarlo cuando quieras." (visible en el form, verificado en captura del 2026-08-12) | Ídem + ayuda "Indica dónde resides. No se deduce del prefijo telefónico." | Ídem |
| Acceso | Sólo lectura interna autorizada (Application 360, gate `hiring.application.read`) + aviso interno al buzón de People. Nunca en payloads públicos, portal cliente, analítica ni logs (tests anti-leak) | Ídem | Ídem |
| Retención | Hereda el régimen del facet de candidato: `consent_status`/`retention_policy` + trigger de retención Ley 21.719 ya vigente para documentos de candidato (arquitectura Hiring §Retención) | Ídem | Vive en la postulación; sigue el ciclo de la aplicación |
| Revocación | El consentimiento es revocable ("Puedes revocarlo cuando quieras"); `consent_status='withdrawn'` dispara el régimen de retención existente | Ídem | Ídem |
| Transferencia | Resend (procesador de email, EE. UU.) transporta nombre/email del candidato y, en el aviso interno, teléfono/país/mensaje hacia el buzón interno M365. Sin otras transferencias | Ídem | Ídem |

## Datos sensibles / clase protegida

Ninguno de los tres campos captura datos sensibles ni de clase protegida. El país de residencia
**no** es nacionalidad, dirección ni elegibilidad laboral (invariante explícita del ADR y del
copy). El mensaje es texto libre del candidato: puede contener lo que él decida — el control es
acceso restringido + no-replicación + no-telemetría.

## Emails (TASK-1689)

- El candidato sólo recibe SUS propios datos + información pública de la vacante.
- El aviso interno con PII viaja únicamente al buzón configurado (`people@efeoncepro.com`).
- Payloads del outbox sin PII (se re-lee de PG al consumir); logs y señales sólo con IDs.
- El email de rechazo es pausable de forma independiente (control operativo de momento de envío).

## Recomendaciones (no bloqueantes)

1. **Aviso de privacidad público** (`efeoncepro.com/privacy`): confirmar que enumera
   explícitamente teléfono y país de residencia entre los datos tratados en procesos de
   selección, y a Resend como encargado de tratamiento. (El consentimiento del form es válido;
   esto es completitud del aviso.)
2. **Retención del mensaje**: cuando se defina la purga periódica de candidatos (`retention_policy`),
   incluir `candidate_message` en el mismo barrido que el facet.

## Evidencia

- Captura del form con consentimiento + leyenda Ley 21.719 + ayuda del país (2026-08-12).
- Tests anti-leak (`schema.test.ts`, `send.test.ts`), invariantes en
  `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (Deltas 2026-08-12) y `DECISIONS_INDEX.md`.
- E2E EO-APP-0090: PII visible sólo en Application 360 y en el aviso interno.
