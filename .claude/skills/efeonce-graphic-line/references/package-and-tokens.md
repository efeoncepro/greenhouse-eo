# Inventario completo: paquetes, tokens, contratos, funciones, comandos y Lab

> Verificado contra: axis-design-system@a5c21ae — 2026-09-26 · greenhouse-eo@7cb24df17 — 2026-09-26 (versiones vigentes
> y regla del bump: greenhouse-eo@24e4c72ee, AXIS `v0.3.24`, 2026-09-28) · decisiones del
> operador D1–D15 del 2026-09-26 registradas y **publicadas** (tag `v0.3.5`, axis@5a87d7a): tokens y contratos 0.3.5,
> contrato de la órbita 0.3.1, registry y brand-assets 0.3.1, paquete 0.3.2. Nombres y valores verificados contra
> `tokens.ts` y `graphic-line.ts`. `orbit.sphereRing` lleva `reservedFor: 'live'`; el paquete expone `live` en
> `OrbitOptions` (`orbitSvg`) y como atributo `live` de `<axis-orbit>` (junto a `sphere-ring`).
>
> Todo lo de este archivo se leyó del código (`packages/*/src`, `scripts/`, `apps/lab`) y se ejecutó contra los `dist`
> de AXIS y contra el adapter de Greenhouse. Si un número de aquí no coincide con el código, **manda el código**:
> vuelve a leer `packages/tokens/src/tokens.ts` y actualiza este archivo.
>
> Plastilina en volumen (D24): `icons.volume`, `volume/` de brand-assets y `pnpm icons:volume` verificados contra AXIS
> `main@c18e3d3` — 2026-09-27 (`axis-tokens` 0.3.7 y `axis-brand-assets` 0.3.2, **publicados** con el tag `v0.3.7`
> sobre `main@c0020b6`; Greenhouse ya fija esas versiones, commit `f3f93c926`, 2026-09-27).
>
> Oficio (D25): catálogo de 60 glifos y 33 volúmenes verificados contra AXIS main@aa66225, 2026-09-27
> (`axis-graphic-line` 0.5.0 y `axis-brand-assets` 0.3.3, **publicados** con el tag `v0.5.0`; `axis-tokens` sigue en
> 0.3.7). Versiones que fija Greenhouse leídas de `package.json` el 2026-09-27.
>
> IA, social y staff (D26): catálogo de 79 glifos y 43 volúmenes, AXIS main@cf77452 (2026-09-27) (`axis-graphic-line` 0.6.0 y
> `axis-brand-assets` 0.3.4, **publicados** con el tag `v0.6.0`; `axis-tokens` iba en 0.3.8 en ese release y no cambió por D26).
> Greenhouse fija axis-graphic-line 0.6.0 y axis-brand-assets 0.3.4.
>
> Composición por superficie y su ruta por el Artifact Composer (TASK-1919): verificado contra greenhouse-eo@016d0a183
> — 2026-09-27 (`axis-tokens` 0.3.8 y `axis-ui-contracts` 0.3.7, tag `v0.3.8`, contrato `efeonce.surface-composition`
> 0.1.1; `src/lib/brand-surfaces`, `scripts/brand-surfaces/`, catálogos `graphic-line-*`).
>
> Deck completo de La órbita (TASK-1927 y TASK-1928, las dos `complete` y en `origin/develop`): verificado contra
> `develop` el 2026-09-28 — `package.json` fija `axis-tokens` **0.3.21**, `axis-ui-contracts` **0.3.19** (tag
> `v0.3.21`), `axis-graphic-line` 0.7.0 y `axis-brand-assets` 0.3.5; builders
> `src/lib/brand-surfaces/recipes/{deck,frame,proposal-service,method,close,proof,sections,content,kit}.ts`,
> `document.ts`, `types.ts`, `scripts/brand-surfaces/compose.ts`, `graphic-line-shared/{resolvers,rendered-audit}.ts`,
> `graphic-line-deck/{index.ts,registry.json,recipe-map.json}` (50 plantillas, 69 recetas).
> **Manda sobre las versiones que esta referencia cite más abajo para la composición por superficie.**
>
> **Versiones vigentes al 2026-09-28 (noche), leídas de `package.json` y de `node_modules`:** `axis-tokens` **0.3.24**
> y `axis-ui-contracts` **0.3.22** (tag `v0.3.24`, AXIS `5b3056f`: el Glitch Flash; antes TASK-1934 subió a 0.3.23 /
> 0.3.21), `axis-graphic-line` 0.7.0, `axis-brand-assets` 0.3.5, `axis-ui-registry` 0.3.1; fijadas en `53002b352`. El
> contrato `efeonce.surface-composition` no cambió (0.1.2); el de Glitch pasó a `efeonce.glitch-line` 0.2.0 (su
> inventario vive en [glitch.md](glitch.md) §9, no aquí). **Manda sobre las otras versiones de este encabezado.**
>
> **Marketing con Manzanitas (2026-09-28, tag `v0.3.26`, publicado en AXIS; Greenhouse aún NO lo fija):** `axis-tokens`
> 0.3.26 exporta `manzanitasRegister`, `axis-ui-contracts` 0.3.24 exporta `efeonce.manzanitas-register` 0.1.0 `candidate` (parche `v0.3.27`: `axis-ui-contracts`
> 0.3.27 con el contrato 0.1.1),
> `axis-graphic-line` 0.10.0 agrega `/charts` (no se exporta desde la raíz) y `axis-brand-assets` 0.4.1 sella
> `AXIS_MANZANITAS_ASSETS`. Su inventario vive en [manzanitas.md](manzanitas.md) §10.3, no aquí.

