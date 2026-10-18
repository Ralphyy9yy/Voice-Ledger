import {createBrowserRouter,Link} from 'react-router-dom';
import {AppShell} from '../components/layout/AppShell';
function RouteError(){return <main className="mx-auto max-w-lg p-8"><h1 className="text-2xl font-bold">This page could not load</h1><p className="muted my-4">Your saved ledger is still on this computer. Reload the page and try again.</p><button className="btn btn-primary" onClick={()=>window.location.reload()}>Reload page</button><Link className="btn btn-secondary ml-3" to="/">Go to overview</Link></main>}
export const router=createBrowserRouter([{element:<AppShell/>,errorElement:<RouteError/>,children:[
 {index:true,lazy:async()=>({Component:(await import('../features/dashboard/DashboardPage')).DashboardPage})},
 {path:'add',lazy:async()=>({Component:(await import('../features/capture/CapturePage')).CapturePage})},
 {path:'transactions',lazy:async()=>({Component:(await import('../features/transactions/TransactionsPage')).TransactionsPage})},
 {path:'transactions/:id',lazy:async()=>({Component:(await import('../features/transactions/TransactionDetailPage')).TransactionDetailPage})},
 {path:'transactions/:id/repeat',lazy:async()=>({Component:(await import('../features/capture/RepeatTransactionPage')).RepeatTransactionPage})},
 {path:'settings',lazy:async()=>({Component:(await import('../features/settings/SettingsPage')).SettingsPage})},
 {path:'reports',lazy:async()=>({Component:(await import('../features/reports/ReportsPage')).ReportsPage})},
 {path:'*',element:<div className="p-10"><h1 className="text-2xl font-bold">Page not found</h1><Link className="btn btn-primary mt-5" to="/">Go to overview</Link></div>}
]}]);
