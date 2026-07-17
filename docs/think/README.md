# Think Docs

`docs/think/` documenta los patrones de producto, UI y operacion del hub publico
Think (`think.efeoncepro.com`) cuando una experiencia vive fuera del portal
Greenhouse pero depende de contratos, datos o renderers gobernados por
Greenhouse.

Think no es el sitio principal de Efeonce. El sitio principal sigue siendo
`efeoncepro.com`; Think es un satelite publico para experiencias enfocadas,
herramientas, reportes y superficies de lectura ejecutiva.

## Indice

- [Arquitectura de patrones UI Think](architecture-ui-patterns.md)
- [Landing Brand Visibility](brand-visibility-landing.md)
- [Manual para reutilizar patrones UI Think](reuse-ui-patterns-manual.md)
- **[Radiografía AEO — Arquitectura](radiografia-aeo-architecture.md)** · **[Manual](radiografia-aeo-manual.md)**

## Herramientas vivas en Think

| Herramienta | Qué es | Ruta |
|---|---|---|
| **AI Visibility Grader** | Diagnóstico público de visibilidad en motores de respuesta, por token. Greenhouse calcula, Think presenta. Mide el hueco: presencia, citación, competidores, readiness y próximos pasos. | `/brand-visibility` · `/brand-visibility/r/<token>` |
| **Radiografía AEO** | Herramienta de educación y sales enablement SEO/AEO. Recorre en 4 pantallas un artículo real, expone su capa técnica y demuestra cómo un hueco medido se convierte en contenido visible, citable y distribuible. El **cliente es un payload**, no código. | `/muestras/<slug>-<token>` |

## Principios

- **Greenhouse calcula; Think presenta.** Los modelos, contratos, formularios,
  status, tokens e informes vienen de Greenhouse.
- **Grader diagnostica; Radiografía demuestra.** El Grader responde "qué hueco
  existe"; la Radiografía responde "cómo se tapa con trabajo visible". No son
  sustitutos ni dos lead magnets.
- **Think puede tener lenguaje visual propio.** Las landing pages publicas pueden
  usar ritmo editorial, hero inmersivo, motion y assets de marca que no pertenecen
  al portal operacional Vuexy.
- **No duplicar dominios gobernados.** Think no crea formularios locales,
  validaciones paralelas, consentimiento paralelo, submit paralelo ni proxy CORS
  para resolver lo que ya gobierna Growth Forms.
- **La jerga debe ser precisa.** Usar `IA` cuando ayuda al reconocimiento del
  usuario, pero preferir terminos AEO/GEO/SEO como `motores de respuesta`,
  `superficies generativas de busqueda`, `citabilidad`, `operabilidad`,
  `Share of Model`, `AI Overviews` o `respuestas generadas` cuando se describe
  el mecanismo real.
- **La UI se valida como producto vivo.** Cada patron visible debe verificarse en
  desktop y mobile con captura visual, overflow check, estados degradados y una
  prueba del contrato browser que consuma.
- **Un gate verde con una captura ilegible no es un cierre valido.** El gate no
  mira. Varios bugs de la Radiografia AEO solo aparecieron al ABRIR el PNG — entre
  ellos una regla CSS que nunca se agrego (el reemplazo apuntaba a una clase que ya
  no existia = no-op silencioso) y que dejaba los textos de lector de pantalla
  visibles en pantalla.
- **Una muestra con marca de cliente NUNCA emite su schema como marcado activo.**
  Publicar en `think.efeoncepro.com` un `application/ld+json` que declare
  `author: <cliente>` es un dato estructurado FALSO en nuestro propio dominio,
  ingerible por crawlers. Se muestra como texto escapado. Ver Radiografia AEO.

## Contratos relacionados

- [Growth AI Visibility Grader - documentacion funcional](../documentation/growth/ai-visibility-grader.md)
- [Growth AI Visibility Grader - smoke manual](../manual-de-uso/growth/ai-visibility-grader-smoke.md)
- [Public AI Visibility Grader Architecture](../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)
- [Growth Public Forms Runtime Contract](../architecture/growth-public-forms-runtime-contract.md)

## Regla de frontera

Los patrones Think se pueden reutilizar dentro de Think o en otras experiencias
publicas satelite. Para llevarlos al portal Greenhouse hay que traducirlos a la
plataforma UI privada: primitives, tokens, `CompositionShell`, density contracts,
GVC y contratos de task UI cuando aplique.
