# PDR-024 — AXIS en el sitio público: composición agéntica con los packages del design system

> **Tipo:** Product Decision Record de plataforma del sitio público.
> **Estado:** Draft for validation · 2026-09-29
> **Ejecución:** pendiente — task por crear (piloto descrito en §Piloto). No hay ID reservado.
> **Runtime afectado:** `efeonce-public-site-runtime` → `wp-content/plugins/eo-elementor-widgets` (Elementor + Ohio, Kinsta).
> **Fuente de valores:** repo `efeoncepro/axis-design-system` — `@efeoncepro/axis-tokens`, `@efeoncepro/axis-graphic-line`,
> `@efeoncepro/axis-ui-contracts`, `@efeoncepro/axis-brand-assets`.
> **Registro de primitives:** [PRIMITIVES.md del sitio público](../../architecture/public-site/PRIMITIVES.md).
> **Skills:** `efeonce-public-site-wordpress`, `axis-design-system`, `efeonce-graphic-line`, `seo-aeo`,
> `modern-web-guidance`, `web-perf-design`, `greenhouse-ai-design-studio`.

## Contexto

El operador quiere que el sitio público (`efeoncepro.com`, WordPress) consuma los packages de AXIS **a demanda**, para que
los agentes compongan módulos y piezas gráficas con el mismo sistema que ya usan en publicidad, decks e informes, en vez de
reproducir la marca a mano en cada landing.

Hechos verificados el 2026-09-29, no opinables:

1. **Los packages de AXIS son privados.** Se publican en GitHub Packages (`npm.pkg.github.com`) y la API de GitHub devuelve
   `visibility: private` para `axis-tokens`. El navegador de un visitante no puede descargarlos, y PHP no ejecuta sus módulos
   JS. "Instalar AXIS en WordPress" en sentido literal no es posible.
2. **AXIS ya tiene una pieza agnóstica de stack.** `@efeoncepro/axis-graphic-line/element` define `<axis-orbit>`, un web
   component que acepta atributos simples o un `intent` JSON con la composición completa, y exporta `renderAxisOrbit()` para
   pre-renderizar el SVG en servidor. Íconos (`iconSvg`, `skewedOrbitHeroSvg`) y gráficos (`manzanitasChartSvg`) son
   funciones que devuelven SVG, no componentes.
3. **`axis-tokens/css` cubre sólo una parte del sistema.** `dist/tokens.css` emite en `:root` `--efeonce-*` (tokens de marca),
   `--efeonce-motion-*` y `--axis-ad-*` (publicidad). Las rampas, superficies, elevación y tipografía de AXIS
   (`axisBrandRamp`, `axisSurface`, `axisElevation`, `axisTypography`) existen sólo como exports JS.
4. **El sitio ya carga renderers externos a demanda.** `eo-elementor-widgets` (v0.12.0) registra scripts en
   `class-eo-widgets-loader.php` y cada widget los declara en `get_script_depends()`, así que Elementor sólo los encola en la
   página que usa el widget. Así entran hoy `<greenhouse-form>` y el CTA de Growth
   (`greenhouse.efeoncepro.com/growth-forms/renderer-latest.js`, `/growth-cta/renderer-latest.js`).
5. **AXIS no tiene módulos de página.** Heros, cards, secciones y FAQs del sitio viven como widgets semánticos en
   `eo-elementor-widgets` (ver `AgencyLandingModules`, `ContentMarketingLandingModules`, `ComparisonTable`). AXIS aporta
   valores, contratos y piezas gráficas, no layouts.

## Decisión

**Sí: el sitio público consume AXIS, pero como versión fija incluida en el plugin del runtime y encolada sólo donde se usa,
nunca como dependencia en vivo de un registry ni de un `-latest`.** Los agentes componen **intents** validados por
`axis-ui-contracts`; el SVG se resuelve al componer y se sirve como HTML estático; el JS sólo se carga cuando la pieza anima.

