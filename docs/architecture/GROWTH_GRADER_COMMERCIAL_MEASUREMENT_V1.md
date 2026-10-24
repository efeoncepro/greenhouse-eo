# Grader — transporte comercial y medición V1

Extensión del [ADR Forms](GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md) y del
[ADR Ads](GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md). Intención comercial confirmada por Julio;
Contacto general sigue fuera de Ads. No crea un segundo sender ni modifica la arquitectura Grader.

## Ruta efectiva

GET del 18/10/2026 23:06Z confirma que `https://think.efeoncepro.com/brand-visibility` monta
`<greenhouse-form>` con key `69cd5269-5f97-4d32-99c4-0b23f41aa2f5`, surface
`fhsf-ai-visibility-grader` y renderer servido por Greenhouse. GET público devuelve versión8,
`fver-ea1c2e5f-38e0-4ef6-b9eb-9b5fe1b9d6f3`, tipo `diagnostic_intake` y `tokenized_report`.
El transporte actual es `/api/public/growth/forms/{key}/submit`, que ya captura contexto y emite el
recibo Ads. El host hace polling GET para el informe; ese polling nunca emite una conversión.
La política publicada rev2 conserva Meta/UPD e incorpora Ads/EC. Configuración no prueba entrega.

## Fachada histórica compatible

`POST /api/public/growth/ai-visibility/run`, con el flag Forms ON, conserva captcha, guardas de
coste/abuso, gate de email y dedupe. Después de dedupe resuelve definición UUID y versión vigente
desde Forms; nunca usa una identidad o destino elegidos por el visitante ni la versión fallback para
medir. `prepareMeasurementConversion` valida política/surface/origin, consentimiento publicitario
fresco y permisos Google; el consentimiento funcional del diagnóstico no lo sustituye. `Sec-GPC`
prevalece. IP/UA vienen del request visitante mediante el helper canónico, nunca del worker.

La transacción existente persiste submission/consent/outbox y medición cifrada con savepoint.
Sólo `measurementPersisted=true` permite devolver un `googleAdsConversion` fresco; duplicados,
política ausente/obsoleta, denegación/GPC o fallo de medición no lo reciben. Un fallo de lookup de
instrumentación tampoco revierte la aceptación. No hay envío publicitario inline ni replay.
CORS reutiliza origins gobernados; todas las respuestas POST son `private, no-store`. Los hashes
sólo cruzan el recibo dedicado: nunca dataLayer, GA4 ordinario, logs, URL ni polling.

Con el flag Forms OFF, la rama anterior conserva el contrato de run/poll y no mide Ads. El frontend
vigente usa el transporte portátil y no necesita migración. Un consumidor histórico que adopte el
recibo debe usar el emisor compartido y su revalidación del consentimiento; devolver un recibo no
prueba que ese consumidor lo envió. No se activa un segundo backend ni se importan conversiones GA4.

## Publicación, pruebas y límites

El candidato incluye también la [API administrativa de clasificación](GROWTH_FORMS_COMMERCIAL_CLASSIFICATION_CORRECTION_V1.md).
No modifica otra vez la clasificación de Web ni las políticas publicadas. Release por control plane;
endpoint y fachada servidos en main2559e9242, deployment4He READY. Canarios productivos de
CORS/no-store/body/permisos/conflicto PASS, sin captación ficticia.
[Cierre formal y evidencia](../audits/releases/2026-10-18-grader-commercial-measurement-production-release.md).

Validación inicial:69 pruebas aisladas de fachada/receipt/prepare, transporte y clasificación; mocks de persistencia
y proveedores, sin escribir leads. Validación productiva ejecutada en el release2559e9242: GET contrato/políticas, OPTIONS,
JSON malformado antes de command, permisos y conflicto CAS de clasificación antes de UPDATE. Cero
pruebas positivas de captación o replay. [Auditoría del release](../audits/growth/2026-10-18-grader-measurement-release.md).
Recepción Ads/Meta, identidad HubSpot y atribución requieren la primera ocurrencia real; no se
certifican con health, CORS, policy o READY. Rollback: deployment previo fijado y control plane;
no despublicar ni reejecutar políticas para probar disponibilidad.
