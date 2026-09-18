# Nexa con el vestuario corporativo — prueba de uso de los kits (2026-09-17)

Prueba encargada por el operador para verificar los kits de prenda en una pieza real: Nexa con el **polo piqué navy** y
la **chaqueta softshell** abierta encima, en una oficina moderna, 4:5.

## Cómo se produjo

Pasada directa con cinco referencias, en este orden:

1. `2026-09-17_polo-efeonce/final/…-navy-01-frente-…-fondo-estudio.png` — la prenda interior.
2. `2026-09-17_chaqueta-efeonce/final/…-softshell-06-cierre-abierto-…-fondo-estudio.png` — la chaqueta, en la vista
   que corresponde a cómo se usa en la pieza (abierta).
3 y 4. Nexa de pie (cuerpo completo y una pose) desde `2026-09-17_nexa-logo-estudio/refs/`.
5. Rostro de Nexa (`2026-09-17_kv-tu-ia-no-conoce/refs/nexa-avatar-34-v2.png`).

El prompt describe sólo la persona y la escena; las prendas las fijan las referencias. Una pasada, USD 0,14.

## Resultado del QA

- **Prendas:** navy correcto, construcción del polo y de la softshell reconocibles (cuello alto, cierre, bolsillos con
  cierre oculto), chaqueta abierta sobre el polo como se pidió.
- **Emblema:** orientación correcta contra el isotipo oficial (nave a la derecha, aletas abajo a la izquierda, órbita
  como elipse ancha, planeta arriba). Diferencias menores en los cortes de la órbita y en el grosor de la nave.
- **Nexa:** rostro y contextura consistentes con sus referencias, postura de pie correcta.

## Regla que confirma

Elegir la vista **por cómo se usa la prenda en la pieza**, no sólo por el ángulo: acá la chaqueta va abierta, así que
la referencia correcta es `cierre-abierto`, no `frente`. Con la vista equivocada el modelo inventa cómo se abre.
