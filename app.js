const baseCalls = [
  {
    id: 1, channel: 'Markets', horizon: '14d', heat: 'Hot',
    title: 'Nvidia closes above $210 before earnings',
    author: 'MarcusT', accuracy: 71, participants: 248, confidence: 74,
    condition: 'YES if NVDA closes above $210 in the regular session on the final trading day before its next earnings release.',
    resolves: '2026-09-24', created: '2026-09-09', status: 'open'
  },
  {
    id: 2, channel: 'Gadgets', horizon: '31d', heat: 'Hot',
    title: 'Next flagship ships with no headphone jack',
    author: 'Kez', accuracy: 58, participants: 93, confidence: 67,
    condition: 'YES if the manufacturer’s official launch specifications omit a 3.5 mm headphone port on the flagship model.',
    resolves: '2026-10-11', created: '2026-09-08', status: 'open'
  },
  {
    id: 3, channel: 'Tech', horizon: '21d', heat: 'Challenge',
    title: 'The next major AI accelerator launch slips out of this quarter',
    author: 'siliconroad', accuracy: 76, participants: 151, confidence: 62,
    condition: 'YES if the vendor does not announce general customer availability before quarter-end in its official newsroom.',
    resolves: '2026-09-30', created: '2026-09-10', status: 'challenge'
  },
  {
    id: 4, channel: 'Crypto', horizon: '7d', heat: 'Open',
    title: 'Bitcoin trades above its weekly high again before Friday close',
    author: 'ArcLight', accuracy: 66, participants: 319, confidence: 69,
    condition: 'YES if BTC/USD prints a trade above this week’s current high before 23:59 UTC Friday on the named reference exchange.',
    resolves: '2026-09-17', created: '2026-09-07', status: 'open'
  },
  {
    id: 5, channel: 'World', horizon: '45d', heat: 'Open',
    title: 'A new export-control package is announced before month-end',
    author: 'OldManRisk', accuracy: 72, participants: 87, confidence: 61,
    condition: 'YES if the responsible ministry publishes a formal notice announcing new semiconductor export restrictions before 30 September.',
    resolves: '2026-09-30', created: '2026-09-06', status: 'open'
  }
];

const threads = [
  { channel: 'World', title: 'Shipping lane disruption and freight rates', author: 'Mariner', replies: 118, age: '18m' },
  { channel: 'Tech', title: 'What the latest packaging bottleneck actually means', author: 'die_shrink', replies: 64, age: '43m' },
  { channel: 'Markets', title: 'Small-cap earnings thread — what are you watching?', author: 'Roebuck', replies: 92, age: '1h' },
  { channel: 'Gadgets', title: 'Do thinner phones still matter?', author: 'Kez', replies: 37, age: '2h' }
];

const leaders = [
  { name: 'Kestrel', score: 412, accuracy: 79 },
  { name: 'OldManRisk', score: 377, accuracy: 72 },
  { name: 'Sami_V', score: 340, accuracy: 75 },
  { name: 'CircuitBreak', score: 319, accuracy: 68 },
  { name: 'Northstar', score: 301, accuracy: 71 }
];

