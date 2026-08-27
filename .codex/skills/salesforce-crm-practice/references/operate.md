# Modo operate

## Intake mínimo

- Resultado de negocio, usuarios y procesos afectados.
- Org ID/alias, tipo de entorno, edición, licencias, features y release.
- Identidad efectiva, método de autenticación y permisos.
- Volumen/calidad de datos, PII, residencia, retención y consentimiento.
- Integraciones, fuentes autoritativas, límites, automatizaciones y ventanas críticas.
- ALM actual, sandboxes, repositorio, pruebas, release owner y soporte.

Si el pedido es diagnóstico, mantén el trabajo read-only. Una sesión autenticada o una CLI disponible no es autorización para mutar.

## Diseño

1. Modela outcome, proceso, personas y métricas antes de objetos y automatizaciones.
2. Prefiere capacidades estándar cuando satisfacen el caso sin comprometer mantenibilidad.
3. Justifica Flow, Apex, LWC, eventos o middleware por volumen, transacción, experiencia, resiliencia y ownership.
4. Define permisos por mínimo privilegio, sharing/visibility y usuarios de integración dedicados.
5. Para Data 360, separa ingestión/federación, modelado, identidad, activación, gobierno y consumo.
6. Para Agentforce, especifica topics, instrucciones, acciones, datos accesibles, guardrails, evaluación, supervisión y costo.

## Gate de mutación

Antes de cualquier cambio registra:

- autorización y objetivo exacto;
- org/entorno e identidad verificados;
- diff o conjunto de registros esperado;
- dependencias, automatizaciones y side effects;
- respaldo/export o estrategia de recuperación;
- prueba previa y criterio go/no-go;
- ventana, aprobador y comunicación;
- verificación, reconciliación y evidencia posterior.

Producción no es el lugar para descubrir el comportamiento. Prueba metadata y automatizaciones en sandbox. Las pruebas de agentes se ejecutan en sandbox, consumen requests/créditos y pueden modificar datos.

## Datos e integraciones

- Usa external IDs y reglas explícitas para upsert.
- Ejecuta una muestra representativa y compara resultados antes de escalar.
- Decide si automatizaciones, validaciones y triggers deben permanecer activos; documenta cualquier suspensión y restauración.
- Conserva resultados de éxito/error por registro y reconcilia conteos y campos críticos.
- Haz idempotentes reintentos y eventos; evita asumir exactly-once.
- No declares éxito sólo por HTTP 2xx o job `Completed`.

## Cierre

Reporta `complete`, `configuración completa con rollout pendiente` u `operativamente bloqueado`. Adjunta evidencia de pruebas, deployment, reconciliación, acceso, monitoreo, adopción y riesgos residuales según corresponda.
