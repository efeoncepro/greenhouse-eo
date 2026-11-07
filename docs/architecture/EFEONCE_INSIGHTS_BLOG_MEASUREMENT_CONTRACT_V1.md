# Efeonce Insights — Contrato de medición Blog V1

## Estado y alcance

- Estado: **Proposed; contrato candidato verificable localmente**. Fecha: 2026-11-01.
- Unidad: TASK-2094, experimento local. No acepta el ADR operativo, no decide A′/B ni autoriza rollout.
- Dueños propuestos: Growth/SEO para población y productores, AEO para panel/citas, Insights para encargo/sello.
- Evidencia previa: [discovery de medición](../audits/client-portal/2026-11-01-sky-deep-review/05-ga4-gsc.md).
- Contrato ejecutable: [measurement-contract.ts](../../scripts/experiments/sky-measurement-bridge/measurement-contract.ts).
- Pruebas: [measurement-contract.local-spec.ts](../../scripts/experiments/sky-measurement-bridge/measurement-contract.local-spec.ts).

Este documento define qué evidencia puede considerarse suficiente para un informe Blog con GA4, GSC y motor
AEO nativo. El código candidato sólo evalúa receipts sintéticos de adapters; no consulta credenciales, no valida
grants reales, no genera ni emite informes. `complete_candidate` significa pasar esta validación de evidencia:
**no equivale a autorización de emisión**, revisión humana, artefactos validados ni autorización de distribución.

## 1. Encargo e identidades independientes

El encargo fija Organization, Space, Service, binding ID/version, scope ID/version, métodos/fuentes, período y
policy versionada. A′/B deben producir el mismo resultado para la misma evidencia y autoridad.
La conexión puede pertenecer a la Organization sin conceder acceso a cualquier Space de esa organización.

| Identidad | Obligación |
|---|---|
| Organization | Relación con el cliente; no sustituye cuenta operativa ni propiedad analítica |
| Space/Service | Destinatario operativo del encargo; binding explícito, vigente y verificable por servidor |
| Scope | Host exacto y reglas de paths versionadas; fingerprint determinista del contenido aplicado |
| Fuente | ID de propiedad/perfil, método y versión explícitos por productor |
| Receipt | ID único de extracción/corrida, rol current/comparison, binding/scope aplicados, calidad |
| Policy | Versión de reglas de suficiencia y denominadores; umbrales específicos declarados y auditables |

El evaluator exige **exactamente un receipt seleccionado por productor y rol**. No elige latest ni suma receipts
ambiguos. Un adapter puede consolidar varios batches, pero debe hacerlo mediante selección versionada y mantener
la procedencia de sus inputs. Los receipts no son payloads de clientes confiables: su emisor debe verificar
fuente, permisos, aplicación real del filtro y controles antes de marcarlos como verificados.

## 2. Scope por host y paths, sin romper Berel

El host de SKY en este encargo es `blog.skyairline.com`; no incluye www, sub-subdominios ni hosts que lo contienen
como sufijo textual. El matcher usa URL absoluta HTTP(S), hostname exacto y rechaza userinfo/puertos no estándar.
Host y dot-segments del path se normalizan mediante parser URL; después se aplica la comparación por bytes
de reglas SEO. Esto impide aceptar /permitido/../fuera. El matcher legacy no se modifica.

En el **nuevo contrato**, paths vacíos significa todas las rutas **dentro del host explícito**. Scope null,
deleted, inválido o versión ausente produce preview_only. Nunca significa sitio completo.
En Berel v1 permanece la semántica actual: reglas por path, sin host, lista vacía desactiva recorte. No reinterpretar
registros antiguos ni cambiar el matcher v1. Cualquier adopción usa una versión distinta y regresiones.

Fingerprint SHA-256 incluye ID/version, host y reglas canónicas. No demuestra que un proveedor aplicó el filtro:
esa prueba pertenece al adapter y debe conservarse en el recibo de extracción. Render consume el scope sellado,
no la configuración que exista cuando se abre el informe.

## 3. Ventanas y calendarios

El encargo usa fechas civiles `[start,endExclusive)`, zona IANA y sus dos instantes UTC. La resolución sigue siendo
propiedad de `src/lib/efeonce-insights/window.ts`; el candidato llama al resolver real para contrastar UTC,
no introduce otro resolver ni convierte meses en 30 días. Pruebas incluyen cambio DST de Santiago.

