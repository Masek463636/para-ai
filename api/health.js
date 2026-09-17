'use strict';
const S=require('../lib/security'),db=require('../lib/db'),R=require('../lib/reports'),P=require('../lib/payments');
module.exports=async(req,res)=>{S.headers(res);if(req.method!=='GET')return S.json(res,405,{error:'Метод не поддерживается.'});let ready=false;try{if(R.storageReady()){await db.one('SELECT id FROM reports LIMIT 1');ready=true;}}catch{}S.json(res,200,{version:8,analysisAvailable:Boolean(process.env.GEMINI_API_KEY),storageAvailable:ready,coachAvailable:ready&&Boolean(process.env.GEMINI_API_KEY),...P.config(),checkoutAvailable:ready&&P.configured()});};
