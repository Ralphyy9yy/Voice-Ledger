import type {RecordingLanguage} from '@voiceledger/shared';
export type SpeechLanguage=RecordingLanguage;
export interface SpeechProvider{transcribe(inputPath:string,language?:SpeechLanguage,signal?:AbortSignal):Promise<string>;status():Promise<{available:boolean;detail:string}>}
