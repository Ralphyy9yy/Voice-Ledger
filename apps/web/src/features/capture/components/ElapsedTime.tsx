import {useEffect,useState} from 'react';
export function ElapsedTime({label}:{label:string}){
 const [seconds,setSeconds]=useState(0);
 useEffect(()=>{const start=Date.now();const timer=window.setInterval(()=>setSeconds(Math.floor((Date.now()-start)/1000)),1000);return()=>clearInterval(timer)},[]);
 return <p className="mt-3 text-xs tabular-nums text-[#64715b]">{label} · {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</p>;
}
