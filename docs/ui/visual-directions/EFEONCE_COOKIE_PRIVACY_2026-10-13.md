# Privacidad Efeonce — dirección visual aprobada

Estado vigente: dirección aprobada con «Vamos, ponla» y adoptada en ambos hosts sobre la UI nativa
de HubSpot. [Publicación y QA real](../../audits/measurement/CONSENT_UI_ROLLOUT_2026-10-13.md).
El resto de este dossier conserva el prototipo inicial y su revisión local como antecedentes;
la demostración efímera no es el controlador de producción.

## Encargo y criterio

El operador pide un banner y preferencias más modernos, premium y elegantes, afines a La órbita.
Se conserva su decisión de un enlace discreto «Preferencias de cookies» junto a los enlaces legales.
El aviso inicial aparece automáticamente; la reapertura no es requisito para verlo.

Referencia: `efeonce-graphic-line` y controles publicados AXIS; benchmark nativo del repositorio,
sin copiar una CMP externa. Esta es UI pública de Efeonce en Astro, no el portal Greenhouse/MUI.

## Alternativas y elección

| Dirección | Ventaja | Decisión |
| --- | --- | --- |
| Papel editorial, navy, jerarquía Bricolage y tarjeta flotante | Ligereza, legibilidad y afinidad con Efeonce sin dominar el sitio | Elegida como candidata |
| Tarjeta completamente oscura con halo | Presencia de marca | Descartada: más peso visual y el halo no explica una función |
| Franja de ancho completo | Acciones a la vista | Descartada: repite el peso del footer que el operador rechazó |

Tesis: el carácter viene de la tipografía, proporción, silencio y contraste. Ningún anillo decorativo:
la interacción no necesita medir ni rodear un dato. El acento se limita al punto y a geometría funcional;
texto pequeño navy en claro. Sin Glitch, recursos generados ni iconos inventados.

## Wireframe y estados

Aviso: sobrelínea → «Tu visita. Tus reglas.» → explicación breve → dos acciones de igual tamaño
(aceptar todas / solo esenciales) → personalizar. Es una tarjeta flotante, no un bloqueo de página.

Preferencias: título y explicación → esenciales siempre activas → analítica / publicidad / funcionalidad
opcionales desactivadas inicialmente → guardar o solo esenciales. Diálogo centrado en escritorio;
panel inferior desplazable en móvil, con acciones dentro del flujo. Cerrar/Escape cancela cambios.

Confirmación: aviso breve y retorno al enlace persistente del footer. Reabrir recupera lo elegido
en memoria. Recargar reinicia la demostración; no escribe cookies, localStorage ni sessionStorage.
No existe un estado de error de proveedor porque la propuesta no hace peticiones de consentimiento.

## Reutilización y tokens

- `reuse`: botones, icono funcional de cerrar y switches HTML/CSS de `axis-ui-primitives@0.6.6` ya instalado en Think.
- `new candidate adapter`: composición, diálogo nativo, estado efímero y transformación móvil.
- Tokens: proyección generada de `axis-tokens@0.6.1` resuelto desde primitives; colores/type de
  `efeonceGraphicLine`, geometry/motion/typography/elevation y roles neutral/brand de AXIS.
  Script de generación en Think; sin actualizar dependencias ni crear un SSOT alternativo.
- Logo oficial existente en Think; Bricolage variable y Poppins locales instaladas.

## Accesibilidad y validación

Diálogo modal nativo, título enfocable, Escape, foco de retorno, etiquetas de switches,
esenciales informativas (sin un interruptor que prometa desactivarlas), movimiento reducido,
targets de controles AXIS y ausencia de overflow a 390 px. Capturas canónicas GVC escritorio/móvil
y pruebas focales de teclado/estado/red deben acompañar la revisión; no se infiere aprobación visual.

## Límite de integración

