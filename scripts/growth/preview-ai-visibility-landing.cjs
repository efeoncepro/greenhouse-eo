const http = require('node:http');
const fs = require('node:fs');
// Local QA harness only: serves the compiled browser-safe candidate; all mutations are denied.
const contractPath = process.argv[2];

if (!contractPath) throw new Error('Usage: node scripts/growth/preview-ai-visibility-landing.cjs <compiled-contract.json>');
const contract = JSON.parse(fs.readFileSync(contractPath,'utf8'));

contract.telemetryPolicy = {...contract.telemetryPolicy, enabled:false, gtmDataLayer:false};
const formPath = '/api/public/growth/forms/69cd5269-5f97-4d32-99c4-0b23f41aa2f5';

http.createServer(async (req,res)=>{
  const url = new URL(req.url,'http://localhost:4332');

  if(req.method !== 'GET') {res.writeHead(405, {'content-type':'application/json'}); res.end('{"error":"QA preview: submissions disabled"}');

return;}

  if(url.pathname === formPath) {res.setHeader('content-type','application/json');res.end(JSON.stringify(contract));

return;}

  if(url.pathname.startsWith('/api/')) {res.writeHead(404);res.end();

return;}

  if(url.pathname === '/growth-forms/renderer-latest.js') {
    res.setHeader('content-type','text/javascript');res.end(fs.readFileSync('public/growth-forms/renderer-latest.js'));

return;
  }

  try {
    const upstream = await fetch('http://localhost:4331'+req.url);
    const type=upstream.headers.get('content-type')||'application/octet-stream';

    res.writeHead(upstream.status,{'content-type':type,'cache-control':'no-store'});
    if(type.includes('text/html')) {
      let html=await upstream.text();

      html=html.replace(/base-url="[^"]+"/g,'base-url="http://localhost:4332"').replace(/src="https?:[^\"]*\/growth-forms\/renderer-latest.js"/g,'src="/growth-forms/renderer-latest.js"');
      html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, tag => /googletagmanager|google-analytics/.test(tag) ? '' : tag);
      html=html.replace('</body>','<aside style="position:fixed;bottom:0;left:0;right:0;z-index:10000;background:#091951;color:white;text-align:center;font:12px system-ui;padding:6px">Vista local de QA · Contrato candidato · Envíos deshabilitados</aside></body>');
      res.end(html);
    } else res.end(Buffer.from(await upstream.arrayBuffer()));
  }catch {res.end('QA upstream unavailable');}
}).listen(4332,'127.0.0.1',()=>console.log('QA preview http://localhost:4332/brand-visibility; POST disabled'));
