'use strict';
const S=require('../lib/security'),R=require('../lib/reports'),db=require('../lib/db');
module.exports=async(req,res)=>{S.headers(res);try{if(req.method!=='GET')throw new S.HttpError(405,'Метод не поддерживается.');if(!R.storageReady())throw new S.HttpError(503,'Проверка оплаты временно недоступна.');const row=await R.owned(req.query?.id,S.session(req,res)),p=await db.one('SELECT status FROM payments WHERE report_id=? ORDER BY created_at DESC LIMIT 1',[row.id]);S.json(res,200,{...R.entitlement(row),paymentStatus:p?.status||'none'});}catch(e){S.fail(res,e);}};
