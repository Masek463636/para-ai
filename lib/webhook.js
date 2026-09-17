'use strict';
const db=require('./db'),S=require('./security'),events=require('./events');
async function apply(event){return db.transaction(async tx=>{
 if(await db.one('SELECT id FROM webhook_events WHERE id=?',[event.id],tx))return {duplicate:true};
 const object=event.data?.object;
 if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
 const p=await db.one('SELECT * FROM payments WHERE id=?',[object.metadata?.payment_id||''],tx);
 if(!p)throw new S.HttpError(409,'Платёж ещё не зарегистрирован.');
 if(p.provider!=='stripe'||object.metadata?.report_id!==p.report_id||object.client_reference_id!==p.report_id||object.amount_total!==p.amount||object.currency!==p.currency||object.mode!=='payment'||p.provider_payment_id&&p.provider_payment_id!==object.id)throw new S.HttpError(400,'Параметры платежа не совпадают.');
 if(object.payment_status==='paid'){
 const intent=typeof object.payment_intent==='string'?object.payment_intent:object.payment_intent?.id;
 if(!intent)throw new S.HttpError(400,'Нет подтверждения платежа.');
 const blocked=await db.one('SELECT status FROM revoked_intents WHERE id=?',[intent],tx);
 if(!blocked&&!['refunded','disputed'].includes(p.status)){
 const report=await db.one('SELECT * FROM reports WHERE id=?',[p.report_id],tx);if(!report)throw new S.HttpError(409,'Отчёт не найден.');
 await db.execute("UPDATE payments SET status='paid',provider_payment_id=?,payment_intent_id=? WHERE id=?",[object.id,intent,p.id],tx);
 await db.execute('UPDATE reports SET premium_unlocked=1,payment_id=? WHERE id=?',[p.id,p.report_id],tx);
 await events.record(report.anonymous_session_id,'purchase_completed',p.id,tx);
 }else{await db.execute('UPDATE payments SET status=?,payment_intent_id=?,provider_payment_id=? WHERE id=?',[blocked?.status||p.status,intent,object.id,p.id],tx);await db.execute('UPDATE reports SET premium_unlocked=0 WHERE id=?',[p.report_id],tx);}
 }
 }else if(['charge.refunded','charge.dispute.created'].includes(event.type)){
 const intent=typeof object.payment_intent==='string'?object.payment_intent:object.payment_intent?.id;
 if(intent){const status=event.type==='charge.refunded'?'refunded':'disputed';await db.execute('INSERT OR REPLACE INTO revoked_intents(id,status,created_at) VALUES(?,?,?)',[intent,status,Date.now()],tx);const p=await db.one('SELECT * FROM payments WHERE payment_intent_id=?',[intent],tx);if(p){await db.execute('UPDATE payments SET status=? WHERE id=?',[status,p.id],tx);await db.execute('UPDATE reports SET premium_unlocked=0 WHERE id=?',[p.report_id],tx);}}
 }else if(['checkout.session.expired','checkout.session.async_payment_failed'].includes(event.type)){
 await db.execute("UPDATE payments SET status='expired' WHERE provider_payment_id=? AND status IN ('creating','pending')",[object.id],tx);
 }
 await db.execute('INSERT INTO webhook_events(id,provider,created_at) VALUES(?,?,?)',[event.id,'stripe',Date.now()],tx);return {received:true};
 });}
module.exports=apply;
