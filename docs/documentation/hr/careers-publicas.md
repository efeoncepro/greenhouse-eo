# Careers públicas

## Estado

TASK-354 dejó la interfaz pública de careers implementada en código y validada en
local. El rollout real queda pendiente hasta activar el apply público de Hiring
en el ambiente objetivo y completar sign-off de consentimiento/privacidad.

## Qué hace

Careers públicas es la puerta externa de candidatos para Efeonce:

- muestra una landing de employer brand y vacantes publicadas;
- permite filtrar openings por búsqueda, área y modalidad;
- muestra detalle de cada vacante con competencias, proceso y señal de
  compensación;
- permite postular mediante un formulario público con confirmación genérica.

La UI no crea un pipeline paralelo. Listing y detalle leen el contrato público
allowlist de Hiring (`PublicOpeningPayload`), y el formulario postea al endpoint
gobernado `POST /api/public/hiring/applications` de TASK-1367.

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
Hasta que TASK-1373 migre la UI pública, el endpoint directo de Hiring queda
como compatibilidad del apply actual.

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
  queda como legacy/compat hasta TASK-1373.

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

## Documentación técnica relacionada

- `docs/tasks/in-progress/TASK-354-public-careers-landing-apply-intake.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/PATTERNS.md#public-anonymous-surface-shell-pattern`
- `docs/ui/wireframes/TASK-354-public-careers-landing.md`
- `docs/ui/flows/TASK-354-public-careers-landing-flow.md`
