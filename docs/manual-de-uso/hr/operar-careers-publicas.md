# Operar Careers públicas

## Antes de empezar

Confirma:

- existe un opening publicado por el flujo de Hiring/ATS;
- `HIRING_PUBLIC_APPLICATIONS_ENABLED` está en el estado esperado del ambiente;
- `CAREERS_NATIVE_GROWTH_FORM_ENABLED` está en el estado esperado del ambiente
  si quieres probar el apply con el renderer nativo de Growth Forms;
- `CAREERS_DETAIL_EDITORIAL_V2_ENABLED` está en el estado esperado si vas a
  validar la hoja editorial; permanece OFF por defecto hasta rollout;
- Turnstile y consentimiento están aprobados para el ambiente objetivo;
- la ruta pública que vas a probar corresponde al ambiente correcto.

## Crear y publicar una vacante real

No crear vacantes por SQL ni editando estado visual. El camino operativo
preferido es el operador estructurado de Hiring:

```bash
pnpm hiring:publish-vacancy --file scripts/hiring/fixtures/account-manager-vacancy-brief.example.json --dry-run
pnpm hiring:publish-vacancy --file <brief.json> --execute --idempotency-key <key>
pnpm hiring:publish-vacancy --file <brief.json> --publish --idempotency-key <key>
```

También existe el endpoint interno `POST /api/hiring/vacancy-publications` para
Nexa, Hiring Desk o agentes autorizados. `dryRun` es el default y no escribe
estado; `execute` crea/reutiliza draft; `publish` publica solo si pasan los
guards. `execute`/`publish` requieren `idempotencyKey` o header
`Idempotency-Key`.

El operador compone la secuencia canonica de Hiring:

1. Crear demand con `createTalentDemand`.
2. Crear opening con `createHiringOpening`.
3. Completar copy, requisitos, skills, proceso y visibilidad con
   `updateHiringOpening`.
4. Publicar con `publishOpening`.
5. Registrar en el cierre: `demand.public_id`, `opening.public_id`, URL de
   detalle y URL de apply.

La modalidad y la ubicación deben nacer como datos estructurados de la oferta,
no como frase libre escrita por un agente. Regla operativa:

- `workMode`: `remote`, `hybrid` u `onsite`.
- Si `workMode=remote`, definir region de contratacion (`LATAM`, `Global`,
  `Chile` u otra region aprobada). La UI muestra esa region como ubicación.
- Si `workMode=hybrid` u `onsite`, definir ciudad/pais/oficina real. No publicar
  un cargo hibrido sin ubicacion.
- No usar textos ambiguos como `remoto / hibrido segun acuerdo`; deben bloquear
  el publish o quedar como warning de `dryRun` hasta elegir una modalidad.
- `publicArea` debe venir de allowlist aprobada.
- `publicSkillTags` alimenta chips publicos; Careers no debe inferirlos desde
  requisitos/copy salvo fallback legacy.
- `publicCompensationBand` existe como campo estructurado opcional. No es
  obligatorio para publish hasta que finance/payroll/legal definan bandas
  aprobadas y su governance.
- `publicSeniority` acepta exclusivamente `Junior`, `Semi-senior`, `Senior` o
  `Lead`. No uses `Intermedio`, `L1`, `L2` ni `L3`. Si el título dice `Senior`,
  el campo debe decir exactamente `Senior`; el writer rechaza contradicciones.

Voz y copy publico:

- Redacta para candidatos externos, no para el equipo interno. La voz puede ser
  exigente y con punto de vista, pero no excluyente.
- Evita bromas internas o etiquetas identitarias como `locos`; prefiere señales
  observables: criterio, rigor, ganas de construir, ownership, experiencia real.
- En marketing, conserva spanglish profesional cuando sea el término real del
  oficio (`growth`, `performance`, `vendor management`, `brief`, `paid media`,
  etc.). No traduzcas esos términos solo por limpiar el español; sí corrige
  jerga interna que no aporte claridad al candidato.
- Si ajustas labels, CTAs, empty states, errores o textos de apply, hazlo en
  `src/lib/copy/dictionaries/*/careers.ts` y valida layout desktop/mobile.

Ejemplo real: `Account Manager / Especialista en Marketing` quedó como demand
`EO-TDM-0012` y opening `EO-OPN-0009`:

- `https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0009`
- `https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0009/apply`

Compatibilidad legacy importante:

- `public_location_mode=LATAM` en una vacante remota legacy significa region de
  contratacion/ubicacion, no modalidad.
- Si falta `public_work_mode`, el view-model debe degradar a
  `Modalidad=Remoto` y preservar `Ubicacion=LATAM`.
