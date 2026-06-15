# TASK-1131 — Nexa chat endpoint: contrato de error canónico + captureWithDomain

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Domain: `nexa|platform|reliability`

## Por qué existe

Detectado en la revisión profunda del Nexa Chat (TASK-1124 follow-up).

**Alcance — es el endpoint COMPARTIDO, no legacy-específico.** `/api/home/nexa` (el "home" del nombre
es histórico) es el **único backend de chat de Nexa**: lo consumen (a) el **chat embebido del home
legacy** (`HomeView.tsx` → `NexaThread` + `NexaThreadSidebar`), (b) el **chat flotante global**
(`NexaFloatingButton` → `NexaFloatingPanel` → reusa `NexaThread`, montado en todo el dashboard,
incl. el home v2 que NO embebe chat). Arreglar el contrato de error de este endpoint **beneficia a
todos los consumidores a la vez** (legacy + flotante).

El endpoint maneja el error así:

```ts
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error('Nexa API failed:', message, error)
  return NextResponse.json({ error: message }, { status: 500 })
}
```

Dos problemas (bug-class canónico de Greenhouse):

1. **Devuelve el `error.message` crudo (en inglés) al cliente** es-CL → viola el "Canonical API
   error response contract" (CLAUDE.md): el campo `error` debe ser prosa es-CL safe, con `code` +
   `actionable`, y NUNCA detalle técnico/stack/SQL al cliente.
2. **No usa `captureWithDomain`** → el fallo no se rolea al módulo Nexa en el reliability dashboard.

## Qué hacer

1. Reemplazar el `NextResponse.json({ error: message }, { status: 500 })` por `canonicalErrorResponse`
   (`src/lib/api/canonical-error-response.ts`) con un `CanonicalErrorCode` adecuado (extender el enum
   si hace falta, p.ej. `nexa_generation_failed`, `actionable: true` si reintentar puede resolver).
2. Capturar el error con `captureWithDomain(error, 'identity'|'delivery'|<dominio Nexa>, { tags: { source: 'nexa_chat_endpoint' } })` + `redactErrorForResponse` para no leakear detalle.
3. Revisar los otros handlers del endpoint Nexa (`threads/`, `feedback/`) por el mismo patrón.
4. (Opcional) El consumer del cliente (NexaThread/use-nexa-runtime) debe parsear el body canónico
   (`throwIfNotOk`) en vez de `payload?.error` crudo.

## Aceptación

- El 500 del chat devuelve es-CL + `code` + `actionable`, sin detalle técnico.
- El fallo se captura con `captureWithDomain` (aparece en el reliability dashboard del módulo).
- Tests del endpoint cubren el path de error.

## Referencias

- Contrato: CLAUDE.md "Canonical API error response contract" + `src/lib/api/canonical-error-response.ts`.
- Capa: `docs/architecture/nexa-intelligence/behavior/behavior-and-routing.md`.
- Procedencia: TASK-1124 (revisión profunda del chat).

## Resultado (2026-06-15, completo en `develop`)

1. **Enum canónico** (+`nexa_generation_failed` 500 actionable, +`nexa_prompt_required` 422) en `src/lib/api/canonical-error-response.ts`.
2. **`POST /api/home/nexa`**: 401→`unauthorized`, sin prompt→`nexa_prompt_required`, 500→`captureWithDomain(error, 'home', { tags: { source: 'nexa_chat_endpoint' }, extra: redactErrorForResponse })` + `canonicalErrorResponse('nexa_generation_failed')`. Cero `error.message` crudo al cliente.
3. **Handlers hermanos** (`feedback/`, `threads/`, `threads/[threadId]`): 401→`unauthorized` + try/catch en cada store call → `captureWithDomain('home', { source: 'nexa_*_endpoint' })` + `internal_error`. Cierra el gap de fallo de store sin tag (antes: 500 desnudo de Next).
4. **Cliente** (`use-nexa-runtime.ts:135`) lee `errorBody.error` → ahora es-CL canónico **por construcción** (sin cambiar el cliente; root-cause en el endpoint).
5. **Test** `route.test.ts`: 401 / 422 / 500-canónico-sin-leak-captura-home / 200. Doc de capa `behavior/behavior-and-routing.md` actualizada.

**Decisión de dominio:** `home` (el endpoint es `/api/home/nexa`, el módulo `home` declara `incidentDomainTag: 'home'` → el fallo se rolea al dashboard). No se creó un domain `nexa` (scope creep P3).
**Frontera de scope:** los 400/404 de validación específica (`Missing responseId`, `Invalid sentiment`, `Missing threadId/title`, `Thread not found`) se dejaron como señales de contrato de API (no son el bug-class del leak; el cliente los mapea por status). Canonicalizarlos = follow-up opcional.
