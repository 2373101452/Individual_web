/* ====== State ====== */
const STORAGE_KEY = 'linkvault_data_v1';
let links = [];
let currentFilter = 'all';
let currentSearch = '';
let editingType = 'website';

const TYPE_LABELS = {
  website:'网站', zzz:'中转站', AI:'AI相关', tool:'工具', database:'技术栈', api:'API 接口', server:'服务器', other:'其他'
};
const VIEW_TITLES = {
  all:'全部地址', starred:'已收藏',
  website:'网站', zzz:'中转站', AI:'AI相关', tool:'工具', database:'技术栈', api:'API 接口', server:'服务器', other:'其他'
};
const VIEW_META = {
  all:'管理你的网络地址收藏', starred:'你标记为重要的地址',
  website:'网页与应用站点', zzz:'跳板与中转资源',
  AI:'人工智能相关', tool:'在线工具与服务',
  database:'开发技术栈', api:'后端接口与端点',
  server:'主机与服务器资源', other:'其他类型的地址'
};

/* ====== Storage ====== */
function loadData(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    links = raw ? JSON.parse(raw) : [];
  }catch(e){ links = []; }
  links.forEach(function(l){
    if(!l.creds){
      l.creds = [];
      if(l.user || l.pass) l.creds.push({user:l.user||'', pass:l.pass||''});
    }
  });
}
function saveData(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

/* ====== Helpers ====== */
function genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function normalizeUrl(url){
  url = url.trim();
  if(!url) return '';
  if(!/^https?:\/\//i.test(url) && !/^ftp:\/\//i.test(url)){
    url = 'https://' + url;
  }
  return url;
}
function getUrlKey(url){
  try{
    var parsed = new URL(normalizeUrl(String(url||'')));
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase();
    var path = parsed.pathname.replace(/\/+$/, '') || '/';
    parsed.pathname = path;
    return parsed.toString().replace(/\/$/, '');
  }catch(e){
    return normalizeUrl(String(url||'')).replace(/\/+$/, '').toLowerCase();
  }
}
function normalizeTags(tags){
  var values = Array.isArray(tags) ? tags : String(tags||'').split(/[，,]/);
  var seen = {};
  var result = [];
  values.forEach(function(value){
    String(value||'').split(/[，,]/).forEach(function(part){
      var tag = part.trim();
      var key = tag.toLowerCase();
      if(tag && !seen[key]){
        seen[key] = true;
        result.push(tag);
      }
    });
  });
  return result.join(',');
}
function normalizeCreds(creds, legacyUser, legacyPass){
  var values = Array.isArray(creds) ? creds : [];
  if(!values.length && (legacyUser || legacyPass)){
    values = [{user:legacyUser||'', pass:legacyPass||''}];
  }
  var result = [];
  var indexes = {};
  values.forEach(function(value){
    if(!value || typeof value !== 'object') return;
    var user = String(value.user||'').trim();
    var pass = String(value.pass||'').trim();
    if(!user && !pass) return;
    var key = user ? 'user:'+user.toLowerCase() : 'pass:'+pass;
    if(indexes[key] === undefined){
      indexes[key] = result.length;
      result.push({user:user, pass:pass});
    } else if(!result[indexes[key]].pass && pass){
      result[indexes[key]].pass = pass;
    }
  });
  return result;
}
function mergeTags(current, incoming){
  var combined = [];
  if(current) combined.push(current);
  if(incoming) combined.push(incoming);
  return normalizeTags(combined);
}
function mergeCreds(current, incoming){
  return normalizeCreds((current||[]).concat(incoming||[]));
}
function getDomain(url){
  try{ return new URL(normalizeUrl(url)).hostname; }catch(e){ return url; }
}
function getFaviconUrl(url){
  const domain = getDomain(url);
  return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(domain) + '&sz=64';
}
function formatDateTime(ts){
  const d = new Date(ts);
  const pad = n => String(n).padStart(2,'0');
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate())
       + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

/* ====== Render ====== */
function render(){
  const filtered = getFiltered();
  const container = document.getElementById('list-container');

  if(filtered.length === 0){
    if(links.length === 0){
      container.innerHTML = [
        '<div class="empty">',
          '<div class="empty-icon">📭</div>',
          '<h3>还没有地址</h3>',
          '<p>点击下方按钮开始管理你的网络资源</p>',
          '<button class="btn btn-primary" onclick="openModal()">+ 添加第一个地址</button>',
          '<button class="btn btn-restore" onclick="restoreDefaultData()">恢复初始数据</button>',
        '</div>'
      ].join('');
    } else {
      container.innerHTML = [
        '<div class="empty">',
          '<div class="empty-icon">📭</div>',
          '<h3>'+(currentSearch ? '没有匹配的地址' : '还没有地址')+'</h3>',
          '<p>'+(currentSearch ? '换个关键词试试' : '点击"添加地址"开始管理你的网络资源')+'</p>',
          '<button class="btn btn-primary" onclick="openModal()">+ 添加第一个地址</button>',
        '</div>'
      ].join('');
    }
  } else {
    container.innerHTML = '<div class="grid">' + filtered.map(renderCard).join('') + '</div>';
  }

  updateCounts();
  document.getElementById('view-title').textContent = VIEW_TITLES[currentFilter] || '全部地址';
  document.getElementById('view-meta').textContent = VIEW_META[currentFilter] || '';
}

function getFiltered(){
  let arr = links;
  if(currentFilter === 'starred'){
    arr = arr.filter(l=>l.starred);
  } else if(currentFilter !== 'all'){
    arr = arr.filter(l=>l.type === currentFilter);
  }
  if(currentSearch){
    const q = currentSearch.toLowerCase();
    arr = arr.filter(l =>
      (l.name||'').toLowerCase().includes(q) ||
      (l.url||'').toLowerCase().includes(q) ||
      (l.tags||'').toLowerCase().includes(q) ||
      (l.desc||'').toLowerCase().includes(q)
    );
  }
  arr = [...arr].sort((a,b)=>{
    if(a.starred !== b.starred) return b.starred - a.starred;
    return b.updatedAt - a.updatedAt;
  });
  return arr;
}

function renderCard(l){
  var tags = (l.tags||'').split(/[，,]/).map(function(t){return t.trim();}).filter(Boolean);
  var tagHtml = tags.map(function(t){return '<span class="tag">'+escapeHtml(t)+'</span>';}).join('');
  var fav = getFaviconUrl(l.url);
  var initial = escapeHtml((l.name||'?').charAt(0).toUpperCase());
  var html = [
    '<div class="card" data-id="'+l.id+'">',
      '<div class="card-top">',
        '<div class="favicon">',
          '<img src="'+fav+'" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'" alt="">',
          '<span class="favicon-fallback" style="display:none">'+initial+'</span>',
        '</div>',
        '<div class="card-info">',
          '<div class="card-name">'+escapeHtml(l.name)+'</div>',
          '<div class="card-url"><a href="'+escapeHtml(normalizeUrl(l.url))+'" target="_blank" rel="noopener">'+escapeHtml(getDomain(l.url))+'</a></div>',
        '</div>',
        '<button class="del-btn" onclick="deleteLink(\''+l.id+'\')" title="删除">',
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
        '</button>',
        '<button class="star-btn '+(l.starred?'active':'')+'" onclick="toggleStar(\''+l.id+'\')" title="'+(l.starred?'取消收藏':'收藏')+'">',
          (l.starred ? '★' : '☆'),
        '</button>',
      '</div>',
      l.desc ? '<div class="card-desc">'+escapeHtml(l.desc)+'</div>' : '',
      '<div class="card-tags">',
        '<span class="type-badge t-'+l.type+'">'+(TYPE_LABELS[l.type]||l.type)+'</span>',
        tagHtml,
      '</div>',
      '<div class="card-foot">',
        '<div class="card-actions">',
          (l.creds&&l.creds.length ? '<button class="text-btn" onclick="showCreds(\''+l.id+'\')" title="查看账号">查看账号('+l.creds.length+')</button>' : ''),
          '<button class="text-btn" onclick="editLink(\''+l.id+'\')" title="编辑此地址">编辑</button>',
          '<button class="text-btn" onclick="copyUrl(\''+l.id+'\')" title="复制网址">复制网址</button>',
        '</div>',
        '<span class="card-time">'+formatDateTime(l.createdAt || l.updatedAt)+'</span>',
      '</div>',
    '</div>'
  ].join('');
  return html;
}

function updateCounts(){
  document.getElementById('count-all').textContent = links.length;
  document.getElementById('count-starred').textContent = links.filter(function(l){return l.starred;}).length;
  ['website','zzz','AI','tool','database','api','server','other'].forEach(function(t){
    document.getElementById('count-'+t).textContent = links.filter(function(l){return l.type===t;}).length;
  });
}

/* ====== Filter & Search ====== */
document.querySelectorAll('.nav-item[data-filter]').forEach(function(item){
  item.addEventListener('click', function(){
    document.querySelectorAll('.nav-item[data-filter]').forEach(function(i){i.classList.remove('active');});
    document.querySelectorAll('.nav-item[data-game]').forEach(function(i){i.classList.remove('active');});
    item.classList.add('active');
    currentFilter = item.dataset.filter;
    currentGame = '';
    document.querySelector('.main').classList.remove('game-mode');
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('list-container').style.display = '';
    render();
  });
});

/* ====== Game Navigation ====== */
var currentGame = '';
document.querySelectorAll('.nav-item[data-game]').forEach(function(item){
  item.addEventListener('click', function(){
    document.querySelectorAll('.nav-item[data-filter]').forEach(function(i){i.classList.remove('active');});
    document.querySelectorAll('.nav-item[data-game]').forEach(function(i){i.classList.remove('active');});
    item.classList.add('active');
    currentGame = item.dataset.game;
    currentFilter = '';
    document.querySelector('.main').classList.add('game-mode');
    document.getElementById('list-container').style.display = 'none';
    document.getElementById('game-container').style.display = '';
    if(currentGame === 'dice'){ initDiceGame(); }
    else if(currentGame === 'welfare'){ initWelfarePage(); }
  });
});
document.getElementById('search-input').addEventListener('input', function(e){
  currentSearch = e.target.value.trim();
  render();
});

/* ====== Mobile sidebar drawer ====== */
function toggleSidebar(force){
  var sb = document.querySelector('.sidebar');
  var ov = document.querySelector('.sidebar-overlay');
  if(!sb || !ov) return;
  var bool = (typeof force === 'boolean') ? force : !sb.classList.contains('open');
  sb.classList.toggle('open', bool);
  ov.classList.toggle('show', bool);
}
var sidebarEl = document.querySelector('.sidebar');
if(sidebarEl){
  sidebarEl.addEventListener('click', function(e){
    if(e.target.closest('.nav-item') && window.innerWidth <= 768){
      toggleSidebar(false);
    }
  });
}

/* ====== Modal ====== */
function openModal(id){
  document.getElementById('modal-mask').classList.add('show');
  document.getElementById('creds-extra').innerHTML = '';
  if(id){
    var l = links.find(function(x){return x.id===id;});
    document.getElementById('modal-title').textContent = '编辑地址';
    document.getElementById('link-id').value = l.id;
    document.getElementById('link-name').value = l.name||'';
    document.getElementById('link-url').value = l.url||'';
    document.getElementById('link-tags').value = l.tags||'';
    document.getElementById('link-desc').value = l.desc||'';
    if(l.creds && l.creds.length>0){
      document.getElementById('link-user').value = l.creds[0].user||'';
      document.getElementById('link-pass').value = l.creds[0].pass||'';
      for(var i=1;i<l.creds.length;i++){
        addCredsRow(l.creds[i].user, l.creds[i].pass);
      }
    } else {
      document.getElementById('link-user').value = l.user||'';
      document.getElementById('link-pass').value = l.pass||'';
    }
    editingType = l.type || 'website';
  } else {
    document.getElementById('modal-title').textContent = '添加地址';
    document.getElementById('link-form').reset();
    document.getElementById('link-id').value = '';
    document.getElementById('link-user').value = '';
    document.getElementById('link-pass').value = '';
    editingType = 'website';
  }
  syncTypePicker();
  setTimeout(function(){document.getElementById('link-name').focus();},50);
}
function closeModal(){
  document.getElementById('modal-mask').classList.remove('show');
}
document.getElementById('modal-mask').addEventListener('click', function(e){
  if(e.target.id === 'modal-mask') closeModal();
});
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){ closeModal(); closeBatchModal(); closeCredsModal(); }
});

