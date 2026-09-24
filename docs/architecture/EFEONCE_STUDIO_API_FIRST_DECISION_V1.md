# Efeonce Studio: plataforma API-first y consumo futuro desde Efeonce MCP

Fecha: 2026-09-23.
Estado: Accepted para el principio API-first y el consumo futuro por Efeonce MCP, por instrucción explícita del operador. El diseño técnico detallado, placement de runtime y rollout siguen pendientes; no implica implementación ni federación activa.

## Contexto y decisión

El Campaign Manager local agrupa CMP-001 y CMP-002 mediante HTML y fuentes OneDrive. El operador decide convertirlo en una plataforma, con acceso previsto en `studio.efeonce.org`, y establece que nazca API-first para que Efeonce MCP pueda consumirla después.

Studio será dueño del dominio de gestión de campañas: contratos, datos, políticas, estados y trazabilidad. La web y el futuro adapter de Efeonce MCP serán consumidores del mismo conjunto de readers y commands. No habrá capacidades de negocio exclusivas de la UI. Exponer una API autenticada no implica hacerla pública anónimamente.

Next.js es la tecnología recomendada para la aplicación web en esta sesión. La API debe ser independiente de React, componentes, cookies de navegación y Server Actions. Puede compartir deployment inicialmente: API-first no obliga a microservicios. Repo, base de datos, proveedor de almacenamiento y distribución de servicios requieren la evaluación de arquitectura posterior. Dominio y DNS aún no verificados ni configurados.

## Fronteras

```text
Studio Web ─────────────────────┐
                              v
                        Studio API
                              |
Efeonce MCP → adapter Studio ──┘
                              |
                    Readers / Commands / Policy
                              |
                 Persistencia / Assets / Jobs / Outbox
                              |
                   Adapters de integraciones
```

- Studio posee las entidades de campaña y valida cada operación, incluso cuando el gateway ya validó al actor.
- Efeonce MCP posee discovery, transporte, routing y su autorización de entrada. No tendrá SQL, acceso directo a almacenamiento ni reglas de campaña duplicadas.
- Las integraciones con Metricool u otros proveedores pertenecen a adapters de Studio; credenciales sólo en servidor. El gateway no será scheduler ni worker.
- El dominio no importará módulos de Next.js ni del SDK MCP. Los adapters traducen los contratos sin alterar su semántica.
- Reutilizar Efeonce ID, autoridad organizacional y AXIS conforme a sus contratos. Una sesión first-party no concede automáticamente consentimiento delegado MCP; no compartir cookies/secrets entre productos.
- Evaluar boundaries con Greenhouse y Globe antes de crear otro dueño para capacidades existentes. Este ADR no traslada datos ni responsabilidades de esos productos.

## Contrato obligatorio desde la primera versión

1. **Contrato antes que pantalla:** OpenAPI versionado, schemas de entrada/salida, errores estables y cliente tipado generado o verificado. Cambios incompatibles requieren estrategia de versión/deprecación.
2. **Paridad funcional:** toda operación de dominio de la UI tiene API autenticada. Un wrapper de UI no puede convertirse en el único escritor de una entidad.
3. **Permisos:** actor, cliente consumidor y organización objetivo verificables; denegación por defecto. Un organizationId proporcionado por el cliente no concede acceso. Revalidar permisos de lectura y escritura en cada llamada.
4. **Concurrencia:** revisión/ETag y precondición en escrituras; conflicto explícito ante versión desactualizada. Aprobación ligada a versiones exactas de asset, copy y destino; los cambios materiales invalidan o requieren nueva aprobación conforme a policy.
5. **Idempotencia:** comandos con efectos externos aceptan clave idempotente vinculada al actor/contexto y digest de la solicitud. Reutilizar una clave con otro payload devuelve conflicto. Reintentos devuelven la operación existente, sin duplicar publicaciones.
6. **Auditoría:** actor humano o de servicio, cliente, organización, operación, entidad, revisiones, fecha, resultado y correlationId. Sin credenciales ni secretos en logs.
7. **Lecturas utilizables:** paginación por cursor, filtros y orden estables, proyecciones resumidas y detalle bajo demanda. Estados incluyen fuente y fecha de observación; ausencia de datos no equivale a cero.
8. **Procesos largos:** jobs durables para imports, procesamiento de medios y sincronización; estados explícitos, reintentos acotados y errores recuperables. Recibir un job no prueba que terminó. Outbox/reconciliación para efectos externos y respuestas ambiguas.
9. **Archivos:** metadatos separados del binario, IDs/versiones/checksums, acceso autorizado y URLs temporales cuando corresponda. La ruta local de OneDrive es procedencia de migración, no URL permanente para consumidores remotos.
10. **Estados separados:** creatividad, derechos, autorización de medios, programación y publicación no se colapsan en un único “aprobado”. Presupuesto propuesto y gasto real son hechos diferentes.

