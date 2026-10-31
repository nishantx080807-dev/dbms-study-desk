import {HashRouter} from 'react-router-dom';
import Shell from './components/Shell';
import {chapters} from './lib/progress';
export default function App(){return <HashRouter><Shell><h1>Your learning workspace.</h1><p style={{margin:'20px 0 36px'}}>Check a task only after doing the work.</p><div className="stack">{chapters.map(c=><a className="panel" key={c.id} href={`#/chapter/${c.id}/checklist`}><h3>{c.id}. {c.title}</h3><p style={{marginTop:10}}>{c.intro}</p></a>)}</div></Shell></HashRouter>;}
