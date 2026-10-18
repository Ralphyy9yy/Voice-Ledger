import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {config} from '../../config/index.js';
import {AppError} from '../../lib/errors.js';
import {speechLanguageSettings} from '@voiceledger/shared';
import type {SpeechLanguage,SpeechProvider} from './speech-provider.js';

export function runProcess(command:string,args:string[],timeout:number,signal?:AbortSignal){
 return new Promise<{stdout:string;stderr:string}>((resolve,reject)=>{
  if(signal?.aborted){reject(new AppError(499,'Audio processing was cancelled.','SPEECH_CANCELLED'));return}
  const child=spawn(command,args,{shell:false,windowsHide:true});
  let stdout='',stderr='',failure:AppError|undefined;
  const cancel=()=>{failure=new AppError(499,'Audio processing was cancelled.','SPEECH_CANCELLED');child.kill()};
  const timer=setTimeout(()=>{failure=new AppError(504,'Local speech processing took too long. Try a shorter recording.','SPEECH_TIMEOUT');child.kill()},timeout);
  const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel)};
  signal?.addEventListener('abort',cancel,{once:true});
  child.stdout.on('data',d=>{stdout+=d;if(stdout.length>100000){failure=new AppError(502,'Local audio output exceeded its limit.','SPEECH_OUTPUT_LIMIT');child.kill()}});
  child.stderr.on('data',d=>{stderr=(stderr+String(d)).slice(-100000)});
  child.on('error',(error:NodeJS.ErrnoException)=>{cleanup();reject(new AppError(503,`Could not start ${path.basename(command)} (${error.code??'process error'}). Check the configured executable path.`,'LOCAL_PROCESS_UNAVAILABLE'))});
  child.on('close',code=>{cleanup();if(failure)reject(failure);else if(code===0)resolve({stdout,stderr});else reject(new AppError(503,'Local audio processing failed. Verify the tools and model, then try a short recording.','SPEECH_FAILED'))});
 });
}
const prompts={auto:'Sales and expenses in Philippine pesos. Items, quantity, unit price, total.',en:'Sales and expenses in Philippine pesos. Sold, bought, pieces, bottles, sachets, kilos, pesos, each, total.',tl:'Mga benta at gastos sa piso. Binenta, bumili, piraso, bote, sachet, kilo, pesos, bawat isa, kabuuan.'};
export class WhisperProvider implements SpeechProvider{
 async status(){
  const ok=!!config.whisperCli&&!!config.whisperModel&&fs.existsSync(config.whisperCli)&&fs.existsSync(config.whisperModel);
  let ffmpeg=false;
  try{await runProcess(config.ffmpegPath,['-version'],5000);ffmpeg=true}catch{}
  return{available:ok&&ffmpeg,detail:!ok?'Set WHISPER_CLI and WHISPER_MODEL to installed local files':!ffmpeg?'FFmpeg could not start. Check FFMPEG_PATH.':'whisper.cpp multilingual model and FFmpeg are configured'};
 }
 async transcribe(inputPath:string,language:SpeechLanguage='auto',signal?:AbortSignal){
  if(!(await this.status()).available)throw new AppError(503,'Local speech tools are not configured. Check Settings.','SPEECH_UNAVAILABLE');
  const out=`${inputPath}.txt`;
  try{
   const selected=speechLanguageSettings(language),code=selected.whisperLanguage as keyof typeof prompts;
   await runProcess(config.whisperCli,['-m',config.whisperModel,'-f',inputPath,'-l',code,'--prompt',prompts[code],'-otxt','-of',inputPath],config.inferenceTimeoutMs,signal);
   const text=fs.readFileSync(out,'utf8').trim();
   if(!text)throw new AppError(422,'No speech was detected. Speak closer to the microphone or type the entry.','NO_SPEECH');
   if(text.length>10000)throw new AppError(422,'Transcript is too long. Use a shorter recording.','TRANSCRIPT_LIMIT');
   return text;
  }finally{fs.rmSync(out,{force:true})}
 }
}
