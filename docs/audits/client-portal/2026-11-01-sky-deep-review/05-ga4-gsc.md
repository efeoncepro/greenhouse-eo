# SKY — población, calidad y cobertura de GA4/GSC (objetivo 5/6)

Fecha: 2026-11-01. Base: `985f84d3c3e4cc6730daced533085d431b8cf61f`.
Lectura local y documentación oficial pública; sin credenciales, extracciones de SKY, SQL remoto ni cambios runtime.
Única ejecución: matcher puro existente con URLs sintéticas, transpilation local y VM sin I/O del módulo.

## Dictamen

**Berel aporta una base reutilizable, pero no resuelve SKY por configuración.** Su alcance v1 es por rutas y
descarta host. SKY requiere el host exacto `blog.skyairline.com`, dentro de una propiedad GA4 que el expediente
identifica como general SKY. Declarar `/blog` o dejar reglas vacías no expresa ese requisito.
Además, tener filas GA4/GSC no demuestra cobertura suficiente: hoy se pierde la calidad de la respuesta GA4;
la cobertura GSC cuenta fechas con filas, sin certificar extracción completa ni población total.

Esto es independiente de A′/B: ambos conservan una Organization y las conexiones/lecturas actuales se resuelven
por Organization. El split de Spaces no separa los productores automáticamente. Puede desarrollarse y probarse
la medición interna del Blog antes del split, sin cambiar datos reales, emitir ediciones ni abrir acceso externo.

## 1. Alcance → reader → evidencia: herencia útil y límite concreto

`seo-adapter.ts:543–561` resuelve target y scope por Organization. Lee una versión para ambas ventanas
(`:557–578`) y la sella en fuentes (`:586–588`). Esto evita comparar contenido acotado contra sitio completo
por accidente. Fallo de lectura no activa fallback silencioso: conservar esa protección.

Pero `growth/seo/content-scope/contracts.ts:19–38` sólo admite kind/path; `:53–58` elimina host;
`:128–129` rechaza raíz; `:139–147` trata reglas vacías como scope no activo.
El SQL también elimina host (`content-scope/sql.ts:34–44`), coherentemente con el matcher.

Reproducción local del módulo real, TypeScript→VM, regla exacta `/viajar`:

| Entrada | Resultado observado |
|---|---|
| `https://blog.skyairline.com/viajar` | true |
| `https://www.skyairline.com/viajar` | true |
| `https://other.invalid/viajar` | true |
| Regla prefijo `/` | rechazada |
| `isContentScopeActive({rules:[]})` | false |

No es incidente de datos reales ni invalida Berel sobre su población original. Prueba que esa primitiva no
aísla host. Con scope null/vacío, el adapter usa población general y no sella scope.
El encargo obligatorio Blog debe bloquear scope ausente/borrado/ilegible. No cambiar globalmente el significado
legacy de reglas vacías sin una versión de contrato y regresión para otras organizaciones.

## 2. GA4 → hechos SEO: adquisición no equivale a actividad

`seo-adapter.ts:521–531` integra GA4 en SEO sólo con editorial v2. Llama `ga4-site-facts.ts:86–93` con
canales/fuente-medio, sesiones/engagedSessions y reglas de landing.
`growth/analytics-ga4/reader.ts:11–33,94–108` no admite hostName ni URL completa; filtra landingPagePlusQueryString.
Su constructor protege límites de prefijo, query y barra final (`:41–54`): conservarlo.

Google define landing como ruta del primer pageview, hostName como dominio/subdominio y pageLocation como URL
completa de la página visitada. **No hay evidencia suficiente para afirmar que concatenar hostName + landingPath
reconstruye el host de entrada en sesiones que navegan entre hosts.** Esa equivalencia requiere validación:
la documentación no la establece.
[Dimensiones GA4](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema).

| Indicador | Población necesaria |
|---|---|
| Adquisición orgánica al Blog | Sesiones cuyo primer pageview pertenece al Blog y canal de sesión Organic Search |
| Actividad dentro del Blog | Pageviews/engagement de páginas Blog; la sesión puede comenzar fuera |
| Sesiones con actividad Blog | Sesiones distintas con actividad Blog; no sumar sesiones por página para producir total único |

Ejercitar raíz→blog, blog→raíz y mismo path en ambos hosts. El reader puede extenderse para actividad por URL;
adquisición requiere señal verificable de host/URL de entrada. Stream exclusivo, dimensión instrumentada o
reconstrucción de eventos son alternativas a evaluar, **no disponibilidades comprobadas**. No asumir export
GA4 BigQuery existente ni historia retroactiva de un campo nuevo.
Compatibilidad técnica no prueba interpretación de negocio; no se consultó la API privada aquí.
[checkCompatibility](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/checkCompatibility).

