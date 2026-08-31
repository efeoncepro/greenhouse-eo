/** Additive native CMS brand controls; preserve every approved source key. */
const brands=[['wordpress','WordPress','png'],['webflow','Webflow','svg'],['drupal','Drupal','svg'],['modyo','Modyo','svg']];

function cmsLogosTree(H,T){return H('ul',{class:'cm-cms-logos','aria-label':'Ejemplos de CMS'},[['wordpress','WordPress','png'],['webflow','Webflow','svg'],['drupal','Drupal','svg'],['modyo','Modyo','svg']].map(([id,name,ext])=>H('li',{},[H('span',{class:'cm-cms-logo'},[H('img',{src:'assets/cms/'+id+'.'+ext,alt:'',width:96,height:56,loading:'lazy',decoding:'async'},[])]),H('span',{},[T(name)])])));}

function injectCmsLogos(tree,H,T){
 const anchor=T('Los CMS que podemos nombrar como capacidad verificada se confirman en la conversación inicial. Mientras tanto hablamos de «el CMS de tu equipo».');

 function walk(node){if(!node||typeof node==='string')return;node.children=node.children.flatMap(child=>{if(child?.tag==='p'&&child.children.join('')===anchor)return[cmsLogosTree(H,T),child];walk(child);

return[child];});}

walk(tree);

return tree;
}

function apply(schema,html){
 for(const[id,name,ext]of brands){for(const[key,type,value]of [[`cms_${id}_logo`,'media',`assets/cms/${id}.${ext}`],[`cms_${id}_name`,'text',name]]){
 if(!schema.fields.some(f=>f.key===key))schema.fields.push({key,type,label:(type==='media'?'Logo CMS · ':'Nombre CMS · ')+name,sourceValue:value});schema.defaults[key]??=type==='media'?{url:value,id:0}:value;}}

 const marker='<p style="margin:0;padding:12px 14px;';

if(!html.includes('class="cm-cms-logos"')){if(!html.includes(marker))throw Error('CMS disclosure anchor drift');const group='<ul class="cm-cms-logos" aria-label="Ejemplos de CMS">'+brands.map(([id])=>`<li><span class="cm-cms-logo"><img src="%%cms_${id}_logo%%" alt="" width="96" height="56" loading="lazy" decoding="async"></span><span>%%cms_${id}_name%%</span></li>`).join('')+'</ul>';

html=html.replace(marker,group+marker);}

return html;
}

module.exports={apply,clientSource:cmsLogosTree.toString()+'\n'+injectCmsLogos.toString()};
