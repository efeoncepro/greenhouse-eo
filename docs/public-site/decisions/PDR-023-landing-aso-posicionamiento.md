# PDR-023 — Posicionamiento de la landing ASO

> **Tipo:** Product Decision Record de posicionamiento y conversión del sitio público.
> **Estado:** Draft for validation · 2026-09-10
> **Ejecución propuesta:** `TASK-1862` · `EPIC-019`
> **Oferta que representa:** extensión **Search & App Visibility** de Search Visibility 360 —
> [`SEARCH_APP_VISIBILITY_EXTENSION_V1.md`](../../business-models/search-visibility-360/SEARCH_APP_VISIBILITY_EXTENSION_V1.md)
> (`Proposed` · `hypothesis_only`).
> **Hermanas:** [PDR-001](PDR-001-seo-landing-complementaria-al-aeo.md) (SEO complementario al AEO) ·
> [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md) (hub `/servicios` con spokes por término).
> **Skills:** `seo-aeo` (módulo 10), `seo-aeo-practice` (módulo 14), `copywriting`, `commercial-expert`,
> `growth-marketing-cro`, `greenhouse-growth-forms`, `greenhouse-growth-ctas`, `efeonce-public-site-wordpress`,
> `greenhouse-ai-design-studio`, `greenhouse-ux-content-accessibility`.

## Contexto

El 2026-09-10 Efeonce registró el ASO como **superficie de expansión de Search Visibility 360** para clientes que
tienen app: mismo oficio de visibilidad (entidad, intención, contenido, medición) sobre App Store y Google Play,
más el descubrimiento de apps por IA. Hay una oportunidad viva que lo motivó —la app de Berel, cliente SEO actual
([workspace](../../commercial/tenders/berel-app-movil/README.md), deal en `qualifiedtobuy`, sin oferta)— y
cero casos citables de ASO.

Cuatro hechos condicionan esta página y no son opinables:

1. **No hay demanda comercial de ASO en español.** Semrush (`as-of 2026-09`, datos de agosto): `app store
   optimization` tiene ~20 búsquedas/mes en Chile, México, Colombia y Perú; `agencia aso`, 10; `posicionamiento
   de apps`, `posicionamiento de aplicaciones`, `posicionamiento en app store` y `posicionamiento en google play`,
   0. En inglés el término sí existe (EE. UU. 2.400/mes, CPC USD 25,86), pero no es el mercado de esta página.
2. **`aso` tiene volumen, pero no es nuestra intención.** `aso` suma 480 (CL), 3.600 (MX), 1.600 (CO) y 720 (PE)
   búsquedas/mes, y su SERP lo ocupan el examen de laboratorio *antiestreptolisina O*, la empresa de buses ADO,
   música y una acción bursátil. La disciplina ASO aparece en minoría (Telefónica, Rocketlab, Pickaso). `que es
   aso` (MX 90) devuelve un SERP casi totalmente médico. Una sola fuente: el snapshot de DataForSEO Labs
   en Greenhouse no tiene estos términos (`found=false`, nunca capturados) al 2026-09-10.
3. **La oferta está en `Proposed`.** El modelo de negocio no autoriza claims públicos, pricing ni capacidad
   vigente. La página se puede diseñar y construir, pero no publicar como si la oferta estuviera aprobada.
4. **Ya existen las dos hermanas.** `/servicios/posicionamiento-seo/` (página `251078`, cimiento Google) y
   `/aeo-2/` (página `250265`, filo motores de IA) viven en el grupo de menú `Visibilidad`. El ASO es la tercera
   superficie de la misma promesa, no una línea aparte.

Evidencia de plataforma (Apple, Google, OpenAI) verificada en `seo-aeo/SOURCES.md` §5; mercado de servicios ASO en
[`ASO_SERVICE_MARKET_RESEARCH_2026-09-10.md`](../../audits/commercial/ASO_SERVICE_MARKET_RESEARCH_2026-09-10.md).
Contrato SEO/AEO de la página en el [ASO Landing SEO/AEO Brief V1](../ASO_LANDING_SEO_AEO_BRIEF_V1.md).

## Decisión

### El trabajo de la página

**No es una página de captura de demanda.** Con ~20 búsquedas comerciales al mes, optimizarla para tráfico
orgánico sería medirla contra algo que no existe. Tiene tres trabajos, en este orden:

