# Operar los manuales MCP servidos por el protocolo

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-09-02 por Claude (TASK-1804)
> **Ultima actualizacion:** 2026-09-02 por Claude (TASK-1804)
> **Documentacion funcional:** [manuales-mcp-servidos-por-el-protocolo.md](../../documentation/plataforma/manuales-mcp-servidos-por-el-protocolo.md)

## Para qué sirve

Agregar, cambiar o verificar un manual de uso que los asistentes de IA cargan bajo demanda con la
herramienta `get_greenhouse_skill`, y comprobar que el catálogo servido en staging, producción y
el gateway es el que el repositorio declara.

## Antes de empezar

- Los manuales viven en `docs/mcp/skills/<nombre>/SKILL.md` y se declaran en
  `src/mcp/greenhouse/skill-manifest.ts`. Las dos cosas van en el mismo cambio.
- Cada archivo empieza con un frontmatter YAML con `name` (igual al nombre declarado) y
  `description`. El catálogo lee esos dos campos de ahí; no se copian al manifiesto.
- Un manual se escribe de cero para el consumidor MCP. Nunca se copia una skill de `.claude/skills/`.

## Paso a paso: agregar o cambiar un manual

1. Escribe o edita `docs/mcp/skills/<nombre>/SKILL.md` con frontmatter `name` + `description`.
2. Declara la entrada en `skill-manifest.ts`: `name`, `audience` (hoy siempre `internal`),
   `sourcePath` y `appliesTo` con las herramientas que el manual gobierna.
3. Si el manual gobierna una herramienta que compromete gasto, esa herramienta debe estar en
   `appliesTo` de `seo-spend-discipline`; la prueba lo exige.
4. Corre las pruebas del dominio:

```bash
pnpm vitest run src/mcp src/lib/api-platform/resources/ecosystem-mcp-skills.test.ts
```

5. Corre el gate local:

```bash
pnpm local:check
```

6. Si agregaste una herramienta nueva al manifiesto de tools, regenera el artefacto con
   `pnpm mcp:manifest:generate` y sincronízalo en el gateway con `pnpm greenhouse:manifest:sync`.

## Qué significan las señales

| Señal | Significado | Qué hacer |
| --- | --- | --- |
| El servidor no construye y nombra un manual | Drift entre manifiesto y archivos: declarado sin archivo, archivo sin declarar, `name` distinto, o herramienta gobernada inexistente | Corregir lo que el mensaje nombra; nunca relajar la prueba |
| La prueba de fuga falla | Un manual contiene un dato interno (UUID, `org-…`, ruta `src/`, id de task, secreto) | Reescribir el pasaje sin el dato; no agregar excepciones |
| La lane responde 500 en producción con verde en local | Los `.md` no entraron al bundle de Vercel | Verificar `outputFileTracingIncludes` en `next.config.ts` |
| Catálogo con menos manuales que el manifiesto | Nunca debería ocurrir: el reader falla antes | Tratar como incidente |
| 404 al pedir un manual desde un binding de cliente | Comportamiento esperado: los manuales internos no existen para ese binding | Nada |

## Verificar en staging y producción

Los manuales no se pueden probar en `localhost` por el lane ecosystem. Usa el deployment:

```bash
pnpm staging:request "/api/platform/ecosystem/mcp/skills?externalScopeType=other&externalScopeId=<consumer-key>" --pretty
```

Comprueba que `data.count` sea **exactamente** la cantidad de manuales del manifiesto y que cada
`data.skills[].name` coincida. Luego pide uno por nombre y verifica que `data.body` empiece con el
frontmatter. Con un binding de cliente, el catálogo debe venir vacío y el detalle debe ser 404.

En el gateway, el canary `scripts/greenhouse-seo-canary.mjs` del repositorio `efeonce-mcp` ya
incluye estos tres chequeos (cuenta exacta, cuerpo completo, 404 de inexistente).

## Qué no hacer

- No copiar contenido de `.claude/skills/**` ni de documentos internos a un manual.
- No escribir la `description` en el manifiesto: se lee del frontmatter.
- No embeber manuales en el gateway; el gateway delega en la lane.
- No responder 403 a un consumidor sin acceso: el contrato es 404.
- No declarar un manual con `audience: client` mientras no existan grants por tenant.

## Problemas comunes

- **Cambié el manual y el gateway sigue sirviendo el viejo.** El gateway no cachea contenido; lo
  pide a la lane en cada llamada. Verifica que el deployment de Greenhouse esté al día.
- **La herramienta no aparece en el cliente MCP.** Los clientes cargan las herramientas al iniciar
  sesión; reconecta el cliente.

## Referencias técnicas

- `src/mcp/greenhouse/skill-manifest.ts`, `src/mcp/greenhouse/skill-catalog.ts`
- `src/lib/api-platform/resources/ecosystem-mcp-skills.ts`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` §8
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
