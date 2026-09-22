# Registro de campañas — dónde vive el pensamiento de una campaña

> **Estado:** `Accepted` · **2026-09-22** · decisión del operador.
> **Ubicación:** OneDrive `Alineación/2. Campañas/`

## 1. La separación que evita el desorden

> **La carpeta de campaña guarda el PENSAMIENTO. La carpeta de canal guarda el ASSET.**

| Qué | Dónde |
|---|---|
| Brief, conceptos, JTBD, copy, medición, decisiones | `2. Campañas/CMP-###_nombre/` |
| **Piezas de paid media** | `5. Contenidos/15. Paid Media/{01. Recursos, 02. Pilotos, 03. Finales}` |
| **Piezas orgánicas** | `5. Contenidos/{02. Grilla, Trendjacking, Seasonalities, 06. Blog Content…}` |

🔴 **Un asset vive UNA sola vez, en la carpeta de su canal.** La campaña lo referencia por ruta en su
`ASSETS.md`. **Copiarlo garantiza dos versiones y ninguna certeza de cuál se publicó.**

## 2. Codificación

`CMP-###_nombre-corto-en-kebab` — correlativo, **nunca se reutiliza** aunque la campaña se descarte, igual
que `TASK-###`. **Reservar el código y registrar su fila en el overview es UN solo paso**: un código
reservado y no registrado es como nacen dos campañas con el mismo número.

## 3. Estados

`borrador` → `aprobada` → `en vuelo` → `pausada` → `cerrada` · `descartada`

🔴 **`aprobada` ≠ autorizada a pautar.** Creatividad aprobada y permisos de medios son cosas distintas: una
pieza con mascota de partner puede estar aprobada y **no poder pautarse** hasta validar guías de marca de
terceros. *(Orgánico aprobado no es pauta.)*

## 4. Estructura obligatoria

```
CMP-###_nombre/
├── BRIEF.md       ← sin brief no hay campaña
├── ASSETS.md      ← índice: qué existe, DÓNDE y en qué estado
├── conceptos/     ← dirección creativa, JTBD, copy
├── medicion/      ← KPIs, UTMs, resultados
└── decisiones/    ← qué se descartó y POR QUÉ
```

🎯 **`decisiones/` no es opcional y es lo que más se ahorra:** un concepto rechazado **sin su razón** se
vuelve a proponer en tres semanas y se vuelve a pagar. En `CMP-001` hay ocho territorios descartados con su
causa medida.

## 5. Lo archivado NO es referencia

`Archivo/pre-CMP_2024/` guarda las campañas anteriores a esta convención. **Los agentes no deben tomar de ahí
copy, estructura de brief, nomenclatura ni criterios creativos.** Se conserva por trazabilidad histórica.

⚠️ **Método:** la fecha de modificación en OneDrive **no prueba vigencia** — sincronizar reescribe el mtime.
Una carpeta parecía activa de julio 2026 y estaba muerta desde 2024. **Para saber si algo vive, preguntar.**

## 6. 🔴 El brief es la fuente única de criterios — para TODOS los canales

> **Antes de producir una pieza para cualquier canal, lee el `BRIEF.md` de su campaña.**
> No es burocracia: es lo único que impide que cinco agentes produzcan cinco campañas distintas con el
> mismo nombre.

Una campaña se ejecuta entre **varios agentes, varios canales y varias sesiones**. Sin una fuente única,
cada uno reconstruye la promesa desde su propia lectura y el resultado **diverge sin que nadie lo note**:
el ad promete una cosa, el post otra, el correo una tercera, y el prospecto los recibe todos.

**Lo que el brief gobierna, y ningún agente decide por su cuenta:**

| Qué | Por qué no se improvisa |
|---|---|
| **La promesa** | un canal que promete más que otro rompe la confianza en el que prometió menos |
| 🔴 **Lo que NO se promete** | la lista de prohibiciones es lo que protege legal y comercialmente. **Es innegociable** |
| **La audiencia y su job** | no un demográfico: el progreso que intenta lograr. Define el tono entero |
| **El lenguaje** | qué palabras se usan y cuáles no *(p. ej.: vocabulario de categoría fuera del ad, dentro de la landing)* |
| **Los destinos** | y cuáles están bloqueados |
| **La medición** | incluido el **guardrail**, sin el cual se apagan piezas que funcionan |
| **Los límites de uso** | derechos, mascotas de partner, autorizaciones pendientes |

### Sumar una pieza a un canal

1. **Lee el `BRIEF.md`.** Si tu pieza necesita una promesa que no está ahí, **el brief se actualiza primero**
   —con el operador—, no se improvisa en la pieza.
2. **Produce en la carpeta de tu canal**, nunca en la de campaña.
3. **Registra la fila en `ASSETS.md`**: concepto, canal, formato, ruta, estado, fecha.
4. **Si descartas un concepto, escribe la razón en `decisiones/`.**

🎯 **Coherencia de lenguaje entre canales.** El mismo concepto cambia de forma según el canal —un ad no es un
post ni un correo— pero **la promesa, las prohibiciones y el vocabulario son los mismos en todos**. Si un
canal necesita decirlo distinto, eso es una decisión de campaña y va al brief; no es una licencia local.

⚠️ **Un brief puede crecer con aportes de varios agentes** (investigación, medición, canal). Eso es esperado y
bueno: **lo que no puede pasar es que un agente produzca contra una versión del brief que ya cambió.**
Antes de producir, léelo de nuevo — no de memoria.

## 7. Para agentes
1. Antes de crear una campaña, **lee el overview**: puede existir y estar `pausada`.
2. **Nunca copies un asset** a la carpeta de campaña. Referencia su ruta.
3. Los territorios descartados van a `decisiones/` **con su razón**.
4. Al cerrar, escribe la lectura **aunque haya ido mal** — sobre todo si fue mal.