Índice: [1 Paquetes](#1-paquetes-versiones-e-instalación) · [2 Tokens](#2-tokens-efeoncegraphicline) ·
[3 Contrato de la órbita](#3-contrato-efeoncegraphic-line-orbit) · [4 Selección colaborativa](#4-contrato-efeoncecollaboration-selection) ·
[5 Firma de correo](#5-contrato-efeonceemail-signature) · [6 Archivos de marca](#6-efeonceproaxis-brand-assets) ·
[7 Paquete de la órbita](#7-efeonceproaxis-graphic-line-cada-export) · [8 Comandos](#8-comandos) · [9 Lab](#9-mapa-del-lab) ·
[10 Qué NO existe](#10-qué-no-existe-no-alucinar) · [11 Deriva conocida](#11-deriva-conocida-docs-vs-código)

---

## 1. Paquetes, versiones e instalación

Registro privado: GitHub Packages (`@efeoncepro:registry=https://npm.pkg.github.com`). Cada paquete se versiona por
separado.

> **Al 2026-09-27 (manda sobre la tabla, que es la foto del 2026-09-26):** publicado `axis-graphic-line` **0.6.0**
> (`v0.6.0`, catálogo de 79 glifos con el oficio D25 e IA, social y staff D26) · `axis-brand-assets` **0.3.4**
> (`v0.6.0`, 43 PNG de volumen) · `axis-tokens` **0.3.8** y `axis-ui-contracts` **0.3.7** (`v0.3.8`, contrato
> `efeonce.surface-composition` 0.1.1; `efeonceGraphicLine.surfaces` desde 0.3.7). **Greenhouse fija todo eso**
> (tokens 0.3.8, contracts 0.3.7, registry 0.3.1; commits `8d817f29e` y `016d0a183`), con axis-graphic-line 0.6.0
> (dependencia directa) y axis-brand-assets 0.3.4. **Eso es la foto de TASK-1919.** Tras TASK-1927, TASK-1922 y
> TASK-1928, Greenhouse fijó `axis-tokens` 0.3.21 y `axis-ui-contracts` 0.3.19 (tag `v0.3.21`, 2026-09-28; contrato
> `efeonce.surface-composition` **0.1.2** con los deltas (f)…(l) del ADR); después TASK-1934 (`v0.3.22`, `v0.3.23`) y el
> Glitch Flash (`v0.3.24`): **lo vigente es `axis-tokens` 0.3.24 y `axis-ui-contracts` 0.3.22**, con
> `axis-graphic-line` **0.7.0** y `axis-brand-assets` **0.3.5**. Releases de TASK-1927 (`v0.3.11`, `v0.3.13`,
> `v0.3.14`), de TASK-1928 (`v0.3.15` a `v0.3.21`), de TASK-1934 y del Flash, fila por fila, en [ledger.md](ledger.md).
> **Después de subir AXIS: `pnpm brand:tokens` y `pnpm glitch:tokens`, los dos, y los dos con `--check`, antes del
> commit** (aunque el release sea sólo de una línea: los generados llevan el sello de versión; el CI de `53002b352`
> falló por regenerar sólo los de Glitch, [lessons.md](lessons.md) 2026-09-28).

| Paquete | Versión en `main` de AXIS | Último tag de release | Fija Greenhouse (`package.json`) | Qué trae para la línea |
|---|---|---|---|---|
| `@efeoncepro/axis-tokens` | **0.3.5** | `v0.3.5` (contraste del acento, halo sobre papel, anillo «en vivo», burbuja 4,5:1) | **0.3.5** | `efeonceGraphicLine`, `axisMotion` |
| `@efeoncepro/axis-ui-contracts` | **0.3.5** | `v0.3.5` (contrato de la órbita 0.3.1) | **0.3.5** | `efeonce.graphic-line-orbit`, `efeonce.collaboration-selection`, `efeonce.email-signature` (≥ 0.3.2), firma de equipo (≥ 0.3.4) |
| `@efeoncepro/axis-graphic-line` | **0.3.2** | `v0.3.5` | **no lo instala** | el pintor: SVG, recetas, React, Web Component, movimiento |
| `@efeoncepro/axis-brand-assets` | **0.3.1** | `v0.3.5` (órbitas estáticas regeneradas) | **0.3.1** | 19 SVG oficiales + 48 órbitas estáticas (SVG + PNG) |
| `@efeoncepro/axis-ui-registry` | 0.3.1 | `v0.3.5` | 0.3.1 | no referencia la línea gráfica |

**Publicado el 2026-09-26 (tag `v0.3.5`):** `axis-tokens` 0.3.5 (`accentContrast`, `urlBubble.minContrast`,
`orbit.haloOnLightScale`), `axis-ui-contracts` 0.3.5 con el contrato `efeonce.graphic-line-orbit` **0.3.1** (`live`,
`sphere-ring-only-live`, el halo a la mitad en claro, el chequeo `accent-text-min-size`) y `axis-graphic-line` 0.3.2
(opción y atributo `live`). Greenhouse las fija en `develop` desde el 2026-09-26.

Consecuencias que un agente debe saber:

- **Greenhouse depende de `axis-graphic-line` desde el 2026-09-27** (dependencia directa, hoy 0.6.0). Lo usa **sólo**
  el mapper de superficies `src/lib/brand-surfaces` (`paintGraphicLine`, `resolveIcon`) para los catálogos del Artifact
  Composer (TASK-1919). Las piezas sociales y de campaña siguen con el adapter propio
  (`scripts/creative/layout-compiler/graphic-line.mjs`), raster-safe, sobre el contrato de la órbita. *(Antes de esa
  fecha la frase era «Greenhouse no depende de `axis-graphic-line`»: ya no es cierta.)*
- El contrato de la órbita en `axis-ui-contracts` 0.3.0 (el que tiene Greenhouse) es **idéntico** al de 0.3.2/0.3.4
  (diff vacío de `graphic-line.js`); 0.3.2 sólo suma `email-signature.ts`, y 0.3.4 la variante `team`.
- En el checkout local de AXIS, `packages/contracts/dist` todavía no incluye la variante `team` (el `dist` es anterior
  a `a5c21ae`): para usarla hay que correr `pnpm --filter @efeoncepro/axis-ui-contracts build`.

**Instalar con credencial efímera** (nunca imprimir, pegar ni commitear el token; runbook
`docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`):

```bash
(
  npmrc="$(mktemp)"; trap 'rm -f "$npmrc"' EXIT
  printf '%s\n' '@efeoncepro:registry=https://npm.pkg.github.com' '//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}' > "$npmrc"
  read -rs NODE_AUTH_TOKEN && export NODE_AUTH_TOKEN   # credencial read:packages; no se muestra
  NPM_CONFIG_USERCONFIG="$npmrc" pnpm install --frozen-lockfile
)
```

Un repo consumidor nuevo necesita además que `axis-graphic-line` le dé «Manage Actions access → Read» en GitHub
(otorgado a los consumidores actuales el 2026-09-26).

**Imports (entradas públicas):**

| Import | Contiene |
|---|---|
| `@efeoncepro/axis-tokens` | `efeonceGraphicLine`, `axisMotion`, `axisAdvertising`, … (tipo `EfeonceGraphicLine`) |
| `@efeoncepro/axis-ui-contracts` | todo el contrato (`export *` de `graphic-line.js` y `email-signature.js`) + selección colaborativa |
| `@efeoncepro/axis-graphic-line` | pintor, recetas, checks, respuesta, movimiento, assets (no incluye React ni el Web Component) |
| `@efeoncepro/axis-graphic-line/react` | `AxisOrbit`, `AxisOrbitProps` (peer `react >= 18`) |
| `@efeoncepro/axis-graphic-line/element` | `defineAxisOrbitElement`, `renderAxisOrbit` |
| `@efeoncepro/axis-graphic-line/motion` | `ORBIT_MOTION_CSS`, `ORBIT_MOTION_TIMELINE`, `ORBIT_MOTION_TOTAL_MS`, `orbitMotionFrameCss` |
| `@efeoncepro/axis-brand-assets` | ids, `findBrandAsset`, `brandAssetUrl`, `AXIS_ORBIT_ASSETS`, `findOrbitAsset`, `orbitAssetUrl` |
| `@efeoncepro/axis-brand-assets/assets/*` | los archivos (`efeonce-logo-negative.svg`, `orbit/orbit-growth-dark-social.png`, …) |

---

## 2. Tokens `efeonceGraphicLine`

Archivo: `axis-design-system/packages/tokens/src/tokens.ts`. `status: 'canonical'`. Toda medida en px de la órbita
está expresada **por cada 794 px de ancho** de lienzo (`orbit.baseWidthPx`).

### 2.1 `color`

| Clave | Valor | Uso |
|---|---|---|
| `dark` | `#001a33` | fondo oscuro de Efeonce |
| `teal` | `#36c8bf` | acento de Efeonce sobre oscuro |
| `halo` | `#72ded8` | halo y anillo tenue sobre oscuro |
| `navy` | `#023c70` | texto y anillo sobre papel |
| `tealDark` | `#0e8c82` | acento de Efeonce sobre claro: gráfico y texto ≥ 24 px, nunca texto < 24 px (D1, ver §2.4) |
| `paper` | `#f7f8f6` | fondo claro |
| `productInk` | `#091951` | fondo oscuro de las líneas que no son Growth |

### 2.2 `lines` (líneas de servicio — deciden acento y palabra del eslogan)

| `key` | `name` | `scope` | `sloganWord` | `product` | `platform` | `darkBg` | `accentOnDark` | `accentOnLight` |
|---|---|---|---|---|---|---|---|---|
| `growth` | Efeonce | Marca madre · Growth Strategy & Measurement | Growth | `greenhouse` | — | `#001a33` | `#36c8bf` | `#0e8c82` |
| `brand` | Servicios creativos | Creative Services | Brand | `globe` | — | `#091951` | `#ff6500` | `#bb1954` |
| `engine` | Web, infraestructura, SEO y medición | Digital Services & Engineering | Engine | `wave` | — | `#091951` | `#0375db` | `#0375db` |
| `voice` | Medios y distribución | Media & Distribution | Voice | `reach` | — | `#091951` | `#f83902` | `#f83902` |
| `revenue-hubspot` | RevOps y CRM · HubSpot | RevOps & CRM | Revenue | — | `hubspot` | `#091951` | `#e86bd0` | `#8e1b82` |
| `revenue-salesforce` | RevOps y CRM · Salesforce | RevOps & CRM | Revenue | — | `salesforce` | `#091951` | `#2fb8ff` | `#00739e` |

Los acentos de RevOps son tonos propios de Efeonce, nunca los colores de marca del partner. El magenta de HubSpot quedó
aprobado tal cual (D2, 2026-09-26); el naranja de HubSpot no se usa.

### 2.3 `family` (productos; compatibilidad y mapa de portafolio)

| `key` | `name` | `role` | `verb` | `sloganWord` | `darkBg` | `accentOnDark` | `accentOnLight` |
|---|---|---|---|---|---|---|---|
| `efeonce` | Efeonce | Marca principal | Hacer | Growth | `#001a33` | `#36c8bf` | `#0e8c82` |
| `globe` | Globe | Creative Studio | Crear | Brand | `#091951` | `#ff6500` | `#bb1954` |
| `wave` | Wave | Búsqueda, web y medición | Aparecer | Engine | `#091951` | `#0375db` | `#0375db` |
| `reach` | Reach | Medios y distribución | Llegar | Voice | `#091951` | `#f83902` | `#f83902` |

### 2.4 Contrastes medidos (WCAG 2.x, calculados desde estos tokens)

| Par | Ratio | Lectura |
|---|---|---|
| acento Growth `#36c8bf` / `#001a33` | 8,51:1 | gráfico ✓ |
| acento Growth claro `#0e8c82` / papel | 3,87:1 (4,12 sobre blanco) | gráfico y texto ≥ 24 px; **nunca texto < 24 px** |
| `#36c8bf` sobre blanco | 2,06:1 (1,94 sobre papel) | **prohibido en claro** |
| Brand `#ff6500`/`#091951` · `#bb1954`/papel | 5,60 · 5,83 | |
| Engine `#0375db`/`#091951` · /papel | 3,60 · 4,31 | |
| Voice `#f83902`/`#091951` · /papel | 4,39 · 3,53 | |
| RevOps HubSpot `#e86bd0`/`#091951` · `#8e1b82`/papel | 5,86 · 7,50 | |
| RevOps Salesforce `#2fb8ff`/`#091951` · `#00739e`/papel | 7,42 · 5,00 | |
| blanco / `#001a33` · blanco / `#091951` | 17,56 · 16,54 | texto ✓ |
| navy `#023c70` / papel | 10,47 | texto ✓ |
| «Empower your» claro `#6b6b6b` / papel · oscuro `#e2e2e2` / `#001a33` | 5,00 · 13,56 | ✓ (el `#848484` viejo daba 3,51) |
| burbuja horneada clara `#848484` / blanco · oscura `#6f89a2` / `#001a33` | 3,74 · 4,83 | |

`tokens.test.ts` fija los redondeos a un decimal (8,5 · 3,9 · 2,1 · Globe 5,6/5,8 · Wave 3,6/4,3 · Reach 4,4/3,5 ·
HubSpot 5,9/7,5 · Salesforce 7,4/5 · lead claro 5).

**`accentContrast`** (axis-tokens 0.3.5; decisión D1 del 2026-09-26):

| Clave | Valor | Significa |
|---|---|---|
| `graphicMin` | 3 | arco, esfera y halo en el acento: ≥ 3:1 contra su fondo |
| `largeTextMin` · `largeTextMinPx` | 3 · 24 | texto en el acento sólo desde 24 px, con ≥ 3:1 |
| `smallTextMin` | 4,5 | texto de menos de 24 px: ≥ 4,5:1 |
| `accentInSmallText` | `false` | el acento nunca en texto de menos de 24 px (ahí navy `#023c70` sobre claro, blanco sobre oscuro) |

Todos los acentos de la tabla pasan 3:1 contra su fondo (los más bajos: Voice/papel 3,53, Engine/`#091951` 3,60,
Growth/papel 3,87); Engine y Voice conservan sus colores. Lo verifica el chequeo del adapter `accent-text-min-size`.

### 2.5 `sphere` (la esfera como punto final)

| Clave | Valor |
|---|---|
| `diameterEm` | 0,2 (de la palabra dominante, sobre la línea base) |
| `isotypeHeightRatio` | 0,24 (24 % del alto del isotipo) |
| `minScreenPx` / `minPrintMm` | 4 px (diámetro) / 1,5 mm — bajo eso se omite |
| `soloClearanceDiameters` | 2 (aire alrededor de la esfera sola) |
| `opticalGapEm` | `r` −0,02 · `a` 0,03 · `s` 0,03 · `i` 0,03 · `z` 0,03 · `o` 0,035 · `n` 0,035 · `e` 0,035 · `d` 0,035 · `x` 0,02 · `t` 0 |
| `defaultGapEm` | 0,03 (cualquier otra última letra) |

### 2.6 `orbit` (por cada 794 px de ancho)

| Clave | Valor | Cómo lo usa el contrato |
|---|---|---|
| `baseWidthPx` | 794 | `scale = ancho / 794` |
| `ringStrokePx` | 1 | anillo = `max(1, 1 × scale)` |
| `ringOpacity` | `[0.16, 0.22]` | 0,16 por defecto; 0,22 sólo con órbitas interiores o satélites |
| `innerOrbits` | `[{ radiusRatio 0.72, opacity 0.11 }, { radiusRatio 0.44, opacity 0.06 }]` | sólo en órbita vacía |
| `arcStrokePx` | `[1.6, 2]` | arco de acento 1,6 × scale; arco de satélites 2 × scale |
| `arcSweepDeg` | `withSphere [40, 60]` · `withSatellitesMax 140` | acento = 50° (el medio); satélites = 140° |
| `sphereRadiusPx` | `[3.5, 4]` | esfera = 3,5 × scale |
| `radiusRatio` | `portraitOfWidth 0.3` · `landscapeOfHeight 0.4` | radio sobre lienzo: vertical 30 % del ancho; horizontal (ancho ≥ alto) 40 % del alto |
| `halo` | `[{0, 0.13}, {0.6, 0.03}, {1, 0}]` | degradé radial en el acento |
| `haloRadiusRatio` | 1,86 | radio del halo = 1,86 × radio del anillo |
| `socialMaxWidthPx` · `socialMultiplier` | 1200 · 1,75 | con `channel: 'social'` y ancho ≤ 1200, `scale ×= 1,75` |
| `satelliteDiscPx` | 30 | disco blanco del satélite × scale |
| `sphereRing` | `radiusPx 9` · `opacity 0.4` | anillo propio de la esfera, **reservado a «en vivo»** (D8): el eco del pulso de impacto en movimiento y el estado activo / «en el aire». Desde el contrato 0.3.1 exige `live: true` |
| `haloOnLightScale` | 0,5 (axis-tokens 0.3.5; D7) | en superficie clara, el resolver multiplica la opacidad de cada parada de `halo` por este factor; el render del motion lee el mismo token |
| `ringAirRatio` | 0,12 | aire entre el objeto rodeado y el anillo (fracción del radio del objeto) |

Valores resultantes típicos: 1080 social → anillo 2,38 · arco 3,81 · esfera 8,33 · scale 2,3804. 1920 screen → anillo
2,42 · arco 3,87 · esfera 8,46 · scale 2,4181. 794 print → anillo 1 · arco 1,6 · esfera 3,5.

### 2.7 `trajectory` (qué significa el arco)

| Clave | Valor |
|---|---|
| `origin` · `direction` | `'top'` (las 12) · `'clockwise'` |
| `measure` | `encoding 'sphere-position'`, `degreesPerUnit 360`, `trailDeg 50`, `trailNeverBeforeOrigin true`, `originMark 'tick'`, `zero 'sphere-at-origin'`, `complete 'sphere-back-at-origin'`, `sourceRequired true`, `label 'percent-integer'` |
| `progress` | `encoding 'accumulated-sections'`, `cover 'accent'`, `complete 'full-orbit-sphere-on-top'` |
| `accent` | `start 'upper-start'`, `sweepDeg [40, 60]`, `pairsWithNumber false` |
| `satellites` | `start 'start'`, `maxSweepDeg 140` |

### 2.8 `lens` (la lente)

| Clave | Valor |
|---|---|
| `subjectCircleRatio` · `subjectAirRatio` | 0,55 · 0,15 (el sujeto cabe en un círculo del 55 % del lado corto con 15 % de aire) |
| `zoom` | 1,25 (adentro del círculo) |
| `outside` | `grayscale 1`, `contrast 1.1`, `brightness 0.5`, `multiplyColor '#001a33'`, `multiplyOpacity 0.8` |
| `anatomy` | `ringStrokePx 1.4`, `ringOpacity 0.28`, `arcStrokePx 2.8`, `arcSweepDeg 50`, `sphereRadiusPx 5.6` — escalado **sólo por ancho** (sin multiplicador social) |
| `accentSphereDiameterRatio` 0,14 · `accentSphereGapRatio` 0,02 | **`@deprecated`** (dibujaban un disco suelto); no usar |

### 2.9 `spotlight` (el foco)

| Clave | Valor |
|---|---|
| `outside` | `grayscale 0.85`, `brightness 0.32`, `multiplyColor '#021a33'`, `multiplyOpacity 0.6` |
| `inside` | `brightness 1.12`, `contrast 1.05` |
| `edgeSoftStart` | 0,78 (el borde de la luz se suaviza desde el 78 % del radio) |
| `ringAirRatio` · `ringOpacity` | 0,1 · 0,22 (anillo concéntrico a 1,1 × el radio de la luz) |
| `lamp` | `startDeg 265`, `sweepDeg 50` (la esfera en la punta es la lámpara) |

### 2.10 `portrait` (órbita alrededor de una foto de persona; caja de 208 px)

| Clave | Valor (fracción del lado de la caja) |
|---|---|
| `ringRadiusOfSize` | 96/208 |
| `photoRadiusOfSize` | 78/208 |
| `ringStrokeOfSize` · `arcStrokeOfSize` · `sphereRadiusOfSize` | 2/208 · 4/208 · 7/208 |
| `arcStartDeg` · `arcSweepDeg` | 200 · 50 (arco de 200° a 250°) |
| `ringOpacity` | `onLight 0.22` (navy) · `onDark 0.4` (halo) |

### 2.11 `pieces` (piezas de formato fijo medidas una por una; las recetas las reproducen)

Grados: 0° = las 3, sentido horario. `ring` = centro y radio en px del lienzo.

| Pieza | Lienzo | Anillo `cx, cy, r` | trazo · opacidad | Arco (grados · trazo) | Esfera r |
|---|---|---|---|---|---|
| `lens.wall` | 1920×1080 | 1150, 420, 392 | 3,39 · 0,28 | 200→250 · 6,77 | 13,54 |
| `lens.deck-cover` | 1920×1080 | 1420, 600, 403,2 | 3,39 · 0,28 | 200→250 · 6,77 | 13,54 |
| `lens.post` | 1080×1350 | 548, 600, 263,2 | 1,9 · 0,28 | 200→250 · 3,81 | 7,62 |
| `lens.story` | 1080×1920 | 420, 760, 358,4 | 1,9 · 0,28 | 200→250 · 3,81 | 7,62 |
| `lens.campaign-post` | 1080×1350 | 540, 500, 384 | 2,38 · 0,28 | 195→250 · 3,81 | 8,33 |
| `lens.linkedin` | 1200×627 | 860, 280, 246 | 1,5 · 0,28 | 195→250 · 2,4 | 5,25 |
| `spotlight.photo` | 1920×1080 | luz 1150, 420, r 360; anillo r 396 | 2 · 0,22 | 265→315 · 4 | 8,8 |
| `spotlight.event` | 1920×1080 | luz 960, 470, r 380; anillo r 418 | 2,11 · 0,22 | 250→300 · 4,22 | 9,29 |
| `deck.cover` | 1920×1080 | 1500, 380, 340 | 1,9 · 0,16 | 200→250 · 3,04 | 6,65 |
| `deck.section` | 1920×1080 | 1420, 540, 300 | 2,2 · 0,14 | desde las 12 · 3,96 | 7,7 |
| `deck.content` | 1920×1080 | 1760, 130, 40 | 2,2 · 0,14 | desde las 12 · 3,96 | 7,7 |
| `deck.close` | 1920×1080 | 960, 330, 200 | 2,2 · 0,16 | vuelta completa · 3,96 | 7,7 |

En la lente, la foto es el anillo / (1 + 0,12).

### 2.12 `signature` (firma de una pieza)

| Clave | Valor |
|---|---|
| `align` · `anchor` | `'center'` · `'bottom-center'` |
| `marginOfShortSide` | 0,09 (margen inferior = 9 % del lado corto) |
| `defaultMode` · `urlBubbleRequires` | `'logo'` · `'brand-in-scene'` |
| `widthOfShortSide` | `default 0.2` · `landscape16x9 0.25` (16:9 si `|w/h − 16/9| < 0,02`) |
| `minContrast` | 4,5 |

### 2.13 `urlBubble`

| Clave | Valor |
|---|---|
| `blendMode` · `source` | `'luminosity'` · `#848484` (gris fuente; W3C SetLum) |
| `bakedOnLight` · `bakedOnDark` | `#848484` · `#6f89a2` |
| `assets` | `{ light: 'url-lum-light.svg', dark: 'url-lum-dark.svg' }` — nombres **legados** de Greenhouse; en el paquete se usan los ids `url-bubble-source` / `url-bubble-baked-light` / `url-bubble-baked-dark` |
| `minContrast` | 4,5 (axis-tokens 0.3.5; D4) — umbral de la burbuja sobre los píxeles finales |

### 2.14 `slogan`, `state`, `type`, `logo`, `isotype`

| Grupo | Valores |
|---|---|
| `slogan` | `lead 'Empower your'` · `leadColor { onLight '#6b6b6b', onDark '#e2e2e2' }` · `forms ['lockup', 'standalone']` · `roles ['close']` · `uppercaseAllowed false` · `sphereAllowed false`. La palabra final sale de `lines[].sloganWord` y va en el acento |
| `state` | `free 'ring'` · `busy 'sphere'` · `trafficLightColorsAllowed false` |
| `type.answer` | Bricolage Grotesque 760, tracking −0,035em, `minRatioOverQuestion 3`, `maxWords 3` |
| `type.question` | Poppins 300 |
| `type.text` | Poppins 400/500 |
| `logo` | `clearSpace 'x = ship height'` · mín 96 px / 25 mm · recomendado ≥ 160 px |
| `isotype` | `clearSpace 'x = isotype sphere diameter'` · mín 24 px / 8 mm · `avatarFillRatio 0.6` |

Pesos del eslogan (SSOT Greenhouse `src/config/efeonce-brand.ts`): *Empower* Poppins 800 itálica · *your* 800 ·
palabra final 900 itálica.

### 2.15 `emailSignature` (firma de correo v3.1; `team` desde tokens 0.3.4)

| Clave | Valor |
|---|---|
| `maxWidthPx` | 460 |
| `zones` (orden fijo) | `portrait`, `area-mark`, `identity`, `contact`, `links`, `sphere-divider`, `brand-close`, `section-rule`, `endorsement` |
| `required` | `identity`, `contact`, `sphere-divider`, `brand-close` |
| `portrait` | `sizePx 96`, `geometry 'portrait'` |
| `team.areaMark` | `sizePx 96`, geometría `portrait`, `disc { dark '#0b2b4a', light '#eef3f7' }`, `icon { family 'tabler-outline', strokeWidth 1.5, sizeOfBox 72/208, color 'name' }` |
| `team.areas` | `talent` (Talent · Personas y talento · `users-group`), `finance` (Finance · Finanzas y facturación · `coins`), `commercial` (Commercial · Comercial y alianzas · `briefcase`); `contact ['mailbox']`, `personalLinks false` |
| `spacingPx` | `contactToDivider 18`, `dividerToBrandClose 14`, `brandCloseToSectionRule 20`, `sectionRuleToEndorsement 16` |
| `surfaces.dark` | bg `#001a33`, name `#ffffff`, sub `#9fb3c8`, text `#e6edf3`, line `#1d3a57`, padding `[22, 24]` |
| `surfaces.light` | bg `#ffffff`, name `#023c70`, sub `#3d4f63`, text `#023c70`, line `#dce2e8`, padding `[0, 0]` |
| `type` | name Bricolage 800 22 px, tracking −0,3 px, `accentPeriod true`; role/contact Poppins 400 13 px; endorsementLabel Poppins 500 11 px; fallback `Arial, Helvetica, sans-serif` |
| `icons` | Tabler outline, trazo 1,75, contacto 14 px, social 18 px, color `line-accent` (PNG 3×) |
| `sphereDivider` | `count 1`, `strokePx 1`, `spherePx 9`, color `surface-line`, esfera `line-accent` |
| `sectionRule` | `strokePx 1`, `sphere false`, `surface-line`, sólo antes de `endorsement` (borde superior de celda) |
| `endorsement` | label «Partner oficial de», ≤ 10 partners, ≤ 5 por fila, fila 26 px, gap 8, labelGap 10, `space-between`, monocromo `onDark '#7c92aa'` / `onLight '#8a95a2'`, área de tinta 430 px², caja máx 80×24, `baked-single-image`, `claimStatuses ['active', 'accepted', 'declared']` |
| `reply` | `images false`, `form 'single-line'` |
| `closingPhraseAllowed` | `false` |

### 2.16 `brandClose` (cierre de video de 4,5 s)

`totalMs 4500`, `reducedMotion 'final-frame'`. Tramos: `ring` 0–500 · `arc` 400–1400 · `sphere-settle` 1400–1700 ·
`halo` 1200–2000 · `logo` 1900–2500 · `slogan` 2500–3000.

### 2.17 `motion` (lenguaje de movimiento; tokens ≥ 0.3.3)

| Clave | Valor |
|---|---|
| `principles` | `slow-fast-slow`, `arrive-with-impact`, `one-protagonist-at-a-time`, `no-speed-jump-on-handoff`, `real-motion-blur-only-when-fast`, `official-geometry-only` |
| `curves` | `arrive 'emphasized'`, `transform 'standard'`, `exit 'emphasizedAccelerate'` |
| `overshoot` | `default 1.2`, `ship 0.9`, `sphereBirth 2`, `letters 1.6` |
| `pulse` | `rise 1.6`, `decay 3.2`, `gain 1.35`, `echo 0.55` |
| `impactScale` | 0,045 |
| `settle` | `damping 0.82`, `omega 11` (sobrepasa ≤ 1,5 %) |
| `wave` | `fromScale 1.02`, `toScale 1.5`, `fromStrokePx 9`, `toStrokePx 1.5`, `opacity 0.85`, `fadeExponent 1.6` |
| `halo` | `flashGain 1.4`, `endOpacity 0.55` |
| `letters` | `staggerMs 28`, `durationMs 420`, `outStaggerMs 30`, `travelPx 60` |
| `motionBlur` | `shutterDeg 180`, `subframes 5`, `previewSubframes 3` |
| `colorMix` · `cameraZoom` | `'oklab'` · `'log'` |
| `layout` | `heroRingOfShortSide { wide 0.78, square 0.8, tall 0.84 }`, `heroCenterYOfHeight 0.47`, `logoOfShortSide { wide 0.5, square 0.56, tall 0.66 }`, `logoCenterYOfHeight 0.46`, `sloganOfLogo 0.64`, `sloganGapOfFont 1.35` |
| `sound` | `sampleRateHz 48000`, `bitDepth 24`, `peakDbfs -1`, `fadeOutMs 450` |
| `pieces.reveal` | 3600 ms; blur `[1250,1900]`, `[2050,2750]`; tramos (ms): ringOpacity 0–350, ringBreath 0–450 (desde 0,94), arc 150–800, sphereBirth 150–380, tilt 800–1400, thick 850–1400, color 850–1300, planet 1050–1400, planetSettle 1300–1700, gapsPlanet 1100–1400, ship 1250–1900, ringSwapMs 1900, swap 1950–2030, bump 1870–2300 y 2700–3050, wave 1870–2450, flash 1870–2350, camera 2050–2750, lettersFromMs 2350, slogan 2650–3050, halo 900–1850, haloEnd 2050–2750 |
| `pieces.open` | 2400 ms; blur `[350,950]`, `[1150,1550]`; ringBreathTo 1,18, ringBreath 1650–2250, arcOpen 1650–2250, sphereBirthPulse 2150–2400 (gain 0,6), tilt 1250–1850, thick 1250–1800, color 1300–1850, planet 1200–1550, gapsPlanet 1200–1450, ringSwapMs 1005, pullback 1000–1150 (0,035), ship 1150–1550, swap 950–1000, bump 930–1200 y 1150–1450 (gains 0,5 y 0,6), wave 1150–1700, flash 1150–1550, camera 350–950, lettersOut 150–450, haloEnd 350–950 |
| `pieces.sting` | 1600 ms; blur `[100,600]`, `[720,1250]`; ringOpacity 0–180, ringBreath 0–300 (desde 0,9), ship 100–600, ringSwapMs 600, swap 630–700, bump 580–950 y 1180–1450, wave 580–1100, flash 580–1000, camera 720–1250, lettersFromMs 930, halo 0–500, haloEnd 720–1250 |

### 2.18 `axisMotion.ease` (curvas que usan motion y brandClose)

| Nombre | Valor |
|---|---|
| `emphasized` | `cubic-bezier(0.2, 0, 0, 1)` |
| `standard` | `cubic-bezier(0.4, 0, 0.2, 1)` |
| `emphasizedAccelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)` |
| `linear` | `linear` |

`axisMotion.reducedMotion = 'prefers-reduced-motion: reduce'`; duraciones `instant 75ms`, `short 150ms`,
`standard 200ms`, `medium 300ms`, `long 400ms`, `extended 600ms`.

---

## 3. Contrato `efeonce.graphic-line-orbit`

Archivo: `packages/contracts/src/graphic-line.ts`. `version '0.3.0'`, `lifecycle 'stable'`, owner
`efeonce-brand-studio`. Manifest: `axis.graphic-line-orbit-composition.v1`. **0.3.1 publicado (contracts 0.3.5)** (en
`axis-ui-contracts` 0.3.5): `orbit.live`, el código `sphere-ring-only-live`, el halo a `haloOnLightScale` en claro y el
chequeo `accent-text-min-size`.

API: `validateGraphicLineIntent(intent) → AxisGraphicLineIssue[]` (`{ code, elementId? }`) ·
`resolveGraphicLineIntent(intent) → manifest` (lanza `AxisGraphicLineValidationError` con `.issues`; mensaje
`Invalid AXIS graphic line intent: code(id), …`) · tipo `AxisResolvedGraphicLine`.

### 3.1 Enumeraciones exportadas

| Constante | Valores |
|---|---|
| `AXIS_GRAPHIC_LINE_SERVICE_LINES` | `growth`, `brand`, `engine`, `voice`, `revenue-hubspot`, `revenue-salesforce` |
| `AXIS_GRAPHIC_LINE_BRANDS` (compatibilidad) | `efeonce`→growth, `globe`→brand, `wave`→engine, `reach`→voice |
| `AXIS_GRAPHIC_LINE_SURFACES` | `dark`, `light` |
| `AXIS_GRAPHIC_LINE_CHANNELS` | `social`, `screen`, `deck`, `print` |
| `AXIS_GRAPHIC_LINE_POSITIONS` → `AXIS_GRAPHIC_LINE_POSITION_DEGREES` | `top` −90 · `upper-end` −45 · `end` 0 · `lower-end` 45 · `bottom` 90 · `lower-start` 135 · `start` 180 · `upper-start` −135 (0 = derecha/este, sentido horario) |
| `AXIS_GRAPHIC_LINE_REGIONS` | `upper-start`, `upper-center`, `upper-end`, `center-start`, `center`, `center-end`, `lower-start`, `lower-center`, `lower-end` |
| `AXIS_GRAPHIC_LINE_TARGET_KINDS` | `logo`, `isotype`, `lens`, `object`, `text-group` |
| `AXIS_GRAPHIC_LINE_ARC_SPANS` | `accent`, `satellites`, `none` |
| `AXIS_GRAPHIC_LINE_ELEMENT_KINDS` | `orbit`, `measure`, `progress`, `lens`, `spotlight`, `family-map`, `url-bubble`, `voice`, `logo-inline`, `signature`, `slogan`, `state`, `brand-close` |
| `AXIS_GRAPHIC_LINE_MEDIA` | `web`, `email`, `pdf`, `print` |
| `AXIS_GRAPHIC_LINE_CLOSE_FORMATS` | `16x9`, `1x1`, `9x16` |

Elementos **con anillo** (cuentan para «un anillo por pieza»): `orbit`, `measure`, `progress`, `lens`, `spotlight`,
`family-map`, `brand-close`.

### 3.2 `canvas` del intent

`{ width, height, line?, brand?, surface?, channel? }`. Defaults: `brand 'efeonce'`, `line` = la de `brand`
(→ `growth`), `surface 'dark'`, `channel 'screen'`. `line` y `brand` contradictorios → `brand-line-mismatch`.

### 3.3 Campos por tipo de elemento (todos llevan `id` único)

| `kind` | Campos (✱ obligatorio) | Defaults del resolver |
|---|---|---|
| `orbit` | `targetId?` + `targetKind?` **o** `region?`; `arc?: { start?, span? }`; `innerOrbits?`; `halo?`; `sphereRing?`; `live?` (boolean, desde 0.3.1) | sin target → `region 'center'`; `targetKind 'object'`; `start 'upper-start'`; `span 'accent'`; `innerOrbits false`; halo sí salvo `halo: false`; `sphereRing` no; `sphereRing: true` exige `live: true` (0.3.1) |
| `measure` | ✱`targetId`, ✱`value` (0–1), ✱`source`, `label?`, `start?` (sólo `'top'`) | origen las 12 |
| `progress` | ✱`sections` (entero ≥ 1), ✱`current` (0…sections), `region?` o `targetId?` | `region 'upper-end'`; con `targetId`, aire 0 |
| `lens` | ✱`photoId`, ✱`alt`, `region?`, `subjectRegion?`, `ring?`, `accentSphere?` (posición o `'none'`) | `region 'center'`, `subjectRegion 'center'`, anillo sí salvo `ring: false`, `accentSphere 'upper-start'` |
| `spotlight` | ✱`photoId`, ✱`alt`, `subjectRegion?` | `subjectRegion 'center'` (también ubica la luz) |
| `family-map` | ✱`center` (marca o `'greenhouse'`), ✱`satellites[]` (≥ 1, distintos del centro), `region?` | `region 'center'` |
| `url-bubble` | `medium?` | `'web'` |
| `voice` | ✱`questionId`, ✱`answerId`, `answerText?` | — |
| `logo-inline` | ✱`phraseId` | — |
| `signature` | `brandInScene?` (boolean), `medium?` | logo; `medium 'web'` |
| `slogan` | ✱`form` (`lockup`/`standalone`), ✱`role: 'close'` | — |
| `state` | ✱`value` (`free`/`busy`), ✱`labelId` | — |
| `brand-close` | ✱`format` (`16x9`/`1x1`/`9x16`) | — |

### 3.4 Códigos de validación (todos)

| Código | Se dispara cuando |
|---|---|
| `canvas-size-required` | falta `canvas` o `width`/`height` no son > 0 |
| `brand-invalid` · `line-invalid` · `surface-invalid` · `channel-invalid` | valor fuera de su enumeración |
| `brand-line-mismatch` | `brand` y `line` no coinciden (p. ej. `globe` + `engine`) |
| `element-required` | `elements` vacío |
| `element-id-required` · `duplicate-element-id` | id vacío o repetido |
| `element-kind-invalid` | `kind` desconocido (el elemento se salta) |
| `region-invalid` | `region` fuera de la grilla 3×3 |
| `orbit-target-id-empty` | `targetId` presente pero vacío |
| `orbit-target-kind-invalid` | `targetKind` fuera de la lista |
| `orbit-target-and-region-exclusive` | `orbit` con `targetId` y `region` a la vez |
| `arc-start-invalid` · `arc-span-invalid` | posición o span inválidos (también `measure.start` inválido) |
| `inner-orbits-never-around-content` | `orbit` con `targetId` e `innerOrbits: true` |
| `measure-target-required` · `measure-value-out-of-range` · `measure-source-required` | sin target; valor no finito o fuera de 0–1; sin fuente |
| `measure-origin-is-top` | `measure.start` distinto de `'top'` |
| `progress-sections-invalid` · `progress-current-out-of-range` | no entero / < 1; `current` fuera de 0…sections |
| `photo-id-required` · `photo-alt-required` · `subject-region-invalid` | lente o foco sin foto, sin `alt` o con región inválida |
| `accent-sphere-invalid` | `lens.accentSphere` no es posición ni `'none'` |
| `family-center-invalid` · `family-satellites-required` · `family-satellite-invalid` | centro desconocido; sin satélites; satélite desconocido o igual al centro |
| `url-bubble-medium-invalid` | `medium` inválido |
| `social-signs-with-signature-not-url-bubble` | `url-bubble` con `channel: 'social'` |
| `signature-brand-in-scene-invalid` · `signature-medium-invalid` | `brandInScene` no booleano; `medium` inválido |
| `slogan-form-invalid` · `slogan-closes-only` | forma inválida; `role` distinto de `close` |
| `state-value-invalid` · `state-label-required` | valor no es `free`/`busy`; sin `labelId` |
| `brand-close-format-invalid` · `brand-close-needs-motion-channel` | formato inválido; `channel: 'print'` |
| `voice-pair-required` · `voice-answer-too-long` | falta pregunta o respuesta; `answerText` de más de 3 palabras |
| `logo-inline-phrase-required` | sin `phraseId` |
| `single-ring-per-piece` | más de un elemento con anillo |
| `single-voice-pair-per-piece` | más de un `voice` |
| `single-signature-per-piece` | más de un `signature` |
| `signature-already-decides-url-bubble` | `signature` y `url-bubble` en la misma pieza |
| `sphere-ring-only-live` | `orbit` con `sphereRing: true` sin `live: true` (contrato 0.3.1; D8) |

### 3.5 El manifest

Raíz: `{ schema, contract: { id, version }, canvas: { width, height, line, product, platform, surface, channel, scale,
socialMultiplierApplied }, palette: { accent, background, ring, halo }, elements[], adapterChecks[] }`.

- `scale = (width / 794) × (1,75 si channel === 'social' y width ≤ 1200)`, redondeado a 4 decimales.
- `palette.accent` = acento de la línea para la superficie; `background` = `lines[].darkBg` (oscuro) o `paper` (claro);
  `palette.ring` y `palette.halo` = `#72ded8` (valor de referencia; el color real del anillo va en cada `ring.color`:
  halo sobre oscuro, navy sobre claro).

| `kind` | Campos resueltos |
|---|---|
| `orbit` | `placement` (`{ target: { id, kind }, radius: { of: 'target-radius', airRatio: 0.12 } }` o `{ region, radius: { ratio, of } }`), `ring { strokePx, opacity, color, innerOrbits }`, `innerOrbits`, `arc { startDeg, sweepDeg, strokePx, color, linecap, gradient }` o `null`, `trajectory`, `sphere { radiusPx, color, at: 'arc-end', ring }` o `null` (con satélites o `none`), `halo { radiusRatio, stops, color }` o `null` (desde 0.3.1, en superficie clara las opacidades de `stops` salen × `haloOnLightScale`) |
| `measure` | `placement` (target + aire 0,12), `value`, `source`, `label`, `ring`, `arc` (la **estela**: `startDeg = −90 + valor×360 − min(50, valor×360)`, `sweepDeg = min(50, valor×360)`), `sphere`, `originMark { deg: −90, color }`, `trajectory`, `halo: null` |
| `progress` | `placement` (región con radio de lienzo, o target con aire 0), `sections`, `current`, `ring`, `arc { startDeg −90, sweepDeg }` (portada 50°, si no `current/sections × 360`), `sphere`, `closed`, `originMark null`, `trajectory`, `halo null` |
| `lens` | `photo { id, alt, subjectRegion }`, `placement` (región), `subject { circleRatio, airRatio }`, `inside { zoom }`, `outside`, `ring` (anatomía: trazo `max(1, 1,4×w/794)`, opacidad 0,28, `airRatio 0.12`) o `null`, `arc` (50° centrado en `accentSphere`, trazo 2,8×w/794) o `null`, `sphere` (5,6×w/794) o `null` |
| `spotlight` | `photo`, `placement { region: subjectRegion }`, `outside`, `inside`, `edge { softStart }`, `ring` (opacidad 0,22, `airRatio 0.1`), `lamp { arc { startDeg 265, sweepDeg 50 }, sphere }` |
| `family-map` | `center`, `satellites[] { key, accent, discPx, assetId }` (Greenhouse: `assetId null`, `accent null`), `placement`, `ring` (opacidad 0,22), `innerOrbits: true`, `arc` (desde `start` = 180°, 140°, degradé, trazo 1,6×scale), `halo` |
| `url-bubble` | `medium`, `asset` (nombre legado), `assetId` (`url-bubble-source` en web; `url-bubble-baked-dark/light` fuera de web), `blend` (`'luminosity'` en web o `null`), `bakedColor`, `linkText 'efeoncepro.com'`, `urlAsTextForbidden true` |
| `voice` | `question { targetId, type, marker: 'ring' }`, `answer { targetId, type, marker: 'sphere-period', terminalSphere: 'part-of-text', sphereDiameterEm, gapEm, defaultGapEm }`, `minAnswerOverQuestionRatio 3`, `maxAnswerWords 3` |
| `logo-inline` | `phraseId`, `alignment 'baseline-and-x-height'`, `minLogoPx 96` |
| `signature` | `mode` (`logo`/`url-bubble`), `reason` (`default`/`brand-in-scene`), `align`, `anchor`, `marginOfShortSide`, `widthOfShortSide` (0,2 o 0,25 en 16:9), `minContrast 4.5`, `medium`, `assetId` (`efeonce-logo-negative`/`-positive` según superficie, o la burbuja), `blend` (`{ mode: 'luminosity', source: '#848484' }` sólo burbuja en web), `alt` (`'Efeonce'` o `'efeoncepro.com'`), `urlAsTextForbidden true` |
| `slogan` | `form`, `role`, `lead`, `word`, `wordColor`, `text` («Empower your Brand»), `fromOfficialFile true`, `uppercaseAllowed false`, `sphereAllowed false` |
| `state` | `value`, `marker` (`ring`/`sphere`), `labelId`, `color` (acento), `trafficLightColorsAllowed false` |
| `brand-close` | `format`, `totalMs`, `steps`, `reducedMotion`, `ring`, `sphere`, `halo`, `logoAssetId`, `slogan { lead, word, wordColor }` |

`trajectory` (en orbit, measure y progress): `{ meaning: 'measure'|'progress'|'accent'|'satellites'|'none', origin
('top' en measure/progress, si no null), direction 'clockwise', sweepDeg, value, valueLabel ('60 %' sólo en measure),
pairsWithNumber (true en measure/progress) }`.

### 3.6 `AXIS_GRAPHIC_LINE_ADAPTER_CHECKS` (el adapter los corre sobre lo que pintó)

`text-never-crosses-ring` · `ring-center-on-target-center` · `sphere-on-arc-end` · `lens-subject-inside-circle` ·
`url-as-bubble-never-text` · `decorative-svg-hidden-from-accessibility-tree` · `signature-centered` ·
`signature-min-contrast` · `orbit-never-over-subject-or-reserves` · `accent-arc-never-reads-as-data` ·
`answer-period-part-of-text` · `measure-shows-value-and-source` · `accent-text-min-size` (**contrato 0.3.1, en
publicación**; D1: ningún texto de menos de 24 px en el acento).

---

## 4. Contrato `efeonce.collaboration-selection`

Archivo: `packages/contracts/src/index.ts`. `version '0.3.0'`, **`lifecycle 'candidate'`**. Manifest
`axis.collaboration-selection-composition.v1`. Headless: el consumidor pinta cursores y selección.

**Intent:** `{ targetId, targetKind? ('text'|'object'|'group'), variant? ('eight-handles'|'four-corners'|'open-brackets'),
padding? ('compact'|'standard'|'open'), overlay? ('none'|'subtle'|'emphasized'), cursors[] }`.

| Cursor | Campos |
|---|---|
| local | `{ id, kind: 'local', targetId, anchor (8), orientation? ('screen-fixed' por defecto, o 'target-directed'), direction?, action? }` |
| colaborador actuando | `{ id, kind: 'collaborator', state?: 'acting', targetId, anchor (sólo esquinas), direction?, action?, label, participantKind ('person'|'role'|'department') }` |
| colaborador moviéndose | `{ id, kind: 'collaborator', state: 'moving', canvasRegion (grilla 3×3), direction?, action?: 'move', label, participantKind }` (sin `targetId` ni `anchor`) |

Anclas: `top-start`, `top-center`, `top-end`, `end-center`, `bottom-end`, `bottom-center`, `bottom-start`,
`start-center` (colaborador: sólo las cuatro esquinas). Direcciones (8): `north-west`, `north`, `north-east`, `east`,
`south-east`, `south`, `south-west`, `west`. Acciones: `point`, `select`, `drag`, `resize`, `rotate`, `move`.
Dirección por ancla: top-start→south-east, top-center→south, top-end→south-west, end-center→west,
bottom-end→north-west, bottom-center→north, bottom-start→north-east, start-center→east. Local `screen-fixed` →
siempre `north-west`.

**Resuelto:** `target { id, kind (default 'text'), bounds: 'rendered-group-including-terminal-sphere' }` ·
`selection { variant (default 'eight-handles'), padding (default 'standard'), paddingRatio, overlay (default 'subtle'),
overlayOpacity, overlayBlendMode: 'luminosity' }` · `cursors[]` con `direction`, `action` (default `point`), y en
colaboradores `attachment` (= dirección). Padding: compact 0,008/0,007 · standard 0,012/0,01 · open 0,018/0,015
(inline/block, fracción del ancho del lienzo). Overlay: none 0 · subtle 0,1 · emphasized 0,16.

**Códigos:** `target-id-required`, `selection-target-kind-invalid`, `selection-variant-invalid`,
`selection-padding-invalid`, `selection-overlay-invalid`, `cursor-required`, `cursor-id-required`, `duplicate-cursor-id`,
`cursor-target-required`, `cursor-target-mismatch`, `cursor-anchor-invalid`, `local-cursor-orientation-invalid`,
`cursor-direction-invalid`, `cursor-direction-orientation-mismatch`, `cursor-direction-anchor-mismatch`,
`cursor-action-invalid`, `rotate-action-requires-corner`, `collaborator-anchor-not-corner`,
`moving-cursor-canvas-region-required`, `moving-cursor-canvas-region-invalid`, `moving-cursor-must-not-target-selection`,
`moving-cursor-must-not-use-selection-anchor`, `collaborator-label-required`, `collaborator-participant-kind-required`,
`collaborator-participant-kind-invalid`.

Relación con la órbita: el `target.bounds` incluye la esfera final de una respuesta o titular de marca propia
(mismo principio que el check `answer-period-part-of-text`). Greenhouse lo consume en
`scripts/creative/layout-compiler/axis-advertising.mjs`, que exige la versión `0.3.0` del contrato.

---

## 5. Contrato `efeonce.email-signature`

Archivo: `packages/contracts/src/email-signature.ts`. `version '0.3.0'`, `lifecycle 'stable'` (en
`axis-ui-contracts` ≥ 0.3.2; variante `team` ≥ 0.3.4). Manifest `axis.email-signature-composition.v1`.

**Intent:** `{ variant: 'full'|'team'|'reply', surface? (default 'dark'), line? (default 'growth'), zones[] (orden
canónico), area? ('talent'|'finance'|'commercial'; obligatoria en team, permitida en reply de un equipo), partners?
[{ id, name, claimStatus }], sectionRuleSphere?, closingPhrase? }`.

**Códigos:** `variant-invalid`, `surface-invalid`, `line-invalid`, `closing-phrase-belongs-to-body`, `zone-invalid`,
`sphere-divider-exactly-once`, `zone-duplicate`, `area-invalid`, `area-only-for-team`, `reply-is-text-only`,
`zone-required`, `team-area-required`, `team-has-no-portrait`, `area-mark-only-for-team`, `zones-out-of-order`,
`endorsement-requires-section-rule`, `section-rule-only-before-endorsement`, `section-rule-never-carries-sphere`,
`endorsement-partners-required`, `endorsement-too-many-partners`, `endorsement-partner-duplicate`,
`endorsement-partner-name-required`, `endorsement-partner-claim-not-allowed`, `partners-without-endorsement-zone`.

Estados que **no** permiten decir «partner» (`AXIS_EMAIL_SIGNATURE_UNCLAIMABLE_STATUSES`): `registered`, `applied`,
`pending`, `provider-in-use`, `blocked`, `not-started`.

**Resuelto (full/team):** `variant`, `surface`, `line`, `sloganWord`, `maxWidthPx`, `paddingPx`, `palette`
(colores de la superficie + `accent`), `type`, `icons`, `portrait` (`{ sizePx: 96, …portrait }` o null), `areaMark`
(team: disco, ícono, geometría portrait, área), `zones[{ zone, gapBeforePx }]`, `sphereDivider` (con `color` =
línea de la superficie y `sphereColor` = acento), `sectionRule`, `endorsement` (`rows` balanceadas, `tone`, `alt`
«Partner oficial de A, B y C», …), `builderChecks`. **Reply:** `form 'single-line'`, `images false`, `area`, `type`,
`palette`, `zones`.

`splitEndorsementRows(partners, maxPerRow = 5)` → filas balanceadas (9 → 5+4, 7 → 4+3).

`AXIS_EMAIL_SIGNATURE_BUILDER_CHECKS`: `renders-without-web-fonts`, `renders-at-390`, `section-rule-is-cell-border`,
`endorsement-strip-single-image-with-alt`, `endorsement-monochrome-single-tone`, `endorsement-equal-optical-weight`,
`no-closing-phrase`, `images-hosted-on-public-url`.

Imágenes publicadas: `https://storage.googleapis.com/efeonce-group-axis-public-media/email-signature/v3.1/`
(`shared/<dark|light>/`, `people/<persona>-<dark|light>.png`, `areas/<área>-<dark|light>.png`). Generador vigente en
Greenhouse: `ai-generations/2026-09-26_firma-partners/build4.mjs` (`HOST_BASE=…`, `AREA=<área>`).

---

## 6. `@efeoncepro/axis-brand-assets`

58 SVG oficiales sellados con SHA-256 desde 0.4.2 (19 hasta 0.3.6; 25 desde 0.4.0, que suma la marca de Insights y su lockup; 0.4.2, **publicado el 2026-09-29, AXIS `main` `7f9c8bb`**, suma 33 de las submarcas SEO/AEO) (`src/manifest.ts`, generado por `scripts/seal.mjs`) + 48 órbitas estáticas.
No incluye fuentes, fotos, el logo ni la marca de Greenhouse, ni el archivo del eslogan.

| id | kind | surface | variant | aspectRatio (alto/ancho) |
|---|---|---|---|---|
| `efeonce-logo-positive` / `-negative` | logo | light / dark | positive / negative | 0,235 |
| `efeonce-isotype-positive` / `-negative` | isotype | light / dark | | 0,7095 |
| `globe-logo-*` · `globe-isotype-*` | | | | 0,4925 · 1,1109 |
| `wave-logo-*` · `wave-isotype-*` | | | | 0,4114 · 0,5558 |
| `reach-logo-positive` · `reach-logo-negative` · `reach-isotype-*` | | | | 0,3128 · 0,3115 · 1,0143 |
| `insights-logo-*` · `insights-isotype-*` (desde 0.4.0) | | | | 0,2906 · 3,4231 |
| `insights-lockup-positive` / `-negative` (desde 0.4.0) | **lockup** | light / dark | positive / negative | Efeonce + filete + Insights en gris (`#6b6b6b` / `#6f89a2`); nunca se rearma |
| `sv360-logo-*` · `sv360-isotype-*` · `sv360-lockup-*` · `sv360-name-lockup-*` (desde 0.4.2) | logo / isotype / lockup | light / dark / any | positive / negative / **white** | Efeonce \| SV360; `name-lockup` suma «Search Visibility 360» |
| `aeo-logo-*` · `aeo-isotype-*` · `aeo-lockup-*` (desde 0.4.2) | logo / isotype / lockup | | positive / negative / white | Efeonce \| AEO |
| `aeo-assessment-logo-*` · `aeo-assessment-lockup-*` (desde 0.4.2) | logo / lockup | | positive / negative / white | Efeonce \| AEO Assessment (sin isotipo) |
| `ai-visibility-report-logo-*` · `ai-visibility-report-lockup-*` (desde 0.4.2) | logo / lockup | | positive / negative / white | Efeonce \| AI Visibility Report (sin isotipo) |
| `url-bubble-source` | url-bubble | any | source (gris `#848484`, fusionar con luminosidad) | 0,1968 |
| `url-bubble-baked-light` | url-bubble | light | baked (`#848484`) | 0,1968 |
| `url-bubble-baked-dark` | url-bubble | dark | baked (`#6f89a2`) | 0,1968 |

**Insights (0.4.0, tag `v0.4.0`):** marca `insights` en `AXIS_BRAND_ASSET_BRANDS`; `kind: 'lockup'` es nuevo y sólo lo usa
`insights-lockup-*`. Se generan en Greenhouse con `scripts/brand/build-insights-logo.mjs` y se re-sellan con
`scripts/seal.mjs`; nunca se editan a mano. **Greenhouse fijaba 0.3.5** al 2026-09-28; hoy fija 0.4.1, que ya los trae. Dónde se
aplican y dónde no: [applications.md](applications.md) §B3b.

**Submarcas SEO/AEO (0.4.2, tag `v0.4.2`, publicado el 2026-09-29, AXIS `main` `7f9c8bb`):** export nuevo `AXIS_SEO_AEO_BRANDS` y variante nueva `white` (todo blanco, esfera y logo de Efeonce
incluidos, para fotos y fondos de color). 33 SVG: `{sv360,aeo,aeo-assessment,ai-visibility-report}-logo-{positive,negative,white}`,
`{sv360,aeo}-isotype-{positive,negative,white}`, los cuatro `*-lockup-{positive,negative,white}` y
`sv360-name-lockup-{positive,negative,white}`. Se generan en Greenhouse con `scripts/brand/build-seo-aeo-logos.mjs`
(contornos de Poppins con fontkit; colores de `@efeoncepro/axis-tokens`, esfera en el acento de Engine `#0375db`) y se
re-sellan; nunca se editan a mano. Greenhouse fija 0.4.1 y los recibe con TASK-1938. Lab: `/references/seo-aeo/` y
`/references/seo-aeo.json`, guía `docs/agent-composition/seo-aeo.md` (publicados el 2026-09-29; responden 200). Criterio:
[criteria.md](criteria.md) («Submarcas de producto SEO/AEO»); aplicaciones: [applications.md](applications.md) §B3c.

Tipo `AxisBrandAsset = { id, file (`<id>.svg`), brand, kind, surface, variant, sha256, aspectRatio, note? }`.

| Función | Firma | Devuelve |
|---|---|---|
| `findBrandAsset(id)` | `(string) → AxisBrandAsset \| undefined` | el registro |
| `brandAssetUrl(id)` | `(AxisBrandAssetId) → URL` (lanza si no existe) | `file://…/assets/<id>.svg` del paquete instalado |
| `AXIS_ORBIT_ASSETS` | `readonly AxisOrbitAsset[]` (48) | `{ id, line, surface, channel, width, height, pngScale, svg, png, svgSha256, pngSha256 }` |
| `findOrbitAsset(line, surface, channel)` | → `AxisOrbitAsset \| undefined` | p. ej. `('brand','dark','social').svg === 'orbit/orbit-brand-dark-social.svg'` |
| `orbitAssetUrl(asset, 'svg'\|'png')` | → `URL` | archivo en el paquete |

Órbitas estáticas: `assets/orbit/orbit-<línea>-<dark|light>-<social|screen|deck|print>.{svg,png}` — 6 líneas × 2
superficies × 4 canales. Lienzos: social 1080×1350, screen y deck 1920×1080, print 794×1123 (PNG a 3×). Órbita
centrada, fondo transparente, con halo. Las genera `pnpm orbit:assets` desde `orbitAssetSvg`; la prueba del paquete
compara cada SVG byte a byte. Guarda de deriva en Greenhouse: `src/config/efeonce-brand-assets.test.ts`.

**Plastilina en volumen (desde 0.3.2, publicado con el tag `v0.3.7`; D24):** `assets/volume/<glifo>.png` — 18 PNG de 1024 px
en 0.3.2, 33 en 0.3.3 (tag `v0.5.0`, con los 15 de oficio de D25) y **43** desde 0.3.4 (tag `v0.6.0`, con los 10 de
IA, social y staff de D26)
(~130 KB cada uno, paleta con alfa), los glifos de Plastilina en respuesta con el acento de Brand y el gesto donde
existe; sellados en `src/volume-manifest.ts` (la prueba falla si un PNG cambia sin `publish`, si queda uno sin sellar o
si pierde el alfa).

| Función | Qué hace |
|---|---|
| `AXIS_VOLUME_ICONS` | el set sellado |
| `findVolumeIcon(glyph)` | el registro de un glifo |
| `volumeIconUrl(glyph)` | file URL del PNG dentro del paquete; **lanza** con un glifo que no es de Plastilina (el Trazo no tiene volumen) |

---

## 7. `@efeoncepro/axis-graphic-line`: cada export

Todo SVG que devuelve el paquete es decorativo: `aria-hidden="true" focusable="false"`, sin `<title>` ni `tabindex`.
Cada parte pintada lleva `data-axis-part` (`halo`, `ring`, `inner-orbit`, `arc`, `origin`, `sphere`, `sphere-ring`,
`lens`, `spotlight`, `spotlight-light`, `spotlight-orbit`, `satellite`, `signature`, `answer-period`, `state-free`,
`state-busy`); cada grupo `data-axis-element`, `data-axis-kind` y, si aplica, `data-axis-trajectory`,
`data-axis-sweep`, `data-axis-value`. La raíz lleva `data-axis-graphic-line="<versión del contrato>"`.

### 7.1 Pintor (`paint.ts`)

| Export | Firma | Qué hace / devuelve |
|---|---|---|
| `paintGraphicLine(manifest, bindings?)` | `→ { svg, circles }` | Pinta `orbit`, `measure`, `progress`, `lens`, `family-map`, `spotlight` y `signature`. **No pinta** `voice`, `url-bubble`, `slogan`, `state`, `logo-inline` ni `brand-close` (son del consumidor). `circles[id]` = círculo de cada elemento con anillo (para chequear texto). Lanza si un target no tiene geometría, una foto no tiene fuente o un `assetId` no existe |
| `circleFor(manifest, placement, bindings)` | `→ Circle` | target: `r × (1 + airRatio)`; región: centro de grilla y `ratio × (height|width)` (ratio por defecto 0,3) |
| `regionCenter(region, w, h)` | `→ { x, y }` | x: start 0,3 · center 0,5 · end 0,7; y: upper 0,36 · center 0,5 · lower 0,64 |
| `uniqueSvgPrefix(base, content?)` | `→ string` | `base-<hash FNV-1a en base 36>` |
| tipos | `Circle { cx, cy, r }`, `PaintResult`, `AxisGraphicLineManifest` | |

`PaintBindings`:

| Campo | Para qué |
|---|---|
| `targets?: Record<id, Circle>` | geometría medida de cada `targetId` (el círculo que ciñe el objeto; el pintor suma el aire) |
| `circles?: Record<elementId, Circle>` | círculo exacto por elemento, en px; manda sobre la región (lente: la foto; foco: la luz) |
| `photos?: Record<photoId, url>` | fuente de cada foto |
| `assetBase?` | carpeta de los archivos de marca (default `'/branding/'`) |
| `idPrefix?` | prefijo de ids (default: hash de lo pintado) |
| `minSphereRadiusPx?` · `minArcStrokePx?` | pisos para formatos chicos |
| `icons?: Record<member, url>` | ícono por satélite (Greenhouse no tiene isotipo en el paquete) |
| `background?` | pinta `palette.background` (default sí; `false` sobre un fondo propio) |

Detalles de pintura: el arco usa `pathLength="1"` y `data-axis-length` (dibujable por dash); ≥ 360° se pinta como
círculo; la estela de `measure` lleva la marca de partida (`origin`, opacidad 0,6); la firma se ubica en
`x = (W − w)/2`, `y = H − corto×0,09 − h`, `w = corto × widthOfShortSide`, `h = w × aspectRatio`, con
`mix-blend-mode` si es la burbuja web. La lente pinta la foto afuera con `filter` CSS y `mix-blend-mode: multiply`
(se ve en navegador; un rasterizador sin CSS no los aplica).

### 7.2 Composición (`compose.ts`)

| Export | Firma | Devuelve |
|---|---|---|
| `composeGraphicLine(intent, bindings?)` | intent → validar + resolver + pintar | `{ manifest, svg, circles }` (lanza `AxisGraphicLineValidationError`) |
| `orbitSvg(options: OrbitOptions)` | una órbita decorativa | `{ manifest, svg, circles }`; `circle` explícito = el anillo mismo (sin aire) |
| `measureSvg(options: MeasureOptions)` | un dato | `{ svg, circles, trajectory, source }` |
| `stateMarkerSvg({ value, line?, surface?, sizePx? })` | marcador de estado | string SVG: `free` = anillo (trazo `max(1, size/8)`), `busy` = disco; acento de la línea; default `growth`, `dark`, 12 px |

`OrbitOptions`: `width`, `height`, `line?` (default `growth`), `surface?` (`dark`), `channel?` (`screen`), `circle?`,
`region?` (`center`), `start?` (`upper-start`), `span?` (`accent`), `innerOrbits?` (false), `halo?` (true),
`sphereRing?` (false), `background?` (false), `idPrefix?`. `sphereRing` queda reservado a «en vivo» (D8); si el paquete
0.3.2 expone `live` en `OrbitOptions` y en el atributo `sphere-ring` del Web Component no está verificado: revisarlo al
publicar.

`MeasureOptions`: `width`, `height`, `value` (0–1), `source` (obligatoria), `label?`, `circle` (el objeto rodeado;
el anillo queda en `circle.r` porque la función divide por 1,12 antes de sumar el aire), `line?`, `surface?`,
`channel?`, `background?` (false), `idPrefix?`.

### 7.3 Chequeos (`checks.ts`)

| Export | Firma | Qué verifica |
|---|---|---|
| `textCrossesRing(box, circle)` | `(Box, Circle) → boolean` | `true` si la caja toca el círculo sin estar entera adentro |
| `ringCrossesBox(box, circle, strokePx = 2)` | `→ boolean` | el trazo del anillo pasa sobre una caja protegida |
| `isDecorativeSvg(svg)` | `→ boolean` | raíz con `aria-hidden="true"` y `focusable="false"`, sin `<title>`/`<desc>`/`tabindex` |
| `runAdapterChecks({ svg, circles, texts?, protectedBoxes?, answers? })` | `→ { check, ok, detail? }[]` | `decorative-svg` + un `text-never-crosses-ring` por texto + un `orbit-never-over-subject-or-reserves` por caja protegida + un `answer-period-part-of-text` por respuesta (`{ group, tools[] }`) |
| tipos | `Box { x, y, w, h }`, `AdapterCheckResult` | |

### 7.4 La respuesta con su esfera (`answer.ts`)

| Export | Firma | Devuelve |
|---|---|---|
| `answerSphere(text)` | → `{ diameterEm: 0.2, gapEm }` | hueco óptico según la última letra |
| `answerHtml(text, color)` | → string HTML | palabras escapadas + `<span data-axis-part="answer-period" aria-hidden="true">` de 0,2 em en `color` |
| `answerGroupBox(textBox, fontPx, text)` | → `Box` | la caja de las palabras **más** la esfera (`w + (gap + 0,2) × fontPx`) |
| `toolContainsAnswer(tool, group, tolerancePx = 0.5)` | → boolean | la herramienta (selección, marcas) contiene el grupo completo |

### 7.5 Recetas (`recipes.ts`)

| Export | Firma | Devuelve / regla |
|---|---|---|
| `lensRecipe(format, input)` | `LensFormat = 'wall' \| 'deck-cover' \| 'post' \| 'story' \| 'campaign-post' \| 'linkedin'` | `RecipeResult` |
| `spotlightRecipe(format, input)` | `SpotlightFormat = 'photo' \| 'event'` | `RecipeResult`; **lanza sin `proof`** |
| `recipeHtml(recipe, { className? })` | | un `<div>` posicionado con el SVG y los `<p>` (respuesta con `answerHtml`, pregunta con anillo) |
| `portraitOrbitSvg({ photoSrc, alt?, sizePx? (208), line?, surface? ('light'), idPrefix? })` | | SVG con la foto recortada y la órbita plana del token `portrait` (esfera ≥ 2 px de radio, arco ≥ 1,5, anillo ≥ 1) |
| `sphereDividerSvg({ widthPx, line?, surface? ('light'), spherePx? (6) })` | | línea (navy u halo, opacidad 0,38) que termina en la esfera del acento (diámetro ≥ 4) |
| `deckSlideHtml(slide, input: DeckInput)` | `DeckSlide = 'cover' \| 'section' \| 'content' \| 'close'` | lámina 1920×1080 completa (órbita + texto + logo) |

`RecipeInput`: `photoId`, `photoSrc`, `alt`, `answer` (≤ 3 palabras), `question?`, `proof?`, `line?` (growth),
`surface?` (dark), `subjectRegion?`, `assetBase?`, `idPrefix?`.
`RecipeResult`: `{ width, height, svg, circle (el anillo), texts: RecipeText[] ({ role: 'question'|'answer'|'proof',
text, box, fontPx }), accent, intent }`.

Layout por formato (tamaños objetivo; la respuesta se achica para caber: `floor(min(objetivo, ancho / ((letras + 0,6)
× 0,56)))`):

| Formato | Lienzo | Canal | Texto | Pregunta px | Respuesta px | Firma |
|---|---|---|---|---|---|---|
| lens `wall` | 1920×1080 | screen | a la izquierda | — | 200 | no |
| lens `deck-cover` | 1920×1080 | deck | a la izquierda | 34 | 96 | no |
| lens `post` | 1080×1350 | social | debajo | 38 | 140 | sí |
| lens `story` | 1080×1920 | social | debajo | 42 | 160 | sí |
| lens `campaign-post` | 1080×1350 | social | debajo | 38 | 140 | sí |
| lens `linkedin` | 1200×627 | social | a la izquierda | 24 | 76 | no |
| spotlight `photo` | 1920×1080 | screen | a la izquierda | — | 88 | no |
| spotlight `event` | 1920×1080 | screen | a la izquierda | — | 72 | no |

Prueba (`proof`) = 36 % de la respuesta. Margen = 9 % del lado corto. Errores posibles: «the answer has more than 3
words», ««…» crosses the ring», ««…» does not fit the canvas», ««visible» always goes with its proof (proof)».

`DeckInput`: `sections`, `current` (0 en portada; `sections` en cierre), `question`, `answer`, `eyebrow?`,
`stats?` (hasta 3 `{ value, label }`, sólo en contenido), `note?` (fuente o «datos de muestra»), `line?`,
`assetBase?`, `idPrefix?`. Portada y cierre en oscuro; sección y contenido en papel. Portada: logo negativo en
140,110 (230 px) y eyebrow en 400,118; pregunta en 140,640 (40 px); respuesta en 140,715. Sección: número en Bricolage
300 190 px dentro del anillo y «Sección n de N». Contenido: indicador de 80 px en la esquina; cifras en 140/620/1100 ×
620; nota en 140,960. Cierre: logo dentro de la órbita completa (220 px centrado en 960,330; cierre de marca aprobado,
D5), pregunta, respuesta y el eslogan (Poppins 28: *Empower* 800 itálica, *your* 800, palabra 900 itálica **en el
acento**, decisión D3; así lo pinta axis-graphic-line desde 0.3.1) centrados. Lanza «a text
crosses the orbit» en portada y sección.

### 7.6 Movimiento (`motion.ts`)

| Export | Valor |
|---|---|
| `ORBIT_MOTION_TIMELINE` | `ring` 0/500 `emphasized` · `arc` 400/1000 `standard` · `sphere` 1400/300 `emphasized` · `halo` 1200/800 `standard` · `signature` 1900/600 `emphasized` · `spotlight` 0/1400 `emphasized` (delay/duración ms) |
| `ORBIT_MOTION_TOTAL_MS` | 2500 |
| `ORBIT_MOTION_CSS` | keyframes `axis-orbit-ring` (opacidad 0 y escala 0,96 → 1), `axis-orbit-arc` (dashoffset 1 → 0), `axis-orbit-sphere` (0 → 1,18 al 70 % → 1), `axis-orbit-halo`, `axis-orbit-signature` (translateY 12 % → 0), `axis-orbit-spotlight` (translate −38 %/18 % → 14 %/−8 % → 0); se activa con la clase `axis-orbit-animate` en el SVG o un ancestro; con `prefers-reduced-motion: reduce` todo queda en el cuadro final |
| `orbitMotionFrameCss(tMs, className)` | CSS que congela cada parte en el instante `tMs` (storyboards, miniaturas, video) |

### 7.7 Archivos estáticos (`assets.ts`)

`AXIS_ORBIT_ASSET_CHANNELS` = social 1080×1350 (PNG 1×) · screen 1920×1080 · deck 1920×1080 · print 794×1123 (PNG 3×).
`orbitAssetSvg({ line, surface, channel })` → el SVG exacto de cada archivo de `axis-brand-assets/assets/orbit`
(`idPrefix orbit-<línea>-<superficie>-<canal>`, sin fondo, con halo).

### 7.8 React (`/react`)

`<AxisOrbit intent? bindings? orbit? measure? animate? className? style? />` — **exactamente una** de `intent`,
`orbit`, `measure` (si no, lanza «AxisOrbit: pass exactly one…»). Renderiza un `<span aria-hidden data-axis-orbit
style="display:inline-block;line-height:0">` con el SVG; `idPrefix` por `useId` (dos órbitas idénticas no comparten
ids); `animate` agrega `ORBIT_MOTION_CSS` y la clase. Seguro en servidor (sin efectos ni refs).

### 7.9 Web Component (`/element`)

`defineAxisOrbitElement(tag = 'axis-orbit')` (no-op en servidor o si ya existe). `renderAxisOrbit(get, has)` → string.

| Atributo | Efecto |
|---|---|
| `intent` | JSON completo → `composeGraphicLine` (manda sobre todo lo demás) |
| `value` + `source` + `cx`/`cy`/`r` | `measureSvg` |
| `width`, `height` | default 400 × 400 |
| `line`, `surface`, `channel`, `region`, `start`, `span` | opciones de `orbitSvg` |
| `cx`, `cy`, `r` | círculo exacto (se usa si hay `r`) |
| `inner-orbits`, `halo`, `sphere-ring`, `background`, `animate` | booleanos: presentes y ≠ `"false"`; defaults false, **true**, false, false, false |

Se pinta en shadow DOM (ids aislados) y el host recibe `aria-hidden="true"`.

---

## 8. Comandos

### 8.1 AXIS (`axis-design-system`, desde la raíz)

| Comando | Qué hace |
|---|---|
| `pnpm orbit:resolve -- --input <intent.json> [--out <manifest.json>]` (o por stdin) | valida y resuelve; no pinta; sale ≠ 0 si rompe una regla |
| `pnpm orbit:assets` | regenera las 48 órbitas de `axis-brand-assets` y su manifest sellado |
| `pnpm orbit:video -- --format 16x9\|1x1\|4x5\|9x16 --surface dark\|light [--line …] [--fps 30] --out <dir>` | video de la órbita **sin logo** (2,0 s + 0,5 s de reposo), MP4 + cuadro final PNG + JSON; necesita Playwright del Lab y `ffmpeg` |
| `pnpm signature:resolve -- --input <intent.json> [--out …]` | resuelve la firma de correo |
| `pnpm collaboration:resolve -- …` | resuelve la selección colaborativa |
| `pnpm icons:volume -- refs\|key\|check\|publish` (`scripts/icons-volume.mjs`) | Plastilina en volumen (D24): `refs` el plano en respuesta (con gesto) a 760 px sobre `#001a33`, centrado en 1024 · `key` alfa por color contra el fondo liso · `check` silueta ≥ 0,75 y misma cantidad de calados y piezas sueltas (avisa, sale 1; no rechaza) · `publish` comprime, copia al paquete y al Lab y sella. Detalle: `iconography.md` §12 |
| `pnpm design:generate` · `pnpm design:check` | genera / verifica el DESIGN.md desde tokens |
| `pnpm build` · `pnpm test` · `pnpm typecheck` · `pnpm lint` | en todos los paquetes (`node --test dist/*.test.js`) |
| `pnpm --dir apps/lab test:e2e` | e2e del Lab (incluye la página de la línea y ids duplicados) |

Ejemplos de intent en `docs/examples/graphic-line/` (`post-lens`, `deck-progress`, `report-measure`) y
`docs/examples/email-signature/`.

### 8.2 Greenhouse (`greenhouse-eo`)

| Comando | Qué hace |
|---|---|
| `pnpm creative:orbit:resolve -- --input <intent.json> [--out <manifest.json>]` | resuelve con el contrato fijado (exige versión `0.3.0`) |
| `pnpm creative:orbit:render -- --intent <intent.json> --bindings <bindings.json> --out-dir <dir>` | pinta con el adapter, rasteriza con sharp, firma y mide el contraste de la firma; escribe `manifest.json`, `piece.svg`, `piece.png`, `qa.json`; sale 1 si un chequeo falla |
| `pnpm creative:layout -- --contract <file.yaml> --mode plan\|compile\|check` | compilador de campañas: capa opcional `formats[].graphic_line: { intent, protect[] }` y firma `brand.signature: { brand_in_scene }` |
| `pnpm creative:layout:test` | pruebas del compilador y del adapter |
| `pnpm foto:componer:cta <piezas.json> [id…]` · `pnpm foto:cta:gate <plan.json> [--reproducir]` | compositor publicitario con campo `marcaEnEscena` y reglas `firma-burbuja`, `firma-contraste`, `firma-sobre-sujeto`, `firma-canto` |
| `node scripts/creative/brand-motion/render-orbit-motion.mjs --out <dir> [--anim reveal,open,sting] [--format 16x9,1x1,4x5,9x16,16x9-4k] [--scheme dark,light] [--fps 60] [--storyboard] [--ss 2]` | render de las animaciones del logo (Chromium, dos pasadas `main` + `halo`) |
| `node scripts/creative/brand-motion/orbit-sound.mjs --anim reveal\|open\|sting --out <file.wav>` | sonido sintetizado |
| `node scripts/creative/brand-motion/encode-orbit-motion.mjs --frames <dir> --sound <dir> --out <dir> [--only …]` | MP4 60/30 fps, GIF, ProRes 4444, WebM, HEVC, PNG por capas |
| `pnpm brand:compose -- --intent <intent.json> [--out <dir>] [--artifact-id <id>]` (`scripts/brand-surfaces/compose.ts`, TASK-1919) | compone una receta **aprobada** por superficie en el Artifact Composer: exige receta aprobada → `resolveSurfaceComposition` (con `issues`, no compone) → builder de la receta → plan + assets (plate de `photo.plateRef` recortado, íconos `resolveIcon`, capas SVG de `paintGraphicLine`) → PDF (deck) o PNG (resto; capas de video con alfa). Salida por defecto `.captures/brand-surfaces/<id>/` más `<id>.surface-manifest.json`. Errores (`SurfacePieceError.code`): `recipe-not-approved`, `recipe-outside-composer` (`audiovisual.close-reveal`), `surface-issues` (lista los issues de AXIS), `recipe-without-template`, `missing-photo`, `invalid-intent`. Ejemplos por receta: `src/lib/brand-surfaces/examples/*-intent.json` |
| `pnpm brand:tokens [--check]` (`scripts/brand-surfaces/compile-tokens.ts`) | compila `efeonceGraphicLine` a `graphic-line-tokens.{json,css}` de cada catálogo `graphic-line-*` y copia byte a byte los archivos de marca desde `axis-brand-assets`; `--check` falla si lo commiteado no coincide con la versión instalada |
| `pnpm glitch:tokens [--check]` (`scripts/glitch/compile-tokens.ts`; sólo Glitch) | compila `glitchLine` a `catalogs/glitch/glitch-tokens.{css,json}` (desde 0.3.24 con `editions`), escribe la estela del Flash `assets/flash-trail.svg` y las variables `--gx-flash-trail-*`; `--check` falla si hay drift. **Se corre junto a `pnpm brand:tokens` en todo bump de `axis-tokens`** (detalle en [glitch.md](glitch.md) §9.1) |
| `pnpm composer:visual-gate --catalog=graphic-line [--selftest\|--freeze]` | gate visual a 0 px de los 66 frames (desde TASK-1928; 32 tras TASK-1927) de los catálogos de La órbita (runbook `docs/operations/runbooks/composer-visual-gate.md`; altas declaradas en `BASELINE_DELTAS.md`: (b)–(e) de TASK-1927, (f) y (h)…(n) de TASK-1928; la (g) es Glitch; estas letras no son las del ADR de AXIS) |
| `pnpm brand:deck-recipes [-- --check]` | reescribe (o verifica) el índice del README del catálogo de recetas del deck, con la columna «Plantilla» leída de `graphic-line-deck/registry.json`, **y** el catálogo de runtime `src/lib/brand-surfaces/deck-recipes/catalog.generated.json` (TASK-1929; recetas + intents de ejemplo de `recipe-map.json`). Córrelo siempre tras editar `EFEONCE_DECK_SLIDE_RECIPES_V1.json`: `--check` falla si el README **o** el catálogo difieren, y el test `catalog-drift` lo corre en CI |
| `pnpm brand:deck-plan -- --plan <plan.json>` · `-- --propose --context <context.json> [--out <plan.json>]` (`scripts/brand-surfaces/deck-plan.ts`, TASK-1929) | valida el plan de un deck (ids de receta en orden) con `validateDeckPlan` (exit 1 si hay error, 2 si no se lee la entrada) o pide al agente que lo proponga (`proposeDeckPlan`, `server-only`: sólo ids del enum del documento, un reintento, fail-closed; imprime tokens y costo estimado). Local: `ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key` y `GCP_PROJECT=efeonce-group` con ADC si `.env.local` no las trae. Códigos y arreglos: skill `deck-studio` §«Plan del deck» |
| `pnpm brand:deck-plan -- --bind --plan <plan.json> (--context <c.json> \| --proposal <id> --org <org> \| --sources <f.json>) [--out <ligado.json>]` (TASK-1930) | liga los slots de datos del plan con `bindDeckSlots` e imprime cada uno «ligado desde …» o «sin ligar: <motivo>» (exit 1 si el plan ligado no compone). Con `--proposal` lee por readers canónicos con perfil runtime (proxy: `pnpm pg:connect`); con `--sources`, sin base. No escribe nada |

**Documento (TASK-1927):** si el intent de `pnpm brand:compose` trae `pages`, compone un documento
(`planSurfaceDocument`, `src/lib/brand-surfaces/document.ts`; valida con `resolveSurfaceDocument`): un PDF multipágina
16:9, `<id>.surface-document-manifest.json` (`axis.surface-document.v1`), `<id>.provenance.json`
(`efeonce.brand-surface-document.provenance.v1`) y un PNG y un PDF por página, en `.captures/brand-surfaces/<id>/`.
Un solo issue deja al documento sin plan. Campos y códigos: [applications.md §L](applications.md), «Componer el deck
hoy».

**Catálogos del Artifact Composer (TASK-1919, deck ampliado por TASK-1927):** `graphic-line-deck` (PDF 16:9, 16
`contentType`: `deck.proposal-cinematic` + `.hero` + `.lines`, `method-staircase`, `section-classic`, `section-split`
+ `.corner-bottom` + `.panel-end`, `content-measure`, `triptych`, `cover-brochure`, `cover-proposal` + `.dawn`,
`close-brochure` + `.photo`, `close-proposal`), `graphic-line-stills` (PNG:
`web.hero-lens`, `hero-bleed`, `hero-uniform-tablet`, `hero-mobile-native.<formato>` 360/390/430,
`dooh.caminero-lens`, `motion.loop-lens-reveal` —el último cuadro— y `motion.storyboard`) y `graphic-line-overlays`
(PNG con alfa: `audiovisual.cartela`, `zocalo`, `callout-selection`, `data-super`, `subtitles`; opacas `split-screen` y
`shot-plan`). `contentType` = `<superficie>.<receta>`; lo deriva el mapper, un autor nunca elige plantilla. Cada
catálogo exporta `createCatalog({ selectionPainter, ctaPainter })`: la pintura de la selección y del CTA la inyecta el
consumidor (adaptador de Greenhouse sobre `efeonce.collaboration-selection`). Plantillas de capa declaran
`render.background: 'transparent'`.

**Deck completo (TASK-1928, 2026-09-27/28).** `graphic-line-deck` suma 34 plantillas (50 en total): **las 69
recetas** del catálogo componen. La última, `cover-brochure-cine-lines-selection`, entró el 2026-09-28 sin plantilla nueva: contentType
`deck.cover-brochure.document-selection` sobre `CoverBrochure` (marca la respuesta con `data-gl-selection-target` y
tiene un slot `selection` opcional; está en `TEMPLATES_WITH_SELECTION` de `graphic-line-deck/index.ts`), con el
layout `document-selection` de AXIS `v0.3.21`. `recipe-map.json` ya no tiene recetas `blocked`. Tabla receta → `layout` → `contentType` en [applications.md §L](applications.md). Piezas nuevas:

- **Assets del compositor** (`src/lib/brand-surfaces/types.ts`, materializados en `scripts/brand-surfaces/compose.ts`):
  `logo` (logo de tercero normalizado: tono, área de tinta y caja; `knockout`, `recolor` + `recolorBox`); `painted`
  (capa que pinta el motor de la línea **con una foto adentro**: el SVG lleva un marcador y el compositor lo reemplaza
  por el plate; es la lente de `section-lens`); `plate.focus` (recorte dirigido a un punto del archivo, `xOfWidth` /
  `yOfHeight` de 0 a 1, sólo cuando el intent declara `photo.focus`; sin él, recorte centrado).
- **Resolvers** (`graphic-line-shared/resolvers.ts`): nuevos `gl-figure-size`, `gl-item-role`, `gl-align`; siguen
  `gl-current-stop`, `gl-label-side`, `gl-chosen-day`, `gl-chosen-time`, `gl-recommended`.
- **Hooks del catálogo** (`graphic-line-deck/index.ts`): selección por ítem (slot `selection.item`, que el builder
  llena desde `selected` del intent —en la cotización, desde `recommended`—, 1-based; marca `[data-gl-select-item]`) o por nivel (`selection.level` del intent;
  marca `[data-gl-level-row]`),
  selección sobre la respuesta, cursor del lector (CTA) con hasta ocho manijas sobre un texto (sección de servicios) e
  indicador de progreso con su centro medido (sección a sangre, arriba a la izquierda).
- **Paridad de slots receta ↔ plantilla:** `recipe-map.json` declara en `slots` el campo del `slots.json` donde vive
  cada slot de la receta (rutas `slot`, `slot.campo`, `slot[].campo`; `a+b` para la respuesta en dos líneas;
  `#composite` para campos que imprimen más que el slot, como «Fuente: …»). El test
  `src/lib/brand-surfaces/__tests__/recipe-slot-parity.test.ts` exige campo, tipo compatible, que lo obligatorio siga
  obligatorio y el **mismo largo máximo** (en una plantilla compartida manda el mayor). Las 30 recetas anteriores
  declaran `slots: null`. El compositor rechaza un texto que excede el `maxCharacters` del campo
  (`src/lib/artifact-composer/validate.ts`, `overflow=reject`).
- **Contrato (serie `v0.3.15`…`v0.3.21`):** una composición puede declarar `progress: false`; `voice.maxWords` por
  receta (testimonio hasta 6 palabras, el resto 3); `steps.icons: false` y `steps.min`; colores por nombre de paleta;
  `section-cine` gana `about` y `purpose`; `content-day` gana `tools`, `live-progress` y `live-results`; y
  `cover-brochure` gana `document-selection` (`v0.3.21`, delta (l): `column.answerWithSelectionExtraPx` = 28,
  `bodyBelowAnswerPx.withSelection` = 130; `document` y `line` siguen con `selection-not-in-recipe`).

`bindings.json` del render: `{ targets: { id: { cx, cy, r } }, photos: { photoId: ruta }, urlBubble: { x, y, height },
texts: [{ id, x, y, w, h, content?, svg?, fontSize?, baseline?, lastChar? }], signature: { y? }, protect: [{ id, kind:
'subject'|'reserve'|'bed', x, y, w, h }], transparent? }`. Las rutas se resuelven relativas al archivo de bindings.

---

## 9. Mapa del Lab

Página: `apps/lab/src/pages/references/graphic-line.astro`, publicada en
`https://axis.efeonce.org/references/graphic-line/`. Todas las órbitas de la página salen del paquete; `orbit(...)`
de la página es `orbitSvg` con `circle` y `channel: 'social'`.

| Ancla | Sección | Qué muestra | Con qué se arma |
|---|---|---|---|
| `#manifiesto` | 0.1 | la órbita en una frase | texto |
| `#idea` | 0.2 | tres ideas | láminas 0.2 |
| `#esfera` | 1.1 | la esfera como punto final, huecos ópticos | tokens `sphere` + láminas 1.1 |
| `#orbita` | 1.2 | anatomía y formas (con halo, plana, interiores, satélites, un dato) | `orbitSvg`, `measureSvg` |
| `#trayectoria` | 1.2.1 | 0 %, 30 %, 60 %, 70 %, 100 % | `measureSvg` |
| `#lente-foco` | 1.3 y 1.4 | muro, portada, post, story; foto y evento | `lensRecipe`, `spotlightRecipe`, `recipeHtml` |
| `#voz` | 2.1 | banco de pares pregunta/respuesta | láminas + respuesta con esfera |
| `#eslogan` | 2.2 y 2.3 | eslogan y oficio a la vista | láminas |
| `#color` | 3 | paleta y contrastes calculados | tokens |
| `#familia` | 3.1 | una órbita por línea de servicio | `orbitSvg` por `line` |
| `#firma-lineas` | 3.2 | Efeonce firma; mapa de portafolio | `orbitSvg` con `span: 'satellites'` + satélites |
| `#logo-isotipo` | 3.3 | logo completo o isotipo | láminas |
| `#pantalla` | 4.1 y 4.2 | deck (portada, sección, contenido, cierre), post de campaña, LinkedIn | `deckSlideHtml`, `lensRecipe('campaign-post'|'linkedin')` |
| `#oficina` | 4.3 | oficina (estado de salas, muros) | láminas |
| `#objetos-firma` | 4.4 y 4.5 | objetos, cierre de video, firma de correo A/B, respuesta y firmas de equipo | `portraitOrbitSvg`, `sphereDividerSvg`, `resolveEmailSignatureIntent` |
| `#movimiento` | 4.4.1 | storyboards (cierre y barrido del foco) | `composeGraphicLine`, `spotlightRecipe`, `ORBIT_MOTION_CSS`, `orbitMotionFrameCss` |
| `#animaciones` | 4.4.2 | la órbita sola y reveal/apertura/sting con fichas y masters | `orbitSvg` + videos del bucket público |
| `#merch` | 4.6 y 4.7 | merch, bienvenida, papelería, eventos | láminas |
| `#aplicaciones` | 4.8 | merch en foto | fotos IA |
| `#oficina-foto` | 4.9 | oficina en foto | fotos IA |
| `#especificaciones` | 5.1 y 5.2 | grillas por formato y banco de fotos | láminas |
| `#logo` | 5.3 a 5.5 | usos correctos e incorrectos de logo e isotipo | archivos oficiales |
| `#si-no` | 5.6 | sí y no por elemento | tabla |
| `#componer` | 5.7 | intents de ejemplo resueltos y pintados | `composeGraphicLine` + `docs/examples/graphic-line/*.json` |
| `#decisiones` | 6.1 y 6.2 | decisiones y prueba sin logo | láminas |
| `#insights` | 7.1 y 7.2 | informe Efeonce Insights con la línea | láminas (prueba de diseño, cifras de muestra; no es el diseño de Insights) |

**Página propia de Insights (2026-09-28), publicada:** Referencia visual en el Lab de AXIS: [axis.efeonce.org/references/insights/](https://axis.efeonce.org/references/insights/) (publicada el 2026-09-28, AXIS main `3dfbf0e`; datos para agentes en `/references/insights.json`). El ejemplo vivo del producto
es la muestra `think.efeoncepro.com/insights/muestra`. Página, JSON, guía y las copias
`apps/lab/public/branding/insights-*.svg` están en `main` de AXIS (fuente
`apps/lab/src/pages/references/insights.astro`, JSON para agentes `/references/insights.json` desde `insights.json.ts`,
guía `docs/agent-composition/insights.md`). Es **referencia** —marca y lockup, aplicaciones aprobadas, secciones del
informe y la UI del informe live con datos de muestra—, no componentes ni contratos: la UI de Insights vive en
Greenhouse (catálogos del Artifact Composer) y en Think.

---

## 10. Qué NO existe (no alucinar)

- **No hay Lottie** ni JSON de After Effects: la fuente del movimiento es SVG + CSS (`ORBIT_MOTION_CSS`) y el video se
  exporta cuadro a cuadro. Las animaciones del logo son renders (MP4/ProRes/WebM/HEVC), no un componente.
- **El paquete no pinta** `voice` (la pregunta y la respuesta son texto del consumidor; usa `answerHtml`), `url-bubble`
  como pie, `slogan` (se usa el archivo oficial), `state` en composición (usa `stateMarkerSvg`), `logo-inline` ni
  `brand-close` (la animación del cierre la produce el consumidor con `ORBIT_MOTION_*` y los archivos de marca).
- **No hay componente de firma de correo HTML** en AXIS: el contrato resuelve valores; el HTML (tablas, estilos en
  línea, PNG) lo arma el generador del consumidor. Tampoco hay función que pinte el `area-mark` de la firma de equipo
  (el Lab lo dibuja en la propia página).
- **No hay archivo del eslogan** en `axis-brand-assets`, ni logo/isotipo de Greenhouse, ni fuentes, ni fotos.
- **No hay UI de Efeonce Insights en AXIS**: ni componentes del informe, ni roles de color de datos, ni geometría de
  gráficos. AXIS sólo trae la marca (`insights-*`, 0.4.0) y la página de referencia del Lab (publicada el 2026-09-28,
  AXIS main `3dfbf0e`); roles y geometría siguen
  copiados a mano en Greenhouse y Think (extraerlos es un follow-up documentado, no existe).
- **No hay adapter de Figma, InDesign ni Office** para la órbita: para esos medios se usan los 48 archivos estáticos.
- **El adapter de campañas de Greenhouse** (`scripts/creative/layout-compiler/graphic-line.mjs`) **no pinta** `spotlight` ni
  `family-map` (sólo `orbit`, `measure`, `progress`, `lens`, `url-bubble` con `bindings.urlBubble`, la esfera de la
  respuesta y la firma), **no pinta la marca de partida** (`originMark`) de una medida y su SVG no lleva
  `focusable="false"`. (`@efeoncepro/axis-graphic-line` sí está instalado desde el 2026-09-27, pero sólo lo usa
  `src/lib/brand-surfaces` para los catálogos del composer.)
- **No hay coordenadas libres en el contrato**: sólo regiones, posiciones, targets medidos o `bindings.circles`.
- **No existe** el código `url-bubble-signature-is-efeonce-only` (se retiró: Efeonce firma en toda línea). No existe
  `lens.accentSphereDiameterRatio` como regla vigente (deprecado).
- **No existe** un modo «loader» ni un arco que crece hasta llenarse para un dato; no existe «sin esfera» en progress o
  measure.
- No existen roles de eslogan distintos de `close`, ni formas distintas de `lockup` y `standalone`.

---

## 11. Deriva conocida (docs vs código, al 2026-09-26)

| Dónde | Dice | El código |
|---|---|---|
| `docs/agent-composition/graphic-line-orbit.md` (AXIS) | el validador rechaza «burbuja como firma en una marca que no es Efeonce» | ya no: la prueba verifica que ese código **no** se emite |
| mismo doc, sección Versiones | tokens/contratos 0.3.0 | tokens 0.3.3 publicado (0.3.4 en `main`), contratos 0.3.2 publicado (0.3.4 en `main`) |
| `docs/examples/graphic-line/deck-progress-manifest.json` y `report-measure-manifest.json` | contrato 0.2.0, arco que se llena (sweep 331,2°), anillo 0,19 con `brand` | obsoletos: regenerar con `pnpm orbit:resolve` antes de copiarlos |
| `compose.ts` (comentario de `measureSvg`) | «0 % deja el anillo fino» | el manifest y la prueba ponen la esfera en la partida a 0 % |
| manual de Greenhouse §7 | palabra de RevOps «por decidir» | tokens: `Revenue`, acentos definidos |
| `src/config/efeonce-brand.ts` | `EFEONCE_SLOGAN_COLOR = '#848484'` | token `slogan.leadColor.onLight = '#6b6b6b'` (el gris viejo da 3,5:1) |
| `scripts/creative/brand-motion/render-orbit-motion.mjs` | eslogan claro `#848484` | token claro `#6b6b6b` |
| `sphereDividerSvg` | esfera 6 px, línea navy/halo al 38 % | token de la firma: esfera 9 px, color `surface-line`; pasar `spherePx: 9` en correo |

## Iconografía (`efeonceGraphicLine.icons` y `@efeoncepro/axis-graphic-line/icons`)

> AXIS `main@5b8ab20`, 2026-09-26: `axis-tokens` **0.3.6** y `axis-graphic-line` **0.4.0**, publicados con el tag
> `v0.3.6`. Oficio (D25), AXIS main@aa66225, 2026-09-27: `axis-graphic-line` **0.5.0** (tag `v0.5.0`) lleva el catálogo a
> 60 glifos (27 Trazo + 33 Plastilina). IA, social y staff (D26), AXIS main@cf77452 (2026-09-27): `axis-graphic-line`
> **0.6.0** (tag `v0.6.0`) lo lleva a **79 glifos: 36 Trazo + 43 Plastilina**; los tokens no cambian por D26
> (`axis-tokens` iba en 0.3.8 en ese release, por superficies; hoy Greenhouse fija 0.3.14). Guía:
> `axis-design-system/docs/agent-composition/iconography.md` (§«Catálogo aprobado»).

| Token | Qué guarda |
| --- | --- |
| `icons.background` / `paper` / `ink` | `#001a33` en todas las líneas (D21), papel `#f7f8f6`, tinta `onDark` blanca y `onLight` navy |
| `icons.voiceByLine` | `stroke` para growth, engine y revenue-*; `plastilina` para brand; `null` para voice (pendiente) |
| `icons.stroke` | grilla 24, margen 2, guías (círculo 10, cuadrado 18, rectángulo 20 × 16), trazo 1,5 / 1,75 a ≤ 20 px / tope 4 px sobre 64, esfera 1,75, aire 0,5, respuesta desde 20 px, tamaños de QA |
| `icons.plastilina` | grilla 48, área 560, radio 22,5, esfera 3,4, calado 4,5, gesto 2,8 (2–5 trazos), barras 2,6, mínimo 32 px, QA 160/64/32, `generation` (modelo, rejilla, colores, parámetros de vectorización y potrace) |
| `icons.skewedOrbit` | −16°, alto 1/3, calado 12 px, anillo 22 % de 2,4 px, arco 3,8 px de 118° a 52°, esfera 8,3 (anillo 12,5), base 1080, objeto ≥ 320 px, una por pieza |
| `icons.volume` (0.3.7, publicado en `v0.3.7`; D24) | `status: 'canonical'`, `line: 'brand'`, `state: 'response'`, `sizePx: 1024`, `minPx: 160`, `perPiece: 1`; `generation` { `model: 'gpt-image-2.5-sunburst'`, `quality: 'high'`, `referencePx: 760`, `background: '#001a33'` } (sin `inputFidelity`: la familia 2.5 no lo acepta; la fidelidad la da el prompt); `key` { `from: 28`, `to: 95`, `frameSamplePx: 24` } (distancia RGB al fondo); `qa` { `minIoU: 0.75`, `sameHoles: true`, `sameParts: true` } |

| Función (`/icons`) | Qué hace |
| --- | --- |
| `ICON_CATALOG` | los glifos aprobados con clave, voz, nombre, uso, modo y gesto: **86** desde 0.9.0 (37 Trazo + 49 Plastilina: la Plastilina `mano` de D29, con su volumen en `axis-brand-assets` 0.3.6); 85 en 0.8.0 (el Trazo `swipe` de D28); 84 en 0.7.0 (las 5 Plastilina de Glitch, D27); **79** desde 0.6.0 (36 Trazo + 43 Plastilina, con los 19 de IA, social y staff de D26); 60 en 0.5.0 (con los 30 de oficio de D25); 30 en 0.4.0. Las claves son únicas entre voces (`llamada` es Trazo; `telefono`, Plastilina; en D26 cada concepto tiene una clave por voz, p. ej. `ia` / `chispa`) |
| `resolveIcon(req)` / `iconSvg(req)` | SVG con las reglas; errores `IconRequestError` (`unknown-glyph`, `plastilina-below-min`, `gesture-not-drawn`, `gesture-only-plastilina`, `unknown-line`); aviso `response-below-min` |
| `auditIconGroup(items, { pieceHasSphere })` | issues `mixed-voices`, `more-than-one-response`, `response-with-piece-sphere`, `more-than-one-gesture`, `gesture-not-protagonist` |
| `skewedOrbitHeroSvg(input)` | Plastilina protagonista dentro de su órbita sesgada (objeto en reposo) |
| `iconVoiceForLine`, `iconColors`, `strokeWidthFor`, `strokeSphereClearance`, `samplePath` | voz, colores, grosor óptico, aire de la esfera, muestreo de trazados (`samplePath` sólo mide arcos circulares: un Trazo nuevo no usa arcos elípticos; los óvalos van como cuatro arcos circulares tangentes) |

Comandos (raíz de AXIS): `pnpm icons:export -- --out <dir>`, `pnpm icons:check -- --glyph <json> --out <dir>`,
`pnpm icons:vectorize -- --sheet <png> --names a,b,… --out <dir>`, `pnpm icons:volume -- refs|key|check|publish`.
Página `/references/iconography/` (volumen: `#volumen`), datos `/references/iconography.json` (bloque `volume`: assets
con url, use, method, review, prompt). Los PNG del volumen están en `@efeoncepro/axis-brand-assets` (§6), no en
`/icons`. Generación (en Greenhouse, necesita la llave): `pnpm ai:image --model gpt-image-2.5-sunburst --quality high
--size 1024x1024 --image <ref.png> --prompt-file <volume-prompt.txt> --out <crudo.png>`; prompt canónico AXIS
`docs/agent-composition/iconography/volume-prompt.txt`.

