---
paths:
  - "src/mcp/**"
---

# Superficie de tools MCP — invariantes (auto-load por path)

**Canon completo:** `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` + `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` §22. **Skills:** `mcp-craft` (el OFICIO domain-free) + `efeonce-mcp-platform` (nuestro gateway).

🔴 **NUNCA afirmes qué dice el spec MCP de memoria.** La revisión `2026-07-28` eliminó `initialize` y las sesiones, y dejó Roots, Sampling, Logging y DCR deprecados con retiro no antes de 2027-07-28 — pero **ningún cliente la implementa todavía**, así que el carril handshake es lo correcto HOY. El estado fechado vive en `mcp-craft/protocol-radar.md`, que manda verificar contra la fuente cuando la decisión es cara.

🔴 **Declara las CUATRO `annotations` explícitamente** (`readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`), jamás ausentes. Sus defaults en el spec son **pesimistas** (`destructiveHint: true`, `openWorldHint: true`): callarlas no es neutro, declara lo peor, y el cliente trata cada lectura pura como destructiva y de mundo abierto. Derivarlas de `writes` y `spendsProviderBudget` es el camino: ya están declaradas.

🔴 **El inventario de tools es `src/mcp/greenhouse/tool-manifest.ts`, y sólo ése.** `server.ts` **registra recorriéndolo**: definir una tool sin entrada —o declarar una entrada sin definición— hace fallar la construcción del servidor nombrándola. **NUNCA** agregues un `registerTool` sin su entrada en el manifiesto; no vas a poder, y ese es el punto.

🔴 **Dos banderas ORTOGONALES por entrada: `writes` y `spendsProviderBudget`.** **NUNCA** fusionarlas en un `readOnly`. Hoy todo lo que gasta también escribe, pero comprar datos del proveedor sin mutar estado propio sigue siendo un efecto secundario que el cliente MCP necesita conocer. **NUNCA** describir como lectura algo que compromete gasto, ni siquiera gasto diferido (seguir una keyword factura en cada ciclo hasta que alguien la deja de seguir).

🔴 **El manifiesto NO lleva campo de federación.** Greenhouse declara qué **EXISTE**; el gateway decide qué **CRUZA**, con revisión humana por tool (decisión de `TASK-1647`, intacta). Agregarle `federated: true` convertiría al inventario en autoridad de autorización y violaría la frontera de adaptador neutral del ADR del gateway.

⚠️ **El registry interno y el conjunto federado NO son el mismo, y está bien.** El gateway federa resolviendo contra **rutas HTTP del lane**, así que una capacidad puede estar federada sin existir como tool interna (caso vivo: `get_seo_provider_spend`). Ese caso se **declara** en `GREENHOUSE_GATEWAY_NATIVE_TOOLS` con razón; una ausencia sin declarar es indistinguible de un olvido, que es el defecto que el guardia existe para cerrar.

⚠️ **El cartel se DERIVA, no se escribe.** El `name` y las `instructions` del servidor se construyen desde el manifiesto (`buildGreenhouseMcpServerIdentity`). **NUNCA** los edites a mano: el servidor se anunciaba `greenhouse-read-only` mientras registraba siete escrituras, y por eso se derivan.

**Gate obligatorio al tocar `src/mcp/**`:** `pnpm mcp:manifest:check` (corre también en `local:check` y en CI). Si editaste el manifiesto, regenera con `pnpm mcp:manifest:generate` y commitea el artefacto junto al cambio. **NUNCA** edites a mano `tool-manifest.generated.json` ni, en el gateway, `greenhouse-tool-manifest.generated.ts`: son artefactos con hash verificado.

**Contar tools:** del manifiesto o de `tools/list`, **nunca** de un grep de `registerTool` — un patrón de prefijos de verbo se come `declare_`/`retire_`, y una clase de caracteres sin dígitos se come `get_seo_visibility_360`. Las dos ya ocurrieron.