- No arreglar `Modalidad=LATAM` editando copy/CSS ni cambiando
  `public_location_mode` a `Remoto`; eso rompe la ubicacion. La correccion vive
  en codigo y en publicar campos estructurados (`public_work_mode`,
  `public_hiring_region`, `public_skill_tags`).
- Si produccion sigue mostrando `Modalidad=LATAM`, verificar primero el release
  servido. El release viejo `915be02a86abfd49c71365af8a647f9fdfa35207` no lee
  los campos estructurados nuevos y requiere release/hotfix de codigo.

Publicar una vacante nueva **NO requiere release** si el runtime de careers ya
esta desplegado y `HIRING_PUBLIC_APPLICATIONS_ENABLED`/Turnstile estan en el
estado correcto. Es una operacion de negocio/data del dominio Hiring.

Usar `greenhouse-production-release` solo cuando el trabajo tambien cambie
codigo, migraciones/schema, flags/env vars, infraestructura, renderer publico o
contratos de apply. La skill de talento define el rol y el contrato de Hiring;
release solo gobierna cambios de runtime/configuracion.

## Publicar por API (Full API Parity)

La publicacion de vacantes tiene paridad programatica. La UI interna, Nexa, un
agente o un script operativo deben llamar el operador `dryRun|execute|publish`
o los mismos writers/readers de Hiring; ningun paso depende exclusivamente de
una pantalla.

Endpoint/CLI preferidos:

1. `POST /api/hiring/vacancy-publications` con body estructurado y modo
   `dryRun|execute|publish`.
2. `pnpm hiring:publish-vacancy --file <brief.json> --dry-run|--execute|--publish`.

Endpoints base disponibles si se necesita operar manualmente el dominio:

1. `POST /api/hiring/demands` crea el `talent_demand`.
2. `POST /api/hiring/openings` crea el `hiring_opening` derivado del demand.
3. `PATCH /api/hiring/openings/{openingId}` completa titulo publico, resumen,
   descripcion, responsabilidades, requisitos, skills, proceso, visibilidad y
   metadatos publicos estructurados. El payload legacy `public_location_mode`
   debe derivarse desde `workMode + hiringRegion/officeLocation`; no escribirlo
   como copy manual.
4. `POST /api/hiring/openings/{openingId}/publish` publica el opening.
5. `DELETE /api/hiring/openings/{openingId}/publish?mode=paused|closed`
   despublica sin tocar SQL.

Los endpoints son internos y requieren tenant + capabilities:

- `hiring.demand.write`
- `hiring.opening.write`
- `hiring.opening.publish`

Verificacion minima despues de publicar:

1. `GET /api/hiring/openings/{openingId}` confirma el estado interno.
2. Abrir `/public/careers/{openingPublicId}`.
3. Abrir `/public/careers/{openingPublicId}/apply`.
4. Registrar en handoff `demand.public_id`, `opening.public_id`, detalle y apply.

Si un agente no tiene sesion/capability para llamar la API, no debe saltar a SQL:
debe usar el command server-side canonico de Hiring en contexto autenticado o
pedir la ejecucion a un operador con permisos.

## Difundir una vacante publicada

La distribución en redes o grupos externos ocurre **después** de publicar y verificar el opening en Careers. No crea otro opening ni cambia el estado de Hiring.

1. Abre el detalle y el apply de la vacante pública y confirma que ambos cargan.
2. Usa solamente el copy candidato-facing aprobado y el apply URL de ese opening. No copies budget, rate bands, notas internas ni datos de candidatos.
3. Selecciona grupos/canales autorizados y afines al rol. Para Facebook, usa solo grupos a los que el operador ya pertenece, salvo autorización explícita para unirse a otros; respeta sus reglas.
4. Obtén confirmación humana antes de publicar el lote. Publica una oferta por vez y espera el resultado antes de navegar a otro destino.
5. Registra cada resultado como `visible`, `enviada a aprobación`, `sin editor` o `no verificable`. Una solicitud de moderación no es una publicación visible.
6. Si el estado queda ambiguo, vuelve a buscar el texto exacto en el grupo antes de reintentar. No dupliques avisos por un timeout o una interfaz lenta.
7. Adjunta una imagen solo si el mecanismo de carga funciona; no fuerces ni eludas el selector de archivos. Publica sin imagen únicamente con autorización explícita y deja la decisión registrada.

Conserva el registro de campaña bajo `docs/operations/hiring/` con opening, URL, copy aprobado, destinos, estado observado y moderaciones pendientes. Ejemplo: [distribución de Facebook del 2026-08-11](../../operations/hiring/2026-08-11-facebook-vacancy-distribution.md).

