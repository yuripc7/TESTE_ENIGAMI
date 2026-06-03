import{u as Za,r as v,j as e,R as Je}from"./index-BCT2pnVj.js";const de="enigami_agenda_v2_",V=["Segunda","Terça","Quarta","Quinta","Sexta"],_={Segunda:0,Terça:1,Quarta:2,Quinta:3,Sexta:4},et=[{name:"Miguel Res.",code:"MIG",color:"#FF6B4A"},{name:"Sky Green",code:"SKY",color:"#10B981"},{name:"Itajaí - Viabilidade",code:"ITJ",color:"#A770EF"},{name:"Geral",code:"GER",color:"#0EA5E9"}],at=[{name:"Yuri",color:"#6366F1",role:"Coord. BIM",capacity:13,coordinator:!0},{name:"Mariana",color:"#0EA5E9",role:"Coord. Projetos",capacity:13,coordinator:!0},{name:"Vergílio",color:"#A770EF",role:"Coord. Compatibilização",capacity:13,coordinator:!0},{name:"Lourrane",color:"#EC4899",role:"Projeto Legal",capacity:10},{name:"Cassio",color:"#F59E0B",role:"Viabilidade",capacity:10},{name:"Isabela",color:"#14B8A6",role:"Modelagem",capacity:10},{name:"Isa",color:"#F97316",role:"Modelagem",capacity:10},{name:"Ju",color:"#84CC16",role:"Documentação",capacity:10},{name:"Kauna",color:"#06B6D4",role:"Projeto Legal",capacity:10},{name:"Equipe",color:"#64748B",role:"Multidisciplinar",capacity:16}],tt=[{code:"ARQ",name:"Arquitetura",color:"#F97316"},{code:"EST",name:"Estrutura",color:"#8B5CF6"},{code:"HID",name:"Hidráulica",color:"#0EA5E9"},{code:"ELE",name:"Elétrica",color:"#EAB308"},{code:"MEP",name:"Instalações",color:"#14B8A6"},{code:"PCI",name:"Incêndio",color:"#EF4444"},{code:"LEG",name:"Legal/Pref.",color:"#64748B"},{code:"BIM",name:"Coordenação",color:"#6366F1"}],ce=[{key:"todo",label:"A fazer",short:"A FAZER",pct:0,color:"#94A3B8"},{key:"doing",label:"Em andamento",short:"EM AND.",pct:50,color:"#0EA5E9"},{key:"review",label:"Em revisão",short:"REVISÃO",pct:85,color:"#EAB308"},{key:"done",label:"Concluído",short:"CONCLUÍDO",pct:100,color:"#10B981"}],me={pending:{label:"Aguardando",color:"#EAB308"},approved:{label:"Aprovado",color:"#10B981"},returned:{label:"Devolvido",color:"#EF4444"}},M=["#0EA5E9","#10B981","#A770EF","#EC4899","#F59E0B","#14B8A6","#6366F1","#EF4444","#8B5CF6","#84CC16","#F97316","#06B6D4"];function Ze(t){return t.toISOString().slice(0,10)}function ja(t){if(!t)return null;const[r,s,l]=t.split("-").map(Number);return new Date(r,s-1,l)}function ea(t){const r=new Date;r.setHours(0,0,0,0);const s=r.getDay()===0?7:r.getDay(),l=new Date(r);return l.setDate(r.getDate()-(s-1)+t*7),l}function ae(t){return Ze(ea(t))}function Ue(t){const r=ea(t),s=new Date(r);s.setDate(r.getDate()+4);const l=["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"],x=y=>String(y.getDate()).padStart(2,"0");return r.getMonth()===s.getMonth()?`${x(r)} – ${x(s)} ${l[s.getMonth()]}`:`${x(r)} ${l[r.getMonth()]} – ${x(s)} ${l[s.getMonth()]}`}function Q(t,r){const s=ea(r),l=new Date(s);return l.setDate(s.getDate()+(_[t]||0)),Ze(l)}function Ke(){return{1:"Segunda",2:"Terça",3:"Quarta",4:"Quinta",5:"Sexta"}[new Date().getDay()]||null}function ka(t){const r=t.trim().split(/\s+/);return r.length===1?r[0].slice(0,2).toUpperCase():(r[0][0]+r[1][0]).toUpperCase()}function aa(t){return t.subtasks&&t.subtasks.length?Math.round(t.subtasks.filter(r=>r.done).length/t.subtasks.length*100):(ce.find(r=>r.key===(t.status||(t.completed?"done":"todo")))||ce[0]).pct}function $(t){return t.status==="done"||!t.status&&t.completed}function ge(t){return typeof t.weight=="number"&&t.weight>0?t.weight:1}function ta(t){const r=t.durationDays||1;return r<1?1:r}function ze(t){return _[t.day]!=null?_[t.day]:0}function na(t){return Math.min(ze(t)+ta(t)-1,4)}function nt(t,r){const s=_[r];return s>=ze(t)&&s<=na(t)}function Se(t){return V[na(t)]}function L(t){if(!t.length)return 0;const r=t.reduce((l,x)=>l+ge(x),0),s=t.reduce((l,x)=>l+ge(x)*aa(x),0);return r?Math.round(s/r):0}function pe(t){if($(t)||!t.dueDate)return!1;const r=ja(t.dueDate),s=new Date;return s.setHours(0,0,0,0),r?r<s:!1}function rt(t){return $(t)||!t.dueDate?!1:t.dueDate===Ze(new Date)}function Xe(t,r){new Date().setHours(0,0,0,0);const l=r===0&&Ke()?_[Ke()]:r<0?4:-1,x=t.filter(b=>(_[b.day]??0)<=l),y=x.reduce((b,m)=>b+ge(m),0),j=x.reduce((b,m)=>b+($(m)?ge(m):0),0);return{hasData:x.length>0,planned:x.length,plannedW:y,doneW:j,onTrackPct:y?Math.round(j/y*100):0}}function Fe(t,r){return t==="Yuri"?de+ae(r):de+t+"_"+ae(r)}function it(t,r,s){if(t&&t.agendaTasks&&Array.isArray(t.agendaTasks)){const l=t.agendaTasks.filter(x=>x.coord===r&&x.weekOffset===s);if(l.length>0)return l}try{const l=localStorage.getItem(Fe(r,s));if(l){const x=JSON.parse(l);if(Array.isArray(x)&&x.length>0)return x.map(y=>({...y,coord:r,weekOffset:s}))}}catch{}return s===0&&r==="Yuri"?ot().map(l=>({...l,coord:r,weekOffset:s})):[]}function st(t,r,s){if(t&&t.agendaTasks&&Array.isArray(t.agendaTasks)){const l=t.agendaTasks.filter(x=>x.coord===r&&x.weekOffset===s);if(l.length>0)return L(l)}try{const l=localStorage.getItem(Fe(r,s));if(l)return L(JSON.parse(l))}catch{}return null}function ot(){const t=r=>{const s=r.durationDays||1,l=Math.min((_[r.day]||0)+s-1,4);return{status:"todo",weight:2,subtasks:[],durationDays:1,...r,dueDate:r.dueDate||Q(V[l],0)}};return[t({id:1,day:"Segunda",assignee:"Cassio",project:"Itajaí - Viabilidade",disc:"LEG",weight:3,status:"done",text:"Levantamento de dados, lotes, diretrizes e pequeno estudo de mercado"}),t({id:2,day:"Segunda",assignee:"Lourrane",project:"Sky Green",disc:"LEG",weight:2,status:"done",text:"Projeto Legal: Planta baixa do pavimento térreo (Padrão Prefeitura)"}),t({id:3,day:"Segunda",assignee:"Isabela",project:"Sky Green",disc:"ARQ",weight:2,status:"doing",text:"Catalogação de ambientes, lista e Moodboard (Térreo e Lazer 1)",subtasks:[{id:"a",text:"Térreo",done:!0},{id:"b",text:"Lazer 1",done:!1}]}),t({id:4,day:"Segunda",assignee:"Yuri",project:"Miguel Res.",disc:"ARQ",weight:2,status:"done",text:"Atualização do modelo executivo: Alvenaria do embasamento"}),t({id:5,day:"Segunda",assignee:"Yuri",project:"Miguel Res.",disc:"ARQ",weight:2,status:"review",text:"Finalização e validação: Planta de piso do pavimento tipo"}),t({id:6,day:"Terça",assignee:"Cassio",project:"Itajaí - Viabilidade",disc:"ARQ",weight:3,durationDays:2,status:"doing",text:"Estudo de massa volumétrica e implantação preliminar"}),t({id:7,day:"Terça",assignee:"Lourrane",project:"Sky Green",disc:"LEG",weight:2,status:"todo",text:"Projeto Legal: Detalhamento do pavimento térreo"}),t({id:8,day:"Terça",assignee:"Isabela",project:"Sky Green",disc:"ARQ",weight:2,status:"todo",text:"Modelagem 3D paramétrica: Hall de Entrada"}),t({id:9,day:"Terça",assignee:"Yuri",project:"Miguel Res.",disc:"EST",weight:3,durationDays:2,status:"todo",text:"Modelagem executiva da alvenaria (Pav. Tipo) e planta de forro"}),t({id:10,day:"Terça",assignee:"Yuri",project:"Miguel Res.",disc:"BIM",weight:1,status:"todo",isCoordPoint:!0,valid:"pending",time:"A definir",text:"Reunião de Compatibilização com Estrutural"}),t({id:11,day:"Quarta",assignee:"Cassio",project:"Itajaí - Viabilidade",disc:"ARQ",weight:2,status:"todo",text:"Fechamento e entrega da viabilidade volumétrica para revisão"}),t({id:12,day:"Quarta",assignee:"Lourrane",project:"Sky Green",disc:"LEG",weight:2,status:"todo",text:"Projeto Legal: Início do lançamento de garagens e acessos"}),t({id:13,day:"Quarta",assignee:"Yuri",project:"Itajaí - Viabilidade",disc:"BIM",weight:2,status:"todo",isCoordPoint:!0,valid:"pending",text:"Revisão Técnica (Coord. BIM): Validação da viabilidade"}),t({id:14,day:"Quarta",assignee:"Equipe",project:"Sky Green",disc:"BIM",weight:3,status:"todo",isCoordPoint:!0,valid:"pending",text:"Compatibilização Multidisciplinar: Ambientes do Lazer 1"}),t({id:15,day:"Quarta",assignee:"Yuri",project:"Miguel Res.",disc:"ARQ",weight:2,status:"todo",text:"Finalização do modelo de alvenaria do tipo e emissão da planta de forro"}),t({id:16,day:"Quinta",assignee:"Lourrane",project:"Sky Green",disc:"LEG",weight:2,status:"todo",text:"Projeto Legal: Detalhamento de garagens e quadro de áreas"}),t({id:17,day:"Quinta",assignee:"Equipe",project:"Sky Green",disc:"BIM",weight:3,status:"todo",isCoordPoint:!0,valid:"pending",text:"Fechamento de Compatibilização: Resolução Lazer 1"}),t({id:18,day:"Quinta",assignee:"Yuri",project:"Miguel Res.",disc:"MEP",weight:3,durationDays:2,status:"todo",text:"Lançamento de elementos MEP (Elétrica e Hidráulica)"}),t({id:19,day:"Sexta",assignee:"Lourrane",project:"Sky Green",disc:"LEG",weight:2,status:"todo",text:"Projeto Legal: Revisão final padrão prefeitura (Térreo e Garagens)"}),t({id:20,day:"Sexta",assignee:"Isabela",project:"Sky Green",disc:"ARQ",weight:2,status:"todo",text:"Modelagem de exteriores: Área externa do Lazer 1"}),t({id:21,day:"Sexta",assignee:"Yuri",project:"Miguel Res.",disc:"ELE",weight:2,status:"todo",text:"Finalização do lançamento de pontos elétricos e hidráulicos"}),t({id:22,day:"Sexta",assignee:"Equipe",project:"Geral",disc:"BIM",weight:1,status:"todo",isCoordPoint:!0,valid:"pending",time:"Final do Dia",text:"Reunião de Coordenação: Alinhamento de evolução"})]}const wa="enigami_custom_v1",Sa="enigami_roster_v1";function Z(){try{const t=localStorage.getItem(wa);if(t){const r=JSON.parse(t);return{projects:r.projects||[],people:r.people||[],disciplines:r.disciplines||[]}}}catch{}return{projects:[],people:[],disciplines:[]}}function ee(t){try{localStorage.setItem(wa,JSON.stringify(t))}catch{}}function Ce(){try{const t=localStorage.getItem(Sa);if(t){const r=JSON.parse(t);return{removed:r.removed||[],patch:r.patch||{}}}}catch{}return{removed:[],patch:{}}}function Qe(t){try{localStorage.setItem(Sa,JSON.stringify(t))}catch{}}function ya(t,r){const s=t.replace(/[^a-zA-Zà-úÀ-Ú0-9 ]/g,"").trim().toUpperCase(),l=s.split(/\s+/).filter(Boolean);let x=l.length>=2?l[0][0]+l[1][0]+(l[1][1]||l[0][1]||""):s.slice(0,3);x=(x||"XXX").slice(0,3);let y=x,j=1;for(;r.includes(y);)y=x.slice(0,2)+j++;return y}function g({name:t,size:r=18,color:s,style:l,className:x}){return e.jsx("span",{className:"material-symbols-outlined "+(x||""),style:{fontSize:r,color:s||"inherit",lineHeight:1,...l},children:t})}function Y({value:t,color:r,height:s=5}){return e.jsx("div",{className:"prog-track",style:{height:s},children:e.jsx("div",{className:"prog-fill",style:{width:t+"%",background:r||"var(--primary)"}})})}function wt(){const{db:t,setDb:r,currentUser:s,theme:l,activeProject:x}=Za(),[y,j]=v.useState(()=>{try{const a=localStorage.getItem("enigami_agenda_tweaks");if(a)return JSON.parse(a)}catch{}return bt}),b=(a,n)=>{j(c=>{const o={...c,[a]:n};try{localStorage.setItem("enigami_agenda_tweaks",JSON.stringify(o))}catch{}return o})},[m,k]=v.useState(()=>localStorage.getItem("enigami_active_coord")||s?.name||"Yuri"),[I,f]=v.useState(!1),[S,A]=v.useState(!1),[z,u]=v.useState(0),[E,d]=v.useState(!1),[p,F]=v.useState(0),[h,O]=v.useState([]),[i,N]=v.useState("day"),[w,P]=v.useState(()=>localStorage.getItem("enigami_layout")||"list"),[te,Ee]=v.useState("all"),[ne,De]=v.useState("all"),[re,Ie]=v.useState("all"),[ue,ia]=v.useState(!1),[ie,Te]=v.useState(!1),[J,Oe]=v.useState("all"),[sa,Be]=v.useState(null),[oa,Aa]=v.useState(!1),[la,se]=v.useState({open:!1,task:null}),[Na,fe]=v.useState(!1),[da,H]=v.useState(null),[Pe,Re]=v.useState(!1),[ca,za]=v.useState("all"),[pa,ye]=v.useState(null),[Fa,We]=v.useState(!1),xe=v.useRef(null),ga=Ke(),ve=p===0,be=(a,n)=>"enigami_plan_"+a+"_"+ae(n);v.useEffect(()=>{let a=null;try{const n=localStorage.getItem(be(m,p));n&&(a=+n)}catch{}if(!a&&m==="Yuri"&&p===0){a=Date.parse("2026-06-01T00:00:00");try{localStorage.setItem(be(m,p),String(a))}catch{}}Be(a)},[m,p]);const Ea=()=>{const a=Date.now();try{localStorage.setItem(be(m,p),String(a))}catch{}Be(a)},Da=()=>{try{localStorage.removeItem(be(m,p))}catch{}Be(null)},oe=v.useMemo(()=>Z(),[z]),Le=v.useMemo(()=>Ce(),[z]),G=v.useMemo(()=>{const a=[...et];return oe.projects.forEach(n=>{a.some(c=>c.name.toLowerCase()===n.name.toLowerCase())||a.push(n)}),t.projects.forEach(n=>{a.some(c=>c.name.toLowerCase()===n.name.toLowerCase())||a.push({name:n.name,code:n.name.slice(0,3).toUpperCase(),color:M[a.length%M.length]})}),a},[t.projects,oe.projects]),R=v.useMemo(()=>{const a=[...at];return oe.people.forEach(n=>{a.some(c=>c.name.toLowerCase()===n.name.toLowerCase())||a.push(n)}),t.team.forEach(n=>{a.some(c=>c.name.toLowerCase()===n.toLowerCase())||a.push({name:n,color:M[(a.length+3)%M.length],role:"Colaborador",capacity:10,coordinator:!1})}),Object.entries(Le.patch).forEach(([n,c])=>{const o=a.find(C=>C.name===n);o&&(c.role!=null&&(o.role=c.role),c.coordinator!=null&&(o.coordinator=c.coordinator))}),a.filter(n=>!Le.removed.includes(n.name))},[t.team,oe.people,Le,z]),U=v.useMemo(()=>{const a=[...tt];return oe.disciplines.forEach(n=>{a.some(c=>c.code.toUpperCase()===n.code.toUpperCase())||a.push(n)}),t.disciplines.forEach(n=>{a.some(c=>c.code.toUpperCase()===n.code.toUpperCase())||a.push({code:n.code.toUpperCase(),name:n.name,color:n.color||"#64748B"})}),a},[t.disciplines,oe.disciplines]),Ia=a=>{const n=R.find(c=>c.name===a);return!!(n&&n.coordinator)},Ta=()=>R.filter(a=>a.coordinator),je=a=>R.find(n=>n.name===a)||{name:a,color:"#94A3B8",role:"",capacity:10},ke=a=>G.find(n=>n.name===a)?.color||"#9CA3AF",we=a=>G.find(n=>n.name===a)?.code||"—",Me=a=>U.find(n=>n.code===a)||null,xa=Ia(m);v.useEffect(()=>{O(it(x,m,p))},[p,m,x]);const le=a=>{if(O(a),!x)return;const c=[...(x.agendaTasks||[]).filter(o=>!(o.coord===m&&o.weekOffset===p)),...a.map(o=>({...o,coord:m,weekOffset:p}))];r(o=>({...o,projects:o.projects.map(C=>C.id===x.id?{...C,agendaTasks:c,updatedAt:new Date().toISOString()}:C)}));try{localStorage.setItem(Fe(m,p),JSON.stringify(a))}catch{}},_e=v.useMemo(()=>st(x,m,p-1),[p,m,x]),Oa=()=>{if(!x)return;const n=[...(x.agendaTasks||[]).filter(c=>!(c.coord===m&&c.weekOffset===p)),...h.map(c=>({...c,coord:m,weekOffset:p}))];r(c=>({...c,projects:c.projects.map(o=>o.id===x.id?{...o,agendaTasks:n,updatedAt:new Date().toISOString()}:o)}));try{localStorage.setItem(Fe(m,p),JSON.stringify(h))}catch{}d(!0),setTimeout(()=>d(!1),1900)},Ge=a=>{f(!1),a!==m&&(F(0),k(a),localStorage.setItem("enigami_active_coord",a))},Ba=(a,n)=>{const c=a.trim();if(!c)return;const o=Z(),C=Ce();let D=R.find(T=>T.name.toLowerCase()===c.toLowerCase());if(D){C.removed=C.removed.filter(He=>He!==D.name),C.patch[D.name]={...C.patch[D.name]||{},coordinator:!0,...n.trim()?{role:n.trim()}:{}},Qe(C);const T=o.people.find(He=>He.name===D.name);T&&(T.coordinator=!0,n.trim()&&(T.role=n.trim()),ee(o))}else{const T={name:c,role:n.trim()||"Coordenação",color:M[(R.length+3)%M.length],capacity:13,coordinator:!0};o.people.push(T),ee(o)}u(T=>T+1),Ge(c)},Pa=(a,n)=>{const c=Ce();c.patch[a]={...c.patch[a]||{},role:n},Qe(c);const o=Z(),C=o.people.find(D=>D.name===a);C&&(C.role=n,ee(o)),u(D=>D+1)},Ra=a=>{const n=Ce();n.removed.includes(a)||n.removed.push(a),delete n.patch[a],Qe(n);const c=Z();if(c.people=c.people.filter(o=>o.name!==a),ee(c),u(o=>o+1),a===m){const o=R.filter(C=>C.coordinator&&C.name!==a)[0];o&&Ge(o.name)}},Wa=a=>{const n=a.trim();if(!n)return null;const c=G.find(D=>D.name.toLowerCase()===n.toLowerCase());if(c)return c;const o={name:n,code:ya(n,G.map(D=>D.code)),color:M[G.length%M.length]},C=Z();return C.projects.push(o),ee(C),u(D=>D+1),o},La=a=>{const n=a.trim();if(!n)return null;const c=R.find(D=>D.name.toLowerCase()===n.toLowerCase());if(c)return c;const o={name:n,role:"Equipe",color:M[(R.length+3)%M.length],capacity:10,coordinator:!1},C=Z();return C.people.push(o),ee(C),u(D=>D+1),o},Ma=a=>{const n=a.trim();if(!n)return null;const c=ya(n,U.map(T=>T.code)),o=U.find(T=>T.name.toLowerCase()===n.toLowerCase());if(o)return o;const C={code:c,name:n,color:M[(U.length+1)%M.length]},D=Z();return D.disciplines.push(C),ee(D),u(T=>T+1),C};v.useEffect(()=>{if(!I&&!Pe)return;const a=()=>{f(!1),Re(!1)};return document.addEventListener("click",a),()=>document.removeEventListener("click",a)},[I,Pe]),v.useEffect(()=>{const a=document.documentElement;a.style.setProperty("--weekly-primary",y.accent),a.style.setProperty("--weekly-primary-soft",y.accent+"18")},[y.accent]);const _a=(a,n)=>{le(h.map(c=>c.id===a?{...c,status:n,completed:n==="done",completedAt:n==="done"?Date.now():null}:c))},ma=(a,n)=>{xa&&le(h.map(c=>c.id===a?{...c,valid:n,validBy:m,validAt:Date.now()}:c))},Ga=a=>le(h.filter(n=>n.id!==a)),qa=a=>{if(!x)return;const n=h.find(o=>o.id===a);if(!n)return;const c=(x.agendaTasks||[]).map(o=>o.id===a?{...o,weekOffset:p+1,dueDate:Q(Se(o),p+1),postponedCount:(o.postponedCount||0)+1,carriedFrom:Ue(p)}:o);r(o=>({...o,projects:o.projects.map(C=>C.id===x.id?{...C,agendaTasks:c,updatedAt:new Date().toISOString()}:C)})),O(h.filter(o=>o.id!==a));try{const o=m==="Yuri"?de+ae(p):de+m+"_"+ae(p);localStorage.setItem(o,JSON.stringify(h.filter(T=>T.id!==a)));const C=m==="Yuri"?de+ae(p+1):de+m+"_"+ae(p+1),D=JSON.parse(localStorage.getItem(C)||"[]");D.push({...n,dueDate:Q(Se(n),p+1),postponedCount:(n.postponedCount||0)+1,carriedFrom:Ue(p)}),localStorage.setItem(C,JSON.stringify(D))}catch{}},Va=a=>{const n={...a,completed:a.status==="done"};n.dueDate=Q(Se(n),p),a.id!=null?le(h.map(c=>c.id===a.id?{...c,...n}:c)):le([...h,{...n,id:Date.now(),createdAt:Date.now(),unplanned:!!sa}]),se({open:!1,task:null})},Ya=(a,n)=>{xe.current=n.id??null,a.dataTransfer.effectAllowed="move"},Ha=()=>{xe.current=null,ye(null)},ha=a=>n=>{n.preventDefault(),xe.current!=null&&le(h.map(c=>c.id===xe.current?{...c,day:a,dueDate:Q(Se({...c,day:a}),p)}:c)),xe.current=null,ye(null)},Ua=a=>a.unplanned&&!a.carriedFrom,K=v.useMemo(()=>h.filter(a=>(te==="all"||a.project===te)&&(ne==="all"||a.assignee===ne)&&(re==="all"||a.disc===re)&&(!ue||a.isCoordPoint)&&(!ie||pe(a))&&(J==="all"||J==="unplanned"&&Ua(a)||J==="carried"&&a.carriedFrom)),[h,te,ne,re,ue,ie,J]),B=v.useMemo(()=>{const a=h.length,n=h.filter($).length,c=h.filter(o=>o.isCoordPoint);return{total:a,done:n,progress:L(h),simpleProgress:a?Math.round(n/a*100):0,projects:new Set(h.map(o=>o.project)).size,people:new Set(h.filter(o=>o.assignee!=="Equipe").map(o=>o.assignee)).size,coordPending:c.filter(o=>(o.valid||"pending")==="pending").length,coordApproved:c.filter(o=>o.valid==="approved").length,coordTotal:c.length,overdue:h.filter(pe).length,nova:h.filter(o=>o.unplanned&&!o.carriedFrom).length,carried:h.filter(o=>o.carriedFrom).length}},[h]),q=v.useMemo(()=>Xe(h,p),[h,p]),X=_e!=null?B.progress-_e:null,qe=v.useMemo(()=>i==="project"?G.filter(a=>K.some(n=>n.project===a.name)).map(a=>({key:a.name,label:a.name,accent:a.color,isToday:!1,list:K.filter(n=>n.project===a.name)})):i==="assignee"?R.filter(a=>K.some(n=>n.assignee===a.name)).map(a=>({key:a.name,label:a.name,accent:a.color,isToday:!1,list:K.filter(n=>n.assignee===a.name)})):V.map(a=>({key:a,label:a,accent:void 0,isToday:ve&&a===ga,list:K.filter(n=>nt(n,a))})),[i,K,ga,ve,G,R]),ua=Ue(p),Qa=[{k:"day",label:"Dia",icon:"calendar_view_week"},{k:"project",label:"Projeto",icon:"folder"},{k:"assignee",label:"Equipe",icon:"group"}],Ve=te!=="all"||ne!=="all"||re!=="all"||ue||ie||J!=="all",fa=()=>{Ee("all"),De("all"),Ie("all"),ia(!1),Te(!1),Oe("all")},Ye=a=>{Re(!1),za(a),setTimeout(()=>window.print(),80)},W=ca==="all"?h:K,$a=v.useMemo(()=>{const a=W.length,n=W.filter($).length,c=W.filter(o=>o.isCoordPoint);return{total:a,done:n,progress:L(W),projects:new Set(W.map(o=>o.project)).size,people:new Set(W.filter(o=>o.assignee!=="Equipe").map(o=>o.assignee)).size,coordApproved:c.filter(o=>o.valid==="approved").length,coordTotal:c.length,coordPending:c.filter(o=>(o.valid||"pending")==="pending").length,overdue:W.filter(pe).length,nova:W.filter(o=>o.unplanned&&!o.carriedFrom).length,carried:W.filter(o=>o.carriedFrom).length}},[W]),Ja=v.useMemo(()=>Xe(W,p),[W,p]),Ka={onStatus:_a,onEdit:a=>se({open:!0,task:a}),onDelete:Ga,onValidate:ma,onPostpone:qa,onDragStart:Ya,onDragEnd:Ha},Xa=l==="dark";return e.jsxs("div",{className:`weekly-agenda-container ${Xa?"dark":""} ${y.cardStyle==="neuro"?"neuro":""} ${y.bgGrid?"":"nogrid"}`,children:[e.jsx("style",{children:jt}),e.jsxs("div",{className:"screen-only",style:{padding:"20px",minHeight:"100%",display:"flex",flexDirection:"column"},children:[e.jsxs("header",{style:{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:16,marginBottom:20},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:14},children:[e.jsx("div",{style:{width:42,height:42,borderRadius:12,background:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 18px -6px color-mix(in srgb, var(--primary) 60%, transparent)"},children:e.jsx(g,{name:"account_tree",size:24,color:"#fff"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"t-h1",style:{margin:0,fontSize:"18px",fontWeight:900},children:"Agenda da Semana"}),e.jsxs("div",{style:{position:"relative",marginTop:4},children:[e.jsxs("button",{className:"coord-chip",onClick:a=>{a.stopPropagation(),f(n=>!n)},children:[e.jsx(he,{name:m,size:20,meta:je(m)}),e.jsxs("span",{style:{display:"flex",flexDirection:"column",alignItems:"flex-start",lineHeight:1.15},children:[e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"var(--theme-text)"},children:m}),e.jsx("span",{style:{fontSize:8,fontWeight:800,letterSpacing:".12em",color:"var(--primary)",textTransform:"uppercase"},children:je(m).role})]}),e.jsx(g,{name:"unfold_more",size:14,color:"var(--theme-text-muted)"})]}),I&&e.jsxs("div",{className:"status-menu",style:{minWidth:220},onClick:a=>a.stopPropagation(),children:[e.jsx("div",{style:{padding:"4px 10px 6px",fontSize:8,fontWeight:800,letterSpacing:".16em",color:"var(--theme-text-muted)"},children:"COORDENADOR / CONFIGURAÇÃO"}),Ta().map(a=>e.jsxs("button",{className:a.name===m?"active":"",onClick:()=>Ge(a.name),children:[e.jsx(he,{name:a.name,size:20,meta:a}),e.jsxs("span",{style:{display:"flex",flexDirection:"column",lineHeight:1.2},children:[e.jsx("span",{style:{fontWeight:700},children:a.name}),e.jsx("span",{style:{fontSize:10,color:"var(--theme-text-muted)"},children:a.role})]}),a.name===m&&e.jsx(g,{name:"check",size:14,style:{marginLeft:"auto"},color:"var(--primary)"})]},a.name)),e.jsx("div",{style:{padding:"7px 10px 3px",fontSize:10,color:"var(--theme-text-muted)",borderTop:"1px solid var(--theme-divider)",marginTop:4},children:"Cada coordenador tem sua própria agenda semanal de entregas."}),e.jsxs("button",{onClick:()=>{f(!1),A(!0)},style:{marginTop:2,borderTop:"1px solid var(--theme-divider)"},children:[e.jsx(g,{name:"manage_accounts",size:15}),"Gerenciar coordenadores"]})]})]})]})]}),e.jsxs("div",{className:"no-print",style:{display:"flex",gap:8,alignItems:"center"},children:[e.jsxs("div",{className:"week-nav",children:[e.jsx("button",{onClick:()=>F(a=>a-1),"aria-label":"Semana anterior",children:e.jsx(g,{name:"chevron_left",size:16})}),e.jsxs("button",{className:"week-label",onClick:()=>F(0),title:"Voltar para a semana atual",children:[e.jsx("span",{className:"font-sq",style:{fontSize:11,fontWeight:800},children:ua}),e.jsx("span",{style:{fontSize:8,color:ve?"var(--primary)":"var(--theme-text-muted)",fontWeight:700,letterSpacing:".1em"},children:ve?"ESTA SEMANA":p<0?"PASSADA":"FUTURA"})]}),e.jsx("button",{onClick:()=>F(a=>a+1),"aria-label":"Próxima semana",children:e.jsx(g,{name:"chevron_right",size:16})})]}),e.jsxs("button",{className:"btn "+(E?"btn-saved":"btn-ghost"),onClick:Oa,title:"Salvar configuração neste navegador",children:[e.jsx(g,{name:E?"cloud_done":"save",size:15}),E?"Salvo":"Salvar"]}),e.jsxs("button",{className:"btn btn-ghost",onClick:()=>We(!0),title:"Design Tweaks",children:[e.jsx(g,{name:"settings",size:15}),"Ajustes"]}),e.jsxs("button",{className:"btn btn-primary",onClick:()=>se({open:!0,task:null}),children:[e.jsx(g,{name:"add",size:15}),"Nova Demanda"]})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(168px, 1fr))",gap:"var(--gap)",marginBottom:"var(--gap)"},children:[e.jsxs("div",{className:"card kpi-clickable",onClick:()=>H("insights"),style:{padding:"12px 14px",cursor:"pointer"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7},children:[e.jsx(g,{name:"trending_up",size:15,color:"var(--primary)"}),e.jsx("span",{className:"cap",style:{fontSize:9,color:"var(--theme-text-muted)"},children:"Avanço Ponderado"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginTop:6,flexWrap:"wrap"},children:[e.jsxs("span",{className:"font-sq",style:{fontSize:26,fontWeight:800,color:"var(--primary)",lineHeight:1},children:[B.progress,"%"]}),X!=null&&X!==0&&e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",fontSize:11,fontWeight:800,color:X>0?"var(--success)":"var(--danger)"},children:[e.jsx(g,{name:X>0?"arrow_upward":"arrow_downward",size:12}),X>0?"+":"",X,"%"]})]}),e.jsx("div",{style:{marginTop:8},children:e.jsx(Y,{value:B.progress,color:"var(--primary)"})})]}),e.jsxs("div",{className:"card kpi-clickable",onClick:()=>H("insights"),style:{padding:"12px 14px",cursor:"pointer"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7},children:[e.jsx(g,{name:"speed",size:15,color:q.onTrackPct>=90?"var(--success)":q.onTrackPct>=60?"#EAB308":"var(--danger)"}),e.jsx("span",{className:"cap",style:{fontSize:9,color:"var(--theme-text-muted)"},children:"No Prazo"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginTop:6},children:[e.jsx("span",{className:"font-sq",style:{fontSize:26,fontWeight:800,lineHeight:1,color:q.onTrackPct>=90?"var(--success)":q.onTrackPct>=60?"#EAB308":"var(--danger)"},children:q.hasData?q.onTrackPct+"%":"—"}),e.jsx("span",{style:{fontSize:10,color:"var(--theme-text-muted)"},children:"previsto × feito"})]}),e.jsx("div",{style:{marginTop:8},children:e.jsx(Y,{value:q.onTrackPct,color:q.onTrackPct>=90?"var(--success)":q.onTrackPct>=60?"#EAB308":"var(--danger)"})})]}),e.jsxs("div",{className:"card kpi-clickable",onClick:()=>H("validation"),style:{padding:"12px 14px",cursor:"pointer"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7},children:[e.jsx(g,{name:"verified",size:15,color:"#6366F1"}),e.jsx("span",{className:"cap",style:{fontSize:9,color:"var(--theme-text-muted)"},children:"Validações"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginTop:6},children:[e.jsx("span",{className:"font-sq",style:{fontSize:26,fontWeight:800,color:"#4F46E5",lineHeight:1},children:B.coordPending}),e.jsxs("span",{style:{fontSize:10,color:"var(--theme-text-muted)"},children:["pendentes · ",B.coordApproved,"/",B.coordTotal," ok"]})]}),e.jsxs("div",{style:{marginTop:8,display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"#6366F1"},children:[e.jsx(g,{name:"bolt",size:12}),"Ver fila de coordenação"]})]}),e.jsxs("div",{className:"card",style:{padding:"12px 14px",display:"flex",flexDirection:"column",gap:6},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7},children:[e.jsx(g,{name:"warning",size:15,color:B.overdue?"var(--danger)":"var(--success)"}),e.jsx("span",{className:"cap",style:{fontSize:9,color:"var(--theme-text-muted)"},children:"Em Atraso"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginTop:2},children:[e.jsx("span",{className:"font-sq",style:{fontSize:26,fontWeight:800,color:B.overdue?"var(--danger)":"var(--success)",lineHeight:1},children:B.overdue}),e.jsx("span",{style:{fontSize:10,color:"var(--theme-text-muted)"},children:B.overdue?"requer ação imediata":"todas metas em dia"})]}),e.jsx("div",{style:{marginTop:8},children:e.jsx(Y,{value:B.overdue?100:0,color:"var(--danger)"})})]})]}),e.jsxs("div",{className:"no-print plan-strip",style:{marginBottom:"var(--gap)"},children:[e.jsx("div",{className:"plan-strip-status",children:sa?e.jsxs(Je.Fragment,{children:[e.jsx("span",{className:"plan-dot locked",children:e.jsx(g,{name:"lock",size:14})}),e.jsxs("div",{style:{minWidth:0},children:[e.jsx("div",{className:"cap",style:{fontSize:9,color:"var(--theme-text-muted)"},children:"Planejamento"}),e.jsx("div",{style:{fontSize:12.5,fontWeight:700,color:"var(--theme-text)"},children:"Lançado · novas demandas são sinalizadas"})]}),e.jsx("button",{className:"btn-icon",title:"Reabrir planejamento (parar de marcar novas)",onClick:Da,style:{marginLeft:"auto"},children:e.jsx(g,{name:"lock_open",size:17})})]}):e.jsxs(Je.Fragment,{children:[e.jsx("span",{className:"plan-dot open",children:e.jsx(g,{name:"lock_open",size:14})}),e.jsxs("div",{style:{minWidth:0},children:[e.jsx("div",{className:"cap",style:{fontSize:9,color:"var(--theme-text-muted)"},children:"Planejamento"}),e.jsx("div",{style:{fontSize:12.5,fontWeight:700,color:"var(--theme-text)"},children:"Em aberto · monte a semana e feche o lançamento"})]}),e.jsxs("button",{className:"btn btn-primary",onClick:Ea,style:{marginLeft:"auto"},children:[e.jsx(g,{name:"flag",size:15}),"Fechar lançamento"]})]})}),e.jsxs("div",{className:"plan-strip-chips",children:[e.jsxs("button",{className:"origin-chip nova"+(J==="unplanned"?" active":""),onClick:()=>Oe(a=>a==="unplanned"?"all":"unplanned"),disabled:B.nova===0,children:[e.jsx("span",{className:"oc-count",children:B.nova}),e.jsxs("span",{className:"oc-label",children:[e.jsx(g,{name:"bolt",size:13}),"Novas nesta semana"]})]}),e.jsxs("button",{className:"origin-chip carried"+(J==="carried"?" active":""),onClick:()=>Oe(a=>a==="carried"?"all":"carried"),disabled:B.carried===0,children:[e.jsx("span",{className:"oc-count",children:B.carried}),e.jsxs("span",{className:"oc-label",children:[e.jsx(g,{name:"history",size:13}),"Vindas da semana anterior"]})]})]})]}),e.jsxs("div",{className:"no-print",style:{display:"flex",flexWrap:"wrap",gap:10,alignItems:"center",justifyContent:"space-between",marginBottom:"var(--gap)"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"},children:[e.jsx("div",{className:"seg",children:Qa.map(a=>e.jsxs("button",{className:i===a.k?"active":"",onClick:()=>N(a.k),children:[e.jsx(g,{name:a.icon,size:14}),a.label]},a.k))}),e.jsxs("div",{className:"seg desktop-only",children:[e.jsx("button",{className:w==="list"?"active":"",onClick:()=>P("list"),title:"Faixas horizontais",children:e.jsx(g,{name:"view_agenda",size:14})}),e.jsx("button",{className:w==="board"?"active":"",onClick:()=>P("board"),title:"Colunas (quadro)",children:e.jsx(g,{name:"view_week",size:14})})]})]}),e.jsxs("div",{className:"desktop-only",style:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"},children:[e.jsxs("select",{className:"select",style:{width:"auto",padding:"6px 30px 6px 12px",fontSize:11.5},value:te,onChange:a=>Ee(a.target.value),children:[e.jsx("option",{value:"all",children:"Todos projetos"}),G.map(a=>e.jsx("option",{value:a.name,children:a.name},a.name))]}),e.jsxs("select",{className:"select",style:{width:"auto",padding:"6px 30px 6px 12px",fontSize:11.5},value:ne,onChange:a=>De(a.target.value),children:[e.jsx("option",{value:"all",children:"Toda equipe"}),R.map(a=>e.jsx("option",{value:a.name,children:a.name},a.name))]}),e.jsxs("select",{className:"select",style:{width:"auto",padding:"6px 30px 6px 12px",fontSize:11.5},value:re,onChange:a=>Ie(a.target.value),children:[e.jsx("option",{value:"all",children:"Disciplinas"}),U.map(a=>e.jsx("option",{value:a.code,children:a.code},a.code))]}),e.jsx("button",{className:"btn-icon"+(ie?" on-danger":""),title:"Só atrasadas",onClick:()=>Te(a=>!a),children:e.jsx(g,{name:"warning",size:16})}),Ve&&e.jsx("button",{className:"btn-icon",title:"Limpar filtros",onClick:fa,children:e.jsx(g,{name:"filter_alt_off",size:16})}),e.jsxs("div",{style:{position:"relative"},children:[e.jsxs("button",{className:"btn btn-ghost",style:{padding:"7px 12px"},onClick:a=>{a.stopPropagation(),Re(n=>!n)},children:[e.jsx(g,{name:"download",size:14}),"Relatório PDF",e.jsx(g,{name:"expand_more",size:13})]}),Pe&&e.jsxs("div",{className:"status-menu",style:{right:0,left:"auto",minWidth:232},onClick:a=>a.stopPropagation(),children:[e.jsxs("label",{className:"export-opt",onClick:a=>a.stopPropagation(),children:[e.jsx("input",{type:"checkbox",checked:oa,onChange:a=>Aa(a.target.checked)}),e.jsxs("span",{children:[e.jsx(g,{name:"checklist",size:14}),"Incluir checklist"]})]}),e.jsx("div",{style:{height:1,background:"var(--theme-divider)",margin:"4px 6px"}}),e.jsxs("button",{onClick:()=>Ye("all"),children:[e.jsx(g,{name:"calendar_month",size:14}),"Exportar semana inteira"]}),e.jsxs("button",{onClick:()=>Ye("filtered"),children:[e.jsx(g,{name:"filter_alt",size:14}),"Exportar visão filtrada"]})]})]})]}),e.jsxs("button",{className:"btn btn-ghost mobile-only",onClick:()=>fe(!0),children:[e.jsx(g,{name:"tune",size:14}),"Filtros",Ve?" •":""]})]}),(()=>{const a=(n,c)=>n.map(o=>{const C=ta(o),D=c&&C>1?{part:_[c]-ze(o)+1,total:C,isEnd:_[c]===na(o),isStart:_[c]===ze(o)}:null;return e.jsx(ct,{task:o,groupBy:i,showProjColor:y.projColors,canValidate:xa,span:D,getProjColor:ke,getProjCode:we,getDiscMeta:Me,getPersonMeta:je,...Ka},o.id+"@"+(c||"x"))});return e.jsx("div",{style:{flex:1},children:w==="board"?e.jsx("div",{className:"board",style:{"--cols":qe.length},children:qe.map(n=>e.jsx(pt,{meta:{label:n.label},tasks:n.list,accent:n.accent,isToday:n.isToday,dropping:pa===n.key&&i==="day",onDragOver:i==="day"?c=>{c.preventDefault(),ye(n.key)}:void 0,onDrop:i==="day"?ha(n.key):void 0,children:a(n.list,i==="day"?n.key:null)},n.key))}):e.jsx("div",{className:"stack",children:qe.map(n=>e.jsx(gt,{meta:{label:n.label},tasks:n.list,accent:n.accent,isToday:n.isToday,dropping:pa===n.key&&i==="day",onDragOver:i==="day"?c=>{c.preventDefault(),ye(n.key)}:void 0,onDrop:i==="day"?ha(n.key):void 0,children:a(n.list,i==="day"?n.key:null)},n.key))})})})(),i==="day"&&e.jsxs("p",{className:"no-print desktop-only",style:{textAlign:"center",fontSize:11,color:"var(--theme-text-muted)",marginTop:14},children:[e.jsx(g,{name:"drag_indicator",size:13,style:{marginRight:4}}),"Dica: arraste os cartões entre os dias da semana para reorganizar a agenda"]})]}),e.jsx(ft,{tasks:W,weekLabel:"SEMANA "+ua,stats:$a,pva:Ja,trend:X,scope:ca,coord:m,getProjColor:ke,getProjCode:we,getDiscMeta:Me,getPersonMeta:je,showChecklist:oa}),e.jsxs("nav",{className:"bottom-nav no-print",children:[e.jsx(Ae,{icon:"dashboard",label:"Agenda",onClick:()=>window.scrollTo({top:0,behavior:"smooth"}),active:!0}),e.jsx(Ae,{icon:"insights",label:"Painel",onClick:()=>H("insights")}),e.jsx("button",{onClick:()=>se({open:!0,task:null}),style:{border:"none",background:"var(--primary)",width:44,height:44,borderRadius:14,color:"#fff",cursor:"pointer",boxShadow:"0 8px 18px -6px color-mix(in srgb, var(--primary) 60%, transparent)",marginTop:-20,display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(g,{name:"add",size:22})}),e.jsx(Ae,{icon:"verified",label:"Validar",onClick:()=>H("validation"),badge:B.coordPending>0}),e.jsx(Ae,{icon:"tune",label:"Filtros",onClick:()=>fe(!0),badge:Ve})]}),Na&&e.jsx("div",{className:"overlay no-print mobile-only",onClick:()=>fe(!1),style:{alignItems:"flex-end",padding:0},children:e.jsxs("div",{className:"card",onClick:a=>a.stopPropagation(),style:{width:"100%",borderRadius:"24px 24px 0 0",padding:20,animation:"slideUp .3s cubic-bezier(.16,1,.3,1)"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16},children:[e.jsx("h2",{className:"t-h2",style:{margin:0,fontSize:14},children:"Filtros de Agenda"}),e.jsx("button",{className:"btn-icon",onClick:()=>fe(!1),children:e.jsx(g,{name:"close",size:16})})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Projeto"}),e.jsxs("select",{className:"select",value:te,onChange:a=>Ee(a.target.value),children:[e.jsx("option",{value:"all",children:"Todos projetos"}),G.map(a=>e.jsx("option",{value:a.name,children:a.name},a.name))]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Responsável"}),e.jsxs("select",{className:"select",value:ne,onChange:a=>De(a.target.value),children:[e.jsx("option",{value:"all",children:"Toda equipe"}),R.map(a=>e.jsx("option",{value:a.name,children:a.name},a.name))]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Disciplina"}),e.jsxs("select",{className:"select",value:re,onChange:a=>Ie(a.target.value),children:[e.jsx("option",{value:"all",children:"Todas"}),U.map(a=>e.jsxs("option",{value:a.code,children:[a.code," · ",a.name]},a.code))]})]}),e.jsxs("button",{className:"btn "+(ue?"btn-primary":"btn-ghost"),onClick:()=>ia(a=>!a),style:{width:"100%"},children:[e.jsx(g,{name:"verified",size:14}),"Requer validação"]}),e.jsxs("button",{className:"btn "+(ie?"btn-primary":"btn-ghost"),onClick:()=>Te(a=>!a),style:{width:"100%",...ie?{background:"var(--danger)"}:{}},children:[e.jsx(g,{name:"warning",size:14}),"Só atrasadas"]}),e.jsxs("button",{className:"btn btn-ghost",style:{width:"100%"},onClick:()=>Ye("all"),children:[e.jsx(g,{name:"download",size:14}),"Exportar PDF"]}),e.jsx("button",{className:"btn btn-ghost",style:{width:"100%"},onClick:fa,children:"Limpar todos filtros"})]})]})}),e.jsx(xt,{open:la.open,initial:la.task,weekOffset:p,onClose:()=>se({open:!1,task:null}),onSave:Va,integratedProjects:G,integratedPeople:R,integratedDisciplines:U,handleAddProject:Wa,handleAddPerson:La,handleAddDiscipline:Ma}),e.jsx(mt,{open:S,activeCoord:m,onClose:()=>A(!1),onAdd:Ba,onUpdateRole:Pa,onRemove:Ra,integratedPeople:R}),e.jsx(ht,{open:da==="insights",onClose:()=>H(null),tasks:h,weekOffset:p,prevProgress:_e,integratedPeople:R,integratedDisciplines:U,getProjColor:ke,getProjCode:we}),e.jsx(ut,{open:da==="validation",onClose:()=>H(null),tasks:h,onValidate:ma,onOpenTask:a=>{H(null),se({open:!0,task:a})},getProjColor:ke,getProjCode:we,getDiscMeta:Me}),Fa&&e.jsx("div",{className:"overlay no-print",onClick:()=>We(!1),children:e.jsxs("div",{className:"modal",onClick:a=>a.stopPropagation(),style:{maxWidth:360},children:[e.jsxs("div",{style:{padding:"16px 20px",borderBottom:"1px solid var(--theme-divider)",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[e.jsx("h2",{className:"t-h2",style:{margin:0,fontSize:14},children:"Ajustes de Design"}),e.jsx("button",{className:"btn-icon",onClick:()=>We(!1),children:e.jsx(g,{name:"close",size:16})})]}),e.jsxs("div",{style:{padding:20,display:"flex",flexDirection:"column",gap:14},children:[e.jsx(yt,{label:"Cor de Destaque",value:y.accent,options:["#FF6B4A","#6366F1","#10B981","#0EA5E9","#EC4899"],onChange:a=>b("accent",a)}),e.jsx(ba,{label:"Estilo dos Cards",value:y.cardStyle,options:["soft","neuro"],onChange:a=>b("cardStyle",a)}),e.jsx(ba,{label:"Densidade da Tabela",value:y.density,options:["compact","comfy","roomy"],onChange:a=>b("density",a)}),e.jsx(va,{label:"Cor por Projeto nos Cards",value:y.projColors,onChange:a=>b("projColors",a)}),e.jsx(va,{label:"Grade de Fundo Decorativa",value:y.bgGrid,onChange:a=>b("bgGrid",a)})]})]})})]})}function Ae({icon:t,label:r,onClick:s,active:l,badge:x}){return e.jsxs("button",{onClick:s,style:{border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 8px",color:l?"var(--primary)":"var(--theme-text-muted)",position:"relative"},children:[e.jsx(g,{name:t,size:21}),e.jsx("span",{style:{fontFamily:"var(--font-display)",fontWeight:800,fontSize:8.5,letterSpacing:"0.1em",textTransform:"uppercase"},children:r}),x&&e.jsx("span",{style:{position:"absolute",top:2,right:6,width:7,height:7,borderRadius:"50%",background:"var(--primary)"}})]})}function he({name:t,size:r=24,ring:s,meta:l}){return e.jsx("span",{className:"avatar",title:t+(l?.role?" · "+l.role:""),style:{width:r,height:r,fontSize:r*.38,background:l?.color||"#94A3B8",boxShadow:s?`0 0 0 2px #fff, 0 0 0 4px ${l?.color||"#94A3B8"}55`:void 0},children:ka(t)})}function ra({code:t,meta:r}){return r?e.jsx("span",{className:"chip",style:{background:r.color+"1A",color:r.color,border:`1px solid ${r.color}33`},title:r.name,children:t}):null}function lt(t){const r=ja(t);return r?String(r.getDate()).padStart(2,"0")+"/"+String(r.getMonth()+1).padStart(2,"0"):""}function dt({value:t,onChange:r}){const[s,l]=v.useState(!1),x=v.useRef(null);v.useEffect(()=>{const j=b=>{x.current&&!x.current.contains(b.target)&&l(!1)};return document.addEventListener("mousedown",j),()=>document.removeEventListener("mousedown",j)},[]);const y=ce.find(j=>j.key===t)||ce[0];return e.jsxs("span",{ref:x,style:{position:"relative"},children:[e.jsxs("button",{className:"status-pill no-print",onClick:j=>{j.stopPropagation(),l(b=>!b)},style:{background:y.color+"1A",color:y.color,border:`1px solid ${y.color}44`},children:[e.jsx("span",{style:{width:6,height:6,borderRadius:"50%",background:y.color}}),y.short,e.jsx(g,{name:"expand_more",size:12})]}),s&&e.jsx("div",{className:"status-menu",onClick:j=>j.stopPropagation(),children:ce.map(j=>e.jsxs("button",{onClick:()=>{r(j.key),l(!1)},className:j.key===t?"active":"",children:[e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",background:j.color}}),j.label,e.jsxs("span",{style:{marginLeft:"auto",fontSize:9,color:"var(--theme-text-muted)"},children:[j.pct,"%"]})]},j.key))})]})}function ct({task:t,onStatus:r,onEdit:s,onDelete:l,onValidate:x,onPostpone:y,onDragStart:j,onDragEnd:b,showProjColor:m,groupBy:k,canValidate:I,getProjColor:f,getProjCode:S,getDiscMeta:A,getPersonMeta:z,span:u}){const E=f(t.project),d=aa(t),p=$(t),F=!u||u.isEnd,h=pe(t)&&F,O=rt(t)&&F,i=t.subtasks?t.subtasks.filter(P=>P.done).length:0,N=t.isCoordPoint?me[t.valid||"pending"]||me.pending:null,w=ta(t);return e.jsxs("div",{className:"task animate-fade"+(p?" done":"")+(t.isCoordPoint?" validate":"")+(t.unplanned&&!t.carriedFrom?" nova":"")+(t.carriedFrom?" carried":"")+(h?" overdue":""),draggable:k==="day",onDragStart:P=>j(P,t),onDragEnd:b,children:[m&&!t.isCoordPoint&&e.jsx("div",{className:"task-accent",style:{background:E}}),e.jsxs("div",{style:{display:"flex",gap:11,alignItems:"flex-start",paddingLeft:m&&!t.isCoordPoint?6:0},children:[e.jsx("button",{className:"checkbox no-print"+(p?" checked":""),onClick:()=>r(t.id,p?"todo":"done"),"aria-label":"Concluir",children:p&&e.jsx(g,{name:"check",size:13})}),e.jsx("span",{className:"print-only",style:{width:14,height:14,border:"1.5px solid #374151",borderRadius:3,flexShrink:0,marginTop:2}}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:7},children:[k!=="project"&&e.jsx("span",{className:"chip",style:{background:E+"1A",color:E,border:`1px solid ${E}33`},children:S(t.project)}),e.jsx(ra,{code:t.disc,meta:A(t.disc)}),t.carriedFrom&&e.jsxs("span",{className:"chip",title:"Adiada de "+t.carriedFrom+(t.postponedCount>1?" · "+t.postponedCount+"ª vez":""),style:{background:"#F59E0B",color:"#fff",border:"none"},children:[e.jsx(g,{name:"history",size:11}),"Adiada",t.postponedCount>1?" ×"+t.postponedCount:""]}),t.unplanned&&!t.carriedFrom&&e.jsxs("span",{className:"chip",title:"Demanda nova — surgiu durante a semana (fora do planejamento inicial)",style:{background:"#FF6B4A",color:"#fff",border:"none",boxShadow:"0 2px 8px -2px #FF6B4AAA"},children:[e.jsx(g,{name:"bolt",size:11}),"Nova"]}),k!=="assignee"&&e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:5},children:[e.jsx(he,{name:t.assignee,size:18,meta:z(t.assignee)}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"var(--theme-text)"},children:t.assignee})]})]}),e.jsx("p",{className:"task-text",style:{margin:"0 0 9px",fontSize:13,lineHeight:1.45,color:"var(--theme-text)",textWrap:"pretty"},children:t.text}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:9,marginBottom:7},children:[e.jsx("div",{style:{flex:1},children:e.jsx(Y,{value:d,color:p?"var(--success)":d>=85?"#EAB308":d>0?"#0EA5E9":"var(--theme-divider)",height:3})}),e.jsxs("span",{className:"font-sq",style:{fontSize:9,fontWeight:800,color:"var(--theme-text-muted)",minWidth:26,textAlign:"right"},children:[d,"%"]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"},children:[e.jsx(dt,{value:t.status||(t.completed?"done":"todo"),onChange:P=>r(t.id,P)}),t.subtasks&&t.subtasks.length>0&&e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:600,color:"var(--theme-text-muted)"},children:[e.jsx(g,{name:"checklist",size:12}),i,"/",t.subtasks.length]}),e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:600,color:"var(--theme-text-muted)"},title:"Peso / esforço",children:[e.jsx(g,{name:"fitness_center",size:11}),t.weight||1]}),w>1&&e.jsxs("span",{className:"dur-pill",title:"Atividade de "+w+" dias"+(u?" · dia "+u.part+" de "+u.total:""),children:[e.jsx(g,{name:"date_range",size:12}),u?"Dia "+u.part+"/"+u.total:w+" dias"]}),t.dueDate&&F&&e.jsxs("span",{className:"due"+(h?" is-over":O?" is-today":""),children:[e.jsx(g,{name:h?"event_busy":"event",size:11}),w>1?"Entrega ":"",lt(t.dueDate),h?" · ATRASO":O?" · HOJE":""]}),u&&!u.isEnd&&e.jsxs("span",{className:"due continues",children:[e.jsx(g,{name:"arrow_forward",size:11}),"Continua"]}),t.time&&e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:600,color:"var(--theme-text-muted)"},children:[e.jsx(g,{name:"schedule",size:11}),t.time]})]}),t.isCoordPoint&&N&&e.jsxs("div",{className:"no-print",style:{marginTop:9,padding:"6px 8px",borderRadius:8,background:N.color+"14",border:`1px solid ${N.color}33`,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"},children:[e.jsxs("span",{className:"chip",style:{background:N.color+"22",color:N.color,border:"none"},children:[e.jsx(g,{name:"verified",size:11}),N.label]}),I?e.jsxs(Je.Fragment,{children:[t.valid!=="approved"&&e.jsxs("button",{className:"mini-btn ok",onClick:()=>x(t.id,"approved"),children:[e.jsx(g,{name:"check",size:12}),"Aprovar"]}),t.valid!=="returned"&&e.jsxs("button",{className:"mini-btn no",onClick:()=>x(t.id,"returned"),children:[e.jsx(g,{name:"undo",size:12}),"Devolver"]})]}):e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"var(--theme-text-muted)"},children:[e.jsx(g,{name:"lock",size:11}),"Coordenação"]})]})]}),e.jsxs("div",{className:"no-print task-actions",style:{display:"flex",flexDirection:"column",gap:2},children:[e.jsx("button",{className:"row-btn",onClick:()=>s(t),"aria-label":"Editar",children:e.jsx(g,{name:"edit",size:14})}),!p&&y&&e.jsx("button",{className:"row-btn warn",onClick:()=>y(t.id),"aria-label":"Adiar para próxima semana",title:"Adiar para a próxima semana",children:e.jsx(g,{name:"next_week",size:14})}),e.jsx("button",{className:"row-btn danger",onClick:()=>l(t.id),"aria-label":"Excluir",children:e.jsx(g,{name:"delete",size:14})})]})]})]})}function pt({meta:t,tasks:r,isToday:s,onDrop:l,onDragOver:x,dropping:y,children:j,accent:b}){const m=L(r);return e.jsxs("div",{className:"col"+(s?" today":"")+(y?" dropping":""),onDrop:l,onDragOver:x,children:[e.jsxs("div",{style:{padding:"10px 12px 8px",borderBottom:"1px solid var(--theme-divider)"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,minWidth:0},children:[b&&e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",background:b,flexShrink:0}}),e.jsx("h3",{className:"t-h3",style:{margin:0,fontSize:12,color:"var(--theme-text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:t.label}),s&&e.jsx("span",{className:"chip",style:{background:"var(--primary)",color:"#fff"},children:"Hoje"})]}),e.jsxs("span",{className:"font-sq",style:{fontSize:10,fontWeight:800,color:"var(--theme-text-muted)"},children:[m,"%"]})]}),e.jsx("div",{style:{marginTop:6},children:e.jsx(Y,{value:m,color:b||"var(--success)",height:4})})]}),e.jsx("div",{className:"col-body",children:j})]})}function gt({meta:t,tasks:r,isToday:s,accent:l,dropping:x,onDrop:y,onDragOver:j,children:b}){const m=L(r);return e.jsxs("div",{className:"band"+(s?" today":"")+(x?" dropping":""),onDrop:y,onDragOver:j,children:[e.jsxs("div",{className:"band-head",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,minWidth:0},children:[l&&e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",background:l,flexShrink:0}}),e.jsx("h3",{className:"t-h3",style:{margin:0,fontSize:12.5,color:"var(--theme-text)"},children:t.label}),s&&e.jsx("span",{className:"chip",style:{background:"var(--primary)",color:"#fff"},children:"Hoje"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,flexShrink:0},children:[e.jsx("div",{style:{width:100},children:e.jsx(Y,{value:m,color:l||"var(--success)",height:4})}),e.jsxs("span",{className:"font-sq",style:{fontSize:11,fontWeight:800,color:"var(--theme-text-muted)",minWidth:34,textAlign:"right"},children:[m,"%"]})]})]}),e.jsxs("div",{className:"band-body",children:[b,r.length===0&&e.jsx("div",{style:{padding:"8px 4px",color:"var(--theme-text-muted)",fontSize:11.5,fontStyle:"italic"},children:"Sem atividades alocadas."})]})]})}function $e({value:t,onChange:r,options:s,onAdd:l,placeholder:x,addLabel:y}){const[j,b]=v.useState(!1),[m,k]=v.useState(""),I=()=>{const f=l(m);f&&r(f),b(!1),k("")};return j?e.jsxs("div",{style:{display:"flex",gap:6},children:[e.jsx("input",{className:"input",autoFocus:!0,value:m,onChange:f=>k(f.target.value),placeholder:x,onKeyDown:f=>{f.key==="Enter"&&(f.preventDefault(),I()),f.key==="Escape"&&(b(!1),k(""))},style:{fontSize:12}}),e.jsx("button",{type:"button",className:"btn btn-primary",style:{flexShrink:0,padding:"0 10px"},onClick:I,children:e.jsx(g,{name:"check",size:14})}),e.jsx("button",{type:"button",className:"btn-icon",style:{flexShrink:0},onClick:()=>{b(!1),k("")},children:e.jsx(g,{name:"close",size:14})})]}):e.jsxs("select",{className:"select",value:t,onChange:f=>{f.target.value==="__add"?b(!0):r(f.target.value)},children:[s.map(f=>e.jsx("option",{value:f.value,children:f.label},f.value)),e.jsxs("option",{value:"__add",children:["＋ ",y]})]})}function xt({open:t,initial:r,weekOffset:s,onClose:l,onSave:x,integratedProjects:y,integratedPeople:j,integratedDisciplines:b,handleAddProject:m,handleAddPerson:k,handleAddDiscipline:I}){const f={text:"",day:"Segunda",assignee:"Yuri",project:"Geral",disc:"ARQ",status:"todo",weight:2,durationDays:1,time:"",dueDate:"",isCoordPoint:!1,valid:"pending",subtasks:[]},[S,A]=v.useState(f),[z,u]=v.useState(""),E=r&&r.id!=null;if(v.useEffect(()=>{if(t){const i=r?{...f,...r,subtasks:r.subtasks?[...r.subtasks]:[]}:f;i.dueDate||(i.dueDate=Q(i.day,s||0)),A(i),u("")}},[t,r]),!t)return null;const d=(i,N)=>A(w=>{const P={...w,[i]:N};return i==="day"&&(!w.dueDate||w.dueDate===Q(w.day,s||0))&&(P.dueDate=Q(N,s||0)),P}),p=()=>{z.trim()&&(A(i=>({...i,subtasks:[...i.subtasks||[],{id:Date.now()+"",text:z.trim(),done:!1}]})),u(""))},F=i=>A(N=>({...N,subtasks:N.subtasks?.map(w=>w.id===i?{...w,done:!w.done}:w)})),h=i=>A(N=>({...N,subtasks:N.subtasks?.filter(w=>w.id!==i)})),O=i=>{i.preventDefault(),S.text.trim()&&x(S)};return e.jsx("div",{className:"overlay no-print",onClick:l,children:e.jsxs("div",{className:"modal",onClick:i=>i.stopPropagation(),children:[e.jsxs("div",{style:{padding:"16px 20px",borderBottom:"1px solid var(--theme-divider)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--theme-card)"},children:[e.jsxs("h2",{className:"t-h2",style:{margin:0,fontSize:14,display:"flex",alignItems:"center",gap:9},children:[e.jsx(g,{name:E?"edit_note":"add_task",size:20,color:"var(--primary)"}),E?"Editar Demanda":"Nova Demanda"]}),e.jsx("button",{className:"btn-icon",onClick:l,"aria-label":"Fechar",children:e.jsx(g,{name:"close",size:16})})]}),e.jsxs("form",{onSubmit:O,style:{padding:20,display:"flex",flexDirection:"column",gap:14},children:[e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Atividade"}),e.jsx("textarea",{className:"textarea",value:S.text,onChange:i=>d("text",i.target.value),placeholder:"Descreva a entrega semanal…",autoFocus:!0,required:!0})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:[e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Projeto"}),e.jsx($e,{value:S.project,onChange:i=>d("project",i),addLabel:"Novo projeto",placeholder:"Nome...",options:y.map(i=>({value:i.name,label:i.name})),onAdd:i=>{const N=m(i);return N?N.name:null}})]}),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Disciplina"}),e.jsx($e,{value:S.disc,onChange:i=>d("disc",i),addLabel:"Nova disc.",placeholder:"Sigla...",options:b.map(i=>({value:i.code,label:i.code+" · "+i.name})),onAdd:i=>{const N=I(i);return N?N.code:null}})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:[e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Responsável"}),e.jsx($e,{value:S.assignee,onChange:i=>d("assignee",i),addLabel:"Novo resp.",placeholder:"Nome...",options:j.map(i=>({value:i.name,label:i.name})),onAdd:i=>{const N=k(i);return N?N.name:null}})]}),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Status"}),e.jsx("select",{className:"select",value:S.status,onChange:i=>d("status",i.target.value),children:ce.map(i=>e.jsxs("option",{value:i.key,children:[i.label," (",i.pct,"%)"]},i.key))})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10},children:[e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Dia de início"}),e.jsx("select",{className:"select",value:S.day,onChange:i=>d("day",i.target.value),children:V.map(i=>e.jsx("option",{value:i,children:i},i))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Duração (dias)"}),e.jsx("input",{type:"number",min:"1",max:"5",className:"input",value:S.durationDays||1,onChange:i=>d("durationDays",Math.min(5,Math.max(1,+i.target.value||1)))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Peso (1-10)"}),e.jsx("input",{type:"number",min:"1",max:"10",className:"input",value:S.weight,onChange:i=>d("weight",Math.max(1,+i.target.value||1))})]})]}),(()=>{const i=_[S.day]||0,N=S.durationDays||1,w=Math.min(i+N-1,4),P=i+N-1>4;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7,marginTop:-6,fontSize:11.5,color:"var(--theme-text-muted)",fontWeight:600},children:[e.jsx(g,{name:"event_available",size:14,color:"var(--primary)"}),N>1?e.jsxs("span",{children:["Ocupa ",e.jsxs("b",{style:{color:"var(--theme-text)"},children:[V[i]," → ",V[w]]})," · entrega na ",e.jsx("b",{style:{color:"var(--theme-text)"},children:V[w]}),P?" (limite da semana)":""]}):e.jsxs("span",{children:["Entrega na ",e.jsx("b",{style:{color:"var(--theme-text)"},children:V[i]})]})]})})(),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Subtarefas (Checklist)"}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:5},children:[S.subtasks?.map(i=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:8,background:"var(--theme-input)"},children:[e.jsx("button",{type:"button",onClick:()=>F(i.id),style:{width:16,height:16,borderRadius:5,flexShrink:0,border:`2px solid ${i.done?"var(--success)":"var(--theme-divider)"}`,background:i.done?"var(--success)":"#fff",color:"#fff",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"},children:i.done&&e.jsx(g,{name:"check",size:11})}),e.jsx("span",{style:{flex:1,fontSize:12,textDecoration:i.done?"line-through":"none",color:i.done?"var(--theme-text-muted)":"var(--theme-text)"},children:i.text}),e.jsx("button",{type:"button",className:"row-btn danger",onClick:()=>h(i.id),children:e.jsx(g,{name:"close",size:12})})]},i.id)),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("input",{className:"input",value:z,onChange:i=>u(i.target.value),placeholder:"Novo item...",onKeyDown:i=>{i.key==="Enter"&&(i.preventDefault(),p())},style:{fontSize:12}}),e.jsx("button",{type:"button",className:"btn btn-ghost",onClick:p,style:{flexShrink:0,padding:6},children:e.jsx(g,{name:"add",size:14})})]})]})]}),e.jsxs("button",{type:"button",onClick:()=>d("isCoordPoint",!S.isCoordPoint),style:{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:"var(--radius-md)",border:`1px solid ${S.isCoordPoint?"#6366F1":"var(--theme-divider)"}`,background:S.isCoordPoint?"#6366F112":"var(--theme-highlight)",cursor:"pointer",textAlign:"left"},children:[e.jsx("span",{style:{width:20,height:20,borderRadius:7,flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",background:S.isCoordPoint?"#6366F1":"var(--theme-card)",border:`2px solid ${S.isCoordPoint?"#6366F1":"var(--theme-divider)"}`,color:"#fff"},children:S.isCoordPoint&&e.jsx(g,{name:"check",size:13})}),e.jsxs("span",{children:[e.jsx("span",{className:"cap",style:{fontSize:9.5,color:S.isCoordPoint?"#4F46E5":"var(--theme-text)",display:"block"},children:"Ponto de Coordenação"}),e.jsx("span",{style:{fontSize:10.5,color:"var(--theme-text-muted)"},children:"Exige validação do coordenador ativo"})]})]}),e.jsxs("div",{style:{display:"flex",gap:10,justifyContent:"flex-end",borderTop:"1px solid var(--theme-divider)",paddingTop:14},children:[e.jsx("button",{type:"button",className:"btn btn-ghost",onClick:l,children:"Cancelar"}),e.jsxs("button",{type:"submit",className:"btn btn-primary",children:[e.jsx(g,{name:E?"save":"add",size:14}),E?"Salvar":"Adicionar"]})]})]})]})})}function mt({open:t,activeCoord:r,onClose:s,onAdd:l,onUpdateRole:x,onRemove:y,integratedPeople:j}){const[b,m]=v.useState(""),[k,I]=v.useState("");if(!t)return null;const f=j.filter(A=>A.coordinator),S=A=>{A.preventDefault(),b.trim()&&(l(b.trim(),k.trim()),m(""),I(""))};return e.jsx("div",{className:"overlay no-print",onClick:s,children:e.jsxs("div",{className:"modal",onClick:A=>A.stopPropagation(),style:{maxWidth:440},children:[e.jsxs("div",{style:{padding:"16px 20px",borderBottom:"1px solid var(--theme-divider)",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[e.jsxs("h2",{className:"t-h2",style:{margin:0,fontSize:14,display:"flex",alignItems:"center",gap:9},children:[e.jsx(g,{name:"manage_accounts",size:20,color:"var(--primary)"}),"Coordenadores"]}),e.jsx("button",{className:"btn-icon",onClick:s,children:e.jsx(g,{name:"close",size:16})})]}),e.jsxs("div",{style:{padding:20,display:"flex",flexDirection:"column",gap:12},children:[e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:f.map(A=>{const z=A.name===r,u=!z&&f.length>1;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,border:"1px solid var(--theme-divider)",background:z?"var(--primary-soft)":"var(--theme-card)"},children:[e.jsx(he,{name:A.name,size:28,meta:A}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:[e.jsx("span",{style:{fontSize:13,fontWeight:700},children:A.name}),z&&e.jsx("span",{className:"chip",style:{background:"var(--primary)",color:"#fff"},children:"Ativo"})]}),e.jsx("input",{className:"role-input",value:A.role,placeholder:"Função…",onChange:E=>x(A.name,E.target.value)})]}),e.jsx("button",{className:"row-btn danger",disabled:!u,title:z?"Troque de perfil para remover":"Remover",style:{opacity:u?1:.35},onClick:()=>u&&y(A.name),children:e.jsx(g,{name:"delete",size:15})})]},A.name)})}),e.jsxs("form",{onSubmit:S,style:{borderTop:"1px solid var(--theme-divider)",paddingTop:14,display:"flex",flexDirection:"column",gap:10},children:[e.jsx("span",{className:"field-label",children:"Promover Coordenador"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},children:[e.jsx("input",{className:"input",value:b,onChange:A=>m(A.target.value),placeholder:"Nome"}),e.jsx("input",{className:"input",value:k,onChange:A=>I(A.target.value),placeholder:"Cargo"})]}),e.jsxs("button",{type:"submit",className:"btn btn-primary",style:{alignSelf:"flex-start"},children:[e.jsx(g,{name:"person_add",size:14}),"Adicionar"]})]})]})]})})}function ht({open:t,onClose:r,tasks:s,weekOffset:l,prevProgress:x,integratedPeople:y,integratedDisciplines:j,getProjColor:b,getProjCode:m}){if(!t)return null;const k=Xe(s,l),I=L(s),f=x!=null?I-x:null,S=s.filter(pe),A=y.filter(u=>s.some(E=>E.assignee===u.name)).map(u=>{const E=s.filter(p=>p.assignee===u.name),d=E.reduce((p,F)=>p+ge(F),0);return{...u,w:d,ratio:Math.round(d/u.capacity*100),prog:L(E),count:E.length}}),z=j.filter(u=>s.some(E=>E.disc===u.code)).map(u=>{const E=s.filter(d=>d.disc===u.code);return{...u,prog:L(E),count:E.length}});return e.jsx("div",{className:"overlay no-print",onClick:r,style:{justifyContent:"flex-end",padding:0},children:e.jsxs("div",{className:"drawer",onClick:u=>u.stopPropagation(),children:[e.jsxs("div",{className:"drawer-head",children:[e.jsxs("h2",{className:"t-h2",style:{margin:0,fontSize:14,display:"flex",alignItems:"center",gap:9},children:[e.jsx(g,{name:"insights",size:20,color:"var(--primary)"}),"Painel de Avanço"]}),e.jsx("button",{className:"btn-icon",onClick:r,children:e.jsx(g,{name:"close",size:16})})]}),e.jsxs("div",{className:"drawer-body",children:[e.jsxs("section",{className:"ins-block",children:[e.jsxs("div",{className:"ins-title",children:[e.jsx(g,{name:"speed",size:14}),"Previsto × Realizado"]}),k.hasData?e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:10,marginBottom:8},children:[e.jsxs("span",{className:"font-sq",style:{fontSize:28,fontWeight:900,color:k.onTrackPct>=90?"var(--success)":k.onTrackPct>=60?"#EAB308":"var(--danger)"},children:[k.onTrackPct,"%"]}),e.jsx("span",{style:{fontSize:11,fontWeight:700,color:k.onTrackPct>=90?"var(--success)":k.onTrackPct>=60?"#EAB308":"var(--danger)"},children:k.onTrackPct>=90?"NO PRAZO":k.onTrackPct>=60?"ATENÇÃO":"ATRASADO"})]}),e.jsx(Y,{value:k.onTrackPct,color:k.onTrackPct>=90?"var(--success)":k.onTrackPct>=60?"#EAB308":"var(--danger)",height:6})]}):e.jsx("p",{style:{fontSize:11,color:"var(--theme-text-muted)",margin:0},children:"Sem dados de prazo para esta semana."})]}),e.jsxs("section",{className:"ins-block",children:[e.jsxs("div",{className:"ins-title",children:[e.jsx(g,{name:"trending_up",size:14}),"Avanço Semanal"]}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:10},children:[e.jsxs("span",{className:"font-sq",style:{fontSize:28,fontWeight:900,color:"var(--primary)"},children:[I,"%"]}),f!=null&&e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",fontSize:12,fontWeight:800,color:f>0?"var(--success)":f<0?"var(--danger)":"var(--theme-text-muted)"},children:[e.jsx(g,{name:f>0?"arrow_upward":f<0?"arrow_downward":"remove",size:14}),f>0?"+":"",f,"% vs. semana anterior"]})]})]}),e.jsxs("section",{className:"ins-block",children:[e.jsxs("div",{className:"ins-title",children:[e.jsx(g,{name:"balance",size:14}),"Carga por Integrante"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:A.map(u=>{const E=u.ratio>100;return e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4},children:[e.jsx(he,{name:u.name,size:18,meta:u}),e.jsx("span",{style:{fontSize:12,fontWeight:700},children:u.name}),e.jsxs("span",{style:{fontSize:10,color:"var(--theme-text-muted)",marginLeft:"auto"},children:[u.w,"/",u.capacity," pts"]})]}),e.jsx(Y,{value:Math.min(u.ratio,100),color:E?"var(--danger)":u.color,height:4})]},u.name)})})]}),e.jsxs("section",{className:"ins-block",children:[e.jsxs("div",{className:"ins-title",children:[e.jsx(g,{name:"category",size:14}),"Avanço por Disciplina"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:z.map(u=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.jsx("span",{style:{width:42,fontSize:10,fontWeight:700},children:e.jsx(ra,{code:u.code,meta:u})}),e.jsx("div",{style:{flex:1},children:e.jsx(Y,{value:u.prog,color:u.color,height:4})}),e.jsxs("span",{className:"font-sq",style:{fontSize:10,width:40,textAlign:"right",color:"var(--theme-text-muted)"},children:[u.prog,"%"]})]},u.code))})]}),S.length>0&&e.jsxs("section",{className:"ins-block",style:{borderColor:"#fecaca",background:"#FEF2F2"},children:[e.jsxs("div",{className:"ins-title",style:{color:"var(--danger)"},children:[e.jsx(g,{name:"warning",size:14}),"Demandas Atrasadas (",S.length,")"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6},children:S.map(u=>e.jsxs("div",{style:{display:"flex",gap:7,alignItems:"center",fontSize:11},children:[e.jsx("span",{className:"chip",style:{background:b(u.project)+"1A",color:b(u.project),border:"none",flexShrink:0},children:m(u.project)}),e.jsx("span",{style:{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:u.text}),e.jsx("span",{style:{fontSize:9.5,fontWeight:700,color:"var(--theme-text-muted)"},children:u.assignee})]},u.id))})]})]})]})})}function ut({open:t,onClose:r,tasks:s,onValidate:l,onOpenTask:x,getProjColor:y,getProjCode:j,getDiscMeta:b}){if(!t)return null;const m=s.filter(f=>f.isCoordPoint),k={pending:m.filter(f=>(f.valid||"pending")==="pending"),returned:m.filter(f=>f.valid==="returned"),approved:m.filter(f=>f.valid==="approved")},I=({keyName:f,title:S,icon:A})=>k[f].length?e.jsxs("section",{className:"ins-block",children:[e.jsxs("div",{className:"ins-title",style:{color:me[f].color},children:[e.jsx(g,{name:A,size:14}),S," (",k[f].length,")"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:k[f].map(z=>e.jsxs("div",{style:{border:"1px solid var(--theme-divider)",borderRadius:10,padding:10,borderLeft:`3px solid ${me[f].color}`},children:[e.jsxs("div",{style:{display:"flex",gap:6,marginBottom:5,flexWrap:"wrap",alignItems:"center"},children:[e.jsx("span",{className:"chip",style:{background:y(z.project)+"1A",color:y(z.project),border:"none"},children:j(z.project)}),e.jsx(ra,{code:z.disc,meta:b(z.disc)}),e.jsx("span",{style:{fontSize:11,fontWeight:600},children:z.assignee}),e.jsx("span",{style:{fontSize:10,color:"var(--theme-text-muted)",marginLeft:"auto"},children:z.day})]}),e.jsx("p",{style:{margin:"0 0 8px",fontSize:12,lineHeight:1.4},children:z.text}),e.jsxs("div",{style:{display:"flex",gap:6},children:[f!=="approved"&&e.jsxs("button",{className:"mini-btn ok",onClick:()=>l(z.id,"approved"),children:[e.jsx(g,{name:"check",size:11}),"Aprovar"]}),f!=="returned"&&e.jsxs("button",{className:"mini-btn no",onClick:()=>l(z.id,"returned"),children:[e.jsx(g,{name:"undo",size:11}),"Devolver"]}),f!=="pending"&&e.jsxs("button",{className:"mini-btn",style:{background:"var(--theme-input)",color:"var(--theme-text)"},onClick:()=>l(z.id,"pending"),children:[e.jsx(g,{name:"schedule",size:11}),"Reabrir"]}),e.jsxs("button",{className:"mini-btn",style:{background:"var(--theme-input)",color:"var(--theme-text)",marginLeft:"auto"},onClick:()=>x(z),children:[e.jsx(g,{name:"open_in_new",size:11}),"Abrir"]})]})]},z.id))})]}):null;return e.jsx("div",{className:"overlay no-print",onClick:r,style:{justifyContent:"flex-end",padding:0},children:e.jsxs("div",{className:"drawer",onClick:f=>f.stopPropagation(),children:[e.jsxs("div",{className:"drawer-head",children:[e.jsxs("h2",{className:"t-h2",style:{margin:0,fontSize:14,display:"flex",alignItems:"center",gap:9},children:[e.jsx(g,{name:"verified",size:20,color:"#6366F1"}),"Fila de Validações"]}),e.jsx("button",{className:"btn-icon",onClick:r,children:e.jsx(g,{name:"close",size:16})})]}),e.jsxs("div",{className:"drawer-body",children:[m.length===0&&e.jsx("p",{style:{fontSize:12,color:"var(--theme-text-muted)"},children:"Sem pontos de validação pendentes."}),e.jsx(I,{keyName:"pending",title:"Aguardando aprovação",icon:"hourglass_top"}),e.jsx(I,{keyName:"returned",title:"Devolvidos para ajuste",icon:"undo"}),e.jsx(I,{keyName:"approved",title:"Aprovados",icon:"task_alt"})]})]})})}function Ne({value:t,color:r}){return e.jsx("div",{style:{height:7,borderRadius:99,background:"#eef0f2",overflow:"hidden",width:"100%"},children:e.jsx("div",{style:{height:"100%",width:t+"%",background:r,borderRadius:99}})})}function ft({tasks:t,weekLabel:r,stats:s,pva:l,trend:x,scope:y,coord:j,getProjColor:b,getProjCode:m,getDiscMeta:k,getPersonMeta:I,showChecklist:f}){const S=t.filter(d=>d.isCoordPoint),A=!l||!l.hasData?"#9ca3af":l.onTrackPct>=90?"#10B981":l.onTrackPct>=60?"#EAB308":"#EF4444",z=Array.from(new Set(t.map(d=>d.project))).map(d=>({name:d,code:m(d),color:b(d)})),u=Array.from(new Set(t.map(d=>d.assignee))).map(d=>{const p=I(d);return{name:d,role:p.role||"Colaborador",color:p.color||"#94A3B8",capacity:p.capacity||10}}),E=Array.from(new Set(t.map(d=>d.disc))).map(d=>{const p=k(d);return{code:d,name:p?p.name:d,color:p?p.color:"#64748B"}});return e.jsxs("div",{className:"print-sheet",style:{padding:"0",color:"#1f2937",fontFamily:"'Inter', sans-serif"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-end",borderBottom:"3px solid #FF6B4A",paddingBottom:10,marginBottom:16},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:900,fontSize:17,letterSpacing:"0.1em"},children:"RELATÓRIO EXECUTIVO"}),e.jsxs("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:700,fontSize:9,letterSpacing:"0.28em",color:"#6b7280",marginTop:2},children:["COORDENAÇÃO BIM · ACOMPANHAMENTO SEMANAL",y==="filtered"?" · VISÃO FILTRADA":""]})]}),e.jsxs("div",{style:{textAlign:"right"},children:[e.jsx("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:13,letterSpacing:"0.08em"},children:r}),e.jsxs("div",{style:{fontSize:10,color:"#6b7280"},children:["Gestor: ",j||"Yuri"," · Emitido ",new Date().toLocaleDateString("pt-BR")]})]})]}),e.jsxs("div",{style:{display:"flex",gap:12,marginBottom:16,breakInside:"avoid"},children:[e.jsxs("div",{style:{flex:"0 0 150px",border:"1px solid #e5e7eb",borderRadius:12,padding:"13px 15px",background:"linear-gradient(135deg,#FFF4F0,#fff)"},children:[e.jsx("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7.5,letterSpacing:"0.2em",color:"#6b7280",marginBottom:6},children:"AVANÇO PONDERADO"}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:6},children:[e.jsxs("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:900,fontSize:36,lineHeight:1,color:"#FF6B4A"},children:[s.progress,"%"]}),x!=null&&x!==0&&e.jsxs("span",{style:{fontSize:11,fontWeight:800,color:x>0?"#10B981":"#EF4444"},children:[x>0?"▲ +":"▼ ",x,"%"]})]}),e.jsx("div",{style:{margin:"8px 0 5px"},children:e.jsx(Ne,{value:s.progress,color:"#FF6B4A"})}),e.jsxs("div",{style:{fontSize:9.5,color:"#6b7280",fontWeight:600},children:[s.done,"/",s.total," demandas",x!=null?" · vs. sem. anterior":""]})]}),e.jsx("div",{style:{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9},children:[{label:"NO PRAZO",value:l&&l.hasData?l.onTrackPct+"%":"—",sub:"previsto × feito",color:A},{label:"PROJETOS",value:z.length,sub:"ativos",color:"#0EA5E9"},{label:"EQUIPE",value:u.filter(d=>d.name!=="Equipe").length,sub:"alocados",color:"#10B981"},{label:"VALIDAÇÕES",value:s.coordApproved+"/"+s.coordTotal,sub:s.coordPending+" pendentes",color:"#6366F1"},{label:"ATRASADAS",value:s.overdue,sub:s.overdue?"requer ação":"em dia",color:s.overdue?"#EF4444":"#10B981"},{label:"PENDENTES",value:s.total-s.done,sub:"a concluir",color:"#EAB308"}].map((d,p)=>e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:11,padding:"9px 12px"},children:[e.jsx("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,letterSpacing:"0.16em",color:"#9ca3af"},children:d.label}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:5,marginTop:2},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:19,color:d.color,lineHeight:1},children:d.value}),e.jsx("span",{style:{fontSize:8,color:"#6b7280"},children:d.sub})]})]},p))})]}),(()=>{const d=t.filter(F=>F.unplanned&&!F.carriedFrom),p=t.filter(F=>F.carriedFrom);return!d.length&&!p.length?null:e.jsxs("div",{style:{marginBottom:16,breakInside:"avoid",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:"#FFF7ED",borderBottom:"1px solid #fde9d3"},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9.5,letterSpacing:"0.2em"},children:"FORA DO PLANEJAMENTO INICIAL"}),e.jsxs("span",{style:{marginLeft:"auto",display:"flex",gap:12},children:[e.jsxs("span",{style:{fontSize:9,fontWeight:800,color:"#FF6B4A"},children:["● ",d.length," NOVAS"]}),e.jsxs("span",{style:{fontSize:9,fontWeight:800,color:"#B45309"},children:["● ",p.length," ADIADAS"]})]})]}),e.jsx("div",{style:{padding:"8px 12px"},children:[{tag:"NOVA",color:"#FF6B4A",arr:d},{tag:"ADIADA",color:"#B45309",arr:p}].map(({tag:F,color:h,arr:O})=>O.map(i=>e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center",padding:"3px 0",borderBottom:"1px solid #f3f4f6"},children:[e.jsxs("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,color:h,width:58,flexShrink:0},children:["● ",F,F==="ADIADA"&&i.postponedCount>1?" ×"+i.postponedCount:""]}),e.jsx("span",{style:{fontSize:7.5,fontWeight:800,color:b(i.project),width:26,flexShrink:0},children:m(i.project)}),e.jsx("span",{style:{fontSize:10,flex:1},children:i.text}),e.jsxs("span",{style:{fontSize:9,color:"#6b7280",flexShrink:0},children:[i.assignee," · ",i.day,i.carriedFrom?" · de "+i.carriedFrom:""]})]},F+i.id)))})]})})(),e.jsxs("div",{style:{display:"flex",gap:18,marginBottom:16,breakInside:"avoid"},children:[e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9.5,letterSpacing:"0.2em",marginBottom:9,display:"flex",alignItems:"center",gap:7},children:[e.jsx("span",{style:{width:12,height:3,background:"#FF6B4A",borderRadius:2}}),"POR PROJETO"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6},children:z.map(d=>{const p=t.filter(h=>h.project===d.name),F=L(p);return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7.5,color:d.color,width:26,flexShrink:0},children:d.code}),e.jsx("span",{style:{fontSize:9.5,fontWeight:600,width:92,flexShrink:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:d.name}),e.jsx("div",{style:{flex:1},children:e.jsx(Ne,{value:F,color:d.color})}),e.jsxs("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9,width:30,textAlign:"right",flexShrink:0},children:[F,"%"]})]},d.name)})})]}),e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9.5,letterSpacing:"0.2em",marginBottom:9,display:"flex",alignItems:"center",gap:7},children:[e.jsx("span",{style:{width:12,height:3,background:"#FF6B4A",borderRadius:2}}),"POR DISCIPLINA"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6},children:E.map(d=>{const p=t.filter(h=>h.disc===d.code),F=L(p);return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7.5,color:d.color,width:30,flexShrink:0},children:d.code}),e.jsx("div",{style:{flex:1},children:e.jsx(Ne,{value:F,color:d.color})}),e.jsxs("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9,width:46,textAlign:"right",flexShrink:0},children:[p.length,"× · ",F,"%"]})]},d.code)})})]})]}),e.jsxs("div",{style:{marginBottom:16,breakInside:"avoid"},children:[e.jsxs("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9.5,letterSpacing:"0.2em",marginBottom:9,display:"flex",alignItems:"center",gap:7},children:[e.jsx("span",{style:{width:12,height:3,background:"#FF6B4A",borderRadius:2}}),"ENTREGAS E CARGA POR COLABORADOR"]}),e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:10},children:[e.jsx("thead",{children:e.jsx("tr",{style:{borderBottom:"1.5px solid #d1d5db"},children:["Colaborador","Cargo","Demandas","Carga","Validações","Avanço"].map((d,p)=>e.jsx("th",{style:{textAlign:p>1?"center":"left",padding:"5px 6px",fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,letterSpacing:"0.1em",color:"#6b7280"},children:d},p))})}),e.jsx("tbody",{children:u.map(d=>{const p=t.filter(w=>w.assignee===d.name),F=L(p),h=p.reduce((w,P)=>w+ge(P),0),O=Math.round(h/d.capacity*100),i=p.filter(w=>w.isCoordPoint),N=i.filter(w=>w.valid==="approved").length;return e.jsxs("tr",{style:{borderBottom:"1px solid #eef0f2"},children:[e.jsx("td",{style:{padding:"5px 6px"},children:e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:6},children:[e.jsx("span",{style:{width:16,height:16,borderRadius:"50%",background:d.color,color:"#fff",fontSize:6.5,fontWeight:800,fontFamily:"'Orbitron', sans-serif",display:"inline-flex",alignItems:"center",justifyContent:"center"},children:ka(d.name)}),e.jsx("span",{style:{fontWeight:700},children:d.name})]})}),e.jsx("td",{style:{padding:"5px 6px",color:"#6b7280",fontSize:9},children:d.role}),e.jsx("td",{style:{padding:"5px 6px",textAlign:"center"},children:p.length}),e.jsxs("td",{style:{padding:"5px 6px",textAlign:"center",fontWeight:700,color:O>100?"#EF4444":O<50?"#64748B":"#10B981"},children:[h,"/",d.capacity]}),e.jsx("td",{style:{padding:"5px 6px",textAlign:"center",color:i.length?"#4F46E5":"#d1d5db",fontWeight:700},children:i.length?N+"/"+i.length:"—"}),e.jsx("td",{style:{padding:"5px 6px",width:105},children:e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:6},children:[e.jsx("span",{style:{flex:1},children:e.jsx(Ne,{value:F,color:d.color})}),e.jsxs("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:8.5,width:26,textAlign:"right"},children:[F,"%"]})]})})]},d.name)})})]})]}),S.length>0&&e.jsxs("div",{style:{marginBottom:16,breakInside:"avoid"},children:[e.jsxs("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9.5,letterSpacing:"0.2em",marginBottom:9,display:"flex",alignItems:"center",gap:7},children:[e.jsx("span",{style:{width:12,height:3,background:"#6366F1",borderRadius:2}}),"PONTOS DE COORDENAÇÃO / VALIDAÇÃO"]}),S.map(d=>{const p=me[d.valid||"pending"];return e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center",padding:"4px 8px",borderBottom:"1px solid #eef0f2",borderLeft:`3px solid ${p.color}`,paddingLeft:9},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,letterSpacing:"0.06em",color:p.color,width:64,flexShrink:0,textTransform:"uppercase"},children:p.label}),e.jsx("span",{style:{fontSize:7.5,fontWeight:800,color:b(d.project),width:26,flexShrink:0},children:m(d.project)}),e.jsx("span",{style:{fontSize:10,flex:1},children:d.text}),e.jsxs("span",{style:{fontSize:9,color:"#6b7280",flexShrink:0},children:[d.assignee," · ",d.day]})]},d.id)})]}),e.jsxs("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9.5,letterSpacing:"0.2em",marginBottom:10,display:"flex",alignItems:"center",gap:7},children:[e.jsx("span",{style:{width:12,height:3,background:"#FF6B4A",borderRadius:2}}),"AGENDA DETALHADA DA SEMANA"]}),V.map(d=>{const p=t.filter(h=>h.day===d);if(!p.length)return null;const F=L(p);return e.jsxs("div",{style:{marginBottom:11,breakInside:"avoid"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f3f4f6",padding:"5px 10px",borderRadius:6,marginBottom:5},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:10.5,letterSpacing:"0.22em",textTransform:"uppercase"},children:d}),e.jsxs("span",{style:{fontSize:9,fontWeight:700,color:"#6b7280"},children:[p.filter($).length,"/",p.length," · ",F,"%"]})]}),p.map(h=>{const O=aa(h),i=$(h),N=pe(h);return e.jsxs("div",{style:{display:"flex",gap:9,alignItems:"flex-start",padding:"4px 8px",borderBottom:"1px solid #eef0f2",borderLeft:`3px solid ${N?"#EF4444":b(h.project)}`,paddingLeft:10},children:[e.jsx("span",{style:{width:12,height:12,border:i?"none":"1.5px solid #6b7280",background:i?"#10B981":"transparent",borderRadius:3,flexShrink:0,marginTop:2,color:"#fff",fontSize:10,lineHeight:"12px",textAlign:"center",fontWeight:900},children:i?"✓":""}),e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{display:"flex",gap:6,marginBottom:1,flexWrap:"wrap",alignItems:"center"},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,letterSpacing:"0.08em",color:b(h.project)},children:m(h.project)}),k(h.disc)&&e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,color:k(h.disc).color},children:h.disc}),(h.durationDays||1)>1&&e.jsxs("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,color:"#7C3AED"},children:[h.durationDays," DIAS"]}),e.jsx("span",{style:{fontSize:8.5,fontWeight:700,color:"#374151"},children:h.assignee}),h.isCoordPoint&&e.jsx("span",{style:{fontSize:7,fontWeight:800,letterSpacing:"0.06em",color:"#4F46E5"},children:"● VALIDAÇÃO"}),h.unplanned&&!h.carriedFrom&&e.jsx("span",{style:{fontSize:7,fontWeight:800,color:"#FF6B4A"},children:"● NOVA"}),h.carriedFrom&&e.jsxs("span",{style:{fontSize:7,fontWeight:800,color:"#B45309"},children:["● ADIADA",h.postponedCount>1?" ×"+h.postponedCount:""]}),N&&e.jsx("span",{style:{fontSize:7,fontWeight:800,color:"#EF4444"},children:"● ATRASO"}),e.jsxs("span",{style:{marginLeft:"auto",fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:8,color:i?"#10B981":O>0?"#0EA5E9":"#9ca3af"},children:[O,"%"]})]}),e.jsx("div",{style:{fontSize:10.5,lineHeight:1.3,textDecoration:i?"line-through":"none",color:i?"#9ca3af":"#1f2937"},children:h.text}),f&&h.subtasks&&h.subtasks.length>0&&e.jsx("div",{style:{margin:"3px 0 2px",display:"flex",flexDirection:"column",gap:1},children:h.subtasks.map(w=>e.jsxs("div",{style:{display:"flex",gap:5,alignItems:"center",fontSize:9},children:[e.jsx("span",{style:{width:8,height:8,border:w.done?"none":"1px solid #9ca3af",background:w.done?"#10B981":"transparent",borderRadius:2,flexShrink:0,color:"#fff",fontSize:7,lineHeight:"8px",textAlign:"center",fontWeight:900},children:w.done?"✓":""}),e.jsx("span",{style:{color:w.done?"#9ca3af":"#4b5563",textDecoration:w.done?"line-through":"none"},children:w.text})]},w.id))})]})]},h.id)})]},d)}),e.jsxs("div",{style:{marginTop:16,paddingTop:9,borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",fontSize:8,color:"#9ca3af",fontFamily:"'Orbitron', sans-serif",letterSpacing:"0.1em"},children:[e.jsx("span",{children:"COORDENAÇÃO BIM"}),e.jsx("span",{children:"RELATÓRIO DE ACOMPANHAMENTO SEMANAL"})]})]})}function Ca({label:t,value:r,children:s,inline:l=!1}){return e.jsxs("div",{className:l?"twk-row twk-row-h":"twk-row",children:[e.jsxs("div",{className:"twk-lbl",children:[e.jsx("span",{children:t}),r!=null&&e.jsx("span",{className:"twk-val",children:r})]}),s]})}function va({label:t,value:r,onChange:s}){return e.jsxs("div",{className:"twk-row twk-row-h",children:[e.jsx("div",{className:"twk-lbl",children:e.jsx("span",{children:t})}),e.jsx("button",{type:"button",className:"twk-toggle","data-on":r?"1":"0",role:"switch","aria-checked":r,onClick:()=>s(!r),children:e.jsx("i",{})})]})}function ba({label:t,value:r,options:s,onChange:l}){const x=v.useRef(null),y=s.length,j=Math.max(0,s.indexOf(r)),b=m=>{const k=x.current?.getBoundingClientRect();if(!k)return;const I=k.width-4,f=Math.floor((m.clientX-k.left-2)/I*y),S=s[Math.max(0,Math.min(y-1,f))];l(S)};return e.jsx(Ca,{label:t,children:e.jsxs("div",{ref:x,role:"radiogroup",onPointerDown:b,className:"twk-seg",children:[e.jsx("div",{className:"twk-seg-thumb",style:{left:`calc(2px + ${j} * (100% - 4px) / ${y})`,width:`calc((100% - 4px) / ${y})`}}),s.map(m=>e.jsx("button",{type:"button",role:"radio","aria-checked":m===r,children:m},m))]})})}function yt({label:t,value:r,options:s,onChange:l}){const x=j=>String(j).toLowerCase(),y=x(r);return e.jsx(Ca,{label:t,children:e.jsx("div",{className:"twk-chips",role:"radiogroup",children:s.map((j,b)=>{const m=x(j)===y,k=vt(j);return e.jsx("button",{type:"button",className:"twk-chip",role:"radio","aria-checked":m,"data-on":m?"1":"0",style:{background:j},onClick:()=>l(j),children:m&&e.jsx("svg",{viewBox:"0 0 14 14","aria-hidden":"true",style:{position:"absolute",top:6,left:6,width:13,height:13},children:e.jsx("path",{d:"M3 7.2 5.8 10 11 4.2",fill:"none",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round",stroke:k?"rgba(0,0,0,.78)":"#fff"})})},b)})})})}function vt(t){const r=String(t).replace("#",""),s=r.length===3?r.replace(/./g,b=>b+b):r.padEnd(6,"0"),l=parseInt(s.slice(0,6),16);if(Number.isNaN(l))return!0;const x=l>>16&255,y=l>>8&255,j=l&255;return x*299+y*587+j*114>148e3}const bt={accent:"#FF6B4A",cardStyle:"soft",density:"comfy",projColors:!0,bgGrid:!0},jt=`
.weekly-agenda-container {
  --theme-bg: #F0F2F5;
  --theme-card: #FFFFFF;
  --theme-highlight: #F9FAFB;
  --theme-input: #F3F4F6;
  --theme-text: #374151;
  --theme-text-muted: #9CA3AF;
  --theme-divider: #E5E7EB;

  --primary: var(--weekly-primary, #FF6B4A);
  --primary-soft: var(--weekly-primary-soft, #FF6B4A18);
  --primary-fg: #FFFFFF;

  --success: #10B981;
  --warning: #EAB308;
  --danger: #EF4444;
  --info: #00D4FF;

  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Orbitron', 'Inter', sans-serif;

  --radius-card: 20px;
  --radius-lg: 14px;
  --radius-md: 10px;
  --radius-sm: 8px;

  --shadow-soft: 0 4px 18px -6px rgba(17,24,39,0.06), 0 0 1px 0 rgba(0,0,0,0.04);
  --shadow-hover: 0 12px 28px -10px rgba(17,24,39,0.12);
  --shadow-neuro: 10px 10px 24px #d6dae0, -10px -10px 24px #ffffff;

  --tracking-wide: 0.1em;
  --tracking-widest: 0.2em;

  --gap: 12px;
  --card-pad: 12px;

  background-color: transparent;
  color: var(--theme-text);
  font-family: var(--font-sans);
  min-height: 100%;
  border-radius: 0px;
  transition: background-color 0.2s, color 0.2s;
  box-sizing: border-box;

  background-image:
    linear-gradient(rgba(255,255,255,0.4) 2px, transparent 2px),
    linear-gradient(90deg, rgba(255,255,255,0.4) 2px, transparent 2px),
    linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
}

.weekly-agenda-container.dark {
  --theme-bg: #0F172A;
  --theme-card: #1E293B;
  --theme-highlight: #334155;
  --theme-input: #0F172A;
  --theme-text: #F3F4F6;
  --theme-text-muted: #9CA3AF;
  --theme-divider: #334155;
  --shadow-neuro: 6px 6px 20px #090d16, -6px -6px 20px #1c2738;
  
  background-image:
    linear-gradient(rgba(15,23,42,0.3) 2px, transparent 2px),
    linear-gradient(90deg, rgba(15,23,42,0.3) 2px, transparent 2px),
    linear-gradient(rgba(15,23,42,0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,23,42,0.15) 1px, transparent 1px);
}

.weekly-agenda-container.nogrid {
  background-image: none !important;
}

.weekly-agenda-container * {
  box-sizing: border-box;
}

.weekly-agenda-container .font-sq {
  font-family: var(--font-display);
}

.weekly-agenda-container .t-h1 {
  font-family: var(--font-display);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--theme-text);
}

.weekly-agenda-container .t-h2 {
  font-family: var(--font-display);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--theme-text);
}

.weekly-agenda-container .t-h3 {
  font-family: var(--font-display);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--tracking-widest);
  color: var(--theme-text);
}

.weekly-agenda-container .cap {
  text-transform: uppercase;
  letter-spacing: var(--tracking-widest);
  font-family: var(--font-display);
  font-weight: 900;
}

/* Cards style */
.weekly-agenda-container .card {
  background: var(--theme-card);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-soft);
  border: 1px solid var(--theme-divider);
  transition: transform .18s, box-shadow .18s;
}

.weekly-agenda-container.neuro .card {
  box-shadow: var(--shadow-neuro);
  border: none;
}

/* Buttons */
.weekly-agenda-container .btn {
  border: none;
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 9px;
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  transition: transform .18s, box-shadow .18s, background .18s;
}

.weekly-agenda-container .btn:active {
  transform: scale(.95);
}

.weekly-agenda-container .btn-primary {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 8px 18px -6px color-mix(in srgb, var(--primary) 65%, transparent);
}

.weekly-agenda-container .btn-primary:hover {
  transform: translateY(-1px);
}

.weekly-agenda-container .btn-ghost {
  background: var(--theme-card);
  color: var(--theme-text);
  border: 1px solid var(--theme-divider);
}

.weekly-agenda-container .btn-ghost:hover {
  background: var(--theme-highlight);
}

.weekly-agenda-container .btn-saved {
  background: var(--success);
  color: #fff;
}

.weekly-agenda-container .coord-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  background: var(--theme-card);
  border: 1px solid var(--theme-divider);
  border-radius: 12px;
  padding: 4px 10px;
  box-shadow: var(--shadow-soft);
  transition: background .15s, transform .15s;
}

.weekly-agenda-container .coord-chip:hover {
  background: var(--theme-highlight);
}

.weekly-agenda-container .btn-icon {
  width: 34px;
  height: 34px;
  padding: 0;
  border-radius: var(--radius-md);
  background: var(--theme-card);
  border: 1px solid var(--theme-divider);
  color: var(--theme-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all .18s;
}

.weekly-agenda-container .btn-icon:hover {
  background: var(--theme-highlight);
  transform: translateY(-1px);
}

.weekly-agenda-container .btn-icon.on-danger {
  background: var(--danger);
  color: #fff;
  border-color: var(--danger);
}

/* Week nav */
.weekly-agenda-container .week-nav {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: var(--theme-card);
  border: 1px solid var(--theme-divider);
  border-radius: var(--radius-md);
  padding: 3px;
  box-shadow: var(--shadow-soft);
}

.weekly-agenda-container .week-nav button {
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  color: var(--theme-text);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background .15s;
}

.weekly-agenda-container .week-nav button:not(.week-label) {
  width: 32px;
  height: 32px;
}

.weekly-agenda-container .week-nav button:hover {
  background: var(--theme-highlight);
}

.weekly-agenda-container .week-nav .week-label {
  flex-direction: column;
  gap: 0;
  padding: 4px 10px;
  min-width: 110px;
  line-height: 1.25;
}

.weekly-agenda-container .kpi-clickable {
  transition: transform .16s, box-shadow .16s;
}

.weekly-agenda-container .kpi-clickable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

/* Inputs */
.weekly-agenda-container .field-label {
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 9px;
  letter-spacing: var(--tracking-widest);
  text-transform: uppercase;
  color: var(--theme-text-muted);
  display: block;
  margin-bottom: 6px;
}

.weekly-agenda-container .input,
.weekly-agenda-container .select,
.weekly-agenda-container .textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--theme-input);
  border: 1px solid var(--theme-divider);
  font-family: var(--font-sans);
  font-size: 13px;
  color: var(--theme-text);
  outline: none;
  transition: border .15s, box-shadow .15s;
}

.weekly-agenda-container .input:focus,
.weekly-agenda-container .select:focus,
.weekly-agenda-container .textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
  background: var(--theme-card);
}

.weekly-agenda-container .textarea {
  resize: vertical;
  min-height: 64px;
  line-height: 1.45;
}

.weekly-agenda-container .select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}

/* Avatars */
.weekly-agenda-container .avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 9px;
  color: #fff;
  box-shadow: 0 2px 6px -2px rgba(0,0,0,.2);
}

/* Chips */
.weekly-agenda-container .chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-display);
  font-weight: 900;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  font-size: 8.5px;
  padding: 3px 6px;
  border-radius: 6px;
  line-height: 1.3;
}

/* Task card styles */
.weekly-agenda-container .task {
  position: relative;
  background: var(--theme-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--theme-divider);
  padding: var(--card-pad);
  box-shadow: 0 3px 10px -8px rgba(17,24,39,.1);
  transition: transform .16s, box-shadow .16s, opacity .2s;
  cursor: grab;
}

.weekly-agenda-container .task:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.weekly-agenda-container .task.done {
  opacity: .6;
}

.weekly-agenda-container .task.done .task-text {
  text-decoration: line-through;
  color: var(--theme-text-muted);
}

.weekly-agenda-container .task.validate {
  border-left: 3px solid #6366F1;
}

.weekly-agenda-container .task.overdue {
  border-left: 3px solid var(--danger);
}

.weekly-agenda-container .task-accent {
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 4px 4px 0;
}

/* Status Pill Dropdown */
.weekly-agenda-container .status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 900;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  font-size: 8.5px;
  padding: 3px 6px;
  border-radius: 6px;
  line-height: 1.3;
}

.weekly-agenda-container .status-menu {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  z-index: 100;
  min-width: 170px;
  background: var(--theme-card);
  border: 1px solid var(--theme-divider);
  border-radius: 10px;
  box-shadow: var(--shadow-hover);
  padding: 4px;
}

.weekly-agenda-container .status-menu button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--theme-text);
  text-align: left;
}