### Calidad GA4 que no llega al sello

`reader.ts:111–123` pagina las filas declaradas y rechaza >100k o página vacía intermedia: protección real.
Pero `ga4/api-client.ts:113–118` sólo tipa filas/rowCount; el reader devuelve esos datos (`:125–130`).
`ga4-site-facts.ts:111–130` etiqueta coverage complete, asOf con hora de consulta y servedWindow solicitado;
`:142–158` reduce Organic Search y puede generar cero para una respuesta vacía.

Google entrega metadata de muestreo, thresholding, filas other, restricciones, zona horaria y razón de vacío.
Debe conservarse para decidir calidad. Thresholding no prueba por sí solo pérdida efectiva; tampoco permite
declarar completitud ignorando metadata. Vacío por restricción no es cero tráfico.
[ResponseMetaData](https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/ResponseMetaData).

Separar queriedAt de dataThrough, conservar calendario de propiedad y estados observed_zero/empty_unknown/
restricted/partial/unavailable. El encargo Blog define cuáles admite; HTTP 200 no basta.

## 3. GSC → materialización → KPI: días con filas no prueban totalidad

`gsc-daily-batch.ts:111–143` llama al materializador y conserva truncated en el outcome; puede espejar a BQ
lo escrito. `gsc-daily-materializer.ts:105–143` extrae query×page, pagina y escribe cada chunk por separado.
Si falla una página posterior, conserva filas y devuelve ok:true,truncated:true (`:114–123,159–169`).
No es correcto afirmar que el batch oculta siempre truncación: sí la registra en su respuesta.

El KPI `overview/read-overview-kpis.ts:180–225` suma por org/fecha/scope y obtiene coveredDays de series.length.
No consulta el outcome de extracción. `seo-adapter.ts:84–89` convierte ese cociente de días en coverage.
Con filas parciales en todos los días puede sellar complete aunque la extracción esté incompleta.
A la inversa, un día extraído sin filas no deja registro en esa tabla: el reader no distingue cero de falta de captura.

