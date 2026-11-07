// Ajustes de render sobre copias en memoria; el SVG original en OneDrive no se toca.
const P = {
  // Bloque de precio del clúster internacional alineado al de HM_CL_KV_INTER.
  'HM_CL_KV_INTER_CLUSTER.svg': [
    ['translate(556.35 977.69)', 'translate(556.35 981.83)'],
    ['translate(541.22 1148.01)', 'translate(541.22 1152.09)'],
    ['<tspan x="33.17" y="0" font-family="Metric-Black, Metric" font-size="112" font-weight="800">000.000 </tspan>',
     '<tspan x="32.2" y="17.58" font-family="Metric-Black, Metric" font-size="112" font-weight="800">000.000 </tspan>'],
    // El oscurecido izquierdo (Raster 4, opacidad .67) empieza en y=6 y deja una franja clara arriba.
    // Se estira 6 px hacia arriba (y=6 → −2, y=1350 → 1350 aprox.); su máscara se transforma con él.
    ['<g mask="url(#mask)">', '<g mask="url(#mask)" transform="matrix(1 0 0 1.005952 0 -8.036)">'],
    // Novena ronda (2026-11-06, Daniela): el sello de puntualidad del clúster venía sin el separador vertical
    // entre la medalla y el texto. Se agrega con la misma geometría que en HM_CL_KV_INTER.
    // Novena ronda (Daniela, Frame): el «00%» del badge del clúster iba 12 px más arriba que en HM_CL_KV_INTER y quedaba
    // pegado a «CON». Se baja a la posición del KV de Chile internacional y «DCTO.» baja lo mismo.
    ['translate(835.86 878.4) rotate(7.46)', 'translate(834.29 890.39) rotate(7.46)'],
    ['translate(861.58 917.61) rotate(7.46)', 'translate(860.72 922.59) rotate(7.46)'],
    ['translate(881.3 920.19) rotate(7.46)', 'translate(880.44 925.17) rotate(7.46)'],
    ['translate(900.04 922.65) rotate(7.46)', 'translate(899.18 927.63) rotate(7.46)'],
    ['</svg></svg>', '</svg><line x1="116.07" y1="1248.6" x2="116.07" y2="1301.74" fill="none" stroke="#fff" stroke-miterlimit="10" stroke-width=".34"/></svg>']
  ]
};
P['HM_CL_KV_ENCUENTRA.svg'] = P['HM_CL_KV_INTER_CLUSTER.svg'];
// Novena ronda (Daniela, Frame, popup «Vuela por Chile»): «Chile» iba pegado a «VUELA POR» y el precio a la píldora
// «DESDE». Ambos bajan hasta quedar centrados en su espacio (Chile entre el antetítulo y la píldora de origen; el
// precio entre «DESDE» y «Por tramo…»). Se aplica al KV, de modo que popup, story y GIF quedan iguales.
P['HM_CL_KV_DOM_CLUSTER.svg'] = [
  ['translate(86.87 1048.72)', 'translate(86.87 1070.72)'],
  ['<text transform="translate(541.23 1082.79)"', '<text transform="translate(541.23 1095.79)"']
  // El origen Santiago (décima ronda) vive desde la doceava ronda en variantes.cjs, con la píldora adaptativa.
];
// Costura de la flecha morada (novena ronda, 2026-11-06, Daniela: «una pequeña línea en la flecha morada en la
// parte de la cola»): la flecha son tres formas que se tocan en x=537,61 y x=918,96, y el antialias deja una línea.
// render.cjs ya ensanchaba el cuerpo 1 px por lado, pero sólo si el rect venía sin atributos extra (las variantes
// de AR llevan transform y data-capa por brecha.cjs) y parts.cjs/layers.cjs no lo hacían: el popup y el GIF salían
// con la línea. Ahora los tres scripts llaman a esta función.
P.flecha = (svg) => svg.split('<rect x="537.61" y="879.81" width="381.35"').join('<rect x="536.61" y="879.81" width="383.35"');
// Logo BLACK nuevo (décima ronda, 2026-11-06, Daniela: «actualizar el logo del BLACK por el nuevo que hay en carpeta»,
// `Despliegue Base/KV X HM/LOGO BLACK/`, archivos del 2026-11-06). Es el mismo dibujo que arma logofix.cjs (fecha
// nueva y marco retraído), pero con el resplandor ORIGINAL del kit: logofix lo reducía (desenfoque × 0,5, opacidad ×
// 0,6, pedido de SKY del 2026-11-04). Medido en los SVG nuevos: 3,44/0,8 · 6,02/0,7 · 3,35/0,5. Se restituye en los
// cinco filtros outer-glow del logo (con o sin prefijo lf- de las piezas raster), sin volver a correr logofix.
const NEON = { std: { '1.72': '3.44', '3.01': '6.02', '1.68': '3.35' }, op: { '0.48': '.8', '0.42': '.7', '0.30': '.5' } };
P.logoNuevo = (svg) => svg.replace(/(<filter id="(?:lf-)?outer-glow-\d+"[\s\S]*?<\/filter>)/g, (f) => f
  .replace(/stdDeviation="([\d.]+)"/g, (m, v) => `stdDeviation="${NEON.std[v] || v}"`)
  .replace(/flood-opacity="([\d.]+)"/g, (m, v) => `flood-opacity="${NEON.op[v] || v}"`));
module.exports = P;
