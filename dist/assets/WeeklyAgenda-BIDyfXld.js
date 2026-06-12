import{u as st,r as y,j as e,R as Xe,e as ot,h as lt,i as va}from"./index-B0qY2Xqf.js";const ba="enigami_agenda_v2_",H=["Segunda","Terça","Quarta","Quinta","Sexta"],M={Segunda:0,Terça:1,Quarta:2,Quinta:3,Sexta:4},dt=[{code:"ARQ",name:"Arquitetura",color:"#F97316"},{code:"EST",name:"Estrutura",color:"#8B5CF6"},{code:"HID",name:"Hidráulica",color:"#0EA5E9"},{code:"ELE",name:"Elétrica",color:"#EAB308"},{code:"MEP",name:"Instalações",color:"#14B8A6"},{code:"PCI",name:"Incêndio",color:"#EF4444"},{code:"LEG",name:"Legal/Pref.",color:"#64748B"},{code:"BIM",name:"Coordenação",color:"#6366F1"}],ce=[{key:"todo",label:"A fazer",short:"A FAZER",pct:0,color:"#94A3B8"},{key:"doing",label:"Em andamento",short:"EM AND.",pct:50,color:"#0EA5E9"},{key:"review",label:"Em revisão",short:"REVISÃO",pct:85,color:"#EAB308"},{key:"done",label:"Concluído",short:"CONCLUÍDO",pct:100,color:"#10B981"}],ue={pending:{label:"Aguardando",color:"#EAB308"},approved:{label:"Aprovado",color:"#10B981"},returned:{label:"Devolvido",color:"#EF4444"}},J=["#0EA5E9","#10B981","#A770EF","#EC4899","#F59E0B","#14B8A6","#6366F1","#EF4444","#8B5CF6","#84CC16","#F97316","#06B6D4"];function aa(t){return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`}function Ca(t){if(!t)return null;const[r,s,c]=t.split("-").map(Number);return new Date(r,s-1,c)}function ta(t){const r=new Date;r.setHours(0,0,0,0);const s=r.getDay()===0?7:r.getDay(),c=new Date(r);return c.setDate(r.getDate()-(s-1)+t*7),c}function L(t){return aa(ta(t))}function Qe(t){const r=ta(t),s=new Date(r);s.setDate(r.getDate()+4);const c=["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"],o=h=>String(h.getDate()).padStart(2,"0");return r.getMonth()===s.getMonth()?`${o(r)} – ${o(s)} ${c[s.getMonth()]}`:`${o(r)} ${c[r.getMonth()]} – ${o(s)} ${c[s.getMonth()]}`}function K(t,r){const s=ta(r),c=new Date(s);return c.setDate(s.getDate()+(M[t]||0)),aa(c)}function Ze(){return{1:"Segunda",2:"Terça",3:"Quarta",4:"Quinta",5:"Sexta"}[new Date().getDay()]||null}function za(t){const r=t.trim().split(/\s+/);return r.length===1?r[0].slice(0,2).toUpperCase():(r[0][0]+r[1][0]).toUpperCase()}function na(t){return t.subtasks&&t.subtasks.length?Math.round(t.subtasks.filter(r=>r.done).length/t.subtasks.length*100):(ce.find(r=>r.key===(t.status||(t.completed?"done":"todo")))||ce[0]).pct}function X(t){return t.status==="done"||!t.status&&t.completed}function ge(t){return typeof t.weight=="number"&&t.weight>0?t.weight:1}function ra(t){const r=t.durationDays||1;return r<1?1:r}function Ee(t){return M[t.day]!=null?M[t.day]:0}function ia(t){return Math.min(Ee(t)+ra(t)-1,4)}function ct(t,r){const s=M[r];return s>=Ee(t)&&s<=ia(t)}function Ne(t){return H[ia(t)]}function R(t){if(!t.length)return 0;const r=t.reduce((c,o)=>c+ge(o),0),s=t.reduce((c,o)=>c+ge(o)*na(o),0);return r?Math.round(s/r):0}function pe(t){if(X(t)||!t.dueDate)return!1;const r=Ca(t.dueDate),s=new Date;return s.setHours(0,0,0,0),r?r<s:!1}function pt(t){return X(t)||!t.dueDate?!1:t.dueDate===aa(new Date)}function ea(t,r){new Date().setHours(0,0,0,0);const c=r===0&&Ze()?M[Ze()]:r<0?4:-1,o=t.filter(j=>(M[j.day]??0)<=c),h=o.reduce((j,k)=>j+ge(k),0),u=o.reduce((j,k)=>j+(X(k)?ge(k):0),0);return{hasData:o.length>0,planned:o.length,plannedW:h,doneW:u,onTrackPct:h?Math.round(u/h*100):0}}function G(t,r){return t==="Yuri"?ba+L(r):ba+t+"_"+L(r)}function gt(t,r,s){return t.coord!==r?!1:t.weekKey?t.weekKey===L(s):t.weekOffset===s}function te(t,r,s){return gt(t,r,s)&&!t.standby}function xt(t,r,s,c){for(const o of[t,r])if(o&&Array.isArray(o.agendaTasks)){const h=o.agendaTasks.filter(u=>te(u,s,c));if(h.length>0)return h}try{const o=localStorage.getItem(G(s,c));if(o){const h=JSON.parse(o);if(Array.isArray(h)&&h.length>0)return h.map(u=>({...u,coord:s,weekOffset:c}))}}catch{}return c===0&&s==="Yuri"?ht().map(o=>({...o,coord:s,weekOffset:c})):[]}function mt(t,r,s,c){for(const o of[t,r])if(o&&Array.isArray(o.agendaTasks)){const h=o.agendaTasks.filter(u=>te(u,s,c));if(h.length>0)return R(h)}try{const o=localStorage.getItem(G(s,c));if(o)return R(JSON.parse(o))}catch{}return null}function ht(){const t=r=>{const s=r.durationDays||1,c=Math.min((M[r.day]||0)+s-1,4);return{status:"todo",weight:2,subtasks:[],durationDays:1,...r,dueDate:r.dueDate||K(H[c],0)}};return[t({id:1,day:"Segunda",assignee:"Cassio",project:"Itajaí - Viabilidade",disc:"LEG",weight:3,status:"done",text:"Levantamento de dados, lotes, diretrizes e pequeno estudo de mercado"}),t({id:2,day:"Segunda",assignee:"Lourrane",project:"Sky Green",disc:"LEG",weight:2,status:"done",text:"Projeto Legal: Planta baixa do pavimento térreo (Padrão Prefeitura)"}),t({id:3,day:"Segunda",assignee:"Isabela",project:"Sky Green",disc:"ARQ",weight:2,status:"doing",text:"Catalogação de ambientes, lista e Moodboard (Térreo e Lazer 1)",subtasks:[{id:"a",text:"Térreo",done:!0},{id:"b",text:"Lazer 1",done:!1}]}),t({id:4,day:"Segunda",assignee:"Yuri",project:"Miguel Res.",disc:"ARQ",weight:2,status:"done",text:"Atualização do modelo executivo: Alvenaria do embasamento"}),t({id:5,day:"Segunda",assignee:"Yuri",project:"Miguel Res.",disc:"ARQ",weight:2,status:"review",text:"Finalização e validação: Planta de piso do pavimento tipo"}),t({id:6,day:"Terça",assignee:"Cassio",project:"Itajaí - Viabilidade",disc:"ARQ",weight:3,durationDays:2,status:"doing",text:"Estudo de massa volumétrica e implantação preliminar"}),t({id:7,day:"Terça",assignee:"Lourrane",project:"Sky Green",disc:"LEG",weight:2,status:"todo",text:"Projeto Legal: Detalhamento do pavimento térreo"}),t({id:8,day:"Terça",assignee:"Isabela",project:"Sky Green",disc:"ARQ",weight:2,status:"todo",text:"Modelagem 3D paramétrica: Hall de Entrada"}),t({id:9,day:"Terça",assignee:"Yuri",project:"Miguel Res.",disc:"EST",weight:3,durationDays:2,status:"todo",text:"Modelagem executiva da alvenaria (Pav. Tipo) e planta de forro"}),t({id:10,day:"Terça",assignee:"Yuri",project:"Miguel Res.",disc:"BIM",weight:1,status:"todo",isCoordPoint:!0,valid:"pending",time:"A definir",text:"Reunião de Compatibilização com Estrutural"}),t({id:11,day:"Quarta",assignee:"Cassio",project:"Itajaí - Viabilidade",disc:"ARQ",weight:2,status:"todo",text:"Fechamento e entrega da viabilidade volumétrica para revisão"}),t({id:12,day:"Quarta",assignee:"Lourrane",project:"Sky Green",disc:"LEG",weight:2,status:"todo",text:"Projeto Legal: Início do lançamento de garagens e acessos"}),t({id:13,day:"Quarta",assignee:"Yuri",project:"Itajaí - Viabilidade",disc:"BIM",weight:2,status:"todo",isCoordPoint:!0,valid:"pending",text:"Revisão Técnica (Coord. BIM): Validação da viabilidade"}),t({id:14,day:"Quarta",assignee:"Equipe",project:"Sky Green",disc:"BIM",weight:3,status:"todo",isCoordPoint:!0,valid:"pending",text:"Compatibilização Multidisciplinar: Ambientes do Lazer 1"}),t({id:15,day:"Quarta",assignee:"Yuri",project:"Miguel Res.",disc:"ARQ",weight:2,status:"todo",text:"Finalização do modelo de alvenaria do tipo e emissão da planta de forro"}),t({id:16,day:"Quinta",assignee:"Lourrane",project:"Sky Green",disc:"LEG",weight:2,status:"todo",text:"Projeto Legal: Detalhamento de garagens e quadro de áreas"}),t({id:17,day:"Quinta",assignee:"Equipe",project:"Sky Green",disc:"BIM",weight:3,status:"todo",isCoordPoint:!0,valid:"pending",text:"Fechamento de Compatibilização: Resolução Lazer 1"}),t({id:18,day:"Quinta",assignee:"Yuri",project:"Miguel Res.",disc:"MEP",weight:3,durationDays:2,status:"todo",text:"Lançamento de elementos MEP (Elétrica e Hidráulica)"}),t({id:19,day:"Sexta",assignee:"Lourrane",project:"Sky Green",disc:"LEG",weight:2,status:"todo",text:"Projeto Legal: Revisão final padrão prefeitura (Térreo e Garagens)"}),t({id:20,day:"Sexta",assignee:"Isabela",project:"Sky Green",disc:"ARQ",weight:2,status:"todo",text:"Modelagem de exteriores: Área externa do Lazer 1"}),t({id:21,day:"Sexta",assignee:"Yuri",project:"Miguel Res.",disc:"ELE",weight:2,status:"todo",text:"Finalização do lançamento de pontos elétricos e hidráulicos"}),t({id:22,day:"Sexta",assignee:"Equipe",project:"Geral",disc:"BIM",weight:1,status:"todo",isCoordPoint:!0,valid:"pending",time:"Final do Dia",text:"Reunião de Coordenação: Alinhamento de evolução"})]}const Aa="enigami_custom_v1";function Je(){try{const t=localStorage.getItem(Aa);if(t){const r=JSON.parse(t);return{projects:r.projects||[],people:r.people||[],disciplines:r.disciplines||[]}}}catch{}return{projects:[],people:[],disciplines:[]}}function ja(t){try{localStorage.setItem(Aa,JSON.stringify(t))}catch{}}function ka(t,r){const s=t.replace(/[^a-zA-Zà-úÀ-Ú0-9 ]/g,"").trim().toUpperCase(),c=s.split(/\s+/).filter(Boolean);let o=c.length>=2?c[0][0]+c[1][0]+(c[1][1]||c[0][1]||""):s.slice(0,3);o=(o||"XXX").slice(0,3);let h=o,u=1;for(;r.includes(h);)h=o.slice(0,2)+u++;return h}function d({name:t,size:r=18,color:s,style:c,className:o}){return e.jsx("span",{className:"material-symbols-outlined "+(o||""),style:{fontSize:r,color:s||"inherit",lineHeight:1,...c},children:t})}function V({value:t,color:r,height:s=5}){return e.jsx("div",{className:"prog-track",style:{height:s},children:e.jsx("div",{className:"prog-fill",style:{width:t+"%",background:r||"var(--primary)"}})})}function Et(){const{db:t,setDb:r,currentUser:s,theme:c,activeProject:o,activeCompany:h}=st(),[u,j]=y.useState(()=>{try{const a=localStorage.getItem("enigami_agenda_tweaks");if(a)return JSON.parse(a)}catch{}return Nt}),k=(a,n)=>{j(l=>{const m={...l,[a]:n};try{localStorage.setItem("enigami_agenda_tweaks",JSON.stringify(m))}catch{}return m})},[g,I]=y.useState(()=>localStorage.getItem("enigami_active_coord")||s?.name||"Yuri"),[f,z]=y.useState(!1),[F,E]=y.useState(!1),[b,N]=y.useState(0),[p,v]=y.useState(!1),[x,w]=y.useState(0),[S,i]=y.useState([]),[C,A]=y.useState("day"),[B,$]=y.useState(()=>localStorage.getItem("enigami_layout")||"list"),[ne,Ie]=y.useState("all"),[re,Te]=y.useState("all"),[ie,Oe]=y.useState("all"),[ye,oa]=y.useState(!1),[se,Be]=y.useState(!1),[Z,Pe]=y.useState("all"),[la,Re]=y.useState(null),[da,Fa]=y.useState(!1),[ca,oe]=y.useState({open:!1,task:null}),[Da,ve]=y.useState(!1),[pa,U]=y.useState(null),[We,Le]=y.useState(!1),[ga,Ea]=y.useState("all"),[xa,be]=y.useState(null),[Ia,Me]=y.useState(!1),[_e,Ta]=y.useState(!1),xe=y.useRef(null),ma=Ze(),je=x===0,ke=(a,n)=>"enigami_plan_"+a+"_"+L(n);y.useEffect(()=>{let a=null;try{const n=localStorage.getItem(ke(g,x));n&&(a=+n)}catch{}if(!a&&g==="Yuri"&&x===0){a=Date.parse("2026-06-01T00:00:00");try{localStorage.setItem(ke(g,x),String(a))}catch{}}Re(a)},[g,x]);const Oa=()=>{const a=Date.now();try{localStorage.setItem(ke(g,x),String(a))}catch{}Re(a)},Ba=()=>{try{localStorage.removeItem(ke(g,x))}catch{}Re(null)},we=y.useMemo(()=>Je(),[b]),_=y.useMemo(()=>{const a=[{name:"Geral",code:"GER",color:"#0EA5E9"}];return t.projects.forEach(n=>{a.some(l=>l.name.toLowerCase()===n.name.toLowerCase())||a.push({name:n.name,code:n.name.slice(0,3).toUpperCase(),color:J[a.length%J.length]})}),we.projects.forEach(n=>{a.some(l=>l.name.toLowerCase()===n.name.toLowerCase())||a.push(n)}),a},[t.projects,we.projects]),W=y.useMemo(()=>{const a=(t.members||[]).map((n,l)=>({name:n.name,color:n.color||J[(l+3)%J.length],role:n.role||"Colaborador",capacity:n.capacity??10,coordinator:!!n.coordinator}));return a.some(n=>n.name==="Equipe")||a.push({name:"Equipe",color:"#64748B",role:"Multidisciplinar",capacity:16,coordinator:!1}),a},[t.members]),Y=y.useMemo(()=>{const a=[...dt];return we.disciplines.forEach(n=>{a.some(l=>l.code.toUpperCase()===n.code.toUpperCase())||a.push(n)}),t.disciplines.forEach(n=>{a.some(l=>l.code.toUpperCase()===n.code.toUpperCase())||a.push({code:n.code.toUpperCase(),name:n.name,color:n.color||"#64748B"})}),a},[t.disciplines,we.disciplines]),Pa=a=>{const n=W.find(l=>l.name===a);return!!(n&&n.coordinator)},Ra=()=>W.filter(a=>a.coordinator),Se=a=>W.find(n=>n.name===a)||{name:a,color:"#94A3B8",role:"",capacity:10},Ce=a=>_.find(n=>n.name===a)?.color||"#9CA3AF",ze=a=>_.find(n=>n.name===a)?.code||"—",qe=a=>Y.find(n=>n.code===a)||null,ha=Pa(g);y.useEffect(()=>{i(xt(h,o,g,x))},[x,g,o,h]);const Q=()=>h?.agendaTasks?.length?h.agendaTasks:o?.agendaTasks?.length?o.agendaTasks:[],le=a=>{if(h){const n=h.id;r(l=>({...l,companies:l.companies.map(m=>m.id===n?{...m,agendaTasks:a}:m)}))}else if(o){const n=o.id;r(l=>({...l,projects:l.projects.map(m=>m.id===n?{...m,agendaTasks:a,updatedAt:new Date().toISOString()}:m)}))}},de=a=>{if(i(a),h||o){const n=Q().filter(l=>!te(l,g,x));le([...n,...a.map(l=>({...l,coord:g,weekOffset:x,weekKey:L(x)}))])}try{localStorage.setItem(G(g,x),JSON.stringify(a))}catch{}},Ge=y.useMemo(()=>mt(h,o,g,x-1),[x,g,o,h]),Wa=()=>{if(h||o){const a=Q().filter(n=>!te(n,g,x));le([...a,...S.map(n=>({...n,coord:g,weekOffset:x,weekKey:L(x)}))])}try{localStorage.setItem(G(g,x),JSON.stringify(S))}catch{}v(!0),setTimeout(()=>v(!1),1900)},He=a=>{z(!1),a!==g&&(w(0),I(a),localStorage.setItem("enigami_active_coord",a))},Ae=a=>{r(n=>{const l=a(n.members||[]);return l===n.members?n:{...n,members:l,team:lt(l)}})},La=(a,n)=>{const l=a.trim();l&&(Ae(m=>va(m,{name:l,coordinator:!0,capacity:13,...n.trim()?{role:n.trim()}:{}})),He(l))},Ma=(a,n)=>{Ae(l=>l.map(m=>m.name===a?{...m,role:n}:m))},_a=a=>{if(Ae(n=>n.map(l=>l.name===a?{...l,coordinator:!1}:l)),a===g){const n=W.filter(l=>l.coordinator&&l.name!==a)[0];n&&He(n.name)}},qa=a=>{const n=a.trim();if(!n)return null;const l=_.find(T=>T.name.toLowerCase()===n.toLowerCase());if(l)return l;const m={name:n,code:ka(n,_.map(T=>T.code)),color:J[_.length%J.length]},D=Je();return D.projects.push(m),ja(D),N(T=>T+1),m},Ga=a=>{const n=a.trim();if(!n)return null;const l=W.find(D=>D.name.toLowerCase()===n.toLowerCase());if(l)return l;const m={name:n,role:"Equipe",color:ot(t.members||[]),capacity:10,coordinator:!1};return Ae(D=>va(D,{name:n,role:"Equipe",color:m.color,capacity:10,source:"manual"})),m},Ha=a=>{const n=a.trim();if(!n)return null;const l=ka(n,Y.map(he=>he.code)),m=Y.find(he=>he.name.toLowerCase()===n.toLowerCase());if(m)return m;const D={code:l,name:n,color:J[(Y.length+1)%J.length]},T=Je();return T.disciplines.push(D),ja(T),N(he=>he+1),D};y.useEffect(()=>{if(!f&&!We)return;const a=()=>{z(!1),Le(!1)};return document.addEventListener("click",a),()=>document.removeEventListener("click",a)},[f,We]),y.useEffect(()=>{const a=document.documentElement;a.style.setProperty("--weekly-primary",u.accent),a.style.setProperty("--weekly-primary-soft",u.accent+"18")},[u.accent]);const Va=(a,n)=>{de(S.map(l=>l.id===a?{...l,status:n,completed:n==="done",completedAt:n==="done"?Date.now():null}:l))},ua=(a,n)=>{ha&&de(S.map(l=>l.id===a?{...l,valid:n,validBy:g,validAt:Date.now()}:l))},$a=a=>de(S.filter(n=>n.id!==a)),Ua=a=>{const n=S.find(D=>D.id===a);if(!n)return;const l=S.filter(D=>D.id!==a),m={...n,coord:g,weekOffset:x+1,weekKey:L(x+1),dueDate:K(Ne(n),x+1),postponedCount:(n.postponedCount||0)+1,carriedFrom:Qe(x)};if(h||o){const D=Q().filter(T=>!te(T,g,x)&&T.id!==a);le([...D,...l.map(T=>({...T,coord:g,weekOffset:x,weekKey:L(x)})),m])}i(l);try{localStorage.setItem(G(g,x),JSON.stringify(l));const D=JSON.parse(localStorage.getItem(G(g,x+1))||"[]");D.push(m),localStorage.setItem(G(g,x+1),JSON.stringify(D))}catch{}},me=y.useMemo(()=>Q().filter(a=>a.coord===g&&a.standby),[h?.agendaTasks,o?.agendaTasks,g]),Ya=a=>{const n=S.find(m=>m.id===a);if(!n)return;const l=S.filter(m=>m.id!==a);if(h||o){const m=Q().filter(D=>!te(D,g,x)&&D.id!==a);le([...m,...l.map(D=>({...D,coord:g,weekOffset:x,weekKey:L(x)})),{...n,coord:g,standby:!0,carriedFrom:Qe(x)}])}i(l);try{localStorage.setItem(G(g,x),JSON.stringify(l))}catch{}},Qa=a=>{const n=Q().find(D=>D.id===a&&D.standby);if(!n)return;const l={...n,standby:!1,coord:g,weekOffset:x,weekKey:L(x),dueDate:K(Ne(n),x)},m=[...S,l];if(h||o){const D=Q().filter(T=>!te(T,g,x)&&T.id!==a);le([...D,...m.map(T=>({...T,coord:g,weekOffset:x,weekKey:L(x)}))])}i(m);try{localStorage.setItem(G(g,x),JSON.stringify(m))}catch{}},Ja=a=>{(h||o)&&le(Q().filter(n=>n.id!==a))},Ka=a=>{const n={...a,completed:a.status==="done"};n.dueDate=K(Ne(n),x),a.id!=null?de(S.map(l=>l.id===a.id?{...l,...n}:l)):de([...S,{...n,id:Date.now(),createdAt:Date.now(),unplanned:!!la}]),oe({open:!1,task:null})},Xa=(a,n)=>{xe.current=n.id??null,a.dataTransfer.effectAllowed="move"},Za=()=>{xe.current=null,be(null)},fa=a=>n=>{n.preventDefault(),xe.current!=null&&de(S.map(l=>l.id===xe.current?{...l,day:a,dueDate:K(Ne({...l,day:a}),x)}:l)),xe.current=null,be(null)},et=a=>a.unplanned&&!a.carriedFrom,ee=y.useMemo(()=>S.filter(a=>(ne==="all"||a.project===ne)&&(re==="all"||a.assignee===re)&&(ie==="all"||a.disc===ie)&&(!ye||a.isCoordPoint)&&(!se||pe(a))&&(Z==="all"||Z==="unplanned"&&et(a)||Z==="carried"&&a.carriedFrom)),[S,ne,re,ie,ye,se,Z]),O=y.useMemo(()=>{const a=S.length,n=S.filter(X).length,l=S.filter(m=>m.isCoordPoint);return{total:a,done:n,progress:R(S),simpleProgress:a?Math.round(n/a*100):0,projects:new Set(S.map(m=>m.project)).size,people:new Set(S.filter(m=>m.assignee!=="Equipe").map(m=>m.assignee)).size,coordPending:l.filter(m=>(m.valid||"pending")==="pending").length,coordApproved:l.filter(m=>m.valid==="approved").length,coordTotal:l.length,overdue:S.filter(pe).length,nova:S.filter(m=>m.unplanned&&!m.carriedFrom).length,carried:S.filter(m=>m.carriedFrom).length}},[S]),q=y.useMemo(()=>ea(S,x),[S,x]),ae=Ge!=null?O.progress-Ge:null,Ve=y.useMemo(()=>C==="project"?_.filter(a=>ee.some(n=>n.project===a.name)).map(a=>({key:a.name,label:a.name,accent:a.color,isToday:!1,list:ee.filter(n=>n.project===a.name)})):C==="assignee"?W.filter(a=>ee.some(n=>n.assignee===a.name)).map(a=>({key:a.name,label:a.name,accent:a.color,isToday:!1,list:ee.filter(n=>n.assignee===a.name)})):H.map(a=>({key:a,label:a,accent:void 0,isToday:je&&a===ma,list:ee.filter(n=>ct(n,a))})),[C,ee,ma,je,_,W]),$e=Qe(x),at=[{k:"day",label:"Dia",icon:"calendar_view_week"},{k:"project",label:"Projeto",icon:"folder"},{k:"assignee",label:"Equipe",icon:"group"}],Ue=ne!=="all"||re!=="all"||ie!=="all"||ye||se||Z!=="all",ya=()=>{Ie("all"),Te("all"),Oe("all"),oa(!1),Be(!1),Pe("all")},Ye=a=>{Le(!1),Ea(a),setTimeout(()=>window.print(),80)},P=ga==="all"?S:ee,tt=y.useMemo(()=>{const a=P.length,n=P.filter(X).length,l=P.filter(m=>m.isCoordPoint);return{total:a,done:n,progress:R(P),projects:new Set(P.map(m=>m.project)).size,people:new Set(P.filter(m=>m.assignee!=="Equipe").map(m=>m.assignee)).size,coordApproved:l.filter(m=>m.valid==="approved").length,coordTotal:l.length,coordPending:l.filter(m=>(m.valid||"pending")==="pending").length,overdue:P.filter(pe).length,nova:P.filter(m=>m.unplanned&&!m.carriedFrom).length,carried:P.filter(m=>m.carriedFrom).length}},[P]),nt=y.useMemo(()=>ea(P,x),[P,x]),rt={onStatus:Va,onEdit:a=>oe({open:!0,task:a}),onDelete:$a,onValidate:ua,onPostpone:Ua,onStandby:Ya,onDragStart:Xa,onDragEnd:Za},it=c==="dark";return e.jsxs("div",{className:`weekly-agenda-container ${it?"dark":""} ${u.cardStyle==="neuro"?"neuro":""} ${u.bgGrid?"":"nogrid"}`,children:[e.jsx("style",{children:Ft}),e.jsxs("div",{className:"screen-only",style:{padding:"20px",minHeight:"100%",display:"flex",flexDirection:"column"},children:[e.jsxs("header",{style:{display:"flex",flexWrap:"wrap",alignItems:"center",justifyContent:"space-between",gap:16,marginBottom:20},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:14},children:[e.jsx("div",{style:{width:42,height:42,borderRadius:12,background:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 8px 18px -6px color-mix(in srgb, var(--primary) 60%, transparent)"},children:e.jsx(d,{name:"account_tree",size:24,color:"#fff"})}),e.jsxs("div",{children:[e.jsx("h1",{className:"t-h1",style:{margin:0,fontSize:"18px",fontWeight:900},children:"Agenda da Semana"}),e.jsxs("div",{style:{position:"relative",marginTop:4},children:[e.jsxs("button",{className:"coord-chip",onClick:a=>{a.stopPropagation(),z(n=>!n)},children:[e.jsx(fe,{name:g,size:20,meta:Se(g)}),e.jsxs("span",{style:{display:"flex",flexDirection:"column",alignItems:"flex-start",lineHeight:1.15},children:[e.jsx("span",{style:{fontSize:12,fontWeight:700,color:"var(--theme-text)"},children:g}),e.jsx("span",{style:{fontSize:8,fontWeight:800,letterSpacing:".12em",color:"var(--primary)",textTransform:"uppercase"},children:Se(g).role})]}),e.jsx(d,{name:"unfold_more",size:14,color:"var(--theme-text-muted)"})]}),f&&e.jsxs("div",{className:"status-menu",style:{minWidth:220},onClick:a=>a.stopPropagation(),children:[e.jsx("div",{style:{padding:"4px 10px 6px",fontSize:8,fontWeight:800,letterSpacing:".16em",color:"var(--theme-text-muted)"},children:"COORDENADOR / CONFIGURAÇÃO"}),Ra().map(a=>e.jsxs("button",{className:a.name===g?"active":"",onClick:()=>He(a.name),children:[e.jsx(fe,{name:a.name,size:20,meta:a}),e.jsxs("span",{style:{display:"flex",flexDirection:"column",lineHeight:1.2},children:[e.jsx("span",{style:{fontWeight:700},children:a.name}),e.jsx("span",{style:{fontSize:10,color:"var(--theme-text-muted)"},children:a.role})]}),a.name===g&&e.jsx(d,{name:"check",size:14,style:{marginLeft:"auto"},color:"var(--primary)"})]},a.name)),e.jsx("div",{style:{padding:"7px 10px 3px",fontSize:10,color:"var(--theme-text-muted)",borderTop:"1px solid var(--theme-divider)",marginTop:4},children:"Cada coordenador tem sua própria agenda semanal de entregas."}),e.jsxs("button",{onClick:()=>{z(!1),E(!0)},style:{marginTop:2,borderTop:"1px solid var(--theme-divider)"},children:[e.jsx(d,{name:"manage_accounts",size:15}),"Gerenciar coordenadores"]})]})]})]})]}),e.jsxs("div",{className:"no-print",style:{display:"flex",gap:8,alignItems:"center"},children:[e.jsxs("div",{className:"week-nav",children:[e.jsx("button",{onClick:()=>w(a=>a-1),"aria-label":"Semana anterior",children:e.jsx(d,{name:"chevron_left",size:16})}),e.jsxs("button",{className:"week-label",onClick:()=>w(0),title:"Voltar para a semana atual",children:[e.jsx("span",{className:"font-sq",style:{fontSize:11,fontWeight:800},children:$e}),e.jsx("span",{style:{fontSize:8,color:je?"var(--primary)":"var(--theme-text-muted)",fontWeight:700,letterSpacing:".1em"},children:je?"ESTA SEMANA":x<0?"PASSADA":"FUTURA"})]}),e.jsx("button",{onClick:()=>w(a=>a+1),"aria-label":"Próxima semana",children:e.jsx(d,{name:"chevron_right",size:16})})]}),e.jsxs("button",{className:"btn "+(p?"btn-saved":"btn-ghost"),onClick:Wa,title:"Salvar configuração neste navegador",children:[e.jsx(d,{name:p?"cloud_done":"save",size:15}),p?"Salvo":"Salvar"]}),e.jsxs("button",{className:"btn btn-ghost",onClick:()=>Me(!0),title:"Design Tweaks",children:[e.jsx(d,{name:"settings",size:15}),"Ajustes"]}),e.jsxs("button",{className:"btn "+(_e?"btn-primary":"btn-ghost"),onClick:()=>Ta(a=>!a),title:"Tarefas em espera — fora da evolução da semana",style:_e?{background:"#EAB308"}:{},children:[e.jsx(d,{name:"pause_circle",size:15}),"Standby",me.length>0?` (${me.length})`:""]}),e.jsxs("button",{className:"btn btn-primary",onClick:()=>oe({open:!0,task:null}),children:[e.jsx(d,{name:"add",size:15}),"Nova Demanda"]})]})]}),_e&&e.jsxs("div",{className:"card",style:{padding:"14px 16px",marginBottom:"var(--gap)",border:"1px dashed #EAB30866",background:"rgba(234,179,8,0.04)"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:me.length?10:0},children:[e.jsx(d,{name:"pause_circle",size:16,color:"#EAB308"}),e.jsx("span",{className:"t-h3",style:{fontSize:12,fontWeight:800,color:"var(--theme-text)"},children:"Tarefas em Standby"}),e.jsxs("span",{style:{fontSize:10,color:"var(--theme-text-muted)"},children:["— pausadas, fora da evolução. Resgate para a semana exibida (",$e,")."]})]}),me.length===0&&e.jsxs("div",{style:{fontSize:11,color:"var(--theme-text-muted)"},children:["Nenhuma tarefa em espera. Use o botão ",e.jsx(d,{name:"pause_circle",size:12})," no card de uma demanda para pausá-la."]}),e.jsx("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))",gap:8},children:me.map(a=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:12,background:"var(--theme-card)",border:"1px solid var(--theme-divider)"},children:[e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("div",{style:{fontSize:11,fontWeight:700,color:"var(--theme-text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:a.text}),e.jsxs("div",{style:{fontSize:9,fontWeight:700,color:"var(--theme-text-muted)",textTransform:"uppercase",letterSpacing:".08em"},children:[a.assignee," · ",a.project,a.carriedFrom?` · de ${a.carriedFrom}`:""]})]}),e.jsxs("button",{className:"mini-btn ok",onClick:()=>Qa(a.id),title:"Resgatar para esta semana",children:[e.jsx(d,{name:"play_arrow",size:12}),"Resgatar"]}),e.jsx("button",{className:"row-btn danger",onClick:()=>Ja(a.id),title:"Excluir definitivamente",children:e.jsx(d,{name:"delete",size:13})})]},String(a.id)))})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(168px, 1fr))",gap:"var(--gap)",marginBottom:"var(--gap)"},children:[e.jsxs("div",{className:"card kpi-clickable",onClick:()=>U("insights"),style:{padding:"12px 14px",cursor:"pointer"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7},children:[e.jsx(d,{name:"trending_up",size:15,color:"var(--primary)"}),e.jsx("span",{className:"cap",style:{fontSize:9,color:"var(--theme-text-muted)"},children:"Avanço Ponderado"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginTop:6,flexWrap:"wrap"},children:[e.jsxs("span",{className:"font-sq",style:{fontSize:26,fontWeight:800,color:"var(--primary)",lineHeight:1},children:[O.progress,"%"]}),ae!=null&&ae!==0&&e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",fontSize:11,fontWeight:800,color:ae>0?"var(--success)":"var(--danger)"},children:[e.jsx(d,{name:ae>0?"arrow_upward":"arrow_downward",size:12}),ae>0?"+":"",ae,"%"]})]}),e.jsx("div",{style:{marginTop:8},children:e.jsx(V,{value:O.progress,color:"var(--primary)"})})]}),e.jsxs("div",{className:"card kpi-clickable",onClick:()=>U("insights"),style:{padding:"12px 14px",cursor:"pointer"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7},children:[e.jsx(d,{name:"speed",size:15,color:q.onTrackPct>=90?"var(--success)":q.onTrackPct>=60?"#EAB308":"var(--danger)"}),e.jsx("span",{className:"cap",style:{fontSize:9,color:"var(--theme-text-muted)"},children:"No Prazo"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginTop:6},children:[e.jsx("span",{className:"font-sq",style:{fontSize:26,fontWeight:800,lineHeight:1,color:q.onTrackPct>=90?"var(--success)":q.onTrackPct>=60?"#EAB308":"var(--danger)"},children:q.hasData?q.onTrackPct+"%":"—"}),e.jsx("span",{style:{fontSize:10,color:"var(--theme-text-muted)"},children:"previsto × feito"})]}),e.jsx("div",{style:{marginTop:8},children:e.jsx(V,{value:q.onTrackPct,color:q.onTrackPct>=90?"var(--success)":q.onTrackPct>=60?"#EAB308":"var(--danger)"})})]}),e.jsxs("div",{className:"card kpi-clickable",onClick:()=>U("validation"),style:{padding:"12px 14px",cursor:"pointer"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7},children:[e.jsx(d,{name:"verified",size:15,color:"#6366F1"}),e.jsx("span",{className:"cap",style:{fontSize:9,color:"var(--theme-text-muted)"},children:"Validações"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginTop:6},children:[e.jsx("span",{className:"font-sq",style:{fontSize:26,fontWeight:800,color:"#4F46E5",lineHeight:1},children:O.coordPending}),e.jsxs("span",{style:{fontSize:10,color:"var(--theme-text-muted)"},children:["pendentes · ",O.coordApproved,"/",O.coordTotal," ok"]})]}),e.jsxs("div",{style:{marginTop:8,display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"#6366F1"},children:[e.jsx(d,{name:"bolt",size:12}),"Ver fila de coordenação"]})]}),e.jsxs("div",{className:"card",style:{padding:"12px 14px",display:"flex",flexDirection:"column",gap:6},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7},children:[e.jsx(d,{name:"warning",size:15,color:O.overdue?"var(--danger)":"var(--success)"}),e.jsx("span",{className:"cap",style:{fontSize:9,color:"var(--theme-text-muted)"},children:"Em Atraso"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:8,marginTop:2},children:[e.jsx("span",{className:"font-sq",style:{fontSize:26,fontWeight:800,color:O.overdue?"var(--danger)":"var(--success)",lineHeight:1},children:O.overdue}),e.jsx("span",{style:{fontSize:10,color:"var(--theme-text-muted)"},children:O.overdue?"requer ação imediata":"todas metas em dia"})]}),e.jsx("div",{style:{marginTop:8},children:e.jsx(V,{value:O.overdue?100:0,color:"var(--danger)"})})]})]}),e.jsxs("div",{className:"no-print plan-strip",style:{marginBottom:"var(--gap)"},children:[e.jsx("div",{className:"plan-strip-status",children:la?e.jsxs(Xe.Fragment,{children:[e.jsx("span",{className:"plan-dot locked",children:e.jsx(d,{name:"lock",size:14})}),e.jsxs("div",{style:{minWidth:0},children:[e.jsx("div",{className:"cap",style:{fontSize:9,color:"var(--theme-text-muted)"},children:"Planejamento"}),e.jsx("div",{style:{fontSize:12.5,fontWeight:700,color:"var(--theme-text)"},children:"Lançado · novas demandas são sinalizadas"})]}),e.jsx("button",{className:"btn-icon",title:"Reabrir planejamento (parar de marcar novas)",onClick:Ba,style:{marginLeft:"auto"},children:e.jsx(d,{name:"lock_open",size:17})})]}):e.jsxs(Xe.Fragment,{children:[e.jsx("span",{className:"plan-dot open",children:e.jsx(d,{name:"lock_open",size:14})}),e.jsxs("div",{style:{minWidth:0},children:[e.jsx("div",{className:"cap",style:{fontSize:9,color:"var(--theme-text-muted)"},children:"Planejamento"}),e.jsx("div",{style:{fontSize:12.5,fontWeight:700,color:"var(--theme-text)"},children:"Em aberto · monte a semana e feche o lançamento"})]}),e.jsxs("button",{className:"btn btn-primary",onClick:Oa,style:{marginLeft:"auto"},children:[e.jsx(d,{name:"flag",size:15}),"Fechar lançamento"]})]})}),e.jsxs("div",{className:"plan-strip-chips",children:[e.jsxs("button",{className:"origin-chip nova"+(Z==="unplanned"?" active":""),onClick:()=>Pe(a=>a==="unplanned"?"all":"unplanned"),disabled:O.nova===0,children:[e.jsx("span",{className:"oc-count",children:O.nova}),e.jsxs("span",{className:"oc-label",children:[e.jsx(d,{name:"bolt",size:13}),"Novas nesta semana"]})]}),e.jsxs("button",{className:"origin-chip carried"+(Z==="carried"?" active":""),onClick:()=>Pe(a=>a==="carried"?"all":"carried"),disabled:O.carried===0,children:[e.jsx("span",{className:"oc-count",children:O.carried}),e.jsxs("span",{className:"oc-label",children:[e.jsx(d,{name:"history",size:13}),"Vindas da semana anterior"]})]})]})]}),e.jsxs("div",{className:"no-print",style:{display:"flex",flexWrap:"wrap",gap:10,alignItems:"center",justifyContent:"space-between",marginBottom:"var(--gap)"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"},children:[e.jsx("div",{className:"seg",children:at.map(a=>e.jsxs("button",{className:C===a.k?"active":"",onClick:()=>A(a.k),children:[e.jsx(d,{name:a.icon,size:14}),a.label]},a.k))}),e.jsxs("div",{className:"seg desktop-only",children:[e.jsx("button",{className:B==="list"?"active":"",onClick:()=>$("list"),title:"Faixas horizontais",children:e.jsx(d,{name:"view_agenda",size:14})}),e.jsx("button",{className:B==="board"?"active":"",onClick:()=>$("board"),title:"Colunas (quadro)",children:e.jsx(d,{name:"view_week",size:14})})]})]}),e.jsxs("div",{className:"desktop-only",style:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"},children:[e.jsxs("select",{className:"select",style:{width:"auto",padding:"6px 30px 6px 12px",fontSize:11.5},value:ne,onChange:a=>Ie(a.target.value),children:[e.jsx("option",{value:"all",children:"Todos projetos"}),_.map(a=>e.jsx("option",{value:a.name,children:a.name},a.name))]}),e.jsxs("select",{className:"select",style:{width:"auto",padding:"6px 30px 6px 12px",fontSize:11.5},value:re,onChange:a=>Te(a.target.value),children:[e.jsx("option",{value:"all",children:"Toda equipe"}),W.map(a=>e.jsx("option",{value:a.name,children:a.name},a.name))]}),e.jsxs("select",{className:"select",style:{width:"auto",padding:"6px 30px 6px 12px",fontSize:11.5},value:ie,onChange:a=>Oe(a.target.value),children:[e.jsx("option",{value:"all",children:"Disciplinas"}),Y.map(a=>e.jsx("option",{value:a.code,children:a.code},a.code))]}),e.jsx("button",{className:"btn-icon"+(se?" on-danger":""),title:"Só atrasadas",onClick:()=>Be(a=>!a),children:e.jsx(d,{name:"warning",size:16})}),Ue&&e.jsx("button",{className:"btn-icon",title:"Limpar filtros",onClick:ya,children:e.jsx(d,{name:"filter_alt_off",size:16})}),e.jsxs("div",{style:{position:"relative"},children:[e.jsxs("button",{className:"btn btn-ghost",style:{padding:"7px 12px"},onClick:a=>{a.stopPropagation(),Le(n=>!n)},children:[e.jsx(d,{name:"download",size:14}),"Relatório PDF",e.jsx(d,{name:"expand_more",size:13})]}),We&&e.jsxs("div",{className:"status-menu",style:{right:0,left:"auto",minWidth:232},onClick:a=>a.stopPropagation(),children:[e.jsxs("label",{className:"export-opt",onClick:a=>a.stopPropagation(),children:[e.jsx("input",{type:"checkbox",checked:da,onChange:a=>Fa(a.target.checked)}),e.jsxs("span",{children:[e.jsx(d,{name:"checklist",size:14}),"Incluir checklist"]})]}),e.jsx("div",{style:{height:1,background:"var(--theme-divider)",margin:"4px 6px"}}),e.jsxs("button",{onClick:()=>Ye("all"),children:[e.jsx(d,{name:"calendar_month",size:14}),"Exportar semana inteira"]}),e.jsxs("button",{onClick:()=>Ye("filtered"),children:[e.jsx(d,{name:"filter_alt",size:14}),"Exportar visão filtrada"]})]})]})]}),e.jsxs("button",{className:"btn btn-ghost mobile-only",onClick:()=>ve(!0),children:[e.jsx(d,{name:"tune",size:14}),"Filtros",Ue?" •":""]})]}),(()=>{const a=(n,l)=>n.map(m=>{const D=ra(m),T=l&&D>1?{part:M[l]-Ee(m)+1,total:D,isEnd:M[l]===ia(m),isStart:M[l]===Ee(m)}:null;return e.jsx(yt,{task:m,groupBy:C,showProjColor:u.projColors,canValidate:ha,span:T,getProjColor:Ce,getProjCode:ze,getDiscMeta:qe,getPersonMeta:Se,...rt},m.id+"@"+(l||"x"))});return e.jsx("div",{style:{flex:1},children:B==="board"?e.jsx("div",{className:"board",style:{"--cols":Ve.length},children:Ve.map(n=>e.jsx(vt,{meta:{label:n.label},tasks:n.list,accent:n.accent,isToday:n.isToday,dropping:xa===n.key&&C==="day",onDragOver:C==="day"?l=>{l.preventDefault(),be(n.key)}:void 0,onDrop:C==="day"?fa(n.key):void 0,children:a(n.list,C==="day"?n.key:null)},n.key))}):e.jsx("div",{className:"stack",children:Ve.map(n=>e.jsx(bt,{meta:{label:n.label},tasks:n.list,accent:n.accent,isToday:n.isToday,dropping:xa===n.key&&C==="day",onDragOver:C==="day"?l=>{l.preventDefault(),be(n.key)}:void 0,onDrop:C==="day"?fa(n.key):void 0,children:a(n.list,C==="day"?n.key:null)},n.key))})})})(),C==="day"&&e.jsxs("p",{className:"no-print desktop-only",style:{textAlign:"center",fontSize:11,color:"var(--theme-text-muted)",marginTop:14},children:[e.jsx(d,{name:"drag_indicator",size:13,style:{marginRight:4}}),"Dica: arraste os cartões entre os dias da semana para reorganizar a agenda"]})]}),e.jsx(Ct,{tasks:P,weekLabel:"SEMANA "+$e,stats:tt,pva:nt,trend:ae,scope:ga,coord:g,getProjColor:Ce,getProjCode:ze,getDiscMeta:qe,getPersonMeta:Se,showChecklist:da}),e.jsxs("nav",{className:"bottom-nav no-print",children:[e.jsx(Fe,{icon:"dashboard",label:"Agenda",onClick:()=>window.scrollTo({top:0,behavior:"smooth"}),active:!0}),e.jsx(Fe,{icon:"insights",label:"Painel",onClick:()=>U("insights")}),e.jsx("button",{onClick:()=>oe({open:!0,task:null}),style:{border:"none",background:"var(--primary)",width:44,height:44,borderRadius:14,color:"#fff",cursor:"pointer",boxShadow:"0 8px 18px -6px color-mix(in srgb, var(--primary) 60%, transparent)",marginTop:-20,display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx(d,{name:"add",size:22})}),e.jsx(Fe,{icon:"verified",label:"Validar",onClick:()=>U("validation"),badge:O.coordPending>0}),e.jsx(Fe,{icon:"tune",label:"Filtros",onClick:()=>ve(!0),badge:Ue})]}),Da&&e.jsx("div",{className:"overlay no-print mobile-only",onClick:()=>ve(!1),style:{alignItems:"flex-end",padding:0},children:e.jsxs("div",{className:"card",onClick:a=>a.stopPropagation(),style:{width:"100%",borderRadius:"24px 24px 0 0",padding:20,animation:"slideUp .3s cubic-bezier(.16,1,.3,1)"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16},children:[e.jsx("h2",{className:"t-h2",style:{margin:0,fontSize:14},children:"Filtros de Agenda"}),e.jsx("button",{className:"btn-icon",onClick:()=>ve(!1),children:e.jsx(d,{name:"close",size:16})})]}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Projeto"}),e.jsxs("select",{className:"select",value:ne,onChange:a=>Ie(a.target.value),children:[e.jsx("option",{value:"all",children:"Todos projetos"}),_.map(a=>e.jsx("option",{value:a.name,children:a.name},a.name))]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Responsável"}),e.jsxs("select",{className:"select",value:re,onChange:a=>Te(a.target.value),children:[e.jsx("option",{value:"all",children:"Toda equipe"}),W.map(a=>e.jsx("option",{value:a.name,children:a.name},a.name))]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Disciplina"}),e.jsxs("select",{className:"select",value:ie,onChange:a=>Oe(a.target.value),children:[e.jsx("option",{value:"all",children:"Todas"}),Y.map(a=>e.jsxs("option",{value:a.code,children:[a.code," · ",a.name]},a.code))]})]}),e.jsxs("button",{className:"btn "+(ye?"btn-primary":"btn-ghost"),onClick:()=>oa(a=>!a),style:{width:"100%"},children:[e.jsx(d,{name:"verified",size:14}),"Requer validação"]}),e.jsxs("button",{className:"btn "+(se?"btn-primary":"btn-ghost"),onClick:()=>Be(a=>!a),style:{width:"100%",...se?{background:"var(--danger)"}:{}},children:[e.jsx(d,{name:"warning",size:14}),"Só atrasadas"]}),e.jsxs("button",{className:"btn btn-ghost",style:{width:"100%"},onClick:()=>Ye("all"),children:[e.jsx(d,{name:"download",size:14}),"Exportar PDF"]}),e.jsx("button",{className:"btn btn-ghost",style:{width:"100%"},onClick:ya,children:"Limpar todos filtros"})]})]})}),e.jsx(jt,{open:ca.open,initial:ca.task,weekOffset:x,onClose:()=>oe({open:!1,task:null}),onSave:Ka,integratedProjects:_,integratedPeople:W,integratedDisciplines:Y,handleAddProject:qa,handleAddPerson:Ga,handleAddDiscipline:Ha}),e.jsx(kt,{open:F,activeCoord:g,onClose:()=>E(!1),onAdd:La,onUpdateRole:Ma,onRemove:_a,integratedPeople:W}),e.jsx(wt,{open:pa==="insights",onClose:()=>U(null),tasks:S,weekOffset:x,prevProgress:Ge,integratedPeople:W,integratedDisciplines:Y,getProjColor:Ce,getProjCode:ze}),e.jsx(St,{open:pa==="validation",onClose:()=>U(null),tasks:S,onValidate:ua,onOpenTask:a=>{U(null),oe({open:!0,task:a})},getProjColor:Ce,getProjCode:ze,getDiscMeta:qe}),Ia&&e.jsx("div",{className:"overlay no-print",onClick:()=>Me(!1),children:e.jsxs("div",{className:"modal",onClick:a=>a.stopPropagation(),style:{maxWidth:360},children:[e.jsxs("div",{style:{padding:"16px 20px",borderBottom:"1px solid var(--theme-divider)",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[e.jsx("h2",{className:"t-h2",style:{margin:0,fontSize:14},children:"Ajustes de Design"}),e.jsx("button",{className:"btn-icon",onClick:()=>Me(!1),children:e.jsx(d,{name:"close",size:16})})]}),e.jsxs("div",{style:{padding:20,display:"flex",flexDirection:"column",gap:14},children:[e.jsx(zt,{label:"Cor de Destaque",value:u.accent,options:["#FF6B4A","#6366F1","#10B981","#0EA5E9","#EC4899"],onChange:a=>k("accent",a)}),e.jsx(Sa,{label:"Estilo dos Cards",value:u.cardStyle,options:["soft","neuro"],onChange:a=>k("cardStyle",a)}),e.jsx(Sa,{label:"Densidade da Tabela",value:u.density,options:["compact","comfy","roomy"],onChange:a=>k("density",a)}),e.jsx(wa,{label:"Cor por Projeto nos Cards",value:u.projColors,onChange:a=>k("projColors",a)}),e.jsx(wa,{label:"Grade de Fundo Decorativa",value:u.bgGrid,onChange:a=>k("bgGrid",a)})]})]})})]})}function Fe({icon:t,label:r,onClick:s,active:c,badge:o}){return e.jsxs("button",{onClick:s,style:{border:"none",background:"transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"4px 8px",color:c?"var(--primary)":"var(--theme-text-muted)",position:"relative"},children:[e.jsx(d,{name:t,size:21}),e.jsx("span",{style:{fontFamily:"var(--font-display)",fontWeight:800,fontSize:8.5,letterSpacing:"0.1em",textTransform:"uppercase"},children:r}),o&&e.jsx("span",{style:{position:"absolute",top:2,right:6,width:7,height:7,borderRadius:"50%",background:"var(--primary)"}})]})}function fe({name:t,size:r=24,ring:s,meta:c}){return e.jsx("span",{className:"avatar",title:t+(c?.role?" · "+c.role:""),style:{width:r,height:r,fontSize:r*.38,background:c?.color||"#94A3B8",boxShadow:s?`0 0 0 2px #fff, 0 0 0 4px ${c?.color||"#94A3B8"}55`:void 0},children:za(t)})}function sa({code:t,meta:r}){return r?e.jsx("span",{className:"chip",style:{background:r.color+"1A",color:r.color,border:`1px solid ${r.color}33`},title:r.name,children:t}):null}function ut(t){const r=Ca(t);return r?String(r.getDate()).padStart(2,"0")+"/"+String(r.getMonth()+1).padStart(2,"0"):""}function ft({value:t,onChange:r}){const[s,c]=y.useState(!1),o=y.useRef(null);y.useEffect(()=>{const u=j=>{o.current&&!o.current.contains(j.target)&&c(!1)};return document.addEventListener("mousedown",u),()=>document.removeEventListener("mousedown",u)},[]);const h=ce.find(u=>u.key===t)||ce[0];return e.jsxs("span",{ref:o,style:{position:"relative"},children:[e.jsxs("button",{className:"status-pill no-print",onClick:u=>{u.stopPropagation(),c(j=>!j)},style:{background:h.color+"1A",color:h.color,border:`1px solid ${h.color}44`},children:[e.jsx("span",{style:{width:6,height:6,borderRadius:"50%",background:h.color}}),h.short,e.jsx(d,{name:"expand_more",size:12})]}),s&&e.jsx("div",{className:"status-menu",onClick:u=>u.stopPropagation(),children:ce.map(u=>e.jsxs("button",{onClick:()=>{r(u.key),c(!1)},className:u.key===t?"active":"",children:[e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",background:u.color}}),u.label,e.jsxs("span",{style:{marginLeft:"auto",fontSize:9,color:"var(--theme-text-muted)"},children:[u.pct,"%"]})]},u.key))})]})}function yt({task:t,onStatus:r,onEdit:s,onDelete:c,onValidate:o,onPostpone:h,onStandby:u,onDragStart:j,onDragEnd:k,showProjColor:g,groupBy:I,canValidate:f,getProjColor:z,getProjCode:F,getDiscMeta:E,getPersonMeta:b,span:N}){const p=z(t.project),v=na(t),x=X(t),w=!N||N.isEnd,S=pe(t)&&w,i=pt(t)&&w,C=t.subtasks?t.subtasks.filter($=>$.done).length:0,A=t.isCoordPoint?ue[t.valid||"pending"]||ue.pending:null,B=ra(t);return e.jsxs("div",{className:"task animate-fade"+(x?" done":"")+(t.isCoordPoint?" validate":"")+(t.unplanned&&!t.carriedFrom?" nova":"")+(t.carriedFrom?" carried":"")+(S?" overdue":""),draggable:I==="day",onDragStart:$=>j($,t),onDragEnd:k,children:[g&&!t.isCoordPoint&&e.jsx("div",{className:"task-accent",style:{background:p}}),e.jsxs("div",{style:{display:"flex",gap:11,alignItems:"flex-start",paddingLeft:g&&!t.isCoordPoint?6:0},children:[e.jsx("button",{className:"checkbox no-print"+(x?" checked":""),onClick:()=>r(t.id,x?"todo":"done"),"aria-label":"Concluir",children:x&&e.jsx(d,{name:"check",size:13})}),e.jsx("span",{className:"print-only",style:{width:14,height:14,border:"1.5px solid #374151",borderRadius:3,flexShrink:0,marginTop:2}}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:7},children:[I!=="project"&&e.jsx("span",{className:"chip",style:{background:p+"1A",color:p,border:`1px solid ${p}33`},children:F(t.project)}),e.jsx(sa,{code:t.disc,meta:E(t.disc)}),t.carriedFrom&&e.jsxs("span",{className:"chip",title:"Adiada de "+t.carriedFrom+(t.postponedCount>1?" · "+t.postponedCount+"ª vez":""),style:{background:"#F59E0B",color:"#fff",border:"none"},children:[e.jsx(d,{name:"history",size:11}),"Adiada",t.postponedCount>1?" ×"+t.postponedCount:""]}),t.unplanned&&!t.carriedFrom&&e.jsxs("span",{className:"chip",title:"Demanda nova — surgiu durante a semana (fora do planejamento inicial)",style:{background:"#FF6B4A",color:"#fff",border:"none",boxShadow:"0 2px 8px -2px #FF6B4AAA"},children:[e.jsx(d,{name:"bolt",size:11}),"Nova"]}),I!=="assignee"&&e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:5},children:[e.jsx(fe,{name:t.assignee,size:18,meta:b(t.assignee)}),e.jsx("span",{style:{fontSize:11,fontWeight:600,color:"var(--theme-text)"},children:t.assignee})]})]}),e.jsx("p",{className:"task-text",style:{margin:"0 0 9px",fontSize:13,lineHeight:1.45,color:"var(--theme-text)",textWrap:"pretty"},children:t.text}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:9,marginBottom:7},children:[e.jsx("div",{style:{flex:1},children:e.jsx(V,{value:v,color:x?"var(--success)":v>=85?"#EAB308":v>0?"#0EA5E9":"var(--theme-divider)",height:3})}),e.jsxs("span",{className:"font-sq",style:{fontSize:9,fontWeight:800,color:"var(--theme-text-muted)",minWidth:26,textAlign:"right"},children:[v,"%"]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"},children:[e.jsx(ft,{value:t.status||(t.completed?"done":"todo"),onChange:$=>r(t.id,$)}),t.subtasks&&t.subtasks.length>0&&e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:600,color:"var(--theme-text-muted)"},children:[e.jsx(d,{name:"checklist",size:12}),C,"/",t.subtasks.length]}),e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:600,color:"var(--theme-text-muted)"},title:"Peso / esforço",children:[e.jsx(d,{name:"fitness_center",size:11}),t.weight||1]}),B>1&&e.jsxs("span",{className:"dur-pill",title:"Atividade de "+B+" dias"+(N?" · dia "+N.part+" de "+N.total:""),children:[e.jsx(d,{name:"date_range",size:12}),N?"Dia "+N.part+"/"+N.total:B+" dias"]}),t.dueDate&&w&&e.jsxs("span",{className:"due"+(S?" is-over":i?" is-today":""),children:[e.jsx(d,{name:S?"event_busy":"event",size:11}),B>1?"Entrega ":"",ut(t.dueDate),S?" · ATRASO":i?" · HOJE":""]}),N&&!N.isEnd&&e.jsxs("span",{className:"due continues",children:[e.jsx(d,{name:"arrow_forward",size:11}),"Continua"]}),t.time&&e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:3,fontSize:10,fontWeight:600,color:"var(--theme-text-muted)"},children:[e.jsx(d,{name:"schedule",size:11}),t.time]})]}),t.isCoordPoint&&A&&e.jsxs("div",{className:"no-print",style:{marginTop:9,padding:"6px 8px",borderRadius:8,background:A.color+"14",border:`1px solid ${A.color}33`,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"},children:[e.jsxs("span",{className:"chip",style:{background:A.color+"22",color:A.color,border:"none"},children:[e.jsx(d,{name:"verified",size:11}),A.label]}),f?e.jsxs(Xe.Fragment,{children:[t.valid!=="approved"&&e.jsxs("button",{className:"mini-btn ok",onClick:()=>o(t.id,"approved"),children:[e.jsx(d,{name:"check",size:12}),"Aprovar"]}),t.valid!=="returned"&&e.jsxs("button",{className:"mini-btn no",onClick:()=>o(t.id,"returned"),children:[e.jsx(d,{name:"undo",size:12}),"Devolver"]})]}):e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"var(--theme-text-muted)"},children:[e.jsx(d,{name:"lock",size:11}),"Coordenação"]})]})]}),e.jsxs("div",{className:"no-print task-actions",style:{display:"flex",flexDirection:"column",gap:2},children:[e.jsx("button",{className:"row-btn",onClick:()=>s(t),"aria-label":"Editar",children:e.jsx(d,{name:"edit",size:14})}),!x&&h&&e.jsx("button",{className:"row-btn warn",onClick:()=>h(t.id),"aria-label":"Adiar para próxima semana",title:"Adiar para a próxima semana",children:e.jsx(d,{name:"next_week",size:14})}),!x&&u&&e.jsx("button",{className:"row-btn",style:{color:"#EAB308"},onClick:()=>u(t.id),"aria-label":"Colocar em standby",title:"Standby — pausa a tarefa e tira da evolução da semana",children:e.jsx(d,{name:"pause_circle",size:14})}),e.jsx("button",{className:"row-btn danger",onClick:()=>c(t.id),"aria-label":"Excluir",children:e.jsx(d,{name:"delete",size:14})})]})]})]})}function vt({meta:t,tasks:r,isToday:s,onDrop:c,onDragOver:o,dropping:h,children:u,accent:j}){const k=R(r);return e.jsxs("div",{className:"col"+(s?" today":"")+(h?" dropping":""),onDrop:c,onDragOver:o,children:[e.jsxs("div",{style:{padding:"10px 12px 8px",borderBottom:"1px solid var(--theme-divider)"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6,minWidth:0},children:[j&&e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",background:j,flexShrink:0}}),e.jsx("h3",{className:"t-h3",style:{margin:0,fontSize:12,color:"var(--theme-text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:t.label}),s&&e.jsx("span",{className:"chip",style:{background:"var(--primary)",color:"#fff"},children:"Hoje"})]}),e.jsxs("span",{className:"font-sq",style:{fontSize:10,fontWeight:800,color:"var(--theme-text-muted)"},children:[k,"%"]})]}),e.jsx("div",{style:{marginTop:6},children:e.jsx(V,{value:k,color:j||"var(--success)",height:4})})]}),e.jsx("div",{className:"col-body",children:u})]})}function bt({meta:t,tasks:r,isToday:s,accent:c,dropping:o,onDrop:h,onDragOver:u,children:j}){const k=R(r);return e.jsxs("div",{className:"band"+(s?" today":"")+(o?" dropping":""),onDrop:h,onDragOver:u,children:[e.jsxs("div",{className:"band-head",children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,minWidth:0},children:[c&&e.jsx("span",{style:{width:8,height:8,borderRadius:"50%",background:c,flexShrink:0}}),e.jsx("h3",{className:"t-h3",style:{margin:0,fontSize:12.5,color:"var(--theme-text)"},children:t.label}),s&&e.jsx("span",{className:"chip",style:{background:"var(--primary)",color:"#fff"},children:"Hoje"})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,flexShrink:0},children:[e.jsx("div",{style:{width:100},children:e.jsx(V,{value:k,color:c||"var(--success)",height:4})}),e.jsxs("span",{className:"font-sq",style:{fontSize:11,fontWeight:800,color:"var(--theme-text-muted)",minWidth:34,textAlign:"right"},children:[k,"%"]})]})]}),e.jsxs("div",{className:"band-body",children:[j,r.length===0&&e.jsx("div",{style:{padding:"8px 4px",color:"var(--theme-text-muted)",fontSize:11.5,fontStyle:"italic"},children:"Sem atividades alocadas."})]})]})}function Ke({value:t,onChange:r,options:s,onAdd:c,placeholder:o,addLabel:h}){const[u,j]=y.useState(!1),[k,g]=y.useState(""),I=()=>{const f=c(k);f&&r(f),j(!1),g("")};return u?e.jsxs("div",{style:{display:"flex",gap:6},children:[e.jsx("input",{className:"input",autoFocus:!0,value:k,onChange:f=>g(f.target.value),placeholder:o,onKeyDown:f=>{f.key==="Enter"&&(f.preventDefault(),I()),f.key==="Escape"&&(j(!1),g(""))},style:{fontSize:12}}),e.jsx("button",{type:"button",className:"btn btn-primary",style:{flexShrink:0,padding:"0 10px"},onClick:I,children:e.jsx(d,{name:"check",size:14})}),e.jsx("button",{type:"button",className:"btn-icon",style:{flexShrink:0},onClick:()=>{j(!1),g("")},children:e.jsx(d,{name:"close",size:14})})]}):e.jsxs("select",{className:"select",value:t,onChange:f=>{f.target.value==="__add"?j(!0):r(f.target.value)},children:[s.map(f=>e.jsx("option",{value:f.value,children:f.label},f.value)),e.jsxs("option",{value:"__add",children:["＋ ",h]})]})}function jt({open:t,initial:r,weekOffset:s,onClose:c,onSave:o,integratedProjects:h,integratedPeople:u,integratedDisciplines:j,handleAddProject:k,handleAddPerson:g,handleAddDiscipline:I}){const f={text:"",day:"Segunda",assignee:"Yuri",project:"Geral",disc:"ARQ",status:"todo",weight:2,durationDays:1,time:"",dueDate:"",isCoordPoint:!1,valid:"pending",subtasks:[]},[z,F]=y.useState(f),[E,b]=y.useState(""),N=r&&r.id!=null;if(y.useEffect(()=>{if(t){const i=r?{...f,...r,subtasks:r.subtasks?[...r.subtasks]:[]}:f;i.dueDate||(i.dueDate=K(i.day,s||0)),F(i),b("")}},[t,r]),!t)return null;const p=(i,C)=>F(A=>{const B={...A,[i]:C};return i==="day"&&(!A.dueDate||A.dueDate===K(A.day,s||0))&&(B.dueDate=K(C,s||0)),B}),v=()=>{E.trim()&&(F(i=>({...i,subtasks:[...i.subtasks||[],{id:Date.now()+"",text:E.trim(),done:!1}]})),b(""))},x=i=>F(C=>({...C,subtasks:C.subtasks?.map(A=>A.id===i?{...A,done:!A.done}:A)})),w=i=>F(C=>({...C,subtasks:C.subtasks?.filter(A=>A.id!==i)})),S=i=>{i.preventDefault(),z.text.trim()&&o(z)};return e.jsx("div",{className:"overlay no-print",onClick:c,children:e.jsxs("div",{className:"modal",onClick:i=>i.stopPropagation(),children:[e.jsxs("div",{style:{padding:"16px 20px",borderBottom:"1px solid var(--theme-divider)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--theme-card)"},children:[e.jsxs("h2",{className:"t-h2",style:{margin:0,fontSize:14,display:"flex",alignItems:"center",gap:9},children:[e.jsx(d,{name:N?"edit_note":"add_task",size:20,color:"var(--primary)"}),N?"Editar Demanda":"Nova Demanda"]}),e.jsx("button",{className:"btn-icon",onClick:c,"aria-label":"Fechar",children:e.jsx(d,{name:"close",size:16})})]}),e.jsxs("form",{onSubmit:S,style:{padding:20,display:"flex",flexDirection:"column",gap:14},children:[e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Atividade"}),e.jsx("textarea",{className:"textarea",value:z.text,onChange:i=>p("text",i.target.value),placeholder:"Descreva a entrega semanal…",autoFocus:!0,required:!0})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:[e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Projeto"}),e.jsx(Ke,{value:z.project,onChange:i=>p("project",i),addLabel:"Novo projeto",placeholder:"Nome...",options:h.map(i=>({value:i.name,label:i.name})),onAdd:i=>{const C=k(i);return C?C.name:null}})]}),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Disciplina"}),e.jsx(Ke,{value:z.disc,onChange:i=>p("disc",i),addLabel:"Nova disc.",placeholder:"Sigla...",options:j.map(i=>({value:i.code,label:i.code+" · "+i.name})),onAdd:i=>{const C=I(i);return C?C.code:null}})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10},children:[e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Responsável"}),e.jsx(Ke,{value:z.assignee,onChange:i=>p("assignee",i),addLabel:"Novo resp.",placeholder:"Nome...",options:u.map(i=>({value:i.name,label:i.name})),onAdd:i=>{const C=g(i);return C?C.name:null}})]}),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Status"}),e.jsx("select",{className:"select",value:z.status,onChange:i=>p("status",i.target.value),children:ce.map(i=>e.jsxs("option",{value:i.key,children:[i.label," (",i.pct,"%)"]},i.key))})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10},children:[e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Dia de início"}),e.jsx("select",{className:"select",value:z.day,onChange:i=>p("day",i.target.value),children:H.map(i=>e.jsx("option",{value:i,children:i},i))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Duração (dias)"}),e.jsx("input",{type:"number",min:"1",max:"5",className:"input",value:z.durationDays||1,onChange:i=>p("durationDays",Math.min(5,Math.max(1,+i.target.value||1)))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Peso (1-10)"}),e.jsx("input",{type:"number",min:"1",max:"10",className:"input",value:z.weight,onChange:i=>p("weight",Math.max(1,+i.target.value||1))})]})]}),(()=>{const i=M[z.day]||0,C=z.durationDays||1,A=Math.min(i+C-1,4),B=i+C-1>4;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:7,marginTop:-6,fontSize:11.5,color:"var(--theme-text-muted)",fontWeight:600},children:[e.jsx(d,{name:"event_available",size:14,color:"var(--primary)"}),C>1?e.jsxs("span",{children:["Ocupa ",e.jsxs("b",{style:{color:"var(--theme-text)"},children:[H[i]," → ",H[A]]})," · entrega na ",e.jsx("b",{style:{color:"var(--theme-text)"},children:H[A]}),B?" (limite da semana)":""]}):e.jsxs("span",{children:["Entrega na ",e.jsx("b",{style:{color:"var(--theme-text)"},children:H[i]})]})]})})(),e.jsxs("div",{children:[e.jsx("label",{className:"field-label",children:"Subtarefas (Checklist)"}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",gap:5},children:[z.subtasks?.map(i=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",borderRadius:8,background:"var(--theme-input)"},children:[e.jsx("button",{type:"button",onClick:()=>x(i.id),style:{width:16,height:16,borderRadius:5,flexShrink:0,border:`2px solid ${i.done?"var(--success)":"var(--theme-divider)"}`,background:i.done?"var(--success)":"#fff",color:"#fff",cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center"},children:i.done&&e.jsx(d,{name:"check",size:11})}),e.jsx("span",{style:{flex:1,fontSize:12,textDecoration:i.done?"line-through":"none",color:i.done?"var(--theme-text-muted)":"var(--theme-text)"},children:i.text}),e.jsx("button",{type:"button",className:"row-btn danger",onClick:()=>w(i.id),children:e.jsx(d,{name:"close",size:12})})]},i.id)),e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("input",{className:"input",value:E,onChange:i=>b(i.target.value),placeholder:"Novo item...",onKeyDown:i=>{i.key==="Enter"&&(i.preventDefault(),v())},style:{fontSize:12}}),e.jsx("button",{type:"button",className:"btn btn-ghost",onClick:v,style:{flexShrink:0,padding:6},children:e.jsx(d,{name:"add",size:14})})]})]})]}),e.jsxs("button",{type:"button",onClick:()=>p("isCoordPoint",!z.isCoordPoint),style:{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:"var(--radius-md)",border:`1px solid ${z.isCoordPoint?"#6366F1":"var(--theme-divider)"}`,background:z.isCoordPoint?"#6366F112":"var(--theme-highlight)",cursor:"pointer",textAlign:"left"},children:[e.jsx("span",{style:{width:20,height:20,borderRadius:7,flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",background:z.isCoordPoint?"#6366F1":"var(--theme-card)",border:`2px solid ${z.isCoordPoint?"#6366F1":"var(--theme-divider)"}`,color:"#fff"},children:z.isCoordPoint&&e.jsx(d,{name:"check",size:13})}),e.jsxs("span",{children:[e.jsx("span",{className:"cap",style:{fontSize:9.5,color:z.isCoordPoint?"#4F46E5":"var(--theme-text)",display:"block"},children:"Ponto de Coordenação"}),e.jsx("span",{style:{fontSize:10.5,color:"var(--theme-text-muted)"},children:"Exige validação do coordenador ativo"})]})]}),e.jsxs("div",{style:{display:"flex",gap:10,justifyContent:"flex-end",borderTop:"1px solid var(--theme-divider)",paddingTop:14},children:[e.jsx("button",{type:"button",className:"btn btn-ghost",onClick:c,children:"Cancelar"}),e.jsxs("button",{type:"submit",className:"btn btn-primary",children:[e.jsx(d,{name:N?"save":"add",size:14}),N?"Salvar":"Adicionar"]})]})]})]})})}function kt({open:t,activeCoord:r,onClose:s,onAdd:c,onUpdateRole:o,onRemove:h,integratedPeople:u}){const[j,k]=y.useState(""),[g,I]=y.useState("");if(!t)return null;const f=u.filter(F=>F.coordinator),z=F=>{F.preventDefault(),j.trim()&&(c(j.trim(),g.trim()),k(""),I(""))};return e.jsx("div",{className:"overlay no-print",onClick:s,children:e.jsxs("div",{className:"modal",onClick:F=>F.stopPropagation(),style:{maxWidth:440},children:[e.jsxs("div",{style:{padding:"16px 20px",borderBottom:"1px solid var(--theme-divider)",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[e.jsxs("h2",{className:"t-h2",style:{margin:0,fontSize:14,display:"flex",alignItems:"center",gap:9},children:[e.jsx(d,{name:"manage_accounts",size:20,color:"var(--primary)"}),"Coordenadores"]}),e.jsx("button",{className:"btn-icon",onClick:s,children:e.jsx(d,{name:"close",size:16})})]}),e.jsxs("div",{style:{padding:20,display:"flex",flexDirection:"column",gap:12},children:[e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:f.map(F=>{const E=F.name===r,b=!E&&f.length>1;return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:10,border:"1px solid var(--theme-divider)",background:E?"var(--primary-soft)":"var(--theme-card)"},children:[e.jsx(fe,{name:F.name,size:28,meta:F}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:[e.jsx("span",{style:{fontSize:13,fontWeight:700},children:F.name}),E&&e.jsx("span",{className:"chip",style:{background:"var(--primary)",color:"#fff"},children:"Ativo"})]}),e.jsx("input",{className:"role-input",value:F.role,placeholder:"Função…",onChange:N=>o(F.name,N.target.value)})]}),e.jsx("button",{className:"row-btn danger",disabled:!b,title:E?"Troque de perfil para remover":"Remover",style:{opacity:b?1:.35},onClick:()=>b&&h(F.name),children:e.jsx(d,{name:"delete",size:15})})]},F.name)})}),e.jsxs("form",{onSubmit:z,style:{borderTop:"1px solid var(--theme-divider)",paddingTop:14,display:"flex",flexDirection:"column",gap:10},children:[e.jsx("span",{className:"field-label",children:"Promover Coordenador"}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8},children:[e.jsx("input",{className:"input",value:j,onChange:F=>k(F.target.value),placeholder:"Nome"}),e.jsx("input",{className:"input",value:g,onChange:F=>I(F.target.value),placeholder:"Cargo"})]}),e.jsxs("button",{type:"submit",className:"btn btn-primary",style:{alignSelf:"flex-start"},children:[e.jsx(d,{name:"person_add",size:14}),"Adicionar"]})]})]})]})})}function wt({open:t,onClose:r,tasks:s,weekOffset:c,prevProgress:o,integratedPeople:h,integratedDisciplines:u,getProjColor:j,getProjCode:k}){if(!t)return null;const g=ea(s,c),I=R(s),f=o!=null?I-o:null,z=s.filter(pe),F=h.filter(b=>s.some(N=>N.assignee===b.name)).map(b=>{const N=s.filter(v=>v.assignee===b.name),p=N.reduce((v,x)=>v+ge(x),0);return{...b,w:p,ratio:Math.round(p/b.capacity*100),prog:R(N),count:N.length}}),E=u.filter(b=>s.some(N=>N.disc===b.code)).map(b=>{const N=s.filter(p=>p.disc===b.code);return{...b,prog:R(N),count:N.length}});return e.jsx("div",{className:"overlay no-print",onClick:r,style:{justifyContent:"flex-end",padding:0},children:e.jsxs("div",{className:"drawer",onClick:b=>b.stopPropagation(),children:[e.jsxs("div",{className:"drawer-head",children:[e.jsxs("h2",{className:"t-h2",style:{margin:0,fontSize:14,display:"flex",alignItems:"center",gap:9},children:[e.jsx(d,{name:"insights",size:20,color:"var(--primary)"}),"Painel de Avanço"]}),e.jsx("button",{className:"btn-icon",onClick:r,children:e.jsx(d,{name:"close",size:16})})]}),e.jsxs("div",{className:"drawer-body",children:[e.jsxs("section",{className:"ins-block",children:[e.jsxs("div",{className:"ins-title",children:[e.jsx(d,{name:"speed",size:14}),"Previsto × Realizado"]}),g.hasData?e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:10,marginBottom:8},children:[e.jsxs("span",{className:"font-sq",style:{fontSize:28,fontWeight:900,color:g.onTrackPct>=90?"var(--success)":g.onTrackPct>=60?"#EAB308":"var(--danger)"},children:[g.onTrackPct,"%"]}),e.jsx("span",{style:{fontSize:11,fontWeight:700,color:g.onTrackPct>=90?"var(--success)":g.onTrackPct>=60?"#EAB308":"var(--danger)"},children:g.onTrackPct>=90?"NO PRAZO":g.onTrackPct>=60?"ATENÇÃO":"ATRASADO"})]}),e.jsx(V,{value:g.onTrackPct,color:g.onTrackPct>=90?"var(--success)":g.onTrackPct>=60?"#EAB308":"var(--danger)",height:6})]}):e.jsx("p",{style:{fontSize:11,color:"var(--theme-text-muted)",margin:0},children:"Sem dados de prazo para esta semana."})]}),e.jsxs("section",{className:"ins-block",children:[e.jsxs("div",{className:"ins-title",children:[e.jsx(d,{name:"trending_up",size:14}),"Avanço Semanal"]}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:10},children:[e.jsxs("span",{className:"font-sq",style:{fontSize:28,fontWeight:900,color:"var(--primary)"},children:[I,"%"]}),f!=null&&e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",fontSize:12,fontWeight:800,color:f>0?"var(--success)":f<0?"var(--danger)":"var(--theme-text-muted)"},children:[e.jsx(d,{name:f>0?"arrow_upward":f<0?"arrow_downward":"remove",size:14}),f>0?"+":"",f,"% vs. semana anterior"]})]})]}),e.jsxs("section",{className:"ins-block",children:[e.jsxs("div",{className:"ins-title",children:[e.jsx(d,{name:"balance",size:14}),"Carga por Integrante"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:F.map(b=>{const N=b.ratio>100;return e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,marginBottom:4},children:[e.jsx(fe,{name:b.name,size:18,meta:b}),e.jsx("span",{style:{fontSize:12,fontWeight:700},children:b.name}),e.jsxs("span",{style:{fontSize:10,color:"var(--theme-text-muted)",marginLeft:"auto"},children:[b.w,"/",b.capacity," pts"]})]}),e.jsx(V,{value:Math.min(b.ratio,100),color:N?"var(--danger)":b.color,height:4})]},b.name)})})]}),e.jsxs("section",{className:"ins-block",children:[e.jsxs("div",{className:"ins-title",children:[e.jsx(d,{name:"category",size:14}),"Avanço por Disciplina"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:E.map(b=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.jsx("span",{style:{width:42,fontSize:10,fontWeight:700},children:e.jsx(sa,{code:b.code,meta:b})}),e.jsx("div",{style:{flex:1},children:e.jsx(V,{value:b.prog,color:b.color,height:4})}),e.jsxs("span",{className:"font-sq",style:{fontSize:10,width:40,textAlign:"right",color:"var(--theme-text-muted)"},children:[b.prog,"%"]})]},b.code))})]}),z.length>0&&e.jsxs("section",{className:"ins-block",style:{borderColor:"#fecaca",background:"#FEF2F2"},children:[e.jsxs("div",{className:"ins-title",style:{color:"var(--danger)"},children:[e.jsx(d,{name:"warning",size:14}),"Demandas Atrasadas (",z.length,")"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6},children:z.map(b=>e.jsxs("div",{style:{display:"flex",gap:7,alignItems:"center",fontSize:11},children:[e.jsx("span",{className:"chip",style:{background:j(b.project)+"1A",color:j(b.project),border:"none",flexShrink:0},children:k(b.project)}),e.jsx("span",{style:{flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:b.text}),e.jsx("span",{style:{fontSize:9.5,fontWeight:700,color:"var(--theme-text-muted)"},children:b.assignee})]},b.id))})]})]})]})})}function St({open:t,onClose:r,tasks:s,onValidate:c,onOpenTask:o,getProjColor:h,getProjCode:u,getDiscMeta:j}){if(!t)return null;const k=s.filter(f=>f.isCoordPoint),g={pending:k.filter(f=>(f.valid||"pending")==="pending"),returned:k.filter(f=>f.valid==="returned"),approved:k.filter(f=>f.valid==="approved")},I=({keyName:f,title:z,icon:F})=>g[f].length?e.jsxs("section",{className:"ins-block",children:[e.jsxs("div",{className:"ins-title",style:{color:ue[f].color},children:[e.jsx(d,{name:F,size:14}),z," (",g[f].length,")"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:g[f].map(E=>e.jsxs("div",{style:{border:"1px solid var(--theme-divider)",borderRadius:10,padding:10,borderLeft:`3px solid ${ue[f].color}`},children:[e.jsxs("div",{style:{display:"flex",gap:6,marginBottom:5,flexWrap:"wrap",alignItems:"center"},children:[e.jsx("span",{className:"chip",style:{background:h(E.project)+"1A",color:h(E.project),border:"none"},children:u(E.project)}),e.jsx(sa,{code:E.disc,meta:j(E.disc)}),e.jsx("span",{style:{fontSize:11,fontWeight:600},children:E.assignee}),e.jsx("span",{style:{fontSize:10,color:"var(--theme-text-muted)",marginLeft:"auto"},children:E.day})]}),e.jsx("p",{style:{margin:"0 0 8px",fontSize:12,lineHeight:1.4},children:E.text}),e.jsxs("div",{style:{display:"flex",gap:6},children:[f!=="approved"&&e.jsxs("button",{className:"mini-btn ok",onClick:()=>c(E.id,"approved"),children:[e.jsx(d,{name:"check",size:11}),"Aprovar"]}),f!=="returned"&&e.jsxs("button",{className:"mini-btn no",onClick:()=>c(E.id,"returned"),children:[e.jsx(d,{name:"undo",size:11}),"Devolver"]}),f!=="pending"&&e.jsxs("button",{className:"mini-btn",style:{background:"var(--theme-input)",color:"var(--theme-text)"},onClick:()=>c(E.id,"pending"),children:[e.jsx(d,{name:"schedule",size:11}),"Reabrir"]}),e.jsxs("button",{className:"mini-btn",style:{background:"var(--theme-input)",color:"var(--theme-text)",marginLeft:"auto"},onClick:()=>o(E),children:[e.jsx(d,{name:"open_in_new",size:11}),"Abrir"]})]})]},E.id))})]}):null;return e.jsx("div",{className:"overlay no-print",onClick:r,style:{justifyContent:"flex-end",padding:0},children:e.jsxs("div",{className:"drawer",onClick:f=>f.stopPropagation(),children:[e.jsxs("div",{className:"drawer-head",children:[e.jsxs("h2",{className:"t-h2",style:{margin:0,fontSize:14,display:"flex",alignItems:"center",gap:9},children:[e.jsx(d,{name:"verified",size:20,color:"#6366F1"}),"Fila de Validações"]}),e.jsx("button",{className:"btn-icon",onClick:r,children:e.jsx(d,{name:"close",size:16})})]}),e.jsxs("div",{className:"drawer-body",children:[k.length===0&&e.jsx("p",{style:{fontSize:12,color:"var(--theme-text-muted)"},children:"Sem pontos de validação pendentes."}),e.jsx(I,{keyName:"pending",title:"Aguardando aprovação",icon:"hourglass_top"}),e.jsx(I,{keyName:"returned",title:"Devolvidos para ajuste",icon:"undo"}),e.jsx(I,{keyName:"approved",title:"Aprovados",icon:"task_alt"})]})]})})}function De({value:t,color:r}){return e.jsx("div",{style:{height:7,borderRadius:99,background:"#eef0f2",overflow:"hidden",width:"100%"},children:e.jsx("div",{style:{height:"100%",width:t+"%",background:r,borderRadius:99}})})}function Ct({tasks:t,weekLabel:r,stats:s,pva:c,trend:o,scope:h,coord:u,getProjColor:j,getProjCode:k,getDiscMeta:g,getPersonMeta:I,showChecklist:f}){const z=t.filter(p=>p.isCoordPoint),F=!c||!c.hasData?"#9ca3af":c.onTrackPct>=90?"#10B981":c.onTrackPct>=60?"#EAB308":"#EF4444",E=Array.from(new Set(t.map(p=>p.project))).map(p=>({name:p,code:k(p),color:j(p)})),b=Array.from(new Set(t.map(p=>p.assignee))).map(p=>{const v=I(p);return{name:p,role:v.role||"Colaborador",color:v.color||"#94A3B8",capacity:v.capacity||10}}),N=Array.from(new Set(t.map(p=>p.disc))).map(p=>{const v=g(p);return{code:p,name:v?v.name:p,color:v?v.color:"#64748B"}});return e.jsxs("div",{className:"print-sheet",style:{padding:"0",color:"#1f2937",fontFamily:"'Inter', sans-serif"},children:[e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-end",borderBottom:"3px solid #FF6B4A",paddingBottom:10,marginBottom:16},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:900,fontSize:17,letterSpacing:"0.1em"},children:"RELATÓRIO EXECUTIVO"}),e.jsxs("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:700,fontSize:9,letterSpacing:"0.28em",color:"#6b7280",marginTop:2},children:["COORDENAÇÃO BIM · ACOMPANHAMENTO SEMANAL",h==="filtered"?" · VISÃO FILTRADA":""]})]}),e.jsxs("div",{style:{textAlign:"right"},children:[e.jsx("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:13,letterSpacing:"0.08em"},children:r}),e.jsxs("div",{style:{fontSize:10,color:"#6b7280"},children:["Gestor: ",u||"Yuri"," · Emitido ",new Date().toLocaleDateString("pt-BR")]})]})]}),e.jsxs("div",{style:{display:"flex",gap:12,marginBottom:16,breakInside:"avoid"},children:[e.jsxs("div",{style:{flex:"0 0 150px",border:"1px solid #e5e7eb",borderRadius:12,padding:"13px 15px",background:"linear-gradient(135deg,#FFF4F0,#fff)"},children:[e.jsx("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7.5,letterSpacing:"0.2em",color:"#6b7280",marginBottom:6},children:"AVANÇO PONDERADO"}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:6},children:[e.jsxs("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:900,fontSize:36,lineHeight:1,color:"#FF6B4A"},children:[s.progress,"%"]}),o!=null&&o!==0&&e.jsxs("span",{style:{fontSize:11,fontWeight:800,color:o>0?"#10B981":"#EF4444"},children:[o>0?"▲ +":"▼ ",o,"%"]})]}),e.jsx("div",{style:{margin:"8px 0 5px"},children:e.jsx(De,{value:s.progress,color:"#FF6B4A"})}),e.jsxs("div",{style:{fontSize:9.5,color:"#6b7280",fontWeight:600},children:[s.done,"/",s.total," demandas",o!=null?" · vs. sem. anterior":""]})]}),e.jsx("div",{style:{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9},children:[{label:"NO PRAZO",value:c&&c.hasData?c.onTrackPct+"%":"—",sub:"previsto × feito",color:F},{label:"PROJETOS",value:E.length,sub:"ativos",color:"#0EA5E9"},{label:"EQUIPE",value:b.filter(p=>p.name!=="Equipe").length,sub:"alocados",color:"#10B981"},{label:"VALIDAÇÕES",value:s.coordApproved+"/"+s.coordTotal,sub:s.coordPending+" pendentes",color:"#6366F1"},{label:"ATRASADAS",value:s.overdue,sub:s.overdue?"requer ação":"em dia",color:s.overdue?"#EF4444":"#10B981"},{label:"PENDENTES",value:s.total-s.done,sub:"a concluir",color:"#EAB308"}].map((p,v)=>e.jsxs("div",{style:{border:"1px solid #e5e7eb",borderRadius:11,padding:"9px 12px"},children:[e.jsx("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,letterSpacing:"0.16em",color:"#9ca3af"},children:p.label}),e.jsxs("div",{style:{display:"flex",alignItems:"baseline",gap:5,marginTop:2},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:19,color:p.color,lineHeight:1},children:p.value}),e.jsx("span",{style:{fontSize:8,color:"#6b7280"},children:p.sub})]})]},v))})]}),(()=>{const p=t.filter(x=>x.unplanned&&!x.carriedFrom),v=t.filter(x=>x.carriedFrom);return!p.length&&!v.length?null:e.jsxs("div",{style:{marginBottom:16,breakInside:"avoid",border:"1px solid #e5e7eb",borderRadius:12,overflow:"hidden"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:"#FFF7ED",borderBottom:"1px solid #fde9d3"},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9.5,letterSpacing:"0.2em"},children:"FORA DO PLANEJAMENTO INICIAL"}),e.jsxs("span",{style:{marginLeft:"auto",display:"flex",gap:12},children:[e.jsxs("span",{style:{fontSize:9,fontWeight:800,color:"#FF6B4A"},children:["● ",p.length," NOVAS"]}),e.jsxs("span",{style:{fontSize:9,fontWeight:800,color:"#B45309"},children:["● ",v.length," ADIADAS"]})]})]}),e.jsx("div",{style:{padding:"8px 12px"},children:[{tag:"NOVA",color:"#FF6B4A",arr:p},{tag:"ADIADA",color:"#B45309",arr:v}].map(({tag:x,color:w,arr:S})=>S.map(i=>e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center",padding:"3px 0",borderBottom:"1px solid #f3f4f6"},children:[e.jsxs("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,color:w,width:58,flexShrink:0},children:["● ",x,x==="ADIADA"&&i.postponedCount>1?" ×"+i.postponedCount:""]}),e.jsx("span",{style:{fontSize:7.5,fontWeight:800,color:j(i.project),width:26,flexShrink:0},children:k(i.project)}),e.jsx("span",{style:{fontSize:10,flex:1},children:i.text}),e.jsxs("span",{style:{fontSize:9,color:"#6b7280",flexShrink:0},children:[i.assignee," · ",i.day,i.carriedFrom?" · de "+i.carriedFrom:""]})]},x+i.id)))})]})})(),e.jsxs("div",{style:{display:"flex",gap:18,marginBottom:16,breakInside:"avoid"},children:[e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9.5,letterSpacing:"0.2em",marginBottom:9,display:"flex",alignItems:"center",gap:7},children:[e.jsx("span",{style:{width:12,height:3,background:"#FF6B4A",borderRadius:2}}),"POR PROJETO"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6},children:E.map(p=>{const v=t.filter(w=>w.project===p.name),x=R(v);return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7.5,color:p.color,width:26,flexShrink:0},children:p.code}),e.jsx("span",{style:{fontSize:9.5,fontWeight:600,width:92,flexShrink:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},children:p.name}),e.jsx("div",{style:{flex:1},children:e.jsx(De,{value:x,color:p.color})}),e.jsxs("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9,width:30,textAlign:"right",flexShrink:0},children:[x,"%"]})]},p.name)})})]}),e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9.5,letterSpacing:"0.2em",marginBottom:9,display:"flex",alignItems:"center",gap:7},children:[e.jsx("span",{style:{width:12,height:3,background:"#FF6B4A",borderRadius:2}}),"POR DISCIPLINA"]}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:6},children:N.map(p=>{const v=t.filter(w=>w.disc===p.code),x=R(v);return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7.5,color:p.color,width:30,flexShrink:0},children:p.code}),e.jsx("div",{style:{flex:1},children:e.jsx(De,{value:x,color:p.color})}),e.jsxs("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9,width:46,textAlign:"right",flexShrink:0},children:[v.length,"× · ",x,"%"]})]},p.code)})})]})]}),e.jsxs("div",{style:{marginBottom:16,breakInside:"avoid"},children:[e.jsxs("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9.5,letterSpacing:"0.2em",marginBottom:9,display:"flex",alignItems:"center",gap:7},children:[e.jsx("span",{style:{width:12,height:3,background:"#FF6B4A",borderRadius:2}}),"ENTREGAS E CARGA POR COLABORADOR"]}),e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:10},children:[e.jsx("thead",{children:e.jsx("tr",{style:{borderBottom:"1.5px solid #d1d5db"},children:["Colaborador","Cargo","Demandas","Carga","Validações","Avanço"].map((p,v)=>e.jsx("th",{style:{textAlign:v>1?"center":"left",padding:"5px 6px",fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,letterSpacing:"0.1em",color:"#6b7280"},children:p},v))})}),e.jsx("tbody",{children:b.map(p=>{const v=t.filter(A=>A.assignee===p.name),x=R(v),w=v.reduce((A,B)=>A+ge(B),0),S=Math.round(w/p.capacity*100),i=v.filter(A=>A.isCoordPoint),C=i.filter(A=>A.valid==="approved").length;return e.jsxs("tr",{style:{borderBottom:"1px solid #eef0f2"},children:[e.jsx("td",{style:{padding:"5px 6px"},children:e.jsxs("span",{style:{display:"inline-flex",alignItems:"center",gap:6},children:[e.jsx("span",{style:{width:16,height:16,borderRadius:"50%",background:p.color,color:"#fff",fontSize:6.5,fontWeight:800,fontFamily:"'Orbitron', sans-serif",display:"inline-flex",alignItems:"center",justifyContent:"center"},children:za(p.name)}),e.jsx("span",{style:{fontWeight:700},children:p.name})]})}),e.jsx("td",{style:{padding:"5px 6px",color:"#6b7280",fontSize:9},children:p.role}),e.jsx("td",{style:{padding:"5px 6px",textAlign:"center"},children:v.length}),e.jsxs("td",{style:{padding:"5px 6px",textAlign:"center",fontWeight:700,color:S>100?"#EF4444":S<50?"#64748B":"#10B981"},children:[w,"/",p.capacity]}),e.jsx("td",{style:{padding:"5px 6px",textAlign:"center",color:i.length?"#4F46E5":"#d1d5db",fontWeight:700},children:i.length?C+"/"+i.length:"—"}),e.jsx("td",{style:{padding:"5px 6px",width:105},children:e.jsxs("span",{style:{display:"flex",alignItems:"center",gap:6},children:[e.jsx("span",{style:{flex:1},children:e.jsx(De,{value:x,color:p.color})}),e.jsxs("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:8.5,width:26,textAlign:"right"},children:[x,"%"]})]})})]},p.name)})})]})]}),z.length>0&&e.jsxs("div",{style:{marginBottom:16,breakInside:"avoid"},children:[e.jsxs("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9.5,letterSpacing:"0.2em",marginBottom:9,display:"flex",alignItems:"center",gap:7},children:[e.jsx("span",{style:{width:12,height:3,background:"#6366F1",borderRadius:2}}),"PONTOS DE COORDENAÇÃO / VALIDAÇÃO"]}),z.map(p=>{const v=ue[p.valid||"pending"];return e.jsxs("div",{style:{display:"flex",gap:8,alignItems:"center",padding:"4px 8px",borderBottom:"1px solid #eef0f2",borderLeft:`3px solid ${v.color}`,paddingLeft:9},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,letterSpacing:"0.06em",color:v.color,width:64,flexShrink:0,textTransform:"uppercase"},children:v.label}),e.jsx("span",{style:{fontSize:7.5,fontWeight:800,color:j(p.project),width:26,flexShrink:0},children:k(p.project)}),e.jsx("span",{style:{fontSize:10,flex:1},children:p.text}),e.jsxs("span",{style:{fontSize:9,color:"#6b7280",flexShrink:0},children:[p.assignee," · ",p.day]})]},p.id)})]}),e.jsxs("div",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:9.5,letterSpacing:"0.2em",marginBottom:10,display:"flex",alignItems:"center",gap:7},children:[e.jsx("span",{style:{width:12,height:3,background:"#FF6B4A",borderRadius:2}}),"AGENDA DETALHADA DA SEMANA"]}),H.map(p=>{const v=t.filter(w=>w.day===p);if(!v.length)return null;const x=R(v);return e.jsxs("div",{style:{marginBottom:11,breakInside:"avoid"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#f3f4f6",padding:"5px 10px",borderRadius:6,marginBottom:5},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:10.5,letterSpacing:"0.22em",textTransform:"uppercase"},children:p}),e.jsxs("span",{style:{fontSize:9,fontWeight:700,color:"#6b7280"},children:[v.filter(X).length,"/",v.length," · ",x,"%"]})]}),v.map(w=>{const S=na(w),i=X(w),C=pe(w);return e.jsxs("div",{style:{display:"flex",gap:9,alignItems:"flex-start",padding:"4px 8px",borderBottom:"1px solid #eef0f2",borderLeft:`3px solid ${C?"#EF4444":j(w.project)}`,paddingLeft:10},children:[e.jsx("span",{style:{width:12,height:12,border:i?"none":"1.5px solid #6b7280",background:i?"#10B981":"transparent",borderRadius:3,flexShrink:0,marginTop:2,color:"#fff",fontSize:10,lineHeight:"12px",textAlign:"center",fontWeight:900},children:i?"✓":""}),e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{display:"flex",gap:6,marginBottom:1,flexWrap:"wrap",alignItems:"center"},children:[e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,letterSpacing:"0.08em",color:j(w.project)},children:k(w.project)}),g(w.disc)&&e.jsx("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,color:g(w.disc).color},children:w.disc}),(w.durationDays||1)>1&&e.jsxs("span",{style:{fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:7,color:"#7C3AED"},children:[w.durationDays," DIAS"]}),e.jsx("span",{style:{fontSize:8.5,fontWeight:700,color:"#374151"},children:w.assignee}),w.isCoordPoint&&e.jsx("span",{style:{fontSize:7,fontWeight:800,letterSpacing:"0.06em",color:"#4F46E5"},children:"● VALIDAÇÃO"}),w.unplanned&&!w.carriedFrom&&e.jsx("span",{style:{fontSize:7,fontWeight:800,color:"#FF6B4A"},children:"● NOVA"}),w.carriedFrom&&e.jsxs("span",{style:{fontSize:7,fontWeight:800,color:"#B45309"},children:["● ADIADA",w.postponedCount>1?" ×"+w.postponedCount:""]}),C&&e.jsx("span",{style:{fontSize:7,fontWeight:800,color:"#EF4444"},children:"● ATRASO"}),e.jsxs("span",{style:{marginLeft:"auto",fontFamily:"'Orbitron', sans-serif",fontWeight:800,fontSize:8,color:i?"#10B981":S>0?"#0EA5E9":"#9ca3af"},children:[S,"%"]})]}),e.jsx("div",{style:{fontSize:10.5,lineHeight:1.3,textDecoration:i?"line-through":"none",color:i?"#9ca3af":"#1f2937"},children:w.text}),f&&w.subtasks&&w.subtasks.length>0&&e.jsx("div",{style:{margin:"3px 0 2px",display:"flex",flexDirection:"column",gap:1},children:w.subtasks.map(A=>e.jsxs("div",{style:{display:"flex",gap:5,alignItems:"center",fontSize:9},children:[e.jsx("span",{style:{width:8,height:8,border:A.done?"none":"1px solid #9ca3af",background:A.done?"#10B981":"transparent",borderRadius:2,flexShrink:0,color:"#fff",fontSize:7,lineHeight:"8px",textAlign:"center",fontWeight:900},children:A.done?"✓":""}),e.jsx("span",{style:{color:A.done?"#9ca3af":"#4b5563",textDecoration:A.done?"line-through":"none"},children:A.text})]},A.id))})]})]},w.id)})]},p)}),e.jsxs("div",{style:{marginTop:16,paddingTop:9,borderTop:"1px solid #e5e7eb",display:"flex",justifyContent:"space-between",fontSize:8,color:"#9ca3af",fontFamily:"'Orbitron', sans-serif",letterSpacing:"0.1em"},children:[e.jsx("span",{children:"COORDENAÇÃO BIM"}),e.jsx("span",{children:"RELATÓRIO DE ACOMPANHAMENTO SEMANAL"})]})]})}function Na({label:t,value:r,children:s,inline:c=!1}){return e.jsxs("div",{className:c?"twk-row twk-row-h":"twk-row",children:[e.jsxs("div",{className:"twk-lbl",children:[e.jsx("span",{children:t}),r!=null&&e.jsx("span",{className:"twk-val",children:r})]}),s]})}function wa({label:t,value:r,onChange:s}){return e.jsxs("div",{className:"twk-row twk-row-h",children:[e.jsx("div",{className:"twk-lbl",children:e.jsx("span",{children:t})}),e.jsx("button",{type:"button",className:"twk-toggle","data-on":r?"1":"0",role:"switch","aria-checked":r,onClick:()=>s(!r),children:e.jsx("i",{})})]})}function Sa({label:t,value:r,options:s,onChange:c}){const o=y.useRef(null),h=s.length,u=Math.max(0,s.indexOf(r)),j=k=>{const g=o.current?.getBoundingClientRect();if(!g)return;const I=g.width-4,f=Math.floor((k.clientX-g.left-2)/I*h),z=s[Math.max(0,Math.min(h-1,f))];c(z)};return e.jsx(Na,{label:t,children:e.jsxs("div",{ref:o,role:"radiogroup",onPointerDown:j,className:"twk-seg",children:[e.jsx("div",{className:"twk-seg-thumb",style:{left:`calc(2px + ${u} * (100% - 4px) / ${h})`,width:`calc((100% - 4px) / ${h})`}}),s.map(k=>e.jsx("button",{type:"button",role:"radio","aria-checked":k===r,children:k},k))]})})}function zt({label:t,value:r,options:s,onChange:c}){const o=u=>String(u).toLowerCase(),h=o(r);return e.jsx(Na,{label:t,children:e.jsx("div",{className:"twk-chips",role:"radiogroup",children:s.map((u,j)=>{const k=o(u)===h,g=At(u);return e.jsx("button",{type:"button",className:"twk-chip",role:"radio","aria-checked":k,"data-on":k?"1":"0",style:{background:u},onClick:()=>c(u),children:k&&e.jsx("svg",{viewBox:"0 0 14 14","aria-hidden":"true",style:{position:"absolute",top:6,left:6,width:13,height:13},children:e.jsx("path",{d:"M3 7.2 5.8 10 11 4.2",fill:"none",strokeWidth:"2.2",strokeLinecap:"round",strokeLinejoin:"round",stroke:g?"rgba(0,0,0,.78)":"#fff"})})},j)})})})}function At(t){const r=String(t).replace("#",""),s=r.length===3?r.replace(/./g,j=>j+j):r.padEnd(6,"0"),c=parseInt(s.slice(0,6),16);if(Number.isNaN(c))return!0;const o=c>>16&255,h=c>>8&255,u=c&255;return o*299+h*587+u*114>148e3}const Nt={accent:"#FF6B4A",cardStyle:"soft",density:"comfy",projColors:!0,bgGrid:!0},Ft=`
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
`;export{Et as default};
