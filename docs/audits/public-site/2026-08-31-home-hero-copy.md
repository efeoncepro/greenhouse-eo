# Home: titular y badge — 2026-08-31

Publicado por solicitud explícita del operador en `https://efeoncepro.com/`, página `251731`.
Alcance: titular aprobado, badge superior y subrayado en «mover tu negocio».
Sin bajada nueva: párrafos, CTA, logos, métricas y resto de módulos conservados.

## Contenido y mutación

Widget `greenhouse_agency_hero`, nodo `fe8ffbe`:

| Control | Valor publicado |
| --- | --- |
| `f017_texto` | Tu marketing debería |
| `f018_texto` | mover tu negocio. |
| `f019_texto` | No solo tu calendario. |
| `hero_eyebrow` | Agencia de marketing digital y tecnología |
| `headline_emphasis` | middle |

Guard de portada, publicación, ownership y hash; guardado mediante Elementor `Document::save()`.
Snapshot durable: opción WordPress `_gh_home_hero_copy_20260831_201532`.
Hash anterior: `747470a5f5083b8a5d851433e10618f5c3b714889d6205c64e36a1da242091b1`.
Hash posterior: `ce0dfc757a42043141e722c8fa3c100c00ec70e82556aa70c0d19888ce02c988`.

Readback del árbol coincide con exactamente esos cinco cambios. Metas Ohio/Yoast/thumbnail,
settings Elementor, páginas de referencia y opciones de portada permanecen iguales. La primera
comparación de settings detectó representación serializada frente a array; se normalizó con
`maybe_unserialize` y se verificó equivalencia sin repetir el guardado. Purga Elementor/Kinsta aplicada.

## Runtime y recuperación

Tres archivos del plugin existente `eo-elementor-widgets`:

- `includes/agency/schemas/hero.json`: dos controles nativos opcionales; defaults compatibles.
- `includes/agency/templates/hero.html`: badge y alternativa de énfasis en segundo fragmento.
- `assets/css/agency-elementor.css`: estilos scoped, un subrayado visible y tamaño responsive
  con tokens existentes para mantener el fragmento destacado en una línea.

Despliegue por writer gobernado `deploy-agency-elementor-package.php`, allowlist y hashes previos.
Respaldos remotos temporales: `/tmp/eo-agency-before-20260831-201524.tar` (tres archivos) y
`/tmp/eo-agency-before-20260831-201641.tar` (ajuste CSS posterior).
Manifests, originales y scripts de la revisión: `tmp/home-hero-20260831/` local.
Capturas: `.captures/home-hero-20260831/desktop.png` y `mobile.png`.

Rollback requiere autorización, lectura de drift actual y existencia de los respaldos exactos.
Restaurar contenido desde snapshot por `Document::save()`, junto al runtime compatible;
no sobreescribir cambios posteriores ni escribir `_elementor_data` directamente.
Los respaldos `/tmp` no garantizan retención permanente.

## Verificación

- Suite PHP: 17 módulos, 282 aserciones de textos editables; repeaters y escaping aprobados.
- Lifecycle JS: montaje, limpieza, idempotencia, enlaces y reduced motion aprobados.
- Contrato Elementor live: 17 widgets, cero HTML, 416 controles raíz y seis repeaters; sin fallos.
- Browser real: escritorio 1280×950 y móvil 390×844, inspección visual y overflow horizontal cero.
  Fragmento destacado en una línea; un subrayado visible. Badge y copy coinciden con el CMS.
- Viewport del usuario restaurado; DOM final coincide y conserva overflow cero.

No se certificó guardado/recarga desde la interfaz Elementor autenticada. No se probaron reservas
reales ni se alteraron formularios, SEO, header/footer o políticas de indexación. Este cambio no
cierra la revisión completa de claims ni la task global de la landing.

## Corrección posterior: corte del subrayado en escritorio

El operador reportó un hueco visible en el subrayado. La longitud animada de `stroke-dasharray`
se calculaba en coordenadas SVG, pero `vector-effect="non-scaling-stroke"` impedía que los segmentos
escalaran con el viewport estirado. El check previo de un único SVG visible no verificaba continuidad.
Se retiró ese atributo de los dos trazos alternativos del titular en `hero.html`; el trazo y su
animación ahora escalan juntos, sin cambiar texto, geometría, CSS ni controles.

Despliegue gobernado de un archivo, backup `/tmp/eo-agency-before-20260831-202055.tar`;
manifest local `tmp/home-hero-20260831/underline-manifest.json`, original `underline-before.html`.
Readback live verifica el nuevo hash del template y el mismo hash CMS anterior, sin mutación de contenido.
Suites PHP y lifecycle JS PASS. Inspección visual real a 1280, 1414 y 390 px: trazo continuo tras
animación y overflow cero. Capturas `underline-desktop.png`, `underline-desktop-1414.png` y
`underline-mobile.png` en el mismo directorio de evidencia. Pestaña QA cerrada y viewport restaurado.
