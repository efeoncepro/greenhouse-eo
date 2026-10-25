# Blog efeoncepro.com — Refresh tanda 1: propuesta por artículo (V1)

> **Estado:** propuesta para revisión de Julio. No hay borradores ni cambios en WordPress.
> **Creado:** 2026-10-24 · sesión «Mejora de artículos del blog».
> **Insumos:** lectura completa de cada artículo en vivo (4 subagentes, una lectura por artículo/par) +
> Search Console y GA4 de la sesión «Análisis de Analytics y Search Console» (ventanas 2026-07-26 → 10-23 vs
> 2026-04-27 → 07-25) + Semrush CL/MX (2026-10-24) + diagnóstico de la caída del blog (misma sesión).
> **Marcas:** **[V]** verificado en el artículo, en su HTML o en la fuente; **[I]** inferencia.

## 0. Lo que tienen en común (y por qué importa)

La caída del blog es de −26 % en impresiones contra −4 % en landings. Su primer escalón coincide con la core update
de mayo de 2026 y no es técnica (diagnóstico de analytics). Leídos a fondo, los cuatro artículos comparten el mismo
patrón:

| Patrón | Dónde | Marca |
|---|---|---|
| Cifras y citas sin fuente, o atribuidas a una página que no las contiene | Los cuatro; peor en SEO/AEO (5 citas textuales de Fishkin, Sullivan y Forrester sin fuente) y en Loop (~25 cifras sin enlace; «11x», «40 %», «63 %», «CAC −33 %» que no están en la página citada) | [V] |
| Enlaces con `?utm_source=chatgpt.com` | ICP, SEO/AEO y Loop (5) | [V] |
| Emojis en H2/H3, «👉», puentes «Ahora bien…», dos cierres que repiten | Los cuatro (ICP: 21 «👉») | [V] |
| Ejemplos o datos que contradicen el propio texto | RUT: el «RUT válido 12345678K» es inválido (el DV es 5). ICP: el «ejemplo de ICP» es una persona | [V] |
| Sin experiencia propia: ningún dato, caso ni medición de Efeonce | Los cuatro | [V] |

**Lectura [I]:** es el perfil de contenido que una core update castiga (útil en apariencia, sin evidencia ni
experiencia). Por eso el refresh no puede ser de snippet: cada artículo necesita un **claim ledger** (toda cifra
con fuente primaria o fuera), limpieza de forma y al menos un aporte propio. Ningún refresh garantiza revertir una
caída que es pareja en todo el blog.

## 1. Formato y validación del RUT (`/hubspot/como-crear-formularios-con-validacion-de-rut/`)

> **Decisión de Julio (2026-10-25):** el artículo se queda en **validar el RUT en formularios de HubSpot**. Se
> descartó abrirlo al formato del RUT en Excel: trae una audiencia que no es la del artículo, que existe para mostrar
> experiencia en HubSpot. Se acepta perder parte de las impresiones por «formato rut». Borrador vigente:
> [`RUT_FORMATO_VALIDACION_REFRESH_DRAFT_V1.md`](RUT_FORMATO_VALIDACION_REFRESH_DRAFT_V1.md).

**Qué es hoy:** un tutorial de unas 600 palabras de 2024, sin imágenes. El código de validación (módulo 11) es
correcto, probado en 400 000 casos [V], pero el artículo tiene cuatro problemas:

- **El ejemplo canónico es un RUT inválido** [V]. Muestra «12.345.678-K» como formato y lo da por válido en las
  pruebas, pero el DV de 12.345.678 es **5**. Es justo lo que extraería un snippet o una IA.
- **Promete «cumplir normativas»** tres veces, sin decir cuál ni tener sustento [V]. Además, la Ley 21.719
  (protección de datos) apunta a lo contrario: pedir solo lo necesario.
- **Integración con HubSpot vencida** [V, en la documentación]:
  - la técnica del artículo exige formulario legacy en raw HTML, que solo existe en planes Pro/Enterprise, y no lo
    advierte;
  - no sirve para los formularios nuevos de HubSpot;
  - falta `.change()`, así que HubSpot no registra el valor;
  - el botón bloqueado impide enviar el formulario si el campo viene autocompletado.
- **Rankea por «formato rut chile / en excel»** (posiciones 4–7) y nunca menciona Excel [V].

**Propuesta:** un solo artículo, «el RUT bien escrito, de Excel al CRM». Se mantiene el slug.

