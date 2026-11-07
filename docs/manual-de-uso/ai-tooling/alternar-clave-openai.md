# Alternar la clave de OpenAI en las CLIs de imagen

> **Tipo de documento:** Manual de uso
> **Version:** 1.2
> **Creado:** 2026-11-01 por Claude (sesión con Julio Reyes)
> **Ultima actualizacion:** 2026-11-05 por Claude — (1.2) `pnpm ai:inpaint` no acepta `--openai-key`: el perfil va con
>   `OPENAI_API_KEY_PROFILE=personal` antepuesto; sin la variable paga la clave de empresa (caso del lote Blog SKY).
> **Documentacion tecnica:** [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) · código `src/lib/ai/openai-api-key.ts`

## Para qué sirve

Permite que `pnpm ai:image`, `pnpm ai:inpaint` y cualquier otro script local que use el cliente
canónico de OpenAI paguen con una **clave alterna** (por ejemplo, una cuenta personal con crédito
propio) sin reemplazar la clave canónica `greenhouse-openai-api-key`. La canónica sigue siendo la de
siempre para todo lo demás, incluidos Vercel y los workers.

Cada clave alterna es un **perfil**: el perfil `personal` vive en el secreto
`greenhouse-openai-api-key-personal` de Secret Manager (proyecto `efeonce-group`).

## Cuándo usar cada clave (regla para agentes y operadores)

| Trabajo | Clave |
|---|---|
| Producto y runtime: Vercel, workers, `pnpm dev`, flujos canónicos del portal | **Empresa** (`greenhouse-openai-api-key`), siempre |
| Generación creativa operada por un agente u operador con `pnpm ai:image` o `pnpm ai:inpaint` (piezas, conceptos, pruebas, iteraciones) | **Personal**, mientras quede crédito: `--openai-key personal` en `ai:image`; `OPENAI_API_KEY_PROFILE=personal` antepuesto en `ai:inpaint` |

- 🔴 **`pnpm ai:inpaint` no tiene `--openai-key`.** Si se lo pasas, falla con «Flag desconocida» y es fácil quitarlo y
  seguir: sin `OPENAI_API_KEY_PROFILE=personal` delante, la corrida paga con la clave de empresa y no avisa, porque
  `ai:inpaint` no imprime qué clave pagó ni la guarda en su `manifest.json`. Caso 2026-11-05 (lote del Blog SKY): las
  portadas salieron con la personal, pero unas 58 expansiones y retoques con `ai:inpaint` (≈ USD 3) se pagaron con la de
  empresa hasta que Julio preguntó cuál se estaba usando. La forma correcta es
  `OPENAI_API_KEY_PROFILE=personal pnpm ai:inpaint image …`, en cada comando y en cada script que lo llame. `pnpm ai:mask`
  no llama a OpenAI y no necesita la variable.
- El perfil personal se pasa **explícito en cada comando**. **NUNCA** se deja como default en
  `.env.local`: ese archivo lo leen todos los procesos locales, incluido `pnpm dev`, y el flujo canónico
  terminaría pagado por la cuenta personal.
- **NUNCA** se declara `OPENAI_API_KEY_PROFILE` en Vercel, workers ni CI.
- Si OpenAI responde **429 / `insufficient_quota`** con el perfil personal, el crédito se acabó: avisar
  al operador y volver a la clave de la empresa quitando el flag. No hace falta tocar código.
- Al reportar una generación, decir qué clave pagó: la CLI lo imprime al final de cada imagen.

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

   Luego dar lectura a la cuenta de servicio con la que corren las CLIs (`greenhouse-portal`, la misma
   que lee la canónica). Sin este paso la corrida falla con `PERMISSION_DENIED` aunque el secreto exista:

   ```bash
   gcloud secrets add-iam-policy-binding greenhouse-openai-api-key-personal --project=efeonce-group --member=serviceAccount:greenhouse-portal@efeonce-group.iam.gserviceaccount.com --role=roles/secretmanager.secretAccessor
   ```

2. **Usarla en una corrida** con el flag:

   ```bash
   pnpm ai:image --openai-key personal --prompt "..."
   ```

3. **Usarla con cualquier CLI** (incluida `ai:inpaint`) con la variable de entorno:

   ```bash
   OPENAI_API_KEY_PROFILE=personal pnpm ai:inpaint image ...
   ```

4. **No dejarla por defecto en `.env.local`.** Ese archivo lo leen todos los procesos locales, incluido
   `pnpm dev`, y el producto terminaría pagado con la cuenta personal (regla de arriba y de `CLAUDE.md`).
   Para scripts que llaman varias veces a la CLI, anteponer la variable dentro del propio script, en cada
   llamada. Para volver a la canónica en una corrida de `ai:image`, usar `--openai-key default`.

## Qué significan las señales

- Cada imagen generada por `ai:image` termina en `· clave personal` o `· clave default`: es la clave
  que pagó esa llamada.
- `ai:inpaint` no imprime la clave. Lo único que asegura la personal es que el comando lleve
  `OPENAI_API_KEY_PROFILE=personal`; revisa el comando o el script, no la salida.
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
- CLI: `scripts/ai/generate-image.ts` (`--openai-key`, que asigna `OPENAI_API_KEY_PROFILE` antes de resolver). `ai:inpaint`
  (`scripts/ai/inpaint/cli.ts`) no tiene el flag: su adaptador `openai` usa `editOpenAIImage`, que resuelve con
  `resolveOpenAIApiKey()` y lee solo la variable de entorno.
