'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');let count=0;
function scan(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','.vercel'].includes(ent.name))continue;const file=path.join(dir,ent.name);if(ent.isDirectory())scan(file);else if(/\.(?:js|cjs)$/.test(file)){const r=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(r.status)process.exit(r.status);count++;}}}scan('.');console.log(`Syntax checked: ${count} JavaScript files.`);