Google limita Search Analytics a filas principales; paginar no garantiza toda la población. Sus fechas son PT
y al agrupar por página agrega por URI canónica. No admite byProperty con filtro/page. Omitir dataState equivale
a final: no atribuir al materializador actual uso de datos fresh por omisión.
[Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

Consultas anonimizadas no aparecen en detalle y existen límites adicionales de filas. La suma query×page es
detalle observado, no automáticamente total Blog. Un control sin query, con igual población/agrupación, permite
cuantificar diferencias sin imputar consultas ocultas ni repartirlas por país.
[Dimensiones y límites GSC](https://support.google.com/webmasters/answer/17011259?hl=en).

**Ya hay una base reutilizable:** `organic-traffic-value/collect.ts:16–32` valida siteUrl/host y filtra página
por host; `:60–81` extrae control total, página y page×query×country, declarando top-rows/privacy.
Reutilizar ese criterio/readers dueños; no copiar extractor a Insights ni convertir valoración CPC en requisito.
No está conectado al KPI Insights actual. La tabla diaria no tiene country: no inventar un cruce de marginales.

## 4. Fuente, calendario y comparativo histórico

`search-console/reader.ts:43–71` resuelve una conexión por Organization en cada llamada.
`gsc-daily-materializer.ts:56–69` guarda site_url, pero key de upsert=org/día/query/page, sin siteUrl.
`overview/read-overview-kpis.ts:188–205` no filtra site_url. Introducir otra propiedad bajo la misma org puede
combinar poblaciones o sobrescribir procedencia de filas coincidentes. Es condición de riesgo del diseño,
**no constatación de propiedades mezcladas en SKY**.

Exigir conexión/extracción versionadas, property/siteUrl explícito, filtro por fuente/población y política de
sustitución. Recuperar www no debe sustituir la conexión Blog ni sumar extracciones solapadas como independientes.
Releer un día con menos filas tampoco retira filas antiguas del UPSERT actual: definir publicación de batches
completos o revisiones sin borrados retroactivos ad hoc.

Según skill SKY actualizada 01-11, acceso GSC documentado es subdominio Blog; historia www previa al cambio
26–27/09/2025 sigue pendiente. Contexto documental, **no acceso revalidado**. Comparativo que cruza migración
necesita mapping verificable de URLs/propiedades y vigencias. No ampliar scope vigente a todo www para rellenarlo.

Conservar calendario de origen (GA4 propiedad; GSC PT), zona de informe y reconciliación. Fechas iguales no
convierten sesiones en clics. Ventana servida, días capturados, extracción completa y población cubierta son
cuatro atributos separados.

Medir todo Blog no demuestra efecto causal de Efeonce. Inicio del servicio e intervenciones URL/fecha se
registran aparte: baseline previo, seguimiento y comparación estacional no reatribuyen desempeño antiguo al
nuevo servicio. AEO nativo sigue siendo tercera fuente obligatoria.

## Contrato mínimo compartido por A′/B

| Capa | Garantía a decidir |
|---|---|
| Encargo | Organization, Space/Service autorizados, scope version/hash, host exacto, paths y vigencias |
| Fuente | Producer, property/siteUrl, conexión/version, extraction/batch ID, método/version, población |
| Tiempo | Ventana solicitada/servida, calendario, queriedAt, dataThrough/finalidad, comparación compatible |
| Calidad | Capturas incluso cero, completitud extracción, límites proveedor, metadata, controles/cobertura |
| Métrica | Grano, denominador, deduplicación, sumabilidad, adquisición/actividad, null/zero/rechazo |
| Evidencia | Scope aplicado sellado; nunca reconstruido desde config actual al renderizar |
| Gate Blog | GA4 + GSC + AEO nativo válidos; allowPartial no elimina fuente obligatoria |

Hoy `commands/generation.ts:137–146` valida algún hecho por módulo, no cada productor/calidad.
GA4 y GSC comparten SEO: una fuente puede existir y otra faltar. Preview interna con límites es útil;
no presentarla como cumplimiento de las tres fuentes.

## Diez pruebas propuestas de integración — no ejecutadas aquí

Fixtures de proveedores sin tokens y PG efímero. Repetir en A′/B: resultado analítico idéntico, cambia
resolución/autorización de scope. Stubs no certifican semántica efectiva de Google.

| Caso | Preparación/acción | Resultado exigible |
|---|---|---|
| M1 | Mismo path blog/www/ajeno; case, slash, query, raíz | Sólo host autorizado; paridad TS/SQL/filtro; Berel intacto |
| M2 | www→blog, blog→www, dos páginas Blog, sin landing | Adquisición/actividad distintas; no doble conteo ni inferir desconocidos |
| M3 | GA4 thresholding/other/sampling/emptyReason/vacío válido | Metadata al sello; incertidumbre distinta de cero |
| M4 | GA4 página vacía antes de rowCount, error, >100k | Rechazo actual conservado, nunca parcial como completo |
| M5 | GSC primer chunk válido, segunda página fallida cada día | Parcial al sello; días con filas no bastan para complete |
| M6 | Día GSC vacío vs no ejecutado vs revocado | Estados persistidos diferentes; cero sólo con evidencia suficiente |
| M7 | Control page > detalle query×page×country; canonical fuera | Cobertura visible, sin extrapolar ni reasignar por URL visitada |
| M8 | Dos siteUrls solapadas, fila coincidente, replay con menos filas | Sin duplicar/perder procedencia; batch/revisión explícitos |
| M9 | Comparativo pre-migración, scopes y zonas distintos | Rechazo o segmentos explicados; no falso delta homogéneo |
| M10 | Sólo GSC, sólo GA4, AEO sólo referrals, scope eliminado, allowPartial | Blog no cumple; preview con faltantes, distribución bloqueada |

## Orden y límites del cierre

1. Contrato versionado con host y propósito; no configurar SKY con reglas v1 incompletas.
2. Metadata/recibos, controles GSC y fuente explícita; certificar M1–M10 con adapters reales.
3. Validar adquisición GA4 en entorno controlado y luego propiedad efectiva bajo acceso autorizado.
   Si falta host de entrada fiable, declarar limitación; no renombrar actividad como adquisición.
4. Binding Servicio/informe y autoridad departamental antes de biblioteca/distribución externa.

TASK-2033 sigue in-progress (scope org/ruta); TASK-1960 to-do (informe por Servicio). Reutilizar sus owners.
El delta «SKY sin GSC» de TASK-1960 fechado 02-10 es historia; no desplaza evidencia posterior.
No se verificó despliegue actual de los slices.

Rollback: contrato versionado, ediciones originales intactas, nunca downgrade a sitio completo ante error;
conservar raw/recibos y selección de batch. Medición interna no exige otro client/Space.
Esta auditoría no acredita conexión actual, cobertura noviembre ni integración aprobada.
