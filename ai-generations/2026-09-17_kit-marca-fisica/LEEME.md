# Hoja maestra del kit de marca física (2026-09-17)

Lámina A4 vertical a 300 dpi que reúne las piezas producidas y sus reglas, para presentar al equipo y a un proveedor.
`hoja-maestra.mjs` la **compone de forma determinística** desde las vistas transparentes de cada kit y el logo oficial:
nada se genera, así que siempre refleja el estado real de las carpetas.

**Salida:** `efeonce-kit-marca-fisica-v01-A4.png`, copiada a OneDrive `5. Contenidos/13- Branding/`.

## Contenido

- **Piezas:** polo piqué navy · chaqueta softshell · bomber ligera · hoodie · polo blanco · gorra navy · gorra trucker ·
  lanyard con yoyo · carnet.
- **Reglas:** color, aplicación (bordado en formales; estampa de espalda en hoodie y chaquetas, polo con espalda
  limpia), impresión sobre navy (gris claro `#C8CEDA`) y uso por contexto.
- Cierra con el eslogan en su lockup de dos tonos.

## Cómo actualizarla

```bash
node ai-generations/2026-09-17_kit-marca-fisica/hoja-maestra.mjs
```

Para sumar una pieza, agregar su entrada al arreglo `piezas` con la ruta de su vista transparente, el nombre y la
línea de uso. El texto se envuelve solo; no hay que cortarlo a mano.

## Correcciones de la corrida

| Observación | Corrección |
|---|---|
| El isotipo del encabezado no se veía | Sobre navy va el **logo negativo**, no el positivo |
| Subtítulos y reglas se cortaban con «…» | Envoltura de texto por palabras, sin truncar, y altura del bloque calculada antes de dibujar |
| La última regla y el eslogan se salían de la hoja | Alto de la grilla reducido y posición del cierre calculada desde el alto real del bloque de reglas |
