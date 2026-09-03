# Berel — clasificación de tareas y conteo de piezas

Fecha: 2026-09-03. Alcance autorizado: revisar campos de formato/canal y clasificar las piezas
trabajadas en esta sesión. No hay autorización para modificar fórmulas, unidad comercial ni todo el histórico.

## Resultado verificado

- 147 tareas de noviembre/diciembre abiertas directamente desde las relaciones de sus proyectos.
- 49 registros corregidos en esos meses: 40 valores Formato (8 principales y 32 banners) y
  Canal de pieza retirado de 9 principales nuevas para excluirlas del desglose visual.
- 2 tareas puntuales de fotos corregidas: N36 (barniz) y N39 (lavandería), Estatico / Blog.
- 51/51 relecturas posteriores confirman las propiedades solicitadas, sin ninguna diferencia
  en el resto de las propiedades retornadas ni en el cuerpo serializado de cada página.
- No se editaron textos editoriales, fechas, responsables, relaciones, estados, fórmulas,
  automatizaciones, propiedades Frame.io ni métricas [GH]. Sin publicación ni producción de assets.
- Clasificación preservada en 64 derivados sociales y en las piezas ya correctas.

Canon técnico, explicación funcional y procedimiento operativo:
[módulo 07](../../../.codex/skills/berel-content-production/modules/07_SISTEMA_NOTION.md).
El ciclo mensual y el router de la skill remiten a ese contrato.

## Inventario después del ajuste, calculado desde propiedades leídas