.weekly-agenda-container .status-menu button:hover {
  background: var(--theme-highlight);
}

.weekly-agenda-container .status-menu button.active {
  background: var(--primary-soft);
  color: var(--primary);
}

.weekly-agenda-container .role-input {
  width: 100%;
  border: none;
  border-bottom: 1px dashed var(--theme-divider);
  background: transparent;
  font-family: var(--font-sans);
  font-size: 11px;
  color: var(--theme-text-muted);
  padding: 2px 0;
  outline: none;
}

.weekly-agenda-container .role-input:focus {
  border-bottom-color: var(--primary);
  color: var(--theme-text);
}

.weekly-agenda-container .due {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: 8.5px;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--theme-text-muted);
  padding: 2px 5px;
  border-radius: 5px;
  background: var(--theme-input);
}

.weekly-agenda-container .due.is-today {
  color: var(--primary);
  background: var(--primary-soft);
}

.weekly-agenda-container .due.is-over {
  color: #fff;
  background: var(--danger);
}

.weekly-agenda-container .mini-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  cursor: pointer;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 8.5px;
  letter-spacing: .08em;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 6px;
  transition: filter .15s;
}

.weekly-agenda-container .mini-btn.ok {
  background: var(--success);
  color: #fff;
}

.weekly-agenda-container .mini-btn.no {
  background: var(--theme-card);
  color: var(--danger);
  border: 1px solid var(--theme-divider);
}

