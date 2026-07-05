# 08 · Audio narrativa — audiolibro · radiodrama · sound design · inmersivo

> **Qué cubre.** El audio que **cuenta una historia**: audiolibro (narración de largo
> aliento, estándar ACX-style), radiodrama (multi-voz + SFX + ambiences + foley),
> sound design narrativo (cómo el sonido narra) y audio inmersivo (binaural / espacial /
> Dolby Atmos). Incluye multi-voz con IA (Seed Audio en una pasada). **El craft narrativo es
> estable**; lo volátil es el pipeline IA multi-personaje `(as-of 2026-07 — reverificar)`.
> Cierra con `templates/vo-script-and-direction.md`.

---

## 1. Audiolibro (estándar ACX-style — estable)

El estándar de referencia para audiolibro comercial. Cúmplelo aunque no publiques en ACX:
garantiza inteligibilidad y consistencia en horas de escucha.

| Parámetro | Rango canónico | Por qué |
|---|---|---|
| **RMS (nivel promedio)** | **-23 a -18 dBFS** | Loudness percibida pareja capítulo a capítulo. Fuera de rango se rechaza. |
| **Pico máximo** | **≤ -3 dBFS** | Headroom; evita clipping en énfasis. |
| **Piso de ruido** | **≤ -60 dBFS** | Silencio real entre frases; nada de hiss audible. |

**Craft de narración:**

- **Consistencia ante todo.** Mismo micro, misma sala, misma distancia, misma hora del día,
  misma energía vocal en todas las sesiones. Un audiolibro es una maratón: si la voz cambia
  entre capítulos, el oyente lo nota y se sale.
- **Room tone:** captura y usa el mismo tono de sala en las pausas. Un silencio "digital" (cero
  absoluto) suena antinatural; el room tone da continuidad.
- **Ritmo:** pausas al final de frase y párrafo, respiraciones controladas (atenuadas, no
  eliminadas), velocidad sostenible. La escucha es larga; el ritmo debe respirar.
- **Chaptering:** un archivo por capítulo, nombrado y ordenado, con markers y metadata limpia.
- **Pickups / punch-in:** correcciones grabadas en la misma sesión de tono para que empalmen.

**Dirección de personaje (aun con un solo narrador):** distingue voces con **tono, ritmo y
color**, no con caricatura. Mantén una "ficha" de cada personaje (registro, cadencia, tic) y
respétala en todo el libro. La dirección de performance vive en el módulo 02.

---

## 2. Radiodrama (ficción sonora multi-voz)

El radiodrama construye un mundo solo con sonido: voces, efectos, ambientes y música cuentan
lo que no se ve.

- **Multi-voz:** cada personaje con su color vocal, su plano (cerca/lejos) y su espacio. El
  paneo y la reverb ubican a cada quien en la escena.
- **SFX narrativos:** los efectos hacen avanzar la trama (una puerta, pasos que se acercan, un
  disparo). No son decoración: son acción. (Diseño de SFX en el módulo 06.)
- **Ambiences (camas de ambiente):** el fondo constante que define el lugar (lluvia, oficina,
  bosque, nave). Da continuidad y contexto sin que nadie lo describa.
- **Foley:** los sonidos corporales y de objetos sincronizados a la acción (ropa, vasos,
  llaves). El foley hecho con criterio es lo que hace "real" una escena.
- **Dirección de escena sonora:** decide el **plano sonoro** de cada momento — qué está cerca,
  qué lejos, qué se mueve, qué revela la mezcla. La escena se dirige como una toma de cine,
  pero con distancia, reverb y nivel en vez de encuadre.

---

## 3. Sound design narrativo (cómo el sonido cuenta)

El sonido no ilustra: **significa**. Principios para narrar con audio:

- **Contraste dinámico narrativo:** un silencio antes de un golpe pega más que subir el volumen.
  El rango dinámico es una herramienta dramática (ver módulo 09).
- **Motivos sonoros:** un timbre o textura asociado a un personaje/idea que reaparece — el
  equivalente auditivo de un leitmotiv.
- **Transiciones de espacio:** cambiar reverb/ambiente lleva al oyente de un lugar a otro sin
  una sola palabra de narración.
- **Diégesis vs no-diégesis:** distingue el sonido que existe en la escena (lo que los
  personajes oyen) del que solo oye el público (score, subrayados). Mezclar los dos sin
  intención confunde.
- **Fuera de cuadro:** un sonido sin fuente visible crea expectativa e imaginación — la ventaja
  única del audio sobre el video.

---

## 4. Audio inmersivo / binaural / espacial

Cuándo vale el esfuerzo y qué elegir:

| Técnica | Qué es | Cuándo usarla |
|---|---|---|
| **Estéreo con paneo/profundidad** | Ubicación L-R + planos por reverb/nivel | Casi todo radiodrama y narrativa; el 90% del efecto con la mitad del costo. |
| **Binaural (HRTF)** | Grabación/render 3D para audífonos | Experiencia inmersiva íntima de auriculares (ASMR narrativo, meditación, terror). Colapsa en parlantes. |
| **Espacial / Dolby Atmos** | Objetos de audio en un campo 3D con altura | Producciones premium con distribución que soporta Atmos (streaming, cine, apps). Mayor costo de mezcla y entrega. |

> **Regla.** El inmersivo es una decisión de **destino de escucha**: si el 90% escucha en
> audífonos, el binaural suma; si es distribución masiva mixta, un buen estéreo es más robusto.
> No masterices en Atmos algo que se consumirá en un parlante de teléfono.

---

## 5. Multi-voz con IA (una pasada)

`(as-of 2026-07 — reverificar herramientas y licencias.)`

- **Seed Audio 1.0** genera **diálogo multi-personaje + música + SFX en una sola pasada**
  (~$0.18/min) — sirve para **prototipar** una escena narrativa completa rápido y decidir
  dirección antes de producirla en serio.
- **ElevenLabs** (v3 con audio tags `[whispers]/[laughs]`, multi-speaker, cloning) para voces
  de personaje dirigibles y consistentes a lo largo de una obra.
- **Loop humano+IA:** la IA genera el borrador de voces y capas; el humano **dirige la
  performance, ajusta el ritmo, mezcla el espacio sonoro y masteriza**. El juicio narrativo no
  se delega. (Pipeline y enrutado en el módulo 10.)

> **Reglas duras:** clonar cualquier voz exige **consentimiento explícito** del dueño; la
> música IA en un entregable comercial exige **licencia verificada**; produce con IA solo con
> **gasto de créditos dimensionado** y **confirmación humana antes de entregar**.

---

## 6. Checklist de audio narrativa

**Audiolibro:** ☐ RMS -23/-18 dBFS · ☐ pico ≤ -3 dBFS · ☐ piso ≤ -60 dBFS · ☐ room tone
consistente · ☐ misma voz/sala/energía en todos los capítulos · ☐ chaptering + metadata ·
☐ fichas de personaje respetadas.

**Radiodrama / narrativa:** ☐ cada voz con plano y espacio propios · ☐ SFX que hacen avanzar
la trama · ☐ ambiences por locación · ☐ foley con criterio · ☐ dirección de escena sonora
(cerca/lejos/movimiento) · ☐ diégesis vs score clara · ☐ destino de escucha define si va
inmersivo · ☐ consentimiento + licencia + confirmación humana si hubo IA.

> **Remite a** `templates/vo-script-and-direction.md` para el guion anotado con dirección de
> performance por línea/personaje, y a `templates/sfx-list.md` para la lista de efectos y
> ambientes de la obra.
