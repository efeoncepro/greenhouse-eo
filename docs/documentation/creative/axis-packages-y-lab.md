# AXIS: packages, Lab y composición por agentes

> Documentación funcional · 2026-10-04. [Manual de uso](../../manual-de-uso/creative/descubrir-y-componer-con-axis.md) · [Estado y evidencia](../../audits/2026-10-04-axis-documentation-closure.md).

AXIS reúne las reglas visuales y los recursos oficiales de Efeonce. El **Lab público** permite descubrirlos,
compararlos y revisar ejemplos. Los **packages privados** entregan tokens, contratos, renderizadores y archivos
versionados a los productos. El **checkout de AXIS** ofrece comandos de composición y validación. Cada producto
conserva su adapter y debe verificar cómo aplica el contrato en su propia interfaz.

## Dónde empezar

| Necesidad | Entrada | Qué entrega |
| --- | --- | --- |
| Componer con un agente | [Para agentes](https://axis.efeonce.org/agents/) | Capacidades, requisitos, ejemplos, schemas, comandos y límites |
| Encontrar un recurso | Búsqueda global del Lab | Resultados con tipo, estado, vista previa y enlace al recurso |
| Elegir un ícono | [Iconografía](https://axis.efeonce.org/references/iconography/) | Catálogo unificado, filtros de colección, voz y aprobación, SVG y renderer |
| Encontrar un logo | [Logotipos](https://axis.efeonce.org/references/logos/) | Familias propias y marcas externas, variantes, procedencia y archivo oficial |
| Integrar en un producto | Packages y contrato de la capacidad | API portable y requisitos del adapter; la integración se valida en el producto |

El catálogo de agentes declara **52 capacidades** en el corte del 4 de octubre. Distingue composición ejecutable,
resolución de intención y adopción de componentes. Un manifest resuelto puede necesitar un renderer adicional;
un contrato de componente requiere un adapter consumidor. El catálogo y los ejemplos públicos permiten decidir
esto antes de instalar nada. El Lab no ejecuta los comandos del checkout ni concede acceso a packages privados.

## Íconos y logos

La galería principal reúne **134 íconos únicos: 109 canónicos y 25 candidatos**. Las colecciones AEO (19), SEO (37)
y Autoridad (13) se superponen: Brand Authority aparece en las tres con una sola identidad. Los filtros muestran
el estado real; estar en la galería o en un package no promueve un candidato a canónico. Los 109 canónicos se
reparten en 60 Trazo y 49 Plastilina. Los nuevos conceptos SEO y de autoridad conservan su estado de referencia.

El catálogo de logos reúne **223 archivos de 52 familias**: 99 propios y 124 de terceros. Incluye Wave, Globe,
Marketing Studio, Insights, Greenhouse, AXIS, Efeonce AEO y sus familias. Un logo de herramienta identifica la
herramienta; no acredita por sí solo una relación de partner. Los assets restringidos permanecen fuera de las
proyecciones públicas. Las variantes se reutilizan desde su archivo oficial, sin reconstruir el lockup.

Estos números describen el corte auditado. Las fuentes vivas son los manifests
[de iconografía](https://axis.efeonce.org/references/iconography.json),
[de logos](https://axis.efeonce.org/references/logos.json) y
[de capacidades](https://axis.efeonce.org/agents/capabilities.json).

## Búsqueda y experiencia del Lab

La búsqueda utiliza un índice estático generado desde los catálogos y páginas del repositorio. No necesita una
base de datos: normaliza acentos, resuelve aliases y términos aproximados, filtra por tipo y limita los resultados
renderizados. La búsqueda y las galerías comparten las mismas identidades. Un enlace a un ícono revela la tarjeta
aunque un filtro previo la ocultara. El índice se regenera con el build y se publica con el Lab.

Los títulos editoriales del Lab usan Bricolage desde un componente y un token compartidos. Los ejemplos de
productos conservan su tipografía contractual; por ejemplo, esta corrección no cambia la UI de Greenhouse.
Hay controles de código y de fuente realmente renderizada en escritorio y móvil para detectar regresiones.

## Primitives para interfaces de producto

La misma base que muestra el Lab se distribuye en `axis-ui-primitives`. Los botones conservan la línea de
negocio y el significado funcional por separado. Los badges comunican estados/cantidades; los chips representan
entidades, filtros, elección exclusiva, acciones auxiliares o elementos removibles. Cada uso conserva su
semántica: una etiqueta informativa no se vuelve una acción sólo por parecer un botón.

Los formularios reúnen diez familias: Field, Input, Textarea, Checkbox, RadioGroup, Switch, CheckboxGroup,
Select, Combobox y NumberField. Comparten etiquetas persistentes, ayuda y errores asociados, estados
pendiente/advertencia/éxito, densidad y superficies claras/oscuras. Los campos tienen foco con un único contorno
e iconos de apoyo; las etiquetas siguen siendo obligatorias. Select ofrece opciones con descripción y marca
de selección; el configurador del Lab utiliza ese mismo componente. NativeSelect conserva la opción nativa.

Los ejemplos muestran crear/editar preferencias, detectar errores, enfocar un resumen, guardar localmente como
demo, fallar/reintentar conservando borradores y restablecer. No hay persistencia de proyectos en el Lab.
La aplicación consumidora aporta sus datos, permisos, validación de servidor y política de borradores.

La órbita gobierna el sistema de color: roles por línea/superficie y ramps derivadas están en tokens, no sólo
en la hoja visual. Las ramps anteriores siguen disponibles para compatibilidad; Greenhouse tiene como destino
migrar mediante un tema semántico. Este trabajo no cambia sus colores ni sus dependencias automáticamente.

Consulta el [manual](../../manual-de-uso/creative/descubrir-y-componer-con-axis.md#colores-badges-chips-y-formularios)
y el [estado de distribución y QA](../../audits/2026-10-04-axis-forms-release.md).

## Qué significa «disponible»

- **Lab desplegado:** la referencia se puede consultar públicamente.
- **Código en main:** la implementación está en el repositorio, sin implicar publicación npm.
- **Package publicado:** una versión concreta se puede instalar con autorización.
- **Consumidor actualizado:** el producto fijó esa versión, implementó lo necesario y lo verificó.
- **Pieza verificada/aprobada:** tiene evidencia y revisión de su salida; componerla no la publica.

`axis-graphic-line@0.17.0` está publicado. La nueva API `axis-brand-assets/logos` está en código y en el Lab,
pero todavía requiere un nuevo release del package: no basta con instalar la versión histórica `0.4.18`.
Los cambios no actualizan automáticamente los pins de Greenhouse, Globe o Marketing Studio.
El [runbook](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md) registra la distribución y su verificación.

## Fuentes técnicas

La autoridad de implementación vive en [AXIS](https://github.com/efeoncepro/axis-design-system):
`packages/registry/src/capabilities.ts`, `packages/brand-assets/src/logos.ts`, los exports de iconografía de
`packages/graphic-line` y sus ADRs. En Greenhouse permanece la
[decisión de plataforma compartida](../../architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md).
La [guía operativa de recursos](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/axis-resource-workflow.md)
explica cómo seguir estos contratos sin duplicar sus catálogos.

## Entradas especializadas y Growth Forms (04/10/2026)

En `main` de AXIS para primitives 0.5.0: teléfono con país, correo sin máscara, URL,
RUT/documentos y decimales exactos. El Lab permite probarlos en Field/Input; el package comparte el
comportamiento entre HTML y React. La versión publicada sigue siendo 0.4.0 hasta su próxima release.

El ejemplo telefónico ofrece 245 países y territorios con búsqueda por nombre o prefijo. El catálogo
se localiza desde metadatos del package; cada producto puede declarar una lista acotada. País/teléfono,
correo/URL y RUT/importe se alinean por filas y pasan a una columna en móvil. El formato ayuda a escribir:
un número posible no acredita que exista o pertenezca a la persona, y un RUT formateado no valida su dígito.

Growth Forms tiene un adapter optativo local, sin cambiar sus formularios activos, pins ni validación de
servidor. Su selector conserva 18 países; no añade automáticamente el catálogo de AXIS ni recibe el suyo
desde el Lab. La ampliación exige una adopción explícita del motor.
[Ownership, verificación y promoción](../../architecture/GROWTH_FORMS_AXIS_INPUT_BEHAVIOR_DECISION_V1.md).


## Video player — extensión candidata 2026-10-07

Cinema presenta el contenido de forma inmersiva; Editorial mantiene controles y capítulos; Review añade momentos para revisar. Las skins comparten video y estado. El producto conserva permisos, streaming, comentarios y analítica. Código local en AXIS, sin adopción Greenhouse ni publicación privada. [Fuente y alcance](../../../.claude/skills/efeonce-graphic-line/references/video-player.md).

Video, continuidad 2026-10-07: replay contenido en órbita canónica estática con nombre accesible; commit/push autorizado hacia ramas de revisión, sin publicación ni adopción productiva. El incidente intermitente de imagen azul en Think sigue abierto aunque una reproducción fresca completa pasa. Estado detallado: skill `efeonce-graphic-line/references/video-player.md` y QA AXIS `docs/quality/video-player-0.5.0.md`.

## Distribución del reproductor — 2026-10-07

Publicado en GitHub Packages: `axis-ui-primitives@0.6.3`, `axis-tokens@0.6.0`, `axis-ui-contracts@0.7.0`. [Release v0.6.3](https://github.com/efeoncepro/axis-design-system/actions/runs/37630788367) SUCCESS, fuente `7fb549a4ee862f077a05e8ff6bc0fadc58f44ff0`. Instalación limpia, exports DOM/React/integrations, SSR y igualdad byte a byte del JS/CSS con el build verificado: PASS. Think fija registry + lockfile, sin `link:`; build y typecheck PASS, main `cd428c789a4fea2feab3b4b0d08cf68c7f07efd5`, Vercel Production Ready en https://think.efeoncepro.com/preview/video-player. AXIS main y https://axis.efeonce.org/references/video-player/ desplegados.

El incidente intermitente de pintura azul en sesiones antiguas del navegador integrado sigue ABIERTO; esta publicación no acredita su corrección. WordPress conserva bloque candidato sin activación ni modificación del artículo publicado. Dispositivos/AT físicos y streaming real mantienen sus gates. Registry empaquetado 0.7.2 conserva su inventario anterior; no inferir descubrimiento de video desde ese paquete histórico.
