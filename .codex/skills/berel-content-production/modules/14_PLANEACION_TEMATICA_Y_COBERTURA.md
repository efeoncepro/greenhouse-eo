# Planeación temática y cobertura capilar de Berel

Antes de proponer un artículo o minar keywords, cargar
[la estrategia editorial](../../../../docs/operations/BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md).
Es la copia operativa de la decisión del operador registrada en el Playbook vivo; no cambia la
precedencia de pedidos del cliente ni autoriza publicación.

1. Fortalecer elección/planeación, protección/mantenimiento y preparación/aplicación, en ese orden.
   Mantener color y paletas como identidad. No llenar efemérides por cuota ni priorizar por vacío.
2. Clasificar una categoría principal por intención del cuerpo; espacio, superficie y Formato van aparte.
3. Leer el corpus completo, incluidas reescrituras futuras, y contrastarlo con URLs propias fuera del
   Hub: el inventario de Notion no agota el sitio público. V1 e híbrido son una pieza. Fecha editorial,
   entrega real, estado Notion y URL pública son hechos distintos.
4. Minar por problema y decisión del lector en México/español, con dataforseo-operator y seo-aeo.
   Search Console de berel.com es **MEDIDO** y manda sobre cualquier estimación: leerlo con el reader canónico
   `readSearchConsoleAnalytics` (16 meses; la serie propia `seo_gsc_daily` existe sólo desde 2026-07-31) y
   cruzarlo con Semrush base `mx` (ESTIMADO) para demanda y SERP. Receta y límites: [auditoría 2026-09-16](../../../../docs/audits/seo/BEREL_COLORES_DE_TEMPORADA_2027_2026-09-16.md) §5.
   Gasto presupuestado por conjunto, transportes/gates canónicos y sin seguimiento recurrente automático.
5. Etiquetar cada cluster cubierto/parcial/nuevo candidato/fuera de foco/bloqueado técnico con página
   y sección propia. Rodillo, resane, limpieza de paredes y tablaroca no son vacíos por defecto.
6. Proponer artículo, ampliación, consolidación, FAQ o ficha según intención y SERP. Capilaridad significa
   resolver necesidades y conectarlas; no una URL por variante, habitación o pregunta.
7. Las preguntas PAA son observaciones de Google. Las preguntas redactadas por el agente son hipótesis
   de research, no prompts medidos ni consultas observadas en ChatGPT.
8. Documentar huecos no investigados, presupuesto/fecha/fuente y respaldo técnico pendiente. Nunca prometer
   cobertura total desde un top-N, volumen cero desde NULL ni aprobación desde una recomendación.
9. No cambiar slots, fechas, responsables, tracking, taxonomía CMS o estado editorial durante discovery.

10. Antes de producción social, completar la matriz del [módulo 15](15_DISTRIBUCION_SELECTIVA.md):
    no asumir cuatro derivados. Repartir capacidad mensual por utilidad y encaje, sin alterar formatos.
    Para enero, febrero y marzo de 2027, planear con el cupo reducido mientras Berel no diga otra cosa: 6 / 7 / 7
    artículos y 35 gráficas por mes, sin videos en el cupo. Estimado pendiente de aceptación y de confirmar al cierre
    de diciembre; ver el balance en el módulo 15.

## Research por URL: mercado e intención de Berel

Para enriquecer una URL propia, cargar `dataforseo-operator` y usar la CLI gobernada `site-keywords` o
`quick keywords-for-site`; contrato en `.claude/skills/dataforseo-operator/references/02-labs.md` §2.1a.
Verificar organización de Berel, URL y mercado antes del preview: `--market MX --locale es-MX` resuelve
México (`2484`) y `language_code:es`. Otro mercado sólo sirve como comparación declarada y separada.
Confirmar propiedad del target: no adjudicar `berelmexico.com` a `berel.com` por semejanza de hostname.

La [prueba live del 30/09](../../../../docs/audits/seo/2026-09-30-task-1948-site-keywords-cli-verification.md)
validó filas, paginación y resume por URL mexicana. No reutilizar sus cifras como baseline mensual: conservar
fecha/source/raw y refrescar cuando corresponda al plan autorizado. El caso chileno de cero filas no demuestra
falta de demanda mexicana. Scope coincidente no valida pertinencia: aparecieron bancos, hoteles y otras tiendas
junto con consultas de pinturas y de Berel; registrar selección/exclusión sin borrar la evidencia adquirida.

Separar dos decisiones del lector: comparativas de marcas/desempeño (la SERP de «mejor pinturería de México»
mostró esa intención) y localización de una tienda («pinturas cerca de mí», variantes de Berel/ciudad).
Las segundas pueden conducir a mejorar el localizador/fichas, no necesariamente a escribir una comparativa.
Una captura no elige objetivamente la mejor pinturería ni prueba ranking de la URL consultada en Labs.

Cruzar candidatas con corpus, GSC y canibalización, etiquetar relación propia/genérica/otra marca/ruido y
proponer sólo lo pertinente. Volumen/CPC/competencia son estimaciones Ads; `totalCount` del proveedor no es
cantidad de keywords exclusivas de Berel ni demanda propia. Mantener cobertura parcial explícita y presupuesto
acotado; no ampliar páginas automáticamente por un total grande ni mover slots, CMS o publicación durante research.

