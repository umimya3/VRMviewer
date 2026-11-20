(function(V){
"use strict";

if (!V || V._uiBooted) return;
V._uiBooted = true;

/* ================= stale-copy check ================= */
function checkStaleCopy(){
  if (typeof fetch !== 'function') return;
  try {
    fetch('index.html', { cache:'no-store' }).then(function(r){
      return r && r.ok ? r.text() : null;
    }).then(function(t){
      if (!t || t.indexOf('<title>VRMビューワー</title>') < 0) return;
      var m = t.match(/JSビルド\s+([0-9.-]+)/);
      if (!m || m[1] === V.BUILD_ID) return;
      var bar = document.getElementById('stalebar');
      if (!bar) return;
      document.getElementById('stale-running').textContent = V.BUILD_ID;
      document.getElementById('stale-served').textContent = m[1];
      bar.hidden = false;
    }).catch(function(){});
  } catch(e){}
}
window.addEventListener('load', function(){ setTimeout(checkStaleCopy, 600); });
var staleCloseBtn = document.getElementById('stale-close');
if (staleCloseBtn) staleCloseBtn.addEventListener('click', function(){
  document.getElementById('stalebar').hidden = true;
});

/* ================= Panel & Tabs ================= */
var panel = document.getElementById('panel');
var panelToggle = document.getElementById('paneltoggle');
var debugFab = document.getElementById('debugFab');
var motionPlayerWrap = document.getElementById('motion-player-wrap');

function setPanelOpen(open){
  panel.classList.toggle('closed', !open);
  document.body.classList.toggle('panel-open', open);
  panelToggle.setAttribute('aria-expanded', String(open));
}
panelToggle.addEventListener('click', function(){ setPanelOpen(false); });
if (debugFab) debugFab.addEventListener('click', function(){ setPanelOpen(panel.classList.contains('closed')); });
window.addEventListener('keydown', function(e){
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  if (e.key === 'h' || e.key === 'H') setPanelOpen(panel.classList.contains('closed'));
  if (e.key === ' ' && V.motion){ e.preventDefault(); V.toggleMotionPause(); }
  if (e.key === 'Escape' && !panel.classList.contains('closed')) setPanelOpen(false);
});
setPanelOpen(window.innerWidth >= 860);

document.querySelectorAll('.tab-btn').forEach(function(btn){
  btn.addEventListener('click', function(){
    var id = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(function(b){
      var on = b === btn;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll('.tab-pane').forEach(function(p){
      p.classList.toggle('on', p.id === 'tab-' + id);
    });
    if (motionPlayerWrap){
      motionPlayerWrap.hidden = (id !== 'motion' && id !== 'melee');
    }
  });
});

/* ================= Motion Player & Catalog ================= */
var mpNameEl = document.getElementById('mp-name');
var mpTimeEl = document.getElementById('mp-time');
var mpScrubEl = document.getElementById('mp-scrub');
var mpPlayBtn = document.getElementById('mp-play');
var mpRestartBtn = document.getElementById('mp-restart');
var mpStopBtn = document.getElementById('mp-stop');

(function buildMotionButtons(){
  var mainContainer = document.getElementById('motion-groups');
  var meleeContainer = document.getElementById('melee-groups');
  if (mainContainer) mainContainer.innerHTML = '';
  if (meleeContainer) meleeContainer.innerHTML = '';
  if (!V.MOTION_GROUPS) return;

  V.MOTION_GROUPS.forEach(function(grp){
    var target = (grp.tab === 'melee' && meleeContainer) ? meleeContainer : mainContainer;
    if (!target) return;
    var det = document.createElement('details');
    det.className = 'grp';
    if (grp.open) det.open = true;
    var sum = document.createElement('summary');
    sum.textContent = grp.label;
    det.appendChild(sum);
    var row = document.createElement('div');
    row.className = 'row';
    V.MOTION_DEFS.filter(function(m){ return m.group === grp.id; }).forEach(function(m){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'act small';
      btn.dataset.motion = m.id;
      btn.textContent = m.label;
      btn.addEventListener('click', function(){ V.startMotion(m.id); });
      row.appendChild(btn);
    });
    det.appendChild(row);
    target.appendChild(det);
  });
})();

function syncMotionUI(){
  var active = !!V.motion && !V.motionFading;
  document.querySelectorAll('#motion-groups button[data-motion], #melee-groups button[data-motion]').forEach(function(b){
    b.classList.toggle('on', active && V.motion.name === b.dataset.motion);
  });
  mpScrubEl.disabled = !active;
  mpPlayBtn.disabled = !active;
  mpRestartBtn.disabled = !active;
  mpStopBtn.disabled = !active;
  if (!active){
    mpNameEl.textContent = '停止中（ポーズ待機）';
    mpTimeEl.textContent = '0.00s / 0.00s';
    mpScrubEl.value = '0';
    mpPlayBtn.textContent = '⏸ 一時停止';
  } else {
    var def = V.MOTION_MAP[V.motion.name];
    mpNameEl.textContent = (def ? def.label : V.motion.name) + (V.motion.loop ? '（ループ）' : '');
    mpScrubEl.max = String(V.motion.duration);
    var cur = V.motion.loop ? (V.motion.elapsed % V.motion.duration) : Math.min(V.motion.elapsed, V.motion.duration);
    if (!V.motionScrubbing) mpScrubEl.value = cur.toFixed(2);
    mpTimeEl.textContent = cur.toFixed(2) + 's / ' + V.motion.duration.toFixed(2) + 's';
    mpPlayBtn.textContent = V.motionPaused ? '▶ 再開' : '⏸ 一時停止';
  }
}
V.onMotionUiSync = syncMotionUI;

mpPlayBtn.addEventListener('click', function(){ V.toggleMotionPause(); });
mpRestartBtn.addEventListener('click', function(){ V.restartMotion(); });
mpStopBtn.addEventListener('click', function(){ V.stopMotion(false); });
mpScrubEl.addEventListener('pointerdown', function(){ V.motionScrubbing = true; });
window.addEventListener('pointerup', function(){ V.motionScrubbing = false; });
mpScrubEl.addEventListener('input', function(){
  if (!V.motion) return;
  V.motionPaused = true;
  V.motion.elapsed = Number(mpScrubEl.value);
  syncMotionUI();
});
document.querySelectorAll('#mp-speeds button').forEach(function(b){
  b.addEventListener('click', function(){
    V.motionSpeed = Number(b.dataset.speed) || 1;
    document.querySelectorAll('#mp-speeds button').forEach(function(x){
      x.classList.toggle('on', x === b);
    });
  });
});

/* ================= Expressions UI ================= */
var EXPR_LABELS = {
  happy:'笑顔', angry:'怒り', sad:'悲しみ', relaxed:'ほっと', surprised:'驚き',
  sleepy:'眠い', zito:'ジト目', satori:'さとり', fun:'にっこり', dislike:'不機嫌',
  wink:'ウインク', pout:'ふくれっ面', pien:'ぴえん', heart:'ハート目',
  twinkle:'キラキラ目', pero:'てへぺろ',
  blink:'まばたき', blinkLeft:'左まばたき', blinkRight:'右まばたき',
  aa:'あ（口）', ih:'い（口）', ee:'え（口）', ou:'う（口）', oh:'お（口）',
  neutral:'無表情', lookUp:'上を見る', lookDown:'下を見る', lookLeft:'左を見る', lookRight:'右を見る'
};
var EXPR_ORDER = ['happy','angry','sad','surprised','relaxed','sleepy','zito','satori','fun','dislike','wink','pout','pien','heart','twinkle','pero','blink','blinkLeft','blinkRight','aa','ih','ou','ee','oh'];
var EYE_STATE_EXPRS = ['sleepy','zito','satori'];

var exprSlidersEl = document.getElementById('expr-sliders');
function buildExprUI(){
  exprSlidersEl.innerHTML = '';
  var ordered = EXPR_ORDER.filter(function(n){ return V.exprBinds[n]; });
  V.exprNames.forEach(function(n){ if (ordered.indexOf(n) < 0) ordered.push(n); });
  if (!ordered.length){
    exprSlidersEl.innerHTML = '<p class="hint">このモデルに表情モーフは見つかりませんでした。</p>';
    return;
  }
  ordered.forEach(function(name){
    var row = document.createElement('div'); row.className = 'slider';
    var lab = document.createElement('span'); lab.textContent = EXPR_LABELS[name] || name;
    var input = document.createElement('input');
    input.type = 'range'; input.min = '0'; input.max = '100'; input.value = String(Math.round((V.exprValues[name]||0)*100));
    input.setAttribute('aria-label', lab.textContent);
    var out = document.createElement('output'); out.textContent = input.value + '%';
    input.addEventListener('input', function(){
      V.exprValues[name] = input.value / 100;
      out.textContent = input.value + '%';
      syncExprButtons();
    });
    row.appendChild(lab); row.appendChild(input); row.appendChild(out);
    exprSlidersEl.appendChild(row);
    input._exprName = name; input._out = out;
  });
}
function refreshExprSliders(){
  exprSlidersEl.querySelectorAll('input[type="range"]').forEach(function(input){
    var v = Math.round((V.exprValues[input._exprName] || 0) * 100);
    input.value = String(v); input._out.textContent = v + '%';
  });
}
function syncExprButtons(){
  document.querySelectorAll('#expr-presets button').forEach(function(b){
    b.classList.toggle('on', (V.exprValues[b.dataset.expr] || 0) > 0.5);
  });
  document.querySelectorAll('#expr-extra button').forEach(function(b){
    b.classList.toggle('on', (V.exprValues[b.dataset.expr] || 0) > 0.5);
  });
  document.querySelectorAll('#mouth-row button').forEach(function(b){
    var m = b.dataset.mouth;
    b.classList.toggle('on', m ? (V.exprValues[m] || 0) > 0.5 : ['aa','ih','ou','ee','oh'].every(function(k){ return !(k in V.exprValues) || V.exprValues[k] === 0; }));
  });
}
document.querySelectorAll('#expr-presets button').forEach(function(b){
  b.addEventListener('click', function(){
    var name = b.dataset.expr;
    var now = (V.exprValues[name] || 0) > 0.5;
    ['happy','angry','sad','surprised','relaxed'].forEach(function(k){ V.setExpression(k, 0); });
    if (!now) V.setExpression(name, 1);
    refreshExprSliders(); syncExprButtons();
  });
});
document.querySelectorAll('#expr-extra button').forEach(function(b){
  b.addEventListener('click', function(){
    var name = b.dataset.expr;
    if (!(name in V.exprValues)) return;
    var now = (V.exprValues[name] || 0) > 0.5;
    if (EYE_STATE_EXPRS.indexOf(name) >= 0){
      EYE_STATE_EXPRS.forEach(function(k){ V.setExpression(k, 0); });
    }
    V.setExpression(name, now ? 0 : 1);
    refreshExprSliders(); syncExprButtons();
  });
});
document.querySelectorAll('#mouth-row button').forEach(function(b){
  b.addEventListener('click', function(){
    ['aa','ih','ou','ee','oh'].forEach(function(k){ V.setExpression(k, 0); });
    if (b.dataset.mouth) V.setExpression(b.dataset.mouth, 1);
    refreshExprSliders(); syncExprButtons();
  });
});
document.getElementById('expr-reset').addEventListener('click', function(){
  V.clearExpressions();
  refreshExprSliders(); syncExprButtons();
});
document.getElementById('blink-once').addEventListener('click', function(){ V.blinkAnim = 0; });

/* ================= Poses & Joint Sliders ================= */
var jointSlidersEl = document.getElementById('joint-sliders');
Object.keys(V.joints).forEach(function(k){
  var j = V.joints[k];
  var row = document.createElement('div'); row.className = 'slider';
  var lab = document.createElement('span'); lab.textContent = j.label;
  var input = document.createElement('input');
  input.type = 'range'; input.min = String(j.min); input.max = String(j.max); input.value = String(j.val);
  input.setAttribute('aria-label', j.label);
  var out = document.createElement('output'); out.textContent = j.val + '°';
  input.addEventListener('input', function(){
    V.joints[k].val = Number(input.value);
    out.textContent = input.value + '°';
    V.stopMotion(false);
    V.setPoseExtra(null);
    setPose('custom');
  });
  row.appendChild(lab); row.appendChild(input); row.appendChild(out);
  jointSlidersEl.appendChild(row);
  j._input = input; j._out = out;
});
function refreshJointSliders(){
  Object.keys(V.joints).forEach(function(k){
    V.joints[k]._input.value = String(V.joints[k].val);
    V.joints[k]._out.textContent = V.joints[k].val + '°';
  });
}
function setPose(name){
  V.poseName = name;
  document.querySelectorAll('#pose-row button, #sword-pose-row button, #melee-pose-row button').forEach(function(b){
    b.classList.toggle('on', b.dataset.pose === name);
  });
}
function applyPose(name){
  V.stopMotion(false);
  var p = V.POSES[name];
  if (p) Object.keys(p).forEach(function(k){ if (k !== 'extra' && V.joints[k]) V.joints[k].val = p[k]; });
  refreshJointSliders();
  V.setPoseExtra(p && p.extra);
  setPose(name);
}
document.querySelectorAll('#pose-row button, #sword-pose-row button, #melee-pose-row button').forEach(function(b){
  b.addEventListener('click', function(){ applyPose(b.dataset.pose); });
});
document.getElementById('bow-once').addEventListener('click', function(){ if (V.bowAnim < 0) V.bowAnim = 0; });
document.getElementById('jump-once').addEventListener('click', function(){ V.startMotion('jump'); });

/* ================= Tail Mode UI ================= */
document.querySelectorAll('#tail-row button').forEach(function(b){
  b.addEventListener('click', function(){ V.setTailMode(b.dataset.tail); });
});
V.onTailUiSync = function(){
  document.querySelectorAll('#tail-row button').forEach(function(b){
    b.classList.toggle('on', b.dataset.tail === V.tailMode);
  });
  refreshExprSliders(); syncExprButtons();
};

/* ================= Lighting / Toggles / BG / Screenshot / File ================= */
function bindToggle(id, keyName, onChange){
  var el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('click', function(){
    V.toggles[keyName] = !V.toggles[keyName];
    el.setAttribute('aria-pressed', String(V.toggles[keyName]));
    if (onChange) onChange(V.toggles[keyName]);
  });
}
bindToggle('tg-blink', 'blink');
bindToggle('tg-breath', 'breath');
bindToggle('tg-sway', 'sway', function(on){ if (on) V.resetSpringBones(); });
bindToggle('tg-look', 'look');
bindToggle('tg-spin', 'spin', function(on){ V.controls.autoRotate = on; });
bindToggle('tg-wire', 'wire', function(){ V.applyWireframe(); });
bindToggle('tg-shadow', 'shadow', function(on){
  V.keyLight.castShadow = on;
  V.shadowCatcher.visible = on;
});

var tgGrid = document.getElementById('tg-grid');
var gridBtn = document.getElementById('gridbtn');
function setGridVisible(on){
  V.toggles.grid = on;
  if (V.gridHelper) V.gridHelper.visible = on;
  if (tgGrid) tgGrid.setAttribute('aria-pressed', String(on));
  if (gridBtn) gridBtn.classList.toggle('on', on);
}
if (tgGrid) tgGrid.addEventListener('click', function(){ setGridVisible(!V.toggles.grid); });
if (gridBtn) gridBtn.addEventListener('click', function(){ setGridVisible(!V.toggles.grid); });

(function bindLightingUI(){
  var lk = document.getElementById('light-key'), lko = document.getElementById('light-key-out');
  var laz = document.getElementById('light-az'), lazo = document.getElementById('light-az-out');
  var lel = document.getElementById('light-el'), lelo = document.getElementById('light-el-out');
  var lamb = document.getElementById('light-amb'), lambo = document.getElementById('light-amb-out');
  var lexp = document.getElementById('light-exp'), lexpo = document.getElementById('light-exp-out');
  function sync(){
    var ls = V.lightState;
    lk.value = String(ls.key); lko.textContent = ls.key.toFixed(2);
    laz.value = String(ls.az); lazo.textContent = ls.az + '°';
    lel.value = String(ls.el); lelo.textContent = ls.el + '°';
    lamb.value = String(ls.amb); lambo.textContent = ls.amb.toFixed(2);
    lexp.value = String(ls.exp); lexpo.textContent = ls.exp.toFixed(2);
    V.keyLight.intensity = ls.key;
    V.hemiLight.intensity = ls.amb;
    V.renderer.toneMappingExposure = ls.exp;
    V.updateKeyLightPosition();
  }
  lk.addEventListener('input', function(){ V.lightState.key = Number(lk.value); sync(); });
  laz.addEventListener('input', function(){ V.lightState.az = Number(laz.value); sync(); });
  lel.addEventListener('input', function(){ V.lightState.el = Number(lel.value); sync(); });
  lamb.addEventListener('input', function(){ V.lightState.amb = Number(lamb.value); sync(); });
  lexp.addEventListener('input', function(){ V.lightState.exp = Number(lexp.value); sync(); });
  document.getElementById('light-reset').addEventListener('click', function(){
    V.lightState = { key:1.6, az:39, el:45, amb:0.85, exp:1.05, shadow:true };
    V.toggles.shadow = true;
    document.getElementById('tg-shadow').setAttribute('aria-pressed', 'true');
    V.keyLight.castShadow = true;
    V.shadowCatcher.visible = true;
    sync();
  });
})();

var BG = {
  sky:{ sky:true, fog:true },
  studio:{ color:0x232733, fog:true }, pink:{ color:0xf6c6d3, fog:false },
  mint:{ color:0xbfe6dd, fog:false }, night:{ color:0x0d1020, fog:true },
  white:{ color:0xf4f4f6, fog:false }
};
document.querySelectorAll('#bg-swatches button').forEach(function(b){
  b.addEventListener('click', function(){
    var bg = BG[b.dataset.bg]; if (!bg) return;
    V.scene.background = bg.sky ? V.skyTex : new THREE.Color(bg.color);
    V.scene.fog = bg.fog ? new THREE.Fog(bg.sky ? V.SKY_FOG_COLOR : bg.color, 26, 95) : null;
    document.querySelectorAll('#bg-swatches button').forEach(function(x){ x.classList.toggle('on', x === b); });
  });
});

document.querySelectorAll('#cambar button[data-cam]').forEach(function(b){
  b.addEventListener('click', function(){ V.frameCamera(b.dataset.cam); });
});

var fsBtn = document.getElementById('fsbtn');
function syncFsBtn(){ if (fsBtn) fsBtn.textContent = document.fullscreenElement ? '全画面を終了' : '全画面'; }
if (fsBtn){
  fsBtn.addEventListener('click', function(){
    if (document.fullscreenElement){
      if (document.exitFullscreen){
        try { var ep = document.exitFullscreen(); if (ep && ep.catch) ep.catch(function(){}); } catch(e){}
      }
      return;
    }
    if (!document.documentElement.requestFullscreen) return;
    try { var p = document.documentElement.requestFullscreen(); if (p && p.catch) p.catch(function(){}); } catch(e){}
    if (V.COARSE_POINTER && screen.orientation && screen.orientation.lock){
      try { var lp = screen.orientation.lock('landscape'); if (lp && lp.catch) lp.catch(function(){}); } catch(e){}
    }
  });
  document.addEventListener('fullscreenchange', syncFsBtn);
}

document.getElementById('shot').addEventListener('click', function(){ V.capturePng(false); });
document.getElementById('shot-alpha').addEventListener('click', function(){ V.capturePng(true); });

function openLocalFile(f){
  if (!f) return;
  V.setLoading(true, 'モデルを読み込んでいます…', f.name);
  f.arrayBuffer().then(function(buf){ V.loadVrmFromArrayBuffer(buf, f.name); })
    .catch(function(e){ V.showError('ファイルを開けませんでした: ' + (e && e.message ? e.message : e)); V.setLoading(false); });
}
var fileInput = document.getElementById('file-open');
fileInput.addEventListener('change', function(){
  var f = fileInput.files && fileInput.files[0];
  openLocalFile(f);
  fileInput.value = '';
});
window.addEventListener('dragover', function(e){ e.preventDefault(); document.body.classList.add('dragging'); });
window.addEventListener('dragleave', function(e){ if (!e.relatedTarget) document.body.classList.remove('dragging'); });
window.addEventListener('drop', function(e){
  e.preventDefault(); document.body.classList.remove('dragging');
  var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  openLocalFile(f);
});

/* ================= Model Info & Color UI ================= */
function updateInfoPanel(){
  var el = document.getElementById('modelinfo');
  if (el){
    el.textContent = '';
    function line(l, v){
      var d = document.createElement('div');
      d.appendChild(document.createTextNode(l + '：'));
      var b = document.createElement('b');
      b.textContent = v;
      d.appendChild(b);
      el.appendChild(d);
    }
    var mi = V.modelInfo;
    line('モデル', (mi.name || '（名称なし）') + (mi.version ? ' v' + mi.version : ''));
    line('フォーマット', mi.format);
    line('ポリゴン', mi.tris.toLocaleString());
    line('メッシュ', mi.meshes + ' ／ ノード ' + mi.nodeCount);
    line('表情', V.exprNames.length + '種');
    line('SpringBone', mi.springCount + 'ジョイント');
  }
  buildColorUI();
}

var colorMats = [];
var HOODIE_MAIN = ['HoodiePink'];
var HOODIE_DARK = ['PocketDark', 'PinkDark'];
var CLOG_MAIN = ['ClogPink'];
var CLOG_DARK = ['ClogSole'];
var COLOR_PRESETS = [
  { label:'ピンク',   hoodie:'#F6C6D3', clog:'#F0A6BE' },
  { label:'レッド',   hoodie:'#E45A54', clog:'#D64541' },
  { label:'オレンジ', hoodie:'#F29A4A', clog:'#E8842F' },
  { label:'イエロー', hoodie:'#F2CD5C', clog:'#E9B93F' },
  { label:'グリーン', hoodie:'#7FBF7A', clog:'#63AC5E' },
  { label:'ブルー',   hoodie:'#6FB3E0', clog:'#529ED4' },
  { label:'ネイビー', hoodie:'#5B7FD6', clog:'#4769C4' },
  { label:'パープル', hoodie:'#9A83D6', clog:'#8268C6' }
];
function collectColorMats(){
  colorMats = [];
  if (!V.model) return;
  var seen = {};
  V.model.traverse(function(o){
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){
      if (!m || !m.color || seen[m.uuid]) return;
      seen[m.uuid] = true;
      colorMats.push({ mat:m, name:m.name || '(名称なし)', orig:m.color.clone() });
    });
  });
}
function findColorMat(name){
  for (var i = 0; i < colorMats.length; i++) if (colorMats[i].name === name) return colorMats[i];
  return null;
}
function setNamedColor(names, hex, scale){
  var c = new THREE.Color(hex);
  if (scale && scale !== 1) c.multiplyScalar(scale);
  names.forEach(function(n){
    var rec = findColorMat(n);
    if (rec) rec.mat.color.copy(c);
  });
}
function clearPresetOn(){
  document.querySelectorAll('#color-presets button').forEach(function(b){ b.classList.remove('on'); });
}
function refreshMatColorInputs(){
  document.querySelectorAll('#mat-colors input[type="color"]').forEach(function(inp){
    var rec = colorMats[Number(inp.dataset.idx)];
    if (rec) inp.value = '#' + rec.mat.color.getHexString();
  });
}
function syncPairInputs(){
  var h = findColorMat('HoodiePink'), c = findColorMat('ClogPink');
  var hi = document.getElementById('hoodie-color'), ci = document.getElementById('clog-color');
  var pairRow = document.getElementById('color-pair');
  if (pairRow) pairRow.style.display = (h || c) ? '' : 'none';
  if (hi && h) hi.value = '#' + h.mat.color.getHexString();
  if (ci && c) ci.value = '#' + c.mat.color.getHexString();
}
function applyColorPreset(idx){
  var p = COLOR_PRESETS[idx]; if (!p) return;
  setNamedColor(HOODIE_MAIN, p.hoodie, 1);
  setNamedColor(HOODIE_DARK, p.hoodie, 0.5);
  setNamedColor(CLOG_MAIN, p.clog, 1);
  setNamedColor(CLOG_DARK, p.clog, 0.88);
  document.querySelectorAll('#color-presets button').forEach(function(b, i){
    b.classList.toggle('on', i === idx);
  });
  syncPairInputs();
  refreshMatColorInputs();
}
function buildColorUI(){
  collectColorMats();
  var hasBuriMats = !!(findColorMat('HoodiePink') || findColorMat('ClogPink'));
  var wrap = document.getElementById('color-presets');
  if (wrap){
    wrap.innerHTML = '';
    wrap.style.display = hasBuriMats ? '' : 'none';
    if (hasBuriMats){
      COLOR_PRESETS.forEach(function(p, i){
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'colorswatch';
        b.title = p.label + '（フーディ ' + p.hoodie + ' ／ クロッグ ' + p.clog + '）';
        b.setAttribute('aria-label', '色替えプリセット: ' + p.label);
        var s1 = document.createElement('span'); s1.className = 'cs-half'; s1.style.background = p.hoodie;
        var s2 = document.createElement('span'); s2.className = 'cs-half'; s2.style.background = p.clog;
        var lab = document.createElement('span'); lab.className = 'cs-label'; lab.textContent = p.label;
        b.appendChild(s1); b.appendChild(s2); b.appendChild(lab);
        b.addEventListener('click', function(){ applyColorPreset(i); });
        wrap.appendChild(b);
      });
    }
  }
  var list = document.getElementById('mat-colors');
  if (list){
    list.innerHTML = '';
    if (!colorMats.length){
      list.innerHTML = '<p class="hint">色を変更できるマテリアルがありません。</p>';
    }
    colorMats.forEach(function(rec, i){
      var row = document.createElement('div'); row.className = 'slider';
      var lab = document.createElement('span'); lab.textContent = rec.name;
      var inp = document.createElement('input');
      inp.type = 'color'; inp.value = '#' + rec.mat.color.getHexString();
      inp.dataset.idx = String(i);
      inp.setAttribute('aria-label', rec.name + ' の色');
      inp.addEventListener('input', function(){
        rec.mat.color.set(inp.value);
        clearPresetOn(); syncPairInputs();
      });
      row.appendChild(lab); row.appendChild(inp);
      list.appendChild(row);
    });
  }
  syncPairInputs();
}
(function bindColorPair(){
  var hi = document.getElementById('hoodie-color');
  if (hi) hi.addEventListener('input', function(){
    setNamedColor(HOODIE_MAIN, hi.value, 1);
    setNamedColor(HOODIE_DARK, hi.value, 0.5);
    clearPresetOn(); refreshMatColorInputs();
  });
  var ci = document.getElementById('clog-color');
  if (ci) ci.addEventListener('input', function(){
    setNamedColor(CLOG_MAIN, ci.value, 1);
    setNamedColor(CLOG_DARK, ci.value, 0.88);
    clearPresetOn(); refreshMatColorInputs();
  });
  var rs = document.getElementById('color-reset');
  if (rs) rs.addEventListener('click', function(){
    colorMats.forEach(function(rec){ rec.mat.color.copy(rec.orig); });
    clearPresetOn(); buildColorUI();
  });
})();

/* ================= Model loaded hook & Boot ================= */
V.onModelLoaded = function(){
  buildExprUI();
  refreshExprSliders();
  syncExprButtons();
  updateInfoPanel();
  syncMotionUI();
};

V.boot();

})(window.VRMViewer);