# AXIS: color, compactos y formularios — distribución del 4 de octubre

## Estado de distribución

**Publicado e instalado desde GitHub Packages.** Source final
`df2de617a9a2033049c5a889f487e970de85a345`, tag `v0.7.2`;
[release `37239150937`](https://github.com/efeoncepro/axis-design-system/actions/runs/37239150937) **SUCCESS**.
El [CI general `37239148653`](https://github.com/efeoncepro/axis-design-system/actions/runs/37239148653)
también finalizó **SUCCESS** para el mismo corte; publicación y CI se verificaron por separado.
El operador autorizó push, envío a packages y actualización documental con subagentes.

| Package | Versión publicada | Publicación UTC, verificada en registry (2026-10-04) |
| --- | --- | --- |
| `@efeoncepro/axis-tokens` | `0.5.0` | `22:25:14Z` |
| `@efeoncepro/axis-ui-contracts` | `0.6.0` | `22:25:17Z` |
| `@efeoncepro/axis-ui-registry` | `0.7.2` | `22:25:20Z` |
| `@efeoncepro/axis-ui-primitives` | `0.4.0` | `22:25:23Z` |

Instalaciones privadas nuevas **PASS** sin React, con React `18.3.1` y con React `19.2.7`.
Verificados: entrada HTML/CSS, forms.css, diez builders, exports React/SSR, 52 capacidades y `/evidence`.
Log local: `/tmp/axis-published-verify.log`. Evidencia de instalación:
`/var/folders/cc/vqgjwxy57bbb49rp6ncvrtt80000gn/T/axis-published-forms-t0rdcr7m`.
No se cambian pins, temas, adapters ni runtime de consumidores en este trabajo.

### Intentos anteriores y correcciones

- Source inicial `3299032`, tag `v0.7.0`: [run `37238026404`](https://github.com/efeoncepro/axis-design-system/actions/runs/37238026404) falló **antes de publicar**. Compactos 19/20; reflow al 400% del chip removible en WebKit móvil/Linux. La contención también se reprodujo mediante medición de ancho en macOS.
- Corrección `bb015a3cf63da5d62562dc86ca01acfa70bdd360`: wrapping de chip, grid y gutters del Lab al 400%. Compactos 20/20 en cuatro perfiles, primitives 26/26 y typecheck sin errores.
- CI del source `3299032`: formularios 59/64, cinco timeouts y ninguna aserción funcional fallida. Las matrices de doce contextos y diez rutas compartían treinta segundos.
- Reintento `v0.7.1`: [release `37238826440`](https://github.com/efeoncepro/axis-design-system/actions/runs/37238826440) y [CI `37238823807`](https://github.com/efeoncepro/axis-design-system/actions/runs/37238823807) cancelados antes de publicar para corregir la estructura de pruebas.
- Source final: cada contexto/ruta tiene caso y timeout propios de treinta segundos. Misma cobertura, 148 casos; **148/148 locales PASS**, Lab typecheck sin errores ni warnings. Registry subió a `0.7.2`; tokens/contracts/primitives conservaron versión porque los intentos anteriores no publicaron.

## Alcance

La órbita gobierna roles y ramps de identidad. Se preservan exports legados y la migración Greenhouse
queda planificada, con adapter semántico y rollout separados. Botones, siete componentes compactos
(badges/chips) y diez familias de formularios consumen tokens compartidos. Las APIs HTML/CSS no requieren
React; los adapters React son opcionales. CSS portable: button.css, compact.css y forms.css.

Formularios: Field, Input, Textarea, Checkbox, RadioGroup, Switch, CheckboxGroup, Select, Combobox y
NumberField; los diez contratos permanecen candidate. Composición con FormProvider/FieldRoot, feedback,
SearchField, PasswordField y FormErrorSummary. Select enriquecido con opciones descriptivas, marca de
selección, teclado/typeahead, popover compartido con Combobox y bridge de formulario nativo. NativeSelect
y selectHtml conservan picker de plataforma. Los configuradores del Lab consumen el mismo Select.
Foco continuo único en campos e iconos mail/folder de apoyo, sin sustituir etiquetas visibles.

## Evidencia local registrada en AXIS

Fuente: [matriz de calidad de formularios en el commit](https://github.com/efeoncepro/axis-design-system/blob/3299032/docs/quality/forms.md).
No se confunde esa evidencia local con CI o publicación remota.

| Validación | Evidencia registrada |
| --- | --- |
| Build, typecheck, tests, design:check | PASS; agent:check 4/4 |
| Primitives / Lab unit | 26/26 / 169/169 |
| Recorridos de formulario | 64/64, Chromium, Firefox, WebKit y WebKit móvil emulado |
| Comparación visual | 8/8 contra 28 baselines macOS revisadas |
| Tarballs de la base anterior | Diez builders HTML + forms.css sin React; SSR React 18.3.1 y 19.2.7 |
| Regresiones anteriores de la base | Botones 60/60; tipografía 160/160; no repetidas por el cambio posterior exclusivo de dropdowns |

CI y release preflight incluyen recorridos/interacción/accesibilidad. Los baselines visuales macOS no se
copian como si fueran Linux: revisión de baselines Linux pendiente antes de activar ese gate en Ubuntu CI.

## Verificación pública del Lab

Vercel confirmó SUCCESS para el source publicado. Field y Select tuvieron readback público.
La ruta [Select en producción](https://axis.efeonce.org/patterns/efeonce.select/) fue comprobada con menú
abierto, descripciones y opción deshabilitada. Captura local de evidencia:
`/Users/jreye/.codex/visualizations/2026/10/04/01a106b0-b68d-7000-90e4-0bf151088a00/axis/select-production.png`.
El despliegue del Lab no confirma publicación de packages ni actualización de consumidores.

## Pendientes y ownership

- Owner release AXIS: CI general y release verificados en SUCCESS; publicación, registry, instalaciones
  privadas y Lab confirmados. Los pendientes siguientes pertenecen a cada consumidor.
- Owner de cada producto: fijar versiones compatibles y verificar adapter, modal/focus, validación real,
  persistencia, retry, autofill/password managers y rollback antes de adopción.
- QA consumidor: VoiceOver/NVDA, dispositivo táctil físico/teclado virtual y zoom nativo. Emulación móvil
  y axe no certifican por sí solos accesibilidad total.
- Date/file y combobox multiselección permanecen fuera de esta entrega.

## Continuidad documental

[Runbook de consumo y rollback](../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md),
[arquitectura compartida](../architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md),
[funcionamiento](../documentation/creative/axis-packages-y-lab.md) y
[manual de uso](../manual-de-uso/creative/descubrir-y-componer-con-axis.md).
Las skills espejo Codex/Claude se sincronizan con las mismas fronteras de distribución y adopción.