.weekly-agenda-container .checkbox {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  flex-shrink: 0;
  cursor: pointer;
  border: 2px solid var(--theme-divider);
  background: var(--theme-card);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: transparent;
}

.weekly-agenda-container .checkbox.checked {
  background: var(--success);
  border-color: var(--success);
  color: #fff;
}

.weekly-agenda-container .row-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--theme-text-muted);
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.weekly-agenda-container .row-btn:hover {
  background: var(--theme-input);
  color: var(--theme-text);
}

.weekly-agenda-container .row-btn.danger:hover {
  background: #FEE2E2;
  color: var(--danger);
}

.weekly-agenda-container .row-btn.warn:hover {
  background: #FEF3C7;
  color: #B45309;
}

.weekly-agenda-container .task-actions {
  opacity: 0;
  transition: opacity .15s;
}

.weekly-agenda-container .task:hover .task-actions {
  opacity: 1;
}

/* Kanban Board columns */
.weekly-agenda-container .board {
  display: grid;
  grid-template-columns: repeat(var(--cols, 5), minmax(220px, 1fr));
  gap: var(--gap);
  align-items: start;
}

.weekly-agenda-container .stack {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

/* Horizontal Bands */
.weekly-agenda-container .band {
  background: var(--theme-card);
  border-radius: var(--radius-card);
  border: 1px solid var(--theme-divider);
  overflow: hidden;
}

.weekly-agenda-container .band.today {
  box-shadow: 0 0 0 2px var(--primary), var(--shadow-soft);
}

.weekly-agenda-container .band.dropping {
  box-shadow: 0 0 0 2px var(--primary);
  background: var(--primary-soft);
}

.weekly-agenda-container .band-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--theme-divider);
  background: var(--theme-highlight);
}

