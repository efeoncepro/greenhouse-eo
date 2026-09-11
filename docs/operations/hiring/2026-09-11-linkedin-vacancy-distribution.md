# Difusión de vacantes en LinkedIn vía Metricool — 2026-09-11

## Estado

Dos posts programados en Metricool para el 2026-09-11 a las 11:00 (Chile), verificados en estado `PENDING` en ambas marcas. **Al cerrar este registro no estaba verificada la publicación efectiva de las 11:00**; queda pendiente de confirmar. Este registro documenta distribución externa; no modifica el estado ni el contrato de los openings en Greenhouse.

El operador aprobó explícitamente copy, horario, cuentas e imagen antes de programar.

## Openings difundidos

Verificados en `https://greenhouse.efeoncepro.com/public/careers`, con HTTP 200 en cada detalle.

| Rol | Opening | Seniority | Reporta a | Detalle |
| --- | --- | --- | --- | --- |
| Account Manager / Especialista en Marketing | `EO-OPN-0009` | Semi-senior | CEO | `https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0009` |
| Content Creator — Editorial, SEO/AEO & Social | `EO-OPN-0061` | Semi-senior | Creative Operations Lead | `https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0061` |
| SEO Specialist Senior | `EO-OPN-0674` | Senior | Managing Director | `https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0674` |
| Director(a) de Arte Senior | `EO-OPN-0675` | Senior | Creative Operations Lead | `https://greenhouse.efeoncepro.com/public/careers/EO-OPN-0675` |

`EO-OPN-0674` y `EO-OPN-0675` se publicaron el 2026-09-09. Condiciones comunes según las fichas: LATAM, 100% remoto, jornada completa, postulable desde 20 países (LATAM excepto Cuba, más EE.UU. y España); en Chile contrato laboral local y fuera de Chile vía internacional con pago directo de Efeonce; proceso de 3 a 4 semanas; compensación que "se conversa con transparencia durante el proceso"; beneficios con el calificador "se formaliza según tu modalidad de contratación y país de residencia".

## Cuentas y horario

| Marca Metricool | `brandId` | Destino LinkedIn | Post Metricool | Estado observado |
| --- | --- | --- | --- | --- |
| Julio Reyes | `5105024` | Perfil personal (`urn:li:person:vj64TIaUfj`) | `374399635` | `PENDING` |
| Efeonce Group | `3961547` | Página de empresa (`urn:li:organization:20503593`) | `374399721` | `PENDING` |

Ambas marcas usan `America/Santiago`. `getBestTimeToPostByNetwork` (LinkedIn personal, semana del 11 al 18 de septiembre de 2026) marcó el pico a las 11:00 Chile: viernes 2914, jueves 2790, miércoles 2445, martes 2026; lunes y domingo bajos. Se eligió el viernes 11 a las 11:00 y se descartó como alternativa la semana de Fiestas Patrias (18 y 19 de septiembre).

En la marca Efeonce Group ya había una publicación de Instagram programada por autolista para el 2026-09-14, ajena a esta operación; no se tocó.

## Copy aprobado

Dos variantes con la misma verdad de rol; no se pega el texto completo.

- **Perfil personal** (2.919 caracteres): abre con "Buscamos 4 personas para nuestro equipo en Efeonce. Son vacantes 100% remotas, abiertas a 20 países, y publicamos el proceso completo antes de que postules."; roles numerados.
- **Página de empresa** (2.915 caracteres): abre con "Estamos contratando: 4 vacantes 100% remotas, abiertas a 20 países, con el proceso publicado para que sepas qué esperar antes de postular."; no repite el nombre Efeonce porque LinkedIn muestra la página como autora.

Estructura de ambas: identidad de Efeonce (agencia de marketing y tecnología con presencia en Chile, EE.UU., Colombia, México y Perú; creatividad, medios, web, CRM y data como un solo equipo con software propio) → por cada rol: título y seniority, el problema que resolverá, "Queremos ver:" y 👉 su URL de detalle → cómo trabajamos → lo que recibes (versión corta del charter de beneficios, sin el monto de equipamiento) → proceso (postular en menos de 2 minutos, ejercicios acotados y ficticios, 3 a 4 semanas y respuesta siempre, adaptaciones en cualquier etapa, compensación conversada) → llamado a referir → 4 hashtags.

