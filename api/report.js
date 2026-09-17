'use strict';
const S=require('../lib/security'),R=require('../lib/reports'),db=require('../lib/db');
module.exports=async(req,res)=>{S.headers(res);try{if(!R.storageReady())throw new S.HttpError(503,'Серверное сохранение сейчас недоступно.');const owner=S.session(req,res),id=req.query?.id||req.body?.reportId;const row=await R.owned(id,owner);
 if(req.method==='DELETE'){if(!S.sameOrigin(req))throw new S.HttpError(403,'Запрос отклонён.');await db.transaction(async tx=>{await db.execute('DELETE FROM coach_usage WHERE report_id=?',[id],tx);await db.execute('DELETE FROM payments WHERE report_id=?',[id],tx);await db.execute('DELETE FROM analytics_events WHERE anonymous_session_id=? AND entity_id=?',[owner,id],tx);await db.execute('DELETE FROM reports WHERE id=? AND anonymous_session_id=?',[id,owner],tx);});return S.json(res,200,{deleted:true});}
 if(req.method!=='GET')throw new S.HttpError(405,'Метод не поддерживается.');
 return S.json(res,200,row.content_cipher?R.response(row,S.open(row.content_cipher)):{reportId:id,status:row.status,storageAvailable:true});
 }catch(e){S.fail(res,e);}};
