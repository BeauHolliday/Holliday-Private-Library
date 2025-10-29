// app.js - single-file client logic for listing, reader, tags, likes, theme and simple site pass
const API = { index: 'content/index.json' };
const ls = window.localStorage;

document.addEventListener('DOMContentLoaded', init);

async function init(){
  initTheme();
  setupThemeToggle();
  setupNotifBtn();
  const path = location.pathname.split('/').pop();
  if(path === '' || path==='index.html') return loadHome();
  if(path === 'latest.html') return loadLatest();
  if(path === 'reader.html') return loadReader();
}

/* Fetch helpers */
async function fetchIndex(){
  const res = await fetch(API.index + '?_=' + Date.now());
  return res.ok ? res.json() : { posts:[] };
}
async function fetchText(path){
  try{ const r = await fetch(path + '?_=' + Date.now()); return r.ok ? await r.text() : null; } catch(e){ return null; }
}

/* Home */
async function loadHome(){
  const idx = await fetchIndex();
  const updates = await fetchText('content/updates.md');
  document.getElementById('updates').innerHTML = updates ? renderMarkdown(updates) : '<p>No updates yet</p>';
  const list = document.getElementById('latest-list');
  list.innerHTML = idx.posts.slice(0,6).map(p=>`<li><a href="reader.html?slug=${p.slug}">${escapeHtml(p.title)}</a> ${p.adult?'<span class="badge">Adult</span>':''} ${p.locked?'<span class="badge">Locked</span>':''}</li>`).join('');
  checkNotifications(idx);
}

/* Latest page */
async function loadLatest(){
  const idx = await fetchIndex();
  buildTagBar(idx.posts);
  renderCards(idx.posts);
  document.getElementById('search').addEventListener('input', e=> {
    const q = e.target.value.toLowerCase();
    renderCards(idx.posts.filter(p=> p.title.toLowerCase().includes(q) || (p.tags||[]).join(' ').toLowerCase().includes(q)));
  });
}

