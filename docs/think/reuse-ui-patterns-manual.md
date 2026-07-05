# Manual para Reutilizar Patrones UI Think

Tipo: manual de uso / runbook.

Usar este manual cuando se quiera crear o adaptar una nueva experiencia publica
en Think a partir del patron de Brand Visibility.

## Antes de disenar

1. Confirmar si la experiencia pertenece a Think, al sitio principal
   `efeoncepro.com` o al portal Greenhouse.
2. Identificar el contrato Greenhouse que alimentara la experiencia:
   form, reader, status route, report route, short link, asset o API publica.
3. Revisar si ya existe un renderer gobernado. Si existe, usarlo.
4. Definir el resultado real del flujo: reporte en pantalla, agenda, descarga,
   contacto comercial, short link o estado asincronico.
5. Escribir la narrativa con copywriting + SEO/AEO juntos, no como pasadas
   separadas.

## Construccion recomendada

### Hero

- Usar una promesa clara y especifica.
- Mantener un asset principal grande e inspeccionable.
- Definir saltos de linea manuales cuando la frase lo necesite.
- Proteger el ancho del asset antes de ajustar el texto.
- Incluir cue de scroll si el formulario no aparece completo en el primer
  viewport.

### Input gobernado

- Embeber el renderer gobernado.
- No crear campos locales.
- No duplicar validacion, consentimiento, captcha ni submit.
- Escuchar el evento del renderer.
- Mostrar estados honestos alrededor del handoff.

### Marco explicativo

- Explicar el metodo en pocas capas.
- Usar iconos consistentes y correctamente encuadrados.
- Hacer que la card tenga borde visible en todo el set.
- Evitar que el texto tecnico suene abstracto: nombrar senales, canales y
  decisiones.

### Preview del resultado

- Mostrar que se obtiene despues del submit.
- Usar titulos descriptivos.
- Si hay screenshot/mock de reporte, debe parecer producto real.
- No prometer datos que el contrato no devuelve.

## Verificacion visual

En el repo `efeonce-think`, validar como minimo:

```bash
pnpm type-check
pnpm build
pnpm verify:landing -- http://localhost:4322/brand-visibility <capture-name>
```

Cuando exista deploy, repetir contra la URL productiva:

```bash
pnpm verify:landing -- https://think.efeoncepro.com/brand-visibility <capture-name>
```

Ademas:

- capturar desktop wide despues de 3s si hay animacion;
- capturar laptop 1280;
- capturar mobile 390;
- medir `scrollWidth == clientWidth`;
- comparar local vs live en el mismo viewport;
- verificar form loaded y form degraded/error;
- verificar loader/handoff cuando el flujo sea asincronico.

## Troubleshooting

| Sintoma | Revisar primero | No hacer |
| --- | --- | --- |
| H1 colapsa en demasiadas lineas | grid, max-width, saltos manuales, `text-wrap`, breakpoint | achicar el asset hero sin diagnostico |
| Animacion hero se ve chica | columna derecha, gap, wrapper, SVG intrinsic size, CSS productivo | cambiar el timeline para compensar layout |
| Margenes del hero no coinciden con el form | wrapper compartido, padding del shell, form dock width | mover secciones una por una a ojo |
| Iconos se ven fuera de centro | libreria, viewBox, line-height, flex center, optical size | hardcodear SVGs sin caja optica |
| Ultima card parece cortada | border color, box-shadow, overflow, contraste en edge derecho | bajar mas el borde |
| Form no carga | renderer Growth Forms, CORS, Turnstile, surface, network | crear form local |
| Loader queda en espera | status URL, outbox, consumer, `grader_run`, CORS status | asumir que el fallo es de Astro |
| Informe sale partial por Google AIO | runtime `ops-worker` y DataForSEO secrets | arreglarlo en Vercel env solamente |

## Deploy

Think se despliega desde `/Users/jreye/Documents/efeonce-think`, no desde este
repo. Antes de deployar:

- asegurar que el contrato Greenhouse ya esta productivo;
- correr type-check/build/verifier local;
- comparar capturas local vs live despues del deploy;
- validar que la landing conserve escala de hero y margenes;
- validar que el submit real sigue usando Growth Forms.

## Documentacion de cierre

Cuando un nuevo patron Think quede aprobado:

- agregarlo a `docs/think/README.md`;
- actualizar `docs/think/architecture-ui-patterns.md` si aparece un patron
  reutilizable;
- crear doc funcional si la experiencia tiene flujo propio;
- crear manual/runbook si hay pasos operativos repetibles;
- enlazar contratos Greenhouse relacionados;
- registrar delta en `project_context.md`, `Handoff.md` y `changelog.md`.
