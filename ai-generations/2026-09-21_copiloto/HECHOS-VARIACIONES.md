# Variaciones del registro de puesta en escena — hechos medidos, 2026-09-21

Continuación de `HECHOS-REGISTROS.md`. Seis piezas producidas en registro B, el mapa de qué palanca sirve en
qué registro, y el delta de identidad de Nexa que llegó de la sesión «Poses de Nexa en advertising y design
studio». **Fuente para documentar: cada línea es un hecho verificado.** Evidencia en `plates/`.

---

## 1. Las seis piezas del registro B **[todas con emblema verificado al 100%]**

| Pieza | Palanca | La IDEA que lleva | Reservas |
|---|---|---|---|
| `G-podcast-v5` | — + `bruma` | el podcast existe y te invita | banda 0,34 ✓ · lecho 8,32 ✓ · b\* −0,7 |
| `H-julio-v1` | — + `polvo` | quien ya sabe la respuesta | **5/5 reservas** · banda 0,30 · lecho 8,69 · b\* −1,2 |
| `I-nexa-v1` | — + `bruma` | complicidad: el cuerpo va, la cara vuelve | banda 0,34 ✓ · lecho 3,99 ✗ · b\* −3,8 |
| `J-pov-v1` | `pov` | **te estoy hablando a ti** | banda 0,32 ✓ · lecho 5,18 ✓ · b\* −0,6 |
| `K-larga-v1` | `larga-exposicion` | **el que no se mueve** | banda 0,30 ✓ · lecho 2,27 ✗ · b\* −0,6 |
| `L-proyeccion-v1` | `proyeccion` | **estoy dentro de mi trabajo** | banda 0,28 ✓ · lecho 6,41 ✓ · b\* −0,4 |

🔴 **La prueba dura del registro B, y las tres últimas la pasan: significan SIN titular.** Si una pieza de
puesta en escena necesita el texto para que se entienda, la idea no está en la foto y la pieza no está resuelta.

## 2. Mapa: qué palanca sirve en qué registro **[criterio, derivado del marcador de la mirada]**

El registro B se reconoce porque **el sujeto mira al lente**. Eso ordena el catálogo entero:

### Nativas de B — la mirada al lente está justificada por la propia palanca

| Palanca | Por qué es nativa |
|---|---|
| `pov` | La cámara ocupa el asiento del cliente: no «mira al lente», **te habla a ti**. La coartada narrativa más fuerte del registro |
| `oclusion` | Algo cubre un tercio y el sujeto sigue mirando: da intriga, **y el objeto que ocluye puede ser el lecho** |
| `fragmento` | Crop extremo del rostro mirando al lente: la que más golpea a 390 px |
| `copiloto` | Nació en B: la criatura del partner comparte el gesto |

### Se adaptan bien a B

`larga-exposicion` (el sujeto quieto mirando al lente mientras todo se disuelve) · `reflejo` (mira al lente a
través del vidrio, con dos realidades superpuestas) · `proyeccion` (la obra proyectada sobre él y el muro) ·
`instrumento` · `cenital` · `suelo-oblicuo` · `atraviesa`.

### Sin personas y aun así registro B

`variantes` (la decisión como sujeto: nueve a doce copias idénticas salvo un eje) · `descarte` (la pila de lo no
elegido) · `ausencia`.

### 🔴 Incompatibles con B, por construcción

`escucha` — **el sujeto no mira a nadie: está recibiendo**, es documental puro. Más `manos`, `sombra`,
`silueta`, `marcado` y `quien-sostiene`: pierden el marcador de la mirada. No están prohibidas en una pieza de
campaña, pero si se usan, **la pieza ya no se juzga con la barra de B**.

## 3. Variaciones que NO son palanca **[criterio]**

Formato (9:16 para stories con su reserva propia, 16:9 para portada) · cuántos (una persona, dos, persona +
mascota de partner) · prenda por registro de escena (chaqueta = instancia importante · polo = oficina y estudio
· hoodie o gorra = terreno) · atmósfera (`polvo` · `bruma` · `vapor` · `humo`) · con o sin capa gráfica encima.

## 4. Delta de identidad de Nexa **[de la sesión de ángulos, commits `ffa7d65d9` y siguientes]**

### Home canónico

**Todo lo de Nexa vive en `ai-generations/_identidad-nexa/`**: `1-anclas/`, `2-angulos/`, `3-poses/`,
`4-vestuario/` y un LEEME que explica las dos identidades. **No es una carpeta de corrida**: las fechadas siguen
siendo histórico. El catálogo de `build-prompt.mjs` apunta sólo ahí.

### Las anclas nuevas

Las referencias base pasaron a ser **anclas fotográficas de 2560×3200**, no el maestro sintético de 1024×1536.
Causa: el operador señaló que la Nexa anterior se veía «muy sintética» y al 100% se confirmó — piel sin poros,
un patrón de micro-arrugas uniforme, cero vello facial y tono perfectamente parejo. Las nuevas tienen poros
irregulares, vello fino y luz de ventana con dirección real. Primera pieza que las usa: `K-larga-v1`.

### Tres reglas de esa corrida **[medidas, son receta y no anécdota]**

1. 🔴 **Pedir textura produce piel castigada si no se acota.** «Rojez sutil, manchitas, brillo disparejo, líneas
   de expresión» dio una mujer de 40 con la piel manchada, y el operador lo rechazó. Lo que funciona: que la
   textura venga **sólo de poros y vello**, con tono parejo, piel sana y luz de ventana **con relleno**.
   **Realismo ≠ castigo.**
2. 🔴 **Más resolución no es más fidelidad.** El maestro es 1024×1536; a 2560×3200 el modelo **inventa** el
   detalle de poros. Verificar al 100% contra el maestro, nunca asumir que subir píxeles mejora la identidad.
3. **`quality: max` a 2560×3200 cuesta USD 0,565 por imagen** — diez veces una de 1024² en `high`. Saberlo
   antes de presupuestar una tanda.

### Deuda declarada **[no resuelta]**

`2-angulos/`, `3-poses/` y `4-vestuario/` conservan el **acabado sintético** porque se derivaron del maestro
viejo. Sirven para ángulo, pose y vestuario, pero **si una pieza necesita piel creíble en primer plano, la
referencia es un ancla**. Regenerarlos es decisión del operador.

## 5. Reservas por cerrar en las piezas nuevas

- `K-larga-v1`: lecho **2,27** — las estelas de luz pasan por encima del road case. Se cierra sacándolo del
  paso de los trazos (misma lógica que sacarlo de la llave).
- `L-proyeccion-v1`: aire para cursores **1,02** — el muro proyectado tiene mucha estructura en los costados.
- `I-nexa-v1`: lecho **3,99** — el panel de color recibe algo del rim.