/* type picker */
document.getElementById('type-picker').addEventListener('click', function(e){
  if(e.target.classList.contains('type-opt')){
    editingType = e.target.dataset.type;
    syncTypePicker();
  }
});
function syncTypePicker(){
  document.querySelectorAll('.type-opt').forEach(function(o){
    o.classList.toggle('active', o.dataset.type === editingType);
  });
}

/* ====== CRUD ====== */
function saveLink(e){
  e.preventDefault();
  var id = document.getElementById('link-id').value;
  var creds = [];
  var u = document.getElementById('link-user').value.trim();
  var p = document.getElementById('link-pass').value.trim();
  if(u || p) creds.push({user:u, pass:p});
  var extraRows = document.querySelectorAll('#creds-extra .creds-extra-row');
  extraRows.forEach(function(row){
    var eu = row.querySelector('.cred-s-user').value.trim();
    var ep = row.querySelector('.cred-s-pass').value.trim();
    if(eu || ep) creds.push({user:eu, pass:ep});
  });
  var data = {
    name: document.getElementById('link-name').value.trim(),
    url: document.getElementById('link-url').value.trim(),
    type: editingType,
    tags: document.getElementById('link-tags').value.trim(),
    creds: creds,
    desc: document.getElementById('link-desc').value.trim(),
  };
  if(!data.name || !data.url){
    toast('请填写名称和网址');
    return false;
  }
  if(id){
    var idx = links.findIndex(function(l){return l.id===id;});
    links[idx] = Object.assign({}, links[idx], data, {updatedAt: Date.now()});
    toast('已更新');
  } else {
    links.unshift(Object.assign({}, data, {id:genId(), starred:false, createdAt:Date.now(), updatedAt:Date.now()}));
    toast('已添加');
  }
  saveData();
  closeModal();
  render();
  return false;
}

