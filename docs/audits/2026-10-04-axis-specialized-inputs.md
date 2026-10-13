# AXIS: inputs especializados y preparación de Growth Forms

## Estado verificable

- AXIS: `a0c6130` implementa los inputs y el catálogo; `6fff346` sincroniza referencias de assets.
  Ambos subidos a `main`; el readback de `origin/main` confirmó `6fff346`.
- Package: source `@efeoncepro/axis-ui-primitives` **0.5.0**, pendiente de publicación e instalación
  desde registry. La distribución anterior de formularios 0.4.0 conserva su
  [evidencia independiente](2026-10-04-axis-forms-release.md).
- Greenhouse: adaptador de comportamiento preparado, **opt-in y sin activar**. No cambia pins,
  esquema publicado, validación del servidor, CSS de producto ni hosts de formularios.
- CI de AXIS para `6fff346`: [run 37242890378](https://github.com/efeoncepro/axis-design-system/actions/runs/37242890378).
  Estado al iniciar este cierre: en ejecución. No acredita publicación de npm ni adopción de Greenhouse.
- El Lab local se revisó visualmente; el despliegue público de este corte no se certifica aquí.

## Contrato y documentos dueños

[ADR de integración](../architecture/GROWTH_FORMS_AXIS_INPUT_BEHAVIOR_DECISION_V1.md) ·
[contrato de runtime](../architecture/growth-public-forms-runtime-contract.md) ·
[guía funcional](../documentation/creative/axis-packages-y-lab.md) ·
[consumo y distribución](../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md) ·
[manual de composición](../manual-de-uso/creative/descubrir-y-componer-con-axis.md).

AXIS posee los resolvers portables, binder DOM y composiciones React. El producto conserva reglas de
negocio y autoridad de validación. `display` editable y `value` canónico son distintos; no truncar ni
convertir entradas rechazadas en valores válidos. Email conserva alias/mayúsculas sin máscara rígida;
RUT sólo formatea y decimal usa strings exactos. IME, reset y estados disabled/readOnly tienen contrato.

El Lab consume los **245 países y territorios de la metadata instalada** mediante
`phoneCountryOptions('es')`. El helper acepta lista permitida explícita y `countrySearch` habilita
búsqueda en PhoneField por nombre/prefijo. Growth Forms mantiene 18 entradas de selector de prefijo;
no son una restricción exhaustiva de números internacionales explícitos. El catálogo de AXIS no amplía
el de Growth Forms automáticamente. El layout alinea país/teléfono, correo/web y RUT/importe por filas,
con una columna en móvil.

## Evidencia proporcional

| Verificación | Resultado y alcance |
| --- | --- |
| AXIS source limpio | Build, typecheck, tests, design:check y agent:check PASS desde copia del commit; Lab 169/169 |
| Primitives | 33/33; catálogo, formatos, valores exactos, SSR y casos rechazados |
| Inputs en navegador | 24/24 en Chrome, Firefox, WebKit y WebKit móvil emulado: teclado, búsquedas, envío, reset, IME, axe y geometría 696/1280/390 px |
| Matriz anterior de forms | 164/164 antes de ampliar catálogo; registro histórico, no nuevo conteo del último corte |
| Greenhouse | Suite renderer 80/80 y proof local contra exports compilados AXIS; sin llamadas reales de envío |
| QA visual | Capturas de escritorio y 390 px revisadas; no equivale a certificación manual de lector de pantalla ni dispositivo real |

La copia limpia detectó dos referencias del Lab en 0.4.18 frente al package de assets 0.4.19 de un
commit previo. `6fff346` alineó las referencias; el re-test de las 169 pruebas del Lab pasó.
La verificación reproducible del puente es:

```sh
node scripts/verify-growth-axis-inputs.mjs /ruta/absoluta/axis-design-system
```

El script requiere AXIS compilado, utiliza una fixture local y no cambia pins ni persiste envíos.
Los logs temporales son auxiliares; comandos, commits y suites versionadas son la evidencia reproducible.

## Próximo paso y límites

Owner: mantenedor de AXIS para publicar y verificar la versión exacta; mantenedor de Growth Forms para
seleccionar un host piloto y revisar catálogo, payload, validación y accesibilidad con esa versión.
No habilitar el adapter por inferencia desde esta actualización documental. Publicar npm, desplegar Lab,
activar consumidor y comprobar el host son verificaciones separadas.

## Cierre documental

Tres subagentes revisaron por separado las guías AXIS, los documentos de integración Greenhouse y las
skills. Se actualizaron el ADR, el contrato runtime, guía funcional, manual, runbook y referencias de
agentes. `axis-design-system/references/ui-primitives.md` y `greenhouse-growth-forms/SKILL.md` conservan
paridad byte a byte entre Codex y Claude. AGENTS.md/CLAUDE.md ya enrutan AXIS y Growth Forms a estas
fuentes: no requieren otro bloque de instrucciones. No se modificaron docs ajenos ni se promovió
ninguna task a complete por esta actualización.
