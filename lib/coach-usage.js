'use strict';
const db=require('./db'),S=require('./security'),R=require('./reports'),events=require('./events');const {randomUUID}=require('node:crypto');
async function reserve(id,owner,requestId,question){if(!S.UUID.test(requestId||''))throw new S.HttpError(400,'Не удалось распознать запрос. Обновите страницу.');const hash=S.privateHash(question);return db.transaction(async tx=>{
 const row=await R.owned(id,owner,tx);if(row.status!=='complete')throw new S.HttpError(409,'Дождитесь полного анализа.');
 let old=await db.one('SELECT * FROM coach_usage WHERE report_id=? AND (request_id=? OR question_hash=?) ORDER BY created_at LIMIT 1',[id,requestId,hash],tx);
 if(old&&old.question_hash!==hash)throw new S.HttpError(409,'Повторный запрос должен содержать тот же вопрос.');
 if(old?.status==='complete')return {answer:S.open(old.answer_cipher),row};
 if(old?.status==='pending'&&old.lease_until>Date.now())return {pending:true,row};
 await db.execute("UPDATE coach_usage SET status='failed' WHERE report_id=? AND status='pending' AND lease_until<=?",[id,Date.now()],tx);
 const pending=(await db.execute("SELECT type,COUNT(*) AS n FROM coach_usage WHERE report_id=? AND status='pending' GROUP BY type",[id],tx)).rows;
 const count=type=>Number(pending.find(x=>x.type===type)?.n||0);
 const type=row.coach_free_used+count('free')<1?'free':row.premium_unlocked&&row.coach_paid_used+count('paid')<8?'paid':null;
 if(!type)throw new S.HttpError(402,row.premium_unlocked?'Все 8 дополнительных сообщений использованы.':'Бесплатный вопрос использован. Продолжение доступно в Premium.');
 const usageId=old?.id||randomUUID(),attempt=randomUUID(),now=Date.now();
 if(old)await db.execute("UPDATE coach_usage SET type=?,status='pending',lease_until=?,attempt_id=? WHERE id=?",[type,now+90000,attempt,usageId],tx);
 else await db.execute('INSERT INTO coach_usage(id,report_id,request_id,question_hash,type,status,created_at,lease_until,attempt_id) VALUES(?,?,?,?,?,?,?,?,?)',[usageId,id,requestId,hash,type,'pending',now,now+90000,attempt],tx);
 return {row,usageId,attempt,type};
 });}
async function finish(slot,answer){return db.transaction(async tx=>{const row=await db.one('SELECT * FROM reports WHERE id=? AND expires_at>?',[slot.row.id,Date.now()],tx);if(!row||slot.type==='paid'&&!row.premium_unlocked)throw new S.HttpError(403,'Доступ к этому отчёту завершён.');const updated=await db.execute("UPDATE coach_usage SET status='complete',answer_cipher=?,lease_until=0 WHERE id=? AND attempt_id=? AND status='pending'",[S.seal(answer),slot.usageId,slot.attempt],tx);if(!updated.rowsAffected)throw new S.HttpError(409,'Этот запрос уже обрабатывается повторно.');const col=slot.type==='free'?'coach_free_used':'coach_paid_used';await db.execute(`UPDATE reports SET ${col}=${col}+1 WHERE id=?`,[row.id],tx);await events.record(row.anonymous_session_id,slot.type==='free'?'coach_free_used':'coach_paid_used',slot.usageId,tx);return R.entitlement(await db.one('SELECT * FROM reports WHERE id=?',[row.id],tx));});}
async function release(slot){if(slot?.usageId)await db.execute("UPDATE coach_usage SET status='failed',lease_until=0 WHERE id=? AND attempt_id=? AND status='pending'",[slot.usageId,slot.attempt]);}
module.exports={reserve,finish,release};
