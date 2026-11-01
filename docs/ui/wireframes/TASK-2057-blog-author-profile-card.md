# TASK-2057 — Autor del blog: ficha de autor, byline y schema · wireframe

> Fuente visual aprobada: canvas «Autor del blog Efeonce» (`https://claude.ai/artifact/1F5hwtipS7FHA4uFxcMJew`),
> tableros `Main` (single en contexto), `Card-B-orbita` (ficha recomendada), `Movil` (390), `Byline` y `Foto`, aprobados
> por el operador el 2026-10-24 («estoy de acuerdo con todo lo que me mostraste», más los ajustes por comentario: órbita
> de retrato oficial, isotipos oficiales, punto del nombre, esquina recta, cargo y bio). Sistema: La órbita (AXIS).
> Este wireframe describe regiones, datos y copy; los valores visuales salen del canvas y de los tokens de AXIS.

## Superficies

| Superficie | Dónde | Qué cambia |
|---|---|---|
| Byline del single | encabezado del post (`ohio-child/parts/elements/page_headline.php`) | «Por Julio Reyes» enlazado al archivo, avatar 44 px, fecha · minutos de lectura; sin etiquetas en inglés |
| Ficha de autor | al final del contenido del single | reemplaza la caja de autor de Ohio (redes del demo); ficha B oscura |
| Schema | JSON-LD de Yoast | Person completo y consistente con la ficha; Article.author → Person |
| Cabecera de `/author/<slug>/` | archivo v3 (otra sesión, TASK-2055) | consume el mismo lector; la dibuja la sesión del Archivo |

## Ficha de autor (desktop, columna del artículo ~920 px; 800 px desde 0.5.6)

```text
┌─ aside «Sobre el autor» · fondo ground #001a33 · radio 0 24 24 24 (esquina recta arriba-izq) ─┐
│  ╭──────╮   ESCRIBE                                         (structureLabel, ink-soft)     │
│  │ foto │   Julio Reyes.          ← Bricolage 740, punto en el acento Growth               │
│  │órbita│   Managing & GTM Director · Efeonce Group       (Poppins 500, ink)               │
│  ╰──────╯   Bio corta (≤ 180 car.)                         (Poppins 400, ink-soft)         │
│  208 px     [Loop Marketing] [IA aplicada] [SEO/AEO]      ← temas que existen como categoría│
│  pieza      ───────────────────────────────────────────                                    │
│  portrait   [ Ver sus 44 artículos → ]  (in) (ig)          ← sólo redes con URL             │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Retrato: pieza `portrait` de AXIS (`portraitOrbitSvg`): anillo r 96/208 al 40 % del halo, foto r 78/208, arco
  200°–250° trazo 4/208 y esfera 7/208 en el acento Growth. Una sola esfera: el nombre cierra con punto tipeado.
- Redes: isotipos oficiales de `@efeoncepro/axis-brand-assets` (`assets/platforms/*-isotype`), en `currentColor`,
  botones de 44 px con nombre accesible «LinkedIn de Julio Reyes», `rel="me noopener"`, orden del `sameAs`.
- La web personal no se pinta hasta que el sitio esté en línea (operador, 2026-10-24).
- Delta 2026-10-25 (0.5.6, revisión del operador; en producción desde el 2026-10-25): ficha más contenida en escritorio. Ancho
  máximo 800 px (antes 920), retrato 160 px (antes 208), nombre `clamp(28px,3vw,36px)` (≤ 36), cargo y bio 15 px,
  CTA 14 px, padding `clamp(24px,3vw,36px)`, gap 32, iniciales 38 px.
- Margen inferior: 96 px bajo la ficha (64 en teléfono) antes de «Related Posts» de Ohio (0.5.5).
- Todo enlace de la ficha lleva `-unlink -undash` para que el hover de Ohio no lo repinte (0.5.5).

## 390 px

Ficha apilada: retrato 120 px junto a «Escribe» + nombre; cargo, bio y temas debajo; CTA a todo el ancho (48 px);
redes centradas en botones de 48 px. Radio 0 20 20 20.

## Byline

```text
(avatar 44, anillo fino del acento)  Por Julio Reyes          ← enlace a /author/<slug>/
                                     18 jul 2026 · 21 min de lectura · Actualizado 12 oct 2026 (si aplica)
```

Sin «Author», «Published» ni «Join the Conversation». La mini ficha al foco/cursor queda como mejora posterior
(no bloquea).

## Datos (contrato `EO_Author_Profile`)

| Campo | Fuente | Regla |
|---|---|---|
| name | `display_name` | — |
| role | cargo del perfil (Yoast) | nunca la «primera frase de la bio» |
| bioShort | meta propia, ≤ 180 caracteres | si falta, la ficha usa la bio larga recortada en frase completa |
| bioLong | `description` | — |
| photo / photoLarge | One User Avatar, 96 y 300 px | nunca Gravatar; iniciales si falta |
| links | redes de Yoast (+ web sólo si está en línea) | mismo orden y mismas URL que el `sameAs` |
| topics | `knowsAbout` | enlaza sólo a categorías que existen y tienen posts; no mezcla las 6 de la órbita |
| postCount, archiveUrl | posts publicados, `get_author_posts_url` | cuentas de servicio y autores sin posts → sin ficha |

## Copy

| Elemento | Texto |
|---|---|
| Eyebrow | Escribe |
| CTA | Ver sus {n} artículos |
| Byline | Por {nombre} · {fecha} · {n} min de lectura |
| Nombre accesible de redes | {Red} de {nombre} |
| aside aria-label | Sobre el autor |

## Estados

- Autor con todo: ficha completa.
- Sin redes: no se pinta la fila de redes; el CTA queda solo.
- Sin foto: iniciales en Bricolage dentro de la órbita.
- Sin bio: ficha sin párrafo.
- Autor de servicio o sin posts publicados: sin ficha (y sin enlace en el byline).
