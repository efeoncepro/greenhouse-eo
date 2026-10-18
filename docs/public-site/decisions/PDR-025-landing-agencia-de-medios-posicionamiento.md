# PDR-025 — Posicionamiento de la landing "Agencia de Medios"

> **Tipo:** Product Decision Record de posicionamiento y conversión del sitio público.
> **Estado:** Accepted · **publicada e indexable el 2026-10-16** (operador: «pública directo + menú»)
> **URL:** https://efeoncepro.com/servicios/agencia-de-medios/ — página WordPress `251981`, hija de `/servicios/` (`251077`)
> **Brief SEO/AEO:** [Agencia de Medios Landing SEO/AEO Brief V1](../AGENCIA_DE_MEDIOS_LANDING_SEO_AEO_BRIEF_V1.md)
> **Convive con:** [PDR-022](PDR-022-landing-performance-marketing-posicionamiento.md) (Performance Marketing, publicada el 2026-10-17 en `/servicios/performance-marketing/`)
> **Oferta:** [Media & Distribution](../../services/media-distribution/README.md) ·
> [Publicidad programática — ficha](../../services/media-distribution/PROGRAMMATIC_MEDIA_OPERATIONS_SERVICE_V1.md) ·
> [Basis — oferta de medios 2026-10-12](../../audits/commercial/BASIS_DISCOVERY_AND_MEDIA_OFFER_2026-10-12.md)
> **Pieza hermana:** brochure «Agencia de Medios» (línea Voice), canonizado el 2026-10-16 en
> [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md)
> **Operación del runtime:** skill `efeonce-public-site-wordpress` →
> `references/landings/agencia-de-medios.md` y fila en `references/landing-registry.md`
> **Skills:** `efeonce-public-site-wordpress`, `seo-aeo`, `copywriting`, `efeonce-graphic-line`,
> `greenhouse-growth-forms`.

## Delta 2026-10-17 — Performance publicada y legacy retirada

`TASK-1865` publicó la landing de Performance el 2026-10-17 en https://efeoncepro.com/servicios/performance-marketing/
(página `251997`, `index, follow`). La legacy `/servicio-gestion-campanas-publicitarias/` quedó `private` con 301 hacia
esa URL y el ítem «Performance Marketing & Paid Ads» del menú apunta a la página nueva. Efecto en esta decisión:

- el Contexto y §Convivencia describían a Performance como no publicada y a la legacy en el menú: eso queda superado;
- la tabla de términos de §Convivencia sigue vigente sin cambios;
- el enlace por función Medios → Performance usa `/servicios/performance-marketing/`; no está en la fuente versionada
  de Medios y queda pendiente de construir (cambiar el cuerpo exige el republicador con guarda de hash). La fuente del
  canvas de Performance ya enlaza hacia Medios;
- empieza la ventana de revisión en Search Console de ambas URLs.

## Contexto

La oferta de medios de Efeonce (planificación, compra, creatividad y medición de medios pagados, con search, social,
video, TV conectada, audio, DOOH y retail media) tenía brochure pero no tenía página pública. La única página cercana
del sitio era la legacy `/servicio-gestion-campanas-publicitarias/`, que el menú todavía presenta como Performance
Marketing, y la landing de Performance que define PDR-022 sigue sin publicar (`/servicios/performance-marketing/`
responde 404).

La investigación Semrush del 2026-10-16 (Chile, México, Colombia, Perú y Estados Unidos) mostró que «agencia de medios»
es una categoría propia, con demanda pequeña pero de baja dificultad, y que en Chile no compite con «agencia de
performance marketing»: el top 10 de ambas búsquedas no tiene dominios en común y performance tiene 16 veces más
volumen. Son dos intenciones distintas y caben dos páginas sin canibalizarse. El detalle está en el
[brief](../AGENCIA_DE_MEDIOS_LANDING_SEO_AEO_BRIEF_V1.md).

## Decisión

1. **«Agencia de medios» es la categoría y la frase clave de la página.** Va en title, H1, slug, focus keyphrase y
   OpenGraph. Las secundarias son «compra de medios», «planificación de medios», «plan de medios» y «publicidad
   programática»; se trabajan en el cuerpo y en el FAQ, no en el slug.
2. **Slug `/servicios/agencia-de-medios/`**, hija del hub `/servicios/`, siguiendo el patrón «slug de categoría,
   keyword en title y H1» de [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md).
3. **Separación de Performance.** «Performance marketing» queda fuera del title, del H1 y del slug de esta página. La
   landing de Performance (PDR-022) conserva su término y su URL de trabajo. Reglas de convivencia en §Convivencia.
4. **Menú:** ítem «Agencia de Medios» (`251987`) en el menú principal `61`, bajo Soluciones → Crecimiento Multicanal
   (`248606`), al final del grupo, junto a «Performance Marketing & Paid Ads» y «Content Marketing». Ningún otro ítem
   cambió.
