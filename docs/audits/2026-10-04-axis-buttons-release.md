# AXIS — familia de botones y contexto de negocio

Fecha: 2026-10-04. Corte vigente: AXIS `13db367`, tag `v0.5.1`; historial desde `1bccb3f` / `v0.3.43`.
ADR dueño: [plataforma UI compartida](../architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md);
especialización en AXIS `docs/architecture/BUTTON_FAMILY_DECISION_V1.md`.

## Alcance

Familia HTML/CSS portable y React opcional: cinco apariencias, tres tonos y tamaños, 26 íconos,
CTA con flecha optativamente animada, carga con La órbita, grupos, toggles, menús y split.
`line` es contexto optativo: Growth, Brand, Engine, Voice y Revenue HubSpot/Salesforce;
sólo afecta tono brand. Neutral/destructivo conservan su significado. Valores del canon de La órbita,
texto/hover AA y geometría común. El Lab consume el mismo package e hidrata React real.

## Verificación

- Índice Git exportado a un directorio aislado, excluyendo cambios paralelos de AI Visibility Report.
- Install frozen/offline, build, typecheck, tests, lint, design:check y agent:check: pasan.
- 28 recorridos Playwright sobre su propio preview: HTML/React y regresión de búsqueda,
  escritorio/móvil Chromium. Validación nativa, refs, menús/teclado/typeahead/foco, split y 320px.
