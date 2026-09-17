'use strict';
// Small local server for the same API modules. Not used by Vercel.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
const assets=new Map([['/','index.html'],['/app.js','app.js'],['/questionnaire.js','questionnaire.js'],['/result.css','result.css'],['/admin','admin.html'],['/admin.js','admin.js'],['/admin.css','admin.css'],['/tests/viewport','tests/viewport.html']]);
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(/^\/api\/[a-z-]+$/.test(url.pathname)){
 const file=path.join(root,url.pathname+'.js');if(!fs.existsSync(file)){res.writeHead(404);return res.end();}req.query=Object.fromEntries(url.searchParams);const chunks=[];let len=0;for await(const c of req){len+=c.length;if(len>262144){res.writeHead(413);return res.end();}chunks.push(c);}const raw=Buffer.concat(chunks);req.body=url.pathname==='/api/webhook'?raw:raw.length?JSON.parse(raw.toString()):undefined;return await require(file)(req,res);}
 const file=assets.get(url.pathname);if(!file){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');res.end(fs.readFileSync(path.join(root,file)));
 }catch{res.statusCode=500;res.end('Request unavailable');}}).listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('PARA local server: http://localhost:'+(process.env.PORT||3000)));
