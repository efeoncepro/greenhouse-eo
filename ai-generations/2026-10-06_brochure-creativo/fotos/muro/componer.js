// Lo sensible se compone: dentro del muro van las piezas reales (base.png, determinístico); fuera, el ambiente
// que terminó el modelo (MU1: piso, reflejo, bruma). Máscara = muro de la base, dilatada y con borde suave.
const sharp=require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
(async()=>{
  const W=1792,H=1024;
  const base=await sharp('base.png').removeAlpha().raw().toBuffer();
  const mu=await sharp('MU1-muro-acabado.png').resize(W,H).removeAlpha().raw().toBuffer();
  const m=await sharp('mask.png').extractChannel(0).raw().toBuffer();
  const mask=await sharp(m,{raw:{width:W,height:H,channels:1}}).dilate(18).blur(1.6).extractChannel(0).raw().toBuffer();
  const out=Buffer.alloc(W*H*3);
  for(let i=0;i<W*H;i++){const a=mask[i]/255;for(let c=0;c<3;c++)out[i*3+c]=Math.round(base[i*3+c]*a+mu[i*3+c]*(1-a))}
  await sharp(out,{raw:{width:W,height:H,channels:3}}).png().toFile('MU1b-muro-compuesto.png');
  console.log('ok');
})();
