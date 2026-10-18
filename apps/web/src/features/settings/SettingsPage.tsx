import {useState} from 'react';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {Download,RefreshCw} from 'lucide-react';
import {PageHeader} from '../../components/layout/PageHeader';
import {Button} from '../../components/ui/Button';
import {ErrorState} from '../../components/shared/States';
import {api} from '../../lib/api-client';
import {recordingLanguage,saveRecordingLanguage,type RecordingLanguage} from '../../lib/preferences';
import {LanguageSelect} from '../capture/components/LanguageSelect';

type Service={available:boolean;detail:string};
type Status={ollama:Service;whisper:Service;model:string;automaticBackups:boolean;storage:{databaseName:string;count:number;latest:{file:string;createdAt:string;sizeBytes:number}|null};privacy:string};
const when=(value:string)=>new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
export function SettingsPage(){
 const qc=useQueryClient();
 const q=useQuery({queryKey:['status'],queryFn:()=>api<Status>('/settings/status')});
 const [language,setLanguage]=useState<RecordingLanguage>(recordingLanguage),[preferenceMessage,setPreferenceMessage]=useState('');
 const backup=useMutation({mutationFn:()=>api<{file:string}>('/backups',{method:'POST'}),onSuccess:()=>{void qc.invalidateQueries({queryKey:['status']})}});
 const latest=q.data?.storage.latest,downloadFile=backup.data?.file??latest?.file;
 return <div className="page-container">
  <PageHeader title="Settings" description="Recording, local services, and your ledger." action={<button type="button" className="btn btn-secondary" disabled={q.isFetching} onClick={()=>void q.refetch()}><RefreshCw size={15}/>{q.isFetching?'Checking…':'Refresh status'}</button>}/>
  {q.error&&<div className="mb-4"><ErrorState message={q.error.message}/></div>}
  <section className="settings-section"><div><h2>Recording</h2><p>Default language for new recordings.</p></div><div className="min-w-0">
   <LanguageSelect label="Default recording language" value={language} onChange={value=>{setLanguage(value);setPreferenceMessage(saveRecordingLanguage(value)?'Preference saved on this browser.':'Your browser could not save this preference.')}}/>
   {preferenceMessage&&<p role="status" className="mt-2 text-xs text-[#35633e]">{preferenceMessage}</p>}
  </div></section>
  <section className="settings-section"><div><h2>Ledger</h2><p>Currency and daily reporting.</p></div><dl className="space-y-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><dt className="muted">Currency</dt><dd>Philippine peso (PHP)</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="muted">Timezone</dt><dd>Asia/Manila</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="muted">Database</dt><dd className="break-all">{q.data?.storage.databaseName??'Local ledger'}</dd></div></dl></section>
  <section className="settings-section"><div><h2>Local AI</h2><p>Speech recognition and transaction drafts.</p></div><div>
   {([{key:'whisper',title:'Speech recognition'},{key:'ollama',title:'Draft assistant'}] as const).map(({key,title})=>{const service=q.data?.[key];return <div key={key} className="mb-4 last:mb-0"><div className="flex justify-between gap-3 text-sm"><h3 className="font-medium">{title}</h3><span className="muted">{service?service.available?'Available':'Needs setup':q.isLoading?'Checking…':'Unavailable'}</span></div><p className="muted mt-1 text-xs leading-5">{service?.detail??'Refresh status to check this service.'}</p>{service&&!service.available&&<p className="mt-1 text-xs text-amber-800">{key==='ollama'?'Start Ollama and check that the configured model is installed.':'Check your FFmpeg, Whisper executable, and model paths.'}</p>}</div>})}
   <p className="muted mt-4 text-xs">Model: {q.data?.model??'Unavailable'}. Manual entry works without AI.</p>
  </div></section>
  <section className="settings-section"><div><h2>Backups</h2><p>Preserve entries, transcripts, and history.</p></div><div>
   <p className="text-sm">Last backup: {latest?when(latest.createdAt):q.isLoading?'Checking…':q.error?'Status unavailable':'No backups yet'}</p>
   {latest&&<p className="muted mt-1 text-xs">{(latest.sizeBytes/1024).toFixed(0)} KB · {q.data?.storage.count} saved {q.data?.storage.count===1?'backup':'backups'}</p>}
   <p className="muted mt-2 text-xs leading-5">{q.data?q.data.automaticBackups?'Daily automatic backups run while the app is open.':'Automatic backups run in production mode. You can create one here.':'Refresh status to check automatic backups.'}</p>
   <div className="mt-3 flex flex-wrap gap-2"><Button onClick={()=>backup.mutate()} disabled={backup.isPending}>{backup.isPending?'Backing up…':'Create SQLite backup'}</Button>{downloadFile&&<a className="btn btn-secondary" href={`/api/backups/${encodeURIComponent(downloadFile)}`}><Download size={15}/>Download backup</a>}</div>
   {backup.data&&<div role="status" className="mt-3 text-sm"><p>Backup created and integrity checked.</p></div>}
   {backup.error&&<p role="alert" className="mt-3 text-sm text-red-700">{backup.error.message}</p>}
   <p className="muted mt-3 text-xs leading-5">Keep a copy on another drive to protect against disk failure.</p>
   <details className="mt-3 text-xs"><summary className="cursor-pointer py-2 font-medium">Recover a backup</summary><p className="muted py-2 leading-6">Download your backup first. Verify it with npm.cmd run backup:verify -- followed by its quoted file path. To rehearse recovery, use backup:restore with a new destination file; keep your active ledger unchanged. Follow docs/production.md before switching databases. Recovery preserves the original ledger. CSV cannot restore history.</p></details>
  </div></section>
  <section className="settings-section"><div><h2>Export</h2><p>Active transactions for a spreadsheet.</p></div><div><a className="btn btn-secondary" href="/api/export.csv"><Download size={15}/>Export CSV</a><p className="muted mt-2 text-xs">Voided entries and audit history are excluded.</p></div></section>
  <section className="settings-section"><div><h2>Privacy</h2><p>One trusted user, on this computer.</p></div><div className="muted space-y-2 text-xs leading-6"><p>Audio is deleted after processing. Confirmed transcripts are saved in the ledger. Unfinished text and edited drafts are saved in this browser for recovery; resume or discard them on Add transaction.</p><p>Browser recovery copies are not included in database backups. Clearing browser data removes them.</p><p>Data, recovery copies, and backups are not encrypted. Protect your Windows account and backup drive.</p><p>Sales and expenses are assumed paid immediately. Cash movement is not profit.</p></div></section>
 </div>;
}