No sustituye el consentimiento canónico ni el bridge desplegado. El diseño se traduce primero
al editor de HubSpot si sus opciones y el plan del portal lo permiten. Un adapter con escritura de
categorías requiere API oficial verificada, misma fuente de consentimiento, GPC y readback real
en WordPress y Think; no se inventa una llamada de consentimiento ni se activa tracking desde esta vista.
La propuesta de configuración escalable de formularios sigue sin GO.

## Archivos y ejecución

Consumidor: `../efeonce-think/src/pages/preview/cookies.astro` y
`scripts/generate-cookie-preview-tokens.mjs`; ruta `/preview/cookies`, `analytics=false`, `noindex`.
Captura: `AGENT_AUTH_BASE_URL=http://127.0.0.1:4322 pnpm fe:capture efeonce-cookie-design --env=local`.
No requiere build, release, nuevo proyecto cloud ni despliegue.

## Resultado de revisión local

Evidencia del 2026-10-14 UTC (13/10 en Santiago):

- GVC final `.captures/2026-10-14T01-55-49_efeonce-cookie-design/`: escritorio 1440×1000 y móvil
  390×844; ocho frames, exit 0, cero findings automáticos de accesibilidad/layout/teclado/runtime.
- Prueba focal `.captures/verify-cookie-design.mjs` y
  `.captures/efeonce-cookie-design-interactions/result.json`: 16 comprobaciones por viewport, PASS.
  Verifica aviso automático, defaults off, foco contenido/retorno/Escape, aceptar todo, guardado selectivo,
  cancelar sin guardar, rechazar, reabrir, movimiento reducido, cero cookies/web storage,
  cero scripts de medición, cero solicitudes externas, cero errores y reinicio al recargar.
- `pnpm type-check` Think: cero errores, cero warnings, 17 hints preexistentes; no build completo.
- El logo existente coincide byte por byte con `axis-brand-assets@0.4.25`:
  SHA-256 `c647119e75eff0b13cab36c1485e2ff5a7b501125c43509ad6a4013ec2fdb49e`.
- Inspección visual directa de aviso y preferencias en ambos tamaños. Se corrigieron captura durante
  animación, enlace oculto por selector móvil, targets pequeños, orden visual/DOM de acciones, ciclo de
  foco y confirmación que interceptaba clics. La entrada mueve la superficie sin desvanecer el texto,
  para conservar el contraste durante la transición.

Revisión interna de diseño (escala 1–5, no equivale a aprobación del operador):

| Dimensión | Nota | Evidencia / criterio |
| --- | --- | --- |
| Dirección y fidelidad | 4.5 | Papel/navy, Bricolage/Poppins, tokens instalados y firma oficial |
| Jerarquía y acción | 4.5 | Título, explicación, decisiones comparables y personalizar visibles |
| Composición | 4.5 | Aviso contextual + diálogo; adapter público candidato explícito |
| Proporción y densidad | 4.5 | Aire editorial y filas separadas por divisores |
| Profundidad | 4.5 | Elevación modal solo en las superficies transitorias |
| Economía de superficies | 5 | Sin tarjetas anidadas ni franja permanente adicional |
| Impacto visual | 4.5 | Tipografía dominante ligada a la elección del visitante |
| Tipografía, color e iconos | 5 | Dos familias, roles AXIS y cerrar/flecha publicados; axe sin findings |
| Responsive | 4.5 | Panel inferior desplazable y cero overflow a 390 px |
| Estados | 4.5 | Inicial, borrador, cancelado, guardado y reapertura; proveedor fuera del scope |
| Interacción causal | 5 | 32 comprobaciones focales; cambios solo en memoria |
| Motion | 4.5 | Entrada corta desde tokens, texto opaco, reduced-motion sin animación |
| Accesibilidad | 4.5 | GVC + teclado, foco, Escape y etiquetas verificadas |
| Firma propia | 4.5 | Lenguaje editorial de Efeonce sin iconos de galleta ni anillo decorativo |

Promedio 4.64/5 en la revisión inicial. El operador aprobó posteriormente «Vamos, ponla»;
la adopción nativa en WordPress/Think y las pruebas reales de preferencias constan en el rollout.
Ningún PASS local certifica el matching o los eventos de producción.
