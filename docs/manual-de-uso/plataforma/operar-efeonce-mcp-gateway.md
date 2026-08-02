# Operar Efeonce MCP Gateway

> **Tipo de documento:** Manual de uso / runbook breve
> **Endpoint canónico:** `https://mcp.efeonce.org/mcp`
> **Documentación funcional:** [Efeonce MCP Gateway](../../documentation/plataforma/efeonce-mcp-gateway.md)
> **Runbook técnico:** [Efeonce MCP Platform Runbook](../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md)

## Antes de probar

Confirma que el cliente OAuth está registrado para el resource `https://mcp.efeonce.org/mcp` y que su usuario
pertenece al tenant interno autorizado. No copies tokens en archivos, capturas ni tickets.

El cliente compatible con Streamable HTTP debe usar el endpoint canónico y obtener su token mediante OAuth PKCE.
No uses la URL `run.app`: el acceso público pasa por el front door y el hostname canónico.

## Verificación operativa

1. Abre `https://mcp.efeonce.org/health`: debe devolver estado saludable y confirmar OAuth configurado.
2. Consulta `https://mcp.efeonce.org/.well-known/oauth-protected-resource`: debe declarar el resource y los
   scopes soportados.
3. Con un cliente OAuth autorizado, ejecuta `initialize`.
4. Ejecuta `globe.capabilities.list` y luego `globe.producer.fleet.list` sin argumentos.
5. Confirma que la respuesta contiene rutas, disponibilidad y correlation ID, pero no house, provider slug,
   costo de vendor ni margen.

Para una prueba release-controlada desde el repo `efeonce-mcp`, usa `pnpm oauth:canary`. En macOS abre Google
Chrome y debe ejecutarse con el perfil autenticado autorizado. Al terminar, cierra sólo la ventana de prueba; no
cierres la sesión compartida del perfil.

## Operación segura

- La capacidad actual es lectura interna. No habilites tools de runs, assets, review, delivery, créditos o writes
  como parte de una prueba de acceso.
- Mantén Cloud Run en `concurrency=80` y `maxScale=5` mientras no haya una decisión explícita de capacidad.
- Ante una falla de Globe, conserva OAuth y el gateway; deshabilita sólo el provider y redespliega siguiendo el
  runbook. El rollback de revisión no se sustituye con acceso anónimo.
- No demuestres errores retirando IAM o forzando timeout en producción. Usa las pruebas automatizadas o un canary
  aislado.

## Antes de clientes externos

No entregues este endpoint a clientes hasta que exista entitlement por tenant/capability y una prueba real de
persona base-only denegada para Globe. Al cliente interno actual se le entregan hoy el scope base y el de lectura
de Globe incluso si solicita sólo el base; por eso no prueba esa separación.

Cuando revises los scopes soportados en el paso 2 de la verificación, ten presente que el gateway declara tres, no
dos: el base, el de lectura de Globe y el de escritura interna de fondeo de créditos, que aparece sólo cuando su
flag está encendido. Ese tercero se autoriza por separado y no queda demostrado por la entrega conjunta de los dos
primeros; no lo uses como evidencia de nada.
