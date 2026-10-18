import type {ReactNode} from 'react';

function transcriptParts(text:string){
 return text.split(/(\d+(?:[,.]\d+)*)/g).map((part,index)=>index%2===1?<mark key={index} className="bg-[#e7eddf] px-0.5 text-inherit">{part}</mark>:part);
}
export function DraftComparison({transcript,onEdit,disabled,children}:{transcript:string;onEdit:()=>void;disabled:boolean;children:ReactNode}){
 return <div className="draft-comparison">
  <section aria-label="Reviewed transcript" className="draft-source">
   <h3 className="text-sm font-semibold">Reviewed transcript</h3>
   <p className="muted mb-4 mt-1 text-xs leading-5">Compare this text with the item names, quantities, and prices in your draft.</p>
   <blockquote className="max-h-[45vh] overflow-auto whitespace-pre-wrap break-words text-[15px] leading-8">{transcript.trim()?transcriptParts(transcript):'No transcript. Enter the transaction details manually.'}</blockquote>
   <p className="muted mt-4 text-xs leading-5">Numbers are highlighted for reference, not verified by the app. Written-out numbers still need checking.</p>
   <button type="button" disabled={disabled} className="mt-4 min-h-10 text-sm font-semibold text-[#35633e] underline underline-offset-4 disabled:opacity-50" onClick={onEdit}>Edit transcript</button>
   <p className="muted mt-1 text-xs leading-5">Creating a new draft after correcting the transcript replaces the current draft edits.</p>
  </section>
  <section aria-label="Editable transaction draft" className="min-w-0"><h3 className="mb-4 text-sm font-semibold">Transaction details</h3>{children}</section>
 </div>;
}
