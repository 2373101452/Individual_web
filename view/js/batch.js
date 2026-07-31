/* ====== Batch Add (table) ====== */
function esc(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

var DD_TYPES = [
  {key:'website', label:'网站'},
  {key:'zzz', label:'中转站'},
  {key:'AI', label:'AI相关'},
  {key:'tool', label:'工具'},
  {key:'database', label:'技术栈'},
  {key:'api', label:'API 接口'},
  {key:'server', label:'服务器'},
  {key:'other', label:'其他'},
];

var BATCH_SAMPLES = [
  {name:'', url:'', type:'website', tags:'', user:'', pass:'', desc:''},
  {name:'', url:'', type:'website', tags:'', user:'', pass:'', desc:''},
];

function openBatchModal(){
  document.getElementById('batch-mask').classList.add('show');
  renderBatchTable();
}
function closeBatchModal(){
  document.getElementById('batch-mask').classList.remove('show');
}
function renderBatchTable(){
  document.getElementById('batch-tbody').innerHTML = '';
  BATCH_SAMPLES.forEach(function(d){ addBatchRow(d); });
  renderBatchPreview();
}
function addBatchRow(data){
  data = data || {};
  var selType = data.type || 'other';
  var tr = document.createElement('tr');
  tr.className = 'batch-row';
  tr.innerHTML =
    '<td><input class="bt-input" data-f="name" value="'+esc(data.name||'')+'" placeholder="名称"></td>'+
    '<td><input class="bt-input" data-f="url" value="'+esc(data.url||'')+'" placeholder="https://..."></td>'+
    '<td><select class="bt-input" data-f="type">'+
      DD_TYPES.map(function(t){ return '<option value="'+t.key+'"'+(t.key===selType?' selected':'')+'>'+t.label+'</option>'; }).join('')+
    '</select></td>'+
    '<td><input class="bt-input" data-f="tags" value="'+esc(data.tags||'')+'" placeholder="标签"></td>'+
    '<td><input class="bt-input" data-f="user" value="'+esc(data.user||'')+'" placeholder="账号"></td>'+
    '<td><input class="bt-input" data-f="pass" value="'+esc(data.pass||'')+'" placeholder="密码"></td>'+
    '<td><input class="bt-input" data-f="desc" value="'+esc(data.desc||'')+'" placeholder="备注"></td>'+
    '<td><button class="bt-del" type="button" onclick="removeBatchRow(this)">×</button></td>';
  document.getElementById('batch-tbody').appendChild(tr);
  renderBatchPreview();
}
function removeBatchRow(btn){
  var tr = btn.closest('.batch-row');
  if(tr) tr.remove();
  renderBatchPreview();
}
function readBatchRows(){
  var rows = Array.prototype.slice.call(document.querySelectorAll('.batch-row'));
  var out = [];
  rows.forEach(function(r){
    function g(f){ return r.querySelector('[data-f="'+f+'"]').value.trim(); }
    var name = g('name'), url = g('url');
    if(!name || !url) return;
    out.push({ name:name, url:url, type:g('type'), tags:g('tags'), user:g('user'), pass:g('pass'), desc:g('desc'), id:genId(), starred:false, createdAt:Date.now(), updatedAt:Date.now() });
  });
  return out;
}
function renderBatchPreview(){
  var items = readBatchRows();
  var box = document.getElementById('batch-preview');
  var cnt = document.getElementById('batch-count');
  if(!items.length){
    cnt.textContent = '';
    box.innerHTML = '<div class="batch-empty">表格为空，点「添加一行」继续，或从示例行开始</div>';
    return;
  }
  cnt.textContent = '（'+items.length+' 条）';
  box.innerHTML = '<div class="batch-pv">' + items.map(function(l){
    return '<div class="batch-pv-item"><span class="type-badge t-'+l.type+'">'+TYPE_LABELS[l.type]+'</span> '+escapeHtml(l.name)+' · '+escapeHtml(l.url)+'</div>';
  }).join('') + '</div>';
}
function doBatchAdd(){
  var items = readBatchRows();
  if(!items.length){ toast('请先在表格中填写至少一条有效地址'); return; }
  links.unshift.apply(links, items);
  saveData();
  closeBatchModal();
  render();
  toast('已批量添加 ' + items.length + ' 条地址');
}
document.getElementById('batch-tbody').addEventListener('input', renderBatchPreview);
document.getElementById('batch-mask').addEventListener('click', function(e){ if(e.target.id === 'batch-mask') closeBatchModal(); });