.weekly-agenda-container .band-body {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 10px;
  padding: var(--card-pad);
}

/* Columns */
.weekly-agenda-container .col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--theme-card);
  border-radius: var(--radius-card);
  border: 1px solid var(--theme-divider);
}

.weekly-agenda-container .col.today {
  box-shadow: 0 0 0 2px var(--primary), var(--shadow-soft);
}

.weekly-agenda-container .col.dropping {
  box-shadow: 0 0 0 2px var(--primary);
  background: var(--primary-soft);
}

.weekly-agenda-container .col-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  flex: 1;
  overflow-y: auto;
}

/* Progress trackers */
.weekly-agenda-container .prog-track {
  height: 4px;
  border-radius: 99px;
  background: var(--theme-divider);
  overflow: hidden;
}

.weekly-agenda-container .prog-fill {
  height: 100%;
  border-radius: 99px;
  transition: width .4s ease-out;
}

/* Segments Toggle */
.weekly-agenda-container .seg {
  display: inline-flex;
  background: var(--theme-input);
  border-radius: var(--radius-md);
  padding: 3px;
  gap: 2px;
}

.weekly-agenda-container .seg button {
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 8px;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 8.5px;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  padding: 6px 10px;
  color: var(--theme-text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.weekly-agenda-container .seg button.active {
  background: var(--theme-card);
  color: var(--primary);
  box-shadow: 0 2px 6px -4px rgba(0,0,0,.15);
}

.weekly-agenda-container .overlay {
  position: fixed;
  inset: 0;
  background: rgba(15,23,42,.45);
  backdrop-filter: blur(2px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.15s ease-out;
}

.weekly-agenda-container .modal {
  width: 100%;
  max-width: 440px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--theme-card);
  border-radius: var(--radius-card);
  box-shadow: 0 20px 50px -15px rgba(0,0,0,.3);
  animation: scaleIn 0.2s cubic-bezier(.34,1.56,.64,1);
}

.weekly-agenda-container .drawer {
  width: 100%;
  max-width: 400px;
  height: 100vh;
  background: var(--theme-bg);
  box-shadow: -15px 0 50px -15px rgba(0,0,0,.25);
  display: flex;
  flex-direction: column;
  animation: drawerIn 0.25s cubic-bezier(.16,1,.3,1);
}

@keyframes drawerIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.weekly-agenda-container .drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--theme-divider);
  background: var(--theme-card);
  flex-shrink: 0;
}

