# Auditoría documental — Higgsfield GitHub y superficies de integración

**Fecha de observación:** 2026-09-17
**Tipo:** revisión estática de repositorios públicos y documentación primaria
**Estado:** evidencia histórica; revalidar antes de ejecutar o contratar

## Conclusión

Higgsfield ofrece un conjunto aprovechable de integración: API, CLI, SDKs, skills para agentes y MCPs locales para
After Effects/Blender. El conjunto no equivale a una liberación open source de toda la plataforma. El backend, los
modelos, la cuenta, los créditos, los términos comerciales y la disponibilidad de cada endpoint siguen siendo
dependencias externas que deben verificarse por ruta.

## Inventario

| Repo | Hallazgo | Licencia/uso observado | Relevancia |
| --- | --- | --- | --- |
| `cli` | CLI con 40+ modelos, workflows, Marketing Studio, Virality Predictor, websites y jobs | MIT en repo; servicio externo requerido | Alta |
| `skills` | 9 skills para generación, brandkit, producto, marketplace, explainer, websites, thumbnail y juegos | MIT; contenido agent-facing | Alta, con auditoría |
| `higgsfield-client` | SDK Python sync/async, upload, polling, webhook y agent API | Apache-2.0 | Alta para workers |
| `higgsfield-js` | SDK Node/TS, cliente server-side, polling y webhook | Revisar licencia del release antes de redistribuir | Alta para Globe |
| `fnf-local-pluging-bridge-mcp` | MCP local independiente para After Effects y Blender, catálogo y políticas | MIT; basado parcialmente en upstream MIT | Alta para tooling local |
| `cursor-plugin` | Distribución de comandos/skills para Cursor | MIT | Media; patrón de distribución |
| `higgsfield` | Framework de orquestación GPU y entrenamiento distribuido | Apache-2.0; última historia observada 2024 | Baja; no confundir con API actual |
| `omagotchi` | Demo de avatar Omarchy, CLI fijado y descargas con digest | MIT | Baja; referencia de hardening |
| `homebrew-tap` | Fórmula de instalación del CLI para macOS | Sin licencia explícita observada | Baja |

## Hallazgos operativos

### Integración cloud

El SDK TypeScript es la base más natural para un adapter de Globe: evita ejecutar el CLI como proceso, ofrece
polling y expone webhooks. El SDK Python resulta útil para workers o experimentos, pero no debe crear un segundo
contrato de jobs. El CLI puede servir como herramienta de operador y fallback de diagnóstico, no como hot path del
Producer.

### Skills

Las skills describen una capa de intención semántica encima de modelos y workflows. Su valor para Efeonce está en
la descomposición de tareas, selección de modelo, formato, referencias y QA. Sus operaciones de website deploy,
secrets, publicación y concursos deben quedar fuera del allowlist inicial.

### MCP local

El repositorio separa After Effects y Blender como servidores MCP distintos, usa catálogo runtime, operaciones
atómicas y una política `read-only`. También documenta un riesgo crítico: quien puede escribir el mailbox puede
alcanzar ejecución de código dentro de After Effects. Greenhouse debe conservar ese principio en cualquier adapter
local y exigir permisos de filesystem/Automation explícitos.

### Coste y derechos

La API usa créditos/dinero y los modelos tienen precios y parámetros propios. Una cotización no es un cobro, un job
aceptado no es un output, y un output no es un activo entregable. Los términos deben registrarse por plan/modelo/
endpoint y fecha, junto con training, retención, región, subprocesadores, acceso humano, exportación e indemnidad.

## Recomendación

Adoptar en este orden:

1. route cards de proveedor y capability map;
2. adapter TypeScript server-side con reconciliación y spend fence;
3. una ruta image o video de bajo riesgo con canary real cuando Globe pueda reactivarse;
4. skills Efeonce adaptadas, con aprobación y derechos;
5. evaluación separada del MCP local After Effects/Blender;
6. distribución de CLI sólo para operadores autorizados.

## Fuentes primarias

- [Organización oficial Higgsfield](https://github.com/higgsfield-ai)
- [Higgsfield API](https://higgsfield.ai/higgsfield-api)
- [API: cómo funciona](https://higgsfield.ai/blog/higgsfield-api)
- [Help Center: plataformas oficiales y open source](https://higgsfield.ai/creator-hub/help-center/getting-started/official-higgsfield-platforms)
