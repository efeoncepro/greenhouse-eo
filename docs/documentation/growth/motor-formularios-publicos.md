> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-06-25 por Claude (TASK-1229)
> **Ultima actualizacion:** 2026-06-30 por Codex (AEO `/aeo-2/` live bridge)
> **Documentacion tecnica:** [GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md)

# Motor de Formularios Publicos de Growth

## Que es

Es el **motor gobernado** que deja a Greenhouse crear formularios publicos (suscripcion, lead magnet, contacto, intake de diagnostico, etc.) y exponerlos en sitios externos (WordPress hoy, Astro/Next a futuro), capturando lo que la gente envia de forma segura y entregandolo a destinos como HubSpot — todo con un solo contrato reutilizable.

La idea clave: **cualquier** formulario que nazca del motor hereda robustez por construccion (validacion, consentimiento, reintentos de entrega, control de abuso, observabilidad) en vez de construirse a mano cada vez. No es solo para un caso (el grader): es **transversal** a cualquier flujo que necesite captar datos del publico.

## Para que sirve (en simple)

- **Crear un formulario** una vez y publicarlo en varios sitios sin reescribirlo.
- **Recibir lo que la gente envia** de forma segura: valida los datos, exige consentimiento, frena spam/abuso (honeypot + captcha + limite por persona/IP) y guarda evidencia del consentimiento aunque la entrega falle.
- **Entregar el lead** a su destino (HubSpot, email, etc.) de forma confiable: si el destino esta caido, el lead NO se pierde — se reintenta aparte, nunca bloquea la aceptacion.
- **Operar todo por API gobernada** (no solo desde una pantalla): la misma capacidad la pueden usar la UI admin, Nexa, un script o una integracion.

## Como funciona (flujo)

1. Un operador **crea** un formulario (borrador) y define sus campos, su consentimiento y a donde va lo que se envia.
2. Lo **publica** — el motor revisa que tenga todo lo obligatorio (consentimiento, retencion, comportamiento de exito) antes de dejarlo salir; si falta algo, no publica y dice que falta.
3. El formulario se **muestra** en un sitio aprobado (host surface). El visitante lo llena y envia.
4. El motor **acepta y guarda** la submission + el consentimiento de forma atomica (todo o nada) y responde al instante. La **entrega al destino corre despues**, en segundo plano.
5. Si el destino falla, el lead queda registrado y se **reintenta**; si agota reintentos, queda marcado para revision humana (nunca se pierde silenciosamente).

## Que significan los estados

- **Formulario:** `borrador → revision → publicado → deprecado → archivado`. Solo el publicado se muestra al publico; una vez publicado, su contenido es inmutable (editar crea una version nueva).
- **Submission:** `recibida → aceptada → ruteada → entregada`, o `rechazada` (spam/consentimiento/origen no autorizado), o `fallo de entrega → reintento → dead-letter` (necesita humano).

## Estado de rollout

- **Staging (`develop`): VIVO** desde 2026-06-25. Los tres flags estan ON: el API publico (`GROWTH_FORMS_PUBLIC_API_ENABLED`), el dispatcher de entrega (`GROWTH_FORMS_DISPATCH_ENABLED`) y el adapter HubSpot real (`GROWTH_FORMS_HUBSPOT_SECURE_SUBMIT_ENABLED`). Verificado: el endpoint publico responde el render contract y una submission real llego a un HubSpot test form (200).
- **Produccion: ACTIVO de forma acotada para AEO `/aeo-2/`.** El primer submit productivo publico usa el form `efeonce-aeo-diagnostic` y una host bridge HTML en WordPress porque el renderer portable aun no emite `captchaToken` para Turnstile. El rollout generico de `<greenhouse-form>` en sitios publicos sigue pendiente de esa integracion + smoke WordPress/dataLayer. La verdad live de los flags es `vercel env ls` + el servicio Cloud Run `ops-worker`; el estado humano vive en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

## Primer form productivo publico — AEO `/aeo-2/`

La landing publica `https://efeoncepro.com/aeo-2/` (`postId=250265`) ya envia leads al motor gobernado:

- Form slug: `efeonce-aeo-diagnostic`.
- Definition/current published version: `fdef-efeonce-aeo-diagnostic` / `fver-bc5a1cfe-76eb-4658-9fe9-ab0c8fb0a657` (v2; v1 deprecated).
- Host surface: `fhsf-efeonce-aeo-diagnostic`.
- API base: `https://greenhouse.efeoncepro.com`.
- HubSpot destination: portal `48713323`, form GUID `8649e76c-8b01-41f3-9b0c-5713d7b4dba6` (`AEO - Lead Form`).
- Campos publicados: `firstName`, `email`, `brandWebsite`, `country`, `companySize`, `mainCompetitor`.
- Gate de email: `email.validator=corporate_email` + `validation_schema.emailPolicy={mode:"block_field",field:"email"}`. El bridge AEO replica temporalmente el patrón reactivo del renderer: error inline en `email`, estado `Verificando correo…`, `/verify-email` debounced y success solo tras verificación remota. Antes de Turnstile vuelve a verificar, y el servidor revalida en `submitForm`.
- Mapping HubSpot: `firstName -> firstname`, `email -> email`, `country -> pais_gh`, `companySize -> tamano_de_la_empresa`, `mainCompetitor -> marca_de_competencia`.
- `brandWebsite` queda persistido en Greenhouse pero no se envia a HubSpot hasta que exista una propiedad/campo correspondiente en ese form.

