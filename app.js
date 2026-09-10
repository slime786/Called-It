import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const CHANNELS = ['Markets','Tech','Crypto','World','Gadgets'];
const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const supabase = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let currentUser = null;
let currentProfile = null;
let activeChannel = 'Hub';
let calls = [];
let threads = [];
let positions = [];
let selectedCall = null;
let selectedSide = 'YES';
let authMode = 'signin';

const demoCalls = [
  {id:'demo1',channel:'Markets',claim:'Nvidia closes above $210 before earnings',settlement_condition:'YES if NVDA regular-session close is above $210 on the final trading day before its next earnings release.',confidence:74,resolution_date:'2026-09-24',position_disclosure:'Long NVDA shares',status:'open',challenge_ends_at:'2026-09-01T00:00:00Z',created_at:'2026-09-09T12:00:00Z',profiles:{username:'MarcusT'},positions:[{points:25},{points:10},{points:15}]},
  {id:'demo2',channel:'Tech',claim:'A major AI accelerator launch slips out of this quarter',settlement_condition:'YES if the vendor does not announce general customer availability before quarter-end in its official newsroom.',confidence:62,resolution_date:'2026-09-30',position_disclosure:null,status:'challenge',challenge_ends_at:'2099-01-01T00:00:00Z',created_at:'2026-09-10T10:00:00Z',profiles:{username:'siliconroad'},positions:[{points:10}]},
  {id:'demo3',channel:'World',claim:'A new semiconductor export-control package is announced before month-end',settlement_condition:'YES if the responsible ministry publishes a formal notice announcing new semiconductor export restrictions before 30 September.',confidence:61,resolution_date:'2026-09-30',position_disclosure:null,status:'open',challenge_ends_at:'2026-09-01T00:00:00Z',created_at:'2026-09-06T09:00:00Z',profiles:{username:'OldManRisk'},positions:[]}
];
const demoThreads = [
  {id:'t1',channel:'World',title:'Shipping lane disruption and freight rates',body:'What are people watching in spot rates this week?',created_at:'2026-09-10T17:30:00Z',profiles:{username:'Mariner'}},
  {id:'t2',channel:'Tech',title:'What the latest packaging bottleneck actually means',body:'Trying to separate real constraints from narrative.',created_at:'2026-09-10T15:10:00Z',profiles:{username:'die_shrink'}}
];

function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),2800)}
function openModal(id){document.getElementById(id).showModal()}
function requireAccount(){if(!configured){toast('Connect Supabase first — follow SETUP.md.');return false}if(!currentUser){openModal('authModal');return false}return true}
function effectiveStatus(c){if(c.status==='challenge' && new Date(c.challenge_ends_at)<=new Date()) return 'open';return c.status}
function fmtDate(v){return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(new Date(`${v}T12:00:00`))}
function timeAgo(v){const m=Math.max(0,Math.floor((Date.now()-new Date(v))/60000));if(m<1)return'now';if(m<60)return`${m}m`;if(m<1440)return`${Math.floor(m/60)}h`;return`${Math.floor(m/1440)}d`}
function profileName(row){return row?.profiles?.username || 'member'}
function totalPoints(c){return (c.positions||[]).reduce((n,p)=>n+(p.points||0),0)}

async function boot(){
  renderRail();
  if(!configured){calls=demoCalls;threads=demoThreads;$('#connectionBadge').textContent='Setup mode';renderAll();return}
  $('#connectionBadge').textContent='Live database';$('#connectionBadge').classList.add('live');
  const {data:{session}}=await supabase.auth.getSession();
  currentUser=session?.user||null;
  await loadProfile();
  await loadData();
  supabase.auth.onAuthStateChange(async(_event,session)=>{currentUser=session?.user||null;await loadProfile();updateAccountUI();await loadData()});
}

