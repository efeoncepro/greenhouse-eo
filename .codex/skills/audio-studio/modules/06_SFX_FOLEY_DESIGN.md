# 06 — SFX + Foley + diseño de sonido (layering · generativo · UI)

> **Cárgalo cuando** tengas que diseñar **efectos de sonido (SFX)**, hacer **foley**, poblar
> **ambiences/atmósferas**, crear **transiciones/whooshes/impacts/stingers**, o **SFX de
> UI/producto**. Es el craft de **construir sonidos que no existen** (o que suenan mejor
> construidos que grabados). Cierra con `templates/sfx-list.md`.

> **La idea raíz:** un SFX pro casi nunca es **un** sonido — es **capas** (layering). Un
> "impacto" convincente es sub-grave + cuerpo + transiente + cola. Sabes diseñar sonido cuando
> piensas en **capas y en la envolvente**, no en buscar "el archivo del golpe".

---

## 1. Qué hace bueno a un SFX

Un buen efecto es **creíble, legible y del tamaño correcto** para su rol en la mezcla.

| Atributo | Qué significa |
|---|---|
| **Creíble** | Coincide con lo que ve/imagina el oído; física plausible (una puerta pesada no suena liviana) |
| **Legible** | Se entiende qué es aún dentro de una mezcla densa; ocupa su rango de frecuencia |
| **Del tamaño justo** | Ni tapa el diálogo/música ni desaparece; su peso encaja con su importancia narrativa |
| **Con envolvente clara** | Attack / decay / sustain / release definidos — el *transiente* es lo que da el "punch" |
| **Colocado en el estéreo** | Paneo y profundidad (reverb/delay) que ubican el sonido en el espacio |

**Piensa en la ADSR del efecto:** el **attack** (transiente) da el impacto; el **release/cola**
da el tamaño y el espacio. La mayoría de los SFX débiles fallan en el transiente (sin punch) o en
la cola (sin cuerpo).

## 2. Layering (capas) — el corazón del diseño

Un efecto convincente se **construye** apilando capas que cubren rangos y funciones distintas.

**Anatomía de un impact (ejemplo):**

| Capa | Aporta | Rango típico |
|---|---|---|
| **Sub / boom** | El peso, el "en el pecho" | 30–80 Hz |
| **Cuerpo** | El material (madera, metal, carne) | 100–800 Hz |
| **Transiente / crack** | El punch, la definición del ataque | 2–6 kHz |
| **Cola / reverb** | El tamaño del espacio, la resolución | full-range con decaimiento |
| **Detalle / "sweetener"** | Textura que lo hace único (un ruido, un chispazo) | agudos/aire |

**Reglas de layering:** cada capa ocupa un **rango distinto** (EQ para que no se enmascaren);
alinea los **transientes** de las capas percusivas; controla la **fase** al sumar sub-graves;
menos capas bien elegidas > muchas capas barrosas.

## 3. Origen del sonido: síntesis vs grabación vs librería

| Fuente | Fuerte en | Cuándo |
|---|---|---|
| **Síntesis** | Sonidos irreales/diseñados (sci-fi, UI, whooshes, drones), control total | Cuando no existe en el mundo o quieres control absoluto del timbre |
| **Grabación / foley** | Realismo, textura orgánica, sincronía a la acción | Cuando la credibilidad orgánica manda (pasos, ropa, objetos) |
| **Librería** | Velocidad, cobertura amplia, calidad probada | Cuando necesitas ya un sonido común y la licencia es conocida |
| **SFX generativo IA** | Prototipado y sonidos a-brief rápidos (ver §5) | Iterar rápido, poblar, o cuando describir es más fácil que buscar |

**En la práctica se combinan:** un buen "portazo cinematográfico" puede ser una grabación real
(cuerpo) + un sub sintetizado (peso) + un sweetener de librería (detalle). El origen es medio, no
dogma.

## 4. Foley — sonido hecho a mano

**Foley** es la recreación de sonidos cotidianos **interpretados en sincronía** con la acción:
sonidos de **cuerpo** (pasos, ropa, manos), de **objetos** (props que se manipulan) y de
**ambiente/específicos** (una taza, una llave, una puerta). Se hace a mano porque una performance
foley suena **más viva y sincronizada** que un archivo pegado.

| Categoría foley | Ejemplos |
|---|---|
| **Feet (pasos)** | Superficie + calzado + peso + ritmo de la caminata |
| **Cloth (ropa)** | Roce de tela al mover el cuerpo, chaquetas, telas pesadas/livianas |
| **Props (objetos)** | Tazas, llaves, papeles, teclados, puertas, monedas |
| **Specifics** | El sonido exacto que la escena pide y no hay en librería |

**Técnica:** interpreta en tiempo real mirando la acción; elige materiales que **suenen** como lo
que representan aunque no lo sean (clásico: apio para huesos rotos); graba de cerca, en seco, y le
das espacio en la mezcla. El foley da la **capa orgánica** que ni la síntesis ni la IA replican
del todo.

## 5. SFX generativo con IA

| Herramienta | Fuerte en | Nota |
|---|---|---|
| **ElevenLabs SFX** | Generar SFX a partir de una descripción de texto; iterar variaciones rápido | Ideal para prototipar, poblar, o sonidos a-brief *(as-of 2026-07 — reverificar)* |
| **Seed Audio 1.0** (ByteDance) | **SFX + música + diálogo en una pasada** | Cuando necesitas el paquete completo de audio junto *(as-of 2026-07 — reverificar)* |

