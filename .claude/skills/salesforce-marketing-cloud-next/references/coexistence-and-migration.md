# Coexistencia y migración selectiva

Marketing Cloud Engagement y Account Engagement conservan activos y modelos operativos propios. Next puede coexistir y extender; no presupongas reemplazo.

## Árbol de decisión

1. Inventaría orgs/BUs, connectors, journeys, automations, data extensions, campaigns, contenido, canales, consentimientos, integraciones, reporting y SLAs.
2. Clasifica cada capability: `retain | integrate | modernize | migrate | retire`.
3. Decide sistema de registro para persona, cuenta, campaña, consentimiento, contenido, journey y performance.
4. Evalúa Engagement+ o acceso desde Account Engagement contra el order form vigente; no derives entitlement por naming comercial.
5. Migra sólo cuando Next cubra el outcome, canal, escala, control y operación requeridos con función GA.

## Olas

- **Fundación:** Data 360, claves, identidad, consentimiento, observabilidad.
- **Piloto:** un segmento y caso de bajo riesgo con población de prueba.
- **Coexistencia:** intercambio explícito de datos/estado, deduplicación y source of truth.
- **Migración selectiva:** contenido/segmento/flow/canal con parity y rollback.
- **Retiro:** sólo tras reconciliación, retención, evidencia legal y owner sign-off.

No sincronices todo “por si acaso”. Define propósito, campos, dirección, latencia, conflicto y eliminación. Para Engagement, preserva SubscriberKey/ContactKey y reglas de suppression; para Account Engagement, valida Connected Campaigns y el efecto irreversible señalado por Salesforce antes de habilitar conectores.

## Criterios de salida

La ola termina sólo con counts reconciliados, consentimiento preservado, delivery validado, costo observado, reporting comparable y rollback probado. Si una capability depende de Winter ’27 preview, queda fuera de la migración comprometida.
