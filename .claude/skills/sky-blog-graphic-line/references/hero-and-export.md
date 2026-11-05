# Portada, hero del tema y exportación

> Contrato: `contracts/sky-blog-recipes.json → formats, master, hero`. Motor: `compose/hero.mjs`.

## 1. Por qué la portada tiene reglas propias

El blog (WordPress 7.1.4, tema Tripster) usa la imagen destacada como fondo `background-size: cover;
background-position: 50% 50%` del hero, y escribe encima la categoría, el H1 blanco y la fecha. Medido en vivo el
2026-11-02 en `/volcan-chachani/`:

| Vista | Hero | Texto (fracciones del hero) | H1 |
|---|---|---|---|
| Escritorio 1440 px | 1440×594 (2,42:1) | x 0,094–0,906 · y 0,55–0,90 | Assistant 54 px, 2 líneas |
| Móvil 375 px | 375×280 (1,34:1) | x 0,127–0,873 · y 0,50–0,92 | Assistant 22 px |

Degradado del tema: transparente hasta 25 %, 0,13 a 50 %, 0,25 a 66 %, 0,75 al pie.

Llevado al cuadro de entrega 1408×768 (11:6), con recorte centrado:

| Zona | Fracciones del 1408×768 |
|---|---|
| Visible en escritorio y móvil | x 0,135–0,865 · y 0,122–0,878 |
| **Ventana del sujeto** | x 0,135–0,865 · y 0,122–0,50 |
| Banda del texto | y 0,50–0,92 |

`deriveHeroZones()` calcula esto desde `hero.crops`; una prueba lo compara con `hero.derivedInArticulo`. **Si el tema
cambia, se vuelve a medir** (con el navegador: `getBoundingClientRect` de `h1` y `.post_featured_bg` a 1440 y 375 px)
y se actualiza `hero.crops` con fecha; lo demás se deriva.

## 2. Regla de la portada

El protagonista y su detalle crítico (rostro, manos, contacto, forma reconocible del monumento) viven en la ventana del
sujeto. La mitad inferior va tranquila y no demasiado clara: suelo, agua, calle, arena o el primer plano desenfocado.
El prompt lo pide con HERO SPACE (`--portada`); el gate lo verifica.

Las interiores (IMG 2–3) se muestran completas dentro del cuerpo: no tienen esta restricción.

## 3. Gate: `medir-portada.mjs`

```bash
node brands/sky-airline/blog/scripts/medir-portada.mjs <maestro.png> \
  --sujeto 0.34,0.12,0.70,0.52 --focal 0.5,0.5 --vista projects/sky/<pieza>/salidas/vistas
```

- `--sujeto u0,v0,u1,v1`: caja del detalle crítico **en fracciones del maestro**, declarada por quien mira la foto.
  **Empieza en la coronilla** (pelo, sombrero, mano alzada), nunca en los hombros: el 2026-11-05 tres portadas pasaron
  el gate con la cabeza cortada porque la caja empezaba más abajo y la coronilla quedaba en ~13 %, justo donde empieza
  la ventana del tema (~13,3 % del maestro).
- `--focal`: el mismo que usarás al exportar.
- Pasa si: sujeto ≥ 85 % dentro de la ventana **y**, con el degradado del tema, ≤ 25 % de la caja del texto queda bajo
  3:1 en escritorio y en móvil.
- Informa (sin bloquear) dónde está el detalle de la foto y cuánto queda fuera de cuadro.
- `--vista` escribe `-zonas.png` (ventana, banda, caja del sujeto) y `-hero-desktop.png` / `-hero-mobile.png` con el
  degradado y barras blancas donde va el H1. **Mirar las vistas**, no sólo el veredicto.
- Sale con 1 si falla. Arreglo: subir el sujeto con `--focal` si el maestro tiene margen; si el sujeto quedó bajo o
  la mitad inferior quedó demasiado clara, alejar la cámara por expansión (§7); si no, regenerar con HERO SPACE.
  No se tapa con un velo ni se aclara el texto.

**Por qué el sujeto se declara** (calibración 2026-11-02): la energía de bordes no encuentra al sujeto. Con las 11
portadas de octubre, Mascotas (perro bajo el H1) sacaba el mejor puntaje de «detalle en la ventana» y Paraty (buena)
fallaba por la textura del adoquín. La legibilidad sí se mide en píxeles y coincide con lo que se ve.

Resultado de octubre con sujetos declarados: pasan Lima, Paraty y Copacabana; fallan Cancún playa, Valdivia, Equipaje,
Adulto mayor, Cusco, Cancún barco, Mascotas y Curanto.

## 4. Maestro

- Preferido 3840×2160 (16:9), como el ensayo del 08/10; mínimo 2752×1500; siempre horizontal.
- 16:9 pierde sólo el 3 % del ancho al pasar a 11:6: casi no hay margen vertical para mover el foco. La composición de
  la portada se resuelve en el prompt, no en el recorte.

## 5. Exportar: `exportar.mjs`

```bash
node brands/sky-airline/blog/scripts/exportar.mjs <maestro.png> --nombre plaza-mayor-lima-catedral-garua \
  --focal 0.5,0.5 --portada --out projects/sky/<pieza>/salidas
```

