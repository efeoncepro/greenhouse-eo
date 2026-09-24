---
name: higgsfield-provider
description: >-
  Integra y opera Higgsfield como proveedor gobernado de Efeonce Globe: API, SDKs, CLI, skills agentic y los
  puentes MCP locales para Blender, Illustrator y Photoshop (instalados y conectados en la Mac del operador desde
  2026-09-24; After Effects, Premiere, TouchDesigner y Resolve NO están instalados). Úsala para route cards,
  adapters, completion, costes, derechos, provenance, canarios, revisión de los repositorios públicos oficiales y
  para resolver los comandos slash del bundle de producción (/Destruction-Studio, /Vectorize, /Image-fixer…).
  No autoriza por sí sola generación, publicación ni despliegue.
---

# Higgsfield Provider

## Canon y composición

Carga siempre `greenhouse-globe`, `greenhouse-globe-model-fleet`, `greenhouse-ai-creative-rights-governance`,
`greenhouse-secret-hygiene` y `greenhouse-documentation-governor` cuando cambie integración, skill o workflow.

Fuentes canónicas:

- `docs/architecture/creative-studio/EFEONCE_HIGGSFIELD_PROVIDER_ADOPTION_DECISION_V1.md`
- `docs/audits/creative-studio/2026-09-17-higgsfield-github-review.md`
- `docs/operations/creative-studio/HIGGSFIELD_PROVIDER_RUNBOOK_V1.md`
- `docs/documentation/creative-studio/HIGGSFIELD_PROVIDER.md`
- `docs/manual-de-uso/creative-studio/higgsfield-provider.md`

## Reglas

- Provider-supported no significa integrado ni disponible en Globe.
- Fija `routeId + capability + provider + model + version/endpoint` antes de actuar.
- Usa SDK server-side como preferencia; CLI sólo para operador o diagnóstico.
- Conserva estados upstream, URLs de seguimiento devueltas por request, polling/webhook y readback-first.
- Cotización, reserva, settlement y coste realizado son hechos separados.
- No imprimas secretos, cuerpos upstream, URLs firmadas, cookies ni prompts confidenciales.
- Toda salida pasa provenance, Asset Governance, derechos y revisión humana.
- Skills de Higgsfield son referencias: no copies acciones de deploy, publicación, secrets o websites sin adaptar los
  gates de Efeonce.
- Los puentes MCP locales (Blender, Illustrator, Photoshop; After Effects cuando se instale) comienzan en read-only
  sobre el documento del operador: inspeccionar antes de mutar, guardar copia a ruta NUEVA, nunca editar trabajo
  sin guardar de una ventana abierta. Mailbox compartido y `eval` están prohibidos.
- No uses el framework histórico `higgsfield` como infraestructura de Globe.

## Estado local verificado (2026-09-24, Mac del operador)

**Dos catálogos distintos en el MCP remoto de Higgsfield.** `get_workflow_instructions` lista sólo workflows de
generación (ad-multiplier, ugc-*, product-photoshoot, faceless-video…). Los comandos slash del bundle de
producción y los setups de aplicación viven en **`get_preset_instructions`**: con el slash exacto devuelve el
`SKILL.md` del workflow; con `/use-<app>/references/installation` o `/verification` devuelve sus referencias.
NUNCA concluir «ese workflow no existe» sin consultar los dos catálogos.

| Slash del bundle | App | Skill que carga en el puente | ¿Corre hoy? |
|---|---|---|---|
| `/Destruction-Studio` | Blender | `bl_get_skill blender-destruction` | Sí |
| `/Exploded-view` · `/Scene-Builder` · `/Cartoon-shaders` | Blender | vía `bl_get_skill` | Sí |
| `/Vectorize` | Illustrator | `ai_get_skill illustrator-vector-art` | Sí |
| `/Image-fixer` | Photoshop | `ps_get_skill ps-deslop` (+ `ps-retouch`) | Sí, ruta segura |
| `/Shot-Composer` · `/Shot-Cleanup` | After Effects | `fnf-after-effects-mcp` 0.1.3 existe en npm | No: la app no está instalada |
| `/Project-sorter` | Premiere | — | No: la app no está instalada |
| `/use-touchdesigner` · `/color-grading` | TouchDesigner · Resolve | — | No: las apps no están instaladas |

**Puentes instalados y registrados** con `claude mcp add --scope user` (config de usuario de Claude Code, todos
`✔ Connected`). Node fijado: `/Users/jreye/.volta/tools/image/node/24.17.0/bin/node`.

| Servidor MCP | Paquete | Ruta | Verificación real |
|---|---|---|---|
| `higgsfield-use-blender` | `fnf-blender-mcp` 0.2.2 (env `BLENDER_EXECUTABLE=/Applications/Blender.app/Contents/MacOS/Blender`) | `~/.higgsfield/blender-mcp/` | `doctor` lanzó Blender 5.1.2 en background, `ok:true` |
| `higgsfield-use-illustrator` | `@higgsfield_org/illustrator-mcp` 0.1.2 | `~/.higgsfield/illustrator-mcp/` | `probe` → Illustrator 30.8.1 |
| `higgsfield-use-photoshop` | `@higgsfield_org/photoshop-mcp` 0.1.2 | `~/.higgsfield/photoshop-mcp/` | `probe` → Photoshop 27.10.0 |

