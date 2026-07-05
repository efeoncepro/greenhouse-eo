# CLIENT_DELIVERY — diseño as-a-service para clientes Globe

> Cómo opera el estudio cuando el diseño es **para un cliente**, no para Efeonce. Los clientes
> Globe son **equipos de marketing enterprise internacionales** (aerolíneas, bancos, manufactura)
> — exigen multi-marca, KV con aprobaciones formales, entregables presentables y localización.
> Esto NO es lo mismo que diseñar para la marca Efeonce (`EFEONCE_OVERLAY.md`).

## Qué cambia respecto a diseño propio

| Dimensión | Marca Efeonce | Cliente Globe |
|---|---|---|
| Marca | Efeonce (una) | la del cliente (multi-marca; nunca mezclar con Efeonce/AXIS) |
| Fuente de verdad visual | `efeonce-brand.ts` + AXIS | el **brand book del cliente** (pedirlo; no asumir) |
| Aprobación del KV | operador Efeonce | flujo formal del cliente (brand/legal/compliance) |
| Licencia de assets IA | criterio interno | **commercially-safe obligatorio** (preferir Adobe Firefly / modelos con licencia limpia) |
| Idioma | es-CL neutro | localización real por mercado (lockups/copy por país) |
| Riesgo | tolerante | conservador — banca/aerolíneas = YMYL; compliance manda |
| Entregable | interno | presentable, empaquetado, con spec y versiones |

## Reglas duras de delivery a cliente

- **NUNCA** uses la marca/AXIS/ilustraciones propietarias de Efeonce en una pieza de cliente.
  Cada cliente tiene su brand book; pídelo ANTES de producir.
- **NUNCA** entregues un KV a cuenta de cliente sin su aprobación formal (además de la curaduría interna).
- **NUNCA** uses un modelo IA sin licencia comercial clara para un entregable de cliente. Prefiere
  **Adobe Firefly** (commercially-safe) o modelos con términos comerciales verificados; documenta la fuente.
- **NUNCA** improvises trend-jacking visual en marcas reguladas (banca/aerolíneas) sin aprobación.
- **SIEMPRE** audita el KV con la rúbrica (`../modules/05`) contra el brand book del cliente antes de presentar.

## Flujo de delivery (resumen)

1. **Intake**: brand book + guía de voz visual + objetivos + mercados + restricciones de compliance.
2. **Dirección**: mood board + concepto del KV (`templates/art-direction-moodboard.md`, `key-visual-brief.md`)
   firmados por el cliente.
3. **Producción**: KV + derivados con la mano correcta (`STUDIO_TOOLING.md`), licencia limpia, bajo la marca del cliente.
4. **Auditoría**: `templates/key-visual-audit-scorecard.md` contra el brand book antes de presentar.
5. **Aprobación**: presentación → feedback → iteración (`templates/design-critique.md`).
6. **Entrega**: `templates/asset-delivery-spec.md` con formatos/versiones/idiomas/color-space por destino.

## Costura con el runtime + otras skills

El cliente Globe vive en el 360 de Greenhouse como `Cliente`. El diseño de delivery es operación de
agencia (marca Efeonce **como agencia**, pero piezas con marca **del cliente**), no una capacidad del
portal. Encadena con `social-media-studio` (lleva el KV a las redes del cliente — ver su
`CLIENT_DELIVERY.md`) y `digital-marketing` (campaña). Si el delivery debe verse en Account 360 / ICO,
esa integración es trabajo de plataforma (no de esta skill) — nómbralo como follow-up, no lo inventes.
