# Astro Actions

Type-safe server functions callable from the client **and** from HTML forms with
progressive enhancement. Use Actions for "client submits data → **server logic you
own** does work → returns typed result" — prefer them over hand-rolled `POST`
endpoints unless you need a public REST contract.

> ⚠️ **Actions are for logic THIS site owns.** If the form is *governed by another
> service* that already exposes a contract (a schema endpoint + a submit endpoint —
> e.g. Greenhouse Growth Forms behind `GET /api/public/growth/forms/{key}` +
> `POST .../submit`), do **NOT** wrap it in an Astro Action. Wrapping it either forks
> the governed contract (re-authoring fields/validation) or adds a pointless proxy.
> Instead: fetch the schema server-side, render a native `<form>` from it, and POST
> to the governed endpoint. That's the efeonce-think AEO grader form — see
> `efeonce-overlay.md`. Actions are correct when efeonce-think genuinely owns the
> server logic (not the AEO case).

## Define an action

```ts
// src/actions/index.ts
import { defineAction, ActionError } from 'astro:actions'
import { z } from 'astro:schema'

export const server = {
  requestGrade: defineAction({
    accept: 'form',                       // 'form' | 'json' (default 'json')
    input: z.object({                     // validated server-side; typed on client
      brand: z.string().min(2),
      website: z.string().url(),
      email: z.string().email(),
    }),
    handler: async (input, ctx) => {
      // ctx has locals, cookies, session, request — full server context
      const res = await fetch(`${import.meta.env.GRADER_API}/enqueue`, {
        method: 'POST',
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'No pudimos iniciar el análisis. Intenta de nuevo.',
        })
      }
      return await res.json() as { runId: string }
    },
  }),
}
```

- `input` — a Zod schema. Validation runs on the server; the client call is
  typed from it.
- `accept: 'form'` — the action can receive a native `FormData` submit (enables
  progressive enhancement). Omit for JSON-only client calls.
- `ActionError` — throw with a stable `code`; the client gets a typed error, not
  a stack trace.

## Call from a client island

```tsx
import { actions } from 'astro:actions'

const { data, error } = await actions.requestGrade({
  brand, website, email,
})
if (error) {
  // error.code, error.message — typed, safe to show
} else {
  // data.runId — typed from the handler's return
}
```

## Call from a native HTML form (progressive enhancement)

This is the pattern that fixes the "form only works via client-side fetch"
failure. The form is real HTML that POSTs even with JS disabled; the island
enhances it.

```astro
---
// src/pages/index.astro  (needs prerender=false OR an action route)
import { actions } from 'astro:actions'

const result = Astro.getActionResult(actions.requestGrade)
if (result && !result.error) {
  return Astro.redirect(`/report/${result.data.runId}`)
}
---
<form method="POST" action={actions.requestGrade}>
  <input name="brand" required minlength="2" />
  <input name="website" type="url" required />
  <input name="email" type="email" required />
  <button>Recibir informe</button>
</form>

{result?.error && <p class="error">{result.error.message}</p>}
```

- `action={actions.requestGrade}` — wires the form to the action; works without
  JS (server handles the POST and re-renders).
- `Astro.getActionResult(action)` — read the result server-side after a form
  POST to redirect or show errors.
- Add a client island on top for inline validation / optimistic UI, but the base
  form already works. **This is the resilient shape.**

## Handling results & errors cleanly

- Use `isInputError(error)` to distinguish Zod validation failures from thrown
  `ActionError`s and map them to field-level messages.
- Errors are typed by `code` (`BAD_REQUEST`, `UNAUTHORIZED`,
  `INTERNAL_SERVER_ERROR`, etc.) — branch UI on the code, mirror the canonical
  error contract idea (actionable vs structural).
- Never leak internal detail in `message`; log the real error server-side.

## Actions vs endpoints — when to use which

| Use **Actions** when | Use an **endpoint** (`src/pages/api/*.ts`) when |
|---|---|
| A form or your own client calls it | You need a public/stable REST URL for third parties |
| You want type-safety end to end | A webhook, OAuth callback, or non-Astro consumer hits it |
| You want progressive enhancement for free | You need full control of the `Response` (streaming, custom headers) |

## Hard rules

- **NEVER** make the form's only path a client-side `fetch` — use `accept: 'form'`
  so it degrades. (Root cause of the AEO embed error.)
- **NEVER** trust client input — the Zod `input` schema is the validation
  boundary; keep it strict.
- **NEVER** return raw upstream errors — wrap in `ActionError` with es-CL
  copy and a stable code.
- **SIEMPRE** compose form UX (timing, masks, recovery) with `forms-ux`; Actions
  is the mechanism, not the UX doctrine.
