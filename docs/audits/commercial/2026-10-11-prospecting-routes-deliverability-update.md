# Prospección — recorridos y entregabilidad operativa

Fecha: 2026-10-11. Autorización: «Hazlas todas... lanza subagentes para paralelizar», sobre las cinco
extensiones recomendadas. Alcance: método/plantillas/evals Codex–Claude y sinergia Commercial; sin nuevo
software ni operaciones SaaS. Estado: método y plantillas implementados; evaluación local aprobada.

## Implementación y owners

Tres subagentes implementaron archivos exclusivos; el principal integró, revisó y sincronizó:

| Capacidad | Canon progresivo | Salida operativa |
| --- | --- | --- |
| Cadencias por cuenta | [account-cadence](../../../.codex/skills/efeonce-b2b-prospecting/references/account-cadence.md) | Persona/canal/orden/motivo, dependencias, capacidad, stops y revisión |
| Respuestas | [response-handling](../../../.codex/skills/efeonce-b2b-prospecting/references/response-handling.md) | Información, agencia, referido, más adelante, rechazo/baja, OOO, silencio, bounce e interés con next step/owner |
| Señal→acción | [signal-to-action](../../../.codex/skills/efeonce-b2b-prospecting/references/signal-to-action.md) | Nueve familias, hecho/fuente/vigencia, hipótesis, refutación y menor validación útil |
| Entrada por situación | [situation-entry-playbooks](../../../.codex/skills/efeonce-b2b-prospecting/references/situation-entry-playbooks.md) | Proveedor actual, saturación, proyecto, transformación CRM y continuidad con pregunta/roles/proof/next step |
| Entregabilidad | [deliverability-operations](../../../.codex/skills/efeonce-b2b-prospecting/references/deliverability-operations.md) | Known/pending/blocked por dimensión, destinatario vs sender, auth/alignment, restricciones, diagnóstico y estados de resultado |

Cinco plantillas nuevas; account-brief/action-pack enlazan sólo las pertinentes. Entry point, referencias de
research/discovery/mensaje/aprendizaje y Commercial Codex/Claude comparten routing. Commercial conserva
calificación/objeciones/negociación; práctica la oferta/proof y proveedor/HubSpot la ejecución/readback.
Commercial companion/overlay siguen deliberadamente diferentes; bundle Prospecting completo byte-identical.
[ADR](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md), [funcional](../../documentation/comercial/prospeccion-b2b.md),
[manual](../../manual-de-uso/comercial/operar-prospeccion-b2b.md), índice y continuidad actualizados.

## Fuentes y límites

Los subagentes consultaron fuentes primarias en 2026-10-11; URLs/fecha/alcance en módulos. El principal
reabrió [HubSpot bounce types](https://knowledge.hubspot.com/marketing-email/what-is-the-difference-between-a-hard-bounce-and-a-soft-bounce)
y [Microsoft Message Trace FAQ](https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-faq):
label hard bounce no certifica casilla inexistente y estado Delivered no certifica inbox. Verificar el evento
del destinatario y rail, sin desactivar controles o reenviar para comprobar. Auth DNS publicada, resultado
alineado de mensaje y preparación del sender son evidencias distintas; las reglas bulk no son cuotas Efeonce.
No se verificó configuración real de portal/secuencias, DNS/tenant/sender/reputación ni entrega de mensajes.

El artículo oficial Outlook.com devolvió cuerpo vacío por apertura; el subagente recuperó texto indexado
del mismo URL por búsqueda primaria (alcance consumidor, requisitos y código de rechazo). Esa recuperación
documental no demuestra acceso al tenant, límite efectivo ni diagnóstico de un NDR de Efeonce.

Señales y entradas son procedimientos Efeonce apoyados en canon local, sin uplift ni umbrales nuevos.
Se preservan correo individual corporativo verificado para nuevas altas, objetivo + base de 2–3 adicionales
ampliable por roles/riesgos y ausencia de permiso implícito para contactar a todos. HOLD/bajas/negativas no
se eluden por colegas/canales; pausa propuesta, aplicada y leída de vuelta se informan separadas.
Product Design lanes, Web Experience web pública, Channel con back-to-back y sin terreno propio/sales uplift;
provider-fit HubSpot/Salesforce/híbrida/no-fit. El radar/expediente/scheduler existente conserva ejecución.

## Evaluación y evidencia local

Fixtures v5: 40 escenarios sintéticos únicos; los 30 previos se preservaron estructuralmente íntegros.
P31–P40 cubren los cinco módulos; evaluadores cruzados recibieron método/escenarios, sin rúbrica ni respuestas
esperadas, y sin efectos externos durante evaluación. Se contrastaron los **10 nuevos y 9 de regresión**;
19 IDs únicos sin fallo material, no una corrida nueva de los 40 casos. Evidencia completa preservada:

- [Señales/entradas](prospecting-routes-2026-10-11/eval-signals-entry.md): P35–P38, P03/P08/P20/P26/P30.
- [Cadencia/respuesta/entrega](prospecting-routes-2026-10-11/eval-cadence-response-delivery.md): P31–P34,
  P39–P40, P07/P11/P22/P27.
- [Tercera revisión](prospecting-routes-2026-10-11/review-cadence-response.md): P31/P32/P34. Sugerencia
  aplicada: response-handling enlaza diagnóstico de entregabilidad y explica que suspender dirección mientras
  se diagnostica no invalida identidad o todos los correos. El principal contrastó los tres casos después del
  ajuste; sin cambio de resultado ni nuevos efectos.

El principal revisó decisiones contra rúbrica: coordinación/capacidad y pausas propuestas (P31–P32),
respuestas sin calificación ficticia y restricciones (P33–P34), vigencia/ICP/capacidad/canal (P35–P36),
oferta/prueba/límites por situación (P37–P38), y preparación/rebotes/resultado sin garantías (P39–P40).
Los evaluadores ya conocían conversación/autoría de otros módulos; revisión cruzada no equivale a evaluator
ciego independiente de toda la sesión ni a piloto de mercado. Se evalúan decisiones, no frases literales.

## Verificación y cierre

- `pnpm skills:mirrors`: aprobado sobre bundle final. Una comprobación intermedia detectó edición
  final del subagente de entregabilidad posterior a la copia inicial; se revisó el delta y resincronizó
  ese archivo sin sobrescribir aportes ajenos, y el gate volvió a pasar.
- Frontmatter Prospecting Codex/Claude (`quick_validate.py`): aprobado.
- Integridad fixtures: 40 IDs únicos; 30 anteriores conservados, versión 5.
- Enlaces locales de módulos/plantillas y documentación: comprobados sin targets ausentes.
- `git diff --check` y `node scripts/check-documentation-closure.mjs --strict -- <alcance>`: aprobados.
- `pnpm docs:context-check:strict`: aprobado sin errores/warnings después de la última edición documental.
- Routers AGENTS/CLAUDE revisados: ruta existente suficiente; sin nueva skill/command/schema/invariante
  transversal que exija cambiarla. `project_context.md` conserva un puntero breve a recorridos.

El cierre inicial encontró dos avisos sobre comprobar registro/project_context. Se actualizó su puntero
existente sin añadir inventarios y se repitieron cierre/contexto. No se tocaron gates/flags ni cliente UI.

Pendiente operativo posterior: eficacia y configuración/entrega live se verifican en uso autorizado; no son
requisito para cerrar archivos de método. No hubo créditos, DNS, enrollment, pausas, CRM, envío ni scheduler.
Alcance preparado para commit local; push no solicitado. Cambios ajenos se preservan.
