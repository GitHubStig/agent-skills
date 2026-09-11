/**
 * render.mjs — self-contained contribution-graph HTML.
 *
 * No LLM, no CDN, no build step: the output is one file that opens anywhere.
 *
 * Colour: a sequential single-hue (green) ramp, light->dark, validated for OKLab
 * lightness monotonicity against both surfaces (see reference/design-notes.md).
 * Sequential encoding is the correct family here because a day's commit count is
 * a magnitude, not an identity.
 */

/**
 * Fixed bucket ladder. Commit-per-day distributions are extremely skewed (this
 * repo: max 73, median active day 2), so linear quartiles would flatten nearly
 * every active day onto the palest step. The ladder scales by order of magnitude
 * for repos whose typical busy day is much larger.
 */
export function makeBuckets(counts) {
  const sorted = counts.slice().sort((a, b) => a - b);
  const p90 = sorted.length ? sorted[Math.floor(sorted.length * 0.9)] : 0;
  // Base ladder covers p90 <= 15, the common case.
  let scale = 1;
  while (p90 / scale > 15 && scale < 1e6) scale *= 10;
  const t = k => Math.max(1, Math.round(k * scale));
  return [
    { min: t(16), lv: 4 },
    { min: t(6), lv: 3 },
    { min: t(3), lv: 2 },
    { min: 1, lv: 1 },
  ];
}