function editLink(id){ openModal(id); }

function addCredsRow(u, p){
  var d = document.getElementById('creds-extra');
  var div = document.createElement('div');
  div.className = 'creds-extra-row';
  div.innerHTML = '<input class="cred-s-user form-control" value="'+(u||'')+'" placeholder="账号">'+
    '<input class="cred-s-pass form-control" value="'+(p||'')+'" placeholder="密码">'+
    '<button class="btn btn-sm btn-ghost" type="button" onclick="this.parentElement.remove()">×</button>';
  d.appendChild(div);
}

function deleteLink(id){
  var l = links.find(function(x){return x.id===id;});
  if(!l) return;
  if(!confirm('确定删除「'+l.name+'」吗？此操作不可撤销。')) return;
  links = links.filter(function(x){return x.id!==id;});
  saveData();
  render();
  toast('已删除');
}

function toggleStar(id){
  var l = links.find(function(x){return x.id===id;});
  l.starred = !l.starred;
  saveData();
  render();
  toast(l.starred ? '已收藏 ★' : '已取消收藏');
}

function copyUrl(id){
  var l = links.find(function(x){return x.id===id;});
  navigator.clipboard.writeText(normalizeUrl(l.url)).then(function(){
    toast('网址已复制');
  }).catch(function(){toast('复制失败');});
}

