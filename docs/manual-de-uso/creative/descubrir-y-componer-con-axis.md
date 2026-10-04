# Descubrir recursos y componer con AXIS

> Manual de uso · 2026-10-04. [Qué es y cómo funciona](../../documentation/creative/axis-packages-y-lab.md) · [Runbook de packages](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).

## 1. Encuentra el recurso

Abre [AXIS para agentes](https://axis.efeonce.org/agents/) o usa la búsqueda global del Lab.
Declara objetivo, marca, superficie, salida y si buscas una pieza o integrar un componente. Revisa el estado,
el ejemplo y las limitaciones de la capacidad. Los manifests públicos permiten a un agente leer lo mismo:
`/agents/capabilities.json`, `/search-index.json`, `/references/iconography.json` y `/references/logos.json`.

Para íconos, abre [Iconografía](https://axis.efeonce.org/references/iconography/), filtra por AEO, SEO o Autoridad
y confirma canónico/candidato, voz, estado y tamaño. Usa la API declarada en cada entrada: `resolveIcon` para
canónicos; `resolveSeoIcon` desde `/icons/seo` para candidatos. Las colecciones se solapan; no dupliques Brand
Authority. «Copiar SVG» conserva el recurso renderizado. `pnpm icons:export` exporta sólo el catálogo canónico,
no todos los candidatos de la galería.

Para logos, abre [Logotipos](https://axis.efeonce.org/references/logos/), elige familia, variante y superficie.
Descarga el SVG o PNG oficial y conserva la procedencia. No reconstruyas logos con texto ni asumas partnership.
La API source `@efeoncepro/axis-brand-assets/logos` permite buscar por ID y resolver el archivo; verifica que la
versión publicada que instales incluya ese export. Su release está pendiente al corte del 4 de octubre.

## 2. Prepara el entorno correcto

Consultar el Lab es público. Instalar packages privados exige acceso al registry; los comandos `agent:*` se ejecutan
en el checkout autorizado de AXIS, no son ejecutables instalados por npm en cualquier producto.
Desde la raíz de `axis-design-system`:

```sh
pnpm install
pnpm --filter @efeoncepro/axis-ui-registry... build
pnpm --filter @efeoncepro/axis-graphic-line... build
pnpm agent:list
pnpm agent:show aeo-search
pnpm agent:doctor aeo-search
```

El doctor verifica dependencias locales. No certifica permisos remotos ni publicación de paquetes. Sigue sus
instrucciones de recuperación. Las rutas AEO necesitan Google Chrome; las rutas HTML incluyen fuentes y assets.
Un post necesita una foto raster local relativa al JSON: descargar el ejemplo no descarga esa foto.

## 3. Ejecuta una capacidad declarada

Usa el schema y el ejemplo de `agent:show`, completa la intención y elige una carpeta de salida nueva:

```sh
pnpm agent:run aeo-search --input /ruta/intent.json --out-dir /ruta/salida-nueva
```

`aeo-search`, `social-basic` y `deck-basic` producen SVG o HTML según la capacidad. Las rutas resolver entregan
manifests que requieren materialización. Las de adopción devuelven `CONSUMER_ADAPTER_REQUIRED`: revisa el contrato
con `findPattern(id)` e implementa estados, accesibilidad y responsive en el producto. El deck básico no sustituye
los renderizadores específicos de todas las recetas del Lab.

## 4. Revisa la salida y conserva evidencia

Abre la pieza a su tamaño de uso y comprueba fuentes, contraste, recortes, firma y reglas de la marca. Conserva
`agent-output.json`, los archivos generados y sus hashes. Cada observación de QA declara `check`, `status`,
`artifactSha256`, `reference` y `reason` cuando corresponde `not-applicable`. Incluye todos los checks requeridos.

```sh
pnpm agent:verify aeo-search --out-dir /ruta/salida-nueva --evidence /ruta/observaciones.json
```

`missing` mantiene la cobertura incompleta; `failed` registra un fallo. El verificador recalcula hashes y rechaza
la evidencia si los archivos cambiaron. Un hash no prueba la veracidad de una medición: la revisión debe existir.
El comando imprime el informe JSON; consérvalo con la entrega. Composición, QA, aprobación y publicación son
estados separados.

## 5. Si mantienes el Lab o un consumidor

En el Lab, usa `LabHeading` para títulos editoriales h1/h2, sin redefinir su familia por página; hereda Bricolage
del token `efeonceGraphicLine.type.answer.family`. Conserva las fuentes propias de los specimens. Ejecuta los
checks del Lab, build y gate de tipografía en navegador antes de publicar. En un producto, fija la versión
publicada del package y verifica allí el adapter; desplegar el Lab no actualiza tu dependencia.

## Problemas habituales

| Señal | Acción |
| --- | --- |
| El export no existe en la versión instalada | Compara tarball/export con source y release; no uses el número del workspace como prueba de publicación |
| No aparece un ícono | Revisa query, colección y aprobación; abre su enlace directo desde el manifest unificado |
| Un logo no está en el catálogo público | Comprueba la familia y procedencia; puede estar excluido por restricciones de uso |
| `BUILD_REQUIRED` o doctor bloqueado | Compila las dependencias y corrige el requisito indicado |
| `OUTPUT_EXISTS` | Conserva la salida anterior y usa una carpeta nueva |
| QA incompleta | Aporta observaciones reales para los checks faltantes; no cambies `missing` por `passed` sin evidencia |

Para los módulos gráficos de búsqueda/conversación AEO, continúa con
[componer recursos AEO](componer-recursos-aeo-con-axis.md); para reglas visuales, con la skill `efeonce-graphic-line`.


## Botones como componente de producto

La guía [Consumir botones](https://axis.efeonce.org/docs/buttons/) usa `axis-ui-primitives`:
entrada raíz HTML/CSS sin React y `/react` opcional. No copies el código del Lab. La capacidad
`adopt-efeonce-button` enumera exports; confirma la versión instalada en el registry.

Elige `ButtonGroup` para Tab normal, `ButtonToolbar` para acciones recorridas con flechas,
`RadioButtonGroup` para una elección exclusiva y `ToggleButton` para activar/desactivar una función.
`ButtonProvider` hereda línea/tamaño/superficie/tono; props explícitos conservan prioridad. La línea sólo
recolorea tono brand. Para menús en diálogos/paneles usa el host modal predeterminado o `portalContainer`;
la aplicación conserva su focus trap y anuncios. `SplitButton` separa acción principal y alternativas.
Consulta [evidencia y límites de QA](../../audits/2026-10-04-axis-buttons-release.md) antes de certificar accesibilidad.

## Colores, badges, chips y formularios

1. Consulta [Colores](https://axis.efeonce.org/references/colors/): La órbita es la identidad vigente.
   Elige línea y superficie antes de resolver roles. Las ramps derivadas sirven para construir jerarquías,
   pero no asignan por sí solas los estados interactivos. Mantén las ramps antiguas sólo como compatibilidad.
2. Usa `Badge` para estado/categoría y `CountBadge` para cantidades. `Chip` representa una entidad;
   `FilterChip` selecciona varias opciones, `ChoiceChipGroup` una sola, `ActionChip` dispara una acción auxiliar
   y `RemovableChip` separa la etiqueta del botón de eliminar. No conviertas un badge informativo en botón.
3. Para formularios empieza por [la guía de consumo](https://axis.efeonce.org/docs/forms/) y las
   páginas [Field](https://axis.efeonce.org/patterns/efeonce.field/),
   [Select](https://axis.efeonce.org/patterns/efeonce.select/) y
   [Combobox](https://axis.efeonce.org/patterns/efeonce.combobox/). Confirma la versión publicada en el
   [runbook](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md) antes de instalar.
4. Importa `@efeoncepro/axis-ui-primitives/forms.css` y los componentes desde `/react`; usa la entrada raíz
   para HTML sin React. `FormProvider` hereda línea/superficie/tamaño/densidad. Combina `Field` con un control
   directo o usa `FieldRoot`, `FieldLabel`, `FieldDescription` y `FieldMessage` para composición más compleja.
5. Añade iconos de apoyo con `leadingIcon="mail"` o `leadingIcon="folder"` cuando aporten significado.
   Conserva la etiqueta visible. No agregues un outline al input interior: el wrapper dibuja el foco único.
6. Elige `Select` para listas breves con descripciones y selección marcada; `NativeSelect` cuando prefieras
   el picker de plataforma, y `Combobox` cuando necesites consulta y selección explícita. Los valores son
   únicos; los deshabilitados/retirados no deben quedar como selección enviada. Date/file y multiselect
   combobox no están incluidos.
7. Verifica datos enviados, required, restablecimiento, teclado y error summary. Mantén los valores ante
   fallo, permite retry y restaura el estado controlado desde el producto. Los demos del Lab no guardan datos.

Para integrar sin rediseñar: usa los roles y el CSS del package, no colores o menús copiados del Lab.
La [evidencia de formularios](../../audits/2026-10-04-axis-forms-release.md) distingue pruebas locales,
publicación y adopción. Prueba lectores de pantalla, autofill y dispositivos reales en el producto consumidor.


## Probar y adoptar entradas especializadas

La implementación está en `main` de AXIS para primitives 0.5.0; confirma su publicación en el
[runbook](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md#próxima-adopción-entradas-especializadas)
antes de instalar. El Lab usa el workspace y puede mostrar una API aún no publicada.

1. En el Lab local del checkout AXIS, abre `/patterns/efeonce.input/` o Field y busca «Entradas con contexto».
   La [ruta pública Input](https://axis.efeonce.org/patterns/efeonce.input/) depende del despliegue del Lab;
   comprueba el corte antes de asumir que incluye las nuevas entradas.
   Busca un país por nombre o prefijo, elígelo y pega un teléfono nacional o con `+` internacional.
   Sal del campo para revisar formato; «Ver valores del ejemplo» permite comprobar el dato normalizado.
   Los datos de la demostración no se guardan ni se envían.
2. Prueba correo con alias, URL, RUT e importe. Conserva el texto incompleto para poder corregirlo;
   el producto valida la admisibilidad. No conviertas un importe exacto a `Number` ni supongas que
   formatear el RUT comprueba su dígito.
3. En React usa los campos especializados desde `/react`: ya componen etiqueta, control y mensaje,
   por lo que no se envuelven en otro `Field`. Importa `/forms.css`. En modo controlado conserva
   `display` para edición y consume `value` para normalización, comprobando su estado y posible `null`.
4. Para `PhoneField`, obtiene la lista con `phoneCountryOptions('es')` desde `/input-phone`;
   pasa una lista explícita de códigos como segundo argumento sólo cuando el producto deba acotarla.
   Define país, `countryLabel`, `onCountryChange` y, para listas extensas, `countrySearch` con
   `emptyMessage`, `invalidMessage` y placeholder localizados. La lista completa tiene 245 entradas
   en este corte; no dupliques los nombres ni los prefijos dentro del producto.
5. En HTML sin React usa los behaviors y `bindInputBehavior` desde `/input-behavior`, y el teléfono
   desde `/input-phone`. El binder ayuda a editar; el consumidor serializa y valida el valor.
   Verifica pegar, borrar, IME, reset, disabled/readOnly, teclado, lector de pantalla y móvil.

En Growth Forms esto requiere el adapter propio: sus 18 países actuales no se amplían automáticamente.
La inyección optativa de formato no es un reemplazo del renderer ni activa el cambio en los formularios
publicados. Sigue la [decisión de adopción y su prueba local](../../architecture/GROWTH_FORMS_AXIS_INPUT_BEHAVIOR_DECISION_V1.md)
antes de cambiar versiones, catálogo o embeds.
