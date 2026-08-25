# 01 · Editorial Strategy (operacionalizada)

Convierte una intención de contenido en un **sistema editorial operable**: pillars → clusters → calendario → cadencia. Aquí no se decide *si el contenido es un canal* (eso es `digital-marketing`) ni *si convierte* (`growth-marketing-cro`); aquí se **construye la máquina editorial** que produce autoridad con foco.

## Content-market fit primero

Antes de un solo tema, ancla tres cosas (si no las tienes, pídelas o delega):

- **ICP + JTBD por etapa de funnel** — qué pregunta/problema tiene la audiencia en awareness / consideración / decisión / retención. Efeonce tiene **múltiples ICPs/segmentos**; la definición es de `efeonce-agency` + `commercial-expert`, **no se inventa aquí**.
- **Ángulo propietario** — el POV/insight/dato que solo tú puedes aportar (barra 2026: sin insight original, no compite).
- **Objetivo de negocio** — a qué contribuye (demanda, autoridad, retención) y cómo se medirá (`06`).

Sin content-market fit, un calendario es solo un cronograma de publicar por publicar.

## Topical authority: pillars → clusters

El modelo canónico para construir autoridad temática sin dispersarte:

- **Pillar** — hogar canónico, durable y evergreen de un territorio. Permite aprender el mapa, explorar satélites
  y, cuando corresponde, decidir; puede empezar como Document Pillar y no depende de un post type. Es el activo
  que se **atomiza** (`04`) y se **distribuye por siempre** (`05`).
- **Cluster** — piezas satélite que cubren subtemas/preguntas específicas y enlazan al pillar. Densifican el tema y capturan intención específica.
- **Internal linking + intención de búsqueda + schema** = **táctica de `seo-aeo`**, no de este módulo. Aquí decides *qué pillars y qué clusters*; seo-aeo decide *cómo se estructura técnicamente para descubribilidad*.

Regla: **elige pocos pillars y ve profundo**, no muchos temas superficiales. 3–5 pillars bien cubiertos > 30 posts dispersos.

### Cómo elegir pillars (heurística)

1. Cruce de **lo que el negocio vende** × **lo que la audiencia busca/pregunta** × **donde tienes autoridad real** (evita temas sin credibilidad).
2. Valida **demanda** (volumen/intención — con `seo-aeo`/Semrush) y **diferenciación** (¿ya está saturado? ¿tienes ángulo?).
3. Prioriza por **contribución al funnel** + **capacidad de producción sostenible**.
4. Define la función antes del renderer: `post`, `page`, Gutenberg, Elementor o Astro no determinan si una pieza
   es Pillar. Para Efeonce, aplica PDR-018 al separar Think producto de `think.efeoncepro.com` host.

## Mapa Pillar Experience → Cluster Experience (artefacto)

Cada Pillar se documenta con nodos que resuelven trabajos de aprender, aplicar, evaluar, verificar o decidir. El
cluster federado puede incluir artículos, casos, templates, research, tools y piezas platform-native; cada nodo
declara superficie, roles, etapa, progreso, relación, medición y siguiente paso. No agrupes assets sólo por keyword
ni eleves toda pieza social al cluster.

```
PILLAR: "AEO: cómo te encuentra la IA"  [autoridad + demanda | evergreen]
├─ cluster: "¿Qué es AEO vs SEO?"            [awareness]
├─ cluster: "Cómo medir citabilidad en LLMs" [consideración]
├─ cluster: "Checklist de contenido citable" [consideración | lead magnet → 03]
├─ nodo platform-native: video "AEO vs SEO en 90s" [search + comprensión]
└─ activation assets → newsletter (Glitch), 5 posts social, 1 webinar clip
```

Plantilla: `templates/pillar-cluster-map.md`.

## El ciclo de entidad recurrente (un pillar que compone cada año)

> As-of 2026-08-25. Es un caso de pillar que la heurística de arriba no captura, porque llega
> disfrazado de pieza de calendario.

Si el cliente tiene una **entidad propia que se repite cada año** —color del año, informe
anual, ranking, premio, índice—, **no es un artículo estacional: es un clúster que compone
autoridad cada año**, y es el único territorio donde **ningún competidor puede entrar**, porque
la entidad lleva su nombre.

🔴 **El error a nombrar:** clasificarlo como *«masa de calendario»* y bajarle prioridad. Ahí
vive la gravedad de marca. Un pillar genérico se disputa con todo el mercado; éste, sólo consigo
mismo.

**Kit reutilizable del ciclo** — la cadencia es **relativa al anuncio**, no a fechas fijas, así
el mismo kit sirve cualquier año:

