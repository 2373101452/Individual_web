/* ==============================
   猜大小 — 三骰子游戏
   ============================== */
var diceBalance = 10;
var diceBet = 0;
var diceRolling = false;
var diceHistory = [];

var DICE_HISTORY_KEY = 'dice_history_v1';
var DICE_BALANCE_KEY = 'dice_balance_v1';

function loadDiceBalance(){
  try{
    var v = parseInt(localStorage.getItem(DICE_BALANCE_KEY));
    if(isNaN(v) || v < 0) v = 10;
    diceBalance = v;
  }catch(e){ diceBalance = 10; }
}
function saveDiceBalance(){
  localStorage.setItem(DICE_BALANCE_KEY, diceBalance);
}
function loadDiceHistory(){
  try{
    diceHistory = JSON.parse(localStorage.getItem(DICE_HISTORY_KEY) || '[]');
  }catch(e){ diceHistory = []; }
}
function saveDiceHistory(){
  localStorage.setItem(DICE_HISTORY_KEY, JSON.stringify(diceHistory));
}
function clearDiceHistory(){
  diceHistory = [];
  saveDiceHistory();
  renderDiceHistory();
}

function initDiceGame(){
  loadDiceBalance();
  loadDiceHistory();
  var container = document.getElementById('game-container');
  container.innerHTML = [
    '<div class="game-wrap game-dice">',
      '<div class="game-header">',
        '<h2 class="game-title">猜大小</h2>',
        '<div class="dice-balance">余额：<span class="dice-bal-num" id="diceBalance">'+diceBalance+'</span> 币</div>',
      '</div>',
      '<div class="dice-rules">规则：三枚骰子，猜"大"(11-17)或"小"(4-10)；豹子（三枚同数）通吃；猜中返还双倍；默认余额10币</div>',
      '<div class="dice-layout">',
        // 左侧 — 游戏操作
        '<div class="dice-left">',
          '<div class="dice-stage">',
            '<div class="dice-row" id="diceRow">',
              '<div class="dice-face"><span class="dice-dot">?</span></div>',
              '<div class="dice-face"><span class="dice-dot">?</span></div>',
              '<div class="dice-face"><span class="dice-dot">?</span></div>',
            '</div>',
            '<div class="dice-result" id="diceResult"></div>',
          '</div>',
          '<div class="dice-actions">',
            '<div class="dice-choice">',
              '<button class="game-btn btn-pick" id="btnBig" onclick="dicePick(\'big\')"><span class="btn-pick-main">押 大</span><small>点数 11 ~ 17</small></button>',
              '<button class="game-btn btn-pick" id="btnSmall" onclick="dicePick(\'small\')"><span class="btn-pick-main">押 小</span><small>点数 4 ~ 10</small></button>',
            '</div>',
            '<div class="dice-bet-row">',
              '<label class="dice-label">下注金额</label>',
              '<div class="dice-bet-input">',
                '<button class="game-btn game-btn-sm" onclick="diceAdjustBet(-1)">−</button>',
                '<input type="number" class="dice-input" id="diceBetInput" value="1" min="1" max="'+diceBalance+'" onchange="diceValidateBet()">',
                '<button class="game-btn game-btn-sm" onclick="diceAdjustBet(1)">+</button>',
              '</div>',
            '</div>',
            '<button class="game-btn btn-submit" id="btnDiceSubmit" disabled onclick="diceRoll()">开 骰</button>',
            '<button class="game-btn btn-quit" id="btnDiceQuit" style="display:none" onclick="diceQuit()">跳 了</button>',
          '</div>',
        '</div>',
        // 右侧 — 历史记录
        '<div class="dice-right">',
          '<div class="dice-history-head">',
            '<h3 class="dice-history-title">历史记录</h3>',
            '<button class="dice-clear-btn" onclick="clearDiceHistory()">清空</button>',
          '</div>',
          '<div class="dice-history-list" id="diceHistoryList"></div>',
        '</div>',
      '</div>',
      // 游戏结束遮罩
      '<div class="dice-overlay" id="diceOverlay" style="display:none">',
        '<div class="dice-overlay-text">人生已重开<br>不要再赌了</div>',
      '</div>',
      // 右下角悬浮重开按钮
      '<button class="dice-corner-restart" id="btnDiceCornerRestart" onclick="diceRestart()" title="重开一局">重开</button>',
    '</div>'
  ].join('');
  renderDiceHistory();
  // 默认选中「押 大」
  if(diceBalance > 0){
    document.getElementById('btnBig').classList.add('picked');
    diceBet = 1;
    diceValidateBet();
  }
  // 余额为 0 时显示重开按钮
  if(diceBalance <= 0) showDiceRestart();
}

