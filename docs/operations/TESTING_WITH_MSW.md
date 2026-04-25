# Testing with MSW (Mock Service Worker)

> **Tipo de documento:** Operacional (how-to + convenciones)
> **Version:** 1.0
> **Creado:** 2026-04-21 por Claude (TASK-522)
> **Documentacion tecnica:** este archivo es la referencia canonica

## Que es

MSW (Mock Service Worker) es el layer canonico para mockear requests HTTP en tests del portal. Intercepta a nivel red (fetch/XHR) y devuelve respuestas controladas por handlers declarativos. Un mismo set de handlers sirve para Vitest (`msw/node`), Playwright (`msw/browser`) y, opt-in, dev mode en el navegador.

Reemplaza el patron legacy `vi.stubGlobal('fetch', ...)` disperso por test. La ventaja: los mocks se definen una vez cerca del contract, no cada vez que un test toca la red.

## Que no es

- **No es un stub de BigQuery ni de PostgreSQL** — solo intercepta HTTP. Queries siguen mockeandose via `vi.mock('@/lib/db', ...)` o equivalentes.
- **No corre en production** — el service worker vive bajo `public/mockServiceWorker.js` pero solo se activa explicitamente con `worker.start()`. Nunca se inicia automaticamente.
- **No reemplaza tests de integracion reales** contra staging — es para unit y component tests.

## Stack

| Pieza | Version |
| --- | --- |
| `msw` | `^2.x` |
| Handlers canonicos | `src/mocks/handlers.ts` |
| Domain splits | `src/mocks/handlers/{finance,hr,people}.ts` |
| Node server (Vitest) | `src/mocks/node.ts` |
| Browser worker (Playwright/dev) | `src/mocks/browser.ts` |
| Service worker script | `public/mockServiceWorker.js` (committed) |
| Vitest lifecycle | `src/test/setup.ts` |

## Como corren los tests hoy

Sin cambios en el comando: `pnpm test` (Vitest) sigue funcionando. El server MSW se levanta en `beforeAll`, se resetea por test en `afterEach` y se cierra en `afterAll` — todo transparente para el autor del test.

```bash
pnpm test                # Vitest run completo
pnpm test:watch          # Watch mode
pnpm test:coverage       # Con coverage v8
```

## Como agregar un handler canonico

Los handlers base viven por dominio en `src/mocks/handlers/`. Son respuestas por defecto estructuralmente validas (arrays vacios, envelopes correctos). No modelan logica de negocio — los tests las especializan con `server.use(...)`.

Para agregar un dominio nuevo (ej. `agency`):

1. Crear `src/mocks/handlers/agency.ts`:

```typescript
import { http, HttpResponse } from 'msw'

export const agencyHandlers = [
  http.get('*/api/agency/operations', () =>
    HttpResponse.json({ items: [] })
  )
]
```

2. Registrarlo en `src/mocks/handlers.ts`:

```typescript
import { agencyHandlers } from './handlers/agency'

export const handlers = [...financeHandlers, ...hrHandlers, ...peopleHandlers, ...agencyHandlers]
export { agencyHandlers }
```

Los dominios usan patterns con wildcard (`*/api/agency/...`) para que el mismo handler funcione en Node (donde fetch requiere URLs absolutas) y en el browser.

## Como overridear handlers en un test

Patron canonico: `server.use(...)` dentro del test especifico. El reset automatico en `afterEach` garantiza que no haya leak entre tests.

```typescript
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/node'

it('rinde Nexa insights desde intelligence snapshot', async () => {
  server.use(
    http.get('*/api/people/:memberId/intelligence', ({ params }) => {
      expect(params.memberId).toBe('member-1')

      return HttpResponse.json({
        nexaInsights: { totalAnalyzed: 2, insights: [/* ... */] }
      })
    })
  )

  // ... resto del test
})
```

### Assertions sobre requests

MSW expone el `Request` completo en el handler. Para assertar body, headers o query params:

```typescript
server.use(
  http.post('*/api/finance/expenses', async ({ request }) => {
    const body = await request.json()

    expect(body).toMatchObject({ amount: 1000, currency: 'CLP' })
    expect(request.headers.get('Content-Type')).toBe('application/json')

    return HttpResponse.json({ expenseId: 'EXP-test', created: true }, { status: 201 })
  })
)
```

### Simular errores de red

`HttpResponse.error()` produce un `TypeError` en el caller (equivalente a "network down"):

