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
- No uses el MCP local sobre un proyecto de After Effects con trabajo no guardado.

## Evidencia mínima

Guarda la referencia al run, modelo, endpoint, versión, prompt efectivo, inputs, usuario/agente, coste, estado,
output digest, MIME, governance, reviewer y decisión de entrega. Separa `prepared`, `candidate`, `approved`,
`delivered` y `published`.
