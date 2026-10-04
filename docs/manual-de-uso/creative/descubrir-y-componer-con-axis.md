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
