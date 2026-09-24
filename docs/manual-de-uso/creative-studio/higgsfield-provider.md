# Manual — usar Higgsfield con Creative Studio

Este manual describe el flujo aprobado. Mientras la ruta esté `gated`, sólo permite discovery y preparación.

## Preparación

1. Abre la decisión [de adopción](../../architecture/creative-studio/EFEONCE_HIGGSFIELD_PROVIDER_ADOPTION_DECISION_V1.md).
2. Lee [el estado de Globe](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).
3. Verifica que la ruta exacta aparece disponible en el reader live. Si no aparece, no generes.
4. Revisa derechos de referencias, logos, rostros, voces, música y materiales del cliente.
5. Cotiza y fija el límite de gasto.

## Ejecución

1. Define el brief y el output shape.
2. Selecciona el endpoint exacto; no sustituyas modelos por nombre parecido.
3. Confirma el gasto cuando el flujo lo exija.
4. Envía desde el backend autorizado.
5. Espera por webhook o poll, conservando la correlación.
6. Lee el resultado y verifica bytes, MIME, digest y estado terminal.
7. Espera Asset Governance y registra provenance.
8. Solicita revisión humana antes de entregar, programar o publicar.

## No hagas esto

- No pegues la API key en una conversación o archivo.
- No reintentes una generación tras timeout sin readback.
- No llames “open source” a los modelos porque el SDK sea público.
- No entregues un resultado sólo porque tiene URL.
- No uses un puente local sobre un documento de Blender, Illustrator, Photoshop o After Effects con trabajo no
  guardado: guarda primero en la app y deja que el puente lo abra o duplique.
- No borres el lock de Photoshop (`~/.higgsfield-adobe/photoshop.lock`, es un directorio) sin confirmar antes que
  no hay ningún `osascript` corriendo.

## Puentes locales y CLI (carril de operador)

Los workflows del bundle de producción (`/Destruction-Studio`, `/Exploded-view`, `/Scene-Builder`,
`/Cartoon-shaders`, `/Vectorize`, `/Image-fixer`) funcionan con un puente MCP local por aplicación. Desde el
2026-09-24 están instalados y conectados en la Mac del operador los de **Blender, Illustrator y Photoshop**. Los de
After Effects, Premiere, TouchDesigner y DaVinci Resolve necesitan que la aplicación esté instalada primero.

Paso a paso para usarlos:

1. Abre una **conversación nueva** de Claude Code local: las herramientas `bl_*`, `ai_*` y `ps_*` no aparecen en la
   sesión donde se registró el puente.
2. Pide el workflow por su slash exacto y entrega el brief: objetivo, assets con ruta local, formato de salida y
   duración o cantidad de piezas.
3. Ten la aplicación abierta y sin cambios pendientes; el puente inspecciona primero y guarda a rutas nuevas.
4. Revisa el resultado en la app y conserva el archivo editable (`.blend`, `.ai`, `.psd`) como entregable.

Para volver a verificar un puente sin abrir conversación:

```bash
node ~/.higgsfield/photoshop-mcp/node_modules/@higgsfield_org/photoshop-mcp/dist/cli.js probe
```

(igual con `illustrator-mcp`; para Blender, `~/.higgsfield/blender-mcp/node_modules/fnf-blender-mcp/dist/cli.js
doctor --blender /Applications/Blender.app/Contents/MacOS/Blender`). Si Photoshop devuelve un timeout de
AppleEvent, espera a que termine de arrancar y reintenta.

La CLI `higgsfield` (alias `hf`) tiene sesión con `mkt@efeoncepro.com` y workspace `Private` seleccionado. Si
`account status` dice «No workspace selected», corre `higgsfield workspace list` y `higgsfield workspace set
<id>`. Si el login muestra «Update your app to sign in», actualiza la CLI con el instalador oficial del repositorio
`higgsfield-ai/cli` antes de reintentar.

## Evidencia mínima

Guarda la referencia al run, modelo, endpoint, versión, prompt efectivo, inputs, usuario/agente, coste, estado,
output digest, MIME, governance, reviewer y decisión de entrega. Separa `prepared`, `candidate`, `approved`,
`delivered` y `published`.
