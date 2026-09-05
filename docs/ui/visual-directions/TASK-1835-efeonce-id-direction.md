# TASK-1835 — Dirección visual de Efeonce ID

## Estado y alcance

- Fecha: 2026-09-05.
- Dirección: `repo-native-benchmark`.
- Perfil: `ui-standard`, recorrido `full-loop`, superficie `settings / identity_access`.
- Dueña: [TASK-1835](../../tasks/in-progress/TASK-1835-efeonce-id-login-consent-screens.md), dependencia visible de TASK-1836.
- Decisión de diseño propuesta: **Acceso enfocado con contexto explícito**.
- Estado: dirección documentada para revisión; **sin aprobación visual, UI ready: no**.

Este documento define la composición y sus límites. No implementa pantallas, no activa acceso y no
certifica el recorrido real. El [plan de integración](../../tasks/plans/TASK-1835-plan.md) conserva
las dependencias de retorno OAuth, DTO de organización, step-up y verificación visual.

## Fuentes revisadas y precedencia

La decisión aplica la skill [greenhouse-ai-design-studio](../../../.codex/skills/greenhouse-ai-design-studio/SKILL.md)
y sus fuentes: [DESIGN](../../../DESIGN.md), [premium UI](../GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md),
[orquestación](../GREENHOUSE_UI_ORCHESTRATION_V1.md), [modelo de producto UI](../../architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md)
y [catálogo de primitives](../../architecture/ui-platform/PRIMITIVES.md). Se contrastaron el
[wireframe](../wireframes/TASK-1835-efeonce-id-login-consent-screens.md),
[flow](../flows/TASK-1835-efeonce-id-login-consent-screens-flow.md),
[motion](../motion/TASK-1835-efeonce-id-login-consent-screens-motion.md) y
[flujo maestro](../flows/EPIC-044-auth-server-login-consent-UI-FLOW.md) existentes con los contratos
actuales de TASK-1836. Las diferencias señaladas al final requieren sincronización; este documento
no convierte una propuesta visual en autoridad de autenticación.

El benchmark es interno: `CompositionShell` y la receta `settingsFlow`, las superficies abiertas del
Surface System, el contrato tipográfico vigente y la marca institucional Efeonce. No usa capturas
externas ni reproduce el dashboard del portal. La comparación siguiente es un juicio de diseño;
no es un score de capturas que todavía no existen.

## Problema de la persona y criterio de éxito

La persona llega desde una aplicación que solicita acceso. Debe reconocer Efeonce, escoger su
forma de entrar y comprender para qué aplicación y organización está autorizando permisos. Una
persona del equipo necesita una entrada corporativa reconocible. Una persona invitada necesita
passkey o enlace sin que su correo se use para inferir población, organización o privilegios.

La primera mirada debe responder «dónde estoy», «qué aplicación me trajo» y «cómo sigo». En
consentimiento debe responder «qué autorizo y sobre qué organización» antes de «Permitir».
El contenido de permisos domina la decisión; la marca aporta reconocimiento sin competir con él.

## Comparación de tres direcciones

| Dirección | Composición y carácter | Ventajas para este recorrido | Coste o riesgo | Decisión |
|---|---|---|---|---|
| A. Tarjeta central uniforme | Marca, tarjeta compacta y pie; igual ancho para login y consentimiento | Familiar, poco chrome, implementación HTML directa | En consentimientos largos comprime organización y permisos; dos poblaciones pueden parecer simples métodos intercambiables; la tarjeta termina acumulando subsecciones encerradas | Descartada como receta universal; conserva la sobriedad |
| B. Acceso enfocado con contexto explícito | Una columna centrada, marca discreta, contexto de aplicación abierto y una superficie principal; login compacto y consentimiento con ancho de lectura mayor | Distingue propósito de método, prioriza organización y efectos de permisos, mantiene continuidad entre estados y admite texto largo | Exige DTO honesto de contexto y comprobar que el cambio de ancho entre páginas conserve continuidad | **Seleccionada** |
| C. Editorial dividida | Columna de marca y explicación a un lado, formulario al otro; narrativa amplia | Más presencia institucional y espacio para explicar el sistema | Duplica información durante una interrupción breve; una mitad casi vacía en estados simples y recomposición móvil costosa; invita a ilustración decorativa o claims de seguridad innecesarios | Descartada para esta superficie |

