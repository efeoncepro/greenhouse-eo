# 04 — Creación de música (composición · mood · IA + humano)

> **Cárgalo cuando** tengas que crear música: una pista para marca/marketing, un score, un
> lecho (bed) bajo un VO, música de un podcast, o dirigir un prompt de música IA. Este módulo
> es **craft atemporal** (fundamentos, estructura, instrumentación) **+** la mano IA del año
> (Suno/Udio/ElevenLabs Music) con su **regla de licencia** — que es lo más caro de equivocar.
> Cierra con `templates/music-brief.md`.

> **Regla dura de licencia (CRÍTICA).** La música IA no se elige solo por cómo suena: se elige
> por **qué licencia comercial tiene**. Para cualquier cosa **comercial / de cliente /
> monetizada**, usa el modelo con licencia limpia (**ElevenLabs Music**). La calidad sin
> licencia clara no sirve en un entregable de marca. Reverifica el estado de licencia antes de
> comprometer un modelo (`SOURCES.md`), porque **cambia por trimestre**.

---

## 1. Fundamentos: los ejes que definen una pista

Toda música se puede describir por estos ejes. Cuando dirijas (a un compositor humano o a un
prompt IA), **fija todos** — dejar uno al azar es de donde salen las pistas genéricas.

| Eje | Qué decide | Ejemplo de dirección |
|---|---|---|
| **Género / estilo** | El "idioma" musical y su carga cultural | indie-folk, synthwave, corporate-uplifting, lo-fi, cine orquestal |
| **Mood / emoción** | Qué tiene que sentir quien escucha | esperanzador, tenso, cálido, épico, íntimo, juguetón |
| **Tempo / BPM** | Energía y velocidad percibida | balada 60–80, mid 90–115, energético 120–135, dance 128+ |
| **Tonalidad / modo** | Color emocional (mayor = luminoso, menor = serio/melancólico) | Do mayor (brillante), La menor (nostálgico), dórico (ambiguo) |
| **Energía / dinámica** | Curva de intensidad en el tiempo | build gradual, drop, plateau constante para lecho de fondo |
| **Instrumentación** | Timbre y textura | piano + cuerdas; sintes analógicos; guitarra acústica + palmas; 808 + pads |
| **Densidad / arreglo** | Cuántas capas suenan a la vez | minimal (1–2 elementos) vs wall-of-sound |
| **Duración + estructura** | El mapa temporal (ver §2) | 30s bumper, 60s spot, 2–3 min track, loop de 8 compases |

**Regla de mezcla con la voz.** Si la música va **bajo un VO o diálogo**, dirígela como *bed*:
menos densa, sin melodías que compitan con la frecuencia de la voz (250 Hz–4 kHz), con espacio
dinámico para el *ducking*. La mejor música de fondo casi no se nota — sostiene sin tapar.

## 2. Estructura de una pieza (el mapa temporal)

Una pista no es un mood plano: es una **narrativa** con secciones. Dirige la estructura
explícitamente.

| Sección | Función | Nota de dirección |
|---|---|---|
| **Intro** | Establece tono e instrumento principal; engancha en los primeros 3–5 s | En spot/bumper, el gancho tiene que llegar YA — no 15 s de build |
| **Verso** | Desarrollo, deja espacio (a la voz, a la narrativa) | Más bajo en energía que el coro; suele alojar el VO |
| **Coro / hook** | El pico emocional y lo memorable | Acá vive la melodía que la gente recuerda |
| **Puente / bridge** | Contraste, evita monotonía, prepara el clímax | Cambio de textura, tonalidad o instrumentación |
| **Outro / cola** | Cierre o resolución; puede ser *button* seco o *fade* | Para marca: un final claro, no un fade eterno |

**Formatos comerciales frecuentes:** bumper 5–10 s · sting 2–4 s · spot 15/30/60 s · lecho de
podcast (loop + intro/outro) · track completo 2–3 min. Dirige la **duración exacta** y dónde cae
el **hit point** (el momento donde entra el logo, el CTA, el cambio de plano).

## 3. Música para marca / marketing (dirección estratégica)

Antes de tocar una herramienta, responde **para qué** suena. La música de marca no es decorativa:
codifica identidad y emoción. Fija estas tres cosas en el brief:

1. **Qué emoción** tiene que provocar (una sola, dominante) — no "moderna y épica y cálida y
   divertida". Elige la principal.
2. **Qué género/estilo** encarna a la marca — y si es consistente con el resto de sus
   touchpoints sonoros (ver módulo 05, sonic branding: la música y el mnemonic tienen que ser
   del mismo mundo).
3. **Referencia** concreta ("suena como X pero con Y") — 1–2 tracks de referencia destraban
   cualquier ambigüedad. Sé específico: no "algo alegre", sino "como *[track]*, mismo tempo,
   pero con guitarra acústica en vez de sintes".

> **Cuidado legal con la referencia.** La referencia es para **comunicar la intención**, NUNCA
> para clonar una obra existente. Pedir "hazme *[canción famosa]*" a una IA es riesgo de derechos.
> Usa la referencia para describir atributos (tempo, mood, instrumentación), no para copiar.

## 4. Música IA — modelos y **licencia** (tabla de decisión)

Los datos de licencia son **volátiles** — verifica el `as-of` antes de comprometer.

