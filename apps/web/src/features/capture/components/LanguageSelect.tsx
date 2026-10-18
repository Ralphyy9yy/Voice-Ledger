import {recordingLanguages,speechLanguageSettings,type RecordingLanguage} from '@voiceledger/shared';
import {useId} from 'react';
export function LanguageSelect({value,onChange,disabled=false,label='Recording language'}:{value:RecordingLanguage;onChange:(value:RecordingLanguage)=>void;disabled?:boolean;label?:string}){
 const selected=speechLanguageSettings(value),id=useId();
 return <div><label htmlFor={id} className="label">{label}</label><select id={id} aria-describedby={`${id}-help`} className="field" value={value} disabled={disabled} onChange={e=>onChange(e.target.value as RecordingLanguage)}>
  <optgroup label="Whisper language settings">{recordingLanguages.filter(option=>!option.experimental).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</optgroup>
  <optgroup label="Philippine languages — experimental auto-detection">{recordingLanguages.filter(option=>option.experimental).map(option=><option key={option.value} value={option.value}>{option.label} (experimental)</option>)}</optgroup>
 </select><p id={`${id}-help`} className={`mt-2 text-xs leading-5 ${selected.experimental?'text-amber-800':'text-[#64715b]'}`}>
 {selected.experimental?`${selected.label} has no dedicated language setting in the installed Whisper model. This uses experimental auto-detection and may produce incorrect words or another language. Correct the transcript before making a draft; type the entry if recognition fails.`:value==='auto'?'Auto-detection works best for languages the model supports. Mixed speech and regional Philippine languages may be inaccurate.':'Uses Whisper’s dedicated language setting. Always review names, quantities, and amounts.'}
 </p></div>;
}
