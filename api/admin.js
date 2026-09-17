'use strict';
const S=require('../lib/security'),db=require('../lib/db');
module.exports=async(req,res)=>{S.headers(res);try{if(req.method!=='GET')throw new S.HttpError(405,'Метод не поддерживается.');if(!S.admin(req))throw new S.HttpError(401,'Доступ закрыт.');const since=Date.now()-30*86400000;
 const counts=(await db.execute('SELECT event_name,COUNT(*) AS events,COUNT(DISTINCT anonymous_session_id) AS sessions FROM analytics_events WHERE created_at>=? GROUP BY event_name',[since])).rows;
 const n=name=>Number(counts.find(x=>x.event_name===name)?.sessions||0),sessions=Number((await db.one('SELECT COUNT(DISTINCT anonymous_session_id) AS n FROM analytics_events WHERE created_at>=?',[since])).n);
 S.json(res,200,{periodDays:30,totalSessions:sessions,testsStarted:n('test_started'),testsCompleted:n('person2_completed'),analysisCompleted:n('analysis_completed'),paywallViews:n('paywall_viewed'),checkoutStarts:n('checkout_started'),purchases:n('purchase_completed'),conversionRate:sessions?Math.round(n('purchase_completed')/sessions*10000)/100:0,events:counts});
 }catch(e){S.fail(res,e);}};
