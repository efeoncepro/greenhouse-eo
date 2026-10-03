# Revisar una edición de Efeonce Insights antes de compartirla

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-10-03 por Claude (TASK-1974 / TASK-1975)
> **Ultima actualizacion:** 2026-10-03 por Claude (1.1: en producción desde el release `36a73e7b7e19`; GA4 en la vista previa local y la parte de dona «<1 %»)
> **Documentacion tecnica:** [EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md](../../architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md) · [EFEONCE_INSIGHTS_ARCHITECTURE_V1.md](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md) · [dossier de revisión TASK-1975](../../ui/reviews/TASK-1975-efeonce-insights-new-figure-pages/README.md)

> **Estado (2026-10-03): en producción** (release `36a73e7b7e19`). Las figuras de este manual (cifras, cascada, waffle,
> dona y barras apiladas en el PDF y el deck, y la tarjeta animada de la web) salen en toda edición nueva. Las ediciones
> creadas antes del release conservan sus figuras.
>
> **Dona y apiladas de GA4 en la vista previa local:** el lector de GA4 responde `disabled` salvo que corra con
> `GROWTH_GA4_ENABLED=true` y las credenciales OAuth de GA4 (`GOOGLE_GA4_OAUTH_CLIENT_ID`,
> `GOOGLE_GA4_OAUTH_CLIENT_SECRET_SECRET_REF`). Sin ellas esas dos figuras no aparecen en la vista previa; no es un
> defecto de la edición. Una parte de la dona con valor que redondea a 0 % se lee «<1 %», nunca «0 %».

## Para qué sirve

Para que la persona que revisa una edición mire el PDF y el deck **antes de compartirlos o emitirlos** y confirme que
cada figura cuenta bien su dato. Sirve con la edición en `ready_for_review` o con una vista previa local de esa misma
ventana. Revisar no emite ni comparte nada.

## Antes de empezar

1. Ten la edición identificada: su número (`EO-INS-…`), su id interno (`insed-…`) y la organización (`org-…`).
2. Para la vista previa local necesitas el proxy de Cloud SQL arriba (`pnpm pg:connect`) y el árbol de trabajo con el
   código que vas a revisar. La vista previa lee datos reales en sólo lectura; la única escritura es la bitácora de
   acceso al logo del cliente.
3. Ten a mano el criterio en una frase: **cada figura responde una pregunta, un dato no sale dos veces y la variedad
   sólo desempata.** El detalle está en la documentación funcional,
   [«Cómo elige el informe sus gráficos»](../../documentation/insights/efeonce-insights-dominio-ediciones.md).

## Paso a paso

### 1. Correr la vista previa real

```bash
pnpm pg:connect
GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false \
  pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/insights/preview-edition.ts \
  --edition=insed-... --org=org-... --output=both --editorial-v2
```

- Deja el informe A4 y el deck en `.captures/insights-preview/<EO-INS-…>-report_pdf/` y `…-deck_pdf/`: el PDF completo
  y cada página como PDF y PNG.
- `--plan-only` imprime las figuras, sus lecturas y las esenciales sin componer: útil para ver el orden del capítulo.
- `--start=YYYY-MM-DD --end-exclusive=YYYY-MM-DD` cambia la ventana. Sin eso, usa la de la edición.
- Recolecta la evidencia de nuevo con el código actual: muestra lo que produciría una edición **nueva o revisada**,
  no el plan ya sellado.
- `--ai-authoring` llama a Gemini y tiene costo: úsalo sólo con autorización del operador.

Abre el PDF completo y además mira las páginas una por una a tamaño real. Si una página quedó de una corrida anterior
(la carpeta no se limpia sola), fíjate en el número de páginas del PDF, no en la cantidad de imágenes.

### 2. Revisar la página de cifras

Cada capítulo abre con su página de cifras (hasta 6 por página).

- **El nombre de cada cifra se lee de un vistazo** (3 palabras o menos).
- **La variación tiene el tono correcto:** verde si el cambio es mejor, rojo si es peor, gris si la métrica no tiene
  dirección declarada o no cambió. En la posición media o las rondas de revisión, bajar es bueno: debe decir «Menor es
  mejor» y la baja ir en verde.
- **«vs …» trae el valor anterior y su período** («vs 16.390 en agosto de 2026»).
- **Sin período anterior** dice «Primer período medido», sin variación. **Sin dato** dice «—» y «Sin dato en …», nunca 0.
- **«Estimado»** aparece sólo en cifras estimadas, como el tráfico estimado.
- **Ninguna cifra se repite** en la conclusión de la página ni en otra figura del capítulo.

### 3. Revisar cada figura nueva

| Figura | Qué mirar |
|---|---|
| **Cascada** | Que vaya del valor anterior al actual y que cada paso tenga su signo. Suma mental: anterior + aportes = actual. La leyenda sólo nombra lo que aparece (si nada suma, no dice «Sumó»). La frase dice qué consulta aportó más al cambio |
| **Waffle** | Que cada cuadro sea una unidad y que la nota diga el total («Cada cuadro es una unidad; el total es 8»). De 2 a 4 partes. La conclusión debe decir lo mismo que se cuenta |
| **Dona** | 2 o 3 partes, cada una con su cuenta y su porcentaje. Si el total ya tiene su cifra en el capítulo, el centro muestra la participación de la parte principal; si no, el total |
| **Barras apiladas** | Que cada barra sea un período, que la parte base vaya abajo y que el total sea la suma de las partes. La nota de cambio de la parte base debe tener el tono correcto |
| **Metas (bullets)** | Una sola figura con todas las metas del capítulo. En las métricas donde menos es mejor (rondas de revisión), la variación no debe mostrar «▲» como si subir fuera bueno |
| **Barras de composición** | Ordenadas de mayor a menor, con «Sin clasificar» al final |

