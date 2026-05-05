> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-05 por agente (TASK-784)
> **Ultima actualizacion:** 2026-05-05 por agente (TASK-784)
> **Documentacion tecnica:** `docs/tasks/in-progress/TASK-784-person-legal-profile-identity-documents-foundation.md`

# Datos legales personales — Identidad y direcciones

## Para que sirve

Greenhouse necesita conocer la identidad legal de cada colaborador (RUT chileno, documento de identidad equivalente segun pais) y su direccion para emitir documentos formales: finiquitos, contratos, recibos de sueldo, boletas de honorarios.

Antes de TASK-784 ese dato vivia solo en BigQuery (legacy) o como cero — el finiquito imprimia "RUT: vacio" porque la plataforma no tenia donde guardar identidad legal de personas. Ahora hay un modulo canonico que el colaborador completa, HR verifica y los documentos formales consumen.

## Como esta organizado

Tres capas separadas (no confundir):

1. **Identidad tributaria de organizaciones** (`organizations.tax_id`) — lo que se imprime en una factura del cliente o proveedor empresa. NO cambia con TASK-784.
2. **Identidad legal de personas naturales** (`person_identity_documents`) — RUT del colaborador, DNI, pasaporte, etc. Capa nueva.
3. **Direcciones de personas** (`person_addresses`) — direccion legal, residencia, correspondencia, contacto de emergencia. Capa nueva.

Cada documento o direccion tiene un estado:

| Estado | Significado |
|---|---|
| Pendiente de revision | El colaborador o HR lo declaro; nadie lo ha verificado todavia |
| Verificado | HR confirmo que el dato es correcto |
| Rechazado | HR rechazo con un motivo (incongruencia, dato erroneo) |
| Archivado | Reemplazado por una version posterior; queda en historial |
| Vencido | Paso la fecha `valid_until` |

Solo los documentos `Verificado` cuentan para emitir un finiquito o contrato formal.

## Flujo del colaborador

Desde `/my/profile` (tab "Datos legales") el colaborador puede:

1. Declarar o actualizar su documento de identidad (RUT en Chile, equivalente en otros paises).
2. Declarar su direccion legal, residencia, correspondencia o contacto de emergencia.

Una vez guardado:

- El valor completo NUNCA se vuelve a mostrar al colaborador desde la plataforma (lo escribio el; el sistema solo conserva la mascara `xx.xxx.678-K`).
- El estado pasa a "Pendiente de revision".
- Se notifica a HR que hay algo por verificar.

## Flujo de HR

Desde la pestaña "Identidad legal" en el perfil de cada colaborador (`/people/[id]`), HR puede:

1. **Verificar** el documento o direccion (capability `person.legal_profile.verify`).
2. **Rechazar** con motivo de al menos 10 caracteres (mismo capability).
3. **Editar** datos directamente (capability `person.legal_profile.hr_update`).
4. **Ver completo** el valor (capability `person.legal_profile.reveal_sensitive` — solo EFEONCE_ADMIN o FINANCE_ADMIN). Cada vez que se ve completo:
   - Se exige un motivo de al menos 5 caracteres.
   - Se registra en un log de auditoria (quien, cuando, ip, user_agent, motivo).
   - Se cuenta para una alerta automatica si el mismo usuario hace mas de 3 reveals en 24 horas.

## Bloqueadores para finiquitos y contratos

Greenhouse bloquea la emision formal de finiquito laboral Chile cuando:

- No existe un RUT verificado.
- El RUT esta solo en estado pendiente o rechazado.
- Falta direccion legal verificada.

Para honorarios persona natural Chile el bloqueo es solo el RUT (la direccion no es requerida para boleta de honorarios).

Para colaboradores Deel/EOR/contractor internacional, el sistema no exige RUT chileno; valida que exista algun documento verificado.

## Privacidad y proteccion del valor

- Los valores completos viven cifrados a nivel disco (Cloud SQL nativo) y solo accesibles a usuarios PG con permisos `greenhouse_runtime`.
- Los logs, mensajes de error, payloads de eventos, prompts de IA y dashboards de Sentry NUNCA reciben el RUT, la direccion completa ni el numero de pasaporte: hay sanitizers que los scrubean automaticamente.
- Cada vez que un documento sale en un finiquito o recibo formal, se registra en un audit log para que un auditor pueda reconstruir que documento salio en que documento.

## Backfill historico

La data legacy de BigQuery `member_profiles.identity_document_*` se importa al nuevo modelo como `Pendiente de revision`. NUNCA se marca verificada automaticamente — HR debe revisar uno por uno.

> Detalle tecnico:
> - Modulo canonico: `src/lib/person-legal-profile/`
> - Migracion de schema: `migrations/20260505015628132_task-784-person-identity-documents-and-addresses.sql`
> - Spec arquitectura: seccion "Person Legal Profile invariants (TASK-784)" en `CLAUDE.md`
> - Reliability signals: `identity.legal_profile.{pending_review_overdue, payroll_chile_blocking_finiquito, reveal_anomaly_rate, evidence_orphan}`
