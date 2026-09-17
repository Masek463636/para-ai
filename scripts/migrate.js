'use strict';
const fs=require('node:fs'),path=require('node:path'),db=require('../lib/db');
async function migrate(){await db.getDb().executeMultiple(fs.readFileSync(path.join(__dirname,'../db/schema.sql'),'utf8'));}
if(require.main===module)migrate().then(()=>console.log('Database schema ready.')).catch(()=>{console.error('Migration failed. Check database credentials and connectivity.');process.exitCode=1;}).finally(()=>db.close());
module.exports=migrate;
