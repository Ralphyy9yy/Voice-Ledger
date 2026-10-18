import {AppError} from './errors.js';
// Share one slot between speech and extraction to avoid exhausting local RAM.
export function createInferenceGate(){
 let busy=false;
 return async function<T>(work:()=>Promise<T>):Promise<T>{
  if(busy)throw new AppError(429,'Another recording or draft is still processing. Wait for it to finish, then try again.','AI_BUSY');
  busy=true;
  try{return await work()}finally{busy=false}
 };
}
