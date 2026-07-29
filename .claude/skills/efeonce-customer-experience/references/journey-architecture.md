# Arquitectura de journeys

Define cada journey como una secuencia versionada de fases, milestones, eventos, touchpoints, loops, pausas, dependencias y resultados. Modela lo que ocurre, no solo lo que la organización desea que ocurra.

## Touchpoint Ledger

Cada touchpoint debe registrar `journey_id`, `account_id`, `phase`, `timestamp`, `channel`, `actor`, `intent`, `expected_next_event`, `actual_outcome`, `context_available`, `owner`, `evidence_ref`, `sentiment_or_effort`, `risk`, `sensitivity` y `confidence`.

## Journey Intelligence

La capa de Journey Intelligence puede observar, unificar y comparar journeys con eventos, reuniones, feedback, tickets, entregas y señales comerciales. En su alcance observacional no ejecuta acciones por sí sola ni reemplaza las fuentes dueñas. Toda inferencia debe conservar evidencia, fecha, confianza y posibilidad de corrección humana.

## Auditoría

Compara journey actual, journey percibido, journey deseado y journey futuro. Busca pérdida de identidad, contexto, ownership, historial y expectativa entre ventas, delivery, portal, soporte, agentes y terceros. Señala loops, silencios, recontactos, handoffs fallidos y estados ambiguos.
