import {z} from 'zod';
export const recordingLanguageSchema=z.enum(['auto','en','tl','ceb','ilo','hil','war','bik','pam','pag','tsg','mrw','mag','cbk','akl','krj','sur','other']);
export type RecordingLanguage=z.infer<typeof recordingLanguageSchema>;
export const recordingLanguages:{value:RecordingLanguage;label:string;experimental:boolean}[]=[
 {value:'auto',label:'Auto-detect / mixed languages',experimental:false},
 {value:'en',label:'English',experimental:false},
 {value:'tl',label:'Filipino / Tagalog',experimental:false},
 {value:'ceb',label:'Cebuano / Bisaya',experimental:true},
 {value:'ilo',label:'Ilocano',experimental:true},
 {value:'hil',label:'Hiligaynon / Ilonggo',experimental:true},
 {value:'war',label:'Waray',experimental:true},
 {value:'bik',label:'Bikol',experimental:true},
 {value:'pam',label:'Kapampangan',experimental:true},
 {value:'pag',label:'Pangasinan',experimental:true},
 {value:'tsg',label:'Tausug',experimental:true},
 {value:'mrw',label:'Maranao',experimental:true},
 {value:'mag',label:'Maguindanaon',experimental:true},
 {value:'cbk',label:'Chavacano',experimental:true},
 {value:'akl',label:'Aklanon',experimental:true},
 {value:'krj',label:'Kinaray-a',experimental:true},
 {value:'sur',label:'Surigaonon',experimental:true},
 {value:'other',label:'Other Philippine language',experimental:true}
];
export function speechLanguageSettings(value:RecordingLanguage){
 const option=recordingLanguages.find(option=>option.value===value)!;
 return{...option,whisperLanguage:value==='en'?'en':value==='tl'?'tl':'auto'};
}
