# Biblioteca de assets de Marketing Efeonce en OneDrive

## Destino autorizado

El operador indicó el 2026-09-12 que Marketing comparte la carpeta local sincronizada:
`/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos`.
Es la raíz de trabajo con assets de Marketing Efeonce, tanto insumos existentes como nuevas entregas;
no es sólo un destino de seasonalities. No asumir que contiene o autoriza assets de otros clientes.
Verificar existencia antes de escribir. macOS puede representar el acento de Alineación en Unicode descompuesto:
resolver el directorio existente, nunca crear un segundo árbol por diferencias de normalización. En otra máquina,
localizar la misma biblioteca/carpeta; no crear esta ruta absoluta si el OneDrive no está montado.

## Organización observada y convención

Conservar las carpetas del equipo: `01. Contenido Evergreen`, `02. Grilla`, `03. Plantillas Contenido`,
`04. Ads`, `05. Highlights`, `06. Blog Content`, `07. Ebook`, `08. Estrategia`, `09. Glitch`,
`10. Nexa (Influencer IA)`, `11. Spot`, `12. LP Opengraphs`, `2025`, `Recursos` y `Seasonalities`.
`Seasonalities` es una categoría entre varias, no el destino por defecto. Inspeccionar la estructura vigente
antes de clasificar; el inventario anterior describe lo observado, no congela nuevas categorías.
No reorganizar contenido existente ajeno al alcance solicitado.

- Seasonality: `Seasonalities/<Ocasión>/<AAAA>/<Concepto>/vNN/`.
- Evergreen: inspeccionar la clasificación existente dentro de `01. Contenido Evergreen` y reutilizarla;
  crear un tema/concepto semántico sólo cuando no exista un destino equivalente.
- Trendjacking: comprobar si ya existe un destino equivalente; si no, crear
  `Trendjacking/<AAAA>/<AAAA-MM-DD>-<Detonante>/<Concepto>/vNN/` bajo la raíz. Fecha del detonante verificada,
  no una fecha inventada. No clasificar una festividad como trendjacking sin evidencia.
- Ads, plantillas u otros tipos: reutilizar la carpeta temática existente correspondiente. No duplicar todos
  los assets dentro de Grilla; el calendario puede referenciar la entrega.

Usar nombres humanos en carpetas y nombres portables descriptivos en archivos:
`efeonce-<ocasion-o-tema>-<concepto>-<canal>-<uso>-<ratio>-<ancho>x<alto>-vNN.png`.
No usar `final-final`, `imagen1`, IDs generativos ni un nombre que afirme aprobación no obtenida.
Conservar revisiones anteriores. Si el destino existe: mismo hash = no duplicar; distinto hash = nueva versión,
no sobrescribir silenciosamente. Agrupar tres archivos en una misma versión cuando no ameritan subcarpetas.

## Trabajo con assets existentes

Ante una solicitud de buscar, adaptar, editar, reutilizar u organizar assets, comenzar en esta raíz y explorar
sólo las categorías pertinentes. Identificar archivo fuente, marca, versión y uso antes de editar. Reutilizar
recursos y plantillas adecuados; conservar originales y guardar derivados con nombre semántico y versión.
Puede crear carpetas, copiar, editar y organizar dentro del alcance solicitado. Mover o renombrar archivos
existentes cuando la tarea lo requiera, verificando el destino y evitando romper referencias compartidas;
la familiaridad con la biblioteca no autoriza limpieza masiva, borrado ni reorganización general.

Clasificar por finalidad: contenido permanente → Evergreen; publicidad → Ads; plantillas → Plantillas;
blog → Blog Content; ebooks → Ebook; recursos reutilizables → Recursos; festividades → Seasonalities.
Para otras categorías, leer los nombres y el contenido pertinente antes de elegir. No crear carpetas vacías
preventivamente ni enviar todo a Seasonalities. Si el usuario especifica un destino, prevalece su instrucción.
El estándar PNG aplica a la entrega de imágenes estáticas; conservar formatos nativos de editables, video,
audio y documentos, sin convertir toda la biblioteca a PNG.

## Calidad y entrega

1. Entregar **PNG como formato predeterminado obligatorio de imágenes estáticas**, por instrucción del operador.
   Exportar desde el master/composición sin pérdida; no convertir un JPG a PNG para aparentar mayor calidad.
   PNG no repara defectos de generación ni aumenta resolución. JPG/WebP sólo como derivados solicitados.
2. Verificar PNG real, dimensiones exactas del formato, sRGB y transparencia deliberada. Para estas fotos,
   entregar imagen aplanada. Revisar texto, logo, contraste, márgenes y lectura reducida con el protocolo editorial.
3. Copiar los PNG revisados, no plates, previews ni variantes rechazadas. Los editables/procedencia permanecen
   en el workspace salvo solicitud de compartirlos; no copiar credenciales, prompts privados ni logs del proveedor.
4. Añadir un LEEME breve: concepto, versión, formatos y estado de revisión/publicación. Un manifiesto con
   nombres, dimensiones, tamaño y SHA-256 permite comprobar integridad sin depender del nombre de archivo.
5. Reabrir los archivos de destino y comparar hash/dimensiones contra el origen. La entrega se verifica en
   destino, no sólo por éxito del comando de copia.
6. Reportar por separado: guardado local, sincronización remota, acceso del equipo y aprobación/publicación.
   El operador declara el uso compartido; no afirmar haber verificado permisos o recepción remota sin evidencia.
   No cambiar permisos, generar enlaces públicos ni publicar por guardar en OneDrive.
7. Mostrar un enlace absoluto a la carpeta entregada. `.captures` sirve para trabajo y evidencia local;
   no sustituye esta entrega al equipo cuando se solicita producir/dejar piezas de Efeonce.

## Caso inicial

`Seasonalities/Día de Muertos/2026/Hay ausencias que se sientan/v08/`: Feed 1080×1350, Historia 1080×1920,
portada de video YouTube 1920×1080. PNG v8; revisión del operador pendiente. No incluir el copy de publicaciones
como aprobado: la conversación todavía no cerró su selección. La portada no es banner de canal.

## Videos dentro de una campaña

Conservar `Seasonalities/<Ocasión>/<AAAA>/<Concepto>/Video/<Versión>/` cuando la finalidad sea estacional.
Entregar MP4 con marca y conservar el original identificado; PNG para portada y contact sheet.
Adjuntar estado de revisión, metadata técnica y hashes sin URLs firmadas ni secretos. Ejemplo:
`Seasonalities/Día de Muertos/2026/Hay abrazos que encendemos/Video/Seedance 2.5 v01/`.
La aprobación del estático no aprueba automáticamente el video. Ver
[workflow audiovisual](../../motion-design-studio/workflows/seasonality-visual-metaphor-to-video.md).
