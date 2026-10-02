# TASK-1904 — Efeonce MCP: ficha e instalación privada

## Meta

- Status: `draft`
- Owner task: `TASK-1904`
- Product Design asset: `docs/audits/mcp/2026-09-26-openai-plugin-readiness/README.md` (evidencia inicial; capturas del host pendientes en Slice 0).
- Visual direction mode: `source-led`
- Intended consumers: Codex desktop, ChatGPT hospedado y Work; CLI/IDE documentados por separado.
- Copy source: metadata de `../efeonce-mcp/client-kit/openai/` (ruta propuesta); auth conserva su canon.
- Primitive decision: `reuse` de ficha del host y shell de Efeonce ID; sin UI nueva.
- UI ready target: `no`

## Brief

- Primary user: persona con acceso a Efeonce y cliente OpenAI compatible.
- User moment: instalar, reconocer al publicador, consentir y empezar a operar.
- Job to be done: conectar Efeonce y consultar información de sus organizaciones autorizadas.
- Primary decision signal: quién publica, qué permite la conexión y sobre qué acceso opera.
- Non-goals: reproducir el catálogo OpenAI con UI propia, rediseñar login o prometer acceso universal.

## Desktop Target — 1440×1000

Esquema semántico sobre superficies del host, no diseño de píxeles que controlemos:

1. Ficha: logo oficial → Efeonce MCP → publicador Efeonce → descripción → instalar/conectar.
2. Detalle: capacidades condicionadas al acceso, ejemplos, privacidad/términos/soporte y versión.
3. Efeonce ID: contexto del cliente solicitante → identidad → permisos delegados → consentir/cancelar.
4. Retorno: conexión disponible → prompt inicial → resultado y referencias de la operación.

Respetar tipografía/densidad nativa. Comprobar que nombre/logo no se corten; no agregar adornos externos.

## Mobile Target — 390×844

Sólo superficies web soportadas: flujo vertical, marca y acción accesibles, textos envolventes sin overflow,
consentimiento legible sin depender de hover. Mantener el retorno OAuth en contexto correcto.
Codex desktop/CLI no se certifican como apps móviles por reducción de viewport.

## Action Hierarchy

- Primary: instalar/conectar y, después del consentimiento, pedir una lectura autorizada.
- Secondary: detalles de permisos, privacidad y soporte.
- Destructive: revocar consentimiento; diferenciar de desinstalar/deshabilitar el plugin.
- Selection vs action: elegir organización restringe el objetivo; nunca concede acceso.
- Pending / disabled: esperar callback sin crear otra conexión; permitir cancelar.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Marca Efeonce oficial | Asset oficial con procedencia validada con AXIS | Identidad reconocible | Logo recreado o colores inventados |
| Ficha del host | `extensions.com.openai.interface` | Presentación nativa | CSS propio sobre OpenAI |
| Consentimiento existente | Shell canónico Efeonce ID | Claridad de identidad/permisos | Login clonado en el paquete |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Marca y nombre | Reconocer Efeonce | Ficha nativa del host | interface + assets |
| 1 | Descripción y ejemplos | Entender el alcance | Detalle nativo | Metadata validada contra catálogo |
| 2 | Conexión | Autorizar delegación | OAuth host + Efeonce ID | Registro real + scope/cliente |
| 3 | Conversación | Operar | Composer y tools del host | Skills + tools autorizadas |

## Copy Ledger

Copy candidato para las zonas controladas por Efeonce; los labels del host se observan y no se reescriben.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| efeonce.plugin.name | Marca | Efeonce MCP | Ninguno | Nunca «canary» en la entrega estable |
| efeonce.plugin.publisher | Autor | Efeonce | Ninguno | No implica aprobación OpenAI |
| efeonce.plugin.description | Detalle | Conecta tus herramientas e información de Efeonce según tus permisos. | Ninguno | Validar longitud admitida por host |
| efeonce.plugin.prompt.capabilities | Ejemplo | ¿Qué puedo consultar o hacer con mi acceso a Efeonce? | Ninguno | Discovery real antes de operar |
| efeonce.plugin.prompt.organizations | Ejemplo | Muéstrame las organizaciones disponibles con mi acceso. | Ninguno | Sólo si el catálogo lo permite |
| efeonce.plugin.support | Enlace | Soporte de Efeonce | URL oficial verificada | No inventar correo |

