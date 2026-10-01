# Fotografía SKY: estilo, producción y revisión

## Dueño y selección de fuentes

El canon es la skill del equipo `brands/sky-airline/skills/sky-fotografia/SKILL.md` 1.0.0,
su companion y recursos admitidos del pack Workbench. Los routers `.codex/.claude` de
Workbench apuntan a ella. Esta guía de operación no sustituye ni reescribe sus maestros.
Leer operación, reglas, anclas y decisiones originales antes de generar o evaluar.

Categorías: **Cabina** para interior de avión; **Personas** para experiencia humana fuera de
Cabina; **Destinos** para lugares sin personas visibles. Una persona pequeña también cuenta.
Las estatuas no son viajeros. No usar Destinos para un paisaje con una viajera visible.

Abrir el ancla de la categoría y cualquier referencia nueva. El ancla representa respuesta
fotográfica, no identidad, lugar, pose o formato que deba copiarse. No asumir que el ancla
Destinos equivale a la “referencia C”; esa relación no está confirmada.

En máquinas con bundle, el recurso sellado se puede inspeccionar en
`clients/sky/.resources-local/sky-photography-anchor-<categoría>`. No tiene necesariamente
extensión, pero sus bytes/hash deben coincidir con el pack. El árbol binario original completo
es privado. `validate.py` del ZIP original espera ese árbol; el instalador de bundle verifica
sus bytes por otro layout. No concluir que la marca está rota por esa diferencia de ubicación.

## Gramática fotográfica

Editorial documental, observacional y espontánea; emoción creíble sin stock ni pose de anuncio.
Foreground cercano, parcial y muy desenfocado que aporta inmersión sin tapar la historia;
protagonista legible; fondo suave. Asimetría y perspectiva natural. Exposición contenida,
altas luces con detalle, grano fino y suavidad óptica; sombras densas con información, sin HDR.
Saturación contenida, highlights cálidos, medios neutros y sesgo oliva/cyan sutil en profundidad;
no filtro global sobre pieles, blancos o uniformes.

| Categoría | Criterios específicos |
| --- | --- |
| Cabina | Humanidad documental y entorno impecable; ventana dominante cuando visible, luz interior de apoyo; blancos/grises limpios y morado fiel de uniforme, sin deriva magenta/azul/lavanda |
| Personas | Experiencia humana protagonista, contexto subordinado; gesto espontáneo y luz natural; casting según mercado de origen, no según destino ni nacionalidad inferida por apariencia |
| Destinos | Sin personas, incluido foreground; primer plano ambiental y lugar vivido/accesible; monumentos/vistas elevadas permitidos sin postal rígida; vegetación oliva/musgo natural |

Los valores 35/50 mm y f/2–2.8 describen intención estética; no se certifican mirando píxeles.
El foreground aproximado 10–25% no tiene protocolo oficial de segmentación.

Para Personas/Destinos con cielo/copy: azul de familia hue ~210°, sin teal/turquesa/eléctrico;
arriba más profundo, horizonte más claro/menos saturado; nubes suaves/periféricas ~5–15%
**del cielo visible**. Reserva tranquila para copy ~30–40% **del encuadre** cuando corresponda,
sin rostros/hitos/contraste fuerte. No imponer porcentajes de exterior a una Cabina interior.
No hay tolerancia oficial de hue ni HEX obligatorio del morado fotográfico en estas fuentes.

## SCENE, maestro y admisión

En generación ordinaria sólo sustituir SCENE. Escribirla en inglés con categoría, acción/lugar,
mercado cuando aplique, hora, foreground y reserva útil al formato. Usar el script original:

```sh
python brands/sky-airline/skills/sky-fotografia/scripts/compose.py --category destinos --scene-file /ruta/privada/scene.txt --output /ruta/privada/prompt.txt
```