La dirección B reutiliza la gramática del repositorio sin trasladar navegación, sidebars o tarjetas
analíticas a un emisor de identidad. Su gesto dominante es la jerarquía de contenido: nombre de
aplicación, organización y permiso legible. No necesita gradientes, rieles de color, ilustraciones,
marcas de «verificado» ni una promesa de seguridad que los metadatos del cliente no sostienen.

## Composición seleccionada

### Shell y primera pantalla

Un `main` de página contiene marca Efeonce ID, contexto de aplicación cuando está validado, título,
contenido de la tarea y acciones. Un pie discreto explica el retorno a la aplicación cuando existe
un retorno validado. La página completa usa fondo neutral; una sola superficie de decisión blanca
organiza los controles. Las secciones interiores se separan por espacio y, cuando ayuda, divisor.

El login presenta dos recorridos explícitos, sin selector automático por correo:

1. «Equipo Efeonce», con la acción «Continuar con Microsoft» y una explicación breve de que usa
   la cuenta corporativa. Invoca `/auth/internal/login` con el retorno permitido por el servidor.
   Su disponibilidad deriva del estado habilitado del backend; no se promete una opción inoperante.
2. «Acceso por invitación», con «Usar mi passkey» y después el formulario de correo y enlace como
   alternativa. El passkey externo sigue precediendo al correo y no requiere identificar la cuenta.

Son secciones abiertas dentro de la misma superficie, con encabezados legibles. El botón
corporativo puede ocupar el énfasis principal en esta entrada institucional; el passkey conserva
la prioridad dentro del recorrido externo. No hay dos botones saturados compitiendo. El copy
aclara el destino de cada acción antes de pedir datos. Elegir una opción nunca cambia por sí solo
la autoridad de una sesión. La versión final del copy vive en `src/lib/copy/auth-server.ts`.

El formulario no pregunta organización para decidir el método, no redirige al escribir un dominio
y no contiene un supuesto «crear cuenta». La respuesta al enlace mantiene la misma presentación
para correos conocidos y desconocidos. La entrada directa sin aplicación tiene título de acceso
y salida a sesión; no inventa un cliente ni un retorno.

### Consentimiento

Orden de lectura: marca → aplicación solicitante → título de decisión → organización/contexto →
lista de efectos solicitados → acciones. El nombre de aplicación viene del cliente validado; su
logo es opcional y nunca sustituye el nombre. Un logo remoto exige la validación y CSP del contrato;
el fallback es texto o monograma neutro, sin descargar activos arbitrarios desde la plantilla.

En población interna se muestra la **organización exacta del contexto de autorización resuelto**.
No se infiere «Efeonce» del tenant, correo o nombre de persona. Si se necesita elegir contexto,
la selección requiere un reader/command canónico que lo materialice; no se agrega un selector
decorativo ni se permite que un campo oculto otorgue autoridad.

En el recorrido externo vigente se muestran las membresías que el contrato realmente entrega,
con sus organizaciones y permisos correspondientes. No se ocultan varias organizaciones detrás
de una etiqueta singular ni se presenta como selección lo que es una lista informativa. Un scope
solicitado y un permiso efectivo de organización son datos distintos: el resumen no afirma que
aprobar un scope amplía los grants actuales. El DTO debe permitir expresar esa diferencia.

Los permisos forman una lista semántica: nombre humano, efecto concreto y etiqueta de escritura
cuando corresponde. El color refuerza el texto, no lo reemplaza. El identificador técnico del scope
puede ir en un detalle accesible si aporta inspección; no domina el primer nivel. El identificador
de aplicación, si se muestra, lleva una etiqueta comprensible y permite salto de línea, sin monospace.

«Permitir» exige activación explícita y no recibe foco inicial. «Cancelar» conserva presencia y
explica que vuelve a la aplicación sin autorizar. Ambos invocan el mismo handler de consentimiento.
SSO completado, factor verificado y consentimiento otorgado son momentos distintos: no hay
checkmarks de aprobación antes del resultado del servidor ni pantalla festiva antes del redirect.

### Recuperación y segundo factor

Cada estado conserva la misma posición de marca, título y acciones. Errores de campo quedan junto
al campo; fallos terminales tienen una salida útil y referencia sanitizada. «Sin soporte para
passkey», «ceremonia cancelada» y «demasiados intentos» requieren instrucciones distintas.

