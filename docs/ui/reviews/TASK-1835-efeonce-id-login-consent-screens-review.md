# TASK-1835 — Review enterprise de Efeonce ID (login · consentimiento · estados)

> **Tipo de documento:** Dossier de revisión visual (GVC premium)
> **Versión:** 1.0
> **Creado:** 2026-09-06 por Claude (sesión greenhouse-eo-06)
> **Dirección visual:** [«Nocturno editorial»](../visual-directions/TASK-1835-efeonce-id-direction.md), aprobada por el operador el 2026-09-05
> **Wireframe:** [TASK-1835](../wireframes/TASK-1835-efeonce-id-login-consent-screens.md) · **Flow:** [TASK-1835](../flows/TASK-1835-efeonce-id-login-consent-screens-flow.md) · **Motion:** [TASK-1835](../motion/TASK-1835-efeonce-id-login-consent-screens-motion.md)

## Qué se revisó

20 fixtures de los renderers **reales** del emisor, servidas por `pnpm auth-server:dev-ui`
(`127.0.0.1:19036`), capturadas con `qualityProfile: 'premium'` en desktop 1440×1000 y móvil
390×844. 40 capturas, 80 frames, 20/20 verdes.

El harness sirve los mismos módulos que produce `services/auth-server` con DTOs ficticios y sólo
GET: no autentica a nadie ni ejecuta commands. Una captura verde acredita composición, jerarquía,
accesibilidad y responsive — **no** acredita autenticación real, consentimiento persistido ni
despliegue.

| Superficie | Fixtures |
|---|---|
| Login | `login` · `login-external` · `login-invalid-email` |
| Consentimiento | `consent` · `consent-multiple` |
| Segundo factor | `step-up` · `enroll` |
| Enlace / invitación | `magic-link-sent` · `magic-link-expired` · `magic-link-used` · `invitation-accepted` |
| Recuperación y sesión | `access-revoked` · `session-started` · `session-closed` · `rate-limited` |
| Errores | `login-required` · `error-invalid-client` · `error-access-denied` · `error-unavailable` · `internal-error` |

## Hallazgos corregidos en esta pasada

**1. El carril de passkey no existía.** El backend (`/auth/passkeys/authenticate/*`, credenciales
descubribles, ledger, contador anti-clonación) estaba completo desde el 2026-09-04 y el copy
(`login_passkey_*`) escrito, pero `/login` no ofrecía el método: los cuatro ids estaban huérfanos.
Hallazgo del operador. Implementado con el patrón del step-up (controlador generado, servido con
nonce), con sus dos estados de fallo diferenciados y un fallback honesto sin JavaScript.

**2. `violations: 0` era una medición vacía.** El gate de accesibilidad de GVC reportaba cero
violaciones en las 40 capturas. axe devolvía las 24 filas de texto de cada página en `incomplete`
—«background color could not be determined due to a pseudo element»— porque el lienzo pinta su azul
con un degradado y un `::after`. Nunca midió una sola. Debajo del cero, la ficha de la aplicación y
el aviso «Aplicación no verificada» del consentimiento salían en texto oscuro sobre el azul:
**1.53:1**. Causa raíz: `.id-context` y `.id-muted` compartidas entre la ficha (sobre el lienzo) y
el bloque del destino (dentro de la tarjeta blanca) — un color cruzando entre fondos opuestos.
Mecanismo nuevo: `pnpm auth-server:verify-contrast` mide sobre los píxeles renderizados.
**272 textos, 18 pantallas × 2 viewports, 0 bajo el piso WCAG.**

**3. El destino de la autorización era letra chica.** Se leía como una frase corrida en gris
pequeño centrado. Es la señal que impide que una aplicación con nombre creíble se lleve el código a
un dominio ajeno. Ahora es un bloque propio con el host en cuerpo grande semibold.

**4. Callejones sin salida.** Enlace vencido/usado/inválido y «demasiados intentos» instruían «pide
uno nuevo desde el inicio de sesión» sin ofrecer cómo llegar. Llevan su CTA; el cuerpo pasó a decir
el hecho en vez de repetir la acción del botón.

**5. Dos primarios compitiendo.** La primera versión del login dejó «Entrar con mi passkey» y
«Enviarme el enlace» ambos azules. Se vio mirando la pantalla, no en los gates. El correo pasó a
secundario, como fija el wireframe.

## Evidencia de accesibilidad y teclado

- axe (`color-contrast` + reglas generales): 0 violations en 40 capturas — **leer junto al punto 2**.
- Contraste medido sobre píxeles: 272/272 sobre el piso WCAG 1.4.3.
- `scrollWidth === clientWidth` en las 40 capturas (gate de layout premium).
- Foco: anillo visible verificado en toda pantalla con control. Las terminales usan un probe sin
  exigencia de anillo porque por contrato no tienen ninguno — y `page-contract.test.ts` afirma
  cuáles lo son, así que agregar un control ahí pone rojo el test antes que la captura.
- `prefers-reduced-motion` ejercitado en las 40 capturas.

## Lo que esta evidencia NO acredita

- Autenticación real de una persona, consentimiento persistido, canary ni despliegue.
- La ceremonia WebAuthn end-to-end: se verificó el controlador (revelado del botón, ambos estados
  de fallo, fallback sin JS) contra el harness, que no expone los endpoints reales.
- **Nadie puede tener una passkey todavía**: `/auth/passkeys/register/*` existe pero ninguna
  superficie la ofrece. Ver `## Follow-ups` de la task.