- Capturas locales: `/tmp/axis-button-review/buttons-business-lines.png` y `buttons-react-menu.png` y `buttons-engine-menu.png`.
- Push `1bccb3f` y tag realizados. [CI](https://github.com/efeoncepro/axis-design-system/actions/runs/37221051398)
  y [release](https://github.com/efeoncepro/axis-design-system/actions/runs/37221054045): ambos success.
- Vercel del SHA: success; página/manifest públicos HTTP 200 con las seis líneas, fixture React y exports compuestos.
- Instalación privada limpia: HTML/CSS sin React con `--omit=peer`; SSR de cinco componentes con React 18.3.1. Credencial efímera retirada al terminar.

## Consumo y límite de adopción

Release inicial publicado: `axis-ui-primitives@0.1.0`, `axis-tokens@0.3.43`, `axis-ui-contracts@0.4.0`,
`axis-ui-registry@0.4.0`. Publicación y tarball instalados y verificados.
Importar `/button.css` y elegir entrada HTML o `/react` (React/React DOM 18+ opcionales).
El consumidor carga su Poppins y conecta comandos, confirmaciones y anuncios de resultado.

No se cambiaron pins ni pantallas de Greenhouse, Globe o Marketing Studio. Las fixtures existentes
de status/progress no acreditan adopción de estos botones. Cada producto decide dónde usar tono
brand y contexto de línea; MUI/Vuexy y su jerarquía vigente no se sustituyen automáticamente.
No se modificaron credenciales, permisos de packages ni se despertaron servicios hibernados.
La instalación con credencial del operador no prueba acceso de los tokens CI de otros repositorios.

Rollback: conservar los pins consumidores vigentes; para una adopción futura, revertir el adapter y
pin en su repo. No borrar versiones publicadas ni mover el tag. El Lab revierte mediante commit/deploy.

Se revisaron project_context.md, Handoff.md y changelog.md: rutas de consumo y estado al día, sin cambiar pins ni contratos runtime de Greenhouse.


## Parche final de distribución

AXIS `31b146e`, tag `v0.4.1`: `axis-ui-primitives@0.1.1` y `axis-ui-registry@0.4.1` publicados
por [release 37221453569](https://github.com/efeoncepro/axis-design-system/actions/runs/37221453569) success.
Tokens/contratos permanecen 0.3.43/0.4.0. El parche actualiza documentación y elimina el estado
«pendiente de release» del manifest; API/estilos sin cambios. Instalación limpia repetida sobre 0.1.1:
entrada portable/CSS sin React, seis líneas, 26 íconos y cinco componentes con React 18.3.1 pasan.
Página, guía y manifest públicos HTTP 200 reflejan distribución verificada. Vercel del SHA success.
CI del parche: [37221450699](https://github.com/efeoncepro/axis-design-system/actions/runs/37221450699).

Gates documentales Greenhouse: espejos de skills idénticos; cierre acotado sin faltantes;
context-check:strict sin errores ni advertencias. Se conservaron cambios ajenos de Handoff/changelog
mediante staging parcial. No se tocó la memoria personal del agente.


## Extensión de controles y calidad

Fuente AXIS `13db367` (implementación `8dcd50d`/`9dc753b`): primitives 0.2.1 y registry 0.5.1 publicados; tokens/contracts se mantienen
0.3.43/0.4.0. Nuevos ButtonProvider, RadioButtonGroup y ButtonToolbar; menús controlados con opciones
dinámicas, portal modal y top layer; SplitButton con ref/atributos de formulario y menú independiente.
El Lab consume la implementación publicada, no mantiene una copia de estos controles.

El índice Git se exportó a un directorio temporal sin cambios paralelos de AI Visibility Report.
Install frozen/offline, build, typecheck, tests, design:check y agent:check pasan. Los 52 recorridos del
árbol aislado en puerto 4322 pasan en Chromium, Firefox, WebKit y perfil iPhone 13 WebKit. Diez unitarias
de primitives cubren además SSR, composición de contexto, formularios, validación y contraste.
Regresión visual: 32 referencias revisadas, 16 por sistema operativo (macOS/Linux; líneas, superficies, estados y toolbar RTL). CI/release
comparan esos archivos y conservan trazas/diffs si fallan. Referencia canónica: AXIS `docs/quality/buttons.md`.

Accesibilidad comprobada: axe WCAG 2 A/AA + 2.1 AA sin violaciones en la familia y el menú modal;
roles/estados, teclado, alto contraste Chromium/Firefox, reduced motion, texto a 200/400% y reflujo a 320px.
**Pendiente real:** sesión manual VoiceOver/NVDA, zoom nativo del navegador y iPhone físico. La apertura
de Safari mediante control nativo falló por ScreenCaptureKit -3811; no se observaron anuncios de VoiceOver.
WebKit y axe no acreditan esa sesión. El consumidor conserva focus trap, validación y anuncios de resultados.

Capturas de revisión: `/tmp/axis-button-review/buttons-complete-context.png` y `buttons-dialog-menu.png`.
Release privado [37223839523](https://github.com/efeoncepro/axis-design-system/actions/runs/37223839523): success.
Instalación limpia desde el registro: primitives 0.2.1 y registry 0.5.1; entrada HTML/CSS sin React,
seis líneas, 26 íconos y SSR de los ocho componentes con React 18.3.1 pasan. Credencial efímera retirada.
Vercel de `13db367`: success. Página pública revisada: Voice heredado, radio Mes y menú modal; Escape
cierra sólo el menú y devuelve el foco. Captura: `/tmp/axis-button-review/buttons-public-dialog.png`.
CI final: [37223825702](https://github.com/efeoncepro/axis-design-system/actions/runs/37223825702): success; los 52 recorridos también pasan en este workflow.


El primer release (`v0.2.0`, 37223133217) falló en los gates por diferencias de capturas macOS/Linux,
preferencias Tab del sistema y límite de captura de WebKit móvil; no publicó nuevas versiones.
`9dc753b` corrige las pruebas y la toolbar omite controles ocultos por CSS. La captura Linux manual
[37223596908](https://github.com/efeoncepro/axis-design-system/actions/runs/37223596908) produjo candidatos:
se revisaron sus 16 imágenes antes de incorporarlas en `13db367`. Los gates no regeneran referencias.
Los 52 recorridos macOS pasan tras el ajuste; release publicado `v0.5.1` conserva inmutable el tag fallido.
