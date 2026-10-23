# Mattis · Cierre documental y aprendizaje de skills

23/10/2026 · Pedido expreso de Julio: lanzar subagentes y actualizar documentación/skills con el trabajo realizado.

## Resultado y alcance

Tres subagentes: continuidad del expediente/registros; skill de licitaciones; skills de deck e informe. El agente principal integró pricing, método funcional/operativo, plantillas, invariantes y continuidad global. Se preservaron cambios concurrentes y no se registró una task de implementación ficticia.

El caso de negocio es MD principal; propuesta de 23 bloques para Claude Design con anexos técnico/económico y estructura de campaña. [Expediente](../../commercial/tenders/mattis-branding-marketing-inmobiliario-1555/README.md). Copias locales en carpeta 14 de Grupo Réditos, con originales, investigaciones, logo y manifiestos.

Precio de simulación: COP 190.150.000 netos; dos meses iniciales y diez ciclos, sujeto a revisión. No se modifica esa cifra, el catálogo o la economía mediante la actualización documental. Sin precio aprobado, proyecto identificado, capacidad asignada o impuestos resueltos; sin nuevo CRM, preguntas enviadas, oferta presentada, firma, compras o créditos.

## Qué se conserva como método

1. Formato de trabajo elegido por el operador: una entrega MD completa para diseño posterior no obliga a generar PDF o registrar Proposal Studio. Al presentar siguen vigentes formato del comprador, aprobación y gates del carril correspondiente.
2. Caso interno, propuesta presentable y control de emisión son documentos con audiencias distintas. El master contiene texto utilizable, no sólo un índice; notas de diseño y costos/márgenes no se filtran al comprador.
3. RFP, hechos investigados, propuesta propia y pendientes se distinguen. Cantidades, fases y aplicaciones se cuentan una vez; el proyecto no se identifica por un ejemplo web o por el nombre de la carpeta.
4. Logos oficiales, fuentes, fechas y límites de uso se conservan. Investigación delegada requiere autorización; seis agentes del caso anterior o tres de este cierre no son una cuota estándar.
5. V3 vigente usa costos objetivo, dedicación sustentada y evaluación. Un cuadro MD puede transcribir sus valores exactos sin emitir cotización; cambiar cifras requiere recalcular. Impuestos sin resolver no se rellenan; diseño no aprueba economía.

Precio, volúmenes, duración concreta, número de bloques y recursos de Mattis permanecen en el expediente como propuesta de ese caso, **no** en las skills como una oferta o rate card general.

## Dueños actualizados

| Capa | Fuente |
| --- | --- |
| Método operativo | [Construir una licitación](../../manual-de-uso/comercial/construir-una-licitacion.md#preparación-en-markdown-para-diseño-externo) |
| Método funcional | [Construcción de licitaciones](../../documentation/comercial/construccion-de-licitaciones.md#caso-de-negocio-y-propuesta-en-markdown) |
| Contrato técnico del dominio | [Invariantes de licitaciones](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md#preparación-editorial-md--aclaración-de-alcance-2026-10-23) |
| Plantillas | [Workspace](../../commercial/tenders/TENDER_WORKSPACE_TEMPLATE.md), [oferta técnica](../../commercial/tenders/TECHNICAL_OFFER_TEMPLATE.md), [playbook creativo](../../operations/proposals/CREATIVE_CAMPAIGN_PROPOSAL_PLAYBOOK_V1.md) |
| Pricing | [Manual V3](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md#resumen-editorial-md-antes-de-emitir) |
| Skills de ambos agentes | `greenhouse-public-private-tenders`, `deck-studio`, `report-studio`, `efeonce-pricing-operator` y sus referencias pertinentes en `.codex/skills/` y `.claude/skills/` |
| Continuidad del caso | README y párrafos Mattis en ambos registros CRM; Handoff, changelog y puntero breve en project_context |

No se cambia AGENTS/CLAUDE ni su router: los dominios y rutas existentes ya cargan las skills pertinentes. No se cambia configuración o catálogo runtime de skills MCP. Los cuerpos locales aquí actualizados no son manuales de `docs/mcp/skills/`.

## ADR y límites

Se concilian instrucciones explicativas con la preferencia expresa del operador y el canon V3 existente. No se cambia schema, autoridad, autonomía, gates de aprobación, contratos financieros ni el workflow runtime de Proposal Studio. Se mantiene la separación taller/registro de la [arquitectura existente](../../architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md). Conforme al gate ADR, esta aclaración documental reversible no introduce una decisión estructural nueva; no se crea ni se marca Accepted un ADR sin necesidad.

## Validación

- `pnpm skills:mirrors`: correcto. Comparación completa adicional de `deck-studio`: idéntica. En Pricing se verificó que las inserciones de este cambio son equivalentes en ambos agentes; se preservaron diferencias anteriores ya presentes en HEAD, sin sincronizarlas a ciegas.
- 48 enlaces locales nuevos comprobados, sin destinos ausentes. Los subagentes verificaron también 18 enlaces del expediente y los 23 bloques del master.
- Control de diff y cierre documental: sin errores de estructura; cierre con 0 advertencias. En el commit, el chequeo omite sólo espacios al final de línea para conservar saltos Markdown de dos espacios y la extracción literal del RFP; mantiene controles de fin de archivo y espacio antes de tabulación.
- `docs:context-check:strict`: 0 errores y 0 advertencias. Rotación canónica de una sesión de Handoff y una entrada de changelog hacia sus históricos, conservando evidencia de integridad. Se compactó redacción del contexto sin retirar fuentes, reglas ni hechos para alojar el puntero al manual.
- Sin cambios de código runtime; no se ejecuta una suite de producto para esta actualización documental. El QA de precio/cantidades del artefacto ya estaba registrado en el expediente y no se recalcula el negocio por cambiar las instrucciones.

Commit local autorizado por Julio en su pedido posterior; sin push. OneDrive se verifica como copia local; no se acredita sincronización remota. El diseño final y su revisión visual quedan para la siguiente etapa autorizada.
