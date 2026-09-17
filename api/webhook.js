'use strict';
const S=require('../lib/security'),P=require('../lib/payments'),R=require('../lib/reports'),apply=require('../lib/webhook');
module.exports=async(req,res)=>{S.headers(res);try{
 if(req.method!=='POST')throw new S.HttpError(405,'Метод не поддерживается.');if(!R.storageReady()||!P.configured())throw new S.HttpError(503,'Интеграция не настроена.');
 let raw;if(Buffer.isBuffer(req.body)||typeof req.body==='string')raw=Buffer.from(req.body);else{const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>262144)throw new S.HttpError(413,'Слишком большой запрос.');chunks.push(Buffer.from(chunk));}raw=Buffer.concat(chunks);}
 if(raw.length>262144)throw new S.HttpError(413,'Слишком большой запрос.');let event;
 try{event=P.provider().verify(raw,req.headers['stripe-signature']);}catch{throw new S.HttpError(400,'Подпись не подтверждена.');}
 if(Boolean(event.livemode)!==(P.config().paymentMode==='live'))throw new S.HttpError(400,'Режим платежа не совпадает.');
 const result=await apply(event);return S.json(res,200,result);
 }catch(e){S.fail(res,e);}};
module.exports.config={api:{bodyParser:false}};
