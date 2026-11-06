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
    ['<g mask="url(#mask)">', '<g mask="url(#mask)" transform="matrix(1 0 0 1.005952 0 -8.036)">']
  ]
};
P['HM_CL_KV_ENCUENTRA.svg'] = P['HM_CL_KV_INTER_CLUSTER.svg'];
module.exports = P;
