# CLIENT_DELIVERY — motion as-a-service para clientes Globe

> Cómo opera el estudio cuando el film/spot es **para un cliente**, no para Efeonce. Los clientes
> Globe son **equipos de marketing enterprise internacionales** (aerolíneas, bancos, manufactura) —
> exigen multi-marca, films con aprobaciones formales, licencia limpia y localización.
> Esto NO es lo mismo que producir para la marca Efeonce (`EFEONCE_OVERLAY.md`).

## Qué cambia respecto a producción propia

| Dimensión | Marca Efeonce | Cliente Globe |
|---|---|---|
| Marca | Efeonce (una) | la del cliente (multi-marca; nunca mezclar con Efeonce/AXIS/Nexa) |
| Fuente de verdad | `efeonce-brand.ts` | el **brand book + guía audiovisual del cliente** (pedirlos; no asumir) |
| Aprobación | operador Efeonce | flujo formal del cliente (brand/legal/compliance), animatic firmado antes de producir |
| Licencia IA | criterio interno | **licencia comercial obligatoria** — verifica términos de cada modelo; documenta la fuente |
| Música/sonido | criterio interno | música con licencia clara (sync/master rights); nada de tracks sin derechos |
| Idioma | es-CL neutro | localización por mercado (VO/subtítulos/lockups; Voice Binding para voz multi-idioma) |
| Riesgo | tolerante | conservador — banca/aerolíneas = YMYL; compliance manda |

## Reglas duras de delivery a cliente

- **NUNCA** uses la marca/AXIS/Nexa/ilustraciones propietarias de Efeonce en una pieza de cliente.
  Cada cliente tiene su brand book audiovisual; pídelo ANTES de producir.
- **NUNCA** entregues un film a cuenta de cliente sin su aprobación formal del **animatic** (antes de gastar
  créditos en producir tomas) y del corte final.
- **NUNCA** uses un modelo IA o una pista musical sin licencia comercial clara para un entregable de cliente.
- **NUNCA** improvises trend-jacking en marcas reguladas sin aprobación.
- **SIEMPRE** dimensiona y comunica el gasto de créditos IA antes de producir a volumen para un cliente.

## Flujo de delivery (resumen)

1. **Intake**: brand book audiovisual + guía de voz + objetivos + mercados + restricciones de compliance + presupuesto.
2. **Dirección**: brief + storyboard + **animatic** firmado por el cliente (`templates/motion-brief.md`,
   `storyboard.md`, `animatic-shotlist.md`) — el ritmo se aprueba barato antes de producir.
3. **Producción**: tomas con la mano correcta (`STUDIO_TOOLING.md`), licencia limpia, personaje consistente
   (Soul ID/refs), bajo la marca del cliente.
4. **Post**: edición + sonido + grade + upscale (Magnific), consistencia entre tomas.
5. **Aprobación**: corte → feedback → iteración (`templates/motion-critique.md`).
6. **Entrega**: `templates/motion-delivery-spec.md` con versiones (idiomas/duraciones/redes/broadcast),
   codec/fps/loudness/color-space por destino.

## Costura con el runtime + otras skills

El cliente Globe vive en el 360 de Greenhouse como `Cliente`. La producción es operación de agencia (Efeonce
**como agencia**, piezas con marca **del cliente**), no una capacidad del portal. Encadena con `design-studio`
(KV/dirección de arte del cliente), `social-media-studio` (lleva el film a las redes del cliente — ver su
`CLIENT_DELIVERY.md`) y `digital-marketing` (campaña). Si el delivery debe verse en Account 360 / ICO, esa
integración es trabajo de plataforma — nómbralo como follow-up, no lo inventes.