| Modelo | Fuerte en | **Licencia comercial** | Cuándo usarlo |
|---|---|---|---|
| **ElevenLabs Music** | Producción musical con letra/instrumental dirigible | **Limpia desde día 1** (partnerships con sellos) — la más segura *(as-of 2026-07 — reverificar)* | **TODO lo comercial / cliente / monetizado.** El default de marca |
| **Suno (v4.5 / v5)** | **Mejor calidad de output** — pop, rock, electrónica, ambient; prompt-following; letras | En asentamiento (demandas por training-data; settlements con sellos a fin de 2025) *(as-of 2026-07 — reverificar)* | Calidad máxima para **interno / no-comercial / exploración**; no para cliente sin verificar |
| **Udio** | Calidad alta, historia de licencia más limpia | Vía limpia (UMG *settled* oct-2025; plataforma UMG×Udio 2026) *(as-of 2026-07 — reverificar)* | Alternativa cuando quieres calidad + una historia de licencia menos disputada |
| **Seed Audio 1.0** (ByteDance) | **Música + SFX + diálogo en una sola pasada** | Verificar por uso *(as-of 2026-07 — reverificar)* | Prototipado rápido y *prev* donde necesitas música+SFX+voz juntas de un tiro |

**Regla pragmática (memorízala):** **Suno/Udio para calidad, interno y no-comercial;
ElevenLabs Music para todo lo comercial, de cliente o monetizado.** Cuando dudes qué licencia
aplica, la respuesta segura es ElevenLabs Music, y documentas la fuente de la licencia en el
brief. Nunca entregues a un cliente Globe una pista de licencia dudosa.

## 5. Score / música original vs library (stock)

| Opción | Ventaja | Cuándo |
|---|---|---|
| **Score original (humano)** | 100% a medida, licencia y sync perfectos, único | Marca insignia, campaña grande, sonic branding, cuando el presupuesto lo permite |
| **Música IA original** | Rápido, barato, a medida del brief; con ElevenLabs = licencia limpia | La mayoría de necesidades de marketing/contenido; reemplaza la library stock |
| **Library / stock licenciada** | Inmediata, curada, licencia conocida | Cuando necesitas algo probado ya y el tiempo es cero; cuidado con la ubicuidad (otros usan la misma) |

**Tendencia 2026:** la música IA original **reemplaza a la library stock** para la mayoría de
usos — misma velocidad, pero a medida del brief y (con el modelo correcto) con licencia limpia.
El score original humano se reserva para lo insignia.

## 6. Dirigir un prompt de música IA (anatomía)

Un buen prompt de música fija **los seis mismos ejes** que dirigirías a un compositor. Estructura:

```
[Género/estilo] + [mood/emoción dominante] + [instrumentación clave] +
[estructura/dinámica] + [tempo/BPM] + [referencia como atributo] + [duración exacta]
```

**Ejemplo (bed de podcast, 90 s, instrumental):**
> "Lo-fi indie instrumental, mood cálido y reflexivo, guitarra eléctrica limpia + Rhodes +
> batería suave con brushes, estructura: intro 8 s minimal → cuerpo constante de baja energía
> que deja espacio a la voz → outro que resuelve, ~85 BPM, tonalidad mayor, tipo *[ref]* pero
> más íntimo, 90 segundos, sin letra."

**Checklist del prompt:**
- [ ] Género/estilo explícito (no "música bonita")
- [ ] **Una** emoción dominante
- [ ] Instrumentación nombrada (2–4 elementos clave)
- [ ] Estructura y curva dinámica descritas
- [ ] Tempo/BPM y tonalidad/modo
- [ ] Referencia como *atributos*, no como copia de una obra
- [ ] Duración exacta y, si aplica, dónde cae el hit point
- [ ] Con o sin letra (y si con letra: idioma es-CL, tono, tema)
- [ ] **Modelo elegido según licencia** para el uso final

## 7. Humano + IA (el flujo real)

La IA **genera y diverge**; el humano **cura, edita y arregla**. Ninguna de las dos sola entrega
nivel pro. Flujo canónico:

1. **Brief** (§3 + `templates/music-brief.md`): emoción, género, referencia, estructura,
   duración, uso final → **decide el modelo por licencia** antes de generar.
2. **Genera variaciones** (IA): pide 3–6 tomas del mismo prompt; la IA diverge y da opciones.
3. **Cura** (humano): elige la mejor toma por *musicalidad* y por *fit al brief*, no por lo
   novedoso. Descarta lo genérico.
4. **Edita/arregla** (humano): recorta a la duración exacta, ajusta la estructura, alinea el hit
   point, hace *stem editing* si el modelo entrega stems, corrige transiciones.
5. **Mezcla/mastering** (módulo 09): EQ contra la voz, loudness al target del destino, *ducking*
   si va bajo VO.
6. **Documenta la licencia** y pasa por **confirmación humana** antes de entregar.

> **Lo que la IA todavía hace mal (cúralo tú):** transiciones abruptas entre secciones, *outros*
> que no resuelven o se fundan eternamente, letras con métrica rara o pronunciación mala en es-CL,
> arreglos genéricos "de stock IA", loudness inconsistente. El juicio musical y de marca **no se
> delega** al modelo.

## 8. Errores que arruinan una pista (evítalos)

- Elegir el modelo **por calidad ignorando la licencia** en un entregable comercial → riesgo legal.
- Prompt vago ("algo épico") → sale genérico; fija los seis ejes.
- Música densa que **tapa el VO** → dirígela como *bed*, deja el rango de la voz libre.
- Pedirle a la IA **clonar** una obra famosa → derechos; usa la referencia como atributo.
- No fijar la **duración/estructura** → la pista no calza con el corte de video/spot.
- Fade eterno en vez de un cierre claro en piezas de marca.
- Entregar la **primera toma** sin curar ni editar → nivel amateur.

---

**Remite a:** `templates/music-brief.md` (brief completo) · módulo 05 (que la música sea del
mismo mundo que el sonic branding) · módulo 09 (mezcla/mastering/loudness) · `SOURCES.md`
(matriz de modelos + **licencias** + `as-of`) · `ANTIPATTERNS.md` (los errores legales de la
música IA).