function showDiceRestart(){
  document.getElementById('btnDiceSubmit').style.display = 'none';
  document.getElementById('btnDiceQuit').style.display = '';
  document.getElementById('btnBig').classList.remove('picked');
  document.getElementById('btnSmall').classList.remove('picked');
  document.getElementById('btnBig').disabled = true;
  document.getElementById('btnSmall').disabled = true;
  document.getElementById('diceBetInput').disabled = true;
}

function hideDiceRestart(){
  document.getElementById('btnDiceSubmit').style.display = '';
  document.getElementById('btnDiceQuit').style.display = 'none';
  document.getElementById('btnBig').disabled = false;
  document.getElementById('btnSmall').disabled = false;
  document.getElementById('diceBetInput').disabled = false;
  diceValidateBet();
}

function diceRestart(){
  diceBalance = 10;
  diceHistory = [];
  saveDiceBalance();
  saveDiceHistory();
  initDiceGame();
  // 确保遮罩隐藏
  var ov = document.getElementById('diceOverlay');
  if(ov) ov.style.display = 'none';
}

function diceQuit(){
  // 跳了 — 显示游戏结束遮罩
  document.getElementById('diceOverlay').style.display = '';
  document.getElementById('btnDiceQuit').style.display = 'none';
  // 右下角重开始终可见
  var cr = document.getElementById('btnDiceCornerRestart');
  if(cr) cr.style.opacity = '';
}

function dicePick(choice){
  if(diceRolling) return;
  document.getElementById('btnBig').classList.toggle('picked', choice === 'big');
  document.getElementById('btnSmall').classList.toggle('picked', choice === 'small');
  diceValidateBet();
}

function diceAdjustBet(delta){
  var input = document.getElementById('diceBetInput');
  var v = parseInt(input.value) || 1;
  v = Math.max(1, Math.min(diceBalance, v + delta));
  input.value = v;
  diceBet = v;
}

function diceValidateBet(){
  if(diceRolling) return;
  var input = document.getElementById('diceBetInput');
  var v = parseInt(input.value) || 1;
  v = Math.max(1, Math.min(diceBalance, v));
  input.value = v;
  diceBet = v;
  var picked = document.getElementById('btnBig').classList.contains('picked')
            || document.getElementById('btnSmall').classList.contains('picked');
  document.getElementById('btnDiceSubmit').disabled = !picked || diceBet < 1 || diceBet > diceBalance;
}

