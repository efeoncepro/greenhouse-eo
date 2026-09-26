# Demanda para las landings de equipos humano-agente y plataformas — 2026-09-19

## Decisión

Mantener `TASK-1877` en `EPIC-047-03` por el servicio aprobado y probado, su utilidad como destino de venta y la
necesidad de explicar la transformación transversal. **No justificar ese rango con demanda orgánica del nombre
«equipos humano-agente»**: la categoría aún no aparece como término utilizable en esta muestra. El primer fold debe
nombrar el trabajo y el resultado que el comprador reconoce; el método humano-agente explica cómo se entrega.
HubSpot y Salesforce conservan páginas de intención por plataforma; marketing/AEO es otra puerta de entrada, no
una obligación de pasar por RevOps.

## Fuentes, alcance y límites

- **◑ Mercado estimado:** seis corridas gobernadas de DataForSEO Labs `keyword_suggestions` + `related_keywords`,
  target propio `efeoncepro.com`, Chile (`2152`), español, 24 seeds en seis paneles. Todas terminaron
  `succeeded`, ocho llamadas por panel, 122 candidatos mostrados **antes de descontar repeticiones entre paneles**;
  la lectura completa de cada run no dejó `nextCursor`. Costo real conjunto: **USD 0,5922**. Volúmenes son
  estimaciones mensuales redondeadas; CPC es histórico estimado y `competition` mide competencia de anuncios,
  **no dificultad SEO ni forecast de Google Ads**. El `linkBarrier` fue `unknown` en casi todos los términos;
  no inferir facilidad orgánica.
- **● Exposición propia medida:** `greenhouse_growth.seo_gsc_daily`, organización de Efeonce, consulta de 90 días
  con cobertura efectiva **2026-08-03 a 2026-09-15 (43 días, 8.203 impresiones)**. La tabla guarda query × page
  sin filtro país; no presentar sus impresiones como volumen Chile ni sumar sus grupos como total sin solapamiento.
  La ausencia de una consulta sólo significa que el sitio no registró exposición en esa ventana, no demanda cero.
- Las dos lentes contestan preguntas diferentes: GSC ayuda a **mejorar URLs ya expuestas**; Labs ayuda a
  explorar **intenciones aún no cubiertas**. No se suman ni se promedian. El panel tampoco mide demanda futura,
  prompts en asistentes de IA, fit del ICP, pipeline ni retorno de paid.

## Lectura de mercado ◑ — Chile/español

| Consulta exacta | Búsquedas/mes estimadas | Intención del proveedor | Lectura para Efeonce |
| --- | ---: | --- | --- |
| `automatización de procesos` | 320 | informacional | Puerta amplia, pero mezcla software, industria y educación; validar SERP antes de usarla como target de servicio. |
| `automatización de procesos con ia` | 30 | informacional | Puente más próximo al problema que resuelve la landing transversal. |
| `agentes ia para empresas` | 10 | navegacional | Señal incipiente; no asumir compra B2B por la etiqueta automática. |
| `marketing con inteligencia artificial` | 10 | comercial | Puede abrir la ruta CMO; no reducirla a herramientas o cursos. |
| `automatización de marketing` | 10 | comercial | Intención de capability distinta de la transformación completa. |
| `agencia aeo` | 10 | navegacional | Señal emergente; no tomar la etiqueta de intención como veredicto comercial. |
| `salesforce agentforce` | 20 | navegacional | Interés por producto; CPC histórico estimado USD 55,88: cautela en paid, no forecast. |
| `consultor salesforce` | 20 | comercial | Mejor señal de búsqueda de servicio que el nombre Agentforce. |
| `partner hubspot` | 10 | navegacional | Variantes del panel apuntan también al programa, certificación y directorio; filtrar intención antes de pautar. |
| `agencia inbound marketing chile` | 20 | comercial | Lenguaje de servicio establecido; su landing existente requiere diagnóstico de rendimiento. |

`equipos humano-agente`, `agentes ia hubspot`, `consultoría hubspot`, `implementación salesforce` y otras seeds
no devolvieron candidatos útiles en estas corridas. **No registrar volumen `0` para ellas**: sin candidato o
valor `null` no es una medición de demanda cero. Las variantes de cursos/diplomados y la automatización industrial
son ruido para la oferta de servicios; no agregarlas para inflar un cluster.

