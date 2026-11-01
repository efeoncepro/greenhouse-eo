# Auth Server — respuesta 413 para cuerpo excesivo en Node (2026-10-29)

## Hallazgo local

`services/auth-server/app.ts` limita el cuerpo HTTP a 64 KiB. Antes de esta
corrección, al recibir el byte 65 537 llamaba `req.destroy()` antes de
escribir el 413. Un cliente HTTP real obtenía `socket hang up`, no una
respuesta HTTP. Reproducción focal con `Content-Length`: FAIL previo.

## Corrección y prueba

El adaptador pausa la lectura al superar el límite, devuelve el 413 con
`Connection: close` y deja que Node cierre la conexión después de enviar la
respuesta. Un test con `createServer` y un socket loopback real cubre tanto
`Content-Length` como `Transfer-Encoding: chunked` fragmentado. Ambos reciben
el JSON 413 completo, observan el evento de cierre real del socket antes de
limpiar el servidor y no invocan el handler OTP. Es el mismo límite común
que usa el adaptador para las rutas Auth con cuerpo.

`pnpm vitest run src/lib/auth-server/internal/transport.test.ts`: 9/9 PASS.
`pnpm vitest run src/lib/auth-server`: 717 PASS / 23 skip.
ESLint focal, `tsc --noEmit` y `git diff --check`: PASS.

Codex Security diff scan `ed8cb4af-bb8f-4fc6-9574-4738d7f4b3a6`
(`df2924d65..041158d39`): dos archivos fuente revisados, cero hallazgos
reportables; informe sellado fuera del repo. La aserción posterior de cierre
del socket sólo cambia el test, no el código de producción. La revisión es
propia y local.

Este es un retest local del transporte Node. No ejercita el entrypoint completo
`server.ts` con PostgreSQL/KMS ni acredita el comportamiento de Cloud Run/ALB.
