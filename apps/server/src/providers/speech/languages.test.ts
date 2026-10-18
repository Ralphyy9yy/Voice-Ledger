import {it,expect} from 'vitest';
import {recordingLanguages,recordingLanguageSchema,speechLanguageSettings} from '@voiceledger/shared';
it('never passes unsupported regional language codes to Whisper',()=>{
 for(const option of recordingLanguages){
  expect(recordingLanguageSchema.safeParse(option.value).success).toBe(true);
  const setting=speechLanguageSettings(option.value);
  expect(['auto','en','tl']).toContain(setting.whisperLanguage);
  if(option.experimental)expect(setting.whisperLanguage).toBe('auto');
 }
 expect(speechLanguageSettings('tl').whisperLanguage).toBe('tl');
 expect(speechLanguageSettings('en').whisperLanguage).toBe('en');
 expect(recordingLanguageSchema.safeParse('arbitrary').success).toBe(false);
});
