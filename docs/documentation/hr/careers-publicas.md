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

El formulario de postulación usa un `RenderContract` compatible con Growth Forms
para gobernar campos, consentimiento, captcha y telemetría (`gh_form_*`), pero la
fuente autoritativa de escritura sigue siendo Hiring. Un adapter Growth
Forms→Hiring puede abrirse como backend-data follow-up si se quiere mover el
ledger de submit al dominio Growth Forms.

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
- `POST /api/public/hiring/applications` recibe postulaciones publicas.

Los endpoints internos tienen doble gate: tenant interno + capability
`hiring.demand.write`, `hiring.opening.write` o `hiring.opening.publish`. El
endpoint publico no requiere sesion, pero en produccion exige Turnstile y falla
cerrado con `captcha_failed` si no hay token valido.

El submit publico acepta JSON o `multipart/form-data`. Cuando incluye `cvFile`,
el PDF se guarda en `greenhouse_core.assets` como asset privado
`hiring_application_cv` y queda adjunto a la `hiring_application`.

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

## Documentación técnica relacionada

- `docs/tasks/in-progress/TASK-354-public-careers-landing-apply-intake.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/PATTERNS.md#public-anonymous-surface-shell-pattern`
- `docs/ui/wireframes/TASK-354-public-careers-landing.md`
- `docs/ui/flows/TASK-354-public-careers-landing-flow.md`
