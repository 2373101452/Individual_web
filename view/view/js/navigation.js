(function(){
  if(document.getElementById("list-container")){document.body.classList.add("bookmark-home");return;}
  var script=document.currentScript;
  var home=new URL('../index.html',script.src).href;
  var menu=new URL('../menu/index.html',script.src).href;
  var path=location.pathname;
  var fallback=path.indexOf('/menu/')!==-1&&!path.endsWith('/menu/index.html')?menu:home;
  if(path.endsWith('/index.html')&&path.indexOf('/menu/')===-1)fallback=menu;
  if(document.querySelector(".menu-list")){document.body.classList.add("menu-home");document.querySelectorAll("a.header-back").forEach(function(a){a.remove();});return;}
  var header=document.querySelector('.app-header, .play-header, .navbar');
  document.querySelectorAll('a.header-back, .play-header > a').forEach(function(a){a.remove();});
  var back=document.createElement('a');back.className='page-back';back.href=fallback;back.setAttribute('aria-label','返回上一页');back.textContent='← 返回';
  back.addEventListener('click',function(e){
    if(document.referrer){try{var previous=new URL(document.referrer);if(previous.origin===location.origin&&previous.href!==location.href&&history.length>1){e.preventDefault();history.back();}}catch(ignore){}}
  });
  if(header){header.insertBefore(back,header.firstChild);}else{var bar=document.createElement('div');bar.className='page-back-bar';bar.appendChild(back);document.body.insertBefore(bar,document.body.firstChild);}
})();
