# Hum: pelo nuevo para separarla de Nexa (2026-10-04)

Decisión del operador, 2026-10-04: «Ok haz lo de hum». Hum y Nexa se confundían en grupo (las dos treintañeras, pelo casi
negro largo con ondas, cara de óvalo suave). El separador es el pelo, que se lee a distancia de grupo; los accesorios
(piercing, delineado) no. Se descartó el bob a la mandíbula porque es el pelo de Sophia (rizado): Hum queda con **bob
liso que termina justo sobre los hombros, raya al centro, sin ondas**. Nexa conserva su melena larga ondulada.

## Método

Editar, no generar (`pnpm ai:image`, `gpt-image-2.5-sunburst`):

1. `elegida/`: tres variantes desde `hum-elegida.png` con `prompts/elegida-lob.txt` (dos tiradas) y
   `prompts/elegida-recogido.txt` (moño bajo, alternativa). Elegida: **`hum-elegida-lob-a.png`**. Cara y piercing
   intactos al 100 %.
2. `vistas/`: frente, 45° y perfil a cada lado y cuerpo, cada una editada desde su vista anterior con la elegida nueva
   como segunda imagen (`prompts/vista.txt`), mismo tamaño que la fuente. El ancla HD con `quality max` 2048×3072.
   `hum-manos.png` no cambia (no muestra pelo).
3. Control: `pnpm foto:rostro` frente anterior 0,82 → nueva 0,81 (misma cara). Ancla HD revisada al 100 %: la textura
   fina de la piel es la misma que la del ancla anterior (el riesgo conocido de `max`), no empeora.
4. Promovidas a `_identidad-elenco/hum/`, selladas (`foto:assets:lock`, 560 assets) y publicadas al canon (7 archivos;
   el ancla HD no la declara el catálogo). Las versiones anteriores quedaron en `anterior/`.

Costo ≈ 9 ediciones high + 1 max ≈ USD 0,9.
