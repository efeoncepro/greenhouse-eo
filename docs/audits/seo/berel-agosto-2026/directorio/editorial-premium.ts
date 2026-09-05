import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const here=path.dirname(fileURLToPath(import.meta.url))
export async function enhanceEditorial(page:any,slide:any){
  const id=slide.slideId
  if(id==='acumulado'){
    const images=await Promise.all(['acabados','temperatura'].map(async name=>'data:image/png;base64,'+(await fs.readFile(path.join(here,'assets',name+'.png'))).toString('base64')))
    await page.evaluate(({images}:any)=>{
      const content=document.querySelector('.metrics')!
      const metrics=[...content.children];content.classList.add('production-evidence');content.classList.remove('metrics')
      const stats=document.createElement('div');stats.className='production-stats';metrics.forEach(n=>stats.appendChild(n));content.appendChild(stats)
      const examples=document.createElement('div');examples.className='production-examples'
      examples.innerHTML=`<div class="examples-label">DOS PIEZAS DEL PROGRAMA EDITORIAL</div><div class="examples-pair"><figure><img src="${images[0]}" alt="Imagen publicada del artículo comparativo de acabados"><figcaption><strong>Elegir el acabado</strong><span>Comparativa de mate, semibrillante y brillante</span></figcaption></figure><figure><img src="${images[1]}" alt="Imagen publicada del artículo sobre temperatura del hogar"><figcaption><strong>Entender el calor en casa</strong><span>Explicación y soluciones según la superficie</span></figcaption></figure></div>`
      content.appendChild(examples)
    },{images})
  }
  if(id==='decisiones'){
    await page.evaluate(()=>{
      const content=document.querySelector('.cards')!;content.classList.add('decision-meeting');content.classList.remove('cards')
      const rows=document.createElement('div');rows.className='decision-agenda';[...content.children].forEach(n=>rows.appendChild(n))
      content.insertAdjacentHTML('afterbegin','<div class="next-review"><span>PRÓXIMA REVISIÓN PREVISTA</span><strong>06</strong><b>Octubre 2026</b><p>Un corte para comprobar avances y acordar el siguiente paso.</p></div>');content.appendChild(rows)
    })
  }
  if(id==='continuidad'){
    await page.evaluate(()=>{
      document.querySelector('.cards')!.classList.add('technical-register')
      document.querySelectorAll('.card').forEach((n,i)=>n.insertAdjacentHTML('afterbegin',`<span class="register-number">0${i+1}</span>`))
    })
  }
}