export function bucketLabels(buckets) {
  const out = [];
  for (let i = buckets.length - 1; i >= 0; i--) {
    const b = buckets[i];
    const next = buckets[i - 1];
    out.push(next ? (b.min === next.min - 1 ? `${b.min}` : `${b.min}–${next.min - 1}`) : `${b.min}+`);
  }
  return out;
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderHtml(model) {
  const {
    repo, totalCommits, activeDays, firstDate, lastDate, years,
    authors, days, buckets, detailCap, detailTruncated, generatedAt, version, warnings = [],
  } = model;

  const payload = { authors, days, years, buckets, detailCap, detailTruncated };

  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(repo)} &mdash; contributions</title>
<style>
  :root {
    color-scheme: light;
    --surface-0:#f6f6f4; --surface-1:#fcfcfb;
    --border:#e2e1dc; --border-strong:#cfcec7;
    --text-primary:#0b0b0b; --text-secondary:#52514e; --text-muted:#86847d;
    --accent:#2fa44f;
    --lv0:#ebedef; --lv1:#b7e4c0; --lv2:#6fce89; --lv3:#2fa44f; --lv4:#14682c;
    --cell-ring:rgba(0,0,0,.06);
    --warn-bg:#fdf3d7; --warn-fg:#5b4708; --warn-br:#e8d9a4;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      color-scheme: dark;
      --surface-0:#131312; --surface-1:#1a1a19;
      --border:#2e2e2c; --border-strong:#414140;
      --text-primary:#fff; --text-secondary:#c3c2b7; --text-muted:#8d8c83;
      --accent:#29b352;
      --lv0:#26282b; --lv1:#0d4a26; --lv2:#16803c; --lv3:#29b352; --lv4:#59e07f;
      --cell-ring:rgba(255,255,255,.07);
      --warn-bg:#3a2f0c; --warn-fg:#f0dfa8; --warn-br:#5c4c15;
    }
  }
  :root[data-theme="dark"] {
    color-scheme: dark;
    --surface-0:#131312; --surface-1:#1a1a19;
    --border:#2e2e2c; --border-strong:#414140;
    --text-primary:#fff; --text-secondary:#c3c2b7; --text-muted:#8d8c83;
    --accent:#29b352;
    --lv0:#26282b; --lv1:#0d4a26; --lv2:#16803c; --lv3:#29b352; --lv4:#59e07f;
    --cell-ring:rgba(255,255,255,.07);
    --warn-bg:#3a2f0c; --warn-fg:#f0dfa8; --warn-br:#5c4c15;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--surface-0);color:var(--text-primary);
    font:15px/1.5 ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased}
  .wrap{max-width:1080px;margin:0 auto;padding:40px 20px 80px}
  header h1{font-size:26px;font-weight:650;letter-spacing:-.02em;margin:0 0 6px}
  header p.sub{margin:0;color:var(--text-secondary);font-size:14px}
  header p.sub code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:var(--text-primary)}
  .warn{background:var(--warn-bg);color:var(--warn-fg);border:1px solid var(--warn-br);
    border-radius:8px;padding:9px 12px;font-size:13px;margin:16px 0 0}
  .stats{display:grid;gap:10px;margin:26px 0 22px;grid-template-columns:repeat(auto-fit,minmax(148px,1fr))}
  .stat{background:var(--surface-1);border:1px solid var(--border);border-radius:10px;padding:12px 14px}
  .stat .v{font-size:22px;font-weight:650;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.2}
  .stat .k{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin-top:3px}
  .filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:24px}
  /* an author-defined display beats the UA [hidden] rule, so restate it */
  .filters[hidden]{display:none}
  .filters .label{font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em}
  .pill{font:inherit;font-size:13px;cursor:pointer;background:var(--surface-1);color:var(--text-secondary);
    border:1px solid var(--border);border-radius:999px;padding:5px 13px;
    transition:background .12s,color .12s,border-color .12s}
  .pill:hover{border-color:var(--border-strong);color:var(--text-primary)}
  .pill[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:550}
  .pill .n{font-variant-numeric:tabular-nums;opacity:.72;margin-left:5px}
  .year{margin-bottom:26px}
  .year-head{display:flex;align-items:baseline;gap:10px;margin-bottom:8px;
    position:sticky;top:0;z-index:5;background:var(--surface-0);padding:6px 0}
  .year-head h2{font-size:17px;font-weight:600;margin:0;font-variant-numeric:tabular-nums}
  .year-head .count{font-size:13px;color:var(--text-muted)}
  .scroller{overflow-x:auto;background:var(--surface-1);border:1px solid var(--border);
    border-radius:10px;padding:14px}
  /* table-layout:fixed + width:max-content keeps every cell exactly square:
     under auto layout the browser treats cell widths as suggestions and
     redistributes them to fit the container, so cells shrink on narrow screens
     instead of the grid scrolling. Fixed layout takes column widths from the
     first row, so the month header cells must declare the same width and let
     their labels overflow. */
  table.grid{border-collapse:separate;border-spacing:3px;table-layout:fixed;width:max-content}
  table.grid th{font-weight:400;font-size:11px;line-height:1;color:var(--text-muted);
    padding:0;text-align:left;white-space:nowrap}
  th.month{width:12px;height:13px;vertical-align:bottom;position:relative;overflow:visible}
  /* the label must not widen its column, so take it out of flow — anchored to the
     bottom of the header cell, or it drifts into the grid and the cells paint over it */
  th.month span{position:absolute;left:0;bottom:1px;display:inline-block}
  /* line-height:1 at 10px keeps a labelled row from growing taller than the
     12px cells beside it — the cause of uneven Mon/Wed/Fri row heights */
  th.dow{width:28px;padding-right:6px;text-align:right;vertical-align:middle;
    font-size:10px;line-height:1}
  table.grid tr{height:12px}
  td.cell{width:12px;height:12px;padding:0;border-radius:3px;background:var(--lv0);
    box-shadow:inset 0 0 0 1px var(--cell-ring)}
  td.cell[data-lv="1"]{background:var(--lv1)}
  td.cell[data-lv="2"]{background:var(--lv2)}
  td.cell[data-lv="3"]{background:var(--lv3)}
  td.cell[data-lv="4"]{background:var(--lv4)}
  td.cell[data-n]:not([data-n="0"]){cursor:pointer}
  td.cell.void{background:transparent;box-shadow:none}
  td.cell.sel{box-shadow:0 0 0 2px var(--surface-1),0 0 0 4px var(--text-primary)}
  .legend{display:flex;align-items:center;gap:6px;justify-content:flex-end;font-size:12px;
    color:var(--text-muted);margin-top:10px;flex-wrap:wrap}
  .legend .sw{width:12px;height:12px;border-radius:3px;display:inline-block;box-shadow:inset 0 0 0 1px var(--cell-ring)}
  #tip{position:fixed;z-index:40;pointer-events:none;opacity:0;transition:opacity .1s;
    transform:translate(-50%,-100%);background:var(--text-primary);color:var(--surface-1);
    font-size:12px;line-height:1.4;padding:6px 9px;border-radius:6px;white-space:nowrap;
    box-shadow:0 4px 14px rgba(0,0,0,.18)}
  #tip.on{opacity:1}
  #detail{background:var(--surface-1);border:1px solid var(--border);border-radius:10px;
    padding:16px 18px;margin-top:22px}
  #detail.empty{color:var(--text-muted);font-size:14px;text-align:center;padding:26px 18px}
  #detail .dhead{display:flex;justify-content:space-between;align-items:baseline;gap:12px;
    margin-bottom:12px;flex-wrap:wrap}
  #detail h3{margin:0;font-size:15px;font-weight:600}
  #detail .dclose{font:inherit;font-size:13px;cursor:pointer;background:none;border:0;color:var(--text-muted);padding:2px 4px}
  #detail .dclose:hover{color:var(--text-primary)}
  #detail .note{font-size:12px;color:var(--text-muted);margin:0 0 8px}
  ul.commits{list-style:none;margin:0;padding:0;max-height:420px;overflow-y:auto}
  ul.commits li{display:flex;gap:10px;align-items:baseline;padding:6px 0;
    border-top:1px solid var(--border);font-size:13px}
  ul.commits li:first-child{border-top:0}
  ul.commits .h{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;
    color:var(--text-muted);flex:none;width:62px}
  ul.commits .s{color:var(--text-primary);overflow-wrap:anywhere}
  ul.commits .a{flex:none;font-size:11px;color:var(--text-muted);margin-left:auto;padding-left:8px;white-space:nowrap}
  footer{margin-top:34px;font-size:12px;color:var(--text-muted);border-top:1px solid var(--border);padding-top:14px}
  @media (max-width:560px){ul.commits .a{display:none}}