## Contenido estructurado y schema de Google (TASK-1740)

Toda vacante nueva lleva un bloque v2 que el renderer editorial, las proyecciones
legacy y el JSON-LD `JobPosting` consumen desde la misma fuente.

### Autorar el bloque estructurado

1. Prepara el paquete de evidencia con la skill de Talent y su Job Offer Recipe.
   Completa la estructura v2 fija; separa essentials, preferred y learnables.
2. Para un cargo complejo, usa 0–3 `additionalSections` después de `workItems`.
   Sólo se permiten `narrative`, `bullets` o `milestones`; nunca HTML o CTA.
3. Escribe el bloque por el operador canónico. El operador deriva summary,
   description, responsabilidades, requisitos, deseables y proceso legacy:

```bash
pnpm hiring:publish-vacancy -- --file scripts/hiring/fixtures/account-manager-vacancy-brief.example.json --mode dryRun
```

4. Un bloque inválido responde 422 `hiring_opening_public_content_invalid`.
   V1 no acepta writes. `publicContent: null` no puede degradar una publicación v2.

### Declarar países elegibles (solo remoto)

1. Confirma los países donde realmente se puede contratar **y pagar**. Estado
   vigente (decisión CEO 2026-08-17): 20 países — toda Latinoamérica **excepto
   Cuba** — más Estados Unidos y España. Vía contractual: Chile con contrato
   laboral local; fuera de Chile, vía internacional con pago directo de Efeonce
   (contract type `international_internal`, sin EOR).
2. Decláralos como ISO alpha-2: `{"publicRemoteEligibleCountries":["CL","CO"]}`.
   `LATAM`/`Global` son display, no países: el API los rechaza.
3. Una vacante remota v2 no puede publicarse sin países declarados. Una fila
   legacy sin países puede seguir visible, pero no emite schema.

**El país de la entidad empleadora NO va como ubicación del puesto.** Es
tentador poner "Santiago, Chile" en una vacante remota para dejar claro el
anclaje contractual, pero `jobLocation` significa "dónde se realiza
físicamente el trabajo": Google dejaría de tratarla como remota y la mostraría
a quien busca empleo _en_ Santiago. La forma correcta es la que ya opera:
`TELECOMMUTE` + países elegibles en la elegibilidad, y el anclaje contractual
declarado en el contenido visible (`content.workModel`). Una lista de un solo
país (`["CL"]`) también es válida y honesta: "remoto, elegible en Chile".

### Activar renderer y schema JobPosting

> ⚠️ **Precondición de secuencia (no negociable): el renderer va primero.**
> El código del renderer ya consume el bloque estructurado, pero permanece OFF
> hasta el rollout. **Orden correcto: renderer de TASK-1741 → contenido autorado
> y revisado → recién entonces schema.** Existe un interlock técnico: aunque la
> env del schema diga `true`, no se emite `JobPosting` mientras
> `CAREERS_DETAIL_EDITORIAL_V2_ENABLED` esté OFF.

1. Prende `CAREERS_DETAIL_EDITORIAL_V2_ENABLED` en staging y redespliega.
2. Verifica la hoja completa en 1440 y 390: navegación, hero, seniority,
   metadatos, prosa, requisitos/deseables, remoto, proceso, compensación, rail,
   footer y exactamente dos enlaces de postulación al mismo destino.
3. Confirma que los campos estructurados aprobados aparecen también en el HTML
   visible. Un bloque parcial debe conservar el fallback legacy; no publiques
   contenido ficticio para completar secciones. En una publicación v2 incompleta,
   corrige el paquete antes de publicar.
4. El flag `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED` vive **solo en Vercel**
   (SSR del detalle público). Default OFF.