Correcciones del operador que quedaron como reglas: primera persona plural, nunca tercera persona sobre Efeonce; identidad de Efeonce antes del "ver más" (~210 caracteres); un link de detalle por vacante en lugar de uno solo al listado; variar el texto por canal sin cambiar roles, requisitos, elegibilidad, beneficios, proceso ni links. Límite de 3.000 caracteres por post, medido con `wc -m` y en unidades UTF-16.

Los links se publicaron sin UTM (ver pendientes).

## Imagen

- URL: `https://storage.googleapis.com/efeonce-group-greenhouse-public-media-prod/campaigns/careers-2026-09/efeonce-we-are-hiring-1080x1350.png` (objeto `gs://efeonce-group-greenhouse-public-media-prod/campaigns/careers-2026-09/efeonce-we-are-hiring-1080x1350.png`, subido con `gcloud storage cp --content-type=image/png`). Verificada con HTTP 200, `image/png`, 1.546.775 bytes.
- Alt text: "Gráfica en azul Efeonce con el texto We are Hiring y el logo de Efeonce abajo."
- Dirección: degradado radial solo con azules aprobados (#011A32 en bordes → #023C70 al centro, brillo #0375DB detrás del titular; `efeonce-midnight` / Core Blue de `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`); motivo de órbita (elipse fina y punto) tomado del cohete en órbita del logo; titular "We are" en sans geométrica extra gruesa y "Hiring" más grande en black italic, espejo del contrato tipográfico del eslogan (Poppins); logo real pequeño abajo como sello.
- Generación: conector MCP de Higgsfield, `generate_image` con `gpt_image_2`, `aspect_ratio 3:4` (el modelo no ofrece 4:5), `resolution 2k`, `quality high`, `count 2`; se eligió la variante B. El CLI `higgsfield` tenía la sesión vencida y no hizo falta.
- Composición determinística (Node + sharp): recorte a 4:5 solo desde abajo y resize a 1080×1350; `public/branding/logo-negative.svg` renderizado a 300 px de ancho, centrado, a 104 px del borde inferior, con una línea blanca fina (56 px, 45% de opacidad) 34 px encima. El logo no se generó con IA.
- El titular está en inglés y el copy en español; el operador lo aceptó.
- Metricool re-alojó la imagen en `static.metricool.com/planner/...` y la adjuntó como imagen nativa del post; con `previewIncluded: false` los links del texto no generan tarjeta de preview.

## Pendientes

- **Confirmar la publicación efectiva** de los posts `374399635` y `374399721` después de las 11:00 del 2026-09-11, en Metricool y en LinkedIn.
- **Discrepancia en `EO-OPN-0009`:** su ficha pública describe la etapa 2 como un ejercicio acotado sobre priorización, coordinación de especialistas y comunicación de estado, sin decir que es un caso ficticio (las otras tres fichas sí lo dicen). El operador confirmó en chat el 2026-09-11 que también es ficticio, y el post lo afirma para las 4. Falta actualizar el contenido público de `EO-OPN-0009` por el comando canónico (`updateHiringOpening` / `PATCH /api/hiring/openings/{id}`), con autorización del operador. No se hizo.
- **Atribución (gap abierto):** Careers no captura UTM ni fuente por postulación (no hay referencias a `utm_` en `src/app/public/careers`, `src/components/greenhouse/careers` ni `src/lib/hiring/public-careers`, y no hay GTM en las rutas públicas de Careers). El aporte de LinkedIn al funnel de postulaciones no es medible hasta que exista una señal canónica en Hiring o en el intake de la postulación.

## Procedimiento reusable

Vive en la skill `social-media-studio`: `.claude/skills/social-media-studio/efeonce/linkedin-vacancy-distribution.md` (receta de copy, imagen y ejecución en Metricool) y `.claude/skills/social-media-studio/efeonce/STUDIO_TOOLING.md` (endpoints de Metricool). La receta de la imagen con sello de logo está en `.claude/skills/greenhouse-ai-image-generator/SKILL.md`. El paso a paso para People vive en `docs/manual-de-uso/hr/operar-careers-publicas.md` §"Difundir una vacante publicada".