La landing usa un bridge HTML con Turnstile invisible en el widget Elementor `convers`. Esto es una excepcion controlada, no un fork del producto: campos, consentimiento, validacion, CORS, captcha, persistence policy, email gate y destination plan siguen viviendo en Greenhouse. Cuando el renderer portable soporte Turnstile, el host debe volver a:

```html
<greenhouse-form form="efeonce-aeo-diagnostic" surface="fhsf-efeonce-aeo-diagnostic" locale="es-CL"></greenhouse-form>
```

Contrato runtime y CORS: [growth-public-forms-runtime-contract.md](../../architecture/growth-public-forms-runtime-contract.md).

## Como se muestra el formulario (renderer portable) — TASK-1231

El mismo formulario se ve igual en WordPress, en Astro y en la vista interna de Greenhouse, porque los tres usan **un solo renderer portable**: un componente web `<greenhouse-form>` que Greenhouse sirve como un archivo unico. Cada sitio solo lo "incrusta"; no copia ni cambia el formulario.

- **El sitio no decide nada del formulario.** El renderer le pide el formulario publicado a Greenhouse y lo arma solo (campos, validacion, pasos, consentimiento, mensaje de exito). El sitio (WordPress/Astro) solo aporta donde va y el color de marca; nunca toca los campos ni a donde va el lead.
- **Funciona aunque algo falle.** Si Internet se cae o el sitio bloquea scripts, muestra un mensaje claro o un link de contacto — nunca una caja vacia. Mientras carga muestra un esqueleto, no un spinner de pagina.
- **Mide sin exponer datos.** Avisa a la pagina cuando alguien ve, empieza, envia o completa el formulario (para Google Tag Manager), pero **nunca** manda el correo, el telefono ni el texto escrito en esos eventos.
- **Accesible y en celular.** Etiquetas arriba de cada campo, errores que el lector de pantalla anuncia, foco que salta al primer error, botones grandes, y sin scroll horizontal en pantallas chicas.
- **Donde se ve por dentro:** Greenhouse tiene una vista interna de referencia en **Design System → Growth Forms renderer** (solo equipo Efeonce) para previsualizar como se vera en los sitios publicos.
- **Como se incrusta:** en WordPress hay un widget de Elementor ("Greenhouse Growth Form"); en Astro un componente; ambos solo piden el slug del formulario. Paso a paso en el [manual de incrustacion](../../manual-de-uso/growth/incrustar-formulario-wordpress-astro.md).

## Cockpit operativo — TASK-1232

Greenhouse ya tiene un cockpit interno para operar el motor sin SQL ni portal externo: **Growth → Forms** (`/admin/growth/forms`, viewCode `administracion.growth_forms`).

El cockpit es un command center operativo, no un builder visual completo. Permite:

- ver formularios, versiones, health, host surfaces, destinos, submissions recientes y evidence ledger;
- crear un draft low-risk con plantilla gobernada;
- enviar a review, publicar, deprecar, archivar y ejecutar dispatch;
- inspeccionar consent snapshot, delivery attempts, retry queue y dead letters con degradacion honesta.

La UI consume readers/APIs del motor (`src/lib/growth/forms/**`, `/api/admin/growth/forms/**`) y usa primitives canónicas de Greenhouse (`CompositionShell`, `AdaptiveSidecarLayout`, breadcrumbs, buttons, chips, motion y tokens tipográficos). La navegación top-level es **Growth → Forms**.

Primeros forms reales observados: **AI Visibility Grader** (`fdef-ai-visibility-grader`) como anchor interno del motor, y **AEO Diagnostic** (`fdef-efeonce-aeo-diagnostic`) como primer submit productivo publico en WordPress. El AEO prueba el motor publico + HubSpot destination + CORS + Turnstile, pero usa host bridge HTML; el smoke publico del renderer generico `<greenhouse-form>` queda como follow-up de rollout/sign-off.

## Que NO hace (todavia)

- En **produccion** el motor ya esta activo de forma acotada para AEO `/aeo-2/`; no generalizarlo a cualquier embed sin revisar flags, host surface, CORS, Turnstile y smoke.
- El cockpit no es un drag-and-drop builder; authoring avanzado queda para un follow-up si patrones repetidos lo justifican.
- El renderer es **code-complete**, pero no reemplaza el bridge AEO hasta emitir `captchaToken` para Turnstile. Para usarlo en un sitio real productivo generico se requiere host surface autorizado y smoke WordPress/dataLayer. No agrega flags nuevos (reusa `GROWTH_FORMS_PUBLIC_API_ENABLED`).

## Detalle tecnico

> Arquitectura: [GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md) (§Delta 2026-06-25 TASK-1229/1230/**1231** + §19 renderer + §22 HubSpot).
> Codigo: `src/lib/growth/forms/**` (commands/readers/compiler/dispatch) + `src/lib/growth/forms/destinations/hubspot/**` (adapter), `src/lib/growth/public-submission/**` (port compartido captcha + abuse-guard), `src/app/api/public/growth/forms/**` + `src/app/api/admin/growth/forms/**`. Renderer portable: `src/growth-forms-renderer/**` (build `pnpm renderer:build` → `public/growth-forms/renderer-<channel>.js`). Host surfaces: `efeonce-public-site-runtime` (widget Elementor) + `efeonce-web` (`GrowthForm.astro`).
> Operacion paso a paso: [docs/manual-de-uso/growth/operar-motor-formularios.md](../../manual-de-uso/growth/operar-motor-formularios.md).
