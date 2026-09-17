'use strict';
const db=require('./db');const {randomUUID}=require('node:crypto');
const clientEvents=new Set(['landing_view','test_started','person1_completed','person2_completed','paywall_viewed']);
const names=[...clientEvents,'analysis_started','analysis_completed','checkout_started','purchase_completed','coach_free_used','coach_paid_used'];
async function record(session,event,entity='',connection){if(!session||!names.includes(event))return;await db.execute('INSERT OR IGNORE INTO analytics_events(id,anonymous_session_id,event_name,entity_id,created_at) VALUES(?,?,?,?,?)',[randomUUID(),session,event,entity,Date.now()],connection);}
module.exports={clientEvents,names,record};