| Proyecto | Tareas totales | Principales editoriales excluidas | Estatico | Video | Blog | Social Media | Total visual |
|---|---:|---:|---:|---:|---:|---:|---:|
| [Noviembre](https://www.notion.so/3c839c2fefe78166b1ccef16538c46c6) | 74 | 9 | 57 | 8 | 33 | 32 | 65 |
| [Diciembre](https://www.notion.so/3c839c2fefe78160992fd31d5b96feb0) | 73 | 8 | 57 | 8 | 33 | 32 | 65 |

Cada mes tiene 32 banners, 32 paquetes sociales y 1 tarea de secuencia fotográfica.
Las cuatro fotos de esa secuencia se cuentan como una tarea; las Stories pueden contener varias
pantallas. No son 65 archivos ni 65 piezas entregadas. Las tareas bloqueadas siguen en el inventario.
El umbral histórico de 50 piezas requiere revisión de capacidad: no autoriza reducir registros,
desbloquear tareas, ampliar producción ni tratar ese umbral como contrato comercial vigente sin confirmación.
N59 Navidad solo tiene tarea editorial; sus visuales no se han creado y no se incluyen.

Las descripciones del esquema declaran las fórmulas auxiliares 1/0 y Proyectos expone sus
relaciones/rollups. El MCP no soportó abrir formulaCode y retorna referencias rollupResult,
no cifras evaluadas: **el código de las fórmulas y los totales mostrados en los rollups no quedaron
verificados**. La tabla es una conciliación independiente de las propiedades, no evidencia visual de Notion.

## Hallazgos y pendientes

1. La consulta SQL devolvió algunas URLs que no correspondían al título/ID de tarea al abrirlas.
   Caso: para Social N51 Facebook (ID 666), devolvió
   `3d039c2fefe781fcb0afd33a53c589a4`, que al abrir es Banner N1 de N52 (ID 638).
   El destino correcto, obtenido de la relación verificada, es
   `3d039c2fefe7814bb2e1f12272310d3a`. Se resolvieron todos los destinos del lote desde
   las relaciones de Proyectos y se compararon título/propiedades antes de cada escritura.
   Causa de la discrepancia del conector no diagnosticada; no se corrigió el conector.
2. [Fotos N31 sala-comedor](https://www.notion.so/ef91da3f827649b4b0c1bb47945c41fd):
   tarea Tutorial vs Content Hub Artículo. Sin cambio; requiere decisión editorial antes de clasificar.
3. Histórico anterior fuera del lote: existen huecos; no se regularizó sin confirmación de alcance.
4. Conteo por archivo individual: requiere acordar cantidad/unidad para secuencias, carruseles,
   variantes y videos multicanal, y después autorizar el cambio de esquema/agregación.
5. Playbook vivo leído, no editado en este turno; el suplemento operativo vive en la skill espejada.

## Registro de cambios (valores anteriores y posteriores)

Solo las propiedades listadas fueron enviadas. La lectura posterior verificó igualdad con el valor
esperado y preservación de las propiedades restantes/cuerpo. Vacío corresponde a null o ausencia.

| Tarea | Antes | Después |
|---|---|---|
| [Artículo N43 - Cómo aplicar mancha al aceite y realzar la veta de la madera](https://app.notion.com/p/3c839c2fefe7811fa638e75a34cc2f41) | Formato: vacío | Formato: Articulo |
| [Artículo N44 - Cómo llevar color y alegría a tu hogar sin saturar los espacios](https://app.notion.com/p/3c839c2fefe78173af9bdf57041994e7) | Formato: vacío | Formato: Articulo |
| [Artículo N45 - Minimalismo o maximalismo: dos formas de vivir el color en casa](https://app.notion.com/p/3c839c2fefe7819981bfca4f0262f01d) | Formato: vacío | Formato: Articulo |
| [Artículo N46 - Cómo elegir colores para una recámara que se sienta tuya](https://app.notion.com/p/3c839c2fefe781a39179cb780234ca1c) | Formato: vacío | Formato: Articulo |
| [Artículo N47 - Tres colores para celebrar San Valentín a tu manera](https://app.notion.com/p/3c839c2fefe781f9ba93c5e469c96e65) | Formato: vacío | Formato: Articulo |
| [Banner N1 - Portada: aplicación siguiendo la veta](https://app.notion.com/p/3c839c2fefe78180ad37f0c1570cf465) | Formato: vacío | Formato: Articulo |
| [Banner N2 - Preparación antes de la mancha 🔁](https://app.notion.com/p/3c839c2fefe7819a8c19f603cfa7df77) | Formato: vacío | Formato: Articulo |
| [Banner N3 - Seis pasos para aplicar la mancha](https://app.notion.com/p/3c839c2fefe7810887cbf4a82ea908f7) | Formato: vacío | Formato: Articulo |
| [Banner N4 - Cierre: veta visible](https://app.notion.com/p/3c839c2fefe7815c8b3cecdd89058f8f) | Formato: vacío | Formato: Articulo |
| [Banner N1 - Portada: tres colores equilibrados](https://app.notion.com/p/3c839c2fefe7812e9e42db0acae8edf1) | Formato: vacío | Formato: Articulo |
| [Banner N2 - Amarillo, azul y verde según el espacio 🔁](https://app.notion.com/p/3c839c2fefe7816bbba5e09e77b2ae20) | Formato: vacío | Formato: Articulo |
| [Banner N3 - Base, acento o detalle](https://app.notion.com/p/3c839c2fefe781f9b7e1d915e9f5aed8) | Formato: vacío | Formato: Articulo |
| [Banner N4 - Cierre: hogar colorido y equilibrado](https://app.notion.com/p/3c839c2fefe781e38358e0d07beddc17) | Formato: vacío | Formato: Articulo |
| [Banner N1 - Portada: dos estilos en una sala](https://app.notion.com/p/3c839c2fefe7811d81fefef00cb629fd) | Formato: vacío | Formato: Articulo |
| [Banner N2 - Claves de minimalismo y maximalismo 🔁](https://app.notion.com/p/3c839c2fefe7811e9529d4342fd28324) | Formato: vacío | Formato: Articulo |
| [Banner N3 - Elige el estilo según tus hábitos](https://app.notion.com/p/3c839c2fefe7813fb0eeea16ae39d3e8) | Formato: vacío | Formato: Articulo |
| [Banner N4 - Cierre: estilo personal](https://app.notion.com/p/3c839c2fefe781f5a992ca4df2bc9a93) | Formato: vacío | Formato: Articulo |
| [Banner N1 - Portada: recámara y luz natural](https://app.notion.com/p/3c839c2fefe78121be83d06810a12ff0) | Formato: vacío | Formato: Articulo |
| [Banner N2 - Color de recámara según la luz 🔁](https://app.notion.com/p/3c839c2fefe7815cbc78cbc7444a39aa) | Formato: vacío | Formato: Articulo |
| [Banner N3 - Paleta neutra o muro de acento](https://app.notion.com/p/3c839c2fefe781d797e2d1df8edd0931) | Formato: vacío | Formato: Articulo |
| [Banner N4 - Cierre: paleta personal](https://app.notion.com/p/3c839c2fefe78160ae54f63c754cd20f) | Formato: vacío | Formato: Articulo |
| [Banner N1 - Portada: San Valentín más allá del rojo](https://app.notion.com/p/3c839c2fefe7813db213dd6f03362e05) | Formato: vacío | Formato: Articulo |
| [Banner N2 - Tres rutas de color para San Valentín 🔁](https://app.notion.com/p/3c839c2fefe781d9b3edec5c04523795) | Formato: vacío | Formato: Articulo |
| [Banner N3 - Elige el tamaño del proyecto](https://app.notion.com/p/3c839c2fefe7817fba76f6136258ddfc) | Formato: vacío | Formato: Articulo |
| [Banner N4 - Cierre: un color que permanece](https://app.notion.com/p/3c839c2fefe78171b3b8ecc47bca65e9) | Formato: vacío | Formato: Articulo |
| [Artículo N51 - Cuánto rinde una cubeta — tabla de rendimiento por línea Berel](https://app.notion.com/p/3d039c2fefe781539f65fc589de7adaf) | Canal de pieza: Blog | Canal de pieza: vacío |
| [Artículo N52 - ¿Se puede pintar sobre esmalte? Qué revisar antes de repintar](https://app.notion.com/p/3d039c2fefe781d396d0eb7a6d42b5b4) | Canal de pieza: Blog | Canal de pieza: vacío |
| [Artículo N53 - Por qué se desprende la pintura y cómo preparar el repintado](https://app.notion.com/p/3d039c2fefe781199aa6d76331f07388) | Canal de pieza: Blog | Canal de pieza: vacío |
| [Artículo N59 - Colores para Navidad que también se quedan en enero](https://app.notion.com/p/3d039c2fefe781bdb0e5f1e551ae7a68) | Canal de pieza: Blog | Canal de pieza: vacío |
| [Artículo N48 - 79 años de Rayados: el origen de una identidad azul y blanca](https://app.notion.com/p/3c839c2fefe781ad8bf0d4aad28e782b) | Formato: vacío | Formato: Articulo |
| [Artículo N49 - ¿Qué significan los colores del 8M?](https://app.notion.com/p/3c839c2fefe781adbe63ec0cb760ad47) | Formato: vacío | Formato: Articulo |
| [Artículo N50 - Cómo elegir colores para consentir a mamá sin adivinar sus gustos](https://app.notion.com/p/3c839c2fefe7810e9438dea5ad611ada) | Formato: vacío | Formato: Articulo |
| [Banner N1 - Portada de archivo 1945–2024](https://app.notion.com/p/3c839c2fefe781be8862c27ab864691e) | Formato: vacío | Formato: Articulo |
| [Banner N2 - Línea de tiempo 1945–1952–2024 🔁](https://app.notion.com/p/3c839c2fefe781198e6bdb1abd48495d) | Formato: vacío | Formato: Articulo |
| [Banner N3 - Evolución del uniforme](https://app.notion.com/p/3c839c2fefe781d09ea5dbbb8eb7fb0f) | Formato: vacío | Formato: Articulo |
| [Banner N4 - Cierre de archivo: afición azul y blanca](https://app.notion.com/p/3c839c2fefe781ea884fea6228ef048a) | Formato: vacío | Formato: Articulo |
| [Banner N1 - Portada institucional: color y contexto](https://app.notion.com/p/3c839c2fefe781c5a487df5393307d2f) | Formato: vacío | Formato: Articulo |
| [Banner N2 - Morado y verde: asociaciones con contexto 🔁](https://app.notion.com/p/3c839c2fefe78154b2cde7974ab15e4c) | Formato: vacío | Formato: Articulo |
| [Banner N3 - Cinco colores, significados no universales](https://app.notion.com/p/3c839c2fefe7819182d8db5335a71ab7) | Formato: vacío | Formato: Articulo |
| [Banner N4 - Cierre institucional: memoria y derechos](https://app.notion.com/p/3c839c2fefe7812580a7fbbd0f50fa82) | Formato: vacío | Formato: Articulo |
| [Banner N1 - Portada: elegir juntas](https://app.notion.com/p/3c839c2fefe7816db62ee752d51d01d5) | Formato: vacío | Formato: Articulo |
| [Banner N2 - Proyectos por alcance 🔁](https://app.notion.com/p/3c839c2fefe781729046d9df0377b941) | Formato: vacío | Formato: Articulo |
| [Banner N3 - Tres paletas según sus gustos](https://app.notion.com/p/3c839c2fefe781ab9231ee8d1e15a6bb) | Formato: vacío | Formato: Articulo |
| [Banner N4 - Cierre: proyecto compartido](https://app.notion.com/p/3c839c2fefe781b1b7bedf4583e2efc0) | Formato: vacío | Formato: Articulo |
| [Artículo N54 - Cómo resanar una pared y prepararla para pintar](https://app.notion.com/p/3d039c2fefe781bfba0bdfe87f493a5c) | Canal de pieza: Blog | Canal de pieza: vacío |
| [Artículo N55 - Tipos de rodillos para pintar: cuál usar en cada superficie](https://app.notion.com/p/3d039c2fefe781b2b91cf9d6f57ae2c9) | Canal de pieza: Blog | Canal de pieza: vacío |
| [Artículo N56 - Cómo pintar un techo interior: preparación y aplicación](https://app.notion.com/p/3d039c2fefe7812aa606d65b0980f79b) | Canal de pieza: Blog | Canal de pieza: vacío |
| [Artículo N57 - Cómo quitar papel tapiz y preparar la pared para pintar](https://app.notion.com/p/3d039c2fefe781dba4e9edc6f2b888d8) | Canal de pieza: Blog | Canal de pieza: vacío |
| [Artículo N58 - Cómo guardar pintura sobrante y revisar si puedes reutilizarla](https://app.notion.com/p/3d039c2fefe781129694d3ccfc652d50) | Canal de pieza: Blog | Canal de pieza: vacío |
| [Tutorial N36 - Secuencia Paso a Paso (4 fotos) — Cómo aplicar barniz para madera y elegir el acabado](1c67d09f28ce43578e8786c708d311d3) | Tipo de pieza: vacío; Canal de pieza: vacío | Tipo de pieza: Estatico; Canal de pieza: Blog |
| [Tutorial N39 - Secuencia Paso a Paso (4 fotos) — Cómo pintar una lavandería y mantenerla funcional](07dbfe3579664e1db31ba49cd2a52768) | Tipo de pieza: vacío; Canal de pieza: vacío | Tipo de pieza: Estatico; Canal de pieza: Blog |

## Gobierno documental y verificación

Verificaciones locales: comparación directa de los 24 archivos de Berel en ambos espejos, sin diferencias;
`git diff --check` sin errores; cierre documental focal sobre Berel, auditoría y roots, cero warnings.
El gate global `pnpm skills:mirrors` detectó drift en DataForSEO (cambios ETV de otro trabajo concurrente),
no en Berel. No se sobrescribió esa skill para forzar un verde. Esta corrección no creó commit ni push.

No hay nueva decisión de plataforma: se documentan opciones existentes y el criterio de etiquetado
del operador; no se cambia source of truth, esquema, auth, autonomía ni motor de métricas.
El ADR de contexto router-first gobierna la ubicación en la skill, sin copiar el detalle a los roots.
La separación tarea/archivo queda pendiente, no implementada como fórmula nueva.
Para revertir etiquetas, comparar el estado actual contra Después y restaurar solo la propiedad
autorizada desde Antes; nunca revertir cuerpos ni otros cambios posteriores del equipo.