## State Copy

Texto de recuperación candidato para respuestas de skills/manual; no sustituye errores canónicos del issuer.

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Efeonce conectado | Tu acceso determina las herramientas disponibles. | Consultar capacidades | Requiere llamada real |
| loading | Conectando con Efeonce | Completa la autorización en la ventana de Efeonce ID. | Cancelar en el host | No repetir flujo |
| empty | Sin herramientas disponibles | Tu acceso actual no habilita esta operación. | Revisar acceso | No pedir privilegios automáticos |
| partial | Servicio temporalmente no disponible | No se pudo completar la consulta. | Reintentar de forma acotada | No afirmar resultado |
| error | Es necesario volver a conectar | La conexión no permite autenticar esta solicitud. | Reconectar | Sin causa de expiración inventada |
| denied | Acceso no autorizado | Tu acceso no permite operar sobre ese objetivo. | Elegir un objetivo permitido | Sin enumerar tenants ajenos |

## Accessibility Contract

- Heading order: conservar semántica del host; jerarquía canónica de auth sin cambios.
- Chart/table alternatives: no gráficos nuevos; resultados deben tener texto interpretable.
- Aria labels: assets con nombre accesible donde la API del host permita; no texto incrustado indispensable.
- Focus notes: teclado completo y retorno al control de conexión; documentar límites del host.
- Color-independent state labels: estados escritos, no sólo color del logo o toast.

## Implementation Mapping

- Route / surface: directorio/ficha privada del host, conexión MCP y `https://auth.efeonce.org`.
- Primitives: ficha y modal nativos; shell auth existente. Variants / kinds: propiedad del host.
- Component candidates: ninguno nuevo. Copy source: manifest de paquete y canon del emisor.
- Data reader / command: MCP metadata + catálogo autorizado + commands OAuth existentes.
- API parity: reutilizar gateway/issuer; cero endpoints de negocio para UI del plugin.
- Access / capability: persona + scope + objetivo + policy de provider, nunca sólo nombre del plugin.
- Runtime consumers: clientes OpenAI soportados y gateway único.
- Print/email/PDF considerations: no aplica; manual de instalación accesible en Markdown.
- GVC markers: no insertar markers en terceros; capturas por controles accesibles del host.

## GVC Scenario Plan

- Scenario file: plan/evidencia en `docs/audits/mcp/TASK-1904/` durante ejecución; no creado aún.
- Route: ficha privada real y OAuth real; URLs exactas del registro se capturan al crearlo.
- Viewports: 1440×1000 desktop, 390×844 web; formatos nativos para CLI/IDE.
- Quality profile: `premium` para superficies propias modificadas.
- Required steps: instalar, conectar, consentir, volver, consultar, denegar, reconectar.
- Required captures: marca instalada, consentimiento, resultado y recuperación por host.
- Required `data-capture` markers: ninguno nuevo en host externo; reusar GVC de auth si cambia.
- Assertions: logo visible, actor/cliente correctos, sin canary, enlaces válidos, sin secretos.
- Scroll-width checks: sin overflow en auth propia; limitaciones externas documentadas.
- Accessibility/focus checks: teclado, zoom, lector de pantalla en contenido controlado.
- Reduced-motion evidence: no animación propia; conservar preferencia del emisor.
- Review dossier: `required`.
- Baseline: `required after direction approval` para UI propia que llegue a cambiar; host externo se documenta por versión.

## Design Decision Log

- Decision: marca y paquete nativos con login existente.
- Alternatives considered: sólo URL MCP; miniapp con widgets; paquete completo.
- Why this pattern: el paquete aporta identidad y skills sin duplicar autenticación.
- Reuse / extend / new primitive: `reuse`; extender únicamente metadata/assets.
- Open risks: soporte de cada campo varía por cliente, pendiente capturas y validación.
- Follow-up: si aparece UI propia nueva, task ui-ux separada y dirección visual aprobada.

## Acceptance Checklist

- [ ] Textos propios, placeholders dinámicos y límites del host revisados.
- [ ] Assets oficiales renderizados en claro/oscuro y tamaño pequeño sin crop indebido.
- [ ] Estados degradados, denegación y recuperación comprobados.
- [ ] Mapping, enlaces y copy contrastados con el catálogo autorizado.
- [ ] Capturas por host, foco y accesibilidad revisados; UI ready actualizado con evidencia.
