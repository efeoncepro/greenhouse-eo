# Propuesta — configuración de medición por formulario y calendario

- Status: **Proposed; alcance incorporado a TASK-2035 por el operador el 14/10/2026. No implementada ni Accepted como ADR.**
- Fecha: 2026-10-13, conversación posterior a PR254.
- Owner propuesto: Growth Forms / Meetings / Measurement.
- Scope: elegibilidad y matching; sin nueva infraestructura ni cambio de sender.
- Base: [runtime construido](../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md).

La petición del 14/10 autoriza registrar el alcance integral en
[TASK-2035](../tasks/to-do/TASK-2035-growth-measurement-scalable-cro-retargeting-subscriptions.md),
incluyendo CRO, audiencias, suscripciones y calidad HubSpot, además de esta configuración.
Este documento conserva la propuesta técnica base: ubicación/schema, envelope y planes de
ejecución aún requieren sus decisiones/checkpoints. El registro no crea schema/API/UI ni
publica ClientGTM, flags, secretos, audiencias o un release.

## Problema confirmado

Forms ya publica versiones desde datos. Matching enumera seis slugs y una pareja
scheduler/surface en measurement/payload.ts y scripts/measurement/sgtm-lead-client.js.
Además toma cuatro campos de contacto con nombres fijos. Publicar un formulario no amplía
esas listas ni garantiza mapping de sus campos. Cambiar sólo Greenhouse deja al Client
bloqueando; cambiar sólo GTM no autoriza captura. Deben resolverse ambas fronteras.

## Dirección propuesta

Contrato de política de medición **server-only**, ligado a identidad estable form_key,
versión publicada y surface; equivalente para scheduler/binding de Meetings. El dominio
fuente autoriza la política, Measurement consume snapshot validado y sGTM verifica
contrato autenticado/consentido sin enumerar slugs en el template. Backend único MetaLead,
espejoGA4 y GoogleUPDsin events permanecen.

La actual analytics_policy_json se compila a telemetryPolicy browser-safe: no es autorización
publicitaria. No colar autoridad en claves desconocidas del JSON ni guardar secretos/contactos
en el render contract. Ubicación física/schema definitivo se formaliza con GO en el dueño
Growth, sin SSOT paralelo ni adelantar la futura extracción de dominio a Marketing Studio.

| Concepto propuesto | Ejemplo/límite |
| --- | --- |
| Finalidad | Captación comercial; no postulaciones/surveys por defecto |
| Destinos | Meta/GoogleUPD independientes, OFFdefault |
| Contactos | Referencias a campos declarados/validados email/E.164/firstName/lastName; no texto libre arbitrario |
| Clasificación | Origen/categoría gobernados, eventos/destinos cerrados; no JS/URL libre |
| Scope | Identidad estable+versión/surface activa+orígenes aprobados; rename no cambia autoridad |
| Publicación | Draft→review→publish, schema/propósito/compatibilidad y auditoría actor/versión |
| Estado | Configpublicada, códigocompatible, consentimiento, ack y provider separados |

## Operación y Full API Parity propuestas

1. Crear/editar versión de formulario o calendario.
2. Configurar medición, campos permitidos y clasificación por command/API canónico.
3. Validar y mostrar bloqueos: campo no declarado/tipo incompatible impide publicar política.
4. Publicar datos; renderer/worker consumen contratos compatibles.
5. Verificar scope/contexto sin crear negocio falso; recepción real queda separada.

Interfaz y consumidores programáticos usan el mismo command con capability/rol efectivo y
scope tenant/surface. Un POST público no activa su propia política. No herramientas MCP o
rutas nuevas sin contrato/permisos/canary propio. Alta de medición no crea automáticamente
audiencia/campaña: reusar clasificación o proponer creación por APIprovider autorizada.

## Frontera sGTM propuesta

Conservar auth server-to-server, schema cerrado, hosts/orígenes aprobados, límites de tamaño/
tiempo, hashes, consentimiento, ID y tag de destino. Reemplazar segunda allowlist por prueba
autenticada de scope autorizado por Greenhouse, versión de contrato y protección contra
sobreescritura browser. No basta quitar commercial_scope. Definir/probar frontera antes.
Mecanismo concreto de envelope autenticado/versionado pendiente de diseño aprobado;
no se afirma una nueva firma/HMAC ya implementada en producción.

## Migración, rollback y decisiones con GO

- Aditiva/defaultOFF y seed sólo de seis Forms y parejaMeeting hoy activos; equivalencia exacta,
  sin habilitar catálogo/dominios completos.
- Definir snapshot policyversion en proyección, desactivación/revocación y entregas pendientes,
  caché/TTL/invalidación, fallos de lectura fail-closed y compatibilidad worker.
- Publicar contrato compatible antes de activar nuevas policies; Preview/frozenartifact y canaries
  ambos lados, retirar listas fijas al final. No workers viejos ejecutando policies nuevas.
- Un release inicial gobernado + publicación sGTM inicial. Luego fuentes dentro del contrato
  se habilitan publicando datos, sin release o tag/publishGTM por cada alta.
- Nuevo tipo de dato/evento/destino, host no aprobado o cambio de contrato puede requerir
  código/release/configGTM; no prometer que nunca habrá otro release.
- Mantener switches globales, cifrado/retención, no duplicación y recibos. Rollback restaura
  estado compatible, nunca dos senders ni borrar ciphertext vigente.

Acceptance futuro: alta de nueva fuente autorizada sin código/templateGTM; deny fuente no
publicada/scope ajeno/campo prohibido/consentimiento ausente; equivalencia existentes;
revocación/cache/retries consistentes; API/UI comparten policy; canary contrato nuevo en
runtimes destino y lectura provider proporcional.

## Alternativas y revisión

| Alternativa | Evaluación |
| --- | --- |
| Listas en código | Actual: guard explícito, release+GTM repetidos por alta |
| Sólo envvar/lista global | No modela mapping/versión/surface ni resuelve doble autoridad |
| Habilitar todos los Forms | Rompe finalidad/alcance comercial; rechazada |
| Policy versionada por dominio | Propuesta recomendada; reutiliza ciclo actual, implementación inicial coordinada |

Reabrir si cambia dueño/contrato de extracción de Growth. No supersede ADR MetaCAPI Accepted
ni se presenta como capacidad disponible hoy. La ejecución se gobierna por TASK-2035 y sus unidades/checkpoints; no está iniciada.