AXIS se usa para lo que ya es: **fuente de valores y de piezas gráficas**. No se convierte en el constructor de páginas del
sitio: los módulos siguen siendo widgets de `eo-elementor-widgets`, que pasan a consumir tokens y piezas de AXIS en lugar de
HEX y SVG copiados a mano.

## Arquitectura en tres capas

### 1. Distribución: versión fija incluida en el runtime

- Un script de build en el repo de AXIS produce un paquete público mínimo: `axis-public.<version>.js` (ESM que registra
  `<axis-orbit>` y expone las funciones de SVG) y `axis-tokens.<version>.css`.
- Ese paquete se copia al runtime en `eo-elementor-widgets/assets/vendor/axis/<version>/` y se versiona en git como
  cualquier asset del plugin. Subir de versión es un cambio revisable en el repo del runtime, con su deploy, purga de Kinsta y
  rollback por el carril gobernado.
- El loader lo registra con `wp_register_script` / `wp_register_style` y el número de versión explícito.

**Descartado:**

| Alternativa | Por qué no |
| --- | --- |
| Cargar desde GitHub Packages | Privado; el navegador no puede leerlo. |
| Publicar AXIS en npm público y cargar desde jsDelivr/unpkg | Publicar los packages (con brand assets incluidos) es una decisión de licencia y marca aparte. Además agrega un origen externo en el camino crítico. Se puede reabrir en otra decisión. |
| Servirlo desde Greenhouse (`greenhouse.efeoncepro.com/axis/…`), como Growth Forms | Acopla la versión visual del sitio al release de Greenhouse y agrega una dependencia cross-origin. Growth Forms lo justifica porque es un renderer con estado y API; AXIS es CSS y SVG estáticos. |
| URL `-latest` | Un cambio en AXIS modificaría el sitio en producción sin pasar por el release del sitio público. La versión fija existe justo para evitarlo. |

### 2. Host en WordPress: un widget de composición

- Un widget genérico en `eo-elementor-widgets` (nombre propuesto: `greenhouse_axis_composition`) guarda, por instancia:
  `axisVersion`, `intent` (JSON), `svg` (pre-renderizado) y `svgHash`.
- El PHP imprime el SVG en el HTML del servidor, sanitizado con `wp_kses` y una allowlist de SVG, dentro de un root `gh-axis-*`.
- `get_script_depends()` devuelve el script de AXIS **sólo si** la instancia pide `animate`; sin animación la página no carga
  JS de AXIS. `get_style_depends()` encola los tokens sólo donde hay un widget que los consume. Eso es lo que "a demanda"
  significa en este sitio.
- Los widgets semánticos existentes pueden declarar la hoja de tokens como dependencia y reemplazar valores copiados por
  `var(--efeonce-*)` a medida que se tocan (migración oportunista, sin barrido masivo).

### 3. Agentes: componen intents, no HTML

- El agente escribe un intent (`AxisGraphicLineIntent` o el contrato que corresponda), lo valida con `axis-ui-contracts`, lo
  resuelve en local con la **misma versión** incluida en el runtime y obtiene el SVG. Nunca escribe coordenadas decorativas ni
  valores de color sueltos.
- Intent, versión, SVG y hash viajan juntos al widget por el carril gobernado de publicación (vista previa privada, QA 390px,
  purga, evidencia y rollback). Un gate re-renderiza el intent con la versión declarada y falla si el hash no coincide: el SVG
  guardado nunca se desvía del intent que lo generó.
- La autoridad sobre qué se publica no cambia: esta decisión no autoriza a ningún agente a publicar sin la aprobación que ya
  exige el runbook del sitio.

## Reglas duras

- **El texto de la página nunca vive dentro de AXIS.** Titulares, párrafos, FAQs y CTAs van en HTML semántico del servidor.
  `<axis-orbit>` renderiza en shadow DOM y se marca `aria-hidden`: lo que ponga ahí no lo ve un buscador ni un rastreador
  de IA. AXIS en el sitio es capa gráfica.