1. ¿Cuál es el formato del RUT chileno? (cápsula: cuerpo + guion + DV 0–9 o K; ejemplo 12.345.678-5; RUT vs RUN)
2. ¿Cómo se calcula el dígito verificador? (tabla paso a paso con 12.345.678)
3. ¿Cómo dar formato y validar el RUT en Excel? (SUSTITUIR / TEXTO / SUMAPRODUCTO; el caso de la K)
4. ¿Cómo validarlo en un formulario web? (función corregida: acepta RUT bajo el millón, valida al salir del campo, accesible)
5. ¿Cómo validarlo en HubSpot? (formularios nuevos: regex en la propiedad; legacy: `onFormReady` + `.change()`; plan requerido en cada caso)
6. ¿Cómo evitar RUT duplicados en el CRM? (propiedad con valores únicos; contacto vs empresa)
7. ¿Conviene pedir el RUT en un formulario? (minimización, Ley 21.719; solo para cotización o facturación)
8. Preguntas frecuentes

- **Title:** «Formato del RUT chileno: cómo validarlo en Excel y HubSpot | Efeonce».
- **Antes de publicar:** probar el código en un portal real (legacy y nuevo) y las fórmulas en un Excel en es-CL.

## 2. Cliente ideal B2B: ICP (`/growth/cliente-ideal-b2b-icp-buyer-persona-ipp-jtbd/`)

**Qué es hoy:** un ensayo de marco conceptual de 3.900 palabras, no una guía. Tiene cinco problemas:

- **La definición llega tarde** [V]: el ICP se define recién tras ~560 palabras, y primero en negativo.
- **El «ejemplo de ICP» es una persona («Edward»)** [V], lo mismo que el artículo critica.
- **Faltan ejemplos de cuentas y plantilla** [V], justo lo que buscan «icp b2b ejemplos» y «plantilla icp».
- **«IPP» se presenta como término estándar** [V]: es nombre propio y choca con la doctrina de la casa. En el modelo
  de cliente de Efeonce, el *champion* se prueba por lo que hace dentro de la cuenta, no por condiciones del rol.
- **Otras fallas** [V]:
  - JTBD sin atribuir a Christensen ni a Ulwick;
  - las cifras de Trustmary están distorsionadas y llevan utm de ChatGPT;
  - la comparación ICP vs buyer persona son dos viñetas;
  - no hay ninguna imagen;
  - el title no coincide con el H1.

**Propuesta:** el eje pasa a «ICP B2B: qué es, ejemplos y plantilla». Buyer persona, IPP (champion) y JTBD quedan
como capas sobre **una misma cuenta**, que recorre todo el artículo. Se mantiene el slug, porque topic clusters lo
enlaza.

1. ¿Qué es un ICP en B2B? (cápsula + qué no es)
2. ICP vs buyer persona (tabla: unidad, pregunta que responde, datos de origen, quién lo usa, dónde vive en el CRM, cómo se valida, error típico)
3. Ejemplos de ICP B2B (tres cuentas redactadas, con trigger, señales y anti-ICP)
4. Plantilla de ICP (campos y scorecard 0–3, abierta y copiable)
5. Cómo definirlo en 5 pasos, desde tus mejores y peores clientes
6. Buyer personas y buying group: quién decide
7. A quién convencer primero: el champion («lo que en Efeonce llamamos IPP»)
8. Jobs to Be Done: por qué compra (atribuido)
9. Cómo llevarlo a HubSpot (propiedades en empresa, contacto y negocio; fit vs engagement)
10. Checklist y preguntas frecuentes

- **Title:** «ICP B2B: qué es, ejemplos y plantilla para definir tu cliente ideal | Efeonce».
- **Decisión de Julio:** si uno de los ejemplos puede ser el ICP real de Efeonce.

## 3. SEO y AEO (`/loop-marketing/seo-aeo-optimizacion-ia-2025/`)

**Qué es hoy:** 3.200 palabras con la mejor señal de IA del blog (18 visitas en 12 meses, sobre todo desde
Perplexity) y los errores más serios. Los siete principales:

- **Consejo técnico equivocado** [V]. Dice que permitir Google-Extended o CCBot da visibilidad en las respuestas de
  IA. Según la documentación de Google, Google-Extended no afecta tu inclusión en Search; lo que cuenta son los bots
  de búsqueda de cada IA.
- **Recomienda schema FAQ/HowTo para que la IA te entienda** [V]. Google dice que no hace falta schema especial.
- **Datos vencidos:** cita «GPT-5» cuatro veces [V], menciona Neeva (cerró en 2023) [I] y afirma un convenio
  OpenAI–Reuters que no se pudo verificar [I].
- **Cinco citas textuales de expertos sin fuente** [V; I sobre si existen].
- **«Tres caminos»** [V]: presenta como segmentos tres porcentajes que suman 130 %.
- **Casos de marcas sin medición.**
- **El enlace al «AI Search Grader» lleva a la página de Loop Marketing** [V].

