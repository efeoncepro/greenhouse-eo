# Banco de Talento

## Qué resuelve

El Banco de Talento permite encontrar de nuevo a personas que ya participaron en Hiring sin duplicar su identidad ni
volver a revisar todas las vacantes. La ficha nace de la Persona y su `candidate_facet`; las aplicaciones,
evaluaciones y documentos continúan en sus fuentes canónicas.

## Estados y contacto

- `active_process`: visible para operar el proceso actual; no autoriza otra invitación.
- `pool_eligible`: existe consentimiento explícito y vigente para oportunidades futuras.
- `needs_reconsent`: puede existir evidencia retenida, pero no se puede contactar para otra vacante.
- `paused`: la persona pausó contacto futuro.
- `withdrawn`: consentimiento retirado; el perfil deja de servirse y su proyección buscable se invalida.
- `expired`: venció el propósito o la retención aplicable.

`descubrible` y `contactable` son decisiones distintas. La cohorte histórica de 52 personas se incorporó en
development como 50 `active_process` y 2 `needs_reconsent`; ninguna fue convertida en opt-in futuro.

## Qué busca

La búsqueda usa únicamente evidencia estructurada: capabilities públicas de openings, seniority, país y
disponibilidad declarados y resultados por competencia cuando existen. No indexa CV, correo, teléfono, notas,
respuestas abiertas ni expectativas económicas. El orden es estable por actualización e ID; no es un ranking.

## Full API Parity

Los readers `searchTalentPool` y `getTalentPoolProfile`, y los commands de consentimiento, retiro, disponibilidad e
invitación, son la fuente compartida por Desk, App API, Nexa y MCP. Una invitación usa
`proposeTalentInvitation → inviteTalentToOpening`, valida el efecto exacto e idempotencia y crea o reutiliza
`HiringApplication`. No mueve etapas, asigna test, envía correo ni decide por una persona.

## Dos experiencias, un solo contrato

### Candidato

El apply ofrece un opt-in futuro separado y opcional. Si la persona lo solicita, recibe un enlace verificable para
confirmar; desde `/public/careers/talent-profile/[token]` puede leer purpose/vigencia, actualizar disponibilidad o
retirarse. No crea una cuenta nueva ni muestra notas, evaluaciones internas u otras postulaciones.

### Operador People

`/agency/hiring/talent-pool` vive dentro de Hiring Desk. Permite buscar por texto/evidencia estructurada, capability,
seniority, idioma, país autodeclarado y disponibilidad; muestra reason codes, coverage, freshness y una ficha lateral
person-first. Los documentos se revisan mediante el Application 360 exacto, no se copian al Banco de Talento.

Una invitación se propone y después se confirma contra una opening. El servidor vuelve a validar consentimiento,
contactabilidad, duplicate/conflict e idempotencia antes de crear o reutilizar la application.

### Agentes por MCP

`hiring.talent_pool.search` y `hiring.talent_pool.profile.get` son readers internos delegados sobre el mismo App API.
Un host MCP compatible no recibe acceso por ser Codex o Claude: necesita una persona interna autenticada, grant
revocable, capability, propósito fijo y provider habilitado. En el estado actual están code-ready pero OFF hasta
deploy y canaries reales; no deben anunciarse como capacidad productiva.

## Privacidad y límites

El consentimiento de una postulación actual cubre ese proceso; no se reutiliza silenciosamente para contacto futuro.
El opt-in `future_opportunities`, su copy, TTL y retención requieren aprobación Legal/Privacy antes del rollout
externo. El diseño técnico no sustituye asesoría legal calificada.

Canon: `docs/architecture/GREENHOUSE_TALENT_POOL_FULL_API_PARITY_DECISION_V1.md`.