## Superficie inicial a especificar

| Dominio | Lecturas | Commands previstos |
| --- | --- | --- |
| Campañas | Listar, detalle y resumen operativo | Crear, editar brief, archivar |
| Conceptos y assets | Buscar, versiones, cobertura y procedencia | Registrar asset, añadir versión, vincular adaptación |
| Copy | Listar por canal/concepto y consultar versión | Crear y revisar variantes |
| Revisión | Leer comentarios, decisiones y requisitos | Comentar, solicitar revisión, registrar aprobación autorizada |
| Plan | Consultar audiencias, presupuesto y destinos | Editar propuesta y registrar decisión autorizada |
| Publicación | Leer planes, jobs y observaciones del proveedor | Preparar, validar y solicitar ejecución con los permisos y aprobaciones requeridos |
| Actividad | Consultar historial y trabajos | Solicitar exportación o sincronización autorizada |

Esta tabla es diseño de dominio, no un inventario de endpoints ni tools ya disponibles. Nombres, rutas, scopes, schemas y granularidad se fijarán en el contrato implementable. No exponer un command genérico de “ejecutar cualquier acción”.

## Futuro consumer Efeonce MCP

La federación será un adapter fino sobre la API canónica de Studio. No envolver cada endpoint automáticamente: seleccionar tools por intención de usuario, respuestas acotadas, schemas explícitos y errores accionables. El inventario debe declarar qué capacidades se federan y cuáles se excluyen, con motivo, y detectar drift.

Plan de habilitación: provider inicialmente deshabilitado; primer alcance autenticado de lectura, luego escrituras seleccionadas con evidencia. No heredar del provider SEO actual acceso a Studio ni autorizar organizaciones por inferencia. No agregar scopes, clientes o tools al gateway durante esta decisión documental.

## Migración del catálogo

Importar conservando IDs de campaña/concepto/asset, procedencia y aprobaciones documentadas. Reconocer los IDs de Metricool existentes y no volver a programarlos. Mantener copys literales y destinos paid/orgánico separados. Las notas locales son borradores, no decisiones aprobadas. Establecer un corte explícito de autoridad para que base de datos y documentos editables no se conviertan en dos fuentes que divergen; conservar un export/handoff legible por humanos y agentes.

## Alternativas descartadas

- HTML/localStorage como sistema de registro: no resuelve colaboración, control de versiones ni acceso remoto.
- UI con Server Actions como única superficie: acopla consumidores externos al framework y carece de contrato API independiente.
- MCP como backend del producto: mueve reglas de Studio al gateway y hace depender la web de un protocolo de agentes.
- Microservicios desde el primer día por ser API-first: añade operación sin una necesidad de aislamiento demostrada.

## Evidencia requerida antes de declarar la plataforma operativa

- Contrato API y pruebas que lo ejerciten sin navegador.
- Denegación cross-organization, roles revocados y aislamiento de assets comprobados.
- Pruebas de conflicto de revisión, aprobación sobre versión exacta e idempotencia con retries/timeout.
- Web operando sobre las mismas políticas que el cliente de API de prueba.
- Import de ambas campañas conciliado; medios descargables remotamente y procedencia preservada.
- Readback de integraciones sin duplicar los posts existentes.
- Identidad, dominio, despliegue, observabilidad y restauración verificados por separado.
- La certificación MCP será una etapa posterior; contrato preparado no equivale a provider federado.

## Referencias

- [Gateway Efeonce MCP](EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md).
- [Entrada first-party y consentimiento delegado](EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md).
- [Invariantes de superficie MCP](agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md).
- [Registro de campañas](../operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md).
- [Manifiesto de pauta y handoff MCP](../operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md).