5. **Ejecución source-led:** la página se compila desde el canvas Design aprobado
   («Landing Agencia de Medios», https://claude.ai/artifact/Ns3R6Q1eSYrg3KGQwwWyzE, sistema La órbita, línea Voice)
   a dieciséis widgets nativos de Elementor, con el mismo patrón de la landing de Agencia Creativa
   ([PDR-004](PDR-004-landing-agencia-creativa-posicionamiento.md)). Las láminas del brochure no se incrustan como
   imagen: se recomponen para web.

## Posicionamiento

### One thing

> **¿Dónde invierto? Donde rinde.**

### Promesa

Una agencia de medios que conecta tu inversión publicitaria con tus ventas: planifica, compra, crea y mide el mix de
medios pagados con la señal de negocio y el CRM como referencia. H1 publicado: «Agencia de medios que conecta tu
inversión publicitaria con tus ventas.», seguido de un párrafo con los canales.

### Recorrido de la página (16 secciones)

Hero «¿Dónde invierto? Donde rinde●» · canales en marquesina · Efeonce en números y logos de clientes · la diferencia
(comparativo con logo Efeonce) · todo el ciclo (planificar, crear, comprar, medir) · selector «¿Cómo vendes?»
Commerce/B2B · la señal y «por qué revisar tu pauta ahora» · performance por plataforma (Google, Meta, TikTok y
LinkedIn con mockups nativos; formatos 9:16, 4:5, 1:1, 16:9 y Demand Gen 1,91:1; DCO 3×3; «probado antes de escalar»;
tecnología de compra y verificación) · pantallas (recorrido horizontal fijado con loops de video) · medición (flujo de
señal por GTM, órbita de atribución, tablero Efeonce Insights, incrementalidad) · equipo (squad) · cómo cobramos ·
método por etapas · partners · FAQ (11 preguntas) · agenda con formulario de diagnóstico.

Las creatividades de ejemplo usan una marca ficticia, «Nórtica»; ninguna pieza se presenta como trabajo de un cliente.

## Claims

**Permitidos (decisión del operador, 2026-10-16):**

- «+120 empresas en 4 países» como proof point, y cinco países de operación: Chile, Colombia, Perú, México y Estados
  Unidos.
- HubSpot Gold y Salesforce como **partners**.
- Basis, DV360, The Trade Desk, IAS y DoubleVerify como **tecnología que operamos**.
- Isotipos de las marcas donde se nombran.

**Prohibidos:**

- Presentar Basis, DV360, The Trade Desk, IAS o DoubleVerify como alianzas o partnerships.
- Prometer declarar o traspasar rebates o comisiones de medios: son parte de la ganancia de Efeonce. El dato vigente
  es «Tus cuentas: siempre a tu nombre» (la misma regla corrigió la lámina 62 del brochure).
- Un caso Sky de medios: no se ha hecho medios con Sky.
- Publicar Eusari (ROAS ~3×, +55 % de ventas Shopify sobre baseline) mientras el operador no lo autorice.
- Basis, DV360 o The Trade Desk en las descripciones sociales mientras no exista el inventario por mercado.
- Precios, tarifas o garantías de ROAS, CAC o ventas.

## Convivencia con Performance (PDR-022)

| Término | Página dueña | La otra página |
|---|---|---|
| agencia de medios · compra de medios · planificación de medios · plan de medios | Agencia de Medios | No lo usa en title, H1 ni slug |
| agencia de performance marketing · publicidad digital · pauta digital | Performance (PDR-022) | No lo usa en title, H1 ni slug |
| publicidad programática | Agencia de Medios (secundaria; confirmado por el operador el 2026-10-16) | Performance la conserva como canal dentro de su sección de canales y enlaza a Medios |

- Cada página enlaza a la otra por función cuando ambas estén publicadas; hoy Performance no existe y Medios no le
  enlaza.
- Cuando TASK-1865 publique Performance, revisa la Search Console de ambas URLs durante las primeras semanas: si una
  query aparece servida por las dos, se ajusta el copy de la que no es dueña.
- La legacy `/servicio-gestion-campanas-publicitarias/` sigue en el menú; su retiro con 301 sigue siendo parte de
  TASK-1865 y no lo cambia esta decisión.

## Conversión

Formulario Growth Forms dedicado `efeonce-media-diagnostic` (variante `hubspot_pillar`, la única que en producción
dibuja la selección múltiple como chips) en una tarjeta clara dentro de la sección agenda, con destino HubSpot direct
«Lead Gen - Agencia de Medios» y propiedades `gh_form_medios_modelo_venta`, `gh_form_medios_canales` y
`gh_form_medios_inversion_mensual`. El contrato del formulario vive en
[`growth-public-forms-runtime-contract.md`](../../architecture/growth-public-forms-runtime-contract.md).

## Consecuencias

- La página es un nodo de la capa de adquisición ([PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md)) para la
  oferta de medios de la línea Media & Distribution.
- PDR-022 y su brief reciben un delta de convivencia; TASK-1865 recibe el delta de impacto cruzado.
- Cambiar el cuerpo de la página exige un republicador con guarda de hash: el publicador sólo crea páginas nuevas
  (ver la referencia operativa de la skill).

## No-goals

- No reemplaza a la landing de Performance ni retira la legacy.
- No crea páginas por canal ni por plataforma.
- No publica precios, rebates ni casos sin autorización.
- No incrusta el brochure ni sus láminas como imagen.

## Pendientes

1. Primer envío real desde navegador (Turnstile bloquea la automatización) para confirmar la entrega a HubSpot y el
   evento `generate_lead` en GA4.
2. La casilla de novedades se guarda en Greenhouse pero no crea suscripción en HubSpot: elegir tipo de suscripción o
   quitar la casilla.
3. Rich Results Test y observación en Google Search Console.
4. Si el operador prefiere listas desplegables en vez de chips: extender el renderer de Growth Forms y hacer release.
5. Cautelas que vienen del brochure: cifra de Bresler contra su caso, autorización de logos de clientes (TASK-1937),
   readback de HubSpot Gold, inventario de Basis por mercado y alcance de DCO e incrementalidad frente a Performance.
