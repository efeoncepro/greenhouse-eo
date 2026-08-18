# Careers públicas

## Estado

TASK-354 dejó la interfaz pública de careers implementada. **Desde 2026-08-18 el
detalle sirve la hoja editorial de TASK-1741 y el JSON-LD `JobPosting` de
TASK-1740 EN PRODUCCIÓN**: `CAREERS_DETAIL_EDITORIAL_V2_ENABLED` y
`HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED` están ON (release `fa54670470c1`), y el
schema emitido pasó `validator.schema.org` con 0 errores y 0 advertencias. Las dos
vacantes vivas están autoradas en contrato v2 completo. TASK-1373 migró el apply a
un Growth Form nativo detrás de `CAREERS_NATIVE_GROWTH_FORM_ENABLED`, también ON en
producción.

## Qué hace

Careers públicas es la puerta externa de candidatos para Efeonce:

- muestra una landing de employer brand y vacantes publicadas;
- permite filtrar openings por búsqueda, área y modalidad;
- muestra el detalle como una hoja editorial de decisión: promesa, resultados,
  trabajo, encaje, evidencia, condiciones, beneficios, proceso y compensación;
- permite postular mediante un formulario público con confirmación genérica.

La UI no crea un pipeline paralelo. Listing y detalle leen el contrato público
allowlist de Hiring (`PublicOpeningPayload`), y el apply primario postea por el
motor gobernado `POST /api/public/growth/forms/[formSlug]/submit` cuando el flag
nativo está ON. `POST /api/public/hiring/applications` queda como compatibilidad
de rollback del componente custom.

## Rutas

- `/public/careers`
- `/public/careers/[publicId]`
- `/public/careers/[publicId]/apply`

## Contratos de privacidad y seguridad

- La confirmación de envío es genérica: no revela si la persona ya postuló, si
  existe una postulación previa ni el estado interno del proceso.
- El formulario público no pide documentos de identidad, edad, género, foto ni
  otros datos proxy de clase protegida.
- El CV opcional se acepta solo como PDF (máx. 10 MB) y se guarda como asset
  privado de Greenhouse adjunto a la postulación. Portafolio y LinkedIn siguen
  siendo enlaces seguros `https://`.
- Documentos de identidad, portfolio-file, scan/quarantine formal y resolver
  documental unificado quedan para TASK-1362.
- El consentimiento usa copy de careers y versiona la política enviada al backend.
- Turnstile se resuelve desde el contrato de formulario cuando el ambiente tiene
  site key configurada; en desarrollo puede degradar con token local seguro.

## Growth Forms

El formulario de postulación tiene foundation backend en Growth Forms desde
TASK-1372. Para `formKind='application'`, Growth Forms gobierna campos,
consentimiento, captcha, telemetría (`gh_form_*`), file policy y el ledger de
submit. Si el contrato incluye CV, el submit público usa multipart, crea asset
privado `hiring_application_cv_draft`, escanea los bytes y persiste sólo un
descriptor seguro.

La escritura ATS no es un `form_destination`: la projection
`growth_hiring_application_from_submission` consume
`growth.forms.submission_accepted` y llama `submitPublicHiringApplication`.
`form_destination` sigue reservado para delivery externo como HubSpot/email.
El Growth Form real de Careers se publica como `efeonce-careers-application`
(`form_key=9f7a8fc0-6fa7-4670-8e2d-efe0ce354001`, surface
`public-careers-nextjs`). El endpoint directo de Hiring queda como
compatibilidad de rollback mientras el flag nativo se estabiliza por ambiente.

El Banco de Talento sigue la misma regla: si captura datos no puede ser solo
decoracion visual. Debe tener un contrato Growth Forms propio o un command Hiring
equivalente con consentimiento, captcha/rate-limit, telemetria y respuesta
generica.

## Operación de vacantes reales

Una vacante pública nace en el dominio Hiring:

```text
publishHiringVacancyFromBrief
  -> createTalentDemand
  -> createHiringOpening
  -> updateHiringOpening
  -> publishOpening
```

El operador vive en `src/lib/hiring/vacancy-publication-operator.ts`, expone
`dryRun|execute|publish`, tiene CLI `pnpm hiring:publish-vacancy` y endpoint
interno `POST /api/hiring/vacancy-publications`. El CLI/API consumen el mismo
command; no hay implementaciones paralelas.

