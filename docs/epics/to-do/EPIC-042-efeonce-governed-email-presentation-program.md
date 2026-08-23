# EPIC-042 — Efeonce Governed Email Presentation Program

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño; ADR Proposed; cero cambios de correo o runtime`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- GitHub Issue: `none`

## Summary

Coordina la evolución incremental de la presentación de los correos Efeonce —marca, firma, footer, contexto de
recepción, ayuda, preferencias e identidad legal— sin poner en riesgo la entrega que hoy funciona. El programa
abarca los 30 `EmailType` y sus consumidores en auth, Hiring, Payroll, Finance, Growth y operaciones, pero cada
cambio ejecutable vive en una child task pequeña, reversible y con evidencia propia.

## Why This Epic Exists

`TASK-1764` descubrió que la solución requiere una foundation compartida y múltiples cohortes secuenciales. Una
umbrella aislada no puede gobernar de forma honesta el lifecycle conjunto de ese programa ni mostrar cuándo la
foundation, los canaries internos, las familias transaccionales, los mensajes de seguridad, Hiring externo, los
regulados y las suscripciones quedaron realmente aceptados.

El epic evita dos errores opuestos: un big bang heredado desde `EmailLayout`, y treinta soluciones locales que
vuelvan a improvisar footers. No reemplaza las tasks, no habilita runtime y no convierte trabajos paralelos de
Resend, Growth o Hiring en children por coincidencia temática.

## Outcome

- Todo `EmailType` queda clasificado mediante una policy exhaustiva de presentación con Efeonce como masterbrand.
- RRSS, identidad/dirección y notas legales dejan de ser decoración libre: cada tipo declara su elegibilidad y
  fuente canónica.
- La foundation se introduce con output legacy byte-idéntico y sin cutover implícito.
- Cada familia se migra en cohorts de máximo cuatro tipos, con baseline, diff, previews, aprobación, canary y
  rollback independientes.
- Unsubscribe aparece sólo donde propósito y consentimiento lo exigen; prioridad de entrega nunca lo infiere.
- El legacy se retira únicamente después de evidencia y aceptación individual para los 30 tipos.

## Presentation Blocks and Eligibility

El footer mantiene una anatomía común —identidad → contexto/ayuda → RRSS gobernadas → controles → legal—, pero
ningún bloque se renderiza por costumbre. La policy de cada `EmailType` declara, como mínimo:

- `socialLinksPolicy: 'none' | 'institutional'`: default `none`. `optional_subscription` puede usar `institutional`
  y `commercial_marketing` debe usarlo con YouTube, Instagram, LinkedIn y Threads desde `EFEONCE_SOCIAL_LINKS`,
  íconos monocromáticos, nombre accesible y fallback textual. Está prohibido en access/security, transaccionales,
  Hiring, regulados e internos; no se agregan parámetros de tracking por inferencia.
- `legalIdentityMode: 'compact' | 'entity' | 'full'`: `compact` muestra Efeonce; `entity` agrega razón social,
  identificador tributario y casa matriz; `full` agrega una lista compacta de países y privacidad. La lista se
  presenta sin el rótulo `Operación en` y no implica entidades legales locales. La casa matriz no se presenta como
  límite geográfico. Identidad legal/dirección vienen del operating entity y los países del SSOT de marca, nunca
  hardcodeados en JSX.
- `legalNoticePolicy: 'none' | 'security' | 'privacy' | 'regulated'`: sólo copy específico al propósito. Se
  prohíbe el disclaimer genérico de confidencialidad como footer universal.

Baseline del programa: todo perfil gobernado usa identidad `entity` como mínimo; marketing/suscripción usan
`full` y controles de baja. Transaccionales conservan `socialLinksPolicy='none'` y no reciben unsubscribe.
Marketing exige las cuatro RRSS institucionales; suscripción puede habilitarlas. Correos regulados resuelven su
nota desde el dominio y la jurisdicción. La activación internacional requiere revisión con abogado habilitado;
esta clasificación es dirección de producto, no una declaración de cumplimiento jurídico global.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_PRESENTATION_POLICY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/09_marca-agencia.md`