</style>

<div class="wrap">
  <header>
    <h1>${esc(repo)} &mdash; contribution history</h1>
    <p class="sub">Every commit from the first to the most recent, bucketed by author date. Click any day to read its commits.</p>
    ${warnings.map(w => `<p class="warn">${esc(w)}</p>`).join('')}
  </header>
  <div class="stats" id="stats"></div>
  <div class="filters" id="filters" hidden>
    <span class="label">Author</span>
    <div id="pills" style="display:flex;gap:8px;flex-wrap:wrap"></div>
  </div>
  <div id="years"></div>
  <div id="detail" class="empty">Select a day above to see its commits.</div>
  <footer id="foot"></footer>
</div>
<div id="tip" role="status" aria-live="polite"></div>

<script>
const D = ${JSON.stringify(payload)};
const META = ${JSON.stringify({ repo, totalCommits, activeDays, firstDate, lastDate, generatedAt, version })};

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const level=n=>{for(const b of D.buckets) if(n>=b.min) return b.lv; return 0;};
let filter=-1, selected=null;

const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const parse=s=>{const[y,m,dd]=s.split('-').map(Number);return new Date(y,m-1,dd);};
const pretty=s=>{const d=parse(s);return DOW[d.getDay()]+', '+d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear();};
const plural=(n,w)=>n.toLocaleString()+' '+w+(n===1?'':'s');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Count for a day under the active author filter.
function dayCount(d){
  const e=D.days[d]; if(!e) return 0;
  return filter===-1 ? e.n : (e.a && e.a[filter]) || 0;
}
function dayCommits(d){
  const e=D.days[d]; if(!e||!e.c) return [];
  return filter===-1 ? e.c : e.c.filter(c=>c[1]===filter);
}

