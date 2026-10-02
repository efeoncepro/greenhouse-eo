// Análisis de la prueba sin logo. Uso: node analisis.mjs respuestas.csv
// CSV esperado (una fila por persona y pieza): persona,version,pieza,cerrada,abierta_efeonce,atencion_ok,conocia_efeonce
//  version ∈ {linea,distractor} · cerrada = opción elegida · abierta_efeonce ∈ {0,1} (codificada) · atencion_ok ∈ {0,1}
import {readFileSync} from 'node:fs';
const [,,file]=process.argv;if(!file){console.error('Uso: node analisis.mjs respuestas.csv');process.exit(2);}
const [h,...rows]=readFileSync(file,'utf8').trim().split(/\r?\n/);const cols=h.split(',');const R=rows.map(r=>Object.fromEntries(r.split(',').map((v,i)=>[cols[i],v])));
const ok=R.filter(r=>r.atencion_ok==='1');
const porPersona=v=>{const m=new Map();for(const r of ok.filter(r=>r.version===v)){const a=m.get(r.persona)??{c:0,n:0,o:0};a.n++;a.c+=r.cerrada==='Efeonce'?1:0;a.o+=r.abierta_efeonce==='1'?1:0;m.set(r.persona,a);}return [...m.values()];};
const tasa=(xs,k)=>{const t=xs.reduce((s,x)=>s+x[k]/x.n,0);return {n:xs.length,p:t/xs.length};};
const z2=(a,b)=>{const p=(a.p*a.n+b.p*b.n)/(a.n+b.n),se=Math.sqrt(p*(1-p)*(1/a.n+1/b.n)),z=(a.p-b.p)/se,pv=2*(1-cdf(Math.abs(z)));const se2=Math.sqrt(a.p*(1-a.p)/a.n+b.p*(1-b.p)/b.n);return {dif:a.p-b.p,ic:[a.p-b.p-1.96*se2,a.p-b.p+1.96*se2],z,p:pv};};
function cdf(x){const t=1/(1+.2316419*x),d=.3989423*Math.exp(-x*x/2);return 1-d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));}
const L=porPersona('linea'),D=porPersona('distractor');const pct=x=>(x*100).toFixed(1)+' %';
for(const [k,nom] of [['c','Atribución asistida (principal)'],['o','Atribución espontánea']]){const a=tasa(L,k),b=tasa(D,k),t=z2(a,b);
 console.log(`${nom}: línea ${pct(a.p)} (n=${a.n}) · distractor ${pct(b.p)} (n=${b.n}) · diferencia ${pct(t.dif)} [IC95 ${pct(t.ic[0])}, ${pct(t.ic[1])}] · p=${t.p.toFixed(4)}`);}
const pr=tasa(L,'c'),pd=tasa(D,'c'),res=z2(pr,pd);console.log(res.dif>=.10&&res.p<.05?'RESULTADO: éxito (≥ 10 puntos, p < 0,05).':'RESULTADO: no alcanza el umbral de éxito.');
const piezas=[...new Set(ok.map(r=>r.pieza))].sort();console.log('\nPor pieza (atribución asistida):');
for(const pz of piezas){const f=v=>{const xs=ok.filter(r=>r.version===v&&r.pieza===pz);return xs.filter(r=>r.cerrada==='Efeonce').length/Math.max(1,xs.length);};console.log(`  ${pz}: línea ${pct(f('linea'))} · distractor ${pct(f('distractor'))}`);}