1. **Destino de expansión.** Donde llega un cliente o prospecto de SEO/AEO con app —por un enlace de las landings
   hermanas, del menú o de un envío 1:1— y entiende qué hacemos en la tienda y por qué está conectado a lo que ya
   le hacemos en Google y en la IA.
2. **Referencia citable en español.** El SERP en español de la disciplina es chico y lo sirven blogs de vendors.
   Una definición clara, la diferencia con el SEO y lo que cambió con la IA, en cápsulas visibles, apuntan a que
   los asistentes citen a Efeonce cuando alguien pregunta qué es el ASO. Se mide por presencia en respuestas, no
   por sesiones.
3. **Completar el trío de Visibilidad.** SEO, AEO y ASO como tres superficies de una sola promesa, navegables
   entre sí.

### One thing

> **Tu app, encontrada en la tienda y entendida igual en todos lados.**

### Promesa

Trabajamos tu ficha en App Store y Google Play y la conectamos con tu web y con lo que dicen los asistentes de IA,
para que la misma app se describa igual en la tienda, en Google y en ChatGPT. Lo medimos en tus consolas.
**No** prometemos ranking en la tienda, más descargas, más estrellas ni instalaciones atribuidas a la IA.

### Comprador

| Rol | Quién | Qué necesita leer |
|---|---|---|
| **Operador y champion** | Quien responde por la ficha y los releases: growth móvil, product marketing o UA | Que alguien se hace cargo de la ficha en cada versión y le entrega lectura por fuente con las definiciones correctas |
| **Sponsor / economic buyer** | CMO o gerencia digital; en un cliente SEO actual, el mismo sponsor del SEO | Que es la misma promesa de visibilidad, extendida a la tienda, con un solo responsable |
| **Governance** | Legal / compliance y el dueño técnico de la cuenta de developer | Que no hay reseñas compradas ni prácticas que pongan en riesgo la cuenta |

### Relación con las hermanas

```text
                 Visibilidad (menú)  ·  /servicios/ (hub)
        ┌──────────────────────┬──────────────────────┬──────────────────────┐
        │ /servicios/          │ /aeo-2/  (futuro     │ /servicios/aso/      │
        │ posicionamiento-seo/ │ /servicios/aeo)      │ (esta página)        │
        │ Google · cimiento    │ Motores de IA · filo │ La tienda · la app   │
        └──────────┬───────────┴──────────┬───────────┴──────────┬───────────┘
                   └───────── enlaces cruzados por función ──────┘
```

- La página enlaza **hacia** SEO y AEO desde su sección "tres lugares" y desde la FAQ.
- SEO y AEO enlazan **hacia** ella sólo en fase C (ver abajo): una línea en el puente SEO→AEO de la landing SEO y
  una pregunta nueva en la FAQ de AEO, sincronizada con su `FAQPage`.
- **No** hay lead magnet compartido: el AI Visibility Grader no mide apps. La conversión es un brief de
  diagnóstico propio más reunión.

### Slug

`/servicios/aso/` como working route: el término de la categoría, corto y paralelo al futuro `/servicios/aeo`
(PDR-002). La ambigüedad de `aso` se resuelve en title, H1 y meta —`apps`, `App Store`, `Google Play`—, no en el
slug. El Slice 1 de la task lo confirma con una segunda fuente antes de fijar canonical.

### Publicación por fases, atada al modelo de negocio

| Fase | Estado de la extensión | Qué existe | Quién la ve |
|---|---|---|---|
| **A** | `Proposed` (hoy) | Borrador o preview privado en WordPress; no hay URL pública | Equipo interno |
| **B** | `Approved for validation` | URL pública `noindex, follow`, fuera de sitemap, menú y hub; SEO y AEO **no** la enlazan | Se envía 1:1 (Berel y prospectos): *se envía, no se encuentra* |
| **C** | `Commercially approved` | `index, follow`, canonical, sitemap, menú `Visibilidad`, hub y enlaces desde SEO y AEO | Público |

## Conversión y funnel

```text
landings SEO/AEO (fase C) · menú Visibilidad · hub · envío 1:1 con UTM (fase B) · cita en asistentes
        ↓
landing: definición → qué cambió → tres lugares → la misma app en tres lugares → qué hacemos → medición → límites
        ↓
brief de diagnóstico de la app (primario) ──┐
                                            ├→ calificación (plataformas, país, acceso a consolas, próximo release)
reunión (secundario) ───────────────────────┘
        ↓
L0 App Visibility Diagnostic → L1/L2 → L3 operación → expansión
```