async function loadProfile(){
  currentProfile=null;
  if(!currentUser)return updateAccountUI();
  const {data}=await supabase.from('profiles').select('*').eq('id',currentUser.id).maybeSingle();
  currentProfile=data||null;updateAccountUI();
}

async function loadData(){
  if(!configured)return;
  const [callsRes,threadsRes,posRes]=await Promise.all([
    supabase.from('calls').select('*, profiles!calls_author_id_fkey(username), positions(points,side,user_id)').order('created_at',{ascending:false}).limit(100),
    supabase.from('threads').select('*, profiles!threads_author_id_fkey(username)').order('created_at',{ascending:false}).limit(60),
    currentUser?supabase.from('positions').select('*').eq('user_id',currentUser.id):Promise.resolve({data:[]})
  ]);
  if(callsRes.error)toast(`Calls: ${callsRes.error.message}`);
  calls=callsRes.data||[];threads=threadsRes.data||[];positions=posRes.data||[];renderAll();
}

function updateAccountUI(){
  const signedIn=Boolean(currentUser);
  $('#authBtn').classList.toggle('hidden',signedIn);$('#profileBtn').classList.toggle('hidden',!signedIn);
  if(signedIn){const name=currentProfile?.username||currentUser.email?.split('@')[0]||'?';$('#profileBtn').textContent=name.slice(0,2).toUpperCase();$('#profileUsername').textContent=name}
}

function renderRail(){
  $('#railChannels').innerHTML=['Hub',...CHANNELS].map(c=>`<button class="rail-channel ${c===activeChannel?'active':''}" data-channel="${c}"><span>${c}</span><span id="count-${c}">0</span></button>`).join('');
}

function renderAll(){renderCalls();renderThreads();renderStats();renderLeaderboard();renderResolving();renderCounts();updateAccountUI()}
function filtered(list){return activeChannel==='Hub'?list:list.filter(x=>x.channel===activeChannel)}

function renderCalls(){
  let list=filtered([...calls]);const sort=$('#sortCalls').value;
  if(sort==='new')list.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  if(sort==='soon')list.sort((a,b)=>new Date(a.resolution_date)-new Date(b.resolution_date));
  if(sort==='confidence')list.sort((a,b)=>b.confidence-a.confidence);
  if(sort==='hot')list.sort((a,b)=>totalPoints(b)-totalPoints(a));
  const el=$('#callsList');
  if(!list.length){el.innerHTML='<div class="empty-state"><strong>No calls here yet.</strong>Be the first to put a view on record.</div>';return}
  el.innerHTML=list.map(c=>{const status=effectiveStatus(c);const mine=positions.find(p=>String(p.call_id)===String(c.id));return `<article class="call-card" data-call-id="${c.id}">
    <div class="call-top"><div class="badges"><span class="badge">${c.channel}</span><span class="badge ${status}">${status==='challenge'?'Wording challenge':status}</span></div><span class="call-meta-right">${c.confidence}% confidence</span></div>
    <h3 class="call-title">${escapeHtml(c.claim)}</h3>
    <div class="call-author"><strong>${escapeHtml(profileName(c))}</strong><span>·</span><span>${totalPoints(c)} pts staked</span><span>·</span><span>resolves ${fmtDate(c.resolution_date)}</span></div>
    <p class="call-condition">${escapeHtml(c.settlement_condition)}</p>
    ${c.position_disclosure?`<p class="call-disclosure">Position disclosure: ${escapeHtml(c.position_disclosure)}</p>`:''}
    <div class="call-actions">
      ${status==='open'?`<button class="side-button yes ${mine?.side==='YES'?'selected':''}" data-side="YES">YES</button><button class="side-button no ${mine?.side==='NO'?'selected':''}" data-side="NO">NO</button>`:`<span class="form-note">${status==='challenge'?'Open after the 24-hour wording challenge.':'This call is no longer open.'}</span>`}
      <span class="participants">${(c.positions||[]).length} member${(c.positions||[]).length===1?'':'s'} in</span>
    </div></article>`}).join('');
}

