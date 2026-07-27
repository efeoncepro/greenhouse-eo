# Agentic Readiness — Producto Wave

> **Estado:** diseño funcional inicial; el runtime de Wave y la implementación del producto todavía no están autorizados.
> **Owner:** Wave Product + Product/Architecture
> **Admin transversal:** Greenhouse
> **Contrato técnico:** [`EFEONCE_WAVE_PRODUCT_PLATFORM_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`](../../architecture/EFEONCE_WAVE_PRODUCT_PLATFORM_GREENHOUSE_ADMINISTRATION_DECISION_V1.md)

## Qué es

Agentic Readiness es un producto de Wave para evaluar si la capa digital de una organización puede ser descubierta,
interpretada y operada por agentes.

Nace como producto **Agent Native** y con **Full API Parity**: la experiencia humana, los agentes, MCP/SDK/API y las
automatizaciones consumen el mismo contrato gobernado. La interfaz no es el source of truth ni el único camino de
ejecución.

No certifica que una marca será recomendada por un agente ni garantiza rankings, conversiones o adopción. Entrega
mediciones, evidencia, límites de confianza y una ruta priorizada de mejora.

## Distribución del producto

Agentic Readiness debe conservar el patrón probado del Brand Visibility Grader, con varias superficies sobre un mismo
core:

| Superficie | Propósito | Propietario |
|---|---|---|
| **Agentic Readiness Snapshot** | Lead magnet público, diagnóstico inicial y CTA | Wave |
| **Agentic Readiness Audit/Grader** | Análisis completo, evidencia y recomendaciones | Wave |
| **Wave Operator Workbench** | Runs internos, revisión, comparación, costos y handoff | Wave |
| **Client Workbench** | Resultado contratado, plan, tendencia y próximos pasos | Wave |
| **Monitoring** | Re-evaluación, baseline/after y operación recurrente | Wave |
| **Admin Bridge** | Administración transversal de organizaciones, bindings, acceso, engagement y deep links | Greenhouse |

El mismo core puede producir variantes public-safe, client-safe e internal. La superficie no debe recalcular scoring ni
interpretar evidencia localmente.

## Recorrido funcional

```text
Snapshot público
→ Audit completo
→ Baseline de readiness
→ Priorización de gaps
→ Remediación Wave
→ Re-medición y evidencia de mejora
```

El Snapshot puede ser gratuito. El Audit es el diagnóstico de entrada que abre los Product Services de Wave. El
monitoreo recurrente es una expansión, no una consecuencia automática del lead magnet.

## Lugar dentro de las puertas de Wave

Agentic Readiness no reemplaza el Brand Visibility Grader. Son puertas complementarias:

| Puerta | Pregunta | Ruta principal |
|---|---|---|
| **Brand Visibility** | ¿Cómo representa la IA y la búsqueda a la marca? | Search Visibility 360 |
| **Agentic Readiness** | ¿Puede la capa digital ser descubierta, interpretada y operada por agentes? | Web Experience 360 + Agent Systems & Platforms |
| **Launch Readiness** | ¿Puede una organización producir, aprobar, publicar, medir y mejorar experiencias digitales? | Experience LaunchOps |

Agentic Readiness puede recomendar Web, Search, Measurement, Agents o Automation según el gap, pero no debe convertirse
en un mega-diagnostic con un score que oculte cuál es la decisión de compra.

## Conversión y evidencia

El Snapshot debe abrir una decisión concreta: recibir el resultado, solicitar un Audit, agendar una sesión de lectura
o iniciar una remediación. El reporte debe incluir la ruta de Wave recomendada y el siguiente paso bilateral.

La salud del producto se mide por cuentas calificadas, conversión Snapshot→Audit, conversión Audit→Product Service,
pipeline contribution, costo por diagnóstico, tiempo a primer valor, expansión y renovación. El volumen de leads es una
señal auxiliar, no el outcome principal.

## Ejes iniciales

- **Be Legible:** estructura, semántica, metadata y datos estructurados.
- **Be Discoverable:** indexabilidad, entidades, citabilidad y presencia en superficies de búsqueda/IA.
- **Be Callable:** endpoints, acciones, schemas y capacidades que un agente puede identificar y usar.
- **Be Safe:** permisos, límites, confirmaciones, privacidad y comportamiento degradado.
- **Be Complete:** un agente puede completar una tarea real con evidencia de resultado.

Lighthouse cubre una parte del baseline técnico. No reemplaza las evaluaciones de tareas reales, la revisión de
seguridad ni la evidencia de completitud.

## Relación con Wave

El producto empieza principalmente en **Web Experience 360** y **Search Visibility 360**, y puede abrir expansión hacia:

- **Agent Systems & Platforms:** arquitectura, agentes, evaluaciones y operación;
- **Measurement & Analytics:** instrumentación, observabilidad y medición de outcomes;
- **Digital Automation & Integrations:** APIs, workflows, MCP y automatizaciones.

No crea una sexta familia de Wave. **Experience LaunchOps** es otro Product Service compuesto de Wave: integra Web
Experience, Search/AEO, Measurement, Agent Systems, Automation, governance y release. Agentic Readiness puede ser su
diagnóstico de entrada o una capability de evaluación dentro de ese servicio.

## Relación con Greenhouse

Greenhouse administra el contexto transversal de todas las plataformas Efeonce. Puede mostrar un resumen, estado, CTA o deep link hacia Wave,
pero no debe:

- ejecutar el análisis de Wave;
- guardar una copia transaccional del run;
- recalcular el score;
- acceder directamente a la base de datos o secretos de Wave;
- inferir tenant o autorización desde una URL o etiqueta.

Greenhouse sí puede administrar el binding, entitlement administrativo, relación comercial, handoff y proyección
segura. Wave conserva el enforcement local y el source of truth del producto.

### Acceso sin segundo login

El usuario inicia sesión una sola vez en la identidad Efeonce/Greenhouse. Al abrir Agentic Readiness desde Greenhouse,
Wave recibe una sesión federada o handoff firmado y resuelve el subject y tenant local correspondientes. El usuario no
debe volver a autenticarse.

Esto no convierte a Greenhouse en la base de datos de usuarios de Wave: Greenhouse administra la identidad y el acceso
transversal; Wave valida localmente expiración, revocación, tenant, capabilities y entitlements antes de cada operación.

La integración se realiza mediante bindings explícitos, contratos versionados, readers/projections y, cuando sea
necesario, commands gobernados con actor, capability, idempotencia y audit trail.

## Estados de madurez

1. **Snapshot:** primera lectura pública, con límites y evidencia mínima.
2. **Audit:** análisis completo y priorización accionable.
3. **Foundation:** remediación de las superficies con mayor impacto.
4. **Monitor:** comparación recurrente y governance de mejora.

Los estados de producto no equivalen a aprobación comercial. Pricing, claims públicos, venta general y rollout deben
seguir los gates de Wave y Efeonce.

## Límites actuales

- El runtime propio de Wave todavía debe definirse y verificarse en su repositorio.
- El Brand Visibility Grader actual continúa como rail de coexistencia en Greenhouse.
- Lighthouse/Chromium es un componente previsto, no una capability ya promovida a producción en Wave.
- No existe todavía un contrato final de evaluación de tareas agentic ni una garantía universal de agent readiness.
- La coverage matrix de Full API Parity y la evaluación Agent Native aún deben definirse antes de derivar tasks técnicas.