function renderStats(){
  const keys=Object.keys(D.days).filter(d=>dayCount(d)>0).sort();
  const total=keys.reduce((n,d)=>n+dayCount(d),0);
  let streak=0,run=0,prev=null;
  for(const d of keys){
    const t=parse(d).getTime();
    run=(prev!==null&&t-prev===86400000)?run+1:1;
    if(run>streak)streak=run; prev=t;
  }
  let busy=null;
  for(const d of keys){const n=dayCount(d); if(!busy||n>busy[1])busy=[d,n];}
  const cells=[
    [total.toLocaleString(),'Commits'],
    [keys.length.toLocaleString(),'Active days'],
    [keys.length?(total/keys.length).toFixed(1):'0','Avg / active day'],
    [streak.toLocaleString(),'Longest streak'],
    [busy?busy[1].toLocaleString():'0',busy?'Busiest day \\u00b7 '+busy[0]:'Busiest day'],
  ];
  document.getElementById('stats').innerHTML=cells.map(([v,k])=>
    '<div class="stat"><div class="v">'+v+'</div><div class="k">'+k+'</div></div>').join('');
}

function yearGrid(year){
  const y=+year;
  const jan1=new Date(y,0,1), dec31=new Date(y,11,31);
  const start=new Date(jan1); start.setDate(1-jan1.getDay());
  const end=new Date(dec31); end.setDate(dec31.getDate()+(6-dec31.getDay()));
  const weeks=Math.round((end-start)/604800000)+1;
  const monthAt=new Array(weeks).fill(null);
  let seen=-1;
  for(let w=0;w<weeks;w++){
    const d=new Date(start); d.setDate(start.getDate()+w*7);
    if(d.getFullYear()===y&&d.getMonth()!==seen){seen=d.getMonth();monthAt[w]=MONTHS[seen];}
  }
  let total=0;
  let h='<table class="grid" role="grid" aria-label="Commit activity for '+year+'"><tr><th></th>';
  for(let w=0;w<weeks;w++) h+='<th class="month" scope="col">'+(monthAt[w]?'<span>'+monthAt[w]+'</span>':'')+'</th>';
  h+='</tr>';
  for(let r=0;r<7;r++){
    h+='<tr><th class="dow" scope="row">'+(r%2===1?DOW[r]:'')+'</th>';
    for(let w=0;w<weeks;w++){
      const d=new Date(start); d.setDate(start.getDate()+w*7+r);
      if(d.getFullYear()!==y){h+='<td class="cell void"></td>';continue;}
      const key=iso(d), n=dayCount(key); total+=n;
      const lbl=(n?plural(n,'commit'):'No commits')+' on '+pretty(key);
      h+='<td class="cell'+(key===selected?' sel':'')+'" data-lv="'+level(n)+'" data-n="'+n+
         '" data-d="'+key+'" tabindex="'+(n?'0':'-1')+'" role="gridcell" aria-label="'+lbl+'"></td>';
    }
    h+='</tr>';
  }
  return {html:h+'</table>', total};
}

function renderYears(){
  let out='';
  for(const y of D.years){
    const {html,total}=yearGrid(y);
    out+='<section class="year"><div class="year-head"><h2>'+y+'</h2>'+
      '<span class="count">'+plural(total,'commit')+'</span></div>'+
      '<div class="scroller">'+html+'</div></section>';
  }
  const labels=D.buckets.map((b,i)=>{
    const next=D.buckets[i-1];
    return next?(b.min===next.min-1?String(b.min):b.min+'\\u2013'+(next.min-1)):b.min+'+';
  }).reverse();
  out+='<div class="legend"><span>Less</span>'+
    [0,1,2,3,4].map(l=>'<span class="sw" style="background:var(--lv'+l+')"></span>').join('')+
    '<span>More</span></div><div class="legend" style="margin-top:4px">'+
    labels.map(l=>l+' commits').join(' &nbsp;\\u00b7&nbsp; ')+'</div>';
  document.getElementById('years').innerHTML=out;
}

