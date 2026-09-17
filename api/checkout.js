'use strict';
const S=require('../lib/security'),R=require('../lib/reports'),checkout=require('../lib/checkout');
module.exports=async(req,res)=>{try{S.post(req,res);if(!R.storageReady())throw new S.HttpError(503,'Покупка пока недоступна. Оплата не списана.');return S.json(res,200,await checkout(req.body?.reportId,S.session(req,res)));}catch(e){S.fail(res,e);}};
