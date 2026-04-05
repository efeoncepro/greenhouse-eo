# Acceso Programatico a Staging

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-05 por agente
> **Ultima actualizacion:** 2026-04-05 por agente
> **Documentacion tecnica:** [GREENHOUSE_STAGING_ACCESS_V1.md](../../architecture/GREENHOUSE_STAGING_ACCESS_V1.md)

---

## Que problema resuelve

El ambiente de **Staging** de Greenhouse tiene una proteccion de seguridad de Vercel (SSO) que bloquea todas las solicitudes automaticas. Esto significa que un agente AI, un script de CI o cualquier herramienta no puede simplemente llamar a una API de Staging — Vercel intercepta la solicitud y devuelve una pagina de login antes de que llegue a la aplicacion.

Para que agentes y scripts puedan trabajar con Staging, se necesitan dos cosas:

1. Un **secreto de bypass** que le dice a Vercel "este request esta autorizado, dejalo pasar"
2. Una **sesion de usuario** valida dentro de la aplicacion Greenhouse

## Como funciona

El sistema tiene un comando que resuelve todo automaticamente:

```bash
pnpm staging:request /api/agency/operations
```

Este comando hace tres cosas por ti:

1. **Obtiene el secreto de bypass** — lo busca en el archivo `.env.local`. Si no existe, lo descarga automaticamente desde la API de Vercel y lo guarda para la proxima vez.
2. **Se autentica como agente** — llama al endpoint de autenticacion con el secreto compartido y recibe una cookie de sesion.
3. **Hace el request** — envia tu solicitud a Staging con el bypass y la cookie, y devuelve la respuesta.

## Ejemplos de uso

| Que quiero hacer                     | Comando                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| Consultar una API                    | `pnpm staging:request /api/agency/operations`                                 |
| Consultar y filtrar la respuesta     | `pnpm staging:request /api/agency/operations --grep reactive`                 |
| Ver la respuesta completa formateada | `pnpm staging:request /api/agency/operations --pretty`                        |
| Enviar datos (POST)                  | `pnpm staging:request POST /api/some/endpoint '{"key":"value"}'`              |
| Combinar con otras herramientas      | `node scripts/staging-request.mjs /api/agency/operations \| jq '.subsystems'` |

## Que variables necesito

| Variable                          | Donde va     | Obligatoria | Explicacion                                                    |
| --------------------------------- | ------------ | ----------- | -------------------------------------------------------------- |
| `AGENT_AUTH_SECRET`               | `.env.local` | Si          | Secreto compartido para que el agente pueda autenticarse       |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | `.env.local` | No          | Se obtiene automaticamente si no existe                        |
| `AGENT_AUTH_EMAIL`                | `.env.local` | No          | Email del agente (por defecto: `agent@greenhouse.efeonce.org`) |

## Reglas importantes

### Lo que NUNCA debes hacer

- **NUNCA** crear la variable `VERCEL_AUTOMATION_BYPASS_SECRET` manualmente en el dashboard de Vercel. La variable es gestionada automaticamente por Vercel. Si creas una manual, sombrea el valor real y rompe el acceso silenciosamente.
- **NUNCA** hacer `curl` directo a la URL de Staging sin el header de bypass. Vercel devuelve una pagina HTML de login, no tu respuesta JSON.
- **NUNCA** commitear `.env.local` ni el bypass secret a Git.

### Si algo deja de funcionar

| Sintoma                        | Que hacer                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Recibo HTML en vez de JSON     | El bypass secret puede estar desactualizado. Borra `VERCEL_AUTOMATION_BYPASS_SECRET` de `.env.local` y corre el comando de nuevo — se re-descarga automaticamente. |
| Error 404 del endpoint de auth | Verifica que `AGENT_AUTH_SECRET` este configurado en el ambiente Staging de Vercel.                                                                                |
| Error 403 del endpoint de auth | Estas intentando contra produccion — el endpoint de agentes esta bloqueado ahi por defecto.                                                                        |
| Timeout al buscar el bypass    | Tu sesion de Vercel CLI puede estar expirada. Corre `vercel login` para renovarla.                                                                                 |

## URLs de Staging

| URL                                                     | Para que sirve                               | Tiene SSO? |
| ------------------------------------------------------- | -------------------------------------------- | ---------- |
| `greenhouse-eo-env-staging-efeonce-7670142f.vercel.app` | Acceso programatico (usar con bypass header) | Si         |
| `dev-greenhouse.efeoncepro.com`                         | Acceso desde el navegador (login SSO humano) | Si         |

## Usuario agente dedicado

El sistema tiene un usuario especial para agentes y tests automatizados:

| Campo     | Valor                                       |
| --------- | ------------------------------------------- |
| Email     | `agent@greenhouse.efeonce.org`              |
| Roles     | `efeonce_admin` + `collaborator`            |
| Proposito | Autenticacion headless para agentes AI y CI |

Este usuario no se crea automaticamente — ya esta provisionado en la base de datos via migracion.

> **Detalle tecnico:** El flujo completo, la resolucion del bypass secret via Vercel API, el modelo de seguridad y la referencia del proyecto Vercel estan documentados en [GREENHOUSE_STAGING_ACCESS_V1.md](../../architecture/GREENHOUSE_STAGING_ACCESS_V1.md). El script fuente es `scripts/staging-request.mjs`.
