/* ====== Notifications (bell) ====== */
var notifications = [
  {icon:'➕', title:'新增地址：点击顶部「新增地址」按钮，填写名称、网址、账号后保存即可', time:'使用说明', read:false},
  {icon:'🔍', title:'搜索筛选：在顶部搜索框输入关键词，列表会实时过滤匹配结果', time:'使用说明', read:false},
  {icon:'⭐', title:'收藏分类：点击卡片上的星标标记常用项，左侧导航可切换分类视图', time:'使用说明', read:false},
  {icon:'📦', title:'导入导出：右上角可将当前数据导出为 JSON 备份，也可导入历史备份', time:'使用说明', read:false},
  {icon:'🔒', title:'本地存储：所有数据仅保存在本机浏览器，无任何网络请求，清除浏览器数据会丢失', time:'使用说明', read:false},
  {icon:'🎲', title:'猜大小：纯读博', time:'使用说明', read:false},
];

function renderBell(){
  var list = document.getElementById('bellList');
  var badge = document.getElementById('bellBadge');
  if(!notifications.length){
    list.innerHTML = '<div class="bell-empty"><span class="e-ico">📭</span>暂无使用说明</div>';
    badge.style.display = 'none';
    return;
  }
  var unread = notifications.filter(function(n){ return !n.read; }).length;
  if(unread > 0){ badge.style.display = 'flex'; badge.textContent = unread; }
  else { badge.style.display = 'none'; }
  list.innerHTML = notifications.map(function(n){
    return '<div class="bell-item '+(n.read?'':'bell-unread')+'">'+
      '<div class="bell-ico">'+n.icon+'</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div class="bell-item-title">'+n.title+'</div>'+
        '<div class="bell-item-time">'+n.time+'</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

function toggleBell(force){
  var panel = document.getElementById('bellPanel');
  var show = (typeof force === 'boolean') ? force : !panel.classList.contains('show');
  panel.classList.toggle('show', show);
  if(show){
    notifications.forEach(function(n){ n.read = true; });
    renderBell();
  }
}
function clearBell(){
  notifications = [];
  renderBell();
  toggleBell(false);
}
document.getElementById('bellBtn').addEventListener('click', function(e){
  e.stopPropagation();
  toggleBell();
});
document.addEventListener('click', function(e){
  if(!e.target.closest('#bellPanel') && !e.target.closest('#bellBtn')) toggleBell(false);
});

renderBell();
