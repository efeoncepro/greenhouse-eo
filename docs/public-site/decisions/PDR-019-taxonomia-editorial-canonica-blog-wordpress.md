# PDR-019 — Taxonomía editorial canónica del blog WordPress

> **Estado:** Accepted  
> **Fecha:** 2026-08-31  
> **Ámbito:** Public Site / WordPress / Blog / SEO-AEO

## Contexto

El blog de Efeonce conservaba categorías de la demo Ohio, variantes duplicadas
y relaciones padre-hija que confundían una disciplina editorial con una
subdisciplina comercial. Además, el permalink vigente
`/%category%/%postname%/` convierte algunos cambios de categoría en migraciones
de URL.

La limpieza del 2026-08-31 retiró únicamente los posts demo, reclasificó los
posts reales y dejó trece términos editoriales. Este PDR fija su significado y
evita que la jerarquía de WordPress se interprete como orden de importancia en
la portada.

## Decisión

La taxonomía canónica queda así:

```text
AEO
Diseño
└── Diseño Web
Glitch
Growth
HubSpot
Inbound Marketing
Inteligencia Artificial
Loop Marketing
Marketing Digital
└── Redes Sociales
Novedades Efeonce
SEO
```

Reglas:

- AEO y SEO son categorías raíz hermanas. SEO no depende de Inbound Marketing.
- `Inteligencia Artificial` conserva el slug estable `ai`.
- `Diseño Web` es especialización de `Diseño`; `Redes Sociales` es
  especialización de `Marketing Digital`.
- HubSpot e Inbound Marketing permanecen separados: HubSpot cubre plataforma,
  CRM y servicios; Inbound Marketing cubre la metodología.
- Loop Marketing es un marco editorial propio de Efeonce y permanece raíz.
- Glitch permanece como categoría raíz porque hoy identifica una serie/editorial
  reconocible. Si luego requiere atributos propios, se evaluará una taxonomía
  custom sin alterar esta decisión de forma implícita.
- Novedades Efeonce contiene noticias institucionales, no tendencias genéricas.
- Una categoría raíz no obtiene automáticamente prominencia en la home, ni pasa
  a ser la categoría primaria Yoast de sus posts.
- Una categoría vacía, como Redes Sociales en este corte, no se promueve ni se
  enlaza como destino principal hasta tener contenido suficiente.

## Exposición recomendada en la futura home del blog

- Núcleo visible: AEO, Inteligencia Artificial, HubSpot, Loop Marketing,
  Diseño y Growth.
- Descubrimiento complementario: SEO, Inbound Marketing y Marketing Digital.
- Glitch: bloque editorial propio, no mezclado como un tema genérico.
- Novedades Efeonce: carril secundario institucional.
- Redes Sociales: oculta de la navegación destacada mientras esté vacía.

La selección del hero, el tamaño de una tarjeta y la aparición en bloques
destacados se deciden en los widgets/queries de la home; no se deducen del padre
de categoría ni de la categoría primaria de un post.

## Consecuencias

- Todo cambio futuro de slug, padre o categoría primaria que altere una URL debe
  seguir el protocolo de snapshot, redirect, enlaces internos, purge y QA.
- Los módulos Demo 35 deben reconfigurarse con esta taxonomía y con posts reales;
  los IDs Ohio eliminados no son una fuente editorial válida.
- Tags permanecen como faceta secundaria y requieren una limpieza separada antes
  de exponerse como navegación pública.

## Alternativas descartadas

- Mantener categorías demo: mezcla contenido ficticio con la oferta real.
- Dejar SEO bajo Inbound: reduce SEO a una sola metodología y deforma el mapa
  editorial actual.
- Convertir toda la jerarquía en categorías raíz: pierde relaciones útiles de
  especialización sin resolver la curaduría de portada.

## Evidencia y operación

- `docs/audits/public-site/2026-08-31-blog-taxonomy-demo35-work-copy.md`
- `docs/documentation/public-site/wordpress-blog-content-hub-search.md`
- `docs/manual-de-uso/public-site/operar-wordpress-blog-content-hub-search.md`
- `.codex/skills/efeonce-public-site-wordpress/references/taxonomy-permalink-migrations.md`