function renderDetail(){
  const el=document.getElementById('detail');
  const n=selected?dayCount(selected):0;
  if(!selected||!n){el.className='empty';el.innerHTML='Select a day above to see its commits.';return;}
  const list=dayCommits(selected);
  el.className='';
  const note=list.length<n
    ? '<p class="note">Showing '+list.length+' of '+n+' commits (detail capped for repository size).</p>' : '';
  el.innerHTML='<div class="dhead"><h3>'+pretty(selected)+' &mdash; '+plural(n,'commit')+'</h3>'+
    '<button class="dclose" id="dclose">Close &times;</button></div>'+note+
    '<ul class="commits">'+list.map(c=>
      '<li><span class="h">'+esc(c[0])+'</span><span class="s">'+esc(c[2])+
      '</span><span class="a">'+esc(D.authors[c[1]]||'')+'</span></li>').join('')+'</ul>';
  document.getElementById('dclose').onclick=()=>{selected=null;render();};
}

function renderPills(){
  if(D.authors.length<2){document.getElementById('filters').hidden=true;return;}
  document.getElementById('filters').hidden=false;
  const totals=D.authors.map((_,i)=>0);
  for(const d in D.days){const a=D.days[d].a||{};for(const k in a) totals[k]+=a[k];}
  const opts=[['All',-1,META.totalCommits]].concat(D.authors.map((a,i)=>[a,i,totals[i]]));
  document.getElementById('pills').innerHTML=opts.map(([l,v,n])=>
    '<button class="pill" data-v="'+v+'" aria-pressed="'+(filter===v)+'">'+esc(l)+
    '<span class="n">'+n.toLocaleString()+'</span></button>').join('');
}

function render(){
  renderStats(); renderPills(); renderYears(); renderDetail();
  document.getElementById('foot').textContent=
    META.totalCommits.toLocaleString()+' commits \\u00b7 '+META.firstDate+' \\u2192 '+META.lastDate+
    ' \\u00b7 author dates, as GitHub counts them \\u00b7 repo-story v'+META.version+', '+META.generatedAt;
}

const tip=document.getElementById('tip');
function showTip(td){
  const n=+td.dataset.n, r=td.getBoundingClientRect();
  tip.innerHTML='<b>'+(n?plural(n,'commit'):'No commits')+'</b> on '+pretty(td.dataset.d);
  tip.style.left=(r.left+r.width/2)+'px'; tip.style.top=(r.top-7)+'px';
  tip.classList.add('on');
}
document.addEventListener('mouseover',e=>{
  const td=e.target.closest&&e.target.closest('td.cell[data-d]');
  if(td)showTip(td); else tip.classList.remove('on');
});
document.addEventListener('focusin',e=>{
  const td=e.target.closest&&e.target.closest('td.cell[data-d]'); if(td)showTip(td);
});
document.addEventListener('focusout',()=>tip.classList.remove('on'));
document.addEventListener('click',e=>{
  const pill=e.target.closest('.pill');
  if(pill){filter=+pill.dataset.v;selected=null;render();return;}
  const td=e.target.closest('td.cell[data-d]');
  if(td&&+td.dataset.n>0){
    selected=(selected===td.dataset.d)?null:td.dataset.d; render();
    if(selected)document.getElementById('detail').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&selected){selected=null;render();}
  if(e.key==='Enter'||e.key===' '){
    const td=e.target.closest&&e.target.closest('td.cell[data-d]');
    if(td&&+td.dataset.n>0){e.preventDefault();selected=(selected===td.dataset.d)?null:td.dataset.d;render();}
  }
});
render();
</script>
</html>
`;
}
