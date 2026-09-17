'use strict';
require('../lib/maintenance')().then(r=>console.log(JSON.stringify(r))).catch(()=>{console.error('Cleanup failed. Check database configuration.');process.exitCode=1;}).finally(()=>require('../lib/db').close());
