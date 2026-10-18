import {useEffect,useRef,useState} from 'react';
import {Mic,Square,AudioLines} from 'lucide-react';
import {Button} from '../../../components/ui/Button';
import {ElapsedTime} from './ElapsedTime';
import {MicrophoneMeter} from './MicrophoneMeter';
import {recordingLanguage} from '../../../lib/preferences';
import type {RecordingLanguage as Language} from '@voiceledger/shared';
import {LanguageSelect} from './LanguageSelect';
export function RecorderControl({onTranscript}:{onTranscript:(text:string)=>void}){
 const [state,setState]=useState<'idle'|'starting'|'recording'|'transcribing'>('idle'),[error,setError]=useState(''),[language,setLanguage]=useState<Language>(recordingLanguage),[activeStream,setActiveStream]=useState<MediaStream|null>(null);
 const recorder=useRef<MediaRecorder|null>(null),streamRef=useRef<MediaStream|null>(null),mounted=useRef(true),request=useRef<AbortController|null>(null),timer=useRef<number|undefined>(undefined),starting=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{
  mounted.current=false;clearTimeout(timer.current);request.current?.abort();
  if(recorder.current){recorder.current.onstop=null;if(recorder.current.state==='recording')recorder.current.stop()}
  streamRef.current?.getTracks().forEach(t=>t.stop());
 }},[]);
 async function start(){
  if(starting.current||state!=='idle')return;
  setError('');
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setError('Microphone recording is unavailable in this browser. Type the transaction instead.');return}
  starting.current=true;setState('starting');
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1}});
   if(!mounted.current){stream.getTracks().forEach(t=>t.stop());return}
   streamRef.current=stream;setActiveStream(stream);
   const r=new MediaRecorder(stream,{audioBitsPerSecond:128000}),chunks:Blob[]=[];
   recorder.current=r;
   r.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   r.onstop=async()=>{
    clearTimeout(timer.current);stream.getTracks().forEach(t=>t.stop());
    if(!mounted.current)return;
    setActiveStream(null);setState('transcribing');
    const controller=new AbortController();request.current=controller;
    try{
     const audio=new Blob(chunks,{type:r.mimeType});
     if(!audio.size)throw new Error('Recording was empty. Speak for a few seconds and try again.');
     const form=new FormData();form.append('audio',audio,'recording.webm');form.append('language',language);
     const response=await fetch('/api/transcriptions',{method:'POST',headers:{'x-voiceledger-csrf':'1'},signal:controller.signal,body:form});
     const body=await response.json();
     if(!response.ok)throw new Error(body.error?.message??'Transcription failed');
     if(mounted.current&&!controller.signal.aborted){setState('idle');onTranscript(body.text)}
    }catch(e){if(mounted.current){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Transcription failed');setState('idle')}}
   };
   r.onerror=()=>{if(mounted.current)setError('Recording was interrupted. Check the microphone and try again.')};
   r.start(1000);setState('recording');
   timer.current=window.setTimeout(()=>{if(r.state==='recording')r.stop()},120000);
  }catch(e){
   streamRef.current?.getTracks().forEach(t=>t.stop());
   if(mounted.current){setActiveStream(null);setState('idle');setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Microphone permission was denied. Allow it in your browser or type the transaction.':'Could not start the microphone. Check that it is connected and try again.')}
  }finally{starting.current=false}
 }
 function stop(){clearTimeout(timer.current);if(recorder.current?.state==='recording')recorder.current.stop()}
 return <div className={`relative overflow-hidden rounded-2xl border p-6 text-center md:p-8 ${state==='recording'?'border-red-300 bg-red-50/60':'border-[#cfdccc] bg-[#f1f7ef]'}`}>
  <div className="mx-auto mb-5 max-w-lg text-left"><LanguageSelect value={language} onChange={setLanguage} disabled={state!=='idle'}/></div>
  <div aria-hidden className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-white text-[#35633e] shadow-sm">{state==='recording'?<AudioLines size={28}/>:<Mic size={28}/>}</div>
  <div role="status" className="text-lg font-bold">{state==='recording'?'Listening…':state==='transcribing'?'Transcribing audio locally…':state==='starting'?'Waiting for microphone permission…':'Speak your transaction'}</div>
  <p className="muted mx-auto mt-2 max-w-sm text-sm">{state==='transcribing'?'Keep this page open. Longer recordings take more time. No transaction has been saved.':'Say whether you bought or sold, then the item, quantity, and price.'}</p>
  {state==='recording'&&activeStream&&<MicrophoneMeter stream={activeStream}/>}
  {(state==='recording'||state==='transcribing')&&<ElapsedTime key={state} label={state==='recording'?'Recording · maximum 2 minutes':'Processing speech'}/>}
  <p className="mb-5 mt-3 text-xs text-[#64715b]">Try: “Sold 3 coffees at 25 pesos each.”<br/>“Nagbenta ako ng 3 kape, tig-25 pesos.”</p>
  {state==='recording'?<Button type="button" onClick={stop} className="btn-danger"><Square size={17}/>Stop recording</Button>:state!=='transcribing'?<Button type="button" onClick={start} disabled={state!=='idle'}><Mic size={17}/>Start recording</Button>:null}
  {state==='transcribing'&&<button type="button" className="btn btn-secondary ml-3" onClick={()=>request.current?.abort()}>Cancel transcription</button>}
  {error&&<p role="alert" className="mt-4 rounded-lg bg-white/80 p-3 text-sm text-red-700">{error}</p>}
 </div>;
}
