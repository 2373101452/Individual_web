(function(){
 'use strict';
 var assetBase='assets/totoro/';
 var weatherLabels={sun:'晴日 · 草木与微风',rain:'雨夜 · 听雨落在伞上',night:'月色 · 种一颗小小愿望'};
 document.querySelectorAll('.weather-switch button').forEach(function(button){button.addEventListener('click',function(){var mode=button.dataset.weather;document.body.dataset.weather=mode;document.getElementById('atmosphere').textContent=weatherLabels[mode];document.querySelectorAll('.weather-switch button').forEach(function(b){var selected=b===button;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});});});
 var dialog=document.getElementById('postcard-dialog');
 document.querySelectorAll('.scene').forEach(function(card){card.addEventListener('click',function(){var image=document.getElementById('postcard-image');image.src=card.querySelector('img').src;image.alt=card.querySelector('img').alt;document.getElementById('postcard-title').textContent=card.dataset.title;document.getElementById('postcard-caption').textContent=card.dataset.caption;dialog.showModal();});});
 dialog.querySelector('.dialog-close').addEventListener('click',function(){dialog.close();});dialog.addEventListener('click',function(event){if(event.target===dialog){var bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();}});
 var stops=[{image:'001',title:'乡间旧屋',copy:'推开木门，把夏天搬进家里。先向屋檐和庭院打个招呼，再听听角落里有没有小精灵的脚步。'},{image:'025',title:'大樟树',copy:'沿着树根走进绿荫，把步子放轻一点。毛茸茸的邻居正在午睡，树叶替它遮着阳光。'},{image:'030',title:'雨夜车站',copy:'一把伞，两位安静等候的邻居。雨滴落下的声音，也能成为今晚最有趣的小事。'},{image:'045',title:'风的方向',copy:'坐进温暖明亮的车厢，跟着猫巴士越过田野。车窗外的风景，正把思念带往远方。'}];
 document.querySelectorAll('.station').forEach(function(button){button.addEventListener('click',function(){var index=Number(button.dataset.station),stop=stops[index];document.querySelectorAll('.station').forEach(function(b){b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});var image=document.getElementById('station-image');image.src=assetBase+'totoro'+stop.image+'.jpg';image.alt=stop.title+'的电影画面';document.getElementById('station-number').textContent='STOP 0'+(index+1);document.getElementById('station-title').textContent=stop.title;document.getElementById('station-copy').textContent=stop.copy;});button.setAttribute('aria-pressed',String(button.classList.contains('active')));});
 var seedButton=document.getElementById('seed-button'),seedMessages=['把小小的愿望种下，明天会长出一点绿意。','森林替你收好了今天的烦恼。','请带着这枚橡果，继续相信温柔的奇迹。'],seedCount=0;
 seedButton.addEventListener('click',function(){document.getElementById('seed-response').textContent=seedMessages[seedCount++%seedMessages.length];if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;var rect=seedButton.getBoundingClientRect();for(var i=0;i<6;i++){var seed=document.createElement('span');seed.className='seed-pop';seed.textContent=['🍂','🌱','🌰'][i%3];seed.style.left=(rect.left+rect.width/2)+'px';seed.style.top=rect.top+'px';seed.style.setProperty('--dx',(Math.random()*180-90)+'px');document.body.appendChild(seed);setTimeout(function(s){s.remove();},1600,seed);}});
 var bar=document.querySelector('.reading-progress'),value=document.getElementById('progress-value'),pending=false,scrollTimer;
 function update(){var max=document.documentElement.scrollHeight-innerHeight,p=max>0?Math.min(100,Math.max(0,scrollY/max*100)):100;bar.style.setProperty('--progress',p+'%');bar.setAttribute('aria-valuenow',Math.round(p));value.textContent=Math.round(p)+'%';pending=false;}
 addEventListener('scroll',function(){bar.classList.add('is-scrolling');clearTimeout(scrollTimer);scrollTimer=setTimeout(function(){bar.classList.remove('is-scrolling');},160);if(!pending){pending=true;requestAnimationFrame(update);}},{passive:true});addEventListener('resize',update);addEventListener('load',update);update();
})();

/* 灰尘小精灵光标与点击反馈。 */
(function(){
 var sprite='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#252b29" d="M16 1l2 4 4-3 1 5 5-1-1 5 4 2-4 3 4 3-5 2 1 5-5-1-2 5-3-3-3 4-2-5-5 2 1-5-5-1 3-4-4-3 5-2-2-5 5 1 1-5 4 3z"/><ellipse cx="12" cy="14" rx="4" ry="5" fill="white"/><ellipse cx="21" cy="14" rx="4" ry="5" fill="white"/><circle cx="13" cy="15" r="2"/><circle cx="20" cy="15" r="2"/></svg>';
 var style=document.createElement('style');style.textContent='@media(hover:hover) and (pointer:fine){html,body,body *{cursor:url("data:image/svg+xml,'+encodeURIComponent(sprite)+'") 16 16,auto!important}}';document.head.appendChild(style);
 var reduced=matchMedia('(prefers-reduced-motion: reduce)'),last=0;
 document.addEventListener('pointerdown',function(event){
  if(event.button!==0||event.isPrimary===false||Date.now()-last<90)return;last=Date.now();
  var host=document.querySelector('dialog[open]')||document.body;
  var ring=document.createElement('span');ring.className='soot-click-ring';ring.setAttribute('aria-hidden','true');ring.style.left=event.clientX+'px';ring.style.top=event.clientY+'px';host.appendChild(ring);setTimeout(function(){ring.remove();},650);
  if(reduced.matches)return;
  for(var i=0;i<7;i++){
   var particle=document.createElement('span');particle.className='soot-click-particle '+(i%2?'soot-star':'soot-friend');particle.setAttribute('aria-hidden','true');particle.innerHTML=i%2?'✦':sprite;particle.style.left=event.clientX+'px';particle.style.top=event.clientY+'px';var angle=Math.PI*2*i/7;particle.style.setProperty('--sx',Math.cos(angle)*(28+Math.random()*30)+'px');particle.style.setProperty('--sy',(Math.sin(angle)*38-30)+'px');particle.style.setProperty('--spin',(Math.random()*80-40)+'deg');host.appendChild(particle);setTimeout(function(p){p.remove();},850,particle);
  }
 },{passive:true});
})();