function diceRoll(){
  if(diceRolling || diceBalance <= 0) return;
  var picked = document.getElementById('btnBig').classList.contains('picked')
            || document.getElementById('btnSmall').classList.contains('picked');
  if(!picked) return;
  diceValidateBet();
  if(diceBet < 1 || diceBet > diceBalance) return;

  diceRolling = true;
  var isBig = document.getElementById('btnBig').classList.contains('picked');
  document.getElementById('btnDiceSubmit').disabled = true;
  document.getElementById('diceResult').textContent = '';

  // spin animation
  var faces = document.querySelectorAll('.dice-face');
  var interval = setInterval(function(){
    faces.forEach(function(f){
      var n = Math.floor(Math.random()*6)+1;
      f.innerHTML = diceDots(n);
    });
  }, 80);

  setTimeout(function(){
    clearInterval(interval);
    var d1 = Math.floor(Math.random()*6)+1;
    var d2 = Math.floor(Math.random()*6)+1;
    var d3 = Math.floor(Math.random()*6)+1;
    var sum = d1+d2+d3;
    var isBaozi = (d1===d2 && d2===d3);

    faces[0].innerHTML = diceDots(d1);
    faces[1].innerHTML = diceDots(d2);
    faces[2].innerHTML = diceDots(d3);

    var resultEl = document.getElementById('diceResult');
    var outcome, outcomeLabel, change;

    if(isBaozi){
      diceBalance -= diceBet;
      outcome = 'baozi'; outcomeLabel = '豹子通吃'; change = -diceBet;
      resultEl.innerHTML = '<span class="result-lose">豹子！'+d1+','+d2+','+d3+'，通吃！你输了 '+diceBet+' 币</span>';
    } else {
      var actualBig = sum >= 11;
      var win = (isBig === actualBig);
      if(win){
        diceBalance += diceBet;
        outcome = 'win'; outcomeLabel = '猜对'; change = +diceBet;
        resultEl.innerHTML = '<span class="result-win">'+d1+','+d2+','+d3+' 和='+sum+'（'+(actualBig?'大':'小')+'），你猜对了！赢得 '+diceBet+' 币</span>';
      } else {
        diceBalance -= diceBet;
        outcome = 'lose'; outcomeLabel = '猜错'; change = -diceBet;
        resultEl.innerHTML = '<span class="result-lose">'+d1+','+d2+','+d3+' 和='+sum+'（'+(actualBig?'大':'小')+'），你猜错了，输掉 '+diceBet+' 币</span>';
      }
    }

    // 记录历史
    diceHistory.unshift({
      time: Date.now(),
      dice: [d1, d2, d3],
      sum: sum,
      choice: isBig ? '大' : '小',
      outcome: outcome,
      outcomeLabel: outcomeLabel,
      bet: diceBet,
      change: change,
      balance: diceBalance
    });
    if(diceHistory.length > 50) diceHistory = diceHistory.slice(0, 50);
    saveDiceHistory();
    renderDiceHistory();

    if(diceBalance <= 0) diceBalance = 0;
    saveDiceBalance();
    document.getElementById('diceBalance').textContent = diceBalance;
    document.getElementById('diceBetInput').max = diceBalance;

    diceRolling = false;
    diceValidateBet();

    if(diceBalance <= 0){
      showDiceRestart();
    }
  }, 800);
}

function diceDots(n){
  var patterns = {
    1:'<span class="dot c">●</span>',
    2:'<span class="dot tr">●</span><span class="dot bl">●</span>',
    3:'<span class="dot tr">●</span><span class="dot c">●</span><span class="dot bl">●</span>',
    4:'<span class="dot tl">●</span><span class="dot tr">●</span><span class="dot bl">●</span><span class="dot br">●</span>',
    5:'<span class="dot tl">●</span><span class="dot tr">●</span><span class="dot c">●</span><span class="dot bl">●</span><span class="dot br">●</span>',
    6:'<span class="dot tl">●</span><span class="dot tr">●</span><span class="dot ml">●</span><span class="dot mr">●</span><span class="dot bl">●</span><span class="dot br">●</span>'
  };
  return patterns[n] || n;
}

function renderDiceHistory(){
  var list = document.getElementById('diceHistoryList');
  if(!list) return;
  if(diceHistory.length === 0){
    list.innerHTML = '<div class="dice-history-empty">暂无记录</div>';
    return;
  }
  var html = '';
  diceHistory.forEach(function(h){
    var outcomeClass = h.outcome === 'win' ? 'h-win' : 'h-lose';
    var outcomeIcon = h.outcome === 'win' ? '✓' : (h.outcome === 'baozi' ? '☠' : '✗');
    var changeStr = h.change >= 0 ? '+'+h.change : ''+h.change;
    var timeStr = formatDiceTime(h.time);
    var diceStr = h.dice[0]+'·'+h.dice[1]+'·'+h.dice[2]+' = '+h.sum;
    html += '<div class="dice-h-item '+outcomeClass+'">'
      + '<div class="dice-h-top">'
        + '<span class="dice-h-choice">猜「'+h.choice+'」</span>'
        + '<span class="dice-h-change">'+changeStr+'</span>'
      + '</div>'
      + '<div class="dice-h-mid">'
        + '<span class="dice-h-dice">🎲 '+diceStr+'</span>'
        + '<span class="dice-h-icon">'+outcomeIcon+'</span>'
      + '</div>'
      + '<div class="dice-h-bot">'
        + '<span class="dice-h-label">'+h.outcomeLabel+'</span>'
        + '<span class="dice-h-time">'+timeStr+'</span>'
      + '</div>'
    + '</div>';
  });
  list.innerHTML = html;
}

function formatDiceTime(ts){
  var d = new Date(ts);
  var pad = function(n){ return String(n).padStart(2,'0'); };
  return pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
}
