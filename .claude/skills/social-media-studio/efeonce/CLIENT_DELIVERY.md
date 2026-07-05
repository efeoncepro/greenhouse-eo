# CLIENT_DELIVERY — social as-a-service para clientes Globe

> Cómo opera el estudio cuando el social es **para un cliente**, no para Efeonce. Los clientes
> Globe son **equipos de marketing enterprise internacionales** (aerolíneas, bancos,
> manufactura) — exigen multi-marca, aprobaciones formales, reporting presentable y
> localización real. Esto NO es lo mismo que operar los canales propios de Efeonce
> (`EFEONCE_OVERLAY.md`).

## Qué cambia respecto a canales propios

| Dimensión | Canal propio Efeonce | Cliente Globe |
|---|---|---|
| Marca | Efeonce (una) | la del cliente (multi-marca; nunca mezclar con Efeonce) |
| Aprobación | operador Efeonce | flujo formal del cliente (brand/legal/compliance) |
| Voz/tono | sistema Efeonce | guía de marca del cliente (pedirla; no asumir) |
| Idioma | es-CL neutro | localización real por mercado (i18n; ver abajo) |
| Reporting | interno, honesto | presentable, ejecutivo, sin jerga (ver `templates/social-report.md` versión cliente) |
| Riesgo | tolerante | conservador — YMYL en banca/aerolíneas; compliance manda |

## Reglas duras de delivery a cliente

- **NUNCA** publiques/programes en una cuenta de cliente sin la aprobación formal del cliente
  (además de la doctrina propose→confirm→execute). El estudio produce y propone; el cliente
  aprueba lo que sale a SU marca.
- **NUNCA** mezcles activos, voz o hashtags de Efeonce con los del cliente.
- **NUNCA** uses la guía de marca de Efeonce como default para un cliente. Pide su brand book,
  su guía de voz y sus restricciones de compliance ANTES de producir.
- **NUNCA** improvises trend-jacking en marcas reguladas (banca/aerolíneas) sin pasar el
  `trend-jack-checklist.md` con el semáforo en verde + aprobación del cliente.
- **SIEMPRE** sepa cada cliente su cuenta/marca en Metricool (`getBrandSettings` primero) para
  no cruzar contenido entre clientes.

## Localización (clientes internacionales)

Los clientes Globe operan en múltiples mercados. El social se **localiza**, no se traduce
literal: hook, referencias culturales, sonido trending y horario óptimo cambian por país.
Corre `getBestTimeToPostByNetwork` por mercado. Para craft multilingüe fino → `copywriting`
(sistema bilingüe). Respeta RTL/CJK si el mercado lo exige (typography → `typography-design`).

## Flujo de delivery (resumen)

1. **Intake**: brand book + guía de voz + objetivos + mercados + restricciones de compliance.
2. **Estrategia**: pilares + red primaria + cadencia (`../modules/03`) firmados por el cliente.
3. **Producción**: assets con el estudio (`STUDIO_TOOLING.md`) bajo la marca del cliente.
4. **Aprobación**: cola en Metricool → revisión del cliente → recién ahí `createScheduledPost`.
5. **Community management**: matriz de respuesta con el tono del cliente y su SLA
   (`templates/community-response-matrix.md`).
6. **Reporting**: `templates/social-report.md` versión cliente — ejecutivo, sin vanity metrics,
   foco en save/share/dwell y en el objetivo de negocio acordado.

## Costura con el runtime Greenhouse

El cliente Globe vive en el 360 de Greenhouse como `Cliente`. El trabajo social de delivery es
operación de agencia (marca Efeonce como agencia), no una capacidad del portal. Si el delivery
genera métricas que deban verse en Account 360 / ICO, esa integración es trabajo de plataforma
(no de esta skill) — nómbralo como follow-up, no lo inventes acá.
