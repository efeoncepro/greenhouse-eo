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

- `TASK-1774` — reparación del mecanismo de baja (`ISSUE-163`). Carril 0, precondición bloqueante.
- `TASK-1764` — policy, dirección visual, inventario, decomposición de cohorts y gates anti-big-bang.
- `TASK-1274` — retiro del lockup `Efeonce Greenhouse`. **Reanclada al epic el 2026-08-24**: su Open Question
  ("decidir la marca canónica de los emails del portal") no está abierta — `EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md`
  (Accepted) ya la responde, y su regla dura vigente (*"es Efeonce **o** Greenhouse"*) plantea como excluyentes dos
  capas de la misma jerarquía. Su alcance corregido no es decidir marca: es ejecutar la arquitectura retirando el
  compuesto de cinco cadenas (remitente, tagline, alt del logo y los dos cuerpos de invitación). Entra como child 0
  porque toca los mismos snapshots, el mismo copy y los mismos runtimes que las cohorts del footer.

`TASK-1764` ya incluye una lámina aprobada en `/admin/emails/footer-profiles/mockup`. Su vista, fixtures, SSOT de
marca, assets PNG y contratos UI son el baseline visual/de contenido para la foundation y cada cohorte. Las child
tasks implementan paridad y evidencia; no vuelven a inventar el footer. La lámina no habilita runtime ni cambia la
secuencia: legacy por defecto, foundation byte-idéntica y cohorts de una familia con máximo cuatro `EmailType`.
La auditoría final de la lámina cubrió los cinco perfiles en desktop/mobile, contraste, targets, foco, orden de
headings, listas/tablas nativas y GVC sin errores; esa evidencia cierra el diseño del mockup, no la foundation.

## Planned Child Lanes

Los IDs se reservan sólo cuando la ADR esté aceptada y el gate anterior permita abrir la siguiente task:

0. **`TASK-1774` — arreglo del mecanismo de unsubscribe (precondición bloqueante).** Dueña de `ISSUE-163`. No es un carril de presentación y no puede
   resolverse dentro de una cohorte de footer: hoy el control no es accionable por ningún método (link GET → 405,
   POST one-click de RFC 8058 → 500, POST bien formado → 400) y el default `?? 'broadcast'` lo agrega solo a
   cualquier tipo enviado a más de un destinatario. Mientras no cierre, ningún `EmailType` puede declarar
   `unsubscribePolicy='required'` y los criterios de salida de este epic no son alcanzables.
0b. **Alineación de marca (`TASK-1274`).** Cambio de cadenas, sin estructura; rompe a propósito los 17 snapshots y
   los tests que hoy afirman el compuesto.
1. Foundation compatible con output legacy byte-idéntico.
2. Canary interno de bajo riesgo.
3. Cohorts transaccionales por una sola familia y máximo cuatro tipos.
4. Access/security, Hiring externo y regulated transactional en releases separados.
5. Suscripción opcional/marketing después de validar propósito, consentimiento y jurisdicción.
6. Retiro del legacy después de aceptación 30/30.
7. **Superficie gobernada de preferencias de correo (`ui-ux`, ID por reservar).** La página con toggles por tipo que
   `TASK-269` planeó y cerró sin entregar — el hueco que originó `ISSUE-163`. `TASK-1774` entrega el mecanismo y una
   confirmación mínima; esta lane entrega la superficie con su wireframe. Se declara acá explícitamente porque un
   follow-up sin dueño es exactamente cómo se perdió la primera vez.

## Existing Related Work

- `TASK-408` — migración de copy institucional; no posee perfiles ni rollout de footer.
- `TASK-1057` — futura paleta AXIS para email; no posee taxonomía de presentación.
- `TASK-1650` — drift de la dirección de casa matriz entre la base (`of 05`), `DEFAULT_LEGAL_ENTITY` (`of. 05`) y
  la constante de marca (`Of 1105`). **Dependencia dura**: ninguna cohorte que imprima identidad legal se promueve
  antes de cerrarla, o el correo mostrará una dirección distinta a la de la lámina aprobada y parecerá un defecto de
  implementación.
- `TASK-1689` — correos del ciclo Hiring; consumer de la policy cuando corresponda, conserva `EPIC-011`.
- `TASK-1745` — lifecycle de entrega Resend; conserva `EPIC-011` y no es presentación.
- `TASK-1749` — tracking de marketing y separación de dominio; relacionado, no child por defecto.

## Program Sequence

ADR accepted → TASK-1764 cierra inventario/decomposición → **arreglo del unsubscribe + alineación de marca** →
foundation byte-idéntica → canary interno → cohorts transaccionales → carriles externos/sensibles separados →
suscripción/marketing → retiro legacy.

Cada promoción despliega **todos** los runtimes que emiten ese tipo. El reparto verificado el 2026-08-24 es: 20 tipos
sólo desde el ops-worker, 6 sólo desde Vercel, 3 desde ambos (`payroll_export`, `payroll_receipt`, `notification`) y
1 sin emisor (`payroll_liquidacion_v2`). Un despliegue parcial en los híbridos hace que el mismo documento salga con
dos footers según haya sido automático o reenviado a mano.

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
- [ ] Foundation y cohorts demuestran paridad con `/admin/emails/footer-profiles/mockup` en desktop y mobile,
      incluidos jerarquía, espaciado, contraste, wordmark, identidad legal, RRSS elegibles y controles permitidos.
- [ ] Cualquier desviación del mockup responde a una limitación medida de cliente de correo, accesibilidad o dato
      runtime, queda documentada con before/after y recibe aprobación explícita.
- [ ] Cada cohorte verifica Outlook Desktop Windows, Outlook Web, Gmail, un cliente WebKit e imágenes bloqueadas;
      las RRSS mantienen nombre accesible y fallback textual.
- [ ] Cada tipo declara `legalNoticePolicy`; no existe un disclaimer legal universal ni copy regulatorio inventado.
- [ ] Los 30 tipos fueron aceptados individualmente antes de retirar el primitive legacy.
- [ ] El runtime final conserva delivery ledger, suppression, reply-to, tracking y kill-switch canónicos sin duplicarlos.
- [ ] El mecanismo de baja funciona en sus tres capas y el default `?? 'broadcast'` fue retirado.
- [ ] Un test rompe el build si la policy, `EMAIL_PRIORITY_MAP` y el carril de envío divergen sobre el unsubscribe.
- [ ] El lockup `Efeonce Greenhouse` no existe en ninguna superficie de correo, en es-CL ni en en-US.
- [ ] Existe `dictionaries/en-US/emails.ts` real, sin alias a es-CL, con test de paridad por mecánica.
- [ ] Cada cohorte declaró sus runtimes emisores y demostró despliegue y rollback en todos ellos.
- [ ] `TASK-1650` cerró antes de la primera cohorte que imprime casa matriz.
- [ ] Todas las child tasks obligatorias están `complete` o fueron retiradas explícitamente con evidencia.

## Non-goals

- Reemplazar globalmente `EmailLayout` o migrar todos los templates en una release.
- Rediseñar asuntos, cuerpos, CTAs, heroes o lógica de negocio durante la migración de footer.
- Crear campañas, journeys, preferencias o suscripciones nuevas.
- Reescribir el sender, Resend, delivery ledger, suppression, tracking o lifecycle de entrega.
- Absorber tasks de Hiring, Finance, Payroll o Growth sólo porque envían correo.
- Declarar cumplimiento jurídico global sin validación profesional por jurisdicción.