function renderThreads(){const list=filtered(threads);$('#threadsList').innerHTML=list.length?list.map(t=>`<article class="thread-row"><div><div class="thread-title">${escapeHtml(t.title)}</div><div class="thread-body">${escapeHtml(t.body||'')}</div><div class="thread-meta">${t.channel} · ${escapeHtml(profileName(t))} · ${timeAgo(t.created_at)}</div></div></article>`).join(''):'<div class="empty-state"><strong>No discussion yet.</strong>Talk does not need to be a prediction.</div>'}

function renderStats(){
  const own=currentUser?calls.filter(c=>c.author_id===currentUser.id):[];
  const resolved=own.filter(c=>c.status==='resolved'&&typeof c.result==='boolean');
  const correct=resolved.filter(c=>c.result===true).length;
  const open=own.filter(c=>effectiveStatus(c)==='open').length;
  const challenge=own.filter(c=>effectiveStatus(c)==='challenge').length;
  const staked=positions.reduce((n,p)=>n+(p.points||0),0);
  const accuracy=resolved.length?Math.round(correct/resolved.length*100):null;
  $('#accuracyStat').textContent=accuracy===null?'—':`${accuracy}%`;$('#resolvedStat').textContent=resolved.length;$('#openStat').textContent=open;$('#challengeDetail').textContent=`${challenge} in wording challenge`;$('#pointsStat').textContent=staked;
  if(currentUser){$('#recordHeadline').textContent=accuracy===null?`${currentProfile?.username||'Your'} record starts here.`:`${accuracy}% accurate · ${resolved.length} resolved`;$('#profileAccuracy').textContent=accuracy===null?'—':`${accuracy}%`;$('#profileResolved').textContent=resolved.length}else{$('#recordHeadline').textContent='Build a record worth showing.'}
}

function renderLeaderboard(){
  const map=new Map();
  calls.forEach(c=>{const name=profileName(c);if(!map.has(name))map.set(name,{name,points:0,calls:0});const r=map.get(name);r.calls++;r.points+=totalPoints(c)});
  const leaders=[...map.values()].sort((a,b)=>b.points-a.points).slice(0,5);
  $('#leaderboard').innerHTML=leaders.length?leaders.map((l,i)=>`<div class="leader-row"><span>${i+1}</span><span class="leader-name">${escapeHtml(l.name)}<small>${l.calls} call${l.calls===1?'':'s'} on record</small></span><span class="leader-score">${l.points}</span></div>`).join(''):'<div class="empty-state">No standings yet.</div>';
}
function renderResolving(){const soon=calls.filter(c=>['open','challenge'].includes(effectiveStatus(c))).sort((a,b)=>new Date(a.resolution_date)-new Date(b.resolution_date)).slice(0,4);$('#resolvingList').innerHTML=soon.length?soon.map(c=>`<div class="resolving-item"><span class="resolving-date">${fmtDate(c.resolution_date)}</span><div class="resolving-title">${escapeHtml(c.claim)}</div><div class="resolving-meta">${c.channel} · ${totalPoints(c)} pts</div></div>`).join(''):'<div class="empty-state">Nothing resolving yet.</div>'}
function renderCounts(){['Hub',...CHANNELS].forEach(ch=>{const n=ch==='Hub'?calls.length:calls.filter(c=>c.channel===ch).length;const el=document.getElementById(`count-${ch}`);if(el)el.textContent=n})}
function setChannel(ch){activeChannel=ch;$$('[data-channel]').forEach(b=>b.classList.toggle('active',b.dataset.channel===ch));renderCalls();renderThreads()}
function escapeHtml(v=''){return String(v).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[m]))}

