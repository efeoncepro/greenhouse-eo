// Reproducción de regresión de la conciliación editorial del 2026-09-03.
// Valida comportamiento con resultados independientes; no valida Notion ni ejecución de writes.
import assert from 'node:assert/strict';
const map = {"48":52,"49":53,"50":54,"51":48,"52":49,"53":50,"54":55,"55":56,"56":57,"57":58,"58":59,"59":51};
function transform(input,map){
const protectedRe=/(?:https?:\/\/[^\s<>"\])]+)|(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(?:webp|png|jpe?g|gif|svg|mp4|mov|pdf|psd|ai|fig)\b)|(?:\b[Nn]\d{2,}_[A-Za-z0-9_-]+)/g;
const protectedParts=[];let s=input.replace(protectedRe,m=>{protectedParts.push(m);return `§PROTECTED${protectedParts.length-1}§`;});
const rangeParts=[];
s=s.replace(/\bN(\d{2,})\s*[–—-]\s*N(\d{2,})(?!\d)/g,(m,a,b)=>{
a=+a;b=+b;if(a>b||b-a>40)return m;
const nums=Array.from({length:b-a+1},(_,i)=>map[a+i]||a+i);if(nums.every((n,i)=>n===a+i))return m;
const chunks=[];for(let i=0;i<nums.length;i++){let e=i;while(e+1<nums.length&&nums[e+1]===nums[e]+1)e++;chunks.push(e>i?`N${nums[i]}–N${nums[e]}`:`N${nums[i]}`);i=e;}
rangeParts.push(chunks.join(", "));return `§RANGE${rangeParts.length-1}§`;
});
s=s.replace(/\bN(\d{2,})(?!\d)/g,(m,n)=>map[n]?`N${map[n]}`:m);
s=s.replace(/§RANGE(\d+)§/g,(_,i)=>rangeParts[+i]);
return s.replace(/§PROTECTED(\d+)§/g,(_,i)=>protectedParts[+i]);
}
const cases = [
  [
    "Artículo N48 - 79 años de Rayados",
    "Artículo N52 - 79 años de Rayados"
  ],
  [
    "N48 — 79 años de Rayados",
    "N52 — 79 años de Rayados"
  ],
  [
    "N51–N58",
    "N48–N50, N55–N59"
  ],
  [
    "N51 N48 N59",
    "N48 N52 N51"
  ],
  [
    "Banner N1–N4; N53_PASO-1; N53",
    "Banner N1–N4; N53_PASO-1; N50"
  ],
  [
    "N59_FB_navidad-base-acento.webp N59",
    "N59_FB_navidad-base-acento.webp N51"
  ],
  [
    "https://example.org/N59 N59",
    "https://example.org/N59 N51"
  ],
  [
    "N35–N42",
    "N35–N42"
  ]
];
for (const [input, expected] of cases) assert.equal(transform(input, map), expected, input);
console.log(`${cases.length} casos de regresión correctos`);