**Propuesta:** no fusionar. Esta URL pasa a ser la **pilar editorial de AEO** (qué es, cómo elige fuentes cada
motor, qué cambia en tu sitio, cómo escribir para ser citado, cómo medirlo). Les deja su territorio a donde-cita-la-ia,
web agéntica, topic clusters y surround discovery, y se enlaza con todos.

- Se conservan, corregidos, los tres pasajes que probablemente cita Perplexity: el glosario AEO/GEO, las fichas
  por motor y las cifras con fuente nombrada.
- Se elimina todo lo listado arriba.
- **Aporte propio:** un panel fechado de 10 prompts B2B en español de Chile en cuatro motores. Si no se corre, esa
  sección no se publica.
- **Title:** «SEO y AEO: cómo aparecer en Google y en las respuestas de IA | Efeonce», sin año.
- **Decisión de Julio — slug:** el subagente recomienda `/aeo/seo-y-aeo/` con 301, porque hay poco en juego (141
  impresiones, 0 clics) y el breadcrumb ya dice AEO. La alternativa es mantener la URL con «2025». Hay que actualizar
  el enlace desde topic clusters.

## 4. Loop Marketing: «Qué es» (248398) + «Cómo aplicar» (248483)

**Qué son hoy:** dos posts de 4.100 palabras que se repiten [V]:

- el funnel ha muerto, tres veces en el cluster;
- las 4S, con asignaciones a etapas que se contradicen entre los dos posts;
- human-in-the-loop dos veces;
- «días/horas, no trimestres».

Fallas de cada uno [V]:

- **«Qué es»** nunca presenta las cuatro etapas como etapas.
- **«Cómo aplicar»** dice que no va a definir, pero define, y no da pasos de aplicación.
- **Ninguno usa los nombres de HubSpot en español** (Definición, Adaptación, Amplificación, Optimización), que
  calzan con las consultas ganadas y perdidas.
- **El «4,4 veces» por el que rankeaban no aparece en ninguno.** Según el subagente es de Semrush (valor del
  tráfico desde IA) y no de Loop [I].
- **Atribuciones a HubSpot que no están en la página enlazada.** Hay enlaces 404, enlaces con utm de ChatGPT y
  schema TechArticle en «Qué es».

**Propuesta: fusionar «Cómo aplicar» en «Qué es» con 301.** Razones:

- «Cómo aplicar» tiene 0 clics en las dos ventanas;
- lo único que aporta (las etapas) es lo que le falta a «Qué es»;
- el «cómo» técnico ya lo cubre «Ejecutar con HubSpot» y Express tiene su post;
- con ~70 búsquedas al mes en México, dos URLs para la misma intención solo diluyen.

«Qué es» queda como pilar del cluster (~2.200 palabras):

1. ¿Qué es Loop Marketing? (cápsula; nombres en inglés y en español)
2. Las 4 etapas (un H3 por etapa; Express enlaza a su post; en Amplify, el 4,4x bien atribuido)
3. Frente a inbound, funnel y flywheel (tabla)
4. Las 4S («En Efeonce lo leemos así»: es lectura propia, no de HubSpot)
5. Qué cambia en CAC, LTV y payback (ejemplo marcado como hipotético)
6. Dónde decide una persona
7. Por dónde empezar (enlace a «Ejecutar con HubSpot»)
8. Preguntas frecuentes

- **Title:** «Qué es Loop Marketing: las 4 etapas del framework de HubSpot | Efeonce».
- **Además:** «Ejecutar con HubSpot» reduce su «qué es» a un párrafo con enlace al pilar.
- **Decisión de Julio:** si se aprueba la fusión con 301.

## 5. Medición

Por URL, en Search Console a 6–8 semanas de publicar: impresiones, posición y CTR del conjunto de consultas del
tema, contra la ventana previa. En SEO/AEO, además, visitas desde IA en GA4 y el panel de prompts repetido a 90 días.
Las muestras son chicas (RUT: 7 entradas; ICP: 5 clics), así que la lectura a 28 días va a ser ruidosa.

## 6. Pendientes de verificar antes de redactar

- La SERP real de «icp b2b», «formato rut chile» y «formato rut en excel», incluidos los AI Overviews.
- Las fuentes primarias de cada cifra que se conserve: Gartner 6–10 personas, BCG 4S y Semrush 4,4x.
- El código RUT en un portal HubSpot real y las fórmulas en Excel es-CL.
- Los perfiles «cesargrowth» del bloque de autor: una lectura cree que no son de Julio y la otra que sí. Lo confirma Julio.