**Límite descubierto del canon:** para inicio 06-09-2026 en Santiago, la medianoche no existe. El resolver actual
de dos pasadas no rechaza: devuelve una frontera que cae el 05-09 civil. El candidato caracteriza ese resultado
y añade un guard de correspondencia de fecha con `civilToday` del mismo canon: queda preview_only. No corrige
el resolver productivo ni inventa una frontera alternativa. La política para esos días debe resolverla su owner;
una prueba mensual con cambio de offset no cubría este caso de medianoche inexistente.

Cada fuente declara su calendario y equivalentes UTC. V1 candidato usa alineación `same_civil_dates`: mismo
rango de etiquetas civiles, cada una en su calendario, con diferencia explícita. GSC usa PT; GA4 usa calendario
de propiedad verificado; AEO declara el suyo. No afirmar coincidencia instante-a-instante.
La consulta debe ocurrir después del cierre tanto del calendario de fuente como del informe.
Eso sólo certifica el momento de consulta, no disponibilidad de datos: GA4/GSC declaran además
`dataAvailability={servedThroughExclusive,finality,verifiedAt}`. La frontera servida es civil y exclusiva,
cubre al menos el fin solicitado y no supera la fecha civil de verificación; la verificación UTC no precede
al cierre fuente ni sucede después de queriedAt. `provisional`, `unknown`, recibo ausente o cobertura tardía
mantienen preview_only, también para comparación. `final` es suficiencia verificada **as-of** conforme al
método productor; no promete que Google jamás revise datos. El adapter debe aportar evidencia del estado y
de la cobertura, no rellenar esos campos con la fecha del request.

AEO exige corrida terminada con instante observado dentro de la ventana UTC del encargo. Una corrida sólo en
comparación no satisface evidencia actual. Para GA4/GSC, receipt de otro período o fuente se rechaza.
No reetiquetar historia www como scope Blog actual: comparativos que cruzan migración requieren binding temporal
y normalización explícita en una extensión, no en un cambio silencioso del scope.

## 4. Tres productores obligatorios

### GA4

La policy elige `blog_entry_sessions` o `blog_page_activity`. Son poblaciones diferentes.
Adquisición requiere prueba del host de entrada; `hostName + landingPath` no se considera demostración suficiente
sin validación de sesiones entre hosts. Actividad no puede renombrarse como adquisición.
[Dimensiones GA4](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema).

Receipt conserva fuente, método, extracción completa y revisión de metadata. Sampling, thresholding, other,
restricciones y emptyReason se evalúan según método/policy; una señal no significa automáticamente pérdida,
pero una causa de calidad sin resolver impide complete_candidate.
[Metadata oficial](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/ResponseMetaData).

El candidato usa `qualityVerified`, `metadataReviewed` y razones pendientes como atestación del adapter.
Falta implementar transporte real de metadata y regla cuantitativa donde corresponda; esos booleanos no
reemplazan evidencia en producción. `dataAvailability` es otra atestación explícita: la finalización de una
consulta y una metadata limpia no acreditan por sí solas datos disponibles hasta el cierre solicitado.

### GSC