## Child Tasks

- `TASK-1764` — policy, dirección visual, inventario, decomposición de cohorts y gates anti-big-bang.

## Planned Child Lanes

Los IDs se reservan sólo cuando la ADR esté aceptada y el gate anterior permita abrir la siguiente task:

1. Foundation compatible con output legacy byte-idéntico.
2. Canary interno de bajo riesgo.
3. Cohorts transaccionales por una sola familia y máximo cuatro tipos.
4. Access/security, Hiring externo y regulated transactional en releases separados.
5. Suscripción opcional/marketing después de validar propósito, consentimiento y jurisdicción.
6. Retiro del legacy después de aceptación 30/30.

## Existing Related Work

- `TASK-408` — migración de copy institucional; no posee perfiles ni rollout de footer.
- `TASK-1057` — futura paleta AXIS para email; no posee taxonomía de presentación.
- `TASK-1274` — deuda histórica de naming `Efeonce Greenhouse`; relacionado, no reanclado automáticamente.
- `TASK-1689` — correos del ciclo Hiring; consumer de la policy cuando corresponda, conserva `EPIC-011`.
- `TASK-1745` — lifecycle de entrega Resend; conserva `EPIC-011` y no es presentación.
- `TASK-1749` — tracking de marketing y separación de dominio; relacionado, no child por defecto.

## Program Sequence

ADR accepted → TASK-1764 cierra inventario/decomposición → foundation byte-idéntica → canary interno → cohorts
transaccionales → carriles externos/sensibles separados → suscripción/marketing → retiro legacy.

Una cohorte fallida detiene el programa. No se compensa avanzando otra familia y no se usa el kill-switch de
delivery como sustituto del rollback visual por `EmailType`.

## Exit Criteria

- [ ] La ADR de presentación está `Accepted` y registrada como decisión vigente.
- [ ] Los 30 `EmailType` tienen policy exhaustiva, owner de dominio y cohort asignada.
- [ ] La foundation demostró output legacy byte-idéntico para los 28 templates consumidores de `EmailLayout`.
- [ ] Cada cohorte tiene task propia, una sola familia, máximo cuatro tipos y evidencia de baseline/diff.
- [ ] Cada cohorte externa tiene previews 720/390 y sin imágenes, tests, aprobación, canary consentido y rollback.
- [ ] Access/security, Hiring externo y regulated transactional no compartieron release de migración.
- [ ] Ningún tipo transaccional incorporó unsubscribe o contenido promocional por herencia.
- [ ] RRSS sólo aparecen con `socialLinksPolicy='institutional'`; marketing incluye obligatoriamente YouTube,
      Instagram, LinkedIn y Threads desde `EFEONCE_SOCIAL_LINKS`, con nombre accesible y fallback textual.
- [ ] Todo footer gobernado muestra razón social, RUT y casa matriz resueltos desde el operating entity; la presencia
      operativa adicional sólo aparece en `full`, viene del SSOT de marca y ningún template hardcodea identidad
      legal o limita Efeonce a Chile.
- [ ] Cada tipo declara `legalNoticePolicy`; no existe un disclaimer legal universal ni copy regulatorio inventado.
- [ ] Los 30 tipos fueron aceptados individualmente antes de retirar el primitive legacy.
- [ ] El runtime final conserva delivery ledger, suppression, reply-to, tracking y kill-switch canónicos sin duplicarlos.
- [ ] Todas las child tasks obligatorias están `complete` o fueron retiradas explícitamente con evidencia.

## Non-goals

- Reemplazar globalmente `EmailLayout` o migrar todos los templates en una release.
- Rediseñar asuntos, cuerpos, CTAs, heroes o lógica de negocio durante la migración de footer.
- Crear campañas, journeys, preferencias o suscripciones nuevas.
- Reescribir el sender, Resend, delivery ledger, suppression, tracking o lifecycle de entrega.
- Absorber tasks de Hiring, Finance, Payroll o Growth sólo porque envían correo.
- Declarar cumplimiento jurídico global sin validación profesional por jurisdicción.