- **SSR primero.** Toda pieza estática se sirve como SVG en el HTML. El web component sólo se usa para motion, y siempre con
  el SVG estático como contenido inicial y respetando `prefers-reduced-motion`.
- **Versión fija siempre.** Ni `latest` ni rangos. Si dos widgets de la misma página declaran versiones distintas, gana la
  del loader y el gate de hash lo reporta.
- **Tokens con prefijo, sin pisar el tema.** Las variables quedan con su prefijo (`--efeonce-*`, `--axis-*`) y ningún
  selector de AXIS apunta a elementos de Ohio ni de Elementor. Estilos de componente, bajo roots `gh-*`.
- **AXIS es dueño de los valores.** Si una landing necesita un valor que AXIS no tiene, se agrega en AXIS y se sube la
  versión; no se inventa en el CSS del widget.

## Brecha que resolver en AXIS

`tokens.css` no emite rampas, superficies, elevación ni tipografía (hecho 3). Para que los widgets dejen de copiar valores hace
falta una emisión web de esos grupos, con prefijo propio. Es trabajo del repo de AXIS y va primero: sin ella, el sitio sólo
podría adoptar la órbita y los tokens de marca básicos.

## Piloto

Una landing `noindex` con:

1. un widget `greenhouse_axis_composition` con una órbita estática resuelta desde un intent;
2. la misma órbita con `animate` (verificando que sin motion no se carga el script);
3. un widget semántico existente consumiendo `var(--efeonce-*)` desde la hoja de tokens incluida.

Criterios de salida del piloto:

- sin JS de AXIS en la página cuando ninguna pieza anima (verificado en red);
- el SVG está en el HTML crudo (`curl`, sin ejecutar JS) y el texto de la página sigue siendo HTML semántico;
- sin desborde a 390px (`scrollWidth == clientWidth`), contraste medido y `prefers-reduced-motion` respetado;
- el gate de hash pasa y falla a propósito si se edita el SVG a mano;
- sin cambios visuales en el header, footer ni tipografía de Ohio;
- Core Web Vitals de la landing iguales o mejores que una landing comparable sin AXIS.

Con el piloto aprobado, `AxisComposition` se registra en [PRIMITIVES.md](../../architecture/public-site/PRIMITIVES.md) como
`asset-system` y el oficio se documenta en la skill del sitio público.

## Fuera de alcance

- Publicar los packages de AXIS en un registry público.
- Convertir AXIS en generador de layouts o secciones de página.
- Migrar de una vez todos los widgets existentes a tokens.
- Cambiar el runbook de publicación del sitio o la autoridad de aprobación.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Contenido dentro del shadow DOM invisible para SEO/AEO | Regla dura: AXIS sólo como capa gráfica; texto en HTML del servidor. |
| SVG guardado que ya no corresponde al intent | Gate de hash con re-render en la versión declarada. |
| Versiones distintas de AXIS entre sitio, Greenhouse y piezas | La versión viaja con cada composición; subir versión es un cambio explícito y revisado. |
| SVG como vector de inyección | `wp_kses` con allowlist de SVG; el SVG sale de un resolver, nunca de texto libre. |
| Choque con estilos de Ohio/Elementor | Prefijos, roots `gh-*`, sin selectores globales; verificación visual del chrome del tema en el piloto. |

## Consecuencias

- La implementación toca **dos repos además de Greenhouse**: `axis-design-system` (emisión web de tokens y script del paquete
  público) y `efeonce-public-site-runtime` (vendor, loader y widget). Ambos cambios van por PR, no commit directo a `main`,
  según la regla de acciones cross-repo.
- La task de ejecución debe crearse con `greenhouse-task-planner`, con perfil `ui-ux` y la brecha de AXIS como dependencia
  previa.