function renderCards(posts){
  const container = document.getElementById('cards');
  if(!container) return;
  container.innerHTML = posts.map(p=>{
    const tags = (p.tags||[]).map(t=>`<span class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join(' ');
    const badges = `${p.adult?'<span class="badge">Adult</span>':''}${p.locked?'<span class="badge">Locked</span>':''}${isNew(p)?'<span class="badge">New</span>':''}`;
    return `<div class="card-item"><h3><a href="reader.html?slug=${p.slug}">${escapeHtml(p.title)}</a></h3><div class="meta">${escapeHtml(p.date)} ${badges}</div><p>${escapeHtml(p.excerpt)}</p><div>${tags}</div><div class="actions"><button data-slug="${p.slug}" class="like-btn">Like</button> <button data-slug="${p.slug}" class="fav-btn">Fav</button></div></div>`;
  }).join('');
  container.querySelectorAll('.like-btn').forEach(b=>b.addEventListener('click', e=>toggleLocal('likes', b.dataset.slug)));
  container.querySelectorAll('.fav-btn').forEach(b=>b.addEventListener('click', e=>toggleLocal('favs', b.dataset.slug)));
  container.querySelectorAll('.tag').forEach(b=> b.addEventListener('click', ()=> {
    const tag = b.dataset.tag; document.getElementById('search').value = tag; document.getElementById('search').dispatchEvent(new Event('input'));
  }));
}

function buildTagBar(posts){
  const bar = document.getElementById('tag-bar');
  if(!bar) return;
  const map = {};
  (posts||[]).forEach(p=> (p.tags||[]).forEach(t=> map[t]= (map[t]||0)+1 ));
  const tags = Object.keys(map).sort((a,b)=>map[b]-map[a]);
  bar.innerHTML = tags.map(t=>`<button class="tag" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`).join(' ');
  bar.querySelectorAll('button').forEach(b=> b.addEventListener('click',()=> {
    const tag = b.dataset.tag; document.getElementById('search').value = tag; document.getElementById('search').dispatchEvent(new Event('input'));
  }));
}

/* Reader page */
async function loadReader(){
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug') || 'sample-poem';
  const idx = await fetchIndex();
  const post = (idx.posts||[]).find(p=>p.slug===slug);
  if(!post) return document.getElementById('reader-article').innerHTML = '<p>Not found</p>';
  document.getElementById('meta').innerHTML = `<h2>${escapeHtml(post.title)}</h2><div class="meta">${escapeHtml(post.date)} ${post.adult?'<span class="badge">Adult</span>':''}${post.locked?'<span class="badge">Locked</span>':''}</div>`;

  // Locked post handling (simple site-wide pass)
  if (post.locked) {
    // If already unlocked for session, load normally
    if (siteUnlocked()) {
      const txt = await fetchText(post.path);
      document.getElementById('reader-article').innerHTML = txt ? renderMarkdown(txt) : '<p>Unable to load.</p>';
      bindReaderActions(post);
      return;
    }
    // Otherwise show unlock UI
    const area = document.getElementById('unlock-area');
    if (area) {
      area.innerHTML = `<div class="card"><p>This piece is exclusive. Unlock site access to view.</p><button id="site-unlock">Unlock</button></div>`;
      document.getElementById('site-unlock').addEventListener('click', async ()=>{
        const ok = await promptSitePassIfNeeded();
        if (!ok) return;
        const txt = await fetchText(post.path);
        document.getElementById('reader-article').innerHTML = txt ? renderMarkdown(txt) : '<p>Unable to load.</p>';
        bindReaderActions(post);
      });
    } else {
      const ok = await promptSitePassIfNeeded();
      if (ok) {
        const txt = await fetchText(post.path);
        document.getElementById('reader-article').innerHTML = txt ? renderMarkdown(txt) : '<p>Unable to load.</p>';
        bindReaderActions(post);
      }
    }
    return;
  }

  // Not locked - load normally
  const txt = post.encrypted ? null : await fetchText(post.path);
  if (post.encrypted) {
    // future: handle encrypted blobs
    document.getElementById('reader-article').innerHTML = '<p>This post is encrypted. Owner must configure decryption.</p>';
  } else {
    document.getElementById('reader-article').innerHTML = txt ? renderMarkdown(txt) : '<p>Unable to load.</p>';
  }
  bindReaderActions(post);
}

/* Reader actions */
function bindReaderActions(post){
  document.getElementById('like-btn')?.addEventListener('click', ()=> toggleLocal('likes', post.slug));
  document.getElementById('fav-btn')?.addEventListener('click', ()=> toggleLocal('favs', post.slug));
  document.getElementById('share-btn')?.addEventListener('click', ()=> {
    navigator.clipboard?.writeText(location.href).then(()=> alert('Link copied to clipboard'));
  });
  document.getElementById('font-size')?.addEventListener('input', e=> document.querySelector('.reader-article').style.fontSize = e.target.value + 'px');
}

/* Simple site-pass helpers (UX-only) */
async function fetchSitePass(){
  try{
    const r = await fetch('content/site-pass.json?_=' + Date.now());
    if(!r.ok) return null;
    const j = await r.json();
    return j?.pass || null;
  }catch(e){ return null; }
}
function siteUnlocked(){ return sessionStorage.getItem('siteUnlocked') === '1'; }
function setSiteUnlocked(flag = true){ sessionStorage.setItem('siteUnlocked', flag ? '1' : '0'); }
async function promptSitePassIfNeeded(){
  if (siteUnlocked()) return true;
  const sitePass = await fetchSitePass();
  if (!sitePass) { alert('Site pass not configured'); return false; }
  const supplied = prompt('Enter site passphrase to unlock exclusive pieces');
  if (!supplied) return false;
  if (supplied === sitePass) {
    setSiteUnlocked(true);
    alert('Unlocked for this session');
    return true;
  } else {
    alert('Incorrect passphrase');
    return false;
  }
}

/* Utilities and local ops */
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toggleLocal(key, slug){
  const cur = JSON.parse(ls.getItem(key)||'[]');
  const idx = cur.indexOf(slug);
  if (idx === -1) cur.push(slug); else cur.splice(idx,1);
  ls.setItem(key, JSON.stringify(cur));
  alert((idx===-1?'Saved':'Removed') + ' ' + slug);
}
function isNew(p){ const lastSeen = ls.getItem('lastSeen') || 0; return new Date(p.date).getTime() > Number(lastSeen); }

/* Theme and notifications */
function initTheme(){ const t = ls.getItem('theme') || 'dark'; document.body.setAttribute('data-theme', t); }
function setupThemeToggle(){ document.querySelectorAll('#theme-toggle').forEach(b=> b.addEventListener('click', ()=> {
  const current = document.body.getAttribute('data-theme');
  const next = current==='dark'?'light': current==='light'?'high-contrast':'dark';
  document.body.setAttribute('data-theme', next); ls.setItem('theme', next);
})); }
async function checkNotifications(idx){
  const lastSeen = Number(ls.getItem('lastSeen')||0);
  const newest = Math.max(...(idx.posts||[]).map(p=> new Date(p.date).getTime()));
  if(newest > lastSeen) document.getElementById('notif-badge')?.classList.remove('hidden');
}
function setupNotifBtn(){ document.querySelectorAll('#notif-btn').forEach(b=> b.addEventListener('click', ()=> {
  ls.setItem('lastSeen', String(Date.now())); document.getElementById('notif-badge')?.classList.add('hidden');
})); }
