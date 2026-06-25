> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-06-25 por Claude (TASK-1229)
> **Ultima actualizacion:** 2026-06-25 por Claude
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

## Que NO hace (todavia)

- No tiene aun una pantalla visual para operarlo (eso llega con el cockpit, TASK-1232) — por ahora se opera por API.
- No escribe a HubSpot de verdad todavia (usa un adaptador de prueba; el real es TASK-1230).
- El API publico nace **apagado** (sin formularios publicados) hasta que se complete el rollout.

## Detalle tecnico

> Arquitectura: [GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md) (§Delta 2026-06-25).
> Codigo: `src/lib/growth/forms/**` (commands/readers/compiler/dispatch), `src/lib/growth/public-submission/**` (port compartido captcha + abuse-guard), `src/app/api/public/growth/forms/**` + `src/app/api/admin/growth/forms/**`.
> Manual de operacion paso a paso: pendiente, llega con el admin cockpit (TASK-1232).
