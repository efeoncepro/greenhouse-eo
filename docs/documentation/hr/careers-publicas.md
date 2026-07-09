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

## Operación de vacantes reales

Una vacante pública nace en el dominio Hiring:

```text
createTalentDemand -> createHiringOpening -> updateHiringOpening -> publishOpening
```

La UI de careers no inventa vacantes ni persiste estado paralelo. El cierre
operativo debe registrar el demand `public_id`, opening `public_id`, ruta de
detalle y ruta de apply. Ejemplo live: `EO-TDM-0012` / `EO-OPN-0009`, Account
Manager / Especialista en Marketing.

Si el opening debe quedar visible en production, la publicación se coordina con
el release control plane: flags (`HIRING_PUBLIC_APPLICATIONS_ENABLED`,
Turnstile), deploy, smoke del detalle/apply, watchdog y manifest.

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