| Hito | Pieza | Rol en el cluster |
|---|---|---|
| **D−30** | reservar/arreglar el **slug destino** | que la ficha nazca en una URL enlazable |
| **D+0** | **ficha ancla** de la edición | hogar canónico del año |
| **D+2** | **aplicación profesional** | prueba de uso (comprador técnico) |
| **D+30** | **satélite de espíritu anclado a estacionalidad** | ⭐ el eslabón que suele faltar y **el que produce capilaridad** |
| **D+75** | **paleta / desarrollo mayor** | profundidad |
| **D+150** | **tendencia cultural** | co-ocurrencia fuera de categoría |
| **D+240** | **segundo desarrollo** | sostiene el clúster hasta el ciclo siguiente |

🔴 **Bidireccionalidad obligatoria** en el mapa pillar→cluster: cada satélite enlaza a la ficha
ancla **y** de vuelta, y la **ficha del año N se encadena con la del año N−1**. Sin eso, cada
edición nace de cero y el ciclo no compone. La táctica de enlazado y su **medición** (descartar
el enlazado de plantilla) es de `seo-aeo` → `modules/03_EEAT_ENTITY.md` +
`modules/05_OFFPAGE_AUTHORITY.md`.

## Estacionalidad vinculante (no efeméride genérica)

Lo coyuntural sólo compone si **ata con la marca Y con el concepto de la pieza**. Test de
vínculo, en orden: **(1)** ¿el ritual **es** el concepto?; **(2)** ¿su paleta/materia es la del
producto?; **(3)** ¿hay demanda medida con SERP verificado?; **(4)** ¿queda hueco leyendo el
contenido propio?

🎯 **Prefiere el marco reutilizable a la efeméride puntual.** Una pieza atada a una fecha
**caduca**; un **marco de temporada se recicla y se actualiza cada año** — y eso es lo que
produce capilaridad. ⚠️ Volumen alto con vínculo débil es trampa: un ritual muy buscado puede
tener SERP de receta, de organismo público o de retail (territorio ajeno). Verificación de SERP
→ `seo-aeo/modules/02_SEO_CONTENT.md`.

## Calendario editorial (el sistema, no la lista)

Un calendario editorial operable declara, por pieza:

- **Tema + pillar/cluster** al que pertenece (nada huérfano del mapa).
- **Etapa de funnel + objetivo** (para qué existe).
- **Formato** (`03`) y **canal de destino**.
- **Owner + fechas** (brief, draft, review, publish) — el workflow lo detalla `02`.
- **Plan de distribución + átomos** (`04`, `05`) — declarado al planificar, no después.
- **Métrica de éxito** (`06`).

**Cadencia sostenible > volumen heroico.** Es mejor 1 pillar/mes bien atomizado y distribuido que 3 posts/semana sin distribución que nadie lee. Define una cadencia que el equipo real pueda mantener 6 meses.

### Ritmo típico (calibrar por capacidad)

- **Pillar profundo:** mensual o quincenal.
- **Cluster / posts de apoyo:** semanal.
- **Newsletter:** cadencia fija (semanal/quincenal) — el compromiso de fecha es sagrado (`03`).
- **Social:** mezcla gobernada de platform-native cluster nodes y activation assets derivados (`04`); el formato
  no decide el rol.

## Balance de portafolio de contenido

Un motor sano no es todo lo mismo. Equilibra:

- **Por etapa de funnel:** no todo awareness (no genera pipeline) ni todo decisión (no genera audiencia). Mezcla.
- **Por objetivo:** demanda / autoridad / retención / enablement.
- **Por esfuerzo:** piezas ancla (caras, pocas) + átomos (baratos, muchos) + curación/reactivos (ágiles).
- **Evergreen vs coyuntural:** el evergreen es el activo que compone en el tiempo; lo coyuntural da relevancia y alcance puntual. Prioriza evergreen como base.

## Checklist de salida del módulo

- [ ] Content-market fit anclado (ICP+JTBD por etapa + ángulo propietario + objetivo medible).
- [ ] 3–5 pillars elegidos con criterio (negocio × demanda × autoridad).
- [ ] Mapa pillar→cluster con etapa de funnel y atomización planificada.
- [ ] Calendario con cadencia **sostenible**, cada pieza ligada al mapa.
- [ ] Portafolio balanceado (funnel/objetivo/esfuerzo/evergreen).
- [ ] Si hay **entidad recurrente**: tratada como clúster con kit de cadencia relativa y
      bidireccionalidad año N ↔ N−1, no como pieza de calendario.
- [ ] Cada pieza coyuntural pasa el **test de vínculo** de estacionalidad (4 pasos).
- [ ] Hand-offs nombrados: ICP→`efeonce-agency`; demanda/keywords→`seo-aeo`; ¿convierte?→`growth-marketing-cro`.

## Cross-links

- Operar la producción → `02`; formato de cada pieza → `03`; atomizar el pillar → `04`.
- Distribución → `05`; medir → `06`; con IA → `07`.
- Caso Efeonce (Think/Manzanitas/Glitch) → `efeonce/EFEONCE_OVERLAY.md`.
- Artefactos → `templates/pillar-cluster-map.md`, `templates/editorial-calendar.md`, `templates/content-strategy-brief.md`.
