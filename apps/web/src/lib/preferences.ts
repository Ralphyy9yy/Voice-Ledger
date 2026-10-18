import {recordingLanguageSchema,type RecordingLanguage} from '@voiceledger/shared';
export type {RecordingLanguage} from '@voiceledger/shared';
const key='voiceledger.recording-language';
export function recordingLanguage():RecordingLanguage{
 try{const parsed=recordingLanguageSchema.safeParse(localStorage.getItem(key));return parsed.success?parsed.data:'auto'}catch{return 'auto'}
}
export function saveRecordingLanguage(language:RecordingLanguage){
 try{localStorage.setItem(key,language);return true}catch{return false}
}
