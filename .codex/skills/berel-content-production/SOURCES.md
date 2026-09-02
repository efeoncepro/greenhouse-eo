# Fuentes — de dónde salió cada regla

> **Última sincronización:** **2026-09-02** contra la Wiki viva de Berel en Notion.
> Notion sigue siendo la fuente de verdad viva; el repo es una copia operativa. Cuando una petición
> fechada del cliente o una spec específica contradice una regla más vieja, manda la fuente más
> reciente/específica y se registra el drift.

## Fuentes principales

| Fuente | ID / ubicación | Qué gobierna |
|---|---|---|
| 📘 **Playbook Producción** | `3b239c2fefe780ceb71dff4f5bed4646` | ciclo mensual, modalidades, `Formato`, estructura de artículo y Tutorial híbrido |
| 5️⃣ **Recomendaciones Cliente** | `38239c2fefe780e0aeeae0ada3170d81` | peticiones fechadas, voz en primera persona, series, CTA, anchors, CMS |
| 🗣️ **6. Voz y Tono** | `33139c2fefe781ff9ae6f0b2cb8f0933` | estándar editorial general es-MX |
| 📋 **Spec para imágenes** | `38f39c2fefe780aba8e3de74983a23d6` | campos, tamaños, ALT, peso y permanencia de banners |
| 📣 **Playbook Derivados Sociales** | `f58f34efd1e04043b9982b932a034464` | atomización social por canal |
| ➡️ **Modulación por canal** | `38139c2fefe7805683c8eea4586b1587` | registro por red |
| 📤 **Cómo subir un artículo (Drupal)** | `4ed619156c0e4f6a89fb83b78ea6c0ad` | carga CMS y handoff |
| 📝 **Ficha Tutoriales** | `3cf39c2fefe780f29a2ec7fae06cff67` | tarea/ficha de fotos Paso a Paso del formato Tutorial |
| 📝 **Fichas para Gráficos** | `3c739c2fefe7803d9958cd74648cb036` | ficha de producción de infografías |
| 🖼️ **Formatos de infografía** | `collection://06d39c2f-efe7-82be-99f6-87b9e8e34745` | 5 formatos aprobados + paleta de acento |
| 📆 **Content Hub** | `35f39c2fefe7808186efc6ec63475640` | planificación y propiedad `Formato` |
| **Tareas** | `35c39c2fefe780c9bc37e811a7b95a7c` | ejecución, relaciones, estados e íconos |

## Cambios promovidos en la sincronización 2026-09-02

1. **`Formato` es obligatorio antes de escribir.**
   - `Artículo` → Modalidad A/B normal.
   - `Tutorial` → Modalidad A/B + versión híbrida para CMS.
2. **Tutorial híbrido formalizado.**
   - vive en la misma página del Content Hub;
   - una intención = una URL;
   - conserva aproximadamente 90% de la cobertura útil del V1;
   - estructura canónica de 4 pasos;
   - productos/materiales/colores se preparan para el bloque CMS `Tutorial Contenido`.
3. **Fotos del Paso a Paso separadas de banners.**
   - una sola tarea de diseño por secuencia;
   - 1:1 de 500 px para diseño;
   - sin texto/logo;
   - coherencia visual entre pasos.
4. **Banners del V1 viajan completos al híbrido.** No basta un puntero.
5. **Links del handoff CMS en ruta relativa** cuando corresponde; anchor siempre descriptivo.
6. **La modalidad sigue determinándose por contenido vivo**, no por `Enlace` ni HTTP 200.
7. **Instagram = Story**, decisión posterior del cliente; la mención antigua a post estático queda
   explícitamente superada.
8. **Nunca `/search?q=`**: aunque una línea vieja del Playbook todavía lo mencione, `robots.txt` lo
   bloquea y la regla vigente es paleta/artículo válido → `/colores/<familia>`.

## Precedencia cuando hay contradicción

1. petición fechada del cliente;
2. spec específica del artefacto;
3. Playbook Producción vivo;
4. guía general;
5. copia del repo.

Ejemplos conocidos:

- `Instagram Post estático` en una versión vieja del Playbook → **no gobierna**; se usa Story.
- `/search?q=<color>` en una línea vieja de Fase 5 → **no gobierna**; se usa `/colores/<familia>` o
  una pieza editorial válida.
- `Enlace` presente → no prueba Modalidad A si la URL sigue siendo soft-404.

## Verificaciones externas promovidas al repo

Verificadas en vivo el 2026-08-25:

- `robots.txt` bloquea `/search` y `?q=`;
- `berel.com` puede devolver shell 200 para rutas inexistentes;
- sitemaps autoritativos:
  - `/sitemap-productos.xml`
  - `/sitemap-articulos.xml`
  - `/sitemap-colores.xml`
- una URL real debe confirmar `title`, H1 y cuerpo editorial frente a una ruta de control.

## Material sensible

**Accesos CMS** contiene credenciales en texto plano. Nunca se copia a skill, repo, log, commit ni
prompt. Solo se usa desde el workspace autorizado cuando toca publicar.

## Regla de mantenimiento

Cada vez que cambie el Playbook Producción, revisar como mínimo:

- `SKILL.md`
- `01_CICLO_MENSUAL.md`
- `03_REDACCION_ARTICULO.md`
- `05_BANNERS_IMAGENES.md`
- `06_DERIVADOS_SOCIALES.md`
- `07_SISTEMA_NOTION.md`
- `08_PUBLICACION_CMS_DRUPAL.md`
- `09_RECOMENDACIONES_DEL_CLIENTE.md`
- `13_FORMATO_TUTORIAL_HIBRIDO.md`
- `GLOSSARY.md`
- este `SOURCES.md`

Los espejos `.claude` y `.codex` deben quedar **byte-identical**.