- **CTA primario:** `Pide el diagnóstico de tu app` → brief inline (`#diagnostico`), un Growth Form gobernado
  nuevo (`efeonce-aso-diagnostic`). Coincide con la convención de las hermanas: su CTA primario también es el
  diagnóstico. **No dice "gratis"** mientras la decisión D2 de la extensión esté abierta.
- **CTA secundario:** `Agenda una reunión` → Growth CTA `open_meeting_scheduler`. Si la surface de Meetings no
  está enlazada al promover, el CTA degrada a `/contacto/`.
- El brief pide el enlace de la ficha, plataformas, país, qué necesita, acceso a consolas y próximo release. **No
  pide presupuesto ni volumen de descargas**: el acceso a consolas y el release califican igual.

## Prueba y honestidad

- **Cero casos de ASO.** La página no inventa, no insinúa y no reutiliza resultados de SEO/AEO como si fueran de
  apps.
- La prueba es **de método**: qué recibes, cómo lo medimos (con las advertencias de cada consola), la sección de
  lo que no prometemos y un ejemplo ilustrativo rotulado.
- El carrusel de marcas va sólo con rótulo de empresa —`Marcas que confían en Efeonce`— y sin texto de apps
  adyacente.
- El dato de cuota Android se publica con fuente y fecha visibles, y con su límite: mide tráfico web, no teléfonos.
- Las funciones de IA de las tiendas se describen con su disponibilidad real: varias son sólo EE. UU. o inglés.

## Lo que la página no dice

- Que Efeonce garantiza ranking, descargas, rating o instalaciones que vengan de la IA.
- El "65–70% de las descargas viene de búsqueda" (Apple Ads, 2022, incluye paid) ni "de 3 a 4 estrellas = +89%"
  (sin fuente).
- Que Ask Play lee la web del cliente (lo afirman vendors; Google no lo confirma).
- Que Ask Play, Personalized Collections o las App Store tags están activas en Latinoamérica sin haberlo
  verificado en el país.
- Precios, bandas, plazos de resultados ni que el diagnóstico es gratis (D2 abierta).
- El nombre interno de la extensión ni las product brands de Efeonce como proveedores separados.

## No-goals

- Una guía editorial de ASO: la definición es una cápsula útil, no el cuerpo de la página.
- Una landing en inglés para EE. UU. (fase posterior, con localización real).
- Un grader o diagnóstico automático de apps: requiere runtime que Greenhouse no tiene (decisión D4).
- Servicios de desarrollo de apps, anuncios en tiendas (Reach) o producción creativa (Globe) como oferta propia.
- Juegos.

## Consecuencias

- Tercera spoke del grupo `Visibilidad` bajo el hub `/servicios/`.
- Un Growth Form y un Growth CTA nuevos por el lifecycle existente; sin backend nuevo.
- Dos cambios acotados en páginas protegidas en fase C: la landing SEO (`251078`) y la AEO (`250265`, con `heroans`
  intacto y `FAQPage` sincronizado).
- Éxito medido por briefs y reuniones calificados de clientes/prospectos con app y por presencia en asistentes,
  no por sesiones orgánicas.

## Validaciones pendientes

1. Segunda fuente de demanda y SERP (captura gobernada de DataForSEO Labs o Search Console); confirmar `/servicios/aso/`.
2. Disponibilidad real de Ask Play, Personalized Collections y App Store tags en CL/MX/CO/PE, en un dispositivo
   del país.
3. Guías de marca de Apple y Google para nombrar las tiendas sin badges ni logos.
4. Decisiones D1 (nombre comercial visible) y D2 (diagnóstico gratis o pagado) de la extensión.
5. Binding y duración de la surface de Meetings para la reunión.
6. Aprobación de dirección visual y copy ledger; revisión legal de claims.

## Reglas duras

- **NUNCA** publicar en fase B o C sin el estado del modelo de negocio que la fase exige.
- **NUNCA** enlazar la página desde SEO, AEO, menú o hub antes de la fase C.
- **NUNCA** usar badges de App Store o Google Play ni el logo de Apple como decoración.
- **NUNCA** medir el éxito de esta página por sesiones orgánicas.
- **SIEMPRE** rotular como ilustrativo el ejemplo de la sección firma.
- **SIEMPRE** tocar las landings SEO y AEO con snapshot, sus gates y, en AEO, el hash de `heroans` sin cambios.