$('#authBtn').addEventListener('click',()=>openModal('authModal'));$('#profileBtn').addEventListener('click',()=>openModal('profileModal'));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.close).close()));
$$('.auth-tab').forEach(b=>b.addEventListener('click',()=>{authMode=b.dataset.authMode;$$('.auth-tab').forEach(x=>x.classList.toggle('active',x===b));const signup=authMode==='signup';$('#usernameLabel').classList.toggle('hidden',!signup);$('#usernameInput').required=signup;$('#authTitle').textContent=signup?'Create account':'Sign in';$('#authSubmitBtn').textContent=signup?'Create account':'Sign in';$('#passwordInput').autocomplete=signup?'new-password':'current-password'}));
$('#authForm').addEventListener('submit',async e=>{e.preventDefault();if(!configured)return toast('Configure Supabase first.');const email=$('#emailInput').value.trim();const password=$('#passwordInput').value;if(authMode==='signup'){const username=$('#usernameInput').value.trim();const {error}=await supabase.auth.signUp({email,password,options:{data:{username}}});if(error)return toast(error.message);toast('Account created. Check your email if confirmation is enabled.')}else{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)return toast(error.message);toast('Signed in.')}$('#authModal').close()});
$('#signOutBtn').addEventListener('click',async()=>{await supabase.auth.signOut();$('#profileModal').close();toast('Signed out.')});

$('#newCallBtn').addEventListener('click',()=>{if(!requireAccount())return;const d=new Date();d.setDate(d.getDate()+1);$('#dateInput').min=d.toISOString().slice(0,10);$('#dateInput').value=d.toISOString().slice(0,10);openModal('callModal')});
$('#confidenceInput').addEventListener('input',e=>$('#confidenceValue').textContent=`${e.target.value}%`);
$('#callForm').addEventListener('submit',async e=>{e.preventDefault();if(!requireAccount())return;const payload={author_id:currentUser.id,channel:$('#channelInput').value,claim:$('#claimInput').value.trim(),settlement_condition:$('#conditionInput').value.trim(),confidence:Number($('#confidenceInput').value),resolution_date:$('#dateInput').value,position_disclosure:$('#disclosureInput').value.trim()||null,status:'challenge'};const {error}=await supabase.from('calls').insert(payload);if(error)return toast(error.message);e.target.reset();$('#confidenceValue').textContent='70%';$('#callModal').close();toast('Call published into wording challenge.');await loadData()});

$('#newThreadBtn').addEventListener('click',()=>{if(!requireAccount())return;openModal('threadModal')});
$('#threadForm').addEventListener('submit',async e=>{e.preventDefault();if(!requireAccount())return;const {error}=await supabase.from('threads').insert({author_id:currentUser.id,channel:$('#threadChannelInput').value,title:$('#threadTitleInput').value.trim(),body:$('#threadBodyInput').value.trim()});if(error)return toast(error.message);e.target.reset();$('#threadModal').close();toast('Thread posted.');await loadData()});

$('#callsList').addEventListener('click',e=>{const btn=e.target.closest('[data-side]');if(!btn)return;if(!requireAccount())return;selectedCall=calls.find(c=>String(c.id)===String(btn.closest('[data-call-id]').dataset.callId));selectedSide=btn.dataset.side;$('#positionTitle').textContent=selectedSide;$('#positionClaim').textContent=selectedCall.claim;const mine=positions.find(p=>String(p.call_id)===String(selectedCall.id));$('#pointsInput').value=mine?.points||10;openModal('positionModal')});
$('#positionForm').addEventListener('submit',async e=>{e.preventDefault();if(!selectedCall||!requireAccount())return;const points=Number($('#pointsInput').value);const {error}=await supabase.from('positions').upsert({call_id:selectedCall.id,user_id:currentUser.id,side:selectedSide,points},{onConflict:'call_id,user_id'});if(error)return toast(error.message);$('#positionModal').close();toast(`${selectedSide} recorded with ${points} play points.`);await loadData()});

$('#sortCalls').addEventListener('change',renderCalls);document.addEventListener('click',e=>{const b=e.target.closest('[data-channel]');if(b)setChannel(b.dataset.channel)});
boot();
