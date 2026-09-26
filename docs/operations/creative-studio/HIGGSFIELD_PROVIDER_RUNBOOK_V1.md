# Runbook — Higgsfield como proveedor de Creative Studio

## Estado

Preparado para implementación; no autoriza generación, compra de créditos, promoción ni publicación. Globe está
sujeto a su compuerta de hibernación y al handoff runtime vigente.

## Antes de tocar el proveedor

1. Lee la decisión de adopción, el fleet ledger y `GLOBE_RUNTIME_HANDOFF.md`.
2. Confirma la identidad exacta de la ruta: capability, modelo, versión, endpoint, región y output shape.
3. Revalida documentación, catálogo, precio y términos actuales en la fuente primaria.
4. Confirma que el plan permite el uso previsto, referencias, exportación y entrega comercial.
5. Comprueba derechos de cada input y la política de datos del endpoint.
6. Define un límite de gasto y exige confirmación antes de una operación facturable.

## Configuración segura

- Guarda la credencial sólo en Secret Manager o en el mecanismo server-side aprobado.
- Nunca la pongas en browser, skill, prompt, log, fixture o commit.
- Usa un accessor separado para cada consumidor real.
- No uses una credencial de operador para afirmar preparación de producción.
- No copies URLs firmadas ni cookies entre superficies.

## Flujo de una ejecución

```text
brief → rights check → route resolve → estimate → confirm → submit → observe
      → readback → ingest → governance → human review → deliver/retain
```

Después de `submit`, conserva la correlación y consulta el estado antes de reintentar. Un timeout no prueba que el
job falló. Un job completado no prueba que el asset fue ingerido. Un asset ingerido no prueba que puede entregarse.

## Estados y errores

Conserva el estado upstream observado y mapea a un estado Greenhouse sin borrar la causa. Registra errores curados,
no cuerpos upstream, stacks, tokens o URLs firmadas. `nsfw`, `rights_unverified`, `provider_unavailable`,
`cost_limit`, `governance_pending` y `human_review_pending` deben seguir siendo distinguibles cuando sus recuperaciones
difieran.

## Puentes MCP locales (Blender · Illustrator · Photoshop · After Effects)

**Estado 2026-09-24:** los puentes de **Blender, Illustrator y Photoshop están instalados, registrados y
verificados** en la Mac del operador (`claude mcp add --scope user`; paquetes `fnf-blender-mcp` 0.2.2,
`@higgsfield_org/illustrator-mcp` 0.1.2 y `@higgsfield_org/photoshop-mcp` 0.1.2 bajo `~/.higgsfield/`). After
Effects, Premiere, TouchDesigner y Resolve **no están instalados**, así que sus workflows no corren aunque el
paquete del puente exista en npm. Inventario, catálogo de operaciones y trampas: skill `higgsfield-provider`
§«Estado local verificado».

Los comandos slash del bundle (`/Destruction-Studio`, `/Vectorize`, `/Image-fixer`, `/use-<app>`…) se resuelven con
`get_preset_instructions` del MCP remoto, no con `get_workflow_instructions`. Instalación y verificación siguen las
referencias `/use-<app>/references/installation` y `/verification` de cada comando.

Antes de instalar un puente nuevo o de operar uno existente:

- verifica que la aplicación esté instalada y su versión (el puente controla la app, no la reemplaza);
- revisa permisos de Automation de macOS y filesystem;
- ejecuta `doctor` (archivos y runtime) y `probe` (app viva) del `dist/cli.js` del paquete; ninguno prueba que la
  conversación tenga las tools: eso sólo lo prueba una conversación nueva con `bl_*`/`ai_*`/`ps_*` visibles;
- comienza en read-only: inspecciona el documento, guarda copias a ruta NUEVA, nunca edites trabajo sin guardar;
- confirma que el mailbox es privado y no está en un directorio compartido;
- deja `eval` desactivado;
- inspecciona el proyecto antes de mutarlo y renderiza un frame representativo después.

No ejecutes pruebas destructivas mientras haya trabajo real abierto. El acceso de escritura al mailbox equivale a
ejecución de código dentro de la aplicación.

## CLI `higgsfield` (generación cloud)

Con sesión desde 2026-09-24 (cuenta `mkt@efeoncepro.com`, workspace `Private`, plan ultra), versión 1.1.26. Se
actualiza con el instalador oficial del repo `higgsfield-ai/cli` (`--prefix=$HOME/.local`); la 0.2.1 ya no puede
iniciar sesión. `higgsfield auth login` abre el navegador y una persona aprueba; después es obligatorio
`higgsfield workspace set <id>`. Es un carril de operador/diagnóstico, distinto de los puentes locales y del carril
API `pnpm ai:fal --capability hf-*`.

## Cierre de una ruta

La ruta sólo puede pasar de `gated` a `available` con route card, adapter, tests, secreto, coste, derechos, canary,
asset governance, readback del output y reader live. Actualiza el ledger humano y el handoff; el reader live sigue
siendo la autoridad de disponibilidad.

## Escalamiento

- Términos, likeness, música, marcas o datos de cliente: `legal-privacy-ip-operator`.
- Créditos, coste o margen: Finance y `greenhouse-finance-accounting-operator`.
- Adapter, completion, route card o promoción: `greenhouse-globe-model-fleet` + `greenhouse-globe`.
- Skill, prompt o publicación externa: `greenhouse-documentation-governor` + derechos creativos.
