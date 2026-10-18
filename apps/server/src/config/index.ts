import fs from 'node:fs';
import path from 'node:path';
import {parseEnv} from 'node:util';

const root=path.resolve(import.meta.dirname,'../../../..');
let localEnv:Record<string,string|undefined>={};
try { localEnv=parseEnv(fs.readFileSync(path.join(root,'.env'),'utf8')); }
catch(error) { if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error; }
// Explicit launch-time overrides let tests and recovery tools use isolated data.
const value=(key:string,fallback:string)=>process.env[key]??localEnv[key]??fallback;

export const config={
  port:Number(value('PORT','4310')),host:value('HOST','127.0.0.1'),
  databasePath:path.resolve(root,value('DATABASE_PATH','data/voiceledger.db')),
  webOrigin:value('WEB_ORIGIN','http://localhost:5173'),
  ollamaUrl:value('OLLAMA_URL','http://127.0.0.1:11434'),ollamaModel:value('OLLAMA_MODEL','qwen2.5:3b'),
  whisperCli:value('WHISPER_CLI',''),whisperModel:value('WHISPER_MODEL',''),ffmpegPath:value('FFMPEG_PATH','ffmpeg'),
  inferenceTimeoutMs:Number(value('INFERENCE_TIMEOUT_MS','120000')),maxAudioBytes:15*1024*1024,
  isProduction:process.env.NODE_ENV==='production',root
};

if(!['127.0.0.1','localhost','::1'].includes(config.host))throw new Error('HOST must be a loopback address. This app is single-user and must not be exposed to a network.');
if(!Number.isInteger(config.port)||config.port<1||config.port>65535)throw new Error('PORT must be an integer between 1 and 65535.');
if(!Number.isFinite(config.inferenceTimeoutMs)||config.inferenceTimeoutMs<1000||config.inferenceTimeoutMs>600000)throw new Error('INFERENCE_TIMEOUT_MS must be between 1000 and 600000.');
const ollama=new URL(config.ollamaUrl);
if(ollama.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(ollama.hostname)||ollama.username||ollama.password)throw new Error('OLLAMA_URL must be a local HTTP loopback URL without credentials.');
