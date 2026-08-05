# ISSUE-136 — El composer de Globe reconstruía la paleta de comandos en cada tecla, y React cortaba con el error #185

> **Estado:** Resolved
> **Detectado:** 2026-08-03 · **Ambiente:** Globe producción (`globe-studio-internal`, front door `globe.efeoncepro.com`)
> **Severidad:** Media — trabajo desperdiciado en cada pulsación y un error en consola por sesión; la UI seguía respondiendo
> **Repo afectado:** `efeoncepro/efeonce-globe` · **Gobierna:** Greenhouse (EPIC-028)
> **Resuelto:** 2026-08-03 · `efeonce-globe@011d0eb`

## Síntoma

Escribir en el composer del Producer disparaba en consola:

```
Minified React error #185  (Maximum update depth exceeded)
  at onChange (index-DK_2wVDm.js:18:172)
```

**La pantalla seguía funcionando**: el estimate se calculaba, el botón de generar quedaba activo, el texto entraba.
Lo que fallaba estaba debajo — y por eso ninguna verificación visual lo habría encontrado.

## Cómo se encontró, que es parte del hallazgo

No lo encontró un test ni una alerta. Lo encontró **el operador preguntando si alguien había abierto la UI**, después
de cuatro despliegues declarados «verificados en runtime». Esas verificaciones —revisión activa, imagen etiquetada,
logs del worker, dead letter estable— prueban que **el proceso arrancó**, no que **el producto funciona**. Son cosas
distintas y se estaban tratando como una sola.

## Causa

Una cascada de tres eslabones, disparada por cada carácter:

1. `enhance` declaraba `prompt` en sus dependencias, así que **se recreaba en cada tecla**.
2. El efecto que publica la paleta de comandos (⌘K) dependía de `enhance` **y** del texto del prompt, así que
   **reconstruía la lista completa de comandos por carácter**.
3. Ese efecto llama `onCommands(...)`, que en `ProducerWorkspace` **es un `setState`** — o sea un re-render del
   componente padre por cada pulsación.

Escribir una frase encadenaba decenas de actualizaciones y React cortaba al agotar su presupuesto de
actualizaciones anidadas.

## Impacto

- Trabajo desperdiciado proporcional a lo que el usuario escribe, en la superficie más usada del producto.
- Un error por sesión que nadie observaba, y que **enmascaraba cualquier error nuevo** que apareciera después.
- Sin pérdida de datos, sin gasto indebido, sin corrida afectada.

## Solución — `efeonce-globe@011d0eb`

Va a la causa, no al síntoma:

- **`enhance` lee el prompt por `ref`** y deja de declararlo como dependencia. Nada en su cuerpo se re-deriva del
  prompt en tiempo de render: sólo necesita su valor al ejecutarse.
- **El efecto depende de `promptEmpty` (booleano)** en vez del texto. Lo único que cambia la lista de comandos es
  que el prompt cruce de vacío a no vacío — eso altera el `disabledReason` del comando de mejora y nada más.
- **El ref se sincroniza por efecto**, no por asignación durante el render, para no romper el modo concurrente.

## Verificación

**En producción, con el bundle real** (`index-DvpIvZi-.js`, desplegado desde `011d0eb`): se escribió la misma frase
que reproducía el fallo, tecla por tecla, y la consola quedó **sin un solo error**. Con el bundle anterior
(`index-DK_2wVDm.js`) el mismo texto lo producía de forma consistente.

⚠️ **Detalle que casi produce un falso verde, y conviene conocer:** tras el despliegue, el navegador seguía
sirviendo el bundle **anterior** desde su caché del HTML, así que la primera comprobación "post-fix" midió el
código viejo y habría concluido que el arreglo no servía. Lo que lo delató fue **comparar el hash del bundle**, no
mirar la pantalla. Al verificar un fix de front-end, confirmar primero **qué bundle está ejecutando el navegador**.

Y un segundo falso verde en la misma sesión: una comprobación intermedia dio la consola limpia porque el clic no
había enfocado el textarea y **no se escribió nada**. Desde entonces la verificación lee el `value` del campo antes
de creerle a la consola.

## Lo que este issue deja mejor que como lo encontró

**El canary del composer ya escribía en el prompt y aun así no vio nada**, durante todo el tiempo que el defecto
estuvo vivo. Le faltaban las dos mitades, y ambas están ahora en
`apps/studio-client/scripts/producer-composer-browser-canary.mjs`:

1. **Nadie escuchaba la consola.** El error existía en cada sesión real y ningún aserto lo miraba. Ahora el canary
   escucha `pageerror` y `console.error`, y **cualquier** error de consola falla el gate.
2. **Usaba `fill()`**, que setea el valor de una vez. El defecto sólo aparece cuando cada carácter dispara su
   propio ciclo de render, así que ahora escribe con `type()` — y ejercita también el campo «Excluir», que arrastra
   otra cadena de callbacks (`briefFor`).

🔴 **Límite honesto del guard: no está probado en rojo contra este caso.** Se intentó tres veces —con el bug
recompilado, escribiendo en el prompt y en «Excluir»— y el canary pasó en verde igual. Su servidor stubbea los
readers y no arma el estado con el que el defecto se manifestó en producción (gates cargados, feed con piezas,
créditos). Sirve como detección de cualquier error de consola futuro; **no** como reproducción de éste. Cerrar esa
brecha —que el canary monte un estado equivalente al real— queda como trabajo pendiente y honesto.

## Lo que NO es

No es un fallo de datos, ni de gasto, ni del contrato de ruta desplegado ese mismo día. El bundle afectado
(`0418a7d`) es **anterior** a todo el trabajo de `TASK-1633`.

## Relacionado

- `TASK-1552` — dueña del composer; su reescritura debe conservar el guard de consola del canary.
- `TASK-1633` — la sesión que lo destapó, al obligar a abrir el Producer para verificar un despliegue.
- `ISSUE-126` — misma familia de fondo: un estado que divergía y ninguna verificación lo miraba.
