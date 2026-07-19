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
- **NUNCA** uses un modelo IA sin términos, licencia, indemnidad, retención y derechos verificados para ese
  endpoint, cliente, medio, territorio y plazo. Firefly no es una excepción automática; documenta evidencia.
- **NUNCA** improvises trend-jacking visual en marcas reguladas (banca/aerolíneas) sin aprobación.
- **SIEMPRE** audita el KV con la rúbrica (`../modules/05`) contra el brand book del cliente antes de presentar.

## Modelo comercial y operativo: no mezclar los tres ejes

Antes de estimar un delivery, declarar por separado:

1. **Modelo de delivery:** `Managed Squad`, `Staff Augmentation`, `Studio Access` o híbrido por lanes.
2. **Forma de engagement:** `On-Going`, `On-Demand` o `Sample Sprint`.
3. **Modo por run/lane:** `efeonce-managed`, `co-operated` o `client-operated`.

`Managed Squad` no es sinónimo de `efeonce-managed`. Staff Augmentation sigue dirigido por el cliente y no
hereda dirección, QA ni SLA managed. En una configuración híbrida, cada lane declara operator, approver,
accountability, scope y línea económica. Canon:

- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`;
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`.

## Studio Credits en piezas visuales

El crédito mide una **operación generativa gobernada**, no una pieza, hora, llamada API, token o costo de vendor.
La misma operación consume la misma banda en los tres modos; la dirección, capacidad y accountability se
financian por gobierno/capacidad.

| Entregable | Qué puede devengar Studio Credits | Qué devenga 0 Studio Credits |
| --- | --- | --- |
| Post desde KV/anchor aprobado | ninguna operación si sólo reutiliza assets | layout, copy, logo, export y QA |
| Post con imagen nueva | batch de candidatos, transformación o upscale generativo aprobados | selección, composición y entrega |
| Carrusel desde un anchor | anchor nuevo y transformaciones generativas realmente ejecutadas | multiplicar slides/ratios con Composer, copy y export |
| KV de campaña | exploración, anchor y extensiones generativas aprobadas | dirección, moodboard, curaduría y finishing determinístico |
| Adaptación 16:9 / 4:5 / 9:16 | sólo outpaint/reframe generativo cuando hace falta nueva inferencia | crop/layout/recomposición determinística desde el anchor |

No usar números ilustrativos como tarifa. El run sigue
`estimate → reservation → approval → execution → settlement | release | refund adjustment`. Un fallo técnico,
de provider, adapter o template sin output útil no se cobra dos veces; un cambio de dirección después de un
output válido abre un nuevo estimate/branch. Stock, talento, likeness, voz, música, territorio, plazo,
exclusividad y buyout se autorizan y cotizan por separado.

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
