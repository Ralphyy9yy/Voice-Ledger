import {it,expect} from 'vitest';
import {parseExtraction} from './ollama-provider.js';
import {createTransactionSchema} from '@voiceledger/shared';
it('allows missing prices in drafts but rejects them when saving',()=>{
 const draft=parseExtraction(JSON.stringify({type:'expense',items:[{name:'rice',quantity:55,unitPriceCentavos:null}],missingFields:['unitPriceCentavos'],ambiguities:[],sourceExcerpts:[]}));
 expect(draft.items[0]?.unitPriceCentavos).toBeNull();
 expect(draft.missingFields).toEqual(['unitPrice']);
 expect(createTransactionSchema.safeParse({...draft,idempotencyKey:'f95cf944-98c7-4914-84db-aea901331990'}).success).toBe(false);
});
it('reports malformed model JSON as an invalid response',()=>{
 expect(()=>parseExtraction('not JSON')).toThrow('invalid JSON');
});
it('handles string numbers and null optional arrays without inventing values',()=>{
 const draft=parseExtraction(JSON.stringify({type:'expense',items:[{name:'rice',quantity:'55',unitPriceCentavos:'5000',sourceExcerpt:null}],ambiguities:null,sourceExcerpts:null}));
 expect(draft.items[0]).toMatchObject({quantity:55,unitPriceCentavos:5000});
 expect(draft.ambiguities).toEqual([]);
});
it('leaves unsupported quantities and prices empty for manual review',()=>{
 const draft=parseExtraction(JSON.stringify({type:'expense',items:[{name:null,quantity:1.5,unitPriceCentavos:'unknown'}]}));
 expect(draft.items[0]).toMatchObject({name:'',quantity:null,unitPriceCentavos:null});
 expect(draft.missingFields).toEqual(expect.arrayContaining(['item','quantity','unitPrice']));
});