.weekly-agenda-container .drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.weekly-agenda-container .ins-block {
  background: var(--theme-card);
  border: 1px solid var(--theme-divider);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
}

.weekly-agenda-container .ins-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 9.5px;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--theme-text);
  margin-bottom: 10px;
}

.weekly-agenda-container .bottom-nav {
  display: none;
}

/* TWEAKS COMPONENT LOCAL CLASSES */
.weekly-agenda-container .twk-sect {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: .06em;
  text-transform: uppercase;
  color: var(--theme-text-muted);
  padding: 8px 0 0;
}

.weekly-agenda-container .twk-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.weekly-agenda-container .twk-row-h {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.weekly-agenda-container .twk-lbl {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  color: var(--theme-text);
  font-weight: 600;
}

.weekly-agenda-container .twk-seg {
  position: relative;
  display: flex;
  padding: 2px;
  border-radius: 6px;
  background: var(--theme-input);
}

.weekly-agenda-container .twk-seg-thumb {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 5px;
  background: var(--theme-card);
  box-shadow: 0 1px 2px rgba(0,0,0,.1);
  transition: left .15s cubic-bezier(.3,.7,.4,1), width .15s;
}

.weekly-agenda-container .twk-seg button {
  appearance: none;
  position: relative;
  z-index: 1;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 500;
  min-height: 20px;
  border-radius: 5px;
  cursor: pointer;
  padding: 3px 6px;
  line-height: 1.2;
  flex: 1;
}

.weekly-agenda-container .twk-toggle {
  position: relative;
  width: 30px;
  height: 16px;
  border: 0;
  border-radius: 99px;
  background: var(--theme-divider);
  transition: background .15s;
  cursor: pointer;
}

.weekly-agenda-container .twk-toggle[data-on="1"] {
  background: var(--success);
}

.weekly-agenda-container .twk-toggle i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  transition: transform .15s;
}