La UI de careers no inventa vacantes ni persiste estado paralelo. El cierre
operativo debe registrar el demand `public_id`, opening `public_id`, ruta de
detalle y ruta de apply. Ejemplo live: `EO-TDM-0012` / `EO-OPN-0009`, Account
Manager / Especialista en Marketing.

La oferta debe separar `Ubicacion` y `Modalidad` como datos de dominio:

- `Modalidad`: una sola de `Remoto`, `Hibrido` o `Presencial`.
- `Ubicacion`: region de contratacion para remoto (`LATAM`, `Global`, `Chile`,
  etc.) o ciudad/pais/oficina real para hibrido/presencial.
- `Remoto / hibrido segun acuerdo` no es un valor publicable. Si aparece en
  datos legacy, el renderer puede degradar defensivamente; el publish nuevo debe
  venir desde API/operator con campos estructurados.
- `Área` y chips de competencias vienen de `public_area` y
  `public_skill_tags`; la inferencia desde copy queda solo como fallback legacy.
- `public_compensation_band` queda disponible como campo estructurado opcional,
  no publish-required hasta cerrar governance de bandas.

## Contenido estructurado y SEO técnico (TASK-1740)

**Estado: en producción desde 2026-08-18.** El renderer editorial y el schema
`JobPosting` están ambos ON en Production, y las dos vacantes vivas
(`EO-OPN-0009` y `EO-OPN-0061`) ya están autoradas en contrato v2 completo, con
las 13 secciones del contrato pobladas. El schema emitido pasó la validación
externa de `validator.schema.org` con 0 errores y 0 advertencias.

Toda publicación nueva usa `public_content_json` v2 como fuente editorial única:
promesa, intro, 3–5 resultados, 4–8 elementos de trabajo, habilidades esenciales,
preferidas y aprendibles, evidencia, modelo de trabajo, colaboración, proceso,
beneficios adicionales, compensación opcional y hasta tres bloques de profundidad.
La v1 permanece sólo como lectura compatible para vacantes ya publicadas. Reglas:

- El bloque se escribe por el command canónico (`PATCH
/api/hiring/openings/{id}` con `publicContent`) y se valida siempre en el
  store; un bloque inválido responde 422 y nunca llega a la base.
- La **primera** publicación de una vacante exige v2 completo. Volver a
  publicar una vacante que ya estuvo al aire NO lo exige: aplicar la barra de
  autoría al republicar convertiría una regla editorial en una interrupción de
  servicio (una vacante pausada con postulantes en proceso quedaría en 404 hasta
  reescribir su bloque). Un opening v1 ya publicado degrada por sección al
  fallback de prosa hasta que People lo migre.
- El contexto `Efeonce en breve` y el baseline global de beneficios se resuelven
  desde una fuente central versionada; cada opening almacena sólo adiciones reales.
- La zona de extensión acepta 0–3 bloques `narrative`, `bullets` o `milestones`;
  nunca HTML, CTA, estilos, requisitos, beneficios ni procesos alternativos.
- La compensación estructurada es un hecho aprobado; el texto libre
  `public_compensation_band` sigue existiendo pero nunca se convierte en
  salario para SEO.

La elegibilidad remota por país vive en `public_remote_eligible_countries`
(códigos ISO 3166-1 alpha-2 reales, ej. `["CL","CO"]`). `LATAM` o `Global`
son regiones de display, no hechos legales. Una publicación remota v2 exige al
menos un país elegible exacto.

La vinculación publicada es explícita: en Chile, contrato laboral local; fuera de
Chile, vía internacional con pago directo de Efeonce (sin EOR). El universo
vigente es de **20 países elegibles** — toda Latinoamérica excepto Cuba, más
Estados Unidos y España. Por eso el bloque de beneficios cierra siempre con el
calificador de modalidad y país: presentar el baseline sin esa condición le
ofrecería a un candidato de cualquiera de esos países un equivalente contractual
como si fuera un derecho estatutario idéntico al chileno.

El proceso publicado declara además un **compromiso de respuesta de 3 a 4
semanas**: el candidato sabe de antemano en qué plazo tendrá una definición,
avance o no.

### Renderer editorial (TASK-1741)

`CAREERS_DETAIL_EDITORIAL_V2_ENABLED` conmuta únicamente la hoja
`/public/careers/[publicId]`. Con el flag OFF se conserva el DOM legacy; con el
flag ON el mismo payload público se resuelve por sección y se presenta en este
orden: hero/promesa, sobre el rol, Efeonce en breve, outcomes, trabajo, hasta tres
bloques adicionales, esenciales/deseables/aprendibles, evidencia, cómo trabajamos,
beneficios, proceso, compensación y resumen lateral. Reglas:

