// El adaptador canónico de Greenhouse sobre los contratos publicitarios de AXIS vive en
// `src/lib/creative/axis-advertising.mjs` desde TASK-1921: el `artifact-worker` lo necesita para pintar la selección
// colaborativa y el CTA de las piezas de marca, y la imagen del Job sólo lleva `src/`. Este archivo lo reexporta
// para los scripts que ya lo importan (layout compiler, foto).
export * from '../../../src/lib/creative/axis-advertising.mjs'