La confirmación del enlace sigue siendo una acción POST explícita; la vista GET no lo consume.
La inscripción TOTP diferencia mostrar QR/códigos, guardarlos y verificar el primer código. No
declara éxito al mostrar el secreto. Los códigos de respaldo se presentan como material de una
sola entrega, sin incluirlos en capturas o logs reales.

Para elevar una sesión corporativa se usan `/auth/passkeys/step-up/start`,
`/auth/passkeys/step-up/finish` o `/auth/totp/verify`; el login por passkey no reemplaza esa sesión.
La pantalla explica el factor que está verificando, sin afirmar que Microsoft ya verificó MFA.

## Primitives y adaptación al runtime

El lookup incluye el [índice real](../../../src/components/greenhouse/primitives/index.ts),
`CompositionShell`, `GreenhouseButton`, `GreenhouseAsyncActionButton`, `GreenhouseChip`,
`GreenhouseInlineValidation` y el Surface System exportado por ese índice.

| Necesidad | Canon reutilizado | Decisión para node:http |
|---|---|---|
| Página enfocada | `CompositionShell`, composición `focused`, receta `settingsFlow` | **Extend** del contrato de composición mediante `IdShell` HTML; región primaria única, sin aside/dock/overlay |
| Secciones y permisos | `OperationalSection`, gramática de filas/listas del Surface System | **Reuse** semántico: headings, `section`, `ul/li` y divisores; sin anidar cards |
| Acciones y pending | `GreenhouseButton`, `GreenhouseAsyncActionButton` | **Extend** mediante botones/formularios nativos con los mismos roles visuales y estados |
| Errores y estado | `GreenhouseInlineValidation`, `GreenhouseChip`, feedback tonal | **Reuse** de tokens y semántica accesible, sin badges inventados |
| Marca | Configuración Efeonce y SVG generado existente | **Reuse** del activo institucional; AXIS es el sistema, no el logo del login |

Los componentes React/MUI no se pueden importar como componentes ejecutables de esta superficie
`node:http`. La adaptación HTML es explícita y limitada al renderer del emisor. No es una primitive
React nueva ni una copia completa del design system. Tokens compartidos se resuelven durante
generación/build; no se carga el theme del portal en cada request.

## Mapping de tokens verificables

Los nombres `--id-*` que pueda producir el generador son aliases del adapter, no una segunda fuente
de valores. Debe verificarse su derivación y que no queden variables `--mui-*` o fuentes de Next
sin resolver en el HTML standalone.

| Uso | Fuente y export reales | Consumo de diseño |
|---|---|---|
| Color de marca y neutrales | [axis-tokens.ts](../../../src/@core/theme/axis-tokens.ts), reexporta `axisTokens`, `axisMain`, `axisNeutral` de `@efeoncepro/axis-tokens`; roles del theme documentados en DESIGN | Core Blue para acción, fondo neutral y paper; texto primario/secundario y divider por rol, sin pegar hex en templates |
| Títulos | [typography-tokens.ts](../../../src/components/theme/typography-tokens.ts), `typographyScale.pageTitle`, `headlineMd` | Poppins reservado a títulos; `surfaceHeroTitle` sólo si se adopta título de página completo, nunca dentro de la tarjeta |
| Formularios y contenido | `typographyScale.bodyLg`, `bodyMd`, `labelMd`, `disclosureText`, `numericId` | Geist para texto y controles; `numericId` sólo donde corresponde, sin monospace |
| Espaciado | [spacing.ts](../../../src/@core/theme/spacing.ts), `spacing(factor)` | Separación de campos `4`, grupos `6`, márgenes compactos `4`; ajustar composición mediante escala, no medidas dispersas |
| Radio | Escala de radios documentada en DESIGN y tokens AXIS | Una misma familia `lg`/`xxl` según rol de control/superficie; resolver miembro exacto en el generador antes de CSS |
| Elevación | [elevation-tokens.ts](../../../src/components/theme/elevation-tokens.ts), `elevationTokens('light').none` | Superficie principal plana con borde discreto; no sombra modal en una página |
| Feedback | [greenhouse-semantic-tokens.ts](../../../src/components/theme/greenhouse-semantic-tokens.ts), `greenhouseSemanticTokens('light')` | `tonalSurface`, `tonalText`, `tonalBorder`; warning/error con ink canónico, no `main` como texto sobre tint |
| Motion | [motion/core/tokens.ts](../../../src/components/greenhouse/motion/core/tokens.ts), `motionCss.duration.short`, `motionCss.ease.standard` | Feedback breve opcional; foco y submit inmediato; reduced-motion elimina transición |
| Marca | [efeonce-brand.ts](../../../src/config/efeonce-brand.ts), [generador existente](../../../scripts/auth-server/generate-brand-assets.ts) | SVG institucional bundleado desde `public/branding/SVG/isotipo-full-efeonce.svg`; no dibujar un sustituto |

