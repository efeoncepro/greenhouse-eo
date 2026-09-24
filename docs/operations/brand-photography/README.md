# Fotografía de marca Efeonce — índice

> **Tipo de documento:** Índice operativo de carpeta
> **Versión:** 1.2
> **Creado:** 2026-09-19 por Claude
> **Última actualización:** 2026-09-23
> **Documentación relacionada:** [Lenguaje fotográfico V1](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [Bitácora del caso](../social/2026-09-19-efeonce-photographic-language-production-method.md) · [Corrida de evidencia](../../../ai-generations/2026-09-19_lenguaje-fotografico-efeonce/README.md)

Esta carpeta guarda el **Lenguaje Fotográfico de la marca propia de Efeonce**, aprobado por el operador (Julio
Reyes) el 2026-09-19 («todas me gustaron»). Aplica a fotografía e imagen fotorrealista de Efeonce. No aplica a
piezas de clientes ni a trendjacking que toma prestada una estética ajena.

Estado: **sistema aprobado y consistente, no activo distintivo medido**. La [auditoría ciega del 2026-09-20](./EFEONCE_PHOTO_BLIND_AUDIT_2026-09-20.md) confirmó la consistencia desde fuera —dos evaluadores lo
reconocieron como un mismo autor— y encontró que **todavía no logra credibilidad**: ninguna pieza muestra
trabajo entregado. Su plan es la hoja de ruta vigente. Llamarlo activo distintivo exige antes la
prueba de reconocimiento descrita en los pendientes del documento maestro.

## Comandos de producción (empieza por acá)

```bash
pnpm foto:doctor                         # comprueba la cadena local sin generar ni gastar
pnpm foto:prompt --ficha-ejemplo          # plantilla de ficha de toma
pnpm foto:prompt <ficha.json> --batch <out.json>   # arma el prompt; el formato sale de UNA tabla
pnpm foto:validar <plate.png>             # valida las seis reservas sobre el plate limpio
pnpm foto:componer <piezas.json>          # pieza SIN CTA; compositor general de voz/firma
pnpm foto:componer:cta <plan.json>        # pieza CON CTA: compone y emite su QA con huellas (out/qa-<plan>.json)
pnpm foto:cta:gate <plan.json>            # la certifica: sólo la salida 0 certifica; 3 = no certificable, no es pase
pnpm foto:lanyard --nombre "<N>" --cargo "<C>" --foto <r.png>   # arma el lanyard PIEZA POR PIEZA
```

**Dos categorías de pieza** **[operador, 2026-09-20]**: la **muda** —sólo foto y firma— es legítima y sirve de
**descanso visual** para relajar el feed; la **con voz** lleva la capa y **reserva su espacio en la toma**.
El prototipo gráfico rechazado el 2026-09-19 no es la receta vigente. El sistema publicitario
[Tres voces + acción](../EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md) se aprobó el 2026-09-22 y la pieza con CTA
usa `foto:componer:cta` + `foto:cta:gate`; cada salida necesita revisión humana y la pauta autorización separada.

`foto:prompt` existe porque dos veces se coló un valor de un formato dentro de un bloque compartido
(«Vertical 4:5.», «bottom 18%») y ninguna se vio hasta medir. `foto:validar` es el arnés de reservas, promovido
desde una carpeta de corrida el 2026-09-20 porque una herramienta dentro de una carpeta fechada no la encuentra
nadie. Detalle en [prompts y pipeline](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) §4.2 y §5.

## Documentos

| # | Documento | Qué resuelve | Autor |
|---|---|---|---|
| 1 | [`EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md`](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) | Documento maestro: alcance, origen en el posicionamiento, la idea «El oficio a la vista», principios, qué no es Efeonce, historia de decisiones y pendientes | Claude |
| 2 | [`EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md`](./EFEONCE_PHOTO_SIGNATURE_FOREGROUND_V1.md) | La firma: primer plano desenfocado planeado desde la toma, catálogo de lechos, reglas medibles, logo y selección colaborativa AXIS | Claude |
| 3 | [`EFEONCE_PHOTO_COLORIMETRY_V1.md`](./EFEONCE_PHOTO_COLORIMETRY_V1.md) | Colorimetría: roles de color (azul, naranja, lima), balance de blancos, métricas Lab y rangos objetivo | Otro agente |
| 4 | [`EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md`](./EFEONCE_PHOTO_CAMERA_LENS_ANGLE_CATALOG_V1.md) | Catálogo de cámaras, lentes y ángulos probados, con su uso, su lecho y lo medido | Otro agente |
| 5 | [`EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md`](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md) | Bloques de prompt (realismo, impacto, FOREGROUND), ficha de toma y pipeline de producción con scripts | Otro agente |
| 6 | [`EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md`](./EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md) | Personas: casting, gesto, mirada, piel; Julio y Nexa (referencias, identidad, QA); uniforme | Claude |
| 7 | [`EFEONCE_PHOTO_LEVERS_CATALOG_V1.md`](./EFEONCE_PHOTO_LEVERS_CATALOG_V1.md) | **Catálogo de palancas**: el índice de las **34 en cuatro familias** (5 siempre activas · 4 atmósferas · 1 acción suspendida · 24 de encuadre), qué campo pide cada una y cuántas admite una pieza; ficha completa de las 24 de encuadre; las 20 tomas de cámara nombradas; las cinco descartadas con su razón medida | Claude |
| 8 | [`EFEONCE_PHOTO_BLIND_AUDIT_2026-09-20.md`](./EFEONCE_PHOTO_BLIND_AUDIT_2026-09-20.md) | **Auditoría ciega**: dos evaluadores independientes sin acceso al canon; qué coincidió, los tells de generación, el plan derivado y la ronda «obra real» | Claude |
| 9 | [`NEXA_CHARACTER_BIBLE_FICHA_V1.md`](./NEXA_CHARACTER_BIBLE_FICHA_V1.md) | **Nexa, el Bible aplicado a producción**: qué referencia del repo corresponde a cada nombre del documento de marca (las 8 expresiones, los 5 contextos), la auditoría medida de qué cumple el material, el veredicto A/B contra la ficha y lo que queda abierto | Claude |
| 10 | [`NEXA_TECH_PROPS_V1.md`](./NEXA_TECH_PROPS_V1.md) | **Nexa, props y ecosistema tecnológico**: qué dispositivos lleva y usa —smartwatch, iPhone, iPad, MacBook, DJI, Rode, Shure, Sony/Canon—, cómo entran en la escena y qué NO es Nexa. La regla es la familia vigente, nunca un modelo descontinuado | Claude |

## Registros y evidencia

| Recurso | Ruta | Qué contiene |
|---|---|---|
| Character Bible de Nexa | [`docs/operations/social/NEXA_CHARACTER_BIBLE_V1.md`](../social/NEXA_CHARACTER_BIBLE_V1.md) | El documento de marca completo y legible: valores, voz, retrato físico, audio, wardrobe, expresiones, lenguaje corporal, entornos, iluminación, composiciones, backstory, transparencia y reglas de interacción. Original en OneDrive |
| Método de producción de ADS | [`social/2026-09-21-ads-brand-visibility-production-method.md`](../social/2026-09-21-ads-brand-visibility-production-method.md) | La capa gráfica **por formato** (4:5 · 9:16 · 16:9) con sus valores medidos, las cuatro voces, las seis trampas y la receta copiable |
| Bitácora del caso | [`docs/operations/social/2026-09-19-efeonce-photographic-language-production-method.md`](../social/2026-09-19-efeonce-photographic-language-production-method.md) | Ronda por ronda: qué se probó, qué resultó, qué decidió el operador, qué se aprendió, fallos con números |
| Corrida de evidencia | [`ai-generations/2026-09-19_lenguaje-fotografico-efeonce/`](../../../ai-generations/2026-09-19_lenguaje-fotografico-efeonce/README.md) | Prompts verbatim por ronda (`batch*.json`, `*.txt`), bloques de prompt, scripts de medición y composición. Las imágenes son locales (gitignoreadas) |
| Entrega en OneDrive | `5. Contenidos/13- Branding/Lenguaje Fotografico Efeonce/v01/` | Carpeta de entrega de la versión 1 para el equipo |
| Manual de uso | [`docs/manual-de-uso/marketing/fotografia-de-marca-efeonce.md`](../../manual-de-uso/marketing/fotografia-de-marca-efeonce.md) | Paso a paso para producir una foto de marca (lo escribe otro agente) |

## Orden de lectura recomendado

| Perfil | Orden |
|---|---|
| Quien decide o revisa la marca | 1 → 2 → bitácora |
| Quien produce una foto con IA | Manual → 5 → **7** → 2 → 3 → 4 → 6 |
| Quien produce una foto con personas reales o con Julio/Nexa | 6 → 2 → 4 → **7** |
| Quien produce una pieza **con Nexa** | **9** → **10** → 6 → 2 → **7** |
| Quien quiere entender por qué es así | Bitácora → 1 |

## Reglas de la carpeta

- El documento maestro manda sobre los demás en alcance y principios; cada documento temático manda en su tema.
- Los números vienen de mediciones hechas en la corrida del 2026-09-19. Se marcan como **[medido]**; las decisiones
  del operador como **[decisión del operador]**; las recomendaciones propias como **[criterio]**; lo no resuelto como
  **[pendiente]**.
- Una regla nueva entra con su evidencia (ruta de la pieza y medición), no de memoria.

## Piloto de reservas nuevas — 2026-09-20 **[medido]**

Tres plates que prueban los bloques `SELECTION TARGET` (§3.8.1) y `MARGIN FIELD` (§3.8.2). **Son la referencia
vigente** para pedirle a la IA una foto que después aloje una caja de selección o una cita al margen.

| Dónde | Qué hay |
|---|---|
| Repo (índice + medición) | [`ai-generations/2026-09-20_piloto-reservas/README.md`](../../../ai-generations/2026-09-20_piloto-reservas/README.md) |
| Repo (prompts verbatim) | `ai-generations/2026-09-20_piloto-reservas/rondas/p1/batch-{45,169}.json` |
| **OneDrive (imágenes)** | `5. Contenidos/13- Branding/Lenguaje Fotografico Efeonce/v01/referencias/11-piloto-reservas-2026-09-20/` |

Las imágenes del repo están gitignoreadas: **la copia compartible es la de OneDrive**, con su `LEEME.md` al lado.

Resultados: `MARGIN FIELD` pasa en 4:5 y en 16:9 nativo con **banda continua hasta 0,60 del alto** (el caso
aprobado «¿Claude o Codex?» llegaba a 0,35). `SELECTION TARGET` sirve **con padding de 0,02 del lienzo** (3,29:1);
pegado al objeto falla (1,02:1) porque el objeto trae su propio borde claro, y con 0,04 vuelve a fallar porque la
caja toca a las personas. Hay punto dulce, no monotonía.

## Delta 2026-09-22 — CTA aprobado sobre foto

[Tres voces + acción](../EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1.md) aprueba la capa funcional de CTA en
texto/contorno/relleno. No aprueba automáticamente piezas completas ni rehabilita los ejemplos rechazados del 19/09.
Conserva foto sin scrims, reservas y firma; la superficie del CTA no habilita paneles para contenido.

## Delta 2026-09-19 (tarde)

- [**Reserva de espacio en la toma**](EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md) — **aprobado (capa fotográfica)**: las cuatro reservas (texto, objeto para enmarcar, lecho de firma, aire para cursores), tono declarado, límite de cabezas, formato nativo, nunca scrim, medir antes de componer.
- [Espacio para texto y formatos nativos](EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md) — bitácora de la ronda: zona de titular con tono declarado y límite de cabezas; 4:5, 9:16 y 16:9 nativos. **Su capa de composición no está aprobada** (ver estado abajo).

> **Estado 2026-09-19:** aprobado el **lenguaje fotográfico** (maestro, firma, colorimetría, cámaras, personas,
> prompts/pipeline). **NO aprobada** la capa de composición gráfica sobre la foto: las pruebas de
> `EFEONCE_PHOTO_TEXT_SPACE_AND_FORMATS_V1.md` fueron rechazadas por el operador y ese documento vale por sus
> reglas y prohibiciones, no por sus ejemplos.


## 🔴 Componer lo sensible, y que el modelo sólo TERMINE **[operador, 2026-09-21]**

**Para resultados óptimos, la composición se arma con todos sus elementos sensibles APARTE, se juntan
determinísticamente, y recién entonces se le pasa esa referencia al modelo, que aporta ACABADO y nunca
DIBUJO.**

Sensible es toda **marca, texto exacto, cifra o arte oficial**. Un modelo no sostiene una marca:
medido el 2026-09-21 en cuatro pasadas sobre la misma pieza, describirle el logotipo dio un borrón con
forma de flecha, pasarle el arte plano lo dejó ilegible y, aun con la foto del producto delante, la
nave de la «o» salió distinta cada vez. No se arregla pidiéndoselo mejor: se arregla **no
pidiéndoselo**.

| Paso | Qué se hace |
|---|---|
| 1 | **Separar lo sensible** y componerlo desde el archivo oficial; lo neutro va en SVG plano |
| 2 | **Armar** la pieza con esas partes ya resueltas (warp/composite determinístico) |
| 3 | **Pasarle el armado al modelo** pidiéndole SÓLO material y luz — tejido, relieve, plástico, metal, acrílico, sombras—, repitiendo que las marcas no se tocan |
| 4 | **Mirar el resultado al 100%** antes de usarlo |

Dos reglas que salieron del mismo caso:

- **Las proporciones se CALCULAN desde el objeto real, no se fijan a ojo.** El operador cazó dos a la
  primera: la unidad del patrón de la cinta mide **7,05 veces** su ancho (puesta a ojo en 3,4 el
  logotipo salió alargado y el eslogan achatado) y el yoyo **1,6 veces** ese ancho —32 mm contra 20 mm
  reales— cuando estaba en 2,5.
- **Arte plano ≠ foto del producto.** El arte plano sirve para **producir** vistas de un kit; para
  **usar** la pieza en una escena, la referencia es la **foto del producto terminado**.

Herramienta: **`pnpm foto:lanyard`**. Caso completo y medido:
`ai-generations/2026-09-21_lanyard-deterministico/LEEME.md`.


🔴 **ANTES de generar una pieza con un asset de marca —ropa corporativa, lanyard, merch, logo 3D,
isotipo, nave o mascotas— carga el [contrato de selección de referencias](../EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md).** Hay **279 archivos en
10 kits**: el problema nunca es que falte la vista, es **elegir la correcta**. Resume tres reglas:

1. **Tres clases de asset, no intercambiables.** Arte plano → **producir** vistas del kit · pieza
   aislada → **construir** · **pieza en uso / producto terminado → USAR en una escena**. Darlos al
   revés hace que el modelo **reinvente la marca**.
2. **Lo sensible se compone; el modelo sólo termina.** Toda marca, texto exacto o arte oficial se arma
   determinístico y al modelo se le pide **sólo material y luz**. Un modelo no sostiene una marca:
   cuatro pasadas sobre la misma pieza dieron cuatro logotipos distintos.
3. **Las proporciones se calculan del objeto real**, nunca a ojo.

Y **abre el `LEEME.md` y el manifiesto del kit antes del prompt**: su `cuando_usarla` dice qué vista
corresponde, y si el kit trae **prueba en persona**, ésa es el punto de partida.

## Ads: proporción del lecho y continuidad

El lecho debe sostener la firma sin quitar protagonismo a la escena. La sesión SEO/AEO rechazó primero una firma alta y después el primer plano excesivo que seguía tapando casi media foto. Corregir juntos el encuadre físico y el SVG, conservar materia/desenfoque óptico y no imponer el porcentaje de un caso a todo el catálogo. [Método completo](../social/2026-09-22-seo-aeo-paid-media-production-method.md): ficha/prompt compilado, referencias, anatomía, composición, formatos, embudo y handoff. [Compositor CTA vigente y límites](../EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md). Desde el 2026-09-23, la firma de una pieza con CTA la verifica `pnpm foto:cta:gate` (el contrato de la firma está en el §18 de ese documento): sólo su salida 0 certifica, y ni con 0 reemplaza mirar el cierre al pie.
