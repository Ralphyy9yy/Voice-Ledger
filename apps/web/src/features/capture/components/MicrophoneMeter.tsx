import {useEffect,useState} from 'react';
export function MicrophoneMeter({stream}:{stream:MediaStream}){
 const [level,setLevel]=useState(0),[available,setAvailable]=useState(true);
 useEffect(()=>{
  let context:AudioContext|undefined,frame=0,disposed=false;
  try{
   context=new AudioContext();
   const source=context.createMediaStreamSource(stream),analyser=context.createAnalyser();
   analyser.fftSize=256;source.connect(analyser);
   const samples=new Uint8Array(analyser.fftSize);
   const update=()=>{if(disposed)return;analyser.getByteTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,v)=>sum+((v-128)/128)**2,0)/samples.length);setLevel(Math.min(100,rms*500));frame=requestAnimationFrame(update)};
   void context.resume().then(()=>{if(!disposed)update()}).catch(()=>setAvailable(false));
  }catch{setAvailable(false)}
  return()=>{disposed=true;cancelAnimationFrame(frame);if(context)void context.close().catch(()=>{})};
 },[stream]);
 if(!available)return <p className="mt-3 text-xs">Microphone meter unavailable; recording continues.</p>;
 return <div className="mx-auto my-4 max-w-xs"><div role="meter" aria-label="Microphone input level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level)} className="h-2 overflow-hidden rounded-full bg-[#dbe4d7]"><div className="h-full rounded-full bg-[#527b48] transition-[width] duration-100" style={{width:`${level}%`}}/></div><p className="mt-2 text-xs text-[#64715b]">{level<3?'Low input — speak near the microphone.':'Microphone is picking up sound.'}</p></div>;
}