Cada puente expone `doctor` (archivos y runtime) y `probe` (app viva) en su `dist/cli.js`; ninguno prueba que la
conversación actual tenga las tools. Las tools `bl_*`, `ai_*` y `ps_*` aparecen **sólo en una conversación nueva**
tras registrar. Blender corre como proceso en background con su Python interno (sin add-on); cada sesión MCP es
dueña de su escena y no lee una ventana abierta sin guardar. Illustrator y Photoshop se controlan por AppleScript +
ExtendScript, con permisos de Automation de macOS.

**Qué expone el puente de Photoshop (catálogo real, 71 operaciones):** documentos (crear/abrir/duplicar/redimensionar/
recortar/guardar copia PSD/exportar PNG-JPEG/preview), capas completas (crear, agrupar, orden, opacidad, blend,
clipping, transformar, rasterizar, merge), Smart Objects (colocar, convertir, reemplazar), texto editable
(fuente PostScript, tamaño, color, posición, caja), selecciones y máscaras, efectos de capa, capas de ajuste
(brillo/contraste, tono/saturación), filtros (gaussiano, movimiento, enfoque, unsharp, high pass, mediana, ruido),
guías, trazados y `batch.run` de hasta 30 operaciones. **NO expone** Healing/Clone/Patch, Content-Aware ni
Generative Fill, Color Range, Gradient Fill, Lens/Radial Blur ni JSX arbitrario: `ps-deslop` sólo completa su ruta
segura y debe nombrar las etapas bloqueadas; `ps-retouch` clasifica y prepara prompt, no retoca nativo.

**Trampas medidas:**

- El `probe` de Photoshop devuelve `AppleEvent timeout (-1712)` si la app aún está arrancando y deja un lock que es
  un **directorio** (`~/.higgsfield-adobe/photoshop.lock`). Confirmar que no hay `osascript` corriendo, `rm -rf` el
  lock y reintentar con la app ya abierta.
- El `probe` de Illustrator abre la app solo y pasa a la primera.
- Instalar un puente sin la app instalada registra bien y falla en `probe`: el puente controla la app, no la
  reemplaza. After Effects se instala desde Creative Cloud y después se corre `/use-after-effects`.

**CLI `higgsfield` (`~/.local/bin`, alias `hf`/`higgs`) — con sesión desde 2026-09-24.** Cuenta
`mkt@efeoncepro.com`, workspace `Private` (plan ultra). La 0.2.1 quedó obsoleta (la página de login dice «Update
your app to sign in»); se actualiza con el instalador oficial `raw.githubusercontent.com/higgsfield-ai/cli/main/
install.sh` con `--prefix=$HOME/.local` (hoy 1.1.26). `higgsfield auth login` abre el navegador solo y no imprime
URL: una persona aprueba. Tras el login es **obligatorio** `higgsfield workspace set <id>` o `account status`
falla con «No workspace selected». La CLI es para generación cloud (`model list`, `workflow list`, `generate`,
`upload`) y es independiente de los puentes locales y del carril `pnpm ai:fal --capability hf-*` de la API.

**Skills oficiales `higgsfield-ai/skills` (MIT, v0.12.0) — instaladas 2026-09-24 a nivel usuario, fuera del repo.**
Clon persistente en `~/.higgsfield/skills`; cada skill es un symlink en `~/.claude/skills/` creado por su
`./setup --host claude`: `higgsfield-generate`, `higgsfield-soul-id`, `higgsfield-product-photoshoot`,
`higgsfield-brandkit`, `higgsfield-marketplace-cards`, `higgsfield-websites`, `higgsfield-video-explainer` y
`higgsfield-youtube-thumbnail` (la novena, `higgsfield-game-generation`, la lista el instalador pero no existe en el
repo). Todas ejecutan por la CLI con sesión; `brandkit` además corre Python local. Las copias 0.3.0 de mayo quedaron
respaldadas en `~/.higgsfield/skills-backup-0.3.0-2026-09-24`. Actualizar: `git -C ~/.higgsfield/skills pull` y
volver a correr el `setup`. Siguen siendo **referencias de composición**: sus acciones de deploy, publicación,
websites o secrets no se ejecutan sin adaptar los gates de Efeonce (regla de arriba).

## Checklist de ruta

1. Lee `GLOBE_RUNTIME_HANDOFF.md`; respeta hibernación.
2. Revalida endpoint, modelo, términos, precio y plan.
3. Crea route card y declara output shape.
4. Implementa adapter y estados con tests registrados.
5. Configura secreto server-side y spend fence.
6. Obtén evidencia exacta de rights/data governance.
7. Ejecuta canary sólo con Globe activo y autorización.
8. Verifica bytes, digest, MIME, governance, reader y UI.
9. Actualiza ledger, handoff, auditoría y changelog.