**Cómo dirigir un prompt de SFX:** describe **material + acción + tamaño + espacio**. No "un
golpe", sino "impacto grave de metal pesado sobre concreto, en un espacio grande con cola de
reverb, transiente marcado". Pide **varias tomas** y **cura + capa**: la IA da la materia prima; tú
la **layerizas, editas y sincronizas** (§2, §8). Verifica la **licencia** del audio generado antes
de usarlo en algo comercial (`SOURCES.md`).

## 6. Librerías — cómo elegir y licenciar

**Cómo elegir un archivo de librería:**
- [ ] **Calidad de grabación** — sin ruido de fondo, buena resolución (48 kHz/24-bit idealmente).
- [ ] **En seco** (dry) — sin reverb horneado, para poder ubicarlo tú en el espacio.
- [ ] **Aislado** — un solo elemento, no una mezcla que no puedas separar.
- [ ] **Variaciones** — que haya varias tomas para no repetir el mismo archivo (fatiga de repetición).
- [ ] **Licencia clara** — royalty-free ≠ libre de derechos; lee el alcance (comercial, broadcast,
      cliente, redistribución). Documenta la licencia por asset.

> **Regla de licencia (igual de dura que en música).** Todo SFX en un entregable comercial/cliente
> necesita **licencia verificada** — sea de librería, generativo o grabado. "Lo bajé de internet"
> no es una licencia. Documenta la fuente y el alcance.

## 7. Ambiences / atmósferas

Los **ambiences** (o *room tone* / *backgrounds*) son las camas de sonido que dan **lugar y
continuidad**: una oficina, una calle, un bosque, el zumbido de una sala. Funciones:

- **Ubican** la escena en un espacio y llenan el silencio (el silencio total suena "muerto").
- **Dan continuidad** entre cortes: un ambience constante pega tomas que se grabaron distinto.
- **Se mezclan bajo todo** (nivel bajo, sin competir con voz/música), con posible *ducking*.

Constrúyelos por **capas** también: base (drone/room tone) + detalles esporádicos (un pájaro, una
puerta lejana, un auto) para que no suene loop. Evita el loop obvio: varía y desincroniza las
capas.

## 8. Transiciones, whooshes, impacts, stingers

| Elemento | Función | Diseño |
|---|---|---|
| **Whoosh** | Mover al oído entre planos/secciones; sensación de velocidad | Ruido filtrado con automatización de paso de banda + doppler/paneo |
| **Impact / hit** | Marcar un golpe, un reveal, un cambio duro | Layering §2 (sub + cuerpo + transiente + cola) |
| **Stinger / sting** | Puntuación musical corta (a veces = mnemonic, módulo 05) | Gesto musical de 1–3 s que sella un momento |
| **Riser / build** | Tensión que sube hacia un drop/reveal | Barrido ascendente (pitch/filtro) que resuelve en el impact |
| **Transición / swell** | Unir dos secciones suavemente | Reverse, swell de reverb, crossfade con ambience |

**Combo clásico:** *riser → whoosh → impact* para un reveal potente. El riser crea expectativa, el
whoosh mueve, el impact resuelve.

## 9. SFX para UI / producto (sinergia motion + UI)

Los **UI sounds** son micro-SFX funcionales que **confirman una acción** en producto: éxito,
error, notificación, envío, toggle, mensaje. Reglas propias:

- **Cortísimos** (típ. 50–300 ms) y de bajo volumen — informan, no interrumpen.
- **Semántica consistente:** éxito = ascendente/cálido; error = descendente/seco; notificación =
  neutro y breve. El usuario aprende el idioma.
- **Del mundo tímbrico de la marca** — son la capa micro del **sonic branding** (módulo 05); un UI
  sound tiene que sonar a la misma marca que el pre-roll del podcast.
- **Sincronía perfecta con la microinteracción visual** — el sonido calza con la animación; ese
  *sonido-a-picture* se coordina con `motion-design-studio` / la capa de UI motion; el **craft**
  del sonido es de acá.
- **Opt-out y no fatigantes** — respeta silencio del sistema; sonidos que se repiten mil veces al
  día no pueden cansar.

## 10. Edición y sync de SFX

1. **Coloca al frame/hit point** — el transiente del SFX cae exacto en la acción (un impacto
   llega **con** el golpe, no después).
2. **Nivela** — el SFX ocupa su lugar sin tapar diálogo/música (usa *ducking* si compite).
3. **EQ contra la mezcla** — talla el rango del SFX para que no enmascare la voz (250 Hz–4 kHz) ni
   pelee con el sub de la música.
4. **Ubica en el espacio** — paneo + reverb/delay que le dan profundidad y lugar coherentes con la
   escena.
5. **Varía las repeticiones** — usa tomas distintas para pasos/tecleos/golpes repetidos; evita la
   *fatiga de repetición* del mismo archivo.
6. **Revisa en varios sistemas** — audífonos, parlante de laptop, celular; un sub que se siente
   glorioso en estudio puede desaparecer en un teléfono.

**Errores frecuentes:** SFX pegado tarde (fuera de sync); un solo archivo repetido (suena falso);
reverb horneado que no puedes controlar; efecto que tapa la voz; sub-grave que no traduce a
parlantes chicos; licencia sin verificar.

---

**Remite a:** `templates/sfx-list.md` (spotting list: qué SFX, dónde, capas, fuente, licencia) ·
módulo 05 (los UI sounds/stings como parte del sistema sónico) · módulo 09 (EQ/nivel/espacio en la
mezcla) · `motion-design-studio` (sync de SFX a picture / UI motion) · `SOURCES.md` (herramientas
de SFX generativo + **licencias** + `as-of`) · `ANTIPATTERNS.md` (los errores de sync y licencia).