5. Préndelo en staging (`vercel env add … preview` + redeploy), abre el
   detalle de una vacante con países/ciudad declarados y valida el HTML con
   el [Rich Results Test](https://search.google.com/test/rich-results).
6. Verifica el lifecycle: pausa la vacante (`DELETE
/api/hiring/openings/{id}/publish?mode=paused`) y confirma que la URL
   responde 404 sin schema; restaura solo con el command de publish.
7. Producción: mismo procedimiento tras evidencia en staging. Rollback:
   apaga primero el schema y redespliega; después apaga el renderer y vuelve a
   desplegar. La URL, el canonical, el payload y el formulario no cambian.

### Qué no hacer

- No conviertas texto regional (`LATAM`) en países para "destrabar" el schema.
- No pegues compensación de texto libre en `compensation` estructurada sin
  aprobación de Finance/People.
- No prometas indexación: el Rich Results Test valida elegibilidad, Google
  decide indexar.

### Sitemap e Indexing API (runbook de decisión — follow-up)

Hoy NO hay sitemap de vacantes ni notificación a Google; el descubrimiento es
orgánico (enlaces desde el listing). Antes de implementar cualquiera de los
dos, el owner de Growth/SEO debe decidir y autorizar:

1. **Sitemap**: quién es dueño del sitemap del dominio
   `greenhouse.efeoncepro.com`, y si las URLs `/public/careers/*` entran ahí o
   en un sitemap propio. Sin decisión de propiedad, no crear uno paralelo.
2. **Indexing API**: exige service account autorizada en Search Console del
   dominio + quota + task propia. Su beneficio es acelerar alta/baja de
   vacantes; su costo es credencial y mantenimiento. No se implementa sin esa
   autorización explícita (queda como follow-up declarado en TASK-1740).

## Verificar rutas

1. Abre `/public/careers`.
2. Confirma que la página carga marca Efeonce, hero, filtros, proceso y vacantes.
3. Abre una vacante desde el card.
4. Confirma que `/public/careers/[publicId]` preserva la hoja completa: hero,
   seniority, modalidad, prosa, trabajo, encaje, remoto, proceso, compensación,
   resumen y los dos enlaces existentes de postulación. Outcomes, evidencia y
   beneficios aparecen cuando están aprobados en `publicContent`.
5. Abre `/public/careers/[publicId]/apply`.
6. Confirma que el formulario muestra el contrato `application` y el slug
   `efeonce-careers-application`.

## Verificar evaluación pública por token

Cuando una postulación tiene assessment asignado, el link público preferido es
`/assessment/<token>`; `/public/assessment/<token>` queda como ruta compatible.
No usa sesión de dashboard ni segmento `[lang]`.

La evaluación pública no se asigna directamente a la página de la vacante. El
operador asigna una plantilla de assessment a la `hiring_application` del
candidato desde Application 360; ese command crea una instancia independiente
con token, tiempo, respuestas y scorecard propios. Si una vacante publicada ya
tiene plantilla lista pero una postulación no muestra link, falta asignar la
instancia en Hiring Desk.

1. Abre `/assessment/<token>` en el ambiente correcto.
2. Confirma instrucciones, consentimiento, secciones, tiempo efectivo y banda de
   accommodation si la instancia tiene minutos extra.
3. Inicia la evaluación, responde una pregunta y espera el feedback de autosave.
4. Avanza de sección y confirma que el timer sigue visible y no roba foco.
5. No esperes ver rúbrica ni respuesta correcta: el payload candidato es
   allowlisted y nunca incluye `answer_key_json`/`rubric_json`.
6. Si el token expiró o ya no está disponible, la UI debe responder genérico
   (`Este enlace no está disponible`) sin revelar causa interna.

## Verificar formulario

1. Intenta enviar vacío.
2. Deben aparecer errores inline y un resumen accesible.
3. Completa nombre, apellido, email y consentimiento.
4. Sube un CV PDF de prueba si aplica. El límite visible es 10 MB y no deben
   aceptarse DOC, DOCX ni ZIP.
5. Completa portafolio/LinkedIn solo con URLs `https://` si aplica.
6. Envía.
7. La respuesta visible debe ser genérica, tanto para envío aceptado como para
   dedupe seguro.

Contrato programatico del submit:

- Desde TASK-1372, el path platform para formularios `application` es
  `POST /api/public/growth/forms/[formSlug]/submit`: Growth Forms acepta JSON o
  `multipart/form-data`, guarda el CV como asset privado
  `hiring_application_cv_draft`, escanea los bytes y emite
  `growth.forms.submission_accepted`.
- Desde TASK-1373, el apply de Careers puede renderizar el Growth Form real
  `efeonce-careers-application` con `form-key`
  `9f7a8fc0-6fa7-4670-8e2d-efe0ce354001` y surface
  `public-careers-nextjs`, detrás de `CAREERS_NATIVE_GROWTH_FORM_ENABLED`.
- La projection `growth_hiring_application_from_submission` crea/dedupea la
  `hiring_application` llamando `submitPublicHiringApplication`; no hay
  `form_destination` interno para ATS.
- `POST /api/public/hiring/applications` queda como endpoint publico
  legacy/compat para rollback mientras el flag nativo se estabiliza.
- En produccion ambos caminos publicos exigen Turnstile; sin token valido fallan
  cerrado con `403 captcha_failed`.
- El CV opcional debe ser PDF, maximo 10 MB, y nunca expone URL publica ni
  filename en la telemetria/browser payload.
- El command autoritativo de Hiring sigue siendo `submitPublicHiringApplication`:
  resuelve opening publicado, reconcilia Person por email, upsertea
  `candidate_facet`, crea o dedupea `hiring_application` y devuelve siempre una
  respuesta publica generica.

No pedir documentos de identidad ni datos personales sensibles en el apply
público. TASK-1362 queda para document capture completo, scan/quarantine y
otros documentos de candidato.

## Captura visual

Usa GVC para evidencia visual:

```bash
pnpm fe:capture --route=/public/careers --env=local --hold=1500
pnpm fe:capture --route=/public/careers/<publicId> --env=local --hold=1500
pnpm fe:capture --route=/public/careers/<publicId>/apply --env=local --hold=1500
```

Además, validar mobile 390 con Playwright o escenario GVC dedicado:

- consola sin errores;
- `scrollWidth == clientWidth`;
- campos y botones sin overlap;
- copy legible;
- reduced-motion sin animaciones decorativas obligatorias.

Evidencia local de referencia post-fix 2026-07-09:

- `pnpm fe:capture task354-careers-runtime-audit --env=local` ->
  `.captures/2026-07-09T11-11-01_task354-careers-runtime-audit`.
- Auditoria Playwright producto -> `.captures/2026-07-09T10-49-careers-product-ui-audit`
  (`failed=[]`) para home, detalle, apply y 404 en desktop1440, wide2048 y
  mobile390.
- Invalid submit probe -> `.captures/2026-07-09T-careers-apply-invalid-state`.
- El circulo negro `N` que puede aparecer en capturas locales es el
  `nextjs-portal` de desarrollo, no UI de producto ni Nexa.

## Cutover

Antes de indexar o anunciar la ruta:

1. Verificar apply end-to-end en staging con una vacante real.
2. Confirmar que `POST /api/public/hiring/applications` crea o dedupea la
   postulación sin revelar estado interno.
3. Confirmar Turnstile/secret/site key en el ambiente.
4. Confirmar consentimiento y política legal vigentes.
5. Pasar GVC desktop/mobile y revisar frames.
6. Activar indexación solo cuando el CTA de postulación esté operativo.

## Rollback

La UI es additive. Para rollback de código, revertir las rutas
`src/app/public/careers/**`, los componentes `src/components/greenhouse/careers/**`
y el namespace copy `careers`.

Para desactivar recepción pública sin revertir UI, mantener
`HIRING_PUBLIC_APPLICATIONS_ENABLED` apagado y conservar `noindex`.

## Banco de Talento

Un bloque de Banco de Talento puede ser decorativo solo si no captura datos. Si
recibe email, CV o interés general, debe ser un Growth Form o comando Hiring
real con consentimiento, captcha/rate-limit, success genérico y dedupe seguro.
No dejar un formulario visual sin backend gobernado.

Si el Banco de Talento usa Growth Forms, debe tener `formKind`/slug/version
propios y destination/submit contract documentado. Si se decide escribir directo
en Hiring, debe crear o reconciliar Person + `candidate_facet` como talento
general, no esconder leads en una tabla auxiliar ni en un webhook unico.

## Datos de contacto en el formulario (TASK-1688)

El apply pide país de residencia (obligatorio, select con nombre textual — sin banderas como
único significado), teléfono opcional con prefijo sólo para formato, y mensaje opcional. Reglas
al operar/verificar:

- El país es autodeclarado: cambiar el prefijo del teléfono NO cambia el país y viceversa.
- Si un candidato reporta que "el formulario no acepta su país", verificar que el select cargó
  (catálogo ISO completo) antes de asumir bug de validación.
- Los valores llegan a la Postulación 360 (`/agency/hiring/applications/[id]`); las
  postulaciones anteriores a 2026-08-12 muestran "No informado" y eso es correcto — no se
  backfillea.
- El mismo contrato aplica al Growth Form nativo: si un campo aparece en una superficie y no en
  la otra, es un bug de paridad (reportar como issue).

## Smoke E2E recomendado

Para cerrar una publicacion real:

1. Probar browser en `/public/careers/{openingPublicId}/apply` con un candidato
   QA identificable.
2. Si Turnstile bloquea automatizacion headless, no apagar captcha. Registrar
   que el browser quedo fail-closed y probar el command server-side canonico.
3. Verificar en base:
   - `hiring_application.public_id`
   - `source='public_careers'`
   - `stage='sourced'`
   - `candidate_facet.consent_status='granted'`
   - asset `hiring_application_cv` si se envio PDF
4. Probar dedupe reintentando el mismo email/opening si el caso lo requiere; la
   respuesta publica debe seguir siendo generica y no duplicar la application.