.weekly-agenda-container .twk-toggle[data-on="1"] i {
  transform: translateX(14px);
}

.weekly-agenda-container .twk-chips {
  display: flex;
  gap: 6px;
}

.weekly-agenda-container .twk-chip {
  position: relative;
  appearance: none;
  flex: 1;
  min-width: 0;
  height: 26px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 0 0 1px rgba(0,0,0,.1);
}

.weekly-agenda-container .twk-chip[data-on="1"] {
  box-shadow: 0 0 0 2px var(--theme-text);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(.97); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* Print CSS */
.weekly-agenda-container .print-sheet {
  display: none;
}

@media print {
  .weekly-agenda-container .screen-only { display: none !important; }
  .weekly-agenda-container .no-print { display: none !important; }
  .weekly-agenda-container .print-sheet { display: block !important; }
}

@media (max-width: 860px) {
  .weekly-agenda-container .desktop-only { display: none !important; }
  .weekly-agenda-container .bottom-nav { display: flex; }
}

/* Plan strip (planejado vs fora do plano) */
.weekly-agenda-container .plan-strip { display: grid; grid-template-columns: 1.3fr 1fr; gap: var(--gap); }
@media (max-width: 760px) { .weekly-agenda-container .plan-strip { grid-template-columns: 1fr; } }
.weekly-agenda-container .plan-strip-status { display: flex; align-items: center; gap: 11px; background: var(--theme-card); border: 1px solid var(--theme-divider); border-radius: var(--radius-lg); padding: 12px 15px; box-shadow: var(--shadow-soft); }
.weekly-agenda-container.neuro .plan-strip-status { box-shadow: var(--shadow-soft); }
.weekly-agenda-container .plan-dot { width: 32px; height: 32px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.weekly-agenda-container .plan-dot.locked { background: var(--success); color: #fff; }
.weekly-agenda-container .plan-dot.open { background: #FEF3C7; color: #B45309; }
.weekly-agenda-container .plan-strip-chips { display: grid; grid-template-columns: 1fr 1fr; gap: var(--gap); }
@media (max-width: 420px) { .weekly-agenda-container .plan-strip-chips { grid-template-columns: 1fr; } }
.weekly-agenda-container .origin-chip { display: flex; align-items: center; gap: 11px; text-align: left; cursor: pointer; background: var(--theme-card); border: 1px solid var(--theme-divider); border-radius: var(--radius-lg); padding: 11px 14px; box-shadow: var(--shadow-soft); transition: transform .15s, box-shadow .15s, border-color .15s; }
.weekly-agenda-container .origin-chip:hover:not(:disabled) { transform: translateY(-2px); box-shadow: var(--shadow-hover); }
.weekly-agenda-container .origin-chip:disabled { opacity: .5; cursor: default; }
.weekly-agenda-container .origin-chip .oc-count { font-family: var(--font-display); font-weight: 900; font-size: 24px; line-height: 1; min-width: 26px; }
.weekly-agenda-container .origin-chip .oc-label { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--theme-text); line-height: 1.25; }
.weekly-agenda-container .origin-chip.nova .oc-count { color: #FF6B4A; }
.weekly-agenda-container .origin-chip.nova.active { border-color: #FF6B4A; box-shadow: 0 0 0 2px #FF6B4A55; }
.weekly-agenda-container .origin-chip.carried .oc-count { color: #B45309; }
.weekly-agenda-container .origin-chip.carried.active { border-color: #F59E0B; box-shadow: 0 0 0 2px #F59E0B55; }

/* Nova/Carried Tasks */
.weekly-agenda-container .task.nova { border-color: #FFCBB8; border-left: 4px solid #FF6B4A; background: #FFF3F0; }
.weekly-agenda-container .task.nova .task-accent { display: none; }
.weekly-agenda-container .task.carried { border-color: #FCD34D; border-left: 4px solid #D97706; background: #FEF3C7; }
.weekly-agenda-container .task.carried .task-accent { display: none; }

/* Duration pill + continues */
.weekly-agenda-container .dur-pill { display: inline-flex; align-items: center; gap: 3px; font-family: var(--font-display); font-weight: 800; font-size: 9px; letter-spacing: .06em; text-transform: uppercase; color: #7C3AED; background: #7C3AED14; border: 1px solid #7C3AED33; padding: 2px 6px; border-radius: 6px; }
.weekly-agenda-container .due.continues { color: #6D28D9; background: #7C3AED1A; }

/* Export options */
.weekly-agenda-container .export-opt { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--theme-text); }
.weekly-agenda-container .export-opt:hover { background: var(--theme-highlight); }
.weekly-agenda-container .export-opt input { width: 16px; height: 16px; accent-color: var(--primary); cursor: pointer; flex-shrink: 0; }
.weekly-agenda-container .export-opt span { display: inline-flex; align-items: center; gap: 6px; }
`;export{wt as default};