- La hoja conserva exactamente los dos enlaces existentes al mismo `applyHref`:
  hero y resumen. No añade CTA final ni formulario embebido.
- El fallback es por sección. Un bloque parcial no puede esconder descripción,
  responsabilidades, requisitos, deseables ni proceso legacy.
- `public_nice_to_have` se presenta como `Deseable, no excluyente`. Sólo
  `publicContent.learnables` puede aparecer bajo `Lo que puedes aprender aquí`.
- El formulario apply, canonical y JSON-LD no son responsabilidad del
  componente. El flag de schema sí está interlocked: no puede emitir
  `JobPosting` si el renderer editorial está OFF.
- El contenido real no se inventa para llenar una banda. En v2, la ausencia de
  una región obligatoria bloquea publicación; sólo la zona adicional y la
  compensación son opcionales.

El seniority público tiene un vocabulario cerrado y separado de la evaluación
interna: `Junior`, `Semi-senior`, `Senior` o `Lead`. `Intermedio` describe la
proficiency de una habilidad; `L1/L2/L3` son niveles internos de assessment.
El selector humano, Vacancy AI, writer, reader público y CHECK de PostgreSQL
aplican la misma regla. Si el título contiene un nivel explícito, debe coincidir
con `public_seniority`.

El detalle público de una vacante publicada emite `canonical` explícito
y, detrás del flag `HIRING_PUBLIC_JOBPOSTING_SCHEMA_ENABLED` (ON en Production
desde 2026-08-18; nació OFF), JSON-LD `JobPosting` construido desde el mismo
contenido visible:

- Remota: `TELECOMMUTE` + países elegibles; sin países no hay schema.
- Híbrida/presencial: `jobLocation` con `public_city` + `public_country`;
  sin ambos no hay schema.
- Nunca se emite `directApply` (hay paso detail → formulario) ni
  `validThrough` (no existe expiración real); pausar/cerrar la vacante la
  saca del reader público (404), que es la señal de retiro para Google.

