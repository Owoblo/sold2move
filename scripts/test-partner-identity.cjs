const {test}=require('node:test'),a=require('node:assert/strict');const {matchContact}=require('./partner-identity.cjs');
const c={id:'1',name:'Mary Smith',phone:'+14165550123',email:'mary@example.com',company:'RE/MAX'};
test('direct phone and name links existing partner',()=>a.equal(matchContact({name:'MARY SMITH',phone:'416-555-0123'},[c]).contact.id,'1'));
test('same name and brokerage is review only',()=>a.equal(matchContact({name:c.name,brokerage:c.company},[c]).status,'ambiguous'));
test('shared phone never auto links or creates',()=>a.equal(matchContact({name:c.name,phone:c.phone},[c,{...c,id:'2'}]).status,'ambiguous'));
test('different name on same number is identity conflict',()=>a.equal(matchContact({name:'John Smith',phone:c.phone},[c]).status,'ambiguous'));
test('phone and email pointing to different contacts is conflict',()=>a.equal(matchContact({name:c.name,phone:c.phone,email:'other@example.com'},[c,{...c,id:'2',phone:'5195550000',email:'other@example.com'}]).status,'ambiguous'));
test('new person is a discovery not a send authorization',()=>a.equal(matchContact({name:'New Agent',phone:'5195550000'},[c]).status,'new'));
