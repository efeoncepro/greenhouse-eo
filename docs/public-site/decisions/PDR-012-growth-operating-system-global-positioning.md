# PDR-012 — Jerarquía de posicionamiento global: plataforma, partner, ASaaS y Growth OS

Estado: **Accepted**  
Fecha: 2026-07-09  
Superficie: Home, About Us, sitio publico, Think, landings de categoria y narrativa comercial  
Owner: Efeonce / Greenhouse

## Contexto

El Why canonico de Efeonce quedo fijado en `docs/context/09_marca-agencia.md`: **No te entregamos crecimiento. Lo construimos contigo, y te dejamos mas capaz de sostenerlo.**

La ambicion declarada es llevar Efeonce a ser una agencia grande y reconocida en toda LATAM desde el inicio, sin limitar la categoria a LATAM: el sistema debe poder atender diversos mercados y crecer hacia el mundo.

El mercado tambien se mueve hacia este problema: agencias presionadas por IA/plataformas, clientes pidiendo ROI medible y modelos de agencia que migran de proveedor de ejecucion a socio estrategico/sistema de crecimiento. En ese contexto, decir "partner", "co-creacion" o "AI agency" sin mecanismo no diferencia.

## Decision

Efeonce se posiciona en cuatro capas: **AI-enabled marketing and growth services platform** como categoría de compañía; **Integrated Growth Partner** como lenguaje comercial; **ASaaS (Agency Service as a Software)** como modelo de delivery y monetización; y **Growth Operating System** como visión de largo plazo. No somos una AI agency ni un proveedor de servicios sueltos. "Agencia de marketing digital" puede usarse como término de captura SEO, no como categoría estratégica.

La formulacion base:

> **Efeonce es una plataforma de servicios de marketing y crecimiento habilitada por IA: estrategia, creatividad, medios, datos y software propio trabajando como una sola operación.**

Transcreacion inglesa para superficies globales:

> **Efeonce is an AI-enabled marketing and growth services platform for ambitious brands — an integrated growth partner building toward a Growth Operating System.**

La tesis de diferenciacion:

> El diferencial no es "co-creacion" como claim. Es co-creacion convertida en software, metodo, datos y memoria acumulada.

LATAM es punto de partida y prueba de ejecucion multi-pais, no techo de la marca. La narrativa publica debe ser **LATAM-first, global-ready**.

## Precisión de cobertura — 2026-08-31

El operador confirma que Efeonce ya opera en Estados Unidos. La cobertura vigente es Chile, Estados Unidos,
Colombia, México y Perú, gobernada por `docs/context/01_quienes-somos.md` y el export existente
`EFEONCE_OPERATING_MARKETS` de `src/config/efeonce-brand.ts`. Esto precisa el estado comercial, sin cambiar
la tesis LATAM-first ni acreditar oficina, entidad legal o cumplimiento local en Estados Unidos.
Las métricas históricas de clientes y casos mantienen su alcance original; no se amplían por inferencia.
La actualización documental no equivale a publicación de los consumidores WordPress.

## Aplicacion al Home

La Home es la superficie donde este posicionamiento se prueba primero. Debe responder en el primer recorrido:

1. **Qué es Efeonce:** una plataforma de servicios de marketing y crecimiento habilitada por IA, expresada comercialmente como un Integrated Growth Partner; opera bajo ASaaS y construye hacia un Growth Operating System.
2. **Que problema resuelve:** la fragmentacion entre estrategia, creatividad, medios, datos, CRM/web y aprendizaje.
3. **Como lo hace real:** operacion integrada + software propio + datos + metodo + memoria acumulada.
4. **Por que creer:** casos citables, resultados verificables, `120+` empresas, `80%` renovacion, presencia multi-pais, HubSpot/Kortex/Greenhouse/Verk solo cuando el contexto lo justifique como prueba.
5. **Que hago despues:** agenda una reunion, toma un diagnostico/Grader o entra a una spoke de servicio.

La Home no debe sonar a manifiesto abstracto ni a catálogo de servicios. El arco correcto es:

```text
No somos otra agencia de marketing digital.
Somos el partner integrado donde estrategia, creatividad, medios, datos y software trabajan como una sola operación.
Por eso el crecimiento se construye contigo, se ve en vivo y se acumula ciclo a ciclo.
```

El Why puede aparecer como tension o remate, pero no debe quedar solo. Siempre debe ir unido a mecanismo: login/visibilidad, grader/tool, dato, ciclo, contenido, red o historial.

## Reglas duras

- No abrir con "agencia integral", "agencia 360", "AI agency" ni "partner estrategico" sin mecanismo.
- No abrir con creatividad/marcas/contenido como si fueran la categoria completa. Son capabilities del sistema, no el sistema.
- Si se usa "co-creacion", debe ir pegada a prueba: Greenhouse, login vivo, grader, ICO, Revenue Enabled, Loop, Kortex, Verk o historial acumulado.
- No vender LATAM como limite de mercado. Usarlo como ventaja cultural/operativa y prueba regional.
- La Home vende el sistema; About Us explica el Why/identidad; las landings de servicio demuestran capabilities especificas.
- La Home no puede cerrar con contenido de template/demo/theme visible o indexable. Cualquier residuo de Ohio/Elementor/ThemeForest es blocker de confianza.
- En ingles, transcrear el sistema y la promesa. No traducir literalmente giros es-CL.

## Alternativas descartadas

- **Agencia integral / 360:** demasiado commodity; contradice la disciplina anti-humo del Why.
- **AI agency:** captura moda pero reduce el sistema a una herramienta.
- **Growth partner:** útil como lenguaje comercial; ahora se precisa como **Integrated Growth Partner**, insuficiente por sí solo como categoría de compañía.
- **LATAM agency:** aprovecha origen, pero limita la ambicion global.

## Consecuencias

- `docs/context/09_marca-agencia.md` sigue siendo el SSOT del Why; este PDR fija como se baja al sitio publico y a la ambicion global.
- La Home y futuras superficies de categoria deben abrir desde el sistema, no desde un catalogo de servicios.
- La auditoria del Home live 2026-07-09 queda como señal de ejecucion: hoy hay alineacion parcial, pero el sitio todavia comunica "agencia creativa/digital competente" más que "Integrated Growth Partner" respaldado por plataforma. El rework debe corregir eso antes de optimizaciones visuales.
- Las landings de servicio deben probar una parte del sistema, no presentarse como unidades aisladas.
- El roadmap publico debe preparar arquitectura `hreflang` y transcreacion para expansion pan-hispana, US Hispanic, en-US y otros mercados.

## Enlaces

- SSOT marca/Why: `docs/context/09_marca-agencia.md`
- GTM: `docs/context/02_gtm.md`
- Estrategia comercial: `docs/context/08_estrategia-comercial.md`
- Modelo ASaaS: `docs/context/14_modelo-negocio-asaas.md`
- Layering ecosistema: `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`
- Home como pitch: `docs/public-site/decisions/PDR-010-home-es-el-pitch-agencia-se-pliega.md`
- About Us Golden Circle: `docs/public-site/decisions/PDR-011-about-us-identidad-golden-circle.md`
