# TASK-1831 — integración requerida por TASK-1836

Fecha: 2026-09-05. Goal activo: acceso interno MCP y rollback verificables. Subagentes autorizados
por el operador en el goal original. Hook ejecutado tras contrastar/corregir blockers antiguos.
Checkout compartido `efeonce-mcp` (main) y documentación `greenhouse-eo` (develop); sin worktrees.

## Ownership y contrato

- OAuth: contexto tipado y verificador JWT; issuer/JWKS/audiencia fijados, roles separados de scopes.
- OIDC: reader HTTP de bindings; credencial de máquina, esquema estricto, sin caché positiva.
- Identity: políticas declarativas por herramienta, scopes y capabilities canónicas, límites por organización.
- Root: configuración, HTTP/discovery, registro/guard MCP, integración y pruebas de contenedor/documentación.

Cada request construye su server MCP desde la identidad verificada. El listado filtra por autoridad;
el callback vuelve a resolver permisos antes de despachar. El gateway no consulta PG ni decide permisos
de negocio. El provider conserva las comprobaciones de recurso y entitlement.

## Decisiones y límites observados

- Contexto interno firmado y resolver confiable; issuer nativo sin contexto conserva población externa.
- Native interno: SEO con capability vigente y organización exacta. Omisión de organización sólo resuelve
  si hay una membership elegible; se inyecta ese valor antes del provider. Sin selección ambigua.
- Globe/Hiring/funding requieren adaptar/verificar autoridad delegada del provider; skills carece de
  policy nativa propia; grounded y prospectos requieren contratos adicionales. Denegación explícita,
  sin prometer compatibilidad de esos providers. Entra delegado permanece disponible.
- Reader externo preserva memberships individuales. El max gv legacy no mezcla permisos ni permite
  heredar la autoridad de una organización en otra. Interno usa su contexto y gv específicos.
- Native OFF por defecto. El workflow conserva flags/referencias; no hay push, deploy o activación.

## Evidencia y siguientes pasos

- 109 tests passed; pnpm check (format/typecheck/test/build) exit 0.
- JWT real + reader HTTP simulado + MCP HTTP + provider: dos usuarios simultáneos, org ajena, revocación,
  flag OFF y listado filtrado. Callbacks SDK con/sin inputs y paridad de las 37 policies verificados.
- Shim Entra conserva sólo scopes cualificados; discovery nativo no contamina su metadata.
- Contenedor local y auth-negative smoke en curso. Runtime sigue anterior; no hay canary real nuevo.
- Antes de activar: credencial machine del reader con permisos mínimos, consumer y emisor desplegados,
  UI TASK-1835, cohorte gobernada, TASK-1832 y medición de rollback. Providers no compatibles no se abren.
