import {HashRouter,Routes,Route,Navigate} from 'react-router-dom';
import {Suspense,lazy} from 'react';
import Shell from './components/Shell';
const Home=lazy(()=>import('./pages/Home'));
export default function App(){return <HashRouter><Shell><Suspense fallback={<div className="skeleton" aria-label="Loading study desk"/>}><Routes><Route path="/" element={<Home/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Suspense></Shell></HashRouter>;}