## 🔴 Research con tres fuentes antes del plan editorial (2026-11-04)

El `🧭 Plan editorial y SEO` de un artículo nuevo se escribe **después** del research, nunca reciclando el de
otra pieza o de otro mes. *Caso Umbral Vivo (2026-11-04):* el plan se había redactado sobre research viejo y el
operador lo detectó con una pregunta: «¿no hiciste research con Semrush, DataForSEO y Search Console?». El plan
se rehízo con las tres fuentes. Receta que funcionó, con la etiqueta de cada dato:

| Fuente | Cómo se leyó | Etiqueta | Peso |
|---|---|---|---|
| Search Console de berel.com | `greenhouse_growth.seo_gsc_daily` filtrado por la organización del `seo_targets` `seot-berel-fase0` (serie propia desde 2026-07-31; para 16 meses, el reader `readSearchConsoleAnalytics`) | **MEDIDO** | Manda sobre cualquier estimación |
| Semrush base `mx` | `phrase_these` con volumen + KD + intención para la lista de candidatas | **ESTIMADO** | Dimensiona demanda y dificultad |
| DataForSEO | `pnpm dataforseo -- serp-compare --panel panel.json`: primero `--dry-run`, después `--max-usd <tope> --yes`. Google México, móvil, profundidad 20, con AI Overview; Berel frente a Comex y Sherwin-Williams. Seis consultas costaron ~USD 0,05 | **OBSERVADO** | Muestra quién ocupa la SERP y a quién cita el AI Overview en la fecha de la captura |

Además, antes de fijar el ángulo:

- leer en vivo los artículos vecinos desde `sitemap-articulos.xml` para descartar canibalización (el inventario
  de Notion no agota el sitio);
- documentar el research en un toggle hermano `📈 Research` con estas secciones: **fuentes · demanda medida ·
  demanda estimada · competencia observada · artículos vecinos · arquitectura de palabras clave ·
  implicaciones · límites**. Plantilla: [`../templates/plan-editorial-y-seo.md`](../templates/plan-editorial-y-seo.md#toggle-hermano--research).

Una cifra de una fuente nunca se presenta con la etiqueta de otra: un volumen Semrush no es demanda medida y una
captura de SERP no es un ranking estable.

### Elegir el ángulo con datos — caso «Color a la Mexicana» (2026-11-04)

El artículo debía conectar con la promoción navideña de Berel. Los datos decidieron el ángulo, no la efeméride:

- **GSC (MEDIDO):** «pintura blanca berel» sumaba ~12.453 impresiones en tres meses en berel.com y ningún
  artículo respondía esa demanda.
- **Semrush mx (ESTIMADO):** «colores mexicanos» 2.400; «colores que combinan con blanco» 720 con KD 15.
- **SERP (OBSERVADO):** dominada por Pinterest y TikTok, sin ninguna marca de pintura; el AI Overview de
  «colores mexicanos para pintar casa» ya citaba berel.com.
- **Navidad:** 5 impresiones en GSC. Con ese dato no se persigue la keyword estacional; la promoción se conecta
  desde un ángulo evergreen (módulo 03, § Artículo conectado a una promoción).

Resultado: «colores mexicanos con blanco», que responde la demanda de blanco medida y la del cluster estimado.

### Reescritura evergreen: leer lo que la URL ya gana — caso Rayados N52 (2026-11-05)

Para reescribir una pieza temporal, el research empieza por las consultas que su URL **ya** recibe:

- **GSC (MEDIDO):** la URL del aniversario aparecía en posición 6–7 para «colores de rayados» y «cuáles son los
  colores del club de fútbol monterrey», con cero clics: el title hablaba de 79 años y no de colores. El ángulo
  evergreen salió de ahí.
- **Semrush mx (ESTIMADO):** las consultas de historia del club tienen volumen mínimo. «escudo de rayados» (2.900)
  no se persiguió por derechos de uso del escudo.
- **SERP DataForSEO (OBSERVADO):** el AI Overview cita rayados.com y ninguna marca de pintura ocupa la SERP.

Las fechas del cuerpo se verificaron en las páginas oficiales del club (historia y «Nuestras Rayas») el 2026-11-05:
fundación el 28 de junio de 1945 (acta); debut el 19 de agosto de 1945 en el Parque Cuauhtémoc, 1-0 frente a San
Sebastián de León; el equipo desaparece en 1946 y renace en 1952; las rayas se aprueban el 10 de junio de 1952
(jersey de rayas verticales azul y blanco, short azul) y el apodo nace ese año; azul rey desde 1952 y azul marino
desde 1983. El club califica de incorrecta la versión de las rayas «desde 1961-62». Releer la fuente antes de
reutilizar. Reglas de la reescritura: módulo 03, § De pieza temporal a evergreen.

El baseline fechado y las 49 asignaciones están en
[la auditoría](../../../../docs/audits/seo/BEREL_EDITORIAL_COVERAGE_2026-09-02.md); refrescar antes de producir.