El generador existente sólo empaqueta el SVG; **todavía no demuestra generación de CSS ni fuentes**.
La implementación debe ampliar su contrato con drift verificable. No se encontró un directorio
`src/lib/design-tokens/*` que respalde la referencia antigua. Las fuentes deben empaquetarse y
servirse desde el propio origen con assets reales, licencia y contrato de build verificados; no
depender de Google Fonts, `next/font` o una instalación local. Hasta resolverlo, el fallback de
`fontFamilies` conserva legibilidad, pero no acredita fidelidad tipográfica premium.

## Responsive, interacción y motion

El objetivo inicial de revisión es 1440×1000 y 390×844, también con zoom y textos largos. Desktop
mantiene columna de lectura centrada y login más compacto que consent. Mobile prioriza el contenido
desde arriba, con márgenes de escala y acciones de ancho disponible; nunca fija la altura de la
tarjeta. Un consentimiento largo puede requerir scroll: no se ocultan permisos para forzar el fold.

Los controles conservan un tamaño táctil suficiente aunque el texto use la escala canónica. Se
prueban focos visibles, contraste, autocompletado, nombres largos, email largo y ausencia de scroll
horizontal. El DOM mantiene el mismo orden lógico en ambos viewports; no se invierte con CSS para
que el teclado contradiga la lectura. El foco inicial del consentimiento va al título; nunca a
la concesión. Una sola región viva anuncia resultado o error pertinente.

El motion es CSS Tier 1 y no retrasa formularios, anuncios o redirects. Se prefiere entrada estática
para lectura de permisos; si el primer fold justifica una aparición, se limita a opacidad con
`motionCss`, sin desplazamiento ornamental. Pending cambia texto y `aria-busy`; no depende de un
spinner. Con reduced motion no hay transiciones. El error puede crecer lo necesario: no se recorta
a una línea para mantener una geometría ficticia.

## Verificación pendiente y ajustes de continuidad

Antes de implementar el resto de estados, el harness debe mostrar login y consentimiento con datos
ficticios en ambos viewports: cliente y organización largos, varias membresías externas, contexto
interno, scopes de lectura/escritura y permisos extensos. Revisar el primer fold y el final con
acciones, teclado y reduced motion. Después cubrir recuperación, factor, pending, denegación y 429.
Una captura demuestra presentación; el retorno OAuth y la preservación de autoridad requieren
pruebas de recorrido y canary propios. No usar secretos reales como fixtures.

El owner debe sincronizar estos puntos en wireframe/flow/motion antes de readiness:

- Ruta de dirección `docs/ui/visual-directions/…`, no `docs/ui/direction/…`.
- Entrada corporativa explícita y passkey primero dentro del recorrido externo; el runtime actual
  no se describe sólo con el inventario externo histórico.
- Geist para cuerpo/formularios y Poppins para títulos; retirar monospace para identificadores.
- Organización interna exacta frente a membresías externas, con DTO server-side como dependencia.
- Referencias reales de tokens y `motionCss.ease`, sin inventar `src/lib/design-tokens/*`.
- Orden DOM estable en desktop/mobile; errores pueden envolver; no doble norma de contador exacto.
- Separar disponibilidad de flags verificada de defaults históricos: este documento no afirma el
  estado de producción ni añade un flag UI ficticio.

Confianza: alta en la composición y separación de recorridos por sus contratos; pendiente en
proporciones finales, empaquetado tipográfico y comprensión de permisos con datos densos. La
autocrítica principal es que dos entradas en una sola página pueden confundir a una persona con
ambos accesos. La revisión debe comprobar comprensión de las etiquetas antes de añadir controles
o pasos. La dirección es reversible hasta esa revisión y no permite afirmar aprobación visual.