## Exposición propia ● — no equivale al mercado Chile

Filtro `ILIKE` sobre query; los grupos pueden compartir consultas. En la ventana efectiva:

| Familia | Impresiones | Clics | Interpretación acotada |
| --- | ---: | ---: | --- |
| `inbound marketing` | 4.224 | 0 | La exposición existe; aún no prueba captación. Diagnosticar query × URL × país × posición/CTR antes de reescribir o pautar. |
| `aeo` | 98 | 0 | Exposición inicial, no volumen de mercado ni conversión. |
| `loop marketing` | 85 | 1 | Señal editorial pequeña; no extrapolar. |
| `hubspot` | 33 | 0 | Cobertura propia incipiente. |
| `automatiz` | 11 | 0 | El sitio aún no captura esta familia. |
| `agent` | 2 | 0 | No permite concluir nada sobre demanda futura. |
| `salesforce` | 0 | 0 | Cero exposición propia registrada, no cero búsquedas. |

Las URLs con mayor exposición de inbound fueron `/inbound/que-es-inbound-marketing/` (2.201 impresiones) y
`/agencia-inbound-marketing/` (2.003), ambas con cero clics en esta ventana. El siguiente análisis debe verificar
posición, snippet, país, dispositivo y canibalización por consulta; **no** atribuir los cero clics a una causa
concreta sin esa lectura. Labs CL y GSC sin filtro país/ventana idéntica **no son comparables en magnitud**.

## Implicaciones ejecutables

1. **TASK-1877:** usar la landing transversal como explicación y conversión del servicio probado. Dos entradas por
   job —operación/revenue/servicio y marketing— con problema, límites de autoridad, ejemplo y CTA de fit. SEO
   puede cubrir preguntas sobre automatización con IA, pero el hero no se redacta como una lista de keywords.
2. **TASK-1878:** enlazar desde Home, HubSpot y AEO sólo tras URL/CTA verificados. Probar copy contextual por
   origen; medir sesiones, leads cualificados y siguiente paso por ruta, no sólo clics al enlace. La página de
   inbound con exposición propia es un candidato adicional a evaluar por su task/owner, **no una autorización
   para editarla en TASK-1878**.
3. **TASK-1403 / TASK-1812:** mantener intenciones por plataforma y vincular al método neutral cuando el job lo
   pida. Para Salesforce, validar la SERP de `consultor salesforce`; para HubSpot, separar servicio de búsquedas
   de directorio/certificación. Ningún volumen nuevo justifica una página adicional de agente Salesforce.
4. **Paid:** sólo experimentos acotados por intención y landing/receipt medidos; separar términos de problema,
   proveedor, navegación y formación. No asignar presupuesto, CPC esperado, CAC ni ROI desde Labs. Un forecast
   requiere herramienta de Ads del ciclo actual y/o campaña piloto; aprobar gasto y tracking por canal.
5. **Revisión:** después de publicar, comparar ventanas homogéneas de GSC y conversiones por landing/canal;
   contrastar nuevos términos de agentes en Chile y los mercados prioritarios antes de cambiar el ranking.

## Trazabilidad de corridas

| Panel | Run ID | Costo USD | Candidatos leídos |
| --- | --- | ---: | ---: |
| Transformación transversal | `seokdr-1f132f41-bda2-4f07-a307-3622752e39c0` | 0,09648 | 2 |
| Plataformas y marketing | `seokdr-a06643d7-20f9-436b-bdf1-9e3df6038733` | 0,09816 | 15 |
| Servicios base | `seokdr-5620ecfb-daab-490f-be8f-9ea7440bf664` | 0,10116 | 40 |
| Especialidades | `seokdr-ed665bd1-6d90-4051-857d-a1c1c5504a3b` | 0,09960 | 28 |
| Partners y plataformas | `seokdr-824ecb5d-6222-41ff-bee8-b9c275e18dc3` | 0,10020 | 33 |
| AEO e inbound | `seokdr-1abf00dd-9758-436c-ab92-2e50a1693212` | 0,09660 | 4 |

Los run IDs resuelven a los lectores canónicos de Keyword Discovery en Greenhouse. No son URLs públicas ni
autorización para repetir una corrida pagada.
