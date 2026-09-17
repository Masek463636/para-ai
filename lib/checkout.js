'use strict';
const db=require('./db'),S=require('./security'),R=require('./reports'),P=require('./payments'),events=require('./events');const {randomUUID}=require('node:crypto');
async function checkout(id,owner){const provider=P.provider();if(provider.kind==='demo')return provider.create();const row=await R.owned(id,owner);
 if(row.premium_unlocked)return {unlocked:true};if(row.status!=='complete')throw new S.HttpError(409,'Сначала дождитесь полного анализа.');if(row.expires_at-Date.now()<86400000)throw new S.HttpError(410,'Срок хранения отчёта заканчивается. Покупка отключена.');
 if(!await R.rate(owner,'checkout',10,600000))throw new S.HttpError(429,'Слишком много попыток оплаты. Подождите немного.');
 const old=await db.one("SELECT * FROM payments WHERE report_id=? AND status IN ('creating','pending','paid','refunded','disputed')",[id]);
 if(old?.provider_payment_id&&old.status==='pending'){
  const remote=await provider.retrieve(old.provider_payment_id);
  if(remote.status==='expired')await db.execute("UPDATE payments SET status='expired' WHERE id=? AND status='pending'",[old.id]);
  else if(remote.status==='complete')return {pending:true,message:'Платёж обрабатывается. Дождитесь подтверждения.'};
 }
 await provider.price();
 const payment=await db.transaction(async tx=>{
 const r=await R.owned(id,owner,tx);if(r.premium_unlocked)return null;
 const existing=await db.one("SELECT * FROM payments WHERE report_id=? AND status IN ('creating','pending','paid','refunded','disputed')",[id],tx);if(existing)return existing;
 const now=Date.now(),pid=randomUUID();await db.execute('INSERT INTO payments(id,provider,status,amount,currency,price_id,report_id,created_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?)',[pid,'stripe','creating',199,'usd',process.env.PAYMENT_PRICE_ID,id,now,now+3600000],tx);return db.one('SELECT * FROM payments WHERE id=?',[pid],tx);
 });
 if(!payment)return {unlocked:true};if(['refunded','disputed'].includes(payment.status))throw new S.HttpError(409,'По этой покупке оформлен возврат или спор. Обратитесь к владельцу сервиса.');if(payment.status==='paid')return {pending:true};
 if(payment.checkout_url&&payment.status==='pending')return {url:payment.checkout_url};
 // Reuse the same provider idempotency key after a timeout. Never create an ambiguous second charge.
 if(payment.expires_at<=Date.now())throw new S.HttpError(409,'Сессия оплаты требует проверки владельцем сервиса. Деньги повторно не списываются.');
 const remote=await provider.create(payment);
 if(!remote.url||!/^https:\/\/checkout\.stripe\.com\//.test(remote.url))throw Error('Invalid checkout URL');
 await db.transaction(async tx=>{await db.execute("UPDATE payments SET provider_payment_id=?,checkout_url=?,status=CASE WHEN status='creating' THEN 'pending' ELSE status END WHERE id=?",[remote.id,remote.url,payment.id],tx);await events.record(owner,'checkout_started',payment.id,tx);});return {url:remote.url};
}
module.exports=checkout;
