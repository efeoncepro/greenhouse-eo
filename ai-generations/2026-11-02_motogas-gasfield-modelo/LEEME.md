# Gasfield (Gas Don Julio) — hoja de modelo 3D

> Corrida del 2026-11-02. Decisión del operador: fijar una hoja de modelo para Gasfield, porque el 3D vigente
> tiene al menos tres cuerpos distintos. Los modelos 3D salieron de sus vistas 2D: el canon de forma es el 2D.
> Método: `greenhouse-ai-image-generator/references/mascot-3d-pose-library.md` (fuente oficial → base validada → vistas).
> Cliente: Motogas. Uso exclusivo de las cuentas Gas Don Julio. Estado: **candidato**, sin aprobación del cliente.

## Fuente oficial (en `fuente/`, copiada de OneDrive en solo lectura)

| Archivo | Qué es | Rol |
|---|---|---|
| `gasfield-dedo-arriba.svg` (+ `.svg.png`) | SVG oficial de Don Julio (`Produccion Grafica/6. Plantillas Graficas/Mesa de trabajo 8.svg`) | Canon de forma y color |
| `zips/…pensamiento-cilindro-gas.zip` | Pack vectorial de stock Freepik del que nace el personaje (2023) | Anatomía en 6 poses |
| `gasfield-2d-personaje.png`, `gasfield-desea-05.png`, `propuesta-dj01-2d.png` | 2D usados en piezas | Contraste |
| `gasfield-3d-freepik-talk.png`, `propuesta-dj02-3d.png` | 3D vigente (IA de Freepik, abr-2026) | Solo material |

**Licencia:** el 2D sale de un pack de stock de Freepik. Antes de usar la hoja fuera de las cuentas del cliente,
confirmar la licencia del pack.

## Invariantes medidos en el 2D (colores del SVG)

- Cuerpo: barril o farol, ≈ 1,1 veces más alto que ancho, hombros redondeados, costados algo abombados. No esfera, no cápsula.
- Soldadura horizontal a ≈ 55 % del alto, bajo la boca.
- Arriba: válvula corta y aro protector sobre cuatro postes; diámetro del aro ≈ ½ del ancho.
- Abajo: collar cilíndrico corto (≈ 40 % del ancho, ≈ 8 % del alto); las piernas salen a cada lado.
- Rojo: `#E31917` / `#DE0A14` principal, `#CF1317` sombra, `#EB5F46` / `#E74228` luz, `#F39C67` brillo. Contorno 2D `#8F1915`.
- Cara: dos ojos ovalados negros con brillo blanco, cejas en arco fino, sonrisa abierta. Exactamente dos ojos y una boca.
- Extremidades: fideos negros (`#1E1E1E`), manos de mitón con pulgar, zapatos ovalados negros.
- Sin texto, logo ni ropa en la base. El logo «GAS Don Julio» en la panza es una variante de pieza, no del modelo.

## Corridas

| Paso | Archivo | Motor | Resultado |
|---|---|---|---|
| Base frente | `base/gasfield-base-frente-v01.png` | `gpt-image-2.5-sunburst` xhigh 1600², edit con refs 01–03 | ✅ a la primera |
| Base tres cuartos (pose firma) | `base/gasfield-base-tres-cuartos-v01.png` | ídem | ✅ a la primera |
| Espalda · tres cuartos de espalda | `vistas/*-v01.png` | edit con las dos bases + 2D | ✅ a la primera |
| Perfil | `vistas/gasfield-perfil-v01/v02.png` → `satinado/gasfield-perfil-satinado-v03.png` → **`satinado/gasfield-perfil-satinado-v04.png`** | v03 con la espalda como guía; **v04 con guía de Blender** (`guias/guia-perfil-derecho-blender.png`) | ✅ v04: el cuerpo mide 790 px contra 813 de frente (97 %); v01 daba 78 % y v03 88 % |
| 5 poses del manual del cliente | `poses/gasfield-pose-0N-*-v01.png` | edit con las dos bases + 2D | ✅ las 5 a la primera |
| Acabado satinado (todas) | `satinado/*-satinado-v01.png` | edit de cada vista aprobada + ref 03 (`brief/satinado.txt`) | decisión del operador (2026-11-02): mate/satinado como el 3D vigente, no brillante |

**Aprobación y entrega (2026-11-02):** el operador aprobó todo el set. Recortes con `pnpm ai:image:rmbg`; la pose 06
(papel blanco sobre fondo claro) se recortó desde una fuente editada a fondo `#7F7F7F` (`fuente-recorte/`), porque el
matting dejaba el papel semitransparente. Entregado en OneDrive:
`Alineación/1. Clientes (Interno)/Motogas/Produccion Grafica/1. Recursos Graficos/Personajes/Gasfield 3D (hoja de modelo)/v01/`
(10 vistas × fondo estudio + transparente, hojas de contacto, guía de Blender y LEEME). Falta la aprobación del cliente.

**La guía de Blender:** el cuerpo se modeló por revolución del contorno medido fila por fila en la vista de espalda
(eje x ≈ 794 px, radio máx. ≈ 406 px; 1 unidad = 1000 px), con collar, válvula, 4 postes, aro y extremidades simples;
cámara ortográfica de 1,6 unidades, 1600². Ojo: el brief del perfil v01–v03 pedía «lado izquierdo con la cara a la
derecha», que es imposible (de su izquierda, la cara apunta a la izquierda del cuadro); v04 usa el lado derecho.

**Lo que aprendimos:**
- El perfil de un cuerpo redondo sale angosto: el modelo lo dibuja como una cápsula aunque el prompt pida el mismo ancho
  que de frente. Pasarle la vista de espalda como guía de silueta lo acerca (0,78 → 0,88) sin cerrarlo. Para el perfil
  exacto, el siguiente paso es una guía proyectada desde Blender (método de la nave de Efeonce).
- El cambio de material se hace **editando la vista aprobada**, nunca regenerando: conserva forma, cara y pose.
- Con acabado satinado las vetas verticales del cuerpo casi desaparecen; la superficie queda más limpia.

Briefs en `brief/`. Clave OpenAI: perfil `personal`. Costo aproximado: 19 imágenes xhigh 1600².
