# Portadas y avatar de redes sociales — 2026-09-30

Canvas de revisión: «Efeonce · Perfiles sociales» (https://claude.ai/artifact/JVtVNm8vewPgGEmzcbHKwz, privado).

## Estado

- Portadas de LinkedIn en **5,9:1** (LinkedIn Help: 1512 × 256), todo lo importante en la zona central
  (~17 % de recorte por lado en celular) y fuera de la esquina inferior izquierda (logo de la página).
- 1, 3, 4 y 6: compuestas. 3 requiere revisión legal de «Te hacemos visible».
- 2 y 5: **pendientes de la foto de Nexa** (decisión del operador 2026-09-30: persona = Nexa; motor = CLI con
  GPT Image 2.5). Fichas en `fichas/`, **sin validar**: `foto:prompt` no corrió en la sesión cloud (faltan
  `node_modules` con los paquetes privados de AXIS y la clave de OpenAI).

## Cómo producir las dos fotos (en una máquina con el repo instalado y credenciales)

```bash
pnpm foto:doctor
pnpm foto:prompt ai-generations/2026-09-30_portadas-redes/fichas/N2-en-vivo-nexa.json
pnpm foto:prompt ai-generations/2026-09-30_portadas-redes/fichas/N5-irrepetible-nexa.json
# cada una imprime el comando exacto de `pnpm ai:image` con las referencias de Nexa (--image …)
# usar --model gpt-image-2.5-sunburst o -flare, --quality high y el --size que imprime (3:1)
```

Formato: la ficha pide `3:1` (el más ancho de la tabla de `foto:prompt`; GPT Image 2.5 llega a 3:1). La
portada toma la franja central 5,9:1: la cabeza, las manos y el iPad deben quedar entre el 25 % y el 75 % del
alto. El plate nace sin logo ni texto; el texto y la esfera se componen encima.

## Rechazado en la primera ronda (no repetir)

- Mujer desconocida de noche con luz de pantalla: «se ve con sueño y desmaquillada».
- Tazas hechas a mano frente a tazas en serie: «muy análogo para lo digitales que somos».