```typescript
server.use(
  http.get('*/api/finance/exchange-rates', () => HttpResponse.error())
)
```

### Simular status codes de error

```typescript
server.use(
  http.get('*/api/0/projects/:org/:project/issues/', () =>
    HttpResponse.json(
      { detail: 'You do not have permission to perform this action.' },
      { status: 403 }
    )
  )
)
```

## Que hago con los `vi.stubGlobal('fetch', ...)` existentes

Son legacy. Durante la transicion ambos coexisten — MSW corre con `onUnhandledRequest: 'warn'` para no romper tests que aun stubean fetch localmente. Cuando migres un test:

1. Eliminar `vi.stubGlobal('fetch', vi.fn())`, `vi.unstubAllGlobals()` y variables `fetchMock`.
2. Importar `server` y `http`/`HttpResponse`.
3. Mover la respuesta mockeada adentro de `server.use(http.get(...))`.
4. Reemplazar assertions sobre `fetchMock.mock.calls[0]` por asserts adentro del handler (`expect(request.url).toContain(...)`) o con un array de captura si necesitas ver la request fuera.

## PoCs de referencia en el repo

Tres tests migrados como canon practico:

| Test | Escenario |
| --- | --- |
| `src/lib/alerts/slack-notify.test.ts` | Webhook POST simple con captura de body |
| `src/lib/cloud/observability.test.ts` | API de Sentry con multiples paths: 200 con payload, 200 vacio, `HttpResponse.error()`, 403 |
| `src/views/greenhouse/people/tabs/PersonActivityTab.test.tsx` | View-layer test con 2 endpoints concurrentes y assertion sobre `params` |

## Integracion con Playwright (TASK-517)

`src/mocks/browser.ts` exporta un `worker` via `setupWorker(...)`. Para usarlo en Playwright:

```typescript
// tests/e2e/setup.ts (cuando se adopte)
import { worker } from '@/mocks/browser'

await worker.start({ onUnhandledRequest: 'bypass' })
```

No esta activado por default — los E2E actuales corren contra staging real. Activar solo cuando se necesite aislar un flujo especifico de red externa.

## Dev mode opt-in

Para levantar el portal en dev con MSW interceptando fetches (util para trabajar offline o con backend roto):

1. Agregar `NEXT_PUBLIC_API_MOCKING=enabled` en `.env.local`.
2. En algun layout raiz (ej. `src/app/layout.tsx`), arrancar el worker solo cuando la env var este prendida:

```typescript
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}
```

Este wiring no esta en main por default — habilitar por rama cuando el caso de uso aparezca.

## Convenciones

- **URLs con wildcard**: siempre `*/api/...`, nunca `http://localhost:3000/api/...` hardcoded.
- **Defaults minimos**: los handlers base devuelven shapes validos pero vacios. La logica de negocio va en `server.use(...)` del test.
- **Una override por test**: no agregar handlers "para varios tests" — el reset por test existe justamente para evitar ese acoplamiento.
- **Domain split**: cada dominio (`finance`, `hr`, `people`, ...) tiene su archivo bajo `src/mocks/handlers/`. Agregar dominios nuevos siguiendo el mismo split, no apilando en un solo archivo.
- **Convivencia con vi.stubGlobal**: mientras haya tests legacy, `onUnhandledRequest` es `warn` en Vitest. Cuando el backlog legacy baje a cero, subirlo a `error`.

## Troubleshooting

| Sintoma | Causa probable | Fix |
| --- | --- | --- |
| Test falla con `Unhandled request warning: GET http://...` | Nuevo endpoint sin handler, o URL no matchea wildcard. | Agregar handler al dominio o especializar con `server.use(...)` en el test. |
| MSW no intercepta en browser dev | Service worker no registrado o env var ausente. | Verificar `public/mockServiceWorker.js` existe y `NEXT_PUBLIC_API_MOCKING=enabled`. |
| `expect(request.url).toContain(...)` asserta dentro del handler pero el test pasa con el assert fallado | Throws adentro del handler no propagan — MSW los convierte en 500. | Capturar la URL a un array externo y assertar despues de la llamada. |

## Referencias externas

- [MSW 2.x docs](https://mswjs.io/docs/)
- [Migration from v1 to v2](https://mswjs.io/docs/migrations/1.x-to-2.x/)
- [Kent C. Dodds — Stop mocking fetch](https://kentcdodds.com/blog/stop-mocking-fetch)
