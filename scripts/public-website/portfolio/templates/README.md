# Plantillas de proyecto del portafolio

Documentos `portfolio-entry.v1` de partida, uno por tipo de proyecto, para `pnpm public-website:portfolio`. No se
aplican tal cual: son copias de trabajo con marcadores.

| Plantilla | Tipo (`kind`) | Úsala para |
|---|---|---|
| `campaign.json` | `campaign` (por defecto) | Campañas e identidades: hero con hasta tres piezas, reto/idea/ejecución, cifras con fuente y galería por capítulo. |
| `social.json` | `social` | Trabajo de redes: cada pieza es una publicación (`role: "post"`) con su `channel`, `placement` y el texto real del post. |
| `audiovisual.json` | `audiovisual` | Piezas de video: pieza madre y cortes (`role: "cut"` con `version` y `durationSeconds`), rodaje (`role: "bts"` con `consentRef`), ficha técnica y créditos. |
| `ai-production.json` | `ai-production` | Producción con IA: el bloque `ai` (modelos y lo que hizo el equipo), hoja de personaje y escena con antes y después (`compareTo`). |
| `seo-content.json` | `seo-content` | SEO, AEO y contenidos: el bloque `search` (fuente, periodo y cifras), contenidos publicados y banners. Necesita `metrics` en la aprobación para publicarse. |

## Cómo se usan

```bash
pnpm public-website:portfolio -- kinds
pnpm public-website:portfolio -- new <slug> --kind <tipo>
pnpm public-website:portfolio -- validate <slug>
```

`new` copia la plantilla a `tmp/portfolio/<slug>/working.json` y pone el slug donde dice `COMPLETAR-slug`.

## Marcadores

- Todo texto `[COMPLETAR…]` y todo `"mediaId": 1` es relleno. `validate` los lista y `apply` no guarda mientras quede
  alguno.
- Los valores que no son marcadores (`industry`, `line`, `services`, fechas `2026-01-01`, dimensiones, `durationSeconds`,
  números de las series) son forma, no datos: cámbialos por los reales.
- Nunca dejes cifras, textos de posts o duraciones de ejemplo en un documento real.

## Mantenerlas

Cada plantilla, con el slug reemplazado, debe validar contra el esquema del plugin
(`efeonce-public-site-runtime/wp-content/plugins/eo-portfolio/schema/portfolio-entry.v1.schema.json`). Si cambias el
esquema o una plantilla, compruébalo:

```bash
for k in campaign social audiovisual ai-production seo-content; do
  sed 's/COMPLETAR-slug/prueba-plantilla/g' scripts/public-website/portfolio/templates/$k.json > /tmp/eop-$k.json
  php scripts/public-website/portfolio/local.php validate /tmp/eop-$k.json >/dev/null && echo "ok $k" || echo "FALLA $k"
done
```

Lo que pide cada tipo también está en `KINDS` de `../cli.ts` (lo imprime `kinds`); mantén ambos alineados.

Manual: [Operar el portafolio por la CLI y sus herramientas](../../../../docs/manual-de-uso/public-site/operar-portafolio-por-cli.md).