Las rutas son ejemplos de preparación, no inputs libres de un job productivo. El script conserva
literalmente bloques fijos, encuentra su skill desde su ubicación y no sobrescribe output.
No concatenar un maestro a mano ni usar bloques de fotografía Efeonce para llenar huecos SKY.
Formatos/ajustes del proveedor se fijan externamente por admisión, no reescribiendo el maestro.

Una escena/prompt nuevo preparado **no está autorizado por el pack**. El maintainer debe admitir
recursos, procedencia, categoría, maestro, ancla y contrato antes de producir. El job IA sólo
selecciona IDs y `promptResourceId`. `brands/sky-airline/photography-contract.mjs` verifica
maestro/SCENE/ancla y bytes; no acepta prompt libre, categoría cruzada ni settings del caller.
El brief local tampoco publica automáticamente la pieza en el canon del broker.

## Producción gobernada

Leer `docs/manual/brand-production.md`. Para IA el segundo argumento se resuelve **dentro de
la pieza**, a diferencia del path de job de diseño. Flujo del ejemplo histórico existente:

```sh
pnpm marca:producir projects/sky/fotografia-skill-test job.json --validate
pnpm marca:producir projects/sky/fotografia-skill-test job.json --prepare
```

Validar no llama proveedor. Preparar registra intención local privada y UUID, tampoco paga.
El ejemplo es prueba histórica; no ejecutarlo como nuevo brief. Para la pieza autorizada y
con generación habilitada por maintainer, usar el UUID devuelto:

```sh
pnpm marca:producir projects/sky/<pieza> job.json --execute <UUID>
pnpm marca:producir projects/sky/<pieza> job.json --receipt <UUID>
pnpm marca:producir projects/sky/<pieza> job.json --download <UUID>
```

Placeholders documentales, no comandos listos. No iniciar variantes/retries/lotes pagados
por defecto. Ante incertidumbre consultar el mismo UUID; leer/descargar puede seguir habilitado
con generación OFF. No habilitar flags ni leer Secret Manager desde un pedido de imagen.

El piloto aprobado como criterio fotográfico usó `gpt-image-2`, **medium**, 1536×1024;
el canary genérico anterior low es otra corrida retirada. Leer ajustes del recurso admitido;
no convertir un dato histórico en selección universal de modelo ni en aprobación comercial.

## Foto adecuada para un KV

Antes de preparar SCENE, resolver adaptación, cajas reales de título/subtítulo/logo/CTA y
FILL del photo slot. Proyectar reservas al encuadre efectivo. Una foto 1536×1024 en slot
1000×544 recorta: un “lado libre” en el original no garantiza espacio en la adaptación.
No cambiar texto blanco, paints, coordenadas o añadir scrim para esconder un fondo incompatible.
Elegir/admitir foto o formato adecuados al brief y medir contraste en la composición final.

## Evaluar y corregir

Abrir PNG real. Informar por criterio cumple / requiere ajuste / no verificable / no aplica:
categoría, historia, foreground, planos, luz, color, textura, anatomía, contenido, cielo y copy.
Localizar el problema, proponer corrección mínima y decir qué se preserva. Si se mide cromática,
declarar espacio de color, máscara/área y método; una muestra no certifica todo el encuadre.

Para edición localizada seguir operación original y usar imagen actual como base; si sólo
falla cielo, preservar identidad, pose, vestuario, piel, vegetación, grano y composición. El
negative de generación “sky replacement” no se reutiliza a ciegas para una edición de cielo.
El soporte efectivo de edición depende del adapter/pack actual: no usar API cruda para obtenerlo.
Las restricciones de costo del harness prevalecen sobre un bucle de correcciones sugerido.

Una excepción explícita para una pieza no modifica permanentemente la marca. Cambiar reglas
o maestros requiere companion de mantenimiento, alcance, evidencia y revisión. Conservar
fuentes originales y rechazos. Confirmación del estilo de una foto no aprueba texto/contraste
ni publicación del KV resultante.
