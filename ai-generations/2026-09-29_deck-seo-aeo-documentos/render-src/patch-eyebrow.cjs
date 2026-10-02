const sharp=require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
(async()=>{for(const f of process.argv.slice(2)){const strip=await sharp(f).extract({left:130,top:96,width:460,height:26}).toBuffer();const b=await sharp(f).composite([{input:strip,left:130,top:120}]).png().toBuffer();await sharp(b).toFile(f);console.log('patched',f)}})();