let calls = [...baseCalls];
let activeChannel = 'Hub';
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function formatDate(date) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`));
}

function renderCalls() {
  const sort = $('#sortCalls').value;
  let list = activeChannel === 'Hub' ? [...calls] : calls.filter(c => c.channel === activeChannel);
  if (sort === 'new') list.sort((a,b) => new Date(b.created)-new Date(a.created));
  if (sort === 'soon') list.sort((a,b) => new Date(a.resolves)-new Date(b.resolves));
  if (sort === 'confidence') list.sort((a,b) => b.confidence-a.confidence);
  if (sort === 'hot') list.sort((a,b) => b.participants-a.participants);

  $('#callsList').innerHTML = list.length ? list.map(c => `
    <article class="call-card" data-id="${c.id}">
      <div class="call-top">
        <div class="badges">
          <span class="badge">${c.channel}</span>
          <span class="badge pending">${c.horizon}</span>
          ${c.heat === 'Hot' ? '<span class="badge hot">Hot</span>' : ''}
          ${c.heat === 'Challenge' ? '<span class="badge challenge">Wording challenge</span>' : ''}
        </div>
        <span class="call-meta-right">${c.confidence}% confidence</span>
      </div>
      <h3 class="call-title">${c.title}</h3>
      <div class="call-author"><strong>${c.author}</strong><span>·</span><span class="accuracy">${c.accuracy}% correct</span><span>·</span><span>${c.participants} in</span><span>·</span><span>resolves ${formatDate(c.resolves)}</span></div>
      <p class="call-condition">${c.condition}</p>
      <div class="call-actions">
        <button class="side-button yes" data-vote="YES">YES</button>
        <button class="side-button no" data-vote="NO">NO</button>
        <span class="points">Stake play points</span>
      </div>
    </article>
  `).join('') : '<p class="hero-copy">No open calls in this channel yet.</p>';
}

function renderThreads() {
  const list = activeChannel === 'Hub' ? threads : threads.filter(t => t.channel === activeChannel);
  $('#threadsList').innerHTML = list.length ? list.map(t => `
    <article class="thread-row">
      <div><div class="thread-title">${t.title}</div><div class="thread-meta">${t.channel} · ${t.author} · ${t.age}</div></div>
      <div class="reply-count"><strong>${t.replies}</strong>replies</div>
    </article>
  `).join('') : '<p class="hero-copy" style="padding-top:14px">No talk threads in this channel yet.</p>';
}

function renderLeaders() {
  $('#leaderboard').innerHTML = leaders.map((l,i) => `
    <div class="leader-row"><span class="rank">${i+1}</span><span class="leader-name">${l.name}<span class="leader-sub">${l.accuracy}% season accuracy</span></span><span class="leader-score">+${l.score}</span></div>
  `).join('');
}

function renderResolving() {
  const soon = [...calls].sort((a,b) => new Date(a.resolves)-new Date(b.resolves)).slice(0,3);
  $('#resolvingList').innerHTML = soon.map(c => `
    <div class="resolving-item"><span class="resolving-date">${formatDate(c.resolves)}</span><div class="resolving-title">${c.title}</div><div class="resolving-meta">${c.channel} · ${c.participants} members in</div></div>
  `).join('');
}

function setChannel(channel) {
  activeChannel = channel;
  $$('.channel, .rail-channel').forEach(btn => btn.classList.toggle('active', btn.dataset.channel === channel));
  renderCalls(); renderThreads();
}

function toast(message) {
  const el = $('#toast');
  el.textContent = message; el.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

$('#newCallBtn').addEventListener('click', () => {
  const min = new Date(); min.setDate(min.getDate()+1);
  $('#dateInput').min = min.toISOString().split('T')[0];
  $('#dateInput').value = min.toISOString().split('T')[0];
  $('#callModal').showModal();
});

$('#confidenceInput').addEventListener('input', e => $('#confidenceValue').textContent = `${e.target.value}%`);
$('#sortCalls').addEventListener('change', renderCalls);
$$('.channel, .rail-channel').forEach(btn => btn.addEventListener('click', () => setChannel(btn.dataset.channel)));

$('#callsList').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-vote]');
  if (!btn) return;
  const card = btn.closest('.call-card');
  card.querySelectorAll('[data-vote]').forEach(x => x.classList.remove('selected'));
  btn.classList.add('selected');
  toast(`${btn.dataset.vote} recorded with 10 play points.`);
});

$('#publishCallBtn').addEventListener('click', (e) => {
  const form = $('#callForm');
  if (!form.checkValidity()) { e.preventDefault(); form.reportValidity(); return; }
  calls.unshift({
    id: Date.now(), channel: $('#channelInput').value, horizon: 'New', heat: 'Challenge',
    title: $('#claimInput').value, author: 'DR', accuracy: 64, participants: 0,
    confidence: Number($('#confidenceInput').value), condition: $('#conditionInput').value,
    resolves: $('#dateInput').value, created: new Date().toISOString().slice(0,10), status: 'challenge'
  });
  setTimeout(() => { renderCalls(); renderResolving(); form.reset(); $('#confidenceValue').textContent = '70%'; toast('Call published into the 24-hour wording challenge.'); }, 0);
});

$('#newThreadBtn').addEventListener('click', () => $('#threadModal').showModal());
$('#publishThreadBtn').addEventListener('click', (e) => {
  const form = $('#threadForm');
  if (!form.checkValidity()) { e.preventDefault(); form.reportValidity(); return; }
  threads.unshift({ title: $('#threadTitleInput').value, channel: $('#threadChannelInput').value, author: 'DR', replies: 0, age: 'now' });
  setTimeout(() => { renderThreads(); form.reset(); toast('Thread posted.'); }, 0);
});

$('#searchBtn').addEventListener('click', () => toast('Search is ready for backend wiring.'));

renderCalls(); renderThreads(); renderLeaders(); renderResolving();
