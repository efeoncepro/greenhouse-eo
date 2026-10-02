# Think UI Patterns Architecture

Tipo: documentacion tecnica / arquitectura UI publica.

Estado: vigente desde la landing Brand Visibility publicada el 2026-07-05.
Delta 2026-09-28: se agrega el patrón [Shared Tokenized Report](#pattern-shared-tokenized-report-efeonce-insights)
(informe compartido de Efeonce Insights, TASK-1875).

Owner: Growth / Think, con Greenhouse como source of truth de datos y contratos.

## Proposito

Este documento captura el patron de landing publica que quedo aprobado en
`https://think.efeoncepro.com/brand-visibility`: una experiencia editorial,
conversion-oriented y tecnicamente precisa, donde Think controla la presentacion
pero no duplica el runtime gobernado de Greenhouse.

## Pattern: Public Diagnostic Landing

Usar este patron cuando Think presenta una herramienta publica que:

- pide datos para iniciar un diagnostico o reporte;
- depende de un form gobernado por Growth Forms;
- entrega un resultado privado en pantalla;
- necesita educar al usuario antes o despues del submit;
- debe sentirse como producto Efeonce, no como pagina generica de marketing.

No usarlo para pages informativas simples, articulos editoriales, dashboards
privados del portal ni flujos donde el usuario ya esta autenticado en
Greenhouse.

## Anatomia

### 1. Hero inmersivo

Responsabilidad: explicar la promesa en una frase, mostrar el universo de
motores/superficies y preparar el scroll hacia el formulario.

Contrato visual:

- Fondo navy Efeonce Think.
- Header de marca `efeonce | Think`.
- Badge de contexto (`Brand Visibility Grader`, por ejemplo).
- H1 editorial con saltos intencionales.
- Bajada breve orientada a resultado.
- Grupo de motores/superficies con logos reconocibles.
- Animacion/asset principal amplio, no decorativo.
- Cue de scroll en circulo con movimiento suave.

Invariantes:

- No arreglar el H1 robando espacio a la animacion.
- Si el H1 colapsa en demasiadas lineas, revisar grid, ancho de columna,
  `text-wrap`, saltos manuales y breakpoints antes de reducir el visual.
- Topbar, hero content y form dock deben respirar dentro de un sistema de
  margenes consistente.
- La animacion hero se considera asset principal: cualquier cambio de escala,
  encuadre o timeline requiere captura comparativa local y live.

### 2. Form dock gobernado

Responsabilidad: alojar el renderer de Growth Forms sin apropiarse del dominio
del formulario.

Contrato:

- Think renderiza el contenedor y estados alrededor del form.
- Growth Forms renderiza campos, validacion, consentimiento, captcha y submit.
- Think escucha `gh_form_submission_accepted`.
- El evento debe traer `run_handle` y `status_url` cuando el behavior
  `tokenized_report` este publicado.
- Think muestra loader/handoff y consulta `status_url`.
- Cuando el status esta `ready`, Think abre `/brand-visibility/r/<token>`.

Prohibido:

- crear campos locales para reemplazar el renderer;
- duplicar validacion o consentimiento;
- cerrar el flujo por email si el contrato prometio reporte en pantalla;
- meter un proxy CORS Astro para resolver una configuracion de Greenhouse;
- inventar progreso, scores o resultado antes de que Greenhouse los devuelva.

### 3. Framework ladder

Responsabilidad: traducir la metodologia Efeonce a una lectura clara, recordable
y accionable.

Patron aprovado:

- Eyebrow con marca inline: `FRAMEWORK DE <logo efeonce>`.
- Titulo corto: `La visibilidad en IA se gana capa por capa.`
- Intro que resume los cinco niveles: acceso, lectura, exactitud, operabilidad y
  preferencia de marca.
- Cinco cards horizontales:
  - `01 Be Found` - que te encuentre.
  - `02 Be Readable` - que te entienda.
  - `03 Be Correct` - que te describa bien.
  - `04 Be Actionable` - que pueda actuar.
  - `05 Be Intrinsic` - que te prefiera.
- Iconografia Lucide/Iconify o equivalente, centrada y sin wrappers que recorten
  visualmente el icono.
- Borde visible y consistente en todas las cards.
- Barra inferior multicolor como acento funcional, no como decoracion dominante.

Reglas de copy AEO:

- `IA` puede aparecer en la idea de negocio cuando ayuda al reconocimiento.
- Evitar redundancias como `motores de respuesta con IA`.
- Diferenciar `motores de busqueda` de `motores de respuesta`.
- `Google`, `Bing` y AI Overviews pertenecen a busqueda/superficies de busqueda.
- `ChatGPT`, `Perplexity`, `Claude`, `Gemini` y similares pertenecen a motores de
  respuesta o asistentes conversacionales.
- Usar `citabilidad`, `operabilidad`, `exactitud`, `cobertura por canal`,
  `autoridad de entidad`, `preferencia` y `Share of Model` cuando el contenido lo
  soporte.

### 4. Report expectation section

Responsabilidad: bajar ansiedad post-form y mostrar que el informe no es un
lead magnet vacio.

Contrato de composicion:

- Eyebrow `INFORME PRIVADO`.
- Titulo descriptivo: `Que esperar despues de enviar tus datos`.
- Texto lateral que explique la traduccion de senales tecnicas a lectura de
  negocio.
- Cards de salida esperada con titulos descriptivos, icono funcional, copy breve
  y ejemplos de decisiones.
- Preview del informe o snapshot visual con jerarquia de reporte privado.
- Proof row o lista de lo que el reporte devuelve, sin prometer datos que el
  contrato no expone.

La seccion debe sentirse mas como preview de producto que como lista de
beneficios. Si aparece pobre, mejorar jerarquia, ritmo y evidencia visual antes
de sumar copy.

### 5. SEO/AEO metadata layer

Responsabilidad: que la landing sea legible para buscadores, motores de
respuesta, previews sociales y crawlers especializados.

Minimo esperado:

- `title` unico y orientado a intencion.
- `meta description` con promesa, mecanismo y marca.
- canonical a la URL publica.
- Open Graph y Twitter Card coherentes.
- JSON-LD con `WebPage`, `SoftwareApplication` o `Service` cuando aplique.
- `Organization` apuntando a Efeonce Group SpA con `url` principal
  `https://efeoncepro.com`, no a Think como sitio corporativo principal.
- `BreadcrumbList` si existe jerarquia publica.
- `FAQPage` solo si hay FAQ visible equivalente.
- `llms.txt`/robots/crawl surface cuando el proyecto Think lo soporte.

## Motion

Motion Think puede ser mas expresivo que el portal privado, pero debe seguir
siendo operacional:

- la animacion del hero es parte del mensaje, no ornamento;
- el scroll cue debe bajar suave;
- `prefers-reduced-motion` debe tener fallback honesto;
- los timelines no deben bloquear el primer contenido util;
- todo cambio visible se valida con captura despues de que la animacion haya
  estabilizado;
- no se tocan timelines aprobados para resolver problemas de layout no
  relacionados.

## Responsividad

Breakpoints minimos:

- Desktop wide: revisar que el H1 no colapse y que la animacion conserve escala.
- Laptop 1280: revisar balance hero/form y cards del framework.
- Mobile 390: revisar overflow horizontal, line-height, orden de secciones,
  touch targets y que el form no quede oculto por la composicion.

Checks obligatorios:

- `scrollWidth == clientWidth`.
- Captura despues de 3s si hay animacion hero.
- Captura con form loaded y con form degraded/error.
- Captura del handoff loader si existe.

## Anti-patterns aprendidos

- Reducir el asset hero para ganar espacio textual sin diagnosticar el grid.
- Usar `text-wrap: balance` sobre un H1 que ya tiene saltos manuales aprobados.
- Confundir `motores de respuesta` con `motores de busqueda`.
- Suprimir `IA` de todo el copy: el termino ayuda al usuario, pero no debe
  sustituir la jerga tecnica.
- Hardcodear iconos sin caja optica y luego corregir a ojo.
- Quitar iconos por frustracion de encuadre; el problema se resuelve con
  iconografia y alineacion correctas.
- Debilitar bordes hasta que una card parezca cortada o sin contorno.
- Crear un form local en Think para acelerar el pase visual.
- Resolver CORS con proxy local en Astro.
- Desplegar sin comparar local vs live en el mismo viewport.

## Checklist de reutilizacion

Antes de copiar este patron a una nueva landing Think:

- identificar el contrato Greenhouse que alimenta la experiencia;
- confirmar si existe renderer gobernado;
- definir si el output es reporte, descarga, agenda, short link o handoff;
- escribir el copy con SEO/AEO y copywriting juntos;
- preservar un asset principal inspeccionable;
- validar el hero local y live con el mismo ancho;
- documentar la excepcion si el patron se adapta al portal Greenhouse.

## Pattern: Shared Tokenized Report (Efeonce Insights)

> Estado 2026-09-28: en producción (Think `bbf8522`). El render vive en `src/components/insights/InsightReport.astro` y lo usan dos rutas: `/insights/r/[token]` (SSR, token) y `/insights/muestra` (prerenderizada, datos de ejemplo con marca ficticia, `mode="sample"`: sin descargas, sin logo, aviso en portada y pie, CTA a conversar). Un solo componente para que la muestra nunca se desalinee del producto.

Estado: construido y verificado en local el 2026-09-28 (TASK-1875). **Sin desplegar**: `main` de `efeonce-think`
publica producción automáticamente y el push queda pendiente del operador.

Usar este patrón cuando Think presenta a un cliente una lectura privada que Greenhouse ya compuso y cuyo acceso
Greenhouse gobierna con un token revocable. Ruta de referencia: `think.efeoncepro.com/insights/r/<token>`
(`src/pages/insights/r/[token].astro` en `efeonce-think`).

### Contrato consumido

| Endpoint Greenhouse | Uso |
|---|---|
| `GET /api/public/insights/shared/{token}` | `InsightWebModelV1` (modelVersion `1.x`; `1.1` es aditivo: editorial v2, tasas del embudo, logo). Un major distinto se trata como error. |
| `GET …/shared/{token}/outputs/{output}` | Descarga de `report_pdf` / `deck_pdf`. Greenhouse revalida el grant. |
| `GET …/shared/{token}/logo` | Logo del cliente, con el mismo gate del token. |

El fetch es server-side y lleva `x-efeonce-think-key` (exceptúa a Think del límite por IP del Firewall de
`/api/public/**`) y, sólo contra staging, `x-vercel-protection-bypass`. Ambos son secretos de servidor en el schema
de `astro.config.mjs` (`GREENHOUSE_API_BASE`, `GREENHOUSE_THINK_KEY`, `GREENHOUSE_API_BYPASS`); nunca llegan al browser.

### Reglas de runtime

- **SSR por request, sin cache.** `prerender = false`; revocar en Greenhouse revoca en la lectura siguiente.
- **El token nunca entra al HTML.** Canonical genérico (`/insights`), descargas por `?descargar=report_pdf|deck_pdf`
  y logo por `?logo=1` como query **relativa** sobre la misma URL (la página hace de proxy), enlaces copiados desde
  `location`. Sin archivo disponible, `?descargar=` redirige (303) al informe, que muestra el estado real.
- **Sin analítica.** El layout se monta con `analytics={false}` (sin GTM): el token no puede filtrarse a terceros.
- **Cabeceras** en la página, el logo y las descargas: `Cache-Control: private, no-store`,
  `X-Robots-Tag: noindex, nofollow`, `Referrer-Policy: no-referrer` (el logo agrega `X-Content-Type-Options: nosniff`).
- **Estados honestos** con `StatusScreen`: `404` desconocido/expirado (indistinguibles por diseño), `410` revocado,
  `429` límite, `502` error o modelo no soportado.
- **OG sin datos.** `/branding/insights/og-insights.png` es genérica (lockup + una órbita), generada desde los tokens
  con `node scripts/build-insights-og.mjs`: la vista previa en un chat nunca filtra contenido.

### Reglas de presentación

- **Un solo archivo con valores.** `src/lib/insights-tokens.ts` copia 1:1 de AXIS la línea «La órbita» (color, roles
  de dato, curvas, duraciones). Ningún componente escribe un HEX, una curva o una duración; si AXIS cambia, se cambia
  ahí. Assets en `public/branding/insights/*` desde `@efeoncepro/axis-brand-assets` 0.4.0. Tipografía: Bricolage
  Grotesque (variable `opsz`) + Poppins 400/500/600/800/800 itálica/900 itálica.
- **Chrome bilingüe.** El copy de interfaz vive en `src/lib/insights-copy.ts` con dos diccionarios de la misma forma
  (es-CL y en-US); la página elige por `model.locale`, así una edición en inglés no queda con botones en español. Lo
  editorial viene escrito en el modelo y nunca se reescribe.
- **Render tonto.** Toda cifra impresa es `fact.display`; la geometría (`src/lib/insights-chart-geometry.ts`) sigue
  las convenciones de `src/lib/artifact-composer/chart-geometry.ts` (los PDF) y sólo produce posiciones.
- **Anatomía «tablero de respuestas»**: portada que abre con la respuesta → hallazgos que se expanden en su lugar →
  barra fija con filtros por módulo y órbita de avance → una `ModuleScene` por capítulo (gráfico principal narrado por
  pasos) → plan y metodología → descargas → pie con aviso de vencimiento del enlace.
- **Mejora progresiva.** Sin JS la página está completa (hallazgos abiertos, gráfico y tabla visibles). Un script
  inline antes del primer paint agrega `.ins-js` (habilita colapso e interruptores) y `.ins-motion` (sólo si no se pidió
  movimiento reducido); si el módulo no monta en **3 s**, retira ambas clases y la página queda completa.
- **Movimiento reducido**: toda la interacción, cero animación.
- **Modo presentación**: diálogo modal con las láminas ya renderizadas en el HTML (portada, hallazgos, decisión,
  plan, cierre); teclado (flechas, espacio, Re Pág/Av Pág, Inicio/Fin, Esc), foco atrapado y devuelto al salir;
  pantalla completa sólo desde 900 px y sin movimiento reducido.
- **Impresión**: `@media print` en A4, fondo blanco, oculta barra/presentación/interruptores, fuerza la tabla de cada
  gráfico y deja todo el motion en estado final.

### Verificación

Con `pnpm dev --port 4331` corriendo en `efeonce-think` (los tokens `fixture-*` sólo resuelven en dev):

```bash
pnpm test:insights                                  # 14 pruebas de vista y geometría
node scripts/verify-insights-report.mjs             # estados, cabeceras, token fuera del HTML, overflow 1440/390,
                                                    # cifras del modelo, modelo sin campos v2, motion reducido
node scripts/audit-insights-a11y.mjs                # contraste AA de todo texto visible + recorrido con Tab
node scripts/capture-insights-report.mjs <dir>      # dossier visual desktop 1440 / mobile 390 + presentación
```

Resultado del 2026-09-28: verify «Todo verde», a11y AA en 1440 y 390, 14 pruebas verdes. Dossier:
[`docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/`](../ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/).
Componentes documentados en `efeonce-think/src/components/primitives/README.md` (sección Insights).