> Detalle técnico: `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
> §Delta 2026-08-17 (TASK-1740); builder en
> `src/lib/hiring/public-careers/job-posting.ts`; contrato en
> `src/lib/hiring/public-careers/public-content.ts`.

## Voz pública y UX writing

Careers es una superficie pública de employer brand. El copy visible vive en
`src/lib/copy/dictionaries/*/careers.ts`; no hardcodear labels, CTAs, errores ni
estados en JSX.

Reglas vigentes:

- Usar voz Efeonce: directa, exigente, con mecanismo. No llenar con entusiasmo
  decorativo ni promesas sin prueba.
- Evitar expresiones que funcionen como broma interna pero puedan sonar
  excluyentes o inmaduras para candidatos externos. Ejemplos retirados:
  `locos`, `Únete a los locos`, `Hollywood-level creativity`.
- Errores y estados vacíos deben decir qué pasó y cuál es el próximo paso
  seguro: reintentar, limpiar filtros, revisar campos marcados o volver al
  listado.
- En vacantes de marketing, el spanglish profesional es válido cuando describe
  el trabajo real y el mercado lo usa: `growth`, `performance`, `vendor
management`, `brief`, `paid media`, `pipeline`, etc. No traducir esos términos
  por purismo si perderían precisión. Solo corregir spanglish que opaque,
  mezcle jerga interna innecesaria o dificulte a un candidato externo.

Nota de compatibilidad 2026-07-09:

- Si un registro legacy trae `public_location_mode=LATAM`, ese valor es una
  región/ubicación remota legacy, no una modalidad. El view-model debe mostrar
  `Ubicacion=LATAM` y `Modalidad=Remoto` cuando no exista `public_work_mode`.
- No corregir `Modalidad=LATAM` cambiando CSS/copy ni reemplazando
  `public_location_mode` por `Remoto`; eso vuelve a mezclar ubicacion y
  modalidad. La solucion canonica es publicar/republicar con `public_work_mode`
  y `public_hiring_region`.
- El bundle productivo `915be02a86abfd49c71365af8a647f9fdfa35207` no selecciona
  `public_work_mode`, `public_hiring_region` ni `public_skill_tags`; por eso no
  hay data-only fix limpio para ese release viejo. Requiere release/hotfix de
  codigo.

Si careers ya esta live y los flags/Turnstile estan configurados, publicar otro
opening visible en production es solo un write gobernado de Hiring. No debe
pasar por un release de codigo.

El release control plane entra solo cuando cambia el runtime: codigo de
careers/apply, migraciones/schema, flags/env vars, infraestructura, renderer
publico, contratos de Growth Forms/Hiring o smoke de cutover inicial.

## Full API Parity

El proceso queda con paridad programatica para publicar y recibir postulaciones:

- `POST /api/hiring/vacancy-publications` opera un brief completo con
  `dryRun|execute|publish`.
- `pnpm hiring:publish-vacancy --file <brief.json>` usa el mismo command.
- `POST /api/hiring/demands` crea demands.
- `POST /api/hiring/openings` crea openings.
- `PATCH /api/hiring/openings/{openingId}` actualiza truth interna y payload
  publico.
- `POST /api/hiring/openings/{openingId}/publish` publica el opening.
- `DELETE /api/hiring/openings/{openingId}/publish?mode=paused|closed`
  despublica el opening.
- `POST /api/public/growth/forms/[formSlug]/submit` es el path gobernado de
  Growth Forms para postulaciones `application`; `POST /api/public/hiring/applications`
  queda como legacy/compat para rollback del apply custom.

Los endpoints internos tienen doble gate: tenant interno + capability
`hiring.demand.write`, `hiring.opening.write` o `hiring.opening.publish`. El
endpoint publico no requiere sesion, pero en produccion exige Turnstile y falla
cerrado con `captcha_failed` si no hay token valido.

El submit publico de Growth Forms acepta JSON o `multipart/form-data`. Cuando
incluye `cvFile`, el PDF se guarda primero en `greenhouse_core.assets` como
asset privado `hiring_application_cv_draft`, se escanea y sólo si está `clean`
la projection lo adjunta como `hiring_application_cv` a la `hiring_application`.

Esto significa que publicar otra vacante no necesita tocar codigo ni deploy. El
wrapper de operador/CLI ya existe localmente; un futuro Publication Desk o Nexa
action deben envolver ese command, no reimplementar payloads.

## Banco de Talento

Banco de Talento no debe quedar ambiguo. Si es solo contenido visual de employer
brand, se documenta como decorativo. Si captura candidatos generales, se opera
como Growth Form o comando Hiring con consentimiento, captcha/rate-limit,
telemetría y respuesta genérica. El diseño no puede ser la única fuente de
captura.

## Estados principales

- home con vacantes publicadas;
- empty sin vacantes;
- empty filtrado;
- error honesto de carga;
- detalle de vacante;
- vacante no disponible;
- apply idle;
- validación inline;
- submit en progreso;
- success genérico;
- rate-limit/captcha/server error genéricos.

## Evidencia visual vigente

La revision UI pre-release local del 2026-07-09 cubrio `/public/careers`,
detalle `EO-OPN-0009`, apply y 404 en desktop1440, wide2048 y mobile390.

- GVC final post-copy: `.captures/2026-07-09T11-11-01_task354-careers-runtime-audit`.
- Playwright product audit: `.captures/2026-07-09T10-49-careers-product-ui-audit`
  con `failed=[]`.
- Invalid submit probe:
  `.captures/2026-07-09T-careers-apply-invalid-state`.
- El circulo negro `N` de capturas locales es `nextjs-portal` (indicador de
  desarrollo de Next.js), no `NexaFloatingButton` ni UI de producto.

La evidencia de TASK-1741 compara el baseline legacy con la variante editorial
en 1440×1200 y 390×844:

- Baseline: `.captures/2026-08-17T12-25-12_task354-careers-runtime-audit/`.
- Fixture estructurada completa:
  `.captures/2026-08-17T16-19-21_task1741-careers-editorial-detail/`.
- Vacante real parcial después de la corrección de deseables:
  `.captures/2026-08-17T15-51-54_task1741-careers-editorial-detail/`.
- Scorecard/review:
  `docs/ui/reviews/TASK-1741-public-careers-editorial-detail-renderer.scorecard.json`
  y su dossier hermano. GVC premium terminó en verde; staging sigue pendiente.

## Documentación técnica relacionada

- `docs/tasks/complete/TASK-354-public-careers-landing-apply-intake.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/PATTERNS.md#public-anonymous-surface-shell-pattern`
- `docs/ui/wireframes/TASK-354-public-careers-landing.md`
- `docs/ui/flows/TASK-354-public-careers-landing-flow.md`
