# Alternar la clave de OpenAI en las CLIs de imagen

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-11-01 por Claude (sesión con Julio Reyes)
> **Ultima actualizacion:** 2026-11-01 por Claude
> **Documentacion tecnica:** [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) · código `src/lib/ai/openai-api-key.ts`

## Para qué sirve

Permite que `pnpm ai:image`, `pnpm ai:inpaint` y cualquier otro script local que use el cliente
canónico de OpenAI paguen con una **clave alterna** (por ejemplo, una cuenta personal con crédito
propio) sin reemplazar la clave canónica `greenhouse-openai-api-key`. La canónica sigue siendo la de
siempre para todo lo demás, incluidos Vercel y los workers.

Cada clave alterna es un **perfil**: el perfil `personal` vive en el secreto
`greenhouse-openai-api-key-personal` de Secret Manager (proyecto `efeonce-group`).

## Antes de empezar

- Tener la clave alterna creada en el panel de OpenAI (`platform.openai.com/api-keys`), en la
  organización y el proyecto que tienen el crédito.
- `gcloud` autenticado con permiso para escribir y leer secretos en `efeonce-group`.

## Paso a paso

1. **Guardar la clave una sola vez**, con la clave copiada en el portapapeles (no se muestra):

   ```bash
   gcloud secrets create greenhouse-openai-api-key-personal --project=efeonce-group --replication-policy=automatic && pbpaste | tr -d ' \r\n' | gcloud secrets versions add greenhouse-openai-api-key-personal --project=efeonce-group --data-file=-
   ```

   Para rotarla después, repetir solo la parte de `versions add`.

2. **Usarla en una corrida** con el flag:

   ```bash
   pnpm ai:image --openai-key personal --prompt "..."
   ```

3. **Usarla con cualquier CLI** (incluida `ai:inpaint`) con la variable de entorno:

   ```bash
   OPENAI_API_KEY_PROFILE=personal pnpm ai:inpaint image ...
   ```

4. **Dejarla por defecto en tu máquina** agregando `OPENAI_API_KEY_PROFILE=personal` a `.env.local`.
   Para volver a la canónica, borrar la línea o usar `--openai-key default`.

## Qué significan las señales

- Cada imagen generada por `ai:image` termina en `· clave personal` o `· clave default`: es la clave
  que pagó esa llamada.
- Los resultados del cliente canónico traen `keyProfile` junto a `secretSource`.

## Qué no hacer

- No pegar la clave en el chat, en `.env.local` ni en ningún archivo: vive solo en Secret Manager.
- No declarar `OPENAI_API_KEY_PROFILE` en Vercel ni en los workers: es una herramienta local.
- No sobrescribir `greenhouse-openai-api-key` con la clave alterna.

## Problemas comunes

- **«La clave OpenAI del perfil "personal" no está disponible»**: el secreto no existe, no tiene
  versión o tu cuenta de `gcloud` no puede leerlo. La corrida **no** cae a la canónica, a propósito,
  para no gastar el crédito equivocado.
- **«OPENAI_API_KEY_PROFILE=... no es válido»**: el perfil acepta solo minúsculas, números y guiones.
- **Error 401/429 de OpenAI con el perfil**: la clave fue revocada o el crédito de esa organización
  se agotó; revisar el panel de billing de esa cuenta.

## Referencias técnicas

- Resolver: `src/lib/ai/openai-api-key.ts` (`resolveOpenAIApiKey`, `OPENAI_API_KEY_PROFILE`).
- Consumidores: `src/lib/ai/openai.ts` (texto) y `src/lib/ai/openai-image.ts` (imagen).
- CLI: `scripts/ai/generate-image.ts` (`--openai-key`).
