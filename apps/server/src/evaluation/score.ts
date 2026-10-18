import type {Extraction} from '@voiceledger/shared';
import type {BenchmarkCase} from './cases.js';
export const normalize=(text:string)=>text.normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export function scoreExtraction(test:BenchmarkCase,actual:Extraction){
 const issues:string[]=[],expected=test.expected;
 if(actual.type!==expected.type)issues.push(`type: expected ${expected.type}, got ${actual.type}`);
 if((actual.statedTotalCentavos??null)!==expected.statedTotalCentavos)issues.push(`stated total: expected ${expected.statedTotalCentavos}, got ${actual.statedTotalCentavos??null}`);
 if(actual.items.length!==expected.items.length)issues.push(`items: expected ${expected.items.length}, got ${actual.items.length}`);
 const remaining=[...actual.items];
 for(const item of expected.items){
  const index=remaining.findIndex(found=>item.names.some(name=>normalize(name)===normalize(found.name)));
  if(index<0){issues.push(`missing or renamed item: ${item.names[0]}`);continue}
  const found=remaining.splice(index,1)[0]!;
  if(found.quantity!==item.quantity)issues.push(`${item.names[0]} quantity: expected ${item.quantity}, got ${found.quantity}`);
  if(found.unitPriceCentavos!==item.unitPriceCentavos)issues.push(`${item.names[0]} price: expected ${item.unitPriceCentavos}, got ${found.unitPriceCentavos}`);
 }
 if(expected.ambiguity&&!actual.ambiguities.length)issues.push('unclear input was not flagged for review');
 return{passed:issues.length===0,issues};
}
export function wordErrorRate(reference:string,hypothesis:string){
 const expected=normalize(reference).split(' ').filter(Boolean),actual=normalize(hypothesis).split(' ').filter(Boolean);
 let row=Array.from({length:actual.length+1},(_,i)=>i);
 for(let i=1;i<=expected.length;i++){
  const next=[i];for(let j=1;j<=actual.length;j++)next[j]=Math.min(next[j-1]!+1,row[j]!+1,row[j-1]!+(expected[i-1]===actual[j-1]?0:1));row=next;
 }
 return row[actual.length]!/Math.max(1,expected.length);
}
