# Efeonce B2B Prospecting — decisión de método compartido

- **Status:** Accepted.
- **Date:** 2026-10-11; el operador aprobó crear la estructura investigada con «Vamos» y pidió apoyo de `@Sales`.
- **Owner:** Commercial / Julio Reyes; Customer Model, prácticas y CRM conservan sus dominios.
- **Scope:** skills repo Codex/Claude, entrada Commercial Codex y adapter personal de radar.
- **Reversibility:** two-way; archivos de método, sin migración ni nuevos procesos externos.
- **Confidence:** high en contrato/ownership; medium en eficacia comercial, a experimentar localmente.
- **Validated as of:** 2026-10-11, documentos locales, revisión Sales y fuentes fechadas del discovery; no estado live de proveedores.

## Context

La prospección ya tiene radar personal, reglas CRM, modelo de cliente, métodos comerciales y seguimiento.
El [discovery](../audits/commercial/2026-10-11-prospecting-skill-discovery.md) encontró reglas repartidas y
un routing Codex ausente para Commercial. El operador exige datos accionables y objetivo más 2–3 contactos
adicionales; el [canon CRM](GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md) ya establece
el gate de correo individual. El trabajo reciente distingue necesidad pública, relación, compra y ejecución.

## Decision

1. Crear `efeonce-b2b-prospecting` como núcleo compartido y discoverable. Unidad de salida: cuenta con
   evidencia, encaje, grupo comprador, rutas y siguiente decisión; referencias por fase, no carga completa.
2. Mantener relación por persona/con quién y demanda/progreso/urgencia por oportunidad. Frío/tibio/cálido,
   referido, reactivación y expansión eligen recorridos; no son lifecycle CRM ni probabilidad de cierre.
3. Buscar objetivo + 2–3 adicionales incluso con email del objetivo. Mantener brechas explícitas y búsqueda
   acotada. No crear Contact/Lead sin correo corporativo individual verificado, inventar vínculo ni atribuir
   demanda del objetivo a adyacentes. Sin email, preservar investigación/nota de empresa autorizada.
4. Una tesis/owner/historia por cuenta; valor adaptado al rol y prueba contextual proporcional. No rodear
   negativas o restricciones de proceso ni abrir cadencias por cada persona automáticamente.
5. Commercial conserva discovery, negociación y next step; Customer Model el ICP/JTBD; prácticas la oferta,
   capacidad y proof; Copywriting la voz; HubSpot las mutaciones/readback. La entrada Codex de Commercial es
   companion del overlay Claude, no un fork del método global. Cargar sólo la fase pertinente, sin recursión.
6. La skill personal `hubspot-saas-prospecting` conserva nombre compatible, IDs HSP, historial, datos privados,
   matriz, reportes, ventanas y scheduler; delega método al núcleo. No mover datos, borrar aprobaciones o crear
   otro scheduler. El adapter local no constituye distribución a otros hosts.
7. Sales es colaborador opcional por fase, descubierto mediante su índice instalado. Enrichment identifica
   contactos/datos; company research prepara acercamiento a destinatario conocido; strategy/business case/
   follow-up conservan sus propios recorridos. No copiar el plugin ni fijar versión/cache como dependencia.
   Cuando Sales exige Sales Intelligence y no hay evidencia equivalente, bloquear sólo esa fase nativa;
   no sustituirla con broad web/CUA. Los docs/fixtures bastan para crear/evaluar la skill.
8. Modo degradado explícito: `deep-research` no disponible en el preflight. Para investigación acotada se
   permite lectura/búsqueda directa y síntesis con fuentes/fechas; delegación sólo autorizada. Se conserva
   rigor de Research, sin afirmar ejecución de harness. Un encargo que exige esa harness queda pendiente.

## Alternatives Considered

- **Ampliar sólo la skill personal:** no comparte método ni corrige routing/deriva entre agentes.
- **Otro radar completo en el repo:** duplica IDs, scheduler y datos; más riesgo de contacto duplicado.
- **Delegar todo a Sales:** el plugin no posee nuestras reglas de ICP, correo, buying group o capacidad;
  su enrichment no ejecuta escritura ni contacto. Aporta workflow disponible en vez de dependencia dura.
- **Manual monolítico:** carga métodos de venta/proveedor irrelevantes en consultas simples y facilita drift.

## Consequences

Método común versionado y evaluable; mantenimiento de fuentes, routing y adapter local. La skill no demuestra
que nuestras técnicas mejoren conversión ni que los datos/provider settings sigan vigentes. Preserva los
permisos de investigación, datos personales, créditos, CRM, enrollment, Deal, envío y publicación por acción;
reutiliza una autorización existente válida sin solicitarla otra vez. No modifica tarifas, ICP general,
schema, lifecycle, infra o autonomía. Una excepción de filial requiere su aprobación concreta documentada;
no se generaliza por headcount global. La discrepancia entre gate económico ICP y plan outbound propuesto
se conserva visible y la decide Commercial/operador para el caso, no esta skill mediante cifras inventadas.

## Runtime Contract

- Fuente de método: [Codex](../../.codex/skills/efeonce-b2b-prospecting/SKILL.md) y espejo Claude byte-identical.
- Fuentes externas/técnicas: `references/sources.md`, con consulta y límites, no wrappers API nuevos.
- Compartición verificada: entrada del bundle en `scripts/skills/validate-mirrored-skills.mjs`.
- Descubrimiento: router AGENTS/CLAUDE y `docs/operations/agent-context-router.json`.
- Commercial Codex es companion deliberado del overlay Claude/global, no espejo byte-identical.
- Datos reales en CRM/dossiers autorizados; fixtures anónimos, evaluación offline sin efectos externos.
- [Funcional](../documentation/comercial/prospeccion-b2b.md), [manual](../manual-de-uso/comercial/operar-prospeccion-b2b.md)
  y [evidencia de implementación](../audits/commercial/2026-10-11-prospecting-skill-implementation.md).

## Revisit When

Cambie un gate/permiso del operador, aparezca deriva de resultados Codex/Claude, un provider altere costos o
campos, el adapter duplique cuentas/envíos, haya evidencia local de eficacia o fallen escenarios críticos.
Pilotaje de comunicaciones, cambios económicos y schema requieren sus propias decisiones/autorizaciones.
