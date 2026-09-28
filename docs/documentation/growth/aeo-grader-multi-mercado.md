# Grader AEO por mercado

Estado registrado al 2026-09-28: TASK-1863 desplegada y verificada en staging; promoción a `main`
en espera por decisión del operador. [Evidencia de rollout](../../audits/platform/2026-09-28-task-1863-verification.md).

Un perfil de marca tiene un mercado principal y puede configurar otros países e idiomas. Cada medición usa
un solo país e idioma. Un lote permite solicitar varios; su costo y cuota se validan por el total.

## Cobertura

Argentina, Bolivia, Brasil, Chile, Colombia, Costa Rica, Cuba, Ecuador, El Salvador, Guatemala,
Haití, Honduras, México, Nicaragua, Panamá, Paraguay, Perú, República Dominicana, Uruguay,
Venezuela; además Puerto Rico, España y Estados Unidos.

Español, inglés, portugués de Brasil y francés. Brasil predetermina pt-BR, Haití fr-HT, EE. UU. en-US
y los demás español. Un cliente en EE. UU. puede medir también en español. Francés no significa
soporte de criollo haitiano. Cuba no está soportada por la ubicación de Google AI Mode/DataForSEO;
el resto de motores conserva su contrato de ubicación y los errores reales se muestran.

## Todas las marcas y entradas

La categoría y el modelo de negocio de cada marca determinan sus preguntas. Un modelo explícito se
conserva; si falta, el command común lo deriva de la categoría. Una categoría ambigua no se convierte
en agencia. Esta resolución se comparte entre ejecución directa y encolada: operador, portal,
formulario, API y recurrencia usan los mismos comandos, con sus permisos y flags respectivos.

## Qué se conserva

- País y locale no se editan sobre una medición ni sobre un mercado existente.
- Marca, aliases y competidores quedan registrados en cada run nuevo.
- Cambiar competidores afecta mediciones futuras. El histórico sin snapshot permanece legacy.
- La matriz presenta una fila por mercado; no inventa un score combinado.
- La cobertura distingue motores solicitados, intentados y con respuesta. Sin dato no es cero.

Google, OpenAI, Anthropic y Perplexity reciben ubicación nativa. Gemini recibe el país en el prompt;
se declara esa diferencia. Los motores no son equivalentes y no garantizan reproducir cada sesión
personal de un buscador.

## Acceso y operación

La configuración es interna. Los clientes sólo solicitan mercados incluidos en su servicio; la
organización se resuelve desde su sesión. Catálogo geográfico no equivale a entitlement comercial.
El formulario público conserva una medición y su contrato actual; país vacío/desconocido conserva
el default Chile con origen explícito `form_default`, visible para auditoría.

[Manual de configuración](../../manual-de-uso/growth/configurar-mercados-aeo.md) ·
[Decisión de arquitectura](../../architecture/GREENHOUSE_AEO_MULTI_MARKET_MEASUREMENT_DECISION_V1.md).

## Preservación del histórico

Un run nuevo captura marca, aliases y competidores inmutables. Un run legacy sin esa foto conserva su
score y findings ya persistidos incluso si se solicita `recompute`; no se reconstruye su verdad desde
un perfil modificado. Si nunca fue puntuado, conserva el carril legacy de primera puntuación.
La comparación competitiva declara `competitor_set_changed` cuando cambia el set; no calcula un delta
competitivo o global con universos diferentes.

Los cambios de nombre, aliases, dominio o categoría de la marca también separan la serie de tendencias.
Sólo se compara la misma identidad, país, idioma y metodología; un cambio de pack se declara
incomparable. Los perfiles legacy activos se conservan con su histórico: tener varios perfiles no
prueba duplicidad ni permite reasignarles países o competidores sin confirmación.
