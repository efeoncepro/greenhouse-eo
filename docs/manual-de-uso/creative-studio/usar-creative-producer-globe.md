# Usar Efeonce Globe Creative Producer

> Estado actual: rollout interno pendiente. Este manual describe la experiencia aprobada que quedará disponible en
> `https://globe.efeoncepro.com/producer` para personas con grants Producer.

## Crear un activo

1. Confirma el workspace/proyecto visible en la cabecera.
2. Elige `Imagen`, `Video` o `Audio`.
3. Escribe el prompt y, si corresponde, agrega referencias privadas. Una referencia no queda utilizable hasta que
   su ingest y derechos estén listos.
4. Selecciona modo, preset, ruta/modelo y shape. En Video, `Editar` requiere un asset fuente elegible.
5. Si necesitas reproducibilidad, bloquea la seed y ajusta su valor o usa reroll. Agrega un negative prompt sólo
   como restricción creativa; no incluyas secretos ni instrucciones de proveedor.
6. Define un límite máximo de créditos y selecciona `Calcular costo`.
7. Revisa costo, restricciones y vigencia del estimate. `Generar` se habilita sólo con una cotización vigente;
   cambiar prompt, shape, seed o negative prompt obliga a calcular nuevamente.
8. Sigue el estado durable en la biblioteca. Cerrar el browser no cancela el run.

El halo azul del composer responde al hover/puntero y al foco; al activar un modo de edición permanece encendido para
indicar que el composer está condicionado por un asset fuente. Con `prefers-reduced-motion` conserva la señal de
color/borde sin persecución espacial ni animación.

## Explorar y continuar

- Abre un candidato para ver modelo/versión, recipe efectiva, costo, lineage, provenance y review.
- `Recrear` reutiliza la recipe gobernada; `Variación` crea hijos explícitos; `Inpaint` exige máscara e intención.
- Favoritos, collections y selección batch son durables. Un toast no sustituye el resultado persistido.
- Usa `J/K` para navegar, `Enter` para abrir, `F` para favorito, `R` para recrear, `G` para ir al prompt y `⌘/Ctrl+K`
  para la paleta. Todos los dialogs restauran el foco al cerrar.

## Revisar y compartir

Comentarios, aprobación y solicitud de cambios se aplican a una versión exacta. Sharing crea una vista read-only,
expirable y revocable; el token no aparece en query strings ni logs. No entregues un asset marcado
`internal-evaluation-only` o `no-client-delivery`.

## Estados que no deben confundirse

- `policy-blocked`: la capability existe, pero no está habilitada para esta superficie/persona.
- Modo deshabilitado: el workspace no tiene autoridad de assets/provenance confirmada; no intentes eludirlo con
  otra ruta o un identificador externo.
- `dependency_unavailable`: una dependencia real no respondió; reintentar puede ser válido.
- `quarantined` / governance pendiente: los bytes existen, pero todavía no son elegibles.
- `candidate_ready`: la generación terminó y el output fue retenido; no implica aprobación humana ni derechos
  irrestrictos.
- `degraded`: una proyección secundaria falló; consulta el detalle antes de operar.

Ante un error, conserva el correlation ID y no repitas un command de gasto si la respuesta fue ambigua: consulta
primero el reader del experimento.
