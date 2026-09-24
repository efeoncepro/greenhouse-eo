# Efeonce Globe — adopción gobernada de Higgsfield

**Estado:** Proposed — adopción técnica preparada; runtime de Globe, promoción comercial y uso externo pendientes de gates.
**Fecha:** 2026-09-17
**Ámbito:** Efeonce Globe / Creative Studio / producción generativa / proveedores externos / agentes

## Delta 2026-09-24 — puentes locales instalados y CLI con sesión

- Los puentes MCP locales de **Blender, Illustrator y Photoshop** quedaron instalados, registrados
  (`claude mcp add --scope user`) y verificados en la Mac del operador (`fnf-blender-mcp` 0.2.2,
  `@higgsfield_org/illustrator-mcp` 0.1.2, `@higgsfield_org/photoshop-mcp` 0.1.2, bajo `~/.higgsfield/`). After
  Effects, Premiere, TouchDesigner y DaVinci Resolve no están instalados: sus workflows no corren aunque el paquete
  exista en npm (`fnf-after-effects-mcp` 0.1.3). La superficie 3 ya no se limita a «After Effects y Blender»: hoy
  cubre Blender y las dos aplicaciones de Adobe verificadas.
- La CLI `higgsfield` se actualizó a 1.1.26 (la 0.2.1 ya no podía iniciar sesión) y tiene sesión con
  `mkt@efeoncepro.com`, workspace `Private`; tras el login es obligatorio `higgsfield workspace set <id>`.
- Nada de esto cambia el estado de la decisión: sigue `provider-supported / no Globe route`, los gates de adopción
  del Producer siguen pendientes y el carril local es de operador, out-of-band, nunca runtime. Inventario,
  catálogo de operaciones y trampas medidas: skill `higgsfield-provider` §«Estado local verificado» +
  [runbook](../../operations/creative-studio/HIGGSFIELD_PROVIDER_RUNBOOK_V1.md) §«Puentes MCP locales» y
  §«CLI `higgsfield`».

## Decisión

Efeonce puede usar Higgsfield como proveedor externo de generación y como fuente de patrones de tooling para
producción creativa gobernada. La adopción se divide en cuatro superficies separadas:

1. **Higgsfield API/SDK/CLI:** proveedor de imagen, video, audio, 3D y workflows.
2. **Higgsfield skills:** referencia para operaciones agentic de generación, brandkit, producto, thumbnails,
   explainers, websites y análisis de viralidad.
3. **Higgsfield local MCPs:** referencia y candidato de uso local para After Effects y Blender, sujeto a revisión
   de seguridad, instalación explícita y permisos del equipo.
4. **Repositorios auxiliares:** Cursor plugin, Homebrew tap, Omagotchi y el framework histórico de GPU; se
   conservan como referencia, no como capacidades de Globe.

Esta decisión **no** declara que Higgsfield esté integrado, promovido o disponible en el Producer. Una capacidad
`provider_supported` no es una ruta Globe. Cada ruta debe tener identidad exacta:

```text
routeId · capability · provider · model · version/endpoint · completion driver · output shape
```

## Alcance auditado

La revisión del 2026-09-17 cubrió los nueve repositorios públicos de la organización oficial:

- [CLI](https://github.com/higgsfield-ai/cli)
- [skills](https://github.com/higgsfield-ai/skills)
- [SDK Python](https://github.com/higgsfield-ai/higgsfield-client)
- [SDK JavaScript/TypeScript](https://github.com/higgsfield-ai/higgsfield-js)
- [MCP local After Effects/Blender](https://github.com/higgsfield-ai/fnf-local-pluging-bridge-mcp)
- [Cursor plugin](https://github.com/higgsfield-ai/cursor-plugin)
- [Omagotchi](https://github.com/higgsfield-ai/omagotchi)
- [Homebrew tap](https://github.com/higgsfield-ai/homebrew-tap)
- [framework de orquestación GPU](https://github.com/higgsfield-ai/higgsfield)

La evidencia fechada y el inventario detallado viven en
[`docs/audits/creative-studio/2026-09-17-higgsfield-github-review.md`](../../../audits/creative-studio/2026-09-17-higgsfield-github-review.md).

## Capacidades que se pueden usar

### API, SDK y CLI

La API es un servicio pagado e independiente del sitio de Higgsfield. El CLI y los SDKs exponen jobs asíncronos,
polling, webhooks, uploads, modelos y workflows. El adapter de Globe debe conservar como mínimo:

- request id, correlation id e idempotency key propios de Globe;
- estado proveedor sin aplanarlo (`queued`, `in_progress`, `completed`, `failed`, `nsfw`, `cancelled` u otro
  estado observado);
- `status_url`, `response_url` o referencia de seguimiento devuelta por el proveedor; nunca derivarla por slug;
- coste cotizado y coste liquidado separados;
- output, MIME, bytes, digest, retención, derechos y provenance;
- reconciliación readback-first después de timeout, desconexión o respuesta ambigua;
- fallback explícito, nunca fallback silencioso entre modelos o proveedores.

Las familias observadas en el CLI incluyen generación de imagen/video/audio/3D, Marketing Studio, Soul, dubbing,
reframe, draw-to-video, video explainer, thumbnails, product photoshoot, marketplace cards y Virality Predictor.
Cada superficie exige su propia route card y sus propios términos; no se hereda evidencia por pertenecer a una
misma familia.

### Skills para agentes

Las skills públicas sirven como referencia de composición y de interacción con el CLI. No se copian sin auditoría
porque algunas incluyen generación de sitios, despliegue, publicación, gestión de secretos o acciones comerciales.
En Greenhouse deben compilarse contra nuestro contrato de aprobación, derechos, créditos, provenance y publicación.

### After Effects y Blender

El MCP local aporta un patrón valioso para Globe: catálogo de operaciones, herramientas atómicas, política
read-only, allowlist de categorías, ejecución agrupada, render/inspección y skills offline. El mailbox local tiene
autoridad equivalente a ejecución de código: debe permanecer privado y nunca compartido. `eval` queda desactivado
por defecto. Su instalación y uso requieren una decisión separada del operador y una revisión de la máquina local.

## Límites no negociables

- Higgsfield no se trata como código fuente de Globe ni como sustituto del API Contract Spine.
- No se copian credenciales, tokens, URLs firmadas, cookies, secretos ni logs upstream.
- No se afirma que los modelos o el backend de Higgsfield sean open source porque existan SDKs, CLI o skills
  públicos.
- No se entrega material a cliente por la sola existencia de un resultado: deben pasar rights, governance,
  provenance, QA y aprobación humana.
- No se activa publicación, website deploy, community feed, contest entry, compra de créditos ni acceso externo
  desde un agente sin el gate correspondiente.
- No se utiliza el framework GPU histórico como base de infraestructura de Globe: es un repositorio distinto,
  antiguo y orientado a entrenamiento distribuido.

## Gating de adopción

| Gate | Evidencia mínima | Estado |
| --- | --- | --- |
| proveedor | documentación, endpoint exacto, catálogo y términos actuales | Preparado documentalmente |
| contrato | route card, output shape, errores y completion | Pendiente por ruta |
| adapter | código server-side, allowlist y tests registrados | Pendiente |
| secreto | Secret Manager/accessor por consumidor, sin valores en repo | Pendiente |
| coste | cotización, reserva, settlement y límite de gasto | Pendiente |
| derechos | plan/model/endpoint, training, retención, región, humanos, exportación | Pendiente |
| canary | generación real atribuida, bytes, digest, governance y readback | Pendiente; Globe hibernado |
| exposición | reader live, Producer y rollout externo | Gated |

## Consecuencias

La primera implementación debe ser un adapter de proveedor en Globe, no una importación masiva de código. Las
skills de Higgsfield se pueden convertir después en una skill espejo gobernada cuando exista un caso de uso real y
un owner. El MCP local se puede evaluar para el carril profesional de composición, pero debe mantener separación
entre generación cloud, edición local y entrega.

## Documentos relacionados

- [Globe Model Fleet](../../../operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md)
- [Runbook de Higgsfield](../../../operations/creative-studio/HIGGSFIELD_PROVIDER_RUNBOOK_V1.md)
- [Documentación funcional](../../../documentation/creative-studio/HIGGSFIELD_PROVIDER.md)
- [Manual de uso](../../../manual-de-uso/creative-studio/higgsfield-provider.md)
- [AI Creative Data & Rights Governance](GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md)
- [Globe Model Route Cards](EFEONCE_GLOBE_MODEL_ROUTE_CARDS_DECISION_V1.md)
