'use strict';
let client, identity;
function configured(){return Boolean(process.env.TURSO_DATABASE_URL);}
function getDb(){
 const url=process.env.TURSO_DATABASE_URL;
 if(!url)throw Error('Database not configured');
 if(process.env.VERCEL&&(!/^libsql:\/\//.test(url)||!process.env.TURSO_AUTH_TOKEN))throw Error('Remote database required');
 const key=url+'|'+(process.env.TURSO_AUTH_TOKEN||'');
 if(!client||identity!==key){client?.close();client=null;identity=null;client=require('@libsql/client').createClient({url,authToken:process.env.TURSO_AUTH_TOKEN||undefined});identity=key;}
 return client;
}
async function execute(sql,args=[],db=getDb()){return db.execute({sql,args});}
async function one(sql,args=[],db=getDb()){return (await execute(sql,args,db)).rows[0];}
async function transaction(fn){const tx=await getDb().transaction('write');try{const result=await fn(tx);await tx.commit();return result;}catch(e){await tx.rollback().catch(()=>{});throw e;}finally{tx.close();}}
function close(){client?.close();client=null;identity=null;}
module.exports={configured,getDb,execute,one,transaction,close};
