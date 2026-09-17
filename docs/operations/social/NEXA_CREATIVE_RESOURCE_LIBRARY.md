# Nexa — biblioteca creativa reutilizable

Inventario local verificado el 2026-09-13; es un recurso de Marketing Efeonce, no el contrato del
asistente conversacional de Greenhouse. No confundir ambos dominios.

## Ubicación

`/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/10. Nexa (Influencer IA)`

En otra máquina localizar esa biblioteca OneDrive, no crear esta ruta personal.
Alineación está descompuesto en Unicode; poses usan espacios no separables U+00A0 y los nombres
de vestuario contienen dos espacios. Resolver con listado real, no normalizar/renombrar originales.

| Carpeta relativa | Uso |
| --- | --- |
| 01. Material/01. Avatar | Candidatos de referencia de identidad; elegir tras inspección visual. |
| 01. Material/02. Entornos y Fondos | Entornos y composición, no fuente de identidad facial. |
| Poses y expresiones | Deep Work, Got It, Mic Drop, The Breakdown, The Listen, The Point, The Read, The Spark. |
| Vestuario | Behind-the-scenes  Home office; Contenido casual  Redes; Lifestyle  Exterior urbano; Profesional  Presentaciones; Tech  Conferencias como speaker. |
| Voz final/voice_preview_influencer nexa.mp3 | Muestra de voz existente; no prueba por sí sola un voice ID o autorización de clonación. |
| 02. Contenidos Nexa | Derivados existentes, incluidos NEXA_AVATAR_EFEONCE_POST.mp4, NEXA_AVATAR_EFEONCE_YT.mp4 y NEXA_AVATAR_EFEONCE_STORY.mp4. |

## Selección segura y continuidad

Para acompañar a Nexa con Marketing con Manzanitas, usar su
[biblioteca gráfica original](MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md), no logos recreados.

1. Inspeccionar archivos originales antes de elegir. Registrar ruta y función de cada referencia:
   rostro/identidad, pose, vestuario, voz, fondo. El nombre de la carpeta no certifica aprobación.
2. Para diálogo, explorar The Listen y The Read según actuación; para gestos, explorar The Point
   y The Breakdown. Son candidatos por nombre, no una evaluación visual automática de cada imagen.
3. Mantener rostro, piel, cabello y vestuario consistentes; no usar un derivado dañado como nueva
   identidad. Los props de una campaña (por ejemplo iPad del podcast) no son atributos universales.
4. Nexa también fue indicada por el operador como personaje disponible en Higgsfield. Verificar
   personaje/ID y referencias en la sesión actual antes de usar: esta ficha no certifica disponibilidad
   permanente ni aporta un ID. Comparar calidad con OneDrive; no sustituir originales por conveniencia.
5. Conservar originales; derivados en la carpeta de la campaña. No mover, borrar o subir toda la
   biblioteca. Registrar fuentes seleccionadas y aprobación; validar derechos/proveedor para cada uso.

Para aplicación y errores observados, ver
[Día del Pódcast](2026-09-13-podcast-fotohistoria-production-method.md).

## Versión humana con hoodie Efeonce

En el [KV «Tu IA no conoce tu negocio»](2026-09-17-kv-tu-ia-no-conoce-production-method.md) (2026-09-17) Nexa aparece
en versión humana con el hoodie azul de Efeonce. Referencias usadas: `Avatar 3,4 v2` y `Avatar Cuerpo Completo v2`
(identidad) más el asset del sitio público `contacto-careers-hoodie.png` (vestuario), con copias locales en la carpeta
de producción. Aprendizaje: la identidad se mantuvo bien con esas dos referencias de avatar más el hoodie, incluso en
un plate nativo guiado por boceto; el isotipo del hoodie salió prácticamente igual al oficial, sin re-estampado. El
rostro se validó a ojo contra las referencias. El hoodie es vestuario de esa campaña, no un atributo universal.

Desde el 2026-09-17 existe un [kit de referencia de prenda](2026-09-17-hoodie-efeonce-garment-reference-kit.md) del
hoodie (21 vistas en `13- Branding/Hoodie Efeonce/v01/`): es la referencia de vestuario a usar, eligiendo la vista por
el **ángulo de la toma**, en lugar de un asset suelto del sitio público.

## Biblioteca de poses 3D (pendiente)

El método usado el 2026-09-17 para las [bibliotecas de poses 3D de mascotas de partners](PARTNER_MASCOT_POSE_LIBRARIES.md)
(Clawd y Codex) se aplicará a Nexa: fuente oficial → base validada → ángulos de cámara → accesorios → recorte con
relleno de huecos → QA → OneDrive. Destino: una carpeta propia dentro de `10. Nexa (Influencer IA)`, nunca en
`14. Mascotas de partners` (Nexa es marca propia, no mascota de partner). Nexa tiene dos familias y cada una lleva
su propia serie, sin mezclarlas:

- **Personaje 3D estilo Pixar:** `public/images/illustrations/characters/greenhouse-*.png` (pipeline edit + `rmbg`).
- **Versión humana fotorrealista:** esta biblioteca OneDrive (`Avatar 3,4 v2`, `Avatar Cuerpo Completo v2`, poses y
  vestuario).

Sin guía de partner que validar, pero rostro, cabello y rasgos de identidad se mantienen; el hoodie Efeonce es
vestuario de campaña, no atributo universal. Método:
[`mascot-3d-pose-library.md`](../../../.claude/skills/greenhouse-ai-image-generator/references/mascot-3d-pose-library.md).

Lecciones de la [nave de Efeonce en 3D](2026-09-17-efeonce-ship-3d-production-method.md) (2026-09-17) que aplican a Nexa:

- **Ángulos extremos:** un contrapicado, picado o gran angular se indica con una guía geométrica de perspectiva como
  imagen de referencia; con la cámara sólo en texto el modelo devolvió casi frontal.
- **Variantes de vestuario o color:** editar el render ya aprobado cambiando sólo ese atributo, en vez de regenerar;
  así se conservan identidad, pose y cámara.
- **QA del recorte:** componer la variante transparente sobre un fondo de contraste fuerte y revisar al 100 % los
  huecos y bordes finos (cabello, dedos, accesorios).
