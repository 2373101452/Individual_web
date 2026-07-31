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
    container.innerHTML = [
      '<div class="empty">',
        '<div class="empty-icon">📭</div>',
        '<h3>'+(currentSearch ? '没有匹配的地址' : '还没有地址')+'</h3>',
        '<p>'+(currentSearch ? '换个关键词试试' : '点击"添加地址"开始管理你的网络资源')+'</p>',
        '<button class="btn btn-primary" onclick="openModal()">+ 添加第一个地址</button>',
      '</div>'
    ].join('');
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
    item.classList.add('active');
    currentFilter = item.dataset.filter;
    render();
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
      var added = 0;
      data.forEach(function(item){
        if(item.name && item.url){
          var c = item.creds || [];
          if(!item.creds && (item.user || item.pass)) c = [{user:item.user||'', pass:item.pass||''}];
          links.unshift({
            id:genId(),
            name:item.name, url:item.url,
            type:item.type||'other',
            tags:item.tags||'', creds:c, desc:item.desc||'',
            starred:item.starred||false,
            createdAt:item.createdAt||Date.now(),
            updatedAt:Date.now()
          });
          added++;
        }
      });
      saveData();
      render();
      toast('已导入 '+added+' 条');
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
function seedIfEmpty(){
  if(localStorage.getItem(STORAGE_KEY)) return;
  var now = Date.now();
  links = [
    {id:genId(), name:'GitHub', url:'https://github.com', type:'website', tags:'开发,代码托管', creds:[], desc:'全球最大代码托管平台', starred:true, createdAt:now-86400000, updatedAt:now-86400000},
    {id:genId(), name:'OpenAI API', url:'https://api.openai.com/v1', type:'api', tags:'AI,接口', creds:[{user:'sk-xxx', pass:''}], desc:'大模型接口端点', starred:true, createdAt:now-259200000, updatedAt:now-3600000},
    {id:genId(), name:'MDN Web Docs', url:'https://developer.mozilla.org', type:'website', tags:'文档,前端', creds:[], desc:'Web 开发权威文档', starred:false, createdAt:now-172800000, updatedAt:now-172800000},
    {id:genId(), name:'生产服务器', url:'192.168.1.100', type:'server', tags:'生产环境,SSH', creds:[{user:'root', pass:'••••••'},{user:'admin', pass:'admin123'}], desc:'主应用服务器，Ubuntu 22.04', starred:false, createdAt:now-345600000, updatedAt:now-345600000},
  ];
  saveData();
}

/* ====== Init ====== */
seedIfEmpty();
loadData();
render();
