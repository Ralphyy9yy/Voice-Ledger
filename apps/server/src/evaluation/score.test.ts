import {it,expect} from 'vitest';
import {benchmarkCases} from './cases.js';
import {scoreExtraction,wordErrorRate} from './score.js';
it('catches peso conversion errors and invented missing prices',()=>{
 const actual={type:'sale' as const,items:[{name:'coffee',quantity:3,unitPriceCentavos:25}],statedTotalCentavos:null,missingFields:[],ambiguities:[],sourceExcerpts:[]};
 expect(scoreExtraction(benchmarkCases[0]!,actual).passed).toBe(false);
 const missing=benchmarkCases.find(test=>test.id==='missing-price')!;
 expect(scoreExtraction(missing,{...actual,type:'expense',items:[{name:'rice',quantity:5,unitPriceCentavos:5500}]}).passed).toBe(false);
});
it('accepts documented name aliases without accepting wrong amounts',()=>{
 const actual={type:'sale' as const,items:[{name:'Coffees',quantity:3,unitPriceCentavos:2500}],statedTotalCentavos:null,missingFields:[],ambiguities:[],sourceExcerpts:[]};
 expect(scoreExtraction(benchmarkCases[0]!,actual)).toEqual({passed:true,issues:[]});
});
it('measures substitutions and insertions without hiding speech errors',()=>{
 expect(wordErrorRate('Sold three coffees.','sold three coffees')).toBe(0);
 expect(wordErrorRate('sold three coffees','sold two coffees')).toBeCloseTo(1/3);
 expect(wordErrorRate('coffee','coffee coffee coffee')).toBe(2);
});
