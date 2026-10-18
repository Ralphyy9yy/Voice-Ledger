import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {z} from 'zod';
import {recordingLanguageSchema} from '@voiceledger/shared';
import {config} from '../apps/server/src/config/index.js';
import {OllamaProvider} from '../apps/server/src/providers/ai/ollama-provider.js';
import {transcribeAudio} from '../apps/server/src/modules/transcription/transcription.service.js';
import {benchmarkCases} from '../apps/server/src/evaluation/cases.js';
import {scoreExtraction,wordErrorRate} from '../apps/server/src/evaluation/score.js';

async function main(){
 const args=process.argv.slice(2);
 let limit=benchmarkCases.length,manifestFile:string|undefined;
 for(let i=0;i<args.length;i++){
  if(args[i]==='--limit'){limit=Number(args[++i]);if(!Number.isInteger(limit)||limit<1||limit>benchmarkCases.length)throw new Error(`--limit must be 1–${benchmarkCases.length}`)}
  else if(args[i]==='--audio-manifest'){manifestFile=args[++i];if(!manifestFile)throw new Error('Provide an audio manifest path.')}
  else throw new Error(`Unknown argument: ${args[i]}`);
 }
 const manifestSchema=z.array(z.object({caseId:z.string(),file:z.string().min(1),language:recordingLanguageSchema.default('auto')})).min(1);
 const audio=manifestFile?manifestSchema.parse(JSON.parse(fs.readFileSync(manifestFile,'utf8'))):null;
 if(audio&&(new Set(audio.map(row=>row.caseId)).size!==audio.length||audio.some(row=>!benchmarkCases.some(test=>test.id===row.caseId))))throw new Error('Audio manifest case IDs must be unique and match the benchmark cases.');
 const tests=benchmarkCases.filter(test=>!audio||audio.some(row=>row.caseId===test.id)).slice(0,limit);
 const ai=new OllamaProvider(),status=await ai.status();
 if(!status.available)throw new Error(status.detail);
 const results:any[]=[];
 console.log(`Benchmark: ${config.ollamaModel} · ${tests.length} cases · ${audio?'speech + extraction':'text extraction only'}\nNo transactions will be saved. Avoid recording or drafting in the app during this run.`);
 for(const [index,test] of tests.entries()){
  console.log(`[${index+1}/${tests.length}] ${test.id} (${test.language})…`);
  let transcript=test.text,speechMs:number|null=null,wer:number|null=null;
  const started=performance.now();let draftStarted:number|undefined;
  try{
   const sample=audio?.find(row=>row.caseId===test.id);
   if(sample){
    const file=path.resolve(path.dirname(path.resolve(manifestFile!)),sample.file);
    if(fs.statSync(file).size>config.maxAudioBytes)throw new Error('Audio exceeds the app upload limit.');
    const start=performance.now();transcript=await transcribeAudio(fs.readFileSync(file),sample.language);speechMs=Math.round(performance.now()-start);wer=wordErrorRate(test.text,transcript);
   }
   draftStarted=performance.now();const actual=await ai.extract(transcript),draftMs=Math.round(performance.now()-draftStarted),score=scoreExtraction(test,actual);
   results.push({id:test.id,language:test.language,reference:test.text,transcript,expected:test.expected,actual,...score,speechMs,draftMs,wordErrorRate:wer,totalMs:Math.round(performance.now()-started)});
   console.log(`  ${score.passed?'PASS':'FAIL'} · draft ${(draftMs/1000).toFixed(1)}s${speechMs!==null?` · speech ${(speechMs/1000).toFixed(1)}s`:''}${score.issues.length?' · '+score.issues.join('; '):''}`);
  }catch(error){
   const message=error instanceof Error?error.message:String(error);
   results.push({id:test.id,language:test.language,reference:test.text,transcript,expected:test.expected,passed:false,issues:[message],speechMs,draftMs:draftStarted?Math.round(performance.now()-draftStarted):null,wordErrorRate:wer,totalMs:Math.round(performance.now()-started)});
   console.log(`  ERROR · ${message}`);
  }
 }
 const passed=results.filter(row=>row.passed).length,times=results.map(row=>row.draftMs).filter((n):n is number=>typeof n==='number').sort((a,b)=>a-b);
 const summary={passed,total:results.length,passRate:passed/results.length,medianDraftMs:times.length?times[Math.floor(times.length/2)]:null,mode:audio?'speech-and-extraction':'text-extraction-only'};
 const directory=path.join(config.root,'benchmarks/results');fs.mkdirSync(directory,{recursive:true});
 const filename=path.join(directory,`benchmark-${new Date().toISOString().replace(/[:.]/g,'-')}-${crypto.randomUUID().slice(0,8)}.json`);
 fs.writeFileSync(filename,JSON.stringify({createdAt:new Date().toISOString(),model:config.ollamaModel,whisperModel:audio?path.basename(config.whisperModel):null,summary,results},null,2),{flag:'wx'});
 console.log(`\n${passed}/${results.length} passed (${Math.round(summary.passRate*100)}%). Report: ${filename}\nThis small benchmark is not a production-readiness certificate. ${audio?'Speech results use your supplied audio.':'Speech accuracy was not tested; supply real audio to test it.'}`);
 if(passed!==results.length)process.exitCode=1;
}
void main().catch(error=>{console.error(`Benchmark could not run: ${error instanceof Error?error.message:String(error)}`);process.exitCode=1});