function copyCreds(id){
  showCreds(id);
}

function showCreds(id){
  var l = links.find(function(x){return x.id===id;});
  if(!l) return;
  var body = document.getElementById('creds-body');
  var html = '';
  var list = l.creds || [];
  if(l.user && (!list || !list.length)){ list = [{user:l.user||'', pass:l.pass||''}]; }
  list.forEach(function(c, i){
    var escU = escapeHtml(c.user||'');
    var escP = escapeHtml(c.pass||'');
    html+='<div class="creds-group">';
    if(list.length>1){ html+='<div class="creds-group-title">账号 '+(i+1)+'</div>'; }
    html+='<div class="creds-pair">';
    html+='<div><div class="creds-label">账号</div><div class="creds-val" onclick="copyField(this,\''+escU.replace(/'/g,"\\'")+'\')"><span>'+(escU||'—')+'</span><span class="copy-hint">点击复制</span></div></div>';
    html+='<div><div class="creds-label">密码</div><div class="creds-val" onclick="copyField(this,\''+escP.replace(/'/g,"\\'")+'\')"><span>'+(escP||'—')+'</span><span class="copy-hint">点击复制</span></div></div>';
    html+='</div></div>';
  });
  if(!html){ html='<div style="text-align:center;color:var(--text-muted);padding:20px">无账号信息</div>'; }
  body.innerHTML = html;
  document.getElementById('creds-mask').classList.add('show');
}

function closeCredsModal(){
  document.getElementById('creds-mask').classList.remove('show');
}

function copyField(el, val){
  navigator.clipboard.writeText(val).then(function(){
    el.classList.add('copied');
    setTimeout(function(){el.classList.remove('copied');}, 1200);
    toast('已复制');
  }).catch(function(){toast('复制失败');});
}

document.getElementById('creds-mask').addEventListener('click', function(e){
  if(e.target.id === 'creds-mask') closeCredsModal();
});

/* ====== Import / Export ====== */
function importLinks(data){
  var added = 0;
  var merged = 0;
  var skipped = 0;
  var urlIndex = {};
  links.forEach(function(link){
    var key = getUrlKey(link.url);
    if(key && !urlIndex[key]) urlIndex[key] = link;
  });
  data.forEach(function(item){
    if(!item || !item.name || !item.url){
      skipped++;
      return;
    }
    var key = getUrlKey(item.url);
    if(!key){
      skipped++;
      return;
    }
    var incomingTags = normalizeTags(item.tags);
    var incomingCreds = normalizeCreds(item.creds, item.user, item.pass);
    var existing = urlIndex[key];
    if(existing){
      var currentTags = normalizeTags(existing.tags);
      var currentCreds = normalizeCreds(existing.creds, existing.user, existing.pass);
      var nextTags = mergeTags(currentTags, incomingTags);
      var nextCreds = mergeCreds(currentCreds, incomingCreds);
      var changed = nextTags !== currentTags || JSON.stringify(nextCreds) !== JSON.stringify(currentCreds);
      if(!existing.desc && item.desc){ existing.desc = String(item.desc); changed = true; }
      if(item.starred && !existing.starred){ existing.starred = true; changed = true; }
      existing.tags = nextTags;
      existing.creds = nextCreds;
      if(changed){
        existing.updatedAt = Date.now();
        merged++;
      } else {
        skipped++;
      }
      return;
    }
    var link = {
      id:genId(),
      name:String(item.name), url:String(item.url),
      type:TYPE_LABELS[item.type] ? item.type : 'other',
      tags:incomingTags, creds:incomingCreds, desc:String(item.desc||''),
      starred:Boolean(item.starred),
      createdAt:item.createdAt||Date.now(),
      updatedAt:Date.now()
    };
    links.unshift(link);
    urlIndex[key] = link;
    added++;
  });
  return {added:added, merged:merged, skipped:skipped};
}

function exportData(){
  if(links.length === 0){ toast('暂无数据可导出'); return; }
  var name = fileName();
  var blob = new Blob([JSON.stringify(links, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  toast('已导出 ' + links.length + ' 条');
}

function exportDataSafe(){
  if(links.length === 0){ toast('暂无数据可导出'); return; }
  var name = fileName('safe');
  var clean = links.map(function(l){ return {id:l.id, name:l.name, url:l.url, type:l.type, tags:l.tags, desc:l.desc, starred:l.starred, createdAt:l.createdAt, updatedAt:l.updatedAt}; });
  var blob = new Blob([JSON.stringify(clean, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  toast('已导出 ' + clean.length + ' 条（不含账号密码）');
}

function fileName(suffix){
  var d = new Date();
  var pad = function(n){ return String(n).padStart(2,'0'); };
  var ts = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+'_'+pad(d.getMinutes())+'_'+pad(d.getSeconds());
  return '\u7F51\u5740json '+ts+(suffix ? ' ('+suffix+')' : '')+'.json';
}

document.getElementById('import-file').addEventListener('change', function(e){
  var file = e.target.files[0];
  if(!file) return;
  var reader = new FileReader();
  reader.onload = function(ev){
    try{
      var data = JSON.parse(ev.target.result);
      if(!Array.isArray(data)) throw new Error();
      var importResult = importLinks(data);
      saveData();
      render();
      var result = ['新增 '+importResult.added+' 条'];
      if(importResult.merged) result.push('合并 '+importResult.merged+' 条');
      if(importResult.skipped) result.push('跳过 '+importResult.skipped+' 条');
      toast('导入完成：'+result.join('，'));
    }catch(err){
      toast('导入失败：文件格式不正确');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
});

function clearAllData(){
  if(links.length === 0){ toast('没有数据可清空'); return; }
  if(!confirm('⚠️ 确定清空全部 '+links.length+' 条地址吗？\n\n此操作不可撤销，建议先导出备份。')) return;
  if(!confirm('再次确认：真的要全部删除吗？')) return;
  links = [];
  saveData();
  render();
  toast('已清空全部数据');
}

/* ====== Toast ====== */
var toastTimer;
function toast(msg){
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){t.classList.remove('show');}, 2200);
}

/* ====== Seed sample data (first run) ====== */
function restoreDefaultData(){
  localStorage.removeItem(STORAGE_KEY);
  seedIfEmpty();
  loadData();
  render();
  toast('已恢复初始数据');
}
function seedIfEmpty(){
  if(localStorage.getItem(STORAGE_KEY)) return;
  links = [
    {"id":"msftdck0imxu","name":"白嫖机场","url":"https://yes2.xn--mesv7f5toqlp.biz/register?code=HxcCmGrr","type":"website","tags":"VPN，梯子","creds":[],"desc":"有半年套餐，量大管饱","starred":false,"createdAt":1785917839824,"updatedAt":1785917839824},
    {"id":"msftbcnti44l","name":"赔钱机场","url":"https://dash.xn--mes358aby2apfg.site/register?code=hma1GTvH&cover=sfw","type":"tool","tags":"VPN，梯子","creds":[],"desc":"不限时，用完为止","starred":false,"createdAt":1785917746649,"updatedAt":1786008196150},
    {"id":"msfkh8hdbh4l","name":"影视书籍聚合","url":"https://fmhy.net/other/backups","type":"website","tags":"电影，电子书","creds":[],"desc":"","starred":false,"createdAt":1785902904625,"updatedAt":1785902904625},
    {"id":"msefwqa8mm1q","name":"PDF在线工具","url":"https://www.cleverpdf.com/cn","type":"tool","tags":"格式转换","creds":[],"desc":"","starred":false,"createdAt":1785834763280,"updatedAt":1785895772130},
    {"id":"msefs38hv8qe","name":"台风路径预览","url":"https://typhoon.slt.zj.gov.cn","type":"website","tags":"","creds":[],"desc":"","starred":false,"createdAt":1785834546785,"updatedAt":1785834546785},
    {"id":"msedou8wkcdx","name":"学习网站","url":"https://www.xue8nav.com","type":"website","tags":"学习,知网","creds":[],"desc":"","starred":false,"createdAt":1785831035936,"updatedAt":1785831035936},
    {"id":"msedm30w7unq","name":"PDF工具","url":"https://tools.pdf24.org/zh/all-tools","type":"tool","tags":"PDF,格式转换","creds":[],"desc":"","starred":false,"createdAt":1785830907344,"updatedAt":1785830907344},
    {"id":"msedi9uietsj","name":"网站收录","url":"https://qinggongju.com/","type":"tool","tags":"大全","creds":[],"desc":"","starred":false,"createdAt":1785830729562,"updatedAt":1785830737003},
    {"id":"mseddceiets6","name":"工具聚合网站","url":"https://nav.qinight.com","type":"tool","tags":"工具大全","creds":[],"desc":"","starred":false,"createdAt":1785830499594,"updatedAt":1785830499594},
    {"id":"msedaoogg15i","name":"壁纸","url":"https://haowallpaper.com","type":"website","tags":"4k,无需登录","creds":[],"desc":"","starred":false,"createdAt":1785830375536,"updatedAt":1785830375536},
    {"id":"msed7cuqbpf2","name":"文件共享","url":"https://folderport.com/zh","type":"website","tags":"","creds":[],"desc":"即时文件线上传输共享","starred":false,"createdAt":1785830220242,"updatedAt":1785830220242},
    {"id":"msed4c3fb6d2","name":"修理手册","url":"https://zh.ifixit.com/","type":"tool","tags":"电子产品,生活用品","creds":[],"desc":"工具维修，维修指南","starred":false,"createdAt":1785830079291,"updatedAt":1785830116425},
    {"id":"msecza9dpcxx","name":"全端免费观影","url":"hhkan.tv","type":"website","tags":"","creds":[],"desc":"电影，电视剧，免费，APP，网页，TV","starred":false,"createdAt":1785829843633,"updatedAt":1785829855265},
    {"id":"msecprtr73lq","name":"全景故宫","url":"https://pano.dpm.org.cn","type":"website","tags":"","creds":[],"desc":"","starred":false,"createdAt":1785829399839,"updatedAt":1785829399839},
    {"id":"mscm42l554dv","name":"OpenAI API","url":"https://api.openai.com/v1","type":"api","tags":"AI,接口","creds":[],"desc":"大模型接口端点","starred":true,"createdAt":1785228869784,"updatedAt":1785901285114},
    {"id":"mscm42l5eb6m","name":"GitHub","url":"https://github.com","type":"website","tags":"开发,代码托管","creds":[],"desc":"全球最大代码托管平台","starred":true,"createdAt":1785401669784,"updatedAt":1785724251161},
    {"id":"mscm42l5oyf8","name":"高德地图","url":"https://www.amap.com/","type":"website","tags":"","creds":[],"desc":"","starred":false,"createdAt":1785488091648,"updatedAt":1785724251161},
    {"id":"mscm42l5jsii","name":"谷歌地图","url":"https://www.google.co.jp/maps/","type":"website","tags":"","creds":[],"desc":"","starred":false,"createdAt":1785484944030,"updatedAt":1785724251161},
    {"id":"mscm42l5ppsy","name":"steam兑换礼品卡","url":"https://store.steampowered.com/account/redeemwalletcode","type":"website","tags":"steam,兑换礼品卡,CDK","creds":[],"desc":"","starred":false,"createdAt":1785484877503,"updatedAt":1785724251161},
    {"id":"mscm42l5ifvq","name":"小黑盒社区","url":"https://www.xiaoheihe.cn/app/bbs/home","type":"website","tags":"小黑盒,社区","creds":[],"desc":"","starred":false,"createdAt":1785484786464,"updatedAt":1785724251161},
    {"id":"mscm42l5qiri","name":"谷歌地图实景","url":"https://randomstreetview.com/","type":"website","tags":"地图实景","creds":[],"desc":"","starred":false,"createdAt":1785484324238,"updatedAt":1785724251161},
    {"id":"mscm42l5min1","name":"ikunnVPN","url":"ikuuu.win","type":"tool","tags":"VPN","creds":[],"desc":"","starred":false,"createdAt":1785484153079,"updatedAt":1785724251161},
    {"id":"mscm42l5fkjk","name":"网址管理线上地址","url":"https://webbelief.netlify.app/","type":"tool","tags":"书签,网址管理","creds":[],"desc":"","starred":false,"createdAt":1785484019960,"updatedAt":1785724251161},
    {"id":"mscm42l58wg5","name":"Netlify","url":"https://app.netlify.com/projects/webbelief/overview","type":"tool","tags":"部署","creds":[],"desc":"","starred":false,"createdAt":1785483954689,"updatedAt":1785901285114},
    {"id":"mscm42l5gl1d","name":"谷歌浏览器下载","url":"https://google.cn/chrome/fallback/","type":"website","tags":"谷歌浏览器,下载","creds":[],"desc":"","starred":false,"createdAt":1785483248271,"updatedAt":1785724251161},
    {"id":"mscm42l5cj64","name":"Grok","url":"https://grok.com/","type":"AI","tags":"马斯克","creds":[],"desc":"","starred":false,"createdAt":1785483119417,"updatedAt":1785724251161},
    {"id":"mscm42l5m5xk","name":"小米mimimo","url":"https://aistudio.xiaomimimo.com/#/c","type":"AI","tags":"小米","creds":[],"desc":"填写邀请码 RNM7BW 得10元余额","starred":false,"createdAt":1785482385274,"updatedAt":1785985005439},
    {"id":"mscm42l5wl09","name":"豆包","url":"https://www.doubao.com/chat/","type":"AI","tags":"字节","creds":[],"desc":"","starred":false,"createdAt":1785482909520,"updatedAt":1785724251161},
    {"id":"mscm42l53vtb","name":"DeepSeek","url":"https://chat.deepseek.com/","type":"AI","tags":"","creds":[],"desc":"","starred":false,"createdAt":1785482876697,"updatedAt":1785724251161},
    {"id":"mscm42l587th","name":"chat8","url":"https://idx.funiuba.com/#/2523567","type":"AI","tags":"","creds":[],"desc":"","starred":false,"createdAt":1785482848392,"updatedAt":1785724251161},
    {"id":"mscm42l5r241","name":"Gemini","url":"https://gemini.google.com/app","type":"AI","tags":"Google","creds":[],"desc":"","starred":false,"createdAt":1785482741281,"updatedAt":1785724251161},
    {"id":"mscm42l5mig2","name":"土豆工具","url":"https://toolshu.com/","type":"tool","tags":"","creds":[],"desc":"在线工具","starred":false,"createdAt":1785482589929,"updatedAt":1785724251161},
    {"id":"mscm42l5wyw9","name":"一键激活Windows/office","url":"https://kms.cx/","type":"tool","tags":"","creds":[],"desc":"激活Windows/office","starred":false,"createdAt":1785482504354,"updatedAt":1785724251161},
    {"id":"mscm42l5znjm","name":"鲨鱼辣椒","url":"https://shayulajiao.xyz/profile","type":"zzz","tags":"","creds":[],"desc":"","starred":false,"createdAt":1785482385274,"updatedAt":1785901285115},
    {"id":"mscm42l50blk","name":"77CODE","url":"https://doce.77code.fun/sign-up?aff=15XS","type":"zzz","tags":"","creds":[],"desc":"备用稳定中转","starred":false,"createdAt":1785482385274,"updatedAt":1785901285115},
    {"id":"mscm42l59kk2","name":"GPT生图","url":"https://miku.app.itstudio.club/?invite_code=F5ZAK","type":"AI","tags":"chatGPT","creds":[],"desc":"每日签到可以白嫖，填写邀请码注册得额度，支持模型种类多","starred":false,"createdAt":1785482385274,"updatedAt":1785901285115},
    {"id":"mscm42l5n339","name":"金贝贝","url":"https://downstream.jbbtoken.cn/sign-up?aff=2Upe","type":"zzz","tags":"","creds":[],"desc":"每日十点抢额度红包","starred":false,"createdAt":1785482385274,"updatedAt":1785985005439}
  ];
  saveData();
}

/* ====== Sidebar Collapse ====== */
(function initSidebarCollapse(){
  var COLLAPSE_KEY = 'sidebar_collapse_v1';
  var collapsed = {};
  try{ collapsed = JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}'); }catch(e){}

  var sections = document.querySelectorAll('.nav-section');
  sections.forEach(function(sec, i){
    var title = sec.querySelector('.nav-title');
    if(!title) return;
    var id = title.textContent.trim() || ('sec-'+i);
    // restore
    if(collapsed[id]) sec.classList.add('collapsed');
    // toggle
    title.addEventListener('click', function(){
      sec.classList.toggle('collapsed');
      collapsed[id] = sec.classList.contains('collapsed');
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsed));
    });
  });
})();

/* ====== Init ====== */
seedIfEmpty();
loadData();
render();
