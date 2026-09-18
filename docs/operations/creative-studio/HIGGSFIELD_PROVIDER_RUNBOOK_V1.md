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

## MCP local After Effects/Blender

Su uso requiere un carril local aprobado. Antes de instalar:

- verifica la aplicación y la versión;
- revisa permisos de Automation y filesystem;
- ejecuta el doctor y las suites offline;
- comienza en read-only;
- confirma que el mailbox es privado y no está en un directorio compartido;
- deja `eval` desactivado;
- inspecciona el proyecto antes de mutarlo y renderiza un frame representativo después.

No ejecutes pruebas destructivas mientras haya trabajo real abierto. El acceso de escritura al mailbox equivale a
ejecución de código dentro de After Effects.

## Cierre de una ruta

La ruta sólo puede pasar de `gated` a `available` con route card, adapter, tests, secreto, coste, derechos, canary,
asset governance, readback del output y reader live. Actualiza el ledger humano y el handoff; el reader live sigue
siendo la autoridad de disponibilidad.

## Escalamiento

- Términos, likeness, música, marcas o datos de cliente: `legal-privacy-ip-operator`.
- Créditos, coste o margen: Finance y `greenhouse-finance-accounting-operator`.
- Adapter, completion, route card o promoción: `greenhouse-globe-model-fleet` + `greenhouse-globe`.
- Skill, prompt o publicación externa: `greenhouse-documentation-governor` + derechos creativos.
