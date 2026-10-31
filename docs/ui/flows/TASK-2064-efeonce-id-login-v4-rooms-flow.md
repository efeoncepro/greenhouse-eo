# TASK-2064 — Flow

## Entry and nodes

Rooms entry → issuer authorize → login sólo si sesión insuficiente → método real → authorize → callback Rooms. Neutral login → sesión issuer. MCP → login → consentimiento existente.

## Transitions

Microsoft navega al upstream validado; passkey hace ceremonia en auth origin; correo conserva POST scanner-safe. Error vuelve al control y conserva contexto validado. La UI nunca crea permiso Rooms.

## Recovery and exits

Correo queda con JS no disponible. Passkey cancelada permite reintentar o correo. Retorno Rooms validado permite volver al producto; neutral conserva sesión/logout existentes. No quinto provider ni vestibulo.

## GVC Scenario Plan

Neutral y Rooms, teclado, inválido, sin Microsoft/WebAuthn, reduced motion; no interacción real de cuenta en fixtures.

## Design Decision Log

2026-10-25: un solo login visible en el issuer; el producto deriva contexto validado. Flujo MCP conserva consentimiento; no se agrega segundo formulario Rooms.