En el deck (fondo azul marino) la variación no lleva píldora: el tono va sólo en el triángulo. En el A4 va en una
píldora teñida. Las dos son correctas.

### 4. Revisar el capítulo completo

- **Orden:** cifras → metas → evolución → explicación → composición → comparación. El que no aplica se salta, pero el
  orden no se invierte.
- **Un dato, una figura:** si una métrica tiene meta, sale sólo en las metas, no también como cifra o en barras contra
  el mes anterior. La única repetición permitida son los totales de una cascada.
- **Mira también en gris.** El informe se imprime: ningún dato debe distinguirse sólo por color.

### 5. Revisar la web (si la edición tiene enlace)

En la página web la tarjeta de cifra anima: la cifra recorre del valor anterior al actual y después la variación toma
su tono. Confirma que el número final y «vs …» coinciden con el PDF. Con «reducir movimiento» activado la cifra debe
aparecer quieta, ya en su valor final. El waffle de la web también es de un cuadro por unidad.

## Qué significan los estados

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| El script termina y deja PDF | Todas las figuras tienen página o quedaron contadas en palabras | Revisa las páginas |
| `La cascada … no cuadra: {anterior} {aportes} ≠ {actual}.` | Los aportes no suman el cambio entre el valor anterior y el actual. La figura mentiría sobre el cambio | No compartas. La causa está en los datos o en cómo el plan arma los pasos; avisa a quien mantiene el planificador con el mensaje completo |
| `La cifra «…» de … tiene un nombre de N palabras y M caracteres: el máximo es 3 y 24.` | El nombre de una cifra es demasiado largo para la tarjeta | No se recorta: el nombre se corrige en el plan o en el registro de la métrica |
| `El waffle … no suma su total: las partes dan … y el total medido es ….` | Las partes de un waffle no cuadran con el total medido | Igual que la cascada: no compartas y reporta el mensaje |
| `La figura … no tiene página: …` | La figura no tiene la forma que su página exige (por ejemplo, una dona con más de una serie) | Reporta el mensaje; no edites la plantilla para esconderlo |
| Una figura esperada no aparece y el capítulo la cuenta en palabras | La figura quedó fuera de sus límites: más partes que su capacidad (más de 4 en el waffle, más de 3 en la dona, más de 4 segmentos en las apiladas), un conteo de más de 100 unidades o datos insuficientes | No es un error de render. Confirma que la frase y la tabla dicen el dato; si la figura debía salir, revisa los datos de origen |
| Variación en gris | La métrica no declara si más es mejor (por ejemplo, las piezas entregadas) o no cambió | Esperado. Si crees que esa métrica sí tiene dirección, pídelo: se declara una vez para todas las figuras |

## Qué no hacer

- **No compartas ni emitas** una edición cuya vista previa se rechazó o con una figura que no puedes explicar en una
  frase.
- **No recortes nombres ni textos** para que quepan: el rechazo existe para que la corrección vaya en el plan.
- **No edites el PDF, el plan ni la plantilla a mano** para esconder una cascada que no cuadra o un dato repetido.
- **No cambies una figura por otra sólo para variar.**
- **No prometas a un cliente** las figuras nuevas en producción hasta que salgan en el release.
- **No uses `--ai-authoring`** sin autorización del operador (llama a Gemini y tiene costo).

## Problemas comunes

| Problema | Causa | Solución |
|---|---|---|
| La vista previa no conecta a la base | El proxy no está arriba o falta el entorno | Corre `pnpm pg:connect` y pasa las tres variables `GREENHOUSE_POSTGRES_*` del comando |
| La dona de fuentes de IA o las barras apiladas de visitas no aparecen en local | Vienen de GA4, que no corre en local | Esperado. Se verifican en staging con datos reales; en local sólo están probadas con datos de ejemplo |
| La carpeta tiene más imágenes que páginas | Quedaron imágenes de una corrida anterior | Cuenta las páginas del PDF completo; las imágenes con fecha anterior no son de esta corrida |
| La edición en producción no tiene cifras ni cascada en el PDF | Producción sigue con la versión anterior hasta el release | Esperado mientras el rollout esté pendiente |
| «Lo que significa» o el título de una figura repite la conclusión del capítulo | El plan no trajo lectura propia para esa figura | Repórtalo con el número de página; la cascada y las figuras nuevas deben traer su propia lectura |

## Referencias técnicas

- Criterio de selección: [`EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md`](../../architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md).
- Reglas de cada página y mensajes de rechazo: `src/lib/efeonce-insights/render/figure-slots.ts`.
- Lo que imprime cada cifra (variación, «vs», «Primer período medido»): `src/lib/efeonce-insights/presentation/stat-card.ts`.
- Dirección de cada métrica y tono: `METRIC_DIRECTIONS` y `changeToneOf` en
  `src/lib/efeonce-insights/editorial/figure-selection.ts`.
- Vista previa local: `scripts/insights/preview-edition.ts`.
- Motion de la tarjeta web: [`TASK-1975-efeonce-insights-stat-card-motion.md`](../../ui/motion/TASK-1975-efeonce-insights-stat-card-motion.md).
- Dossier de revisión con la fidelidad por hoja: [`TASK-1975-efeonce-insights-new-figure-pages/README.md`](../../ui/reviews/TASK-1975-efeonce-insights-new-figure-pages/README.md).
- Manual de operación por API y MCP: [`operar-efeonce-insights-api-mcp.md`](operar-efeonce-insights-api-mcp.md).