- Artículo 1408×768; con `--portada` además `<nombre>-1200x630.webp` y `<nombre>-1080x1080.webp`, recortados del mismo
  maestro (`--focal-og`, `--focal-cuadrado` si el recorte lo pide). Revisar cada recorte por separado: el margen no
  garantiza que og y cuadrado conserven protagonista y primer plano.
- WebP de 86 a 60 de calidad hasta quedar bajo 200 KB; si no baja, falla (no se reduce resolución). Un maestro con ruido
  añadido es la causa típica.
- **Si no baja ni con 60** (follaje, manglar, oleaje: el 2026-11-05 fueron 11 escenas), se exporta desde una copia del
  maestro con desenfoque leve a 3840 px, subiendo σ por pasos hasta que pase: primero 0,6 · 0,9 · 1,2 y, si aún falla,
  1,6 · 2,0 · 2,4. En el lote bastó entre σ 0,6 y 2,0. A 1408 px el desenfoque no se ve; se confirma mirando al 100 % la
  de σ más alto. La copia vive aparte (`escenas/suave/`); el maestro original no se toca.

  ```bash
  node -e "require('/Users/jreye/Documents/creative-workbench/node_modules/sharp')('<maestro>.png').blur(0.9).png().toFile('<suave>/<id>-maestro.png')"
  node brands/sky-airline/blog/scripts/exportar.mjs <suave>/<id>-maestro.png --nombre <nombre> --focal 0.5,0.5 --out <entrega>
  ```
- `--nombre` en kebab-case, el de la spec. Nunca es el ALT; el ALT es literal del artículo (callout, notas para Dev y
  WordPress idénticos).
- Portada sin `loading="lazy"` (LCP); interiores con lazy.

## 6. Hallazgos del blog vivo (2026-11-02) que esta línea corrige

- Los posts nuevos suben originales de 10–21 MB que se usan tal cual como hero y og:image, sin alt.
- Una misma foto se ve en 16:9, ~1,12:1, ratio variable, 2,42:1, 1,34:1 y 1:1/3:2: no había zona segura.
- Cero imágenes dentro del cuerpo en los artículos auditados: IMG 2–3 son nuevas para el blog.
Estos son hallazgos de SEO/performance del sitio, no sólo de imagen: se reportan al equipo del blog (`sky-blog-seo`).

## 7. Alejar la cámara por expansión (portada con el sujeto bajo)

Cuándo: la portada generada tiene al sujeto bajo o cortado arriba, o la mitad inferior es tan clara (arena al sol,
pisos brillantes) que el H1 no se lee. Pedirlo en el prompt («COMPOSITION, MEASURED» con porcentajes del cuadro) no
bastó el 2026-11-05: las v2 de equipaje, líquidos y noticias también pasaron por la expansión. Probado en el lote del
2026-11-05; **método pendiente de validación de Julio**.

Cómo (scripts en `projects/sky/blog-lote-2026-11/tools/imagenes/`):

1. `zoomout.mjs <maestro> <caja del sujeto> <base.png> <mask.png>` arma un lienzo 3840×2160: la escena reducida y
   subida al centro (el sujeto cabe entre `ZOOM_TOP` y 49 % del alto), un fondo guía con la propia escena muy difuminada
   y una máscara que protege al sujeto y lo que está sobre él. Imprime la caja nueva. Usar `ZOOM_TOP=0.18` (el default
   del script, 0,13, deja la coronilla al borde de la ventana).
2. `ai:inpaint` con Flare completa el área nueva (Sunburst con máscara devuelve un panel negro; Flux Fill de fal no tenía
   saldo ese día):

   ```bash
   OPENAI_API_KEY_PROFILE=personal gtimeout 900 pnpm -s ai:inpaint image --image <base.png> --mask <mask.png> \
     --adapter openai --model gpt-image-2.5-flare --quality high --run <expand>/<id> --max-usd 1.5 --yes \
     --prompt "Extend this same photograph outward as if the photographer had stepped back a few metres … fill the new area with <suelo>. … No people added, no lettering, no aircraft."
   ```

   El suelo se describe por pieza. Si el gate de contraste falla, se repite con el suelo «in DEEP soft shade: matte,
   mid-dark and calm, never bright, with no sunlit sand, no bright reflections and no white foam in the lower half».
3. Se usa el **candidato crudo** `candidate-1-raw.png` (2560×1440, imagen completa rehecha por el modelo) ampliado con
   lanczos a 3840×2160 como maestro nuevo. La versión recompuesta (`candidate-1.png`, zona protegida pegada bit a bit)
   dejaba uniones visibles entre lo viejo y lo nuevo, y un pase extra de corrección de uniones no se adoptó.
4. `medir-portada` otra vez sobre el maestro nuevo, con la caja nueva, y mirar las vistas.

Lo que hay que mirar, porque el crudo es una imagen rehecha:

- El modelo puede reencuadrar (el log avisa «el modelo REENCUADRÓ») o perder al sujeto: en Punta Cana la viajera
  desapareció. Comparar contra el maestro anterior antes de aceptar.
- La ampliación 2560 → 3840 baja la nitidez real; revisar al 100 % rostro y manos. Pendiente de validación.
- El prompt no puede nombrar «logo», «marca» ni «brand»: la guarda de marca de `ai:inpaint` aborta con FATAL.
- Costo de referencia: ≈ USD 0,055 estimado por expansión (salida 2560×1440 high).

