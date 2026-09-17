'use strict';
const S=require('./security');
function mode(){return process.env.PAYMENT_PROVIDER||'demo';}
function configured(){const key=process.env.PAYMENT_SECRET_KEY||'';return mode()==='stripe'&&/^(sk|rk)_(test|live)_/.test(key)&&Boolean(process.env.PAYMENT_WEBHOOK_SECRET&&process.env.PAYMENT_PRICE_ID&&/^https:\/\//.test(process.env.APP_URL||''));}
function config(){return {checkoutAvailable:configured(),paymentMode:mode()==='stripe'?(process.env.PAYMENT_SECRET_KEY?.includes('_live_')?'live':'test'):'demo',priceLabel:'$1.99',amount:199,currency:'usd'};}
function stripe(){if(!configured())throw new S.HttpError(503,'Покупка пока недоступна. Оплата не списана.');return new (require('stripe'))(process.env.PAYMENT_SECRET_KEY,{maxNetworkRetries:1,timeout:12000});}
function provider(){
 if(mode()==='demo')return {kind:'demo',async create(){throw new S.HttpError(503,'Демонстрационный режим: платежи не принимаются, Premium не разблокируется.');}};
 if(mode()!=='stripe')throw new S.HttpError(503,'Покупка пока недоступна.');
 return {kind:'stripe',
 async price(){const p=await stripe().prices.retrieve(process.env.PAYMENT_PRICE_ID);if(!p.active||p.type!=='one_time'||p.currency!=='usd'||p.unit_amount!==199)throw new S.HttpError(503,'Покупка временно недоступна: цена требует настройки.');return p;},
 async create(payment){const origin=process.env.APP_URL.replace(/\/$/,'');return stripe().checkout.sessions.create({mode:'payment',payment_method_types:['card'],line_items:[{price:payment.price_id,quantity:1}],client_reference_id:payment.report_id,metadata:{report_id:payment.report_id,payment_id:payment.id},success_url:`${origin}/?report=${payment.report_id}&checkout=return`,cancel_url:`${origin}/?report=${payment.report_id}&checkout=cancel`,expires_at:Math.floor(payment.expires_at/1000)},{idempotencyKey:'para-checkout-'+payment.id});},
 async retrieve(id){return stripe().checkout.sessions.retrieve(id);},
 verify(raw,signature){return stripe().webhooks.constructEvent(raw,signature,process.env.PAYMENT_WEBHOOK_SECRET,300);}
 };
}
module.exports={provider,config,configured};
