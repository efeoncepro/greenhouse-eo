# Pibank · Aprendizajes incorporados a documentos y skills

06-10-2026, America/Santiago. Solicitud del operador: lanzar subagentes y actualizar documentos y skills a partir del caso completo. Tres subagentes revisaron método, instrucciones de oficio y continuidad; el agente principal integró los cambios y su verificación. Estado: actualización documental preparada localmente, sin cambio de oferta, runtime o permisos.

## Qué se incorpora y dónde

| Aprendizaje reusable | Fuente dueña actualizada |
|---|---|
| Definir meta, producto, unidad, período y outcome; calcular visitas requeridas y contrastarlas con demanda elegible | [Método comercial](../../commercial/SEO_AEO_BUSINESS_CASE_METHOD_V1.md), [manual](../../manual-de-uso/comercial/construir-caso-negocio-seo-aeo.md) y [lectura funcional](../../documentation/comercial/caso-negocio-seo-aeo.md) |
| Conservar capturas, familias y representantes; cobertura de competidores no equivale a mercado, audiencia o tráfico propio | [Referencia SEO/AEO](../../../.codex/skills/seo-aeo/references/caso-negocio-y-propuesta.md) y rutas de SEO/práctica/growth |
| Requisitos inversos y sensibilidades permiten decidir sin inventar un forecast; incrementalidad exige referencia defendible | Método, SEO/práctica, business model y customer model |
| Apertura, fondeo, saldo, origen y madurez de cohortes requieren denominadores y ventanas propios | Método/manual y referencia SEO/AEO |
| Duración y capacidad se diseñan por implementación, publicación y maduración; primer mes evalúa preparación | Método, SEO/práctica y rutas de negocio/cliente |
| Costear roles, PR, reserva, herramientas y terceros; vacío no es cero; costo blended no es tarifa del cliente | Método/manual y pricing |
| Recurso aprobado, publicado y verificado antes de PR; medir originales, dominios y grupos, con baseline y atributos | Método, [campañas integradas](../../../.codex/skills/digital-marketing/modules/07_INTEGRATED_CAMPAIGNS.md) y SEO/AEO |
| Conciliar cargo, tarea y filas por separado antes de repetir una compra; filtros nuevos no recuperan resultados anteriores | [DataForSEO · contrato07](../../../.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md#reconciliacion-y-cobertura-de-investigacion) |
| Scores conservan instrumento, escala, fecha y cobertura; resumen/detalle de enlaces no se fuerzan a coincidir | DataForSEO y referencia SEO/AEO |
| PDFs, deck y workbook deben concordar en cifras, calendario, alcance y destinatario; recalcular, inspeccionar y verificar copias finales | [Report Studio](../../../.codex/skills/report-studio/references/decision-package-qa.md) y [Deck Studio](../../../.codex/skills/deck-studio/references/decision-package.md) |

## Cobertura de skills y estructura

Once suites actualizadas en sus entradas Codex y Claude: `seo-aeo`, `seo-aeo-practice`, `efeonce-business-model-operator`, `efeonce-customer-model-operator`, `efeonce-pricing-operator`, `greenhouse-public-private-tenders`, `dataforseo-operator`, `report-studio`, `deck-studio`, `growth-marketing-cro` y `digital-marketing`.

Las entradas enlazan referencias de oficio; los datos del banco permanecen en su expediente. Referencias nuevas SEO/AEO, reportes y decks se espejan. DataForSEO mantiene su referencia canónica existente en Claude y la ruta compartida desde Codex; no se amplía el layout ni su allowlist. Customer/Pricing conservan sus companions específicos: el bloque incorporado coincide, sin reemplazar wrappers o contenido previo. Los contratos de bid, autoridad comercial y aprobación económica siguen en sus dueños.

Se actualizaron índices comercial/general/manual/funcional/auditoría, Handoff y changelog para hacer descubribles método y cierre. El router raíz ya dirige estos dominios a sus skills. Para cerrar el commit aislado, project_context incorpora una ruta breve al método en la fila de modelos, sin aumentar su tamaño; AGENTS/CLAUDE conservan sus instrucciones y los procedimientos no se duplican allí.

## Continuidad del caso

[Retrospectiva interna](../../commercial/prospects/banco-pichincha-peru-seo-2026/RETROSPECTIVA-2026-10-06.md) registra la evolución, evidencia, límites y próximos acuerdos. README, PROSPECT-CASE, SALES-POD y README de reconstrucción ahora distinguen el paquete vigente v0.6 de planes/modelos retirados. La historia permanece; no se reescriben pruebas anteriores como pruebas del alcance nuevo.

La preparación vigente sigue en [cierre v0.6](2026-10-06-pibank-brechas-cierre.md): PDFs de 11/2/14 páginas, modelo de 10 hojas y 29 pruebas nativas en LibreOffice, capacidad candidata de 1.216h incluyendo PR. La verificación de artefactos de esta actualización comprueba identidad por hashes, sin regenerarlos ni atribuir un nuevo QA visual o recálculo. Los resultados de pruebas nativas permanecen como evidencia de su corrida anterior.

Costos reales, disponibilidad de roster y fee Efeonce siguen pendientes. Meta/unidad/período, conversiones, origen, continuidad, valoración y permisos bancarios requieren acuerdo o evidencia. Las cifras de este prospecto no pasan a ser benchmarks, duración corporativa ni caso de éxito citable; tampoco se afirma cumplimiento de meta.

## Autoridad y revisión

Esta actualización consolida un método de preparación propuesto y procedimientos de evidencia bajo sus fuentes existentes. No cambia source of truth de producto, contratos/API, acceso, pricing corporativo ni el workflow de aprobación. La evaluación de ADR no detectó una decisión nueva; el [contrato vigente del router](../../architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md) conserva estructura y propiedad. Los modelos de negocio/ofertas y las skills de roles de campaña se revisaron como referencias de encaje, sin cambio de sus contratos.

No se compraron datos, contactaron medios o banco, enviaron documentos, escribieron CRM/Notion, actualizaron memorias, publicaron artefactos ni ejecutaron commit/push/despliegue.

## Verificación de esta actualización

- `pnpm skills:mirrors`: PASS. Comparación complementaria: nueve entradas idénticas, cuatro companions idénticos; bloques de Customer/Pricing coincidentes con wrappers propios conservados.
- Cierre documental estricto, invocado directamente con pathspecs de esta integración y owners raíz: cero warnings. Contexto/Handoff/changelog estricto: cero errores y cero warnings.
- Destinos locales Markdown comprobados en 47 rutas: sin faltantes. Se corrigieron tres enlaces relativos anteriores en SEO Practice y Customer; el contenido de sus contratos permanece. Los enlaces web se conservan como referencias, sin nueva investigación externa.
- `git diff --check` focal: PASS. Archivos Markdown nuevos sin espacios finales; los seis espacios finales heredados del diagrama ASCII de Growth se verificaron iguales a HEAD y se conservaron.
- 22 comparaciones SHA-256 contra manifests vigentes: tres PDFs cliente, workbook y fuentes/copias económicas coincidentes. Ningún artefacto regenerado.

Gates finales repetidos después de la última edición de esta auditoría. Las pruebas nativas y visuales del paquete comercial corresponden a la corrida v0.6 previa, no a esta actualización documental.
