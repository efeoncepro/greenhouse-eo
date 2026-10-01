// Tamaño de muestra por brazo para comparar dos proporciones (bilateral, α = 0,05, potencia 80 %).
const za=1.959964,zb=0.841621;
const n=(p1,p2)=>Math.ceil(((za*Math.sqrt(2*((p1+p2)/2)*(1-(p1+p2)/2))+zb*Math.sqrt(p1*(1-p1)+p2*(1-p2)))**2)/((p2-p1)**2));
console.log('base → línea | n por brazo');
for(const [p1,p2] of [[.10,.20],[.15,.25],[.20,.30],[.30,.40],[.10,.25],[.20,.35]])console.log(`${p1*100}% → ${p2*100}% | ${n(p1,p2)}`);
