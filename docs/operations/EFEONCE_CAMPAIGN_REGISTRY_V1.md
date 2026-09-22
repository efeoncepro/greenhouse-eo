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
razón registrada; una razón creativa no equivale a evidencia de performance.

## 5. Lo archivado NO es referencia

`Archivo/pre-CMP_2024/` guarda las campañas anteriores a esta convención. **Los agentes no deben tomar de ahí
copy, estructura de brief, nomenclatura ni criterios creativos.** Se conserva por trazabilidad histórica.

⚠️ **Método:** la fecha de modificación en OneDrive **no prueba vigencia** — sincronizar reescribe el mtime.
Una carpeta parecía activa de julio 2026 y estaba muerta desde 2024. **Para saber si algo vive, preguntar.**

## 5b. 🔴 Dónde vive cada cosa — repo vs OneDrive

**Greenhouse es el harness.** El **trabajo gobernado** de una campaña vive en el repo; el **pensamiento y los
assets**, en OneDrive.

| Repo `docs/campaigns/` | OneDrive `2. Campañas/CMP-###_…` |
|---|---|
| **Epics, tasks, mini-tasks, issues** | Brief, conceptos, copy, JTBD |
| 🆕 **CDR — Campaign Decision Record** | Media plan, tracking, índice de assets |

**Regla:** si tiene **lifecycle** y alguien lo ejecuta y lo cierra → **repo**. Si es criterio, narrativa o
entregable → **OneDrive**. 🔴 **Nada se escribe en los dos lados: se referencia.**

### CDR · el ADR de las campañas

| | Cuándo | Dónde |
|---|---|---|
| **ADR** | arquitectura o contrato técnico | `docs/architecture/` |
| **PDR** | producto del sitio público | `docs/public-site/` |
| 🆕 **CDR** | **decisión de UNA campaña**: territorio, canales, presupuesto, ventana, cortes | `docs/campaigns/decisions/` |

🎯 **Cómo se reconoce un CDR:** *si la campaña no existiera, la decisión no tendría sentido.*
⚠️ **Lo transversal NO es CDR.** El sistema de CTA, el contrato de safe zones o las reglas del registro
fotográfico no pertenecen a una campaña: siguen siendo ADR u operations.
🔴 **Los IDs de `TASK-###` e `ISSUE-###` salen del registry global**, no de uno paralelo. Una campaña **es
trabajo del mismo harness**.

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

## 8. Contrato del brief ampliado y templates

El brief es la fuente de criterios de una campaña; el canon técnico de cada disciplina sigue en su skill y
contrato dueño. No duplicar los valores de AXIS, el lenguaje fotográfico o el tracking plan para cambiarlos
localmente. ADR aplicable: [router-first](../architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md);
esta extensión documental usa el registro aceptado, sin cambiar runtime, autonomía ni autoridad de publicación.

Los templates reutilizables se versionan en la skill `digital-marketing` (espejos Claude/Codex):

- [Brief](../../.codex/skills/digital-marketing/templates/campaign-brief.md).
- [Índice de assets](../../.codex/skills/digital-marketing/templates/campaign-assets.md).
- [Ficha por pieza](../../.codex/skills/digital-marketing/templates/campaign-piece.md).

Las copias para uso local viven en OneDrive `Alineación/2. Campañas/_templates/`. Sincronizarlas al cambiar el
modelo; `_templates` no reserva un CMP. Los briefs instanciados se mantienen en su campaña, nunca se regeneran
sobre aportes de otro agente desde el template. Comparar contenido antes de escribir, conservar antecedentes y
resolver conflicto de criterios con evidencia/decisión del operador. `FINAL`, mtime o carpeta Finales no prueban
vigencia, QA ni autorización. La instrucción ya autorizada del operador permite actualizar el brief dentro de
ese alcance; este contrato no añade una reconfirmación por cada edición documental.

### Contenido obligatorio

1. Identidad, versión, estado, responsables, geografía/idioma y alcance; incógnitas explícitas.
2. Objetivo de negocio, KPI/meta/ventana y presupuesto separado de producción; no inventar cifras para llenar campos.
3. JTBD situado, trigger, operador, sponsor y validadores; separar evidencia de hipótesis. El tamaño de empresa
   no determina por sí solo quién decide ni qué dolor tiene.
4. Promesa, prueba, exclusiones, claims con fuente/fecha y condición de vigencia.
5. Journey TOFU/MOFU/BOFU por conocimiento y progreso, con una acción y destino por pieza. No repetir diagnóstico
   obligatoriamente a quien ya lo recibió ni tratar reenvío/CTR como conversión comercial.
6. Canal, plataforma, placement, medio y ratio por separado; especificación vigente por verificar antes de salida.
7. Conceptos/IDs, copy literal de imagen y plataforma, variantes/control, estado y descartes con razón.
8. Recursos canónicos por ruta/vista/hash y permiso de uso, registro visual, reservas, lecho/firma y safe zones.
9. Receta: ficha, prompt íntegro compilado, motor, referencias, ediciones, copy/layout editable, capas, comandos,
   versiones/dependencias, QA y checksum. Un prompt escrito no demuestra generación.
10. Destino exacto, formulario/reserva y tracking realmente verificados; UTM y campos persistidos distinguidos.
11. Métricas con definición/denominador/fuente, guardrails, experimento, umbral y criterio de parada/inconcluso.
12. Fechas separadas de producción/revisión/aprobación/publicación, responsables, permisos y pendientes con criterio de salida.
13. Handoff: índices, decisión vigente, histórico y próxima acción. No borrar aportes previos ni rehacer un aprobado sin encargo.

### Índice de archivos y estados independientes

`ASSETS.md` registra **una fila por export** con ID estable, concepto/versión, fase de uso, canal/placement,
medio/ratio/dimensiones, ruta exacta, evidencia/fecha y estados separados. No renumerar IDs existentes al sumar
filas; los conceptos aún no producidos van en otra tabla. Vincular el paquete de editables/receta/QA sin copiarlo.

Distinguir existencia local, QA, aprobación creativa, derechos, autorización de medios, publicación y resultados.
Inventariar archivos no verifica integridad visual, sincronización remota ni permisos. Un recurso de cliente
accesible/tokenizado no habilita difusión. La aprobación de un recurso para orgánico no se extiende a paid.

### QA de cierre documental

Verificar links/rutas, cobertura real por ratio y estados contradictorios; conservar versiones anteriores con
procedencia. Registrar cantidad verificada, hashes de documentos y límites de comprobación. No certificar runtime
por una task o un brief: una dependencia pendiente sólo se levanta con evidencia de su cierre aplicable.

Caso aplicado: [CMP-001 y continuidad](social/2026-09-22-cmp-001-campaign-brief-handoff.md).
