'use strict';
/* SEA-MCM — Protótipo local. Autenticação e permissões de produção EXIGEM backend e regras de acesso. */
const SPORTS = [
  {id:'futsal',name:'Futsal',icon:'⚽',season:'verao',group:'Esportes'},
  {id:'volei',name:'Vôlei',icon:'🏐',season:'verao',group:'Esportes'},
  {id:'basquete',name:'Basquete',icon:'🏀',season:'verao',group:'Esportes'},
  {id:'tenis-mesa',name:'Tênis de Mesa',icon:'🏓',season:'inverno',group:'Esportes'},
  {id:'xadrez',name:'Xadrez',icon:'♟️',season:'inverno',group:'Esportes'},
  {id:'fifa',name:'FIFA / EA FC',icon:'🎮',season:'inverno',group:'Jogos Eletrônicos'},
  {id:'rocket-league',name:'Rocket League',icon:'🚙',season:'inverno',group:'Jogos Eletrônicos'},
  {id:'dama',name:'Dama',icon:'⚫',season:'inverno',group:'Jogos de Mesa'},
  {id:'domino',name:'Dominó',icon:'🀄',season:'inverno',group:'Jogos de Mesa'},
  {id:'ludo',name:'Ludo',icon:'🎲',season:'inverno',group:'Jogos de Mesa'},
  {id:'uno',name:'UNO',icon:'🃏',season:'inverno',group:'Jogos de Mesa'}
];
const STORAGE='sea-mcm-data-v4';
const USERS_STORAGE='sea-mcm-users-v4';
const SESSION='sea-mcm-session-v4';
const ADMIN_EMAIL='seamcm2a@gmail.com';
const DEMO_PASSWORD='@23032026';
const $=selector=>document.querySelector(selector);
const $$=selector=>Array.from(document.querySelectorAll(selector));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const id=()=>globalThis.crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(36).slice(2));
const getSport=s=>SPORTS.find(x=>x.id===s)||SPORTS[0];
const today=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const daysFromToday=d=>{const x=new Date();x.setDate(x.getDate()+d);return [x.getFullYear(),String(x.getMonth()+1).padStart(2,'0'),String(x.getDate()).padStart(2,'0')].join('-')};
const dateBR=iso=>/^\d{4}-\d{2}-\d{2}$/.test(iso||'')?iso.split('-').reverse().join('/'):'A definir';
const matchStatus=m=>m.status==='finished'?'Finalizada':m.status==='live'?'Em andamento':(m.date&&m.date<today()?'Atrasada':'Agendada');
const matchTag=m=>m.status==='finished'?'done':m.status==='live'?'live':m.date&&m.date<today()?'late':'scheduled';
const badgeStatus=c=>c.status==='Em andamento'?'active':c.status==='Concluído'?'done':'';
let db=loadData();
const state={user:null,mode:'public',page:'inicio',sport:null,comp:null,tab:'equipes',selectedStanding:null,authEmail:'',query:'',googleAuth:null};
let toastTimer;
function safeRead(key){try{return localStorage.getItem(key)}catch{return null}}
function migrate(items){
 if(!Array.isArray(items))return [];
 return items.filter(c=>c&&typeof c==='object').map(c=>{
   const sport = SPORTS.find(s=>s.id===c.sport||s.name===c.modalidade|| (c.modalidade==='FIFA'&&s.id==='fifa'))?.id||'futsal';
   return {id:String(c.id||id()),name:String(c.name||c.nome||'Campeonato'),sport,season:getSport(sport).season,format:c.format==='mata-mata'?'mata-mata':'liga',date:c.date||c.data||'',status:c.status||'Planejado',championId:c.championId||null,byes:Array.isArray(c.byes)?c.byes:[],teams:(Array.isArray(c.teams)?c.teams:[]).map(t=>({id:String(t.id||id()),name:String(t.name||t.nome||'Equipe'),className:String(t.className||''),captain:String(t.captain||''),players:Array.isArray(t.players)?t.players:[],notes:String(t.notes||'')})),matches:(Array.isArray(c.matches)?c.matches:[]).map(m=>({id:String(m.id||id()),round:Number(m.round)||1,teamA:String(m.teamA||m.a||''),teamB:String(m.teamB||m.b||''),date:m.date||'',time:m.time||'',scoreA:Number.isInteger(m.scoreA)?m.scoreA:(m.sa!=null?Number(m.sa):null),scoreB:Number.isInteger(m.scoreB)?m.scoreB:(m.sb!=null?Number(m.sb):null),status:m.status||(m.sa!=null&&m.sb!=null?'finished':'scheduled')}))};
 });
}
function loadData(){
 for(const key of [STORAGE,'sea-mcm-campeonatos-v3','sea-mcm-campeonatos-v2','sea-mcm-campeonatos-v1']){
   try{const raw=safeRead(key);if(raw){const list=migrate(JSON.parse(raw));return list}}catch{}
 }
 return [];
}
function save(){try{localStorage.setItem(STORAGE,JSON.stringify(db));return true}catch{notify('Erro ao salvar os dados deste navegador. Exporte um backup.',true);return false}}
function users(){try{return JSON.parse(safeRead(USERS_STORAGE)||'[]')}catch{return []}}
function saveUsers(list){try{localStorage.setItem(USERS_STORAGE,JSON.stringify(list));return true}catch{return false}}
async function passwordHash(email,passwd){
 const plain='SEA-MCM-TEST:'+email+':'+passwd;
 if(globalThis.crypto?.subtle){const arr=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(plain)));return [...arr].map(x=>x.toString(16).padStart(2,'0')).join('')}
 // Fallback de compatibilidade file://; nunca tratar como segurança de verdade.
 let h=2166136261;for(const ch of plain){h=Math.imul(h^ch.charCodeAt(0),16777619)}return 'demo-'+(h>>>0).toString(16);
}
function isAdmin(){return state.user?.role==='admin'}
function canEdit(){return isAdmin()&&state.mode==='admin'}
function getComp(){return db.find(c=>c.id===state.comp)||null}
function getTeamName(c,teamId){return c.teams.find(t=>t.id===teamId)?.name||'Equipe removida'}
function notify(message,error=false){const e=$('#toast');e.textContent=message;e.className='toast'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.add('is-hidden'),4400)}
function message(title,desc){$('#message-title').textContent=title;$('#message-text').textContent=desc;$('#message-dialog').showModal()}
function authError(msg){$('#auth-error').textContent=msg;$('#auth-error').classList.remove('is-hidden')}
function resetAuthError(){$('#auth-error').classList.add('is-hidden');$('#auth-error').textContent=''}
function authStep(step){$('#auth-start').classList.toggle('is-hidden',step!=='start');$('#auth-password-step').classList.toggle('is-hidden',step!=='password');$('#auth-signup-step').classList.toggle('is-hidden',step!=='signup');resetAuthError()}
function beginSession(email,name,role,provider='local'){
 state.user={email,name,role,provider};state.mode=role==='admin'?'admin':'public';state.page='inicio';state.sport=null;state.comp=null;
 try{sessionStorage.setItem(SESSION,JSON.stringify(state.user))}catch{}
 $('#auth').classList.add('is-hidden');$('#app').classList.remove('is-hidden');render();
}
function restoreSession(){try{const s=JSON.parse(sessionStorage.getItem(SESSION)||'null');if(s&&['public','admin'].includes(s.role)&&typeof s.name==='string'){beginSession(s.email,s.name,s.role,s.provider);return true}}catch{}return false}
function logout(){if(!confirm('Deseja sair do SEA-MCM?'))return;try{sessionStorage.removeItem(SESSION)}catch{}if(state.googleAuth)state.googleAuth.signOut().catch(()=>{});state.user=null;state.mode='public';state.page='inicio';state.comp=null;$('#app').classList.add('is-hidden');$('#auth').classList.remove('is-hidden');authStep('start');$('#auth-email-form').reset();$('#auth-password-form').reset();$('#auth-signup-form').reset()}
async function loginByEmail(){
 const email=state.authEmail;const pwd=$('#auth-password').value;
 if(email===ADMIN_EMAIL){if(pwd!==DEMO_PASSWORD){authError('Senha de demonstração incorreta. Verifique a dica abaixo.');return}beginSession(email,'Organização SEA-MCM','admin');return}
 const account=users().find(u=>u.email===email);
 if(!account){authError('Esta conta não foi encontrada neste navegador.');return}
 if(await passwordHash(email,pwd)!==account.hash){authError('Senha de teste incorreta.');return}
 beginSession(email,account.name,'public');
}
let firebaseInit;
async function googleLogin(){
 const cfg=window.SEA_FIREBASE_CONFIG;
 if(!cfg?.apiKey||!cfg?.authDomain){message('Login Google ainda não configurado','Esta é uma versão local. Para habilitar o botão Google com autenticação real, consulte CONFIGURAR_GOOGLE.md e configure seu projeto Firebase. Enquanto isso, use o visitante ou o acesso administrativo de teste.');return}
 if(location.protocol==='file:'){message('Abra por localhost','Para autenticação Google use INICIAR_SERVIDOR_LOCAL.bat ou o Live Server do VS Code. Não é possível realizar OAuth com file://.');return}
 try{
   if(!firebaseInit)firebaseInit=(async()=>{
     await loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
     await loadScript('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js');
     if(!firebase.apps.length)firebase.initializeApp(cfg);
     return firebase.auth();
   })();
   const auth=await firebaseInit;
   const user=(await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())).user;
   if(!user?.email||!user.emailVerified)throw Error('A conta Google não forneceu um e-mail verificado.');
   const email=user.email.toLowerCase();state.googleAuth=auth;
   beginSession(email,user.displayName||email.split('@')[0],email===ADMIN_EMAIL?'admin':'public','google');
 }catch(err){message('Não foi possível entrar com Google',err.message||'Revise as configurações do Firebase, os domínios autorizados e sua conexão à internet.')}
}
function loadScript(url){return new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src=url;tag.onload=resolve;tag.onerror=()=>reject(Error('Não foi possível carregar o Firebase.'));document.head.append(tag)})}
function navigate(page){
 if(page==='administracao'&&!canEdit()){notify('Área restrita ao organizador nesta demonstração.',true);return}
 state.page=page;state.comp=null;state.tab='equipes';render();window.scrollTo(0,0);
}
function openSport(sport){state.sport=sport;state.page='sport';state.comp=null;render();window.scrollTo(0,0)}
function openComp(id){const c=db.find(x=>x.id===id);if(!c)return;state.comp=c.id;state.sport=c.sport;state.page='competition';state.tab='equipes';render();window.scrollTo(0,0)}
function setTab(tab){state.tab=tab;render()}
const header=(title,subtitle,icon='🏆',tone='')=>`<section class="hero ${tone}"><div><div class="overline gold-text">SEA-MCM · 2026</div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="hero-icon" aria-hidden="true">${icon}</div></section>`;
function title(text,meta=''){return `<h2 class="section-title">${text}${meta?` <small>${esc(meta)}</small>`:''}</h2>`}
function stats(cards){return `<div class="stat-grid">${cards.map(([label,n,desc])=>`<article class="stat-card"><small>${esc(label)}</small><strong>${esc(n)}</strong><span>${esc(desc||'')}</span></article>`).join('')}</div>`}
function empty(head,desc,action=''){return `<div class="empty"><div class="empty-icon">🏆</div><b>${esc(head)}</b><p>${esc(desc)}</p>${action}</div>`}
const btn=(act,label,css='primary',attrs='')=>`<button type="button" class="btn ${css}" data-action="${act}" ${attrs}>${label}</button>`;
function sportTile(s){
 const comps=db.filter(c=>c.sport===s.id);
 const teams=comps.reduce((n,c)=>n+c.teams.length,0);
 return `<button class="tile" type="button" data-sport="${s.id}"><span class="tile-icon">${s.icon}</span><span class="tile-arrow">›</span><b>${esc(s.name)}</b><small>♙ ${teams} equipe${teams===1?'':'s'} · ${comps.length} campeonato${comps.length===1?'':'s'}</small></button>`;
}
function seasonScreen(season){
 const winter=season==='inverno';const list=SPORTS.filter(x=>x.season===season);
 const groups=[...new Set(list.map(x=>x.group))];
 return header(winter?'Jogos de Inverno':'Jogos de Verão',winter?'Xadrez, tênis de mesa, jogos eletrônicos e jogos de mesa.':'Futsal, vôlei, basquete e as emoções das quadras.',winter?'❄️':'☀️',winter?'indigo':'gold')+
 groups.map(g=>title((g==='Esportes'?'♟️ ':g==='Jogos Eletrônicos'?'🎮 ':'🎲 ')+esc(g))+`<div class="tiles">${list.filter(x=>x.group===g).map(sportTile).join('')}</div>`).join('');
}
function competitionCard(c){
 const sport=getSport(c.sport);const done=c.matches.filter(m=>m.status==='finished').length;
 return `<article class="competition-card"><div><span class="tag ${badgeStatus(c)}">${esc(c.status)}</span><h3>${sport.icon} ${esc(c.name)}</h3><small>${esc(sport.name)} · ${dateBR(c.date)} · ${c.teams.length} equipes · ${done}/${c.matches.length} jogos</small></div><div class="competition-actions"><button class="btn secondary small" data-action="open-comp" data-id="${esc(c.id)}">Abrir</button>${canEdit()?`<button class="btn secondary small" data-action="edit-comp" data-id="${esc(c.id)}">Editar</button>`:''}</div></article>`;
}
function seasonSummary(){
 const teams=db.reduce((sum,c)=>sum+c.teams.length,0),matches=db.reduce((sum,c)=>sum+c.matches.length,0),done=db.reduce((sum,c)=>sum+c.matches.filter(m=>m.status==='finished').length,0);
 return stats([['Campeonatos',db.length,'cadastrados'],['Equipes',teams,'inscrições'],['Partidas',matches,'confrontos'],['Finalizadas',done,'resultados']]);
}
function homeScreen(){
 const recent=[...db].reverse().slice(0,3);
 return `<section class="hero dark"><div><div class="overline gold-text">TEMPORADA 2026 · SEA-MCM</div><h1>Os jogos começam aqui.</h1><p>Acompanhe equipes, confrontos e resultados da Sociedade Esportiva e Acadêmica.</p><div style="margin-top:16px">${canEdit()?btn('new-comp','+ Criar campeonato','gold-btn'):btn('go-verao','Explorar modalidades','gold-btn')}</div></div><img src="assets/escudo-sea-mcm.jpeg" alt="Escudo SEA-MCM" class="crest"></section>`+
 seasonSummary()+ title('Explore as competições')+
 `<div class="card-grid"><button class="feature-card" data-page="verao"><span class="bubble">☀️</span><span><b>Jogos de Verão</b><small>Futsal, vôlei e basquete</small></span><span class="arrow">→</span></button><button class="feature-card" data-page="inverno"><span class="bubble">❄️</span><span><b>Jogos de Inverno</b><small>Esportes, eletrônicos e jogos de mesa</small></span><span class="arrow">→</span></button></div>`+
 `<div class="row-heading" style="margin-top:24px">${title('Campeonatos recentes')}<button class="inline-nav" data-page="administracao" ${canEdit()?'':'hidden'}>Gerenciar modalidades →</button></div>`+
 (recent.length?`<div class="list-stack">${recent.map(competitionCard).join('')}</div>`:empty('Nenhum campeonato cadastrado','Entre como organizador e crie seu primeiro campeonato. O público poderá acompanhar os resultados neste navegador.'));
}
function sportScreen(){
 const sport=getSport(state.sport),comps=db.filter(c=>c.sport===sport.id);
 return `<button class="breadcrumbs" data-page="${sport.season}">← Voltar para Jogos de ${sport.season==='verao'?'Verão':'Inverno'}</button>`+
 header(sport.name,`${sport.season==='verao'?'☀️ Verão':'❄️ Inverno'} · ${sport.group}`,sport.icon,sport.season==='inverno'?'indigo':'')+
 `<div class="row-heading">${title('Campeonatos da modalidade')}${canEdit()?btn('new-comp','+ Novo campeonato','primary',`data-sport="${sport.id}"`):''}</div>`+
 (comps.length?`<div class="competition-grid" style="margin-top:15px">${comps.map(competitionCard).join('')}</div>`:empty('Sem campeonatos nesta modalidade','A organização ainda não cadastrou competições aqui.'));
}
function teamRow(c,t){
 const players=(t.players||[]).filter(Boolean);
 return `<article class="team-entry"><div><h3>👥 ${esc(t.name)}</h3><p>Turma: ${esc(t.className||'Não informada')} · Capitão: ${esc(t.captain||'Não informado')} · ${players.length} jogador(es)</p>${players.length?`<div class="chip-row" style="margin-top:9px">${players.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div>`:''}${t.notes?`<p style="margin-top:8px">${esc(t.notes)}</p>`:''}</div>${canEdit()?`<div class="competition-actions"><button class="btn secondary small" data-action="edit-team" data-id="${esc(t.id)}">Editar</button><button class="btn danger small" data-action="delete-team" data-id="${esc(t.id)}">Excluir</button></div>`:''}</article>`;
}
function matchItem(c,m){
 const names=[getTeamName(c,m.teamA),getTeamName(c,m.teamB)];
 const score=m.status==='finished'||m.status==='live'?`${m.scoreA??'–'} : ${m.scoreB??'–'}`:'×';
 return `<article class="match-card"><div class="match-main"><div class="match-league">${esc(c.name)} · Rodada ${Number(m.round)||1}</div><div class="match-display"><div class="team-left">${esc(names[0])}</div><div class="score">${esc(score)}</div><div class="team-right">${esc(names[1])}</div></div><div class="match-meta">${dateBR(m.date)}${m.time?' · '+esc(m.time):''}</div></div><div class="match-side"><span class="tag ${matchTag(m)}">${matchStatus(m)}</span>${canEdit()?`<div class="competition-actions"><button class="btn secondary small" data-action="edit-match" data-id="${esc(m.id)}">Corrigir</button><button class="btn danger small" data-action="delete-match" data-id="${esc(m.id)}">Excluir</button></div>`:''}</div></article>`;
}
function tableFor(c){
 const rows=SeaLogic.standings(c.teams,c.matches);
 if(!rows.length)return empty('Sem classificação','Cadastre equipes e registre resultados para visualizar a tabela.');
 return `<div class="table-wrap"><table><thead><tr><th>Pos.</th><th>Equipe</th><th>P</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>GP</th></tr></thead><tbody>${rows.map((r,i)=>`<tr><td class="medal">${i+1}º</td><td class="bold-td">${esc(r.name)}</td><td><b>${r.p}</b></td><td>${r.j}</td><td>${r.v}</td><td>${r.e}</td><td>${r.d}</td><td>${r.sg}</td><td>${r.gf}</td></tr>`).join('')}</tbody></table></div><p class="hint">Critérios: pontos (3 por vitória), vitórias, saldo e gols/pontos pró. Confirme o regulamento oficial da modalidade antes de utilizar em competição real.</p>`;
}
function bracketFor(c){
 if(c.format!=='mata-mata')return empty('Formato de pontos corridos','A visualização de chaveamento está disponível para campeonatos eliminatórios.');
 if(!c.matches.length)return empty('Chaveamento ainda não gerado','Cadastre pelo menos duas equipes e clique em “Gerar confrontos”.');
 const rounds=[...new Set(c.matches.map(m=>Number(m.round)||1))].sort((a,b)=>a-b);
 return `<div class="bracket">${rounds.map(round=>`<div class="bracket-round"><h4>FASE ${round}</h4>${c.matches.filter(m=>Number(m.round)===round).map(m=>`<div class="bracket-entry"><div><span>${esc(getTeamName(c,m.teamA))}</span><b>${m.status==='finished'?m.scoreA:'–'}</b></div><div><span>${esc(getTeamName(c,m.teamB))}</span><b>${m.status==='finished'?m.scoreB:'–'}</b></div><small class="tag ${matchTag(m)}">${matchStatus(m)}</small></div>`).join('')}${(c.byes||[]).filter(b=>b.round===round).map(b=>`<div class="bracket-entry"><div>→ ${esc(getTeamName(c,b.teamId))}</div><small>Avança automaticamente</small></div>`).join('')}</div>`).join('')}</div>`;
}
function competitionScreen(){
 const c=getComp();if(!c)return empty('Campeonato não encontrado','Volte à página de modalidades.');
 const sport=getSport(c.sport);const finished=c.matches.filter(m=>m.status==='finished').length;
 const champion=c.championId?getTeamName(c,c.championId):null;
 let body='';
 if(state.tab==='equipes')body=`<div class="row-heading">${title('Equipes participantes')}${canEdit()?btn('new-team','+ Nova equipe'):''}</div>`+(c.teams.length?`<div class="list-stack" style="margin-top:14px">${c.teams.map(t=>teamRow(c,t)).join('')}</div>`:empty('Nenhuma equipe cadastrada','Cadastre as equipes, turmas, capitães e jogadores para começar.'));
 if(state.tab==='partidas')body=`<div class="row-heading">${title('Partidas e resultados')}<div>${canEdit()?btn('new-match','+ Partida','secondary')+' '+btn('generate','Gerar confrontos','primary'):''}</div></div>`+(c.matches.length?`<div class="list-stack" style="margin-top:14px">${[...c.matches].sort((a,b)=>(a.round||1)-(b.round||1)||(a.date||'').localeCompare(b.date||'')).map(m=>matchItem(c,m)).join('')}</div>`:empty('Nenhuma partida registrada','Gere automaticamente os confrontos ou adicione uma partida manualmente.'));
 if(state.tab==='classificacao')body=title('Classificação')+tableFor(c);
 if(state.tab==='chaveamento')body=`<div class="row-heading">${title('Chaveamento')}${canEdit()&&c.format==='mata-mata'?btn('advance','Avançar fase','secondary'):''}</div>`+bracketFor(c);
 return `<button class="breadcrumbs" data-sport="${sport.id}">← Voltar para ${esc(sport.name)}</button>`+
 header(c.name,`${sport.name} · ${dateBR(c.date)} · ${c.format==='mata-mata'?'Eliminatória':'Pontos corridos'}`,sport.icon)+
 `${champion?`<div class="winner-box">🏆 Campeão: ${esc(champion)}</div>`:''}`+
 stats([['Equipes',c.teams.length,'inscritas'],['Finalizadas',finished,'partidas'],['Pendentes',c.matches.length-finished,'partidas'],['Situação',c.status,'do campeonato']])+
 `${canEdit()?`<div class="line-actions"><div class="chip-row">${btn('edit-comp','Editar campeonato','secondary',`data-id="${esc(c.id)}"`)} ${btn('reset-results','Zerar resultados','danger')} ${btn('delete-comp','Excluir campeonato','danger',`data-id="${esc(c.id)}"`)}</div>${btn('choose-champion','Definir campeão','gold-btn')}</div>`:''}`+
 `<div class="tabs">${[['equipes','♙ Equipes'],['partidas','▣ Partidas'],['classificacao','▤ Classificação'],['chaveamento','🏆 Chaveamento']].map(([v,label])=>`<button class="tab ${state.tab===v?'active':''}" data-tab="${v}">${label}</button>`).join('')}</div>`+body;
}

/* Continuação 2.0.1 — inicialização, páginas e ações (corrige splash permanente). */
function statusCount(status){return db.flatMap(c=>c.matches).filter(m=>m.status===status).length}
function allMatchRecords(){return db.flatMap(c=>c.matches.map(m=>({...m,competition:c})))}
function matchesScreen(){
 const list=allMatchRecords();
 return header('Partidas','Calendário, confrontos e resultados de todas as modalidades.','▣')+
 `<div class="row-heading">${title('Calendário de jogos',`${list.length} partida(s)`)}</div>`+
 (list.length?`<div class="list-stack">${list.sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')).map(m=>matchItem(m.competition,m)).join('')}</div>`:empty('Nenhuma partida agendada','O organizador poderá criar confrontos em cada campeonato.'));
}
function classificationScreen(){
 const options=db.map(c=>`<option value="${esc(c.id)}" ${state.selectedStanding===c.id?'selected':''}>${esc(c.name)} — ${esc(getSport(c.sport).name)}</option>`).join('');
 if(!state.selectedStanding||!db.some(c=>c.id===state.selectedStanding))state.selectedStanding=db[0]?.id||null;
 const c=db.find(x=>x.id===state.selectedStanding);
 return header('Classificação','Resultados e posições atualizados após cada placar registrado.','▤')+
 (c?`<div class="panel"><label>Escolha o campeonato<select id="standings-select">${db.map(x=>`<option value="${esc(x.id)}" ${c.id===x.id?'selected':''}>${esc(x.name)} · ${esc(getSport(x.sport).name)}</option>`).join('')}</select></label></div>${tableFor(c)}`:empty('Sem classificação','Cadastre um campeonato e suas equipes para consultar a tabela.'));
}
function statisticsScreen(){
 const records=allMatchRecords();const finished=records.filter(m=>m.status==='finished');
 const sports=SPORTS.map(s=>({sport:s,comps:db.filter(c=>c.sport===s.id)})).filter(x=>x.comps.length);
 return header('Estatísticas','Resumo das competições cadastradas neste navegador.','◫')+
 seasonSummary()+title('Por modalidade')+
 (sports.length?`<div class="tiles">${sports.map(x=>`<button class="tile" data-sport="${x.sport.id}"><span class="tile-icon">${x.sport.icon}</span><b>${esc(x.sport.name)}</b><small>${x.comps.length} campeonato(s) · ${x.comps.reduce((n,c)=>n+c.teams.length,0)} equipes</small></button>`).join('')}</div>`:empty('Ainda sem estatísticas','Adicione campeonatos e registre resultados.'))+
 `<p class="hint">${finished.length} partidas finalizadas · ${records.length-finished.length} não finalizadas.</p>`;
}
function teamsScreen(){
 const all=db.flatMap(c=>c.teams.map(t=>({t,c})));
 return header('Equipes','Consulte os participantes por campeonato e modalidade.','♙')+
 (all.length?`<div class="list-stack">${all.map(({t,c})=>`<article class="team-entry"><div><h3>${esc(t.name)}</h3><p>${esc(t.className||'Turma não informada')} · ${esc(c.name)} · ${esc(getSport(c.sport).name)}</p><small>${(t.players||[]).length} jogador(es)</small></div><button class="btn secondary small" data-action="open-comp" data-id="${esc(c.id)}">Ver campeonato</button></article>`).join('')}</div>`:empty('Nenhuma equipe cadastrada','Crie um campeonato, abra-o e cadastre uma equipe.'));
}
function operationScreen(){
 const all=allMatchRecords();let live=all.filter(m=>m.status==='live'),upcoming=all.filter(m=>m.status==='scheduled'&&(!m.date||m.date>=today())),late=all.filter(m=>m.status==='scheduled'&&m.date&&m.date<today()),done=all.filter(m=>m.status==='finished');
 const section=(name,arr,desc)=>`<div class="row-heading">${title(name,`${arr.length}`)}</div>`+(arr.length?`<div class="list-stack">${arr.map(m=>matchItem(m.competition,m)).join('')}</div>`:empty(desc,'Não há partidas nessa situação.'));
 return header('Operação do Dia','Acompanhe partidas em andamento, próximas, atrasadas e finalizadas.','◷','dark')+section('🔴 Acontecendo agora',live,'Nenhuma partida em andamento')+section('🔵 Próximas partidas',upcoming,'Nenhuma partida agendada')+section('🟠 Atrasadas',late,'Nenhuma partida atrasada')+section('🟢 Finalizadas',done,'Nenhuma partida finalizada');
}
function searchScreen(){
 const q=state.query.toLocaleLowerCase('pt-BR');
 const comps=db.filter(c=>(c.name+' '+getSport(c.sport).name).toLocaleLowerCase('pt-BR').includes(q));
 const teams=db.flatMap(c=>c.teams.filter(t=>(t.name+' '+t.className+' '+t.captain).toLocaleLowerCase('pt-BR').includes(q)).map(t=>({t,c})));
 return header('Pesquisa','Localize campeonatos, turmas e equipes.','⌕')+
 `<label class="search-label">Buscar<input id="global-search" type="search" autocomplete="off" placeholder="Campeonato, equipe ou turma" value="${esc(state.query)}"></label>`+
 title('Campeonatos')+(comps.length?`<div class="list-stack">${comps.map(competitionCard).join('')}</div>`:empty('Nenhum campeonato encontrado','Tente outro termo.'))+
 title('Equipes')+(teams.length?`<div class="list-stack">${teams.map(({t,c})=>`<article class="team-entry"><div><b>${esc(t.name)}</b><p>${esc(c.name)} · ${esc(t.className)}</p></div><button class="btn secondary small" data-action="open-comp" data-id="${esc(c.id)}">Abrir</button></article>`).join('')}</div>`:empty('Nenhuma equipe encontrada','Tente outro termo.'));
}
function adminScreen(){
 if(!canEdit())return empty('Área restrita','Entre como organizador para gerenciar as modalidades.');
 return header('Painel do Organizador','Gerencie equipes, confrontos, classificação e campeões.','⚙','dark')+
 `<div class="panel">Selecione uma modalidade para acessar sua área de gestão. Os dados são salvos localmente neste navegador.</div>`+
 title('Modalidades')+`<div class="tiles">${SPORTS.map(sportTile).join('')}</div>`+
 `<div class="row-heading">${title('Campeonatos cadastrados')}${btn('new-comp','+ Criar campeonato')}</div>`+
 (db.length?`<div class="list-stack">${db.map(competitionCard).join('')}</div>`:empty('Nenhum campeonato','Crie uma competição para começar.'))+
 `<div class="panel info"><h3>Backup de dados</h3><p>Exporte um arquivo JSON para preservar os campeonatos deste navegador.</p>${btn('export-data','Exportar backup JSON','secondary')} <label class="import-label">Importar backup JSON <input type="file" accept="application/json,.json" id="import-data"></label></div>`;
}
function render(){
 if(!state.user)return;
 const screens={inicio:homeScreen,verao:()=>seasonScreen('verao'),inverno:()=>seasonScreen('inverno'),partidas:matchesScreen,classificacao:classificationScreen,estatisticas:statisticsScreen,equipes:teamsScreen,operacao:operationScreen,pesquisa:searchScreen,administracao:adminScreen,sport:sportScreen,competition:competitionScreen};
 $('#content').innerHTML=(screens[state.page]||homeScreen)();
 $$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.page===state.page));
 $$('.admin-control').forEach(e=>e.classList.toggle('is-hidden',!canEdit()));
 $('#account-name').textContent=state.user.name;
 $('#account-role').textContent=state.mode==='admin'?'Organizador':state.user.role==='admin'?'Modo público':'Público';
 $('#account-avatar').textContent=state.user.name[0]?.toUpperCase()||'V';
 $('#context-label').textContent=canEdit()?'PAINEL ADMINISTRATIVO · TEMPORADA 2026':'PORTAL PÚBLICO · TEMPORADA 2026';
 $('#switch-mode').classList.toggle('is-hidden',!isAdmin());
 $('#switch-mode').textContent=canEdit()?'Visão pública':'Visão administrativa';
}
function ensureAdmin(){if(!canEdit()){notify('Ação exclusiva do organizador.',true);return false}return true}
function showDialog(selector){const el=$(selector);if(el&&!el.open)el.showModal()}
function openCompForm(champ=null,sport=null){
 if(!ensureAdmin())return;
 const f=$('#comp-form');f.reset();f.elements.id.value=champ?.id||'';
 const select=f.elements.sport;select.replaceChildren(...SPORTS.map(s=>new Option(s.name,s.id)));
 select.value=champ?.sport||sport||state.sport||'futsal';
 f.elements.name.value=champ?.name||'';f.elements.format.value=champ?.format||'liga';
 f.elements.date.value=champ?.date||today();f.elements.status.value=champ?.status||'Planejado';
 $('#comp-form-title').textContent=champ?'Editar campeonato':'Novo campeonato';showDialog('#comp-dialog');
}
function playerInputs(players=[]){
 const root=$('#player-inputs');root.replaceChildren();
 (players.length?players:['']).forEach(player=>addPlayerInput(player));
}
function addPlayerInput(name=''){
 const wrap=document.createElement('div');wrap.className='player-row';
 const field=document.createElement('input');field.type='text';field.maxLength=80;field.className='player-name';field.placeholder='Nome do jogador';field.value=name;
 const remove=document.createElement('button');remove.type='button';remove.className='btn secondary small';remove.textContent='−';remove.title='Remover jogador';remove.addEventListener('click',()=>wrap.remove());
 wrap.append(field,remove);$('#player-inputs').append(wrap);
}
function openTeamForm(t=null){
 if(!ensureAdmin())return;const c=getComp();if(!c){notify('Selecione um campeonato.',true);return}
 const f=$('#team-form');f.reset();f.elements.id.value=t?.id||'';f.elements.name.value=t?.name||'';f.elements.className.value=t?.className||'';f.elements.captain.value=t?.captain||'';f.elements.notes.value=t?.notes||'';
 playerInputs(t?.players||[]);$('#team-form-title').textContent=t?'Editar equipe':'Nova equipe';showDialog('#team-dialog');
}
function openMatchForm(m=null){
 if(!ensureAdmin())return;const c=getComp();if(!c)return;
 if(c.teams.length<2){message('Cadastre equipes','Adicione pelo menos duas equipes antes de registrar uma partida.');return}
 const f=$('#match-form');f.reset();f.elements.id.value=m?.id||'';
 for(const key of ['teamA','teamB'])f.elements[key].replaceChildren(...c.teams.map(t=>new Option(t.name,t.id)));
 f.elements.teamA.value=m?.teamA||c.teams[0].id;
 f.elements.teamB.value=m?.teamB||c.teams[1].id;
 f.elements.date.value=m?.date||today();f.elements.time.value=m?.time||'';
 f.elements.status.value=m?.status||'scheduled';
 f.elements.scoreA.value=m?.scoreA??'';f.elements.scoreB.value=m?.scoreB??'';
 $('#match-form-title').textContent=m?'Corrigir partida':'Nova partida';syncScoreVisibility();showDialog('#match-dialog');
}
function syncScoreVisibility(){const scoring=$('#match-form').elements.status.value!=='scheduled';$('#score-grid').classList.toggle('is-hidden',!scoring)}
function updateAndStay(msg){if(!save())return;render();notify(msg)}
function generateMatches(){
 if(!ensureAdmin())return;const c=getComp();if(!c)return;
 if(c.teams.length<2){message('São necessárias duas equipes','Cadastre pelo menos duas equipes para gerar os confrontos.');return}
 if(c.matches.length&&!confirm('Já existem partidas. Substituir a tabela de jogos atual?'))return;
 let pairs,byes=[];
 if(c.format==='mata-mata'){const fixture=SeaLogic.eliminationPairs(c.teams.map(t=>t.id));pairs=fixture.matches;byes=fixture.byes}else pairs=SeaLogic.roundRobin(c.teams.map(t=>t.id));
 c.matches=pairs.map(x=>({id:id(),...x,date:c.date||today(),time:'',scoreA:null,scoreB:null,status:'scheduled'}));c.byes=byes;c.championId=null;
 state.tab='partidas';updateAndStay(`${c.matches.length} confronto(s) criado(s).`);
}
function advanceRound(){
 if(!ensureAdmin())return;const c=getComp();if(!c||c.format!=='mata-mata')return;
 const round=Math.max(1,...c.matches.map(m=>Number(m.round)||1));const games=c.matches.filter(m=>m.round===round);const winners=SeaLogic.winners(games);
 if(!winners){message('Resultados pendentes','Finalize todas as partidas da fase sem empates antes de avançar.');return}
 const all=[...winners,...c.byes.filter(b=>b.round===round).map(b=>b.teamId)];
 if(all.length<=1){c.championId=all[0]||null;updateAndStay('Campeão definido!');return}
 if(c.matches.some(m=>m.round===round+1)){message('Fase já gerada','A próxima fase já está cadastrada.');return}
 const next=SeaLogic.eliminationPairs(all,round+1);
 c.matches.push(...next.matches.map(m=>({...m,id:id(),date:'',time:'',scoreA:null,scoreB:null,status:'scheduled'})));
 c.byes.push(...next.byes);updateAndStay('Próxima fase gerada!');
}
function getActiveRecord(){return getComp()}
function handleAction(e){
 const button=e.target.closest('[data-action],[data-page],[data-sport],[data-tab],[data-close]');if(!button)return;
 const {action,page,sport,tab,close,id:targetId}=button.dataset;
 if(close){$('#'+close)?.close();return}
 if(page){navigate(page);return}
 if(sport && !action){openSport(sport);return}
 if(tab){setTab(tab);return}
 const c=getComp();
 switch(action){
 case 'logout':logout();break;
 case 'toggle-mode':if(isAdmin()){state.mode=canEdit()?'public':'admin';navigate('inicio')}break;
 case 'auth-back':authStep('start');break;
 case 'go-verao':navigate('verao');break;
 case 'open-comp':openComp(targetId);break;
 case 'new-comp':openCompForm(null,button.dataset.sport);break;
 case 'edit-comp':openCompForm(db.find(x=>x.id===targetId)||c);break;
 case 'delete-comp':if(ensureAdmin()&&confirm('Excluir campeonato, equipes e partidas permanentemente neste navegador?')){db=db.filter(x=>x.id!==targetId);navigate('administracao');updateAndStay('Campeonato excluído.')}break;
 case 'new-team':openTeamForm();break;
 case 'edit-team':if(c)openTeamForm(c.teams.find(t=>t.id===targetId));break;
 case 'delete-team':if(ensureAdmin()&&c){if(c.matches.some(m=>m.teamA===targetId||m.teamB===targetId)){message('Não foi possível excluir','Exclua as partidas da equipe antes.');return}if(confirm('Excluir esta equipe?')){c.teams=c.teams.filter(t=>t.id!==targetId);updateAndStay('Equipe excluída.')}}break;
 case 'new-match':openMatchForm();break;
 case 'edit-match':if(c)openMatchForm(c.matches.find(m=>m.id===targetId));break;
 case 'delete-match':if(ensureAdmin()&&c&&confirm('Excluir esta partida?')){c.matches=c.matches.filter(m=>m.id!==targetId);updateAndStay('Partida excluída.')}break;
 case 'generate':generateMatches();break;
 case 'advance':advanceRound();break;
 case 'reset-results':if(ensureAdmin()&&c&&confirm('Zerar todos os placares deste campeonato?')){c.matches.forEach(m=>{m.status='scheduled';m.scoreA=null;m.scoreB=null});c.championId=null;updateAndStay('Resultados zerados.')}break;
 case 'choose-champion':if(ensureAdmin()&&c){if(!c.teams.length){message('Sem equipes','Cadastre pelo menos uma equipe.');return}const names=c.teams.map((t,i)=>`${i+1} — ${t.name}`).join('\n');const input=prompt(`Escolha o número do campeão:\n${names}`);if(input!==null){const t=c.teams[Number(input)-1];if(t){c.championId=t.id;updateAndStay(`Campeão: ${t.name}`)}else notify('Número inválido.',true)}}break;
 case 'export-data':exportData();break;
 }
}
function exportData(){const payload={version:2,exportedAt:new Date().toISOString(),championships:db};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='SEA-MCM-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
async function importData(file){
 if(!ensureAdmin()||!file)return;
 try{const data=JSON.parse(await file.text());if(!Array.isArray(data.championships))throw Error('Formato inválido');const list=migrate(data.championships);if(!confirm(`Substituir ${db.length} campeonato(s) por ${list.length} do backup?`))return;db=list;save();navigate('administracao');notify('Backup importado.')}catch{notify('Arquivo de backup inválido.',true)}
}
function bindUI(){
 document.addEventListener('click',handleAction);
 $('#guest-login').addEventListener('click',()=>beginSession('visitante@local','Visitante','public'));
 $('#google-login').addEventListener('click',googleLogin);
 $('#auth-email-form').addEventListener('submit',e=>{e.preventDefault();const email=$('#auth-email').value.trim().toLowerCase();state.authEmail=email;$('#auth-identity').textContent=email;if(email===ADMIN_EMAIL||users().some(u=>u.email===email)){authStep('password');$('#admin-demo-note').classList.toggle('is-hidden',email!==ADMIN_EMAIL);$('#auth-password').focus()}else{authStep('signup');$('#auth-new-name').focus()}});
 $('#auth-password-form').addEventListener('submit',async e=>{e.preventDefault();await loginByEmail()});
 $('#auth-signup-form').addEventListener('submit',async e=>{e.preventDefault();const email=state.authEmail,name=$('#auth-new-name').value.trim(),pwd=$('#auth-new-password').value;if(email===ADMIN_EMAIL){authError('Conta reservada ao organizador.');return}const list=users();if(list.some(u=>u.email===email)){authError('Conta existente. Volte e entre.');return}list.push({email,name,hash:await passwordHash(email,pwd)});if(!saveUsers(list)){authError('Não foi possível salvar o cadastro local.');return}beginSession(email,name,'public')});
 $('#comp-form').addEventListener('submit',e=>{e.preventDefault();if(!ensureAdmin())return;const f=e.currentTarget;const cid=f.elements.id.value;const entry={name:f.elements.name.value.trim(),sport:f.elements.sport.value,season:getSport(f.elements.sport.value).season,format:f.elements.format.value,date:f.elements.date.value,status:f.elements.status.value};if(!entry.name)return;const found=db.find(c=>c.id===cid);if(found){Object.assign(found,entry)}else db.push({id:id(),...entry,teams:[],matches:[],byes:[],championId:null});if(save()){$('#comp-dialog').close();render();notify(found?'Campeonato atualizado.':'Campeonato salvo!')}});
 $('#team-form').addEventListener('submit',e=>{e.preventDefault();if(!ensureAdmin())return;const c=getComp();if(!c)return;const f=e.currentTarget;const name=f.elements.name.value.trim();if(!name)return;const tid=f.elements.id.value;if(c.teams.some(t=>t.name.toLowerCase()===name.toLowerCase()&&t.id!==tid)){notify('Já existe uma equipe com esse nome neste campeonato.',true);return}const entry={name,className:f.elements.className.value.trim(),captain:f.elements.captain.value.trim(),players:$$('.player-name').map(x=>x.value.trim()).filter(Boolean),notes:f.elements.notes.value.trim()};const t=c.teams.find(t=>t.id===tid);if(t)Object.assign(t,entry);else c.teams.push({id:id(),...entry});if(save()){$('#team-dialog').close();render();notify(t?'Equipe atualizada.':'Equipe cadastrada.')}});
 $('#match-form').addEventListener('submit',e=>{e.preventDefault();if(!ensureAdmin())return;const c=getComp();if(!c)return;const f=e.currentTarget;const a=f.elements.teamA.value,b=f.elements.teamB.value,status=f.elements.status.value;const sa=status==='scheduled'?null:Number(f.elements.scoreA.value),sb=status==='scheduled'?null:Number(f.elements.scoreB.value);if(a===b){notify('Selecione equipes diferentes.',true);return}if(status!=='scheduled'&&(!f.elements.scoreA.value.trim()||!f.elements.scoreB.value.trim()||!Number.isInteger(sa)||!Number.isInteger(sb)||sa<0||sb<0||sa>999||sb>999)){notify('Preencha placares válidos.',true);return}if(c.format==='mata-mata'&&status==='finished'&&sa===sb){notify('Eliminatória precisa de vencedor após desempate.',true);return}const mid=f.elements.id.value,old=c.matches.find(m=>m.id===mid);const entry={teamA:a,teamB:b,date:f.elements.date.value,time:f.elements.time.value,status,scoreA:sa,scoreB:sb};if(old)Object.assign(old,entry);else c.matches.push({id:id(),round:1,...entry});if(save()){$('#match-dialog').close();render();notify(old?'Partida corrigida.':'Partida registrada.')}});
 $('#match-status').addEventListener('change',syncScoreVisibility);
 $('#add-player').addEventListener('click',()=>addPlayerInput());
 $('#content').addEventListener('change',e=>{if(e.target.id==='standings-select'){state.selectedStanding=e.target.value;render()}else if(e.target.id==='import-data')importData(e.target.files?.[0])});
 $('#content').addEventListener('input',e=>{if(e.target.id==='global-search'){const start=e.target.selectionStart;state.query=e.target.value;const panel=searchScreen();$('#content').innerHTML=panel;const field=$('#global-search');field.focus();field.setSelectionRange(start,start)}});
}
function start(){
 try{bindUI();restoreSession()||$('#auth').classList.remove('is-hidden');window.SEA_BOOT_OK=true}
 catch(err){console.error('Erro de inicialização SEA-MCM:',err);$('#auth').classList.remove('is-hidden');const box=$('#auth-error');box.textContent='Ocorreu um erro ao iniciar. Tente atualizar a página.';box.classList.remove('is-hidden')}
 finally{window.setTimeout(()=>{const splash=$('#splash');splash?.classList.add('is-hidden');if(splash)splash.style.display='none'},1700)}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
