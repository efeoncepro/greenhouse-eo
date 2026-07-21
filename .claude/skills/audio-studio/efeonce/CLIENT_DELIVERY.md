# CLIENT_DELIVERY — audio as-a-service para clientes Globe

> Cómo opera el estudio cuando el audio es **para un cliente**, no para Efeonce. Los clientes
> Globe son **equipos de marketing enterprise internacionales** (aerolíneas, bancos, manufactura) —
> exigen multi-marca, jingles/sonic identity con aprobaciones formales, **licencia limpia** y
> **dubbing multi-idioma**. Esto NO es lo mismo que producir para la marca Efeonce (`EFEONCE_OVERLAY.md`).
> Para credits, rights y accountability carga `../modules/11_STUDIO_CREDITS_AND_RIGHTS.md`.

## Qué cambia respecto a producción propia

| Dimensión | Marca Efeonce | Cliente Globe |
|---|---|---|
| Marca | Efeonce (una) | la del cliente (multi-marca; nunca mezclar con la sonic identity de Efeonce) |
| Fuente de verdad | `efeonce-brand.ts` + sonic identity Efeonce | el **brand book + guía de sonido del cliente** (pedirlos; no asumir) |
| Aprobación | operador Efeonce | flujo formal del cliente (brand/legal/compliance) |
| **Licencia de audio IA** | criterio interno | **licencia comercial verificada obligatoria** — música: **ElevenLabs Music**; documenta la fuente |
| **Consentimiento de voz** | interno | si se clona/usa una voz (talento, ejecutivo), **consentimiento firmado** |
| Idioma | es-CL neutro | **localización real por mercado** (dubbing multi-idioma; ElevenLabs preserva la voz cross-idioma) |
| Riesgo | tolerante | conservador — banca/aerolíneas = YMYL; compliance manda |

## Reglas duras de delivery a cliente

- **NUNCA** uses la sonic identity / voz / jingle de Efeonce en una pieza de cliente. Cada cliente tiene su
  guía de sonido; pídela ANTES de producir.
- **NUNCA** entregues audio a cuenta de cliente sin su aprobación formal.
- **NUNCA** uses música/voz IA sin **licencia comercial clara** para un entregable de cliente (música →
  ElevenLabs Music; verifica términos de cualquier otro modelo).
- **NUNCA** clones una voz (talento, ejecutivo, celebridad) sin **consentimiento explícito y documentado**.
- **SIEMPRE** estima, reserva y obtiene approval por operación/segundos/idioma/tier/attempt antes de volumen
  (dubbing multi-idioma puede escalar rápido).
- **NUNCA** cobres credits por pieza/hora, edición, mix/master, loudness, stems/export o retry técnico.
- **NUNCA** escondas voz, música, sync/master, territorio, plazo, exclusividad o buyout dentro de credits.

## Modelo, modo y accountability

- `Managed Squad` es modelo comercial; `efeonce-managed` es modo de run. Staff Augmentation sigue bajo
  dirección cliente y no hereda outcome SLA.
- `co-operated` exige owner por guion, generación, mezcla, rights y delivery; “ambos” sin owner no sirve.
- `client-operated` conserva controls/policy/soporte pactados, no accountability por el resultado creativo.
- Credits son mode-neutral; la misma operación usa la misma banda. Capacidad y accountability se cobran aparte.

## Flujo de delivery (resumen)

1. **Intake**: brand book + guía de sonido + objetivos + mercados/idiomas + restricciones de compliance + presupuesto.
2. **Dirección**: brief + referencia + concepto sonoro (`templates/audio-brief.md`, `music-brief.md`,
   `sonic-identity-guide.md`) firmados por el cliente.
3. **Producción**: voz/música/SFX con la mano correcta (`STUDIO_TOOLING.md`), **licencia limpia**, consentimiento
   donde aplique, bajo la marca del cliente.
4. **Localización**: dubbing/versiones por mercado (ElevenLabs dubbing; Voice Binding para voz consistente).
5. **Post**: edición + mezcla + master al **target de loudness** del destino (`../modules/09`).
6. **Aprobación**: presentación → feedback → iteración (`templates/audio-critique.md`).
7. **Entrega**: `templates/mix-master-delivery-spec.md` con versiones (idiomas/duraciones/formatos), loudness y licencia documentada.

## Costura con el runtime + otras skills

El cliente Globe vive en el 360 de Greenhouse como `Cliente`. La producción es operación de agencia (Efeonce
**como agencia**, piezas con marca **del cliente**), no una capacidad del portal. Encadena con `design-studio`
(sonic branding ↔ identidad visual del cliente), `motion-design-studio` (audio para sus videos) y
`social-media-studio` (audio para sus redes). Si el delivery debe verse en Account 360 / ICO, esa integración es
trabajo de plataforma — nómbralo como follow-up, no lo inventes.
