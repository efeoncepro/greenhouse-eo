# Referencias de personas del equipo y vestuario (2026-09-17)

## Julio Reyes — set de referencias

Ocho fotos entregadas por él mismo: cuatro retratos y cuatro de cuerpo entero, en contextos corporativos.
Copia en OneDrive `5. Contenidos/13- Branding/Equipo/Julio Reyes/v01/` y en `refs/` de esta corrida, con
`refs/julio-reyes-manifiesto.json` (qué es cada una y cómo usarlas).

**Consentimiento:** las entregó él para este uso. Ninguna persona real se genera sin su consentimiento.

## Regla aprendida — retrato solo deforma el cuerpo

La primera pieza (`prueba/julio-softshell-v01.png`) salió con **la cabeza más grande que el cuerpo**: se usaron tres
retratos como referencia y un plano cerrado con lente corta, así que el modelo construyó el cuerpo a partir de una cara.

Corrección aplicada en `prueba/julio-softshell-v02.png`:

1. **Referencias mixtas:** al menos una de **cuerpo entero** junto a una de rostro.
2. **Encuadre abierto:** tres cuartos desde debajo de las rodillas, con aire sobre la cabeza.
3. **Cámara a la altura del pecho** para que nada quede escorzado.
4. **Lente larga (≈135 mm) a varios metros**, que comprime la perspectiva en vez de agrandar lo cercano.
5. **Anatomía declarada en el prompt:** cabeza ≈ 1/7,5 de la altura, hombros más anchos que la cabeza, torso de largo
   natural, «nunca agrandar la cabeza ni encoger el cuerpo».

## Piezas

- `prueba/julio-softshell-v01.png` — descartada (proporción).
- `prueba/julio-softshell-v02.png` — aprobada: polo navy con la softshell abierta encima, oficina, 4:5.

Las prendas vienen de los kits (`2026-09-17_polo-efeonce`, `2026-09-17_chaqueta-efeonce`); el prompt sólo describe
persona y escena. Modelo `gpt-image-2.5-sunburst`, xhigh, ~USD 0,14 por intento.