Distinguir completitud de extracción, cobertura temporal y límites del proveedor. Query×page puede ser detalle
limitado aun después de paginar. No exigir imposible cobertura del 100% de consultas ocultas.
El KPI de clics del receipt candidato sale del control sin query, en el mismo scope/ventana y agregación byPage;
detalle se usa con cobertura declarada. Nunca se mezclan denominadores de propiedad y URL.
[Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

`providerCompleteness=top_rows` es admisible con extracción completa, controles verificados, detalle≤control y
ratio detalle/control que cumple policy versionada. Umbrales de tests son **sintéticos**, no aprobados para SKY
ni recomendación universal. Control=0 y detalle=0 sólo admite observed_zero con captura/calidad verificadas;
no se infiere de ausencia de filas en la tabla. Cobertura de consultas no se extrapola a países o URLs.

La policy de producción deberá definir suficiencia por métrica/uso. La misma cobertura puede bastar para
describir un total controlado y no bastar para un ranking de consultas o valoración CPC.
[Limitaciones GSC](https://support.google.com/webmasters/answer/17011259?hl=en).

> **Delta 2026-11-05 — el control sin query ya lo implementa Insights; el tablero SEO no.**
> [ISSUE-191](../issues/open/ISSUE-191-seo-gsc-daily-undercounts-clicks-hidden-queries.md) confirmó con datos reales lo
> que este apartado exigía: `seo_gsc_daily` guarda `query × page` y su suma es un subconjunto (blog de Berel, octubre
> de 2026: 1.065 de 4.094 clics). El capítulo SEO de Insights toma ahora clics, impresiones, CTR, posición, serie y
> páginas del reader dueño `readSeoSearchControlForWindow` (sin dimensión consulta, `byPage`, `final`, alcance como
> expresión de página) y deja `query × page` como detalle; si el control falla declara el límite y no cae a la tabla
> ([arquitectura §5.2](EFEONCE_INSIGHTS_ARCHITECTURE_V1.md)). Estado: **code complete local, rollout pendiente**. El
> tablero SEO y los demás readers de `seo_gsc_daily` siguen sumando el subconjunto. Esto no adopta el resto de este
> contrato candidato (receipts, `dataAvailability`, policy de suficiencia), que sigue Proposed.

### AEO nativo

Receipt exige perfil/método, run ID, corrida terminada, panel fingerprint, observaciones planificadas, exitosas
y fallidas; suma de resultados debe explicar todo el panel. El ratio de éxito se compara contra policy versionada.
Ejecución incompleta, denominador cero o destinos de citas desconocidos impiden complete_candidate.
La métrica local es **ocurrencias de citas Blog**, no URLs únicas, presencia de marca ni cuota de mercado:
valor debe igualar las ocurrencias clasificadas dentro del scope.

URLs de cita se validan por host exacto. El adapter conserva URL original, destino comprobado y procedencia;
redirect desconocido permanece desconocido. El evaluator no resuelve redirects ni hace fetch.
GA4 referrals es productor diferente; nunca acredita corrida nativa AEO.

## 5. Estados y comparación

| Condición | Resultado local |
|---|---|
| Tríada actual con binding/scope/window/método/calidad válidos | complete_candidate |
| Fuente faltante, sólo comparación o referrals sin nativo | preview_only |
| Extracción parcial/fallida, unknown/unavailable o metadata pendiente | preview_only |
| GA4/GSC dataThrough incompleto, finality provisional/unknown o atestación inválida | preview_only |
| Scope borrado o inválido | preview_only, sin ampliar alcance |
| Valor 0 + observed_zero + calidad y extracción verificadas | admisible |
| Valor 0 sin evidencia de cero | preview_only |
| Panel comparativo distinto con current válido | current puede ser candidato; comparación inhabilitada |
| Policy exige comparación y ésta no es elegible | preview_only |

No existe bypass allowPartial en este contrato. Preview puede informar límites, pero no certifica cumplimiento.
Una comparación usa los mismos métodos/binding/scope y panel compatible; si cambia panel no imprime delta AEO.
La corrección editorial debe separar métricas comparables/no comparables. El booleano global candidato es
conservador: no habilita comparación parcial de capítulos.

## 6. Historia, causalidad e integración pendiente

Medir todo Blog incluye contenido anterior. El inicio comercial de SEO no convierte tráfico histórico en
producción de Efeonce. Baseline, intervenciones por URL/fecha, estacionalidad y seguimiento se registran aparte;
atribución temporal no demuestra causalidad. Mantener los hechos y ediciones de Diseño intactos.

Integración futura debe reutilizar owners de TASK-2033 (scope), TASK-1960 (informe/Servicio), readers canónicos
GA4/GSC y corrida nativa AEO. Requiere cambios en transporte de calidad, selección/provenance, política y gate
de encargo; no copiar readers dentro de Insights ni modificar hechos sellados.

La batería local comprueba ramas adversariales, matcher nuevo y regresión de primitives reales Berel/GA4.
No certifica API Google, bases compartidas, grants ni deploy. Rollback del futuro consumo desactiva nuevas
generaciones acotadas y conserva ediciones/scope versionados; nunca vuelve a sitio completo ante un error.
