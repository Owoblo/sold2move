const fs=require('node:fs'),path=require('node:path');
const {sync}=require('./partnership-listing-sync.cjs');
async function run(){
 const lane=process.argv[2];let failed=0;
 for(const name of fs.readdirSync(__dirname).filter(n=>n.startsWith('.pipeline-'))){
  if(lane && name!==`.pipeline-${lane==='rental'?'rentals':lane}`) continue;
  if(!lane && ['.pipeline-rentals','.pipeline-commercial'].includes(name))continue;
  const base=path.join(__dirname,name),pointer=path.join(base,'latest-run.txt');if(!fs.existsSync(pointer))continue;
  const id=fs.readFileSync(pointer,'utf8').trim();if(!/^[a-zA-Z0-9_.:-]+$/.test(id))continue;
  const dirs=[path.join(base,'batches',id.replace(/[^a-zA-Z0-9_-]/g,'_')),path.join(base,id)];
  for(const dir of dirs){const file=path.join(dir,'partnership-input.json');if(!fs.existsSync(file))continue;
   try{const result=await sync(JSON.parse(fs.readFileSync(file)));fs.writeFileSync(path.join(dir,'partnership-sync-summary.json'),JSON.stringify(result,null,2));console.log(name,result)}
   catch(e){failed++;fs.writeFileSync(path.join(dir,'partnership-sync-error.json'),JSON.stringify({error:e.message}));console.error(name,e.message)}
  }
 }
 if(failed)process.exitCode=1;
}
run().catch(e=>{console.error(e.message);process.exitCode=1});
