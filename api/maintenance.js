'use strict';
const S=require('../lib/security'),cleanup=require('../lib/maintenance');
module.exports=async(req,res)=>{try{S.post(req,res);if(!S.admin(req))throw new S.HttpError(401,'Доступ закрыт.');S.json(res,200,await cleanup());}catch(e){S.fail(res,e);}};
