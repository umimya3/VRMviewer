/* shooting.js — 射撃武器モーション開発モジュール (viewer build 2026-11-20.05 系)
 *
 * 役割: 武器別「持ち方＋攻撃モーション」をビューワーで開発・チェックし、
 *       そのまま ぶりVS (Ver107) に輸入できる形で保持する。
 *
 * 移植可能ブロック (PORTABLE-BEGIN 〜 PORTABLE-END) は
 *   blendBoneOffset / trackVal / gauss / bones.hips と同義の原始関数
 *   (B, TV, G, H) しか使わない純粋な定義集。
 * ゲーム側へは gun_motions_for_game.js として切り出して渡す。
 * ゲーム側の組み込みは applyMotion 内の1行:
 *   if (applyGunMotion(name, el, w)) return;
 * （applyCharMotionPose の直後に入れる。既存の数値・モーションには触らない）
 */
(function(V){
"use strict";

// === PORTABLE-BEGIN ===
var GUN_WEAPONS = {
  sword:   { label:'鰤ソード',          file:'buri_sword.glb',         p:[0.010,0.020,0.010], r:[0,0,0], hold:'sword' },
  akm:     { label:'AKM',              file:'akm.glb',                  p:[0.005,0.005,0.040], r:[0,0,0], hold:'assault' },
  shotgun: { label:'ポンプショットガン', file:'pump_shotgun.glb',        p:[0.005,0.005,0.040], r:[0,0,0], hold:'assault' },
  sniper:  { label:'スナイパーライフル', file:'sniper_rifle.glb',        p:[0.005,0.000,0.045], r:[0,0,0], hold:'assault' },
  javelin: { label:'ジャベリン',        file:'javelin.glb',              p:[0.010,0.020,0.072], r:[0,0,0], hold:'shoulder_carry' },
  pod:     { label:'ミサイルポッド',     file:'missile_pod_launcher.glb', p:[0.000,0.010,0.055], r:[0,0,0], hold:'carry' },
  harpoon: { label:'ハープーンガン',     file:'harpoon_gun.glb',          p:[0.005,0.005,0.040], r:[0,0,0], hold:'assault' },
  flame:   { label:'火炎放射ワンド',     file:'flamethrower_wand.glb',    p:[0.005,0.010,0.025], r:[0,0,0], hold:'wand' },
  gatling: { label:'ガトリング',        file:'portable_gatling_gun.glb', p:[0.005,0.005,0.045], r:[0,0,0], hold:'hip' }
};

var GUN_STAND = {
  spine:[0,0,0], chest:[0,0,0], neck:[0,0,0], head:[0,0,0], hips:[0,0,0],
  rightUpperArm:[-70,0,5], rightLowerArm:[0,0,15], rightHand:[0,0,0],
  leftUpperArm:[-72,0,-6], leftLowerArm:[0,0,-14], leftHand:[0,0,0]
};
var GUN_HOLDS = {
  /* 脇抱え突撃：前腕を水平に下げ hand Y=-72 で銃を起こして正面へ、左手は下から添える */
  assault: {
    spine:[8,-2,0], chest:[6,-4,0], neck:[-4,6,0], head:[-6,10,0], hips:[0,-10,0],
    rightUpperArm:[-74,14,22], rightLowerArm:[0,0,68], rightHand:[-10,-72,22],
    leftUpperArm:[-66,20,-78], leftLowerArm:[0,0,-44], leftHand:[6,-58,14]
  },
  /* 肩担ぎ（ジャベリン） */
  shoulder_carry: {
    spine:[4,-3,0], chest:[4,-5,0], neck:[0,6,0], head:[2,10,2], hips:[0,-10,0],
    rightUpperArm:[-38,16,40], rightLowerArm:[0,0,102], rightHand:[-42,-32,-6],
    leftUpperArm:[-22,10,-82], leftLowerArm:[0,0,-64], leftHand:[0,-36,12]
  },
  /* 抱え構え（ミサイルポッド） */
  carry: {
    spine:[8,-2,0], chest:[5,-2,0], neck:[-4,4,0], head:[-4,6,0], hips:[0,-8,0],
    rightUpperArm:[-74,14,20], rightLowerArm:[0,0,66], rightHand:[-10,-70,18],
    leftUpperArm:[-64,24,-68], leftLowerArm:[0,0,-64], leftHand:[8,-40,12]
  },
  /* ガトリング腰抱え */
  hip: {
    spine:[10,-2,0], chest:[6,-2,0], neck:[-6,4,0], head:[-8,6,0], hips:[0,-6,0],
    rightUpperArm:[-72,14,22], rightLowerArm:[0,0,64], rightHand:[-10,-68,16],
    leftUpperArm:[-56,34,-58], leftLowerArm:[0,0,-66], leftHand:[10,16,0]
  },
  /* ワンド構え */
  wand: {
    spine:[6,-2,0], chest:[4,-4,0], neck:[-3,6,0], head:[-4,10,0], hips:[0,-8,0],
    rightUpperArm:[-70,14,22], rightLowerArm:[0,0,68], rightHand:[-8,-66,18],
    leftUpperArm:[-68,20,-62], leftLowerArm:[0,0,-54], leftHand:[4,-40,8]
  }
};
var GUN_HOLD_OFF = {
  shotgun: { leftUpperArm:[0,2,-4], leftLowerArm:[0,0,6] },
  sniper:  { spine:[-3,0,0], head:[3,0,0], rightUpperArm:[4,0,2], leftUpperArm:[4,0,2] },
  harpoon: { rightUpperArm:[-2,0,4] }
};

var GUN_BONES = ['spine','chest','neck','head','hips',
  'rightUpperArm','rightLowerArm','rightHand','leftUpperArm','leftLowerArm','leftHand'];

function gunFrame(B, holdName, k, add, w, weaponId){
  var S = GUN_STAND, P = GUN_HOLDS[holdName], O = weaponId && GUN_HOLD_OFF[weaponId];
  for (var i = 0; i < GUN_BONES.length; i++){
    var bn = GUN_BONES[i], s = S[bn], p = P[bn], o = (O && O[bn]) || [0,0,0], a = add[bn] || [0,0,0];
    B(bn, s[0] + (p[0] + o[0] - s[0]) * k + a[0],
          s[1] + (p[1] + o[1] - s[1]) * k + a[1],
          s[2] + (p[2] + o[2] - s[2]) * k + a[2], w);
  }
}
function gunKick(el, t0, tau){ return el > t0 ? Math.exp(-(el - t0) / tau) : 0; }
function gunBrace(B, k, w, braceBack){
  var b = braceBack || 0;
  B('leftUpperLeg',  (-18 - 6 * b) * k, 0, -6 * k, w);
  B('rightUpperLeg', (6 + 8 * b) * k,   0,  8 * k, w);
  B('leftLowerLeg',  (28 + 8 * b) * k,  0,  0, w);
  B('rightLowerLeg', (14 - 2 * b) * k,  0,  0, w);
  B('leftFoot',      (-10 - 2 * b) * k, 0,  0, w);
  B('rightFoot',     (-16 - 4 * b) * k, 0,  0, w);
}
function gunWideBrace(B, k, w, braceBack){
  var b = braceBack || 0;
  B('leftUpperLeg',  (-24 - 4 * b) * k, 0, -22 * k, w);
  B('rightUpperLeg', (-24 + 4 * b) * k, 0,  22 * k, w);
  B('leftLowerLeg',  (46 + 6 * b) * k,  0,  0, w);
  B('rightLowerLeg', (46 + 6 * b) * k,  0,  0, w);
  B('leftFoot',      (-20 - 3 * b) * k, 0,  0, w);
  B('rightFoot',     (-20 - 3 * b) * k, 0,  0, w);
}

var GUN_MOTIONS = [
/* ---------------- AKM ---------------- */
{ id:'akm_aim', label:'構え（脇抱え突撃）', weapon:'akm', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.40,1],[2.4,1]]);
    var sway = Math.sin(el * 1.8) * 0.8 * k;
    gunFrame(B, 'assault', k, { head:[sway * 0.4, sway, 0], chest:[0, sway * 0.5, 0] }, w, 'akm');
    gunBrace(B, k * 0.85, w);
    if (H) H.obj.position.y += -0.024 * k * w;
  } },
{ id:'akm_single', label:'単発', weapon:'akm', loop:false, duration:1.0,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.20,1],[0.78,1],[1.0,0]]);
    var kick = gunKick(el, 0.30, 0.055);
    gunFrame(B, 'assault', k, {
      spine:[-4 * kick, 0, 0], chest:[-3 * kick, 0, 0], head:[-2 * kick, 0, 0],
      rightUpperArm:[4 * kick, 0, -3 * kick], rightLowerArm:[0, 0, 4 * kick],
      leftUpperArm:[3 * kick, 0, 2 * kick] }, w, 'akm');
    gunBrace(B, k, w, 0.4 * kick);
    if (H){ H.obj.position.y += -0.026 * k * w; H.obj.position.z += -0.03 * kick * w; }
  } },
{ id:'akm_burst', label:'3点バースト', weapon:'akm', loop:false, duration:1.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.20,1],[1.15,1],[1.4,0]]);
    var kick = gunKick(el, 0.32, 0.045) + 1.2 * gunKick(el, 0.44, 0.045) + 1.45 * gunKick(el, 0.56, 0.055);
    gunFrame(B, 'assault', k, {
      spine:[-3.5 * kick, 0, 0], chest:[-2.5 * kick, 0, 0], head:[-2 * kick, 0, 0],
      rightUpperArm:[3.5 * kick, 0, -2.5 * kick], rightLowerArm:[0, 0, 3 * kick],
      leftUpperArm:[2.5 * kick, 0, 2 * kick] }, w, 'akm');
    gunBrace(B, k, w, 0.3 * Math.min(1.5, kick));
    if (H){ H.obj.position.y += -0.026 * k * w; H.obj.position.z += -0.025 * Math.min(1.6, kick) * w; }
  } },
{ id:'akm_auto', label:'フルオート連射', weapon:'akm', loop:false, duration:2.2,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.20,1],[1.95,1],[2.2,0]]);
    var firing = TV(el, [[0.34,0],[0.42,1],[1.78,1],[1.88,0],[2.2,0]]);
    var jit = firing * Math.sin(el * 58) * 1.6;
    gunFrame(B, 'assault', k, {
      spine:[-4 * firing + jit * 0.35, 0, 0], chest:[-3 * firing + jit * 0.3, 0, 0], head:[-2 * firing, 0, 0],
      rightUpperArm:[3 * firing + jit * 0.4, 0, -3 * firing], rightLowerArm:[0, 0, 4 * firing],
      leftUpperArm:[2.5 * firing + jit * 0.3, 0, 2 * firing] }, w, 'akm');
    gunBrace(B, k, w, 0.5 * firing);
    if (H){ H.obj.position.y += (-0.026 * k - 0.005 * firing) * w; H.obj.position.z += -0.035 * firing * k * w; }
  } },
{ id:'akm_reload', label:'リロード（マガジン交換）', weapon:'akm', loop:false, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[2.15,1],[2.4,0]]);
    var tilt = TV(el, [[0.25,0],[0.50,1],[1.85,1],[2.10,0],[2.4,0]]);
    var reach = TV(el, [[0.35,0],[0.58,1],[0.88,0.85],[1.10,0],[1.32,0],[1.48,1],[1.75,1],[2.00,0],[2.4,0]]);
    var pouch = TV(el, [[0.82,0],[1.08,1],[1.32,0],[2.4,0]]);
    var slap  = G(el, 1.62, 0.045);
    gunFrame(B, 'assault', k, {
      rightUpperArm:[6 * tilt + 2 * slap, 0, -6 * tilt],
      rightHand:[0, 0, 12 * tilt],
      leftUpperArm:[-8 * reach - 14 * pouch, 0, 12 * reach + 32 * pouch],
      leftLowerArm:[0, 0, -16 * reach + 18 * pouch],
      head:[8 * tilt - 2 * slap, -4 * tilt, 0], chest:[3 * tilt, 0, 0] }, w, 'akm');
    gunBrace(B, 0.75 * k, w);
    if (H) H.obj.position.y += -0.022 * k * w;
  } },
/* ---------------- ポンプショットガン ---------------- */
{ id:'sg_aim', label:'構え（脇抱え）', weapon:'shotgun', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.40,1],[2.4,1]]);
    var sway = Math.sin(el * 1.6) * 0.8 * k;
    gunFrame(B, 'assault', k, { head:[sway * 0.4, sway, 0], chest:[0, sway * 0.5, 0] }, w, 'shotgun');
    gunBrace(B, k * 0.9, w);
    if (H) H.obj.position.y += -0.026 * k * w;
  } },
{ id:'sg_fire_pump', label:'射撃→ポンプ', weapon:'shotgun', loop:false, duration:1.55,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.20,1],[1.32,1],[1.55,0]]);
    var kick = gunKick(el, 0.28, 0.065);
    var pump = TV(el, [[0.56,0],[0.74,1],[0.86,1],[1.04,0],[1.55,0]]);
    var pj   = G(el, 1.04, 0.045);
    gunFrame(B, 'assault', k, {
      spine:[-7 * kick + 2 * pj, 0, 0], chest:[-5 * kick, 0, 0], head:[-4 * kick, 0, 0],
      rightUpperArm:[7 * kick, 0, -4 * kick], rightLowerArm:[0, 0, 6 * kick],
      leftUpperArm:[5 * kick - 6 * pump, 0, 3 * kick + 16 * pump],
      leftLowerArm:[0, 0, -24 * pump] }, w, 'shotgun');
    gunBrace(B, k, w, 0.6 * kick);
    if (H){ H.obj.position.y += (-0.026 * k - 0.008 * kick) * w; H.obj.position.z += -0.055 * kick * w; }
  } },
{ id:'sg_double', label:'2連射（射撃-ポンプ-射撃）', weapon:'shotgun', loop:false, duration:2.05,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.20,1],[1.82,1],[2.05,0]]);
    var kick = gunKick(el, 0.28, 0.06) + gunKick(el, 1.28, 0.065);
    var pump = TV(el, [[0.54,0],[0.72,1],[0.84,1],[1.02,0],[2.05,0]]);
    gunFrame(B, 'assault', k, {
      spine:[-7 * kick, 0, 0], chest:[-5 * kick, 0, 0], head:[-4 * kick, 0, 0],
      rightUpperArm:[7 * kick, 0, -4 * kick], rightLowerArm:[0, 0, 6 * kick],
      leftUpperArm:[5 * kick - 6 * pump, 0, 3 * kick + 16 * pump],
      leftLowerArm:[0, 0, -24 * pump] }, w, 'shotgun');
    gunBrace(B, k, w, 0.55 * Math.min(1.3, kick));
    if (H){ H.obj.position.y += -0.026 * k * w; H.obj.position.z += -0.05 * Math.min(1.4, kick) * w; }
  } },
{ id:'sg_load', label:'装填（1発ずつ）', weapon:'shotgun', loop:false, duration:1.85,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[1.60,1],[1.85,0]]);
    var tilt = TV(el, [[0.20,0],[0.40,1],[1.45,1],[1.65,0],[1.85,0]]);
    var push = G(el, 0.72, 0.09) + G(el, 1.12, 0.09);
    var rack = G(el, 1.44, 0.06);
    gunFrame(B, 'assault', k, {
      rightUpperArm:[4 * tilt, 0, -4 * tilt], rightHand:[0, 0, 14 * tilt],
      leftUpperArm:[-6 * push - 6 * rack, 0, 12 * tilt + 14 * push + 16 * rack],
      leftLowerArm:[0, 0, -14 * push - 22 * rack],
      head:[8 * tilt, -4 * tilt, 0], chest:[3 * tilt, 0, 0] }, w, 'shotgun');
    gunBrace(B, 0.75 * k, w);
    if (H) H.obj.position.y += -0.022 * k * w;
  } },
/* ---------------- スナイパーライフル ---------------- */
{ id:'sr_aim', label:'狙撃構え', weapon:'sniper', loop:true, duration:2.8,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.55,1],[2.8,1]]);
    var breath = Math.sin(el * 2.1) * 0.4 * k;
    gunFrame(B, 'assault', k, { head:[breath * 0.3, breath * 0.3, 0], chest:[breath * 0.2, 0, 0] }, w, 'sniper');
    gunBrace(B, k, w);
    if (H) H.obj.position.y += -0.024 * k * w;
  } },
{ id:'sr_fire', label:'狙撃（単発）', weapon:'sniper', loop:false, duration:1.35,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.30,1],[1.08,1],[1.35,0]]);
    var kick = gunKick(el, 0.50, 0.075);
    gunFrame(B, 'assault', k, {
      spine:[-9 * kick, 0, 0], chest:[-6 * kick, 0, 0], head:[-6 * kick, 0, 0], neck:[-4 * kick, 0, 0],
      rightUpperArm:[9 * kick, 0, -5 * kick], rightLowerArm:[0, 0, 8 * kick],
      leftUpperArm:[7 * kick, 0, 4 * kick] }, w, 'sniper');
    gunBrace(B, k, w, 0.75 * kick);
    if (H){ H.obj.position.y += (-0.026 * k - 0.01 * kick) * w; H.obj.position.z += -0.075 * kick * w; }
  } },
{ id:'sr_bolt', label:'ボルト操作', weapon:'sniper', loop:false, duration:1.6,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[1.32,1],[1.6,0]]);
    var tilt = TV(el, [[0.25,0],[0.45,1],[1.12,1],[1.32,0],[1.6,0]]);
    var pull = TV(el, [[0.45,0],[0.66,1],[0.84,1],[1.06,0],[1.6,0]]);
    var snap = G(el, 1.06, 0.045);
    gunFrame(B, 'assault', k, {
      rightUpperArm:[4 * tilt + 2 * snap, 0, -4 * tilt],
      rightHand:[0, 0, 10 * tilt],
      leftUpperArm:[-6 * pull, 0, 18 * pull], leftLowerArm:[0, 0, -28 * pull],
      head:[6 * tilt, -4 * tilt, 0], chest:[2 * tilt, 2 * tilt, 0] }, w, 'sniper');
    gunBrace(B, k, w);
    if (H) H.obj.position.y += -0.024 * k * w;
  } },
{ id:'sr_fire_bolt', label:'狙撃→ボルト操作', weapon:'sniper', loop:false, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.30,1],[2.12,1],[2.4,0]]);
    var kick = gunKick(el, 0.50, 0.07);
    var tilt = TV(el, [[0.95,0],[1.15,1],[1.85,1],[2.05,0],[2.4,0]]);
    var pull = TV(el, [[1.15,0],[1.36,1],[1.54,1],[1.78,0],[2.4,0]]);
    var snap = G(el, 1.78, 0.045);
    gunFrame(B, 'assault', k, {
      spine:[-9 * kick, 0, 0], chest:[-6 * kick + 2 * tilt, 2 * tilt, 0],
      head:[-6 * kick + 6 * tilt, -4 * tilt, 0], neck:[-4 * kick, 0, 0],
      rightUpperArm:[9 * kick + 4 * tilt + 2 * snap, 0, -5 * kick - 4 * tilt],
      rightLowerArm:[0, 0, 8 * kick], rightHand:[0, 0, 10 * tilt],
      leftUpperArm:[7 * kick - 6 * pull, 0, 4 * kick + 18 * pull], leftLowerArm:[0, 0, -28 * pull] }, w, 'sniper');
    gunBrace(B, k, w, 0.75 * kick);
    if (H){ H.obj.position.y += (-0.026 * k - 0.01 * kick) * w; H.obj.position.z += -0.075 * kick * w; }
  } },
/* ---------------- ジャベリン ---------------- */
{ id:'jv_carry', label:'肩担ぎ', weapon:'javelin', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.45,1],[2.4,1]]);
    var sway = Math.sin(el * 1.6) * 0.8 * k;
    gunFrame(B, 'shoulder_carry', k, { head:[sway * 0.3, sway, 0], chest:[sway * 0.2, 0, 0] }, w, 'javelin');
    gunBrace(B, k * 0.7, w);
    if (H) H.obj.position.y += -0.016 * k * w;
  } },
{ id:'jv_lockon', label:'ロックオン', weapon:'javelin', loop:false, duration:2.1,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.40,1],[1.85,1],[2.1,0]]);
    var aimUp = TV(el, [[0.30,0],[0.70,1],[1.75,1],[2.1,0]]);
    var scan  = Math.sin((el - 0.5) * 3.4) * 2.2 * TV(el, [[0.5,0],[0.7,1],[1.25,1],[1.45,0],[2.1,0]]);
    var lock  = G(el, 1.55, 0.06);
    gunFrame(B, 'shoulder_carry', k, {
      spine:[-4 * aimUp, scan * 0.4, 0], chest:[-4 * aimUp + lock, scan * 0.5, 0],
      head:[2 * aimUp - 2 * lock, scan * 0.3, 2 * aimUp], hips:[0, scan * 0.8, 0],
      rightUpperArm:[7 * aimUp, 0, 3 * aimUp], leftUpperArm:[7 * aimUp, 0, 0] }, w, 'javelin');
    gunBrace(B, k * 0.9, w);
    if (H) H.obj.position.y += (-0.018 * k - 0.008 * aimUp) * w;
  } },
{ id:'jv_fire', label:'発射', weapon:'javelin', loop:false, duration:1.8,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.35,1],[1.35,1],[1.8,0]]);
    var aimUp = TV(el, [[0.20,0],[0.45,1],[1.10,1],[1.45,0],[1.8,0]]);
    var crouch = TV(el, [[0.35,0],[0.55,1],[0.75,0.4],[1.15,0],[1.8,0]]);
    var kick = gunKick(el, 0.60, 0.11);
    gunFrame(B, 'shoulder_carry', k, {
      spine:[-3 * aimUp + 4 * crouch - 10 * kick, 0, 0],
      chest:[-3 * aimUp + 3 * crouch - 7 * kick, 0, 0],
      neck:[-2 * kick, 0, 0], head:[2 * aimUp - 6 * kick, 0, 2 * aimUp],
      rightUpperArm:[7 * aimUp + 8 * kick, 0, 4 * kick],
      leftUpperArm:[7 * aimUp + 6 * kick, 0, -4 * kick] }, w, 'javelin');
    gunBrace(B, k, w, 0.4 * crouch + 0.8 * kick);
    if (H){ H.obj.position.y += (-0.018 * k - 0.018 * crouch - 0.01 * kick) * w; H.obj.position.z += -0.075 * kick * w; }
  } },
/* ---------------- ミサイルポッド ---------------- */
{ id:'pod_carry', label:'抱え構え', weapon:'pod', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.45,1],[2.4,1]]);
    var sway = Math.sin(el * 1.5) * 0.8 * k;
    gunFrame(B, 'carry', k, { head:[0, sway, 0], hips:[0, sway * 0.5, 0] }, w, 'pod');
    gunBrace(B, k * 0.85, w);
    if (H) H.obj.position.y += -0.022 * k * w;
  } },
{ id:'pod_single', label:'単発', weapon:'pod', loop:false, duration:1.35,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[1.10,1],[1.35,0]]);
    var dip = G(el, 0.45, 0.08);
    var rock = gunKick(el, 0.48, 0.10);
    gunFrame(B, 'carry', k, {
      spine:[3 * dip - 7 * rock, 0, 0], chest:[2 * dip - 4 * rock, 0, 0], head:[-4 * rock, 0, 0],
      rightUpperArm:[5 * rock, 0, -3 * rock], leftUpperArm:[5 * rock, 0, 3 * rock] }, w, 'pod');
    gunBrace(B, k, w, 0.55 * rock);
    if (H){ H.obj.position.y += (-0.024 * k - 0.016 * dip) * w; H.obj.position.z += -0.05 * rock * w; }
  } },
{ id:'pod_salvo', label:'斉射（3連）', weapon:'pod', loop:false, duration:2.15,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[1.90,1],[2.15,0]]);
    var dip = G(el, 0.45, 0.08) + G(el, 0.82, 0.08) + G(el, 1.19, 0.08);
    var rock = gunKick(el, 0.45, 0.09) + gunKick(el, 0.82, 0.09) + gunKick(el, 1.19, 0.10);
    var shake = (el > 0.42 && el < 1.38) ? Math.sin(el * 50) * 1.2 : 0;
    gunFrame(B, 'carry', k, {
      spine:[-5 * rock, shake * 0.4, 0], chest:[-3 * rock, 0, 0], head:[-3 * rock, shake * 0.4, 0],
      rightUpperArm:[4 * rock, 0, -3 * rock], leftUpperArm:[4 * rock, 0, 3 * rock] }, w, 'pod');
    gunBrace(B, k, w, 0.45 * Math.min(1.4, rock));
    if (H){ H.obj.position.y += (-0.024 * k - 0.014 * Math.min(1.4, dip)) * w; H.obj.position.z += -0.045 * Math.min(1.4, rock) * w; }
  } },
{ id:'pod_reload', label:'予備ミサイル装填', weapon:'pod', loop:false, duration:2.25,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[1.98,1],[2.25,0]]);
    var lower = TV(el, [[0.25,0],[0.45,1],[1.75,1],[2.00,0],[2.25,0]]);
    var reach = TV(el, [[0.45,0],[0.82,1],[1.32,1],[1.72,0],[2.25,0]]);
    var pat = G(el, 1.48, 0.055);
    gunFrame(B, 'carry', k, {
      rightUpperArm:[4 * lower, 0, -6 * lower], rightHand:[0, 0, 10 * lower],
      leftUpperArm:[-6 * reach, 0, 14 * reach + 6 * pat], leftLowerArm:[0, 0, -20 * reach + 8 * pat],
      head:[8 * lower, -4 * lower, 0], chest:[3 * lower, 0, 0] }, w, 'pod');
    gunBrace(B, 0.85 * k, w);
    if (H) H.obj.position.y += -0.022 * k * w;
  } },
/* ---------------- ハープーンガン ---------------- */
{ id:'hp_aim', label:'構え（脇抱え）', weapon:'harpoon', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.40,1],[2.4,1]]);
    var sway = Math.sin(el * 1.6) * 0.8 * k;
    gunFrame(B, 'assault', k, { head:[sway * 0.4, sway, 0] }, w, 'harpoon');
    gunBrace(B, k * 0.85, w);
    if (H) H.obj.position.y += -0.024 * k * w;
  } },
{ id:'hp_fire', label:'発射', weapon:'harpoon', loop:false, duration:1.25,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.22,1],[0.98,1],[1.25,0]]);
    var kick = gunKick(el, 0.36, 0.055);
    var lean = TV(el, [[0.36,0],[0.60,1],[1.02,0],[1.25,0]]);
    gunFrame(B, 'assault', k, {
      spine:[-5 * kick + 6 * lean, 0, 0], chest:[-3 * kick + 4 * lean, 0, 0], head:[-3 * kick, 0, 0],
      rightUpperArm:[5 * kick, 0, -3 * kick], rightLowerArm:[0, 0, 5 * kick],
      leftUpperArm:[4 * kick, 0, 2 * kick] }, w, 'harpoon');
    gunBrace(B, k, w, 0.45 * kick);
    if (H){ H.obj.position.y += -0.026 * k * w; H.obj.position.z += (-0.045 * kick + 0.03 * lean) * w; }
  } },
{ id:'hp_reel', label:'リール巻き取り', weapon:'harpoon', loop:false, duration:2.2,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[1.95,1],[2.2,0]]);
    var crank = (el > 0.30 && el < 1.90) ? (el - 0.30) * 11.5 : 0;
    var active = TV(el, [[0.25,0],[0.40,1],[1.80,1],[1.95,0],[2.2,0]]);
    var cx = Math.sin(crank) * 11 * active, cz = Math.cos(crank) * 9 * active;
    var tug = G(el, 0.72, 0.09) + G(el, 1.18, 0.09) + G(el, 1.64, 0.09);
    gunFrame(B, 'assault', k, {
      leftUpperArm:[-6 * active + cx * 0.6, 0, 16 * active + cz * 0.5],
      leftLowerArm:[0, 0, -22 * active + cx * 0.6],
      spine:[-4 * tug + 3 * active, 0, 0], chest:[-3 * tug, 0, 0], head:[-2 * tug, 0, 0],
      rightUpperArm:[-4 * tug, 0, 2 * tug] }, w, 'harpoon');
    gunBrace(B, k, w, 0.5 * tug);
    if (H){ H.obj.position.y += -0.026 * k * w; H.obj.position.z += -0.05 * tug * w; }
  } },
/* ---------------- 火炎放射ワンド ---------------- */
{ id:'fl_aim', label:'構え', weapon:'flame', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.40,1],[2.4,1]]);
    var sway = Math.sin(el * 1.6) * 0.8 * k;
    gunFrame(B, 'wand', k, { head:[sway * 0.4, sway, 0] }, w, 'flame');
    gunBrace(B, k * 0.8, w);
    if (H) H.obj.position.y += -0.022 * k * w;
  } },
{ id:'fl_spray', label:'放射（左右に払う）', weapon:'flame', loop:false, duration:2.6,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[2.30,1],[2.6,0]]);
    var on = TV(el, [[0.30,0],[0.45,1],[2.15,1],[2.30,0],[2.6,0]]);
    var sweep = Math.sin((el - 0.45) * 2.5) * 14 * on;
    var jolt = G(el, 0.38, 0.05) + G(el, 2.22, 0.05);
    gunFrame(B, 'wand', k, {
      hips:[0, sweep * 0.85, 0], chest:[0, sweep * 0.55, 0], head:[0, sweep * 0.35, 0],
      spine:[5 * on - 3 * jolt, sweep * 0.3, 0],
      rightUpperArm:[4 * on - 4 * jolt, 0, 3 * on], leftUpperArm:[3 * on, 0, -3 * on] }, w, 'flame');
    gunBrace(B, k, w, 0.35 * on);
    if (H){ H.obj.position.y += -0.024 * k * w; H.obj.position.z += -0.03 * on * w; }
  } },
{ id:'fl_pilot', label:'点火確認', weapon:'flame', loop:false, duration:1.7,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[1.42,1],[1.7,0]]);
    var look = TV(el, [[0.30,0],[0.55,1],[1.15,1],[1.40,0],[1.7,0]]);
    var puff = G(el, 1.02, 0.05);
    gunFrame(B, 'wand', k, {
      rightUpperArm:[6 * look - 3 * puff, 0, -4 * look], rightHand:[0, 0, 10 * look],
      head:[10 * look - 4 * puff, -4 * look, 3 * look], neck:[4 * look, -2 * look, 0],
      leftUpperArm:[-8 * look, 0, 14 * look], leftLowerArm:[0, 0, -14 * look] }, w, 'flame');
    gunBrace(B, 0.75 * k, w);
    if (H) H.obj.position.y += -0.020 * k * w;
  } },
/* ---------------- ガトリング ---------------- */
{ id:'gt_carry', label:'腰抱え（ワイド構え）', weapon:'gatling', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.45,1],[2.4,1]]);
    var sway = Math.sin(el * 1.5) * 0.7 * k;
    gunFrame(B, 'hip', k, { head:[0, sway, 0] }, w, 'gatling');
    gunWideBrace(B, k, w);
    if (H) H.obj.position.y += -0.085 * k * w;
  } },
{ id:'gt_barrage', label:'スピンアップ→連射', weapon:'gatling', loop:false, duration:2.8,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.28,1],[2.52,1],[2.8,0]]);
    var spin = TV(el, [[0.20,0],[0.85,1],[2.30,1],[2.60,0],[2.8,0]]);
    var firing = TV(el, [[0.80,0],[0.90,1],[2.25,1],[2.38,0],[2.8,0]]);
    var vib = firing * Math.sin(el * 50) * 1.6;
    gunFrame(B, 'hip', k, {
      spine:[6 * spin - 3 * firing + vib * 0.45, 0, 0],
      chest:[4 * spin - 2 * firing + vib * 0.45, 0, 0],
      head:[-4 * spin + vib * 0.3, 0, 0],
      rightUpperArm:[vib * 0.5, 0, -4 * firing], rightLowerArm:[0, 0, 4 * firing],
      leftUpperArm:[vib * 0.5, 0, 4 * firing] }, w, 'gatling');
    gunWideBrace(B, k, w, 0.65 * firing);
    if (H){ H.obj.position.y += (-0.085 * k - 0.015 * firing) * w; H.obj.position.z += -0.055 * firing * w; }
  } }
];
// === PORTABLE-END ===


V.GUN_WEAPONS = GUN_WEAPONS;
V.GUN_MOTIONS = GUN_MOTIONS;

/* ============ ビューワー統合 (ここから先はビューワー専用) ============ */
var WEAPON_DIR = 'models/weapons/';
var state = { equipped:null, holder:null, loaded:{}, failed:{}, lastHand:null, lastMotion:'' };
var byMotion = {};
GUN_MOTIONS.forEach(function(m){ byMotion[m.id] = m.weapon; });

/* 斬撃系・魚武器モーション再生時は鰤ソードを自動装備 */
var SWORD_SET = {};
(function(){
  var extra = { combo:1, upper:1, airslash:1, airshot:1, bazooka:1, javelin:1, victory1:1, victory3:1 };
  (V.MOTION_DEFS || []).forEach(function(m){
    if (m.group === 'sword' || m.group === 'exvs_sword' || extra[m.id]) SWORD_SET[m.id] = 1;
  });
})();

function basisQuat(){
  var m = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(0,-1,0), new THREE.Vector3(0,0,1), new THREE.Vector3(-1,0,0));
  return new THREE.Quaternion().setFromRotationMatrix(m);
}
function applyPivotTransform(id){
  var pivot = state.loaded[id], def = GUN_WEAPONS[id];
  if (!pivot || !def) return;
  pivot.quaternion.copy(basisQuat());
  if (def.r){
    pivot.quaternion.multiply(new THREE.Quaternion().setFromEuler(
      new THREE.Euler(def.r[0] * Math.PI / 180, def.r[1] * Math.PI / 180, def.r[2] * Math.PI / 180)));
  }
  pivot.position.set(def.p[0], def.p[1], def.p[2]);
}
function makeHolder(){
  var holder = new THREE.Group();
  holder.name = 'GunHolder';
  Object.keys(GUN_WEAPONS).forEach(function(id){
    var def = GUN_WEAPONS[id];
    var pivot = new THREE.Group();
    pivot.name = 'Gun_' + id;
    pivot.visible = false;
    holder.add(pivot);
    state.loaded[id] = pivot;
    applyPivotTransform(id);
    if (typeof THREE !== 'undefined' && THREE.GLTFLoader){
      new THREE.GLTFLoader().load(WEAPON_DIR + def.file, function(gltf){
        pivot.add(gltf.scene);
      }, undefined, function(){ state.failed[id] = true; syncWeaponUi(); });
    }
  });
  return holder;
}
function applyVisibility(){
  var motionName = (V.motion && !V.motionFading) ? V.motion.name : '';
  var meleePlaying = motionName.indexOf('melee_') === 0;
  Object.keys(state.loaded).forEach(function(id){
    state.loaded[id].visible = (state.equipped === id) && !meleePlaying;
  });
}
function equip(id){
  state.equipped = id;
  applyVisibility();
  syncWeaponUi();
  syncTeachUi();
}
function watcher(){
  var hand = (V.bones && V.bones.rightHand) ? V.bones.rightHand.obj : null;
  if (hand && hand !== state.lastHand){
    state.lastHand = hand;
    if (!state.holder) state.holder = makeHolder();
    hand.add(state.holder);
  }
  var mn = (V.motion && !V.motionFading) ? V.motion.name : '';
  if (mn !== state.lastMotion){
    state.lastMotion = mn;
    if (byMotion[mn]) equip(byMotion[mn]);
    else if (SWORD_SET[mn]) equip('sword');
    else applyVisibility();
    syncTeachStatus();
  }
  requestAnimationFrame(watcher);
}

/* ============ ロボット・ティーチング機能 ============ */
var TEACH_ID = '__teach__';
var LEG_BONES = ['leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot'];
var ALL_TEACH_BONES = GUN_BONES.concat(LEG_BONES);
var teachPose = { bones:{}, hipsY:0, tab:'rightArm', preset:'assault' };
ALL_TEACH_BONES.forEach(function(bn){ teachPose.bones[bn] = [0,0,0]; });

var TEACH_TABS = [
  { id:'rightArm', label:'右腕', items:[
    { bn:'rightUpperArm', title:'右上腕', axes:['X 上/下','Y ひねり','Z 前/後'] },
    { bn:'rightLowerArm', title:'右ひじ', axes:['X ねじり','Y ねじり','Z 曲げ'] },
    { bn:'rightHand',     title:'右手首', axes:['X 上下折','Y ロール','Z 左右折'] }
  ]},
  { id:'leftArm', label:'左腕', items:[
    { bn:'leftUpperArm',  title:'左上腕', axes:['X 上/下','Y ひねり','Z 前/後'] },
    { bn:'leftLowerArm',  title:'左ひじ', axes:['X ねじり','Y ねじり','Z 曲げ'] },
    { bn:'leftHand',      title:'左手首', axes:['X 上下折','Y ロール','Z 左右折'] }
  ]},
  { id:'torso', label:'体・頭', items:[
    { bn:'hips',  title:'腰',   axes:['X 前傾','Y 向き','Z 傾き'] },
    { bn:'spine', title:'背骨', axes:['X 前傾','Y 向き','Z 傾き'] },
    { bn:'chest', title:'胸',   axes:['X 前傾','Y 向き','Z 傾き'] },
    { bn:'neck',  title:'首',   axes:['X 前傾','Y 向き','Z 傾き'] },
    { bn:'head',  title:'頭',   axes:['X 前傾','Y 向き','Z 傾き'] }
  ]},
  { id:'legs', label:'脚・腰高', items:[
    { bn:'leftUpperLeg',  title:'左太もも', axes:['X 前後','Y ひねり','Z 開閉'] },
    { bn:'rightUpperLeg', title:'右太もも', axes:['X 前後','Y ひねり','Z 開閉'] },
    { bn:'leftLowerLeg',  title:'左ひざ',   axes:['X 曲げ','Y','Z'] },
    { bn:'rightLowerLeg', title:'右ひざ',   axes:['X 曲げ','Y','Z'] },
    { bn:'leftFoot',      title:'左足首',   axes:['X 上下','Y','Z'] },
    { bn:'rightFoot',     title:'右足首',   axes:['X 上下','Y','Z'] }
  ]},
  { id:'weapon', label:'武器 p/r', items:[] }
];

function loadTeachPreset(holdKey){
  teachPose.preset = holdKey;
  var src = (holdKey === 'stand') ? GUN_STAND : (GUN_HOLDS[holdKey] || GUN_STAND);
  GUN_BONES.forEach(function(bn){
    teachPose.bones[bn] = (src[bn] || [0,0,0]).slice();
  });
  if (holdKey === 'stand'){
    LEG_BONES.forEach(function(bn){ teachPose.bones[bn] = [0,0,0]; });
    teachPose.hipsY = 0;
  } else if (holdKey === 'hip'){
    teachPose.bones.leftUpperLeg = [-24,0,-22]; teachPose.bones.rightUpperLeg = [-24,0,22];
    teachPose.bones.leftLowerLeg = [46,0,0];    teachPose.bones.rightLowerLeg = [46,0,0];
    teachPose.bones.leftFoot     = [-20,0,0];   teachPose.bones.rightFoot     = [-20,0,0];
    teachPose.hipsY = -0.085;
  } else {
    teachPose.bones.leftUpperLeg = [-18,0,-6];  teachPose.bones.rightUpperLeg = [6,0,8];
    teachPose.bones.leftLowerLeg = [28,0,0];    teachPose.bones.rightLowerLeg = [14,0,0];
    teachPose.bones.leftFoot     = [-10,0,0];   teachPose.bones.rightFoot     = [-16,0,0];
    teachPose.hipsY = -0.022;
  }
syncTeachUi();
}

V.MOTION_MAP[TEACH_ID] = { id:TEACH_ID, label:'ティーチング中', loop:true, duration:10.0,
  fn:function(el, w, c){
    var b = c.blend, hips = c.bones.hips;
    ALL_TEACH_BONES.forEach(function(bn){
      var v = teachPose.bones[bn];
      b(bn, v[0], v[1], v[2], w);
    });
    if (hips) hips.obj.position.y += teachPose.hipsY * w;
  }
};

var weaponBtns = {}, teachControlsEl = null, teachOutEl = null, teachStatusEl = null, teachTabBtns = {}, teachPresetSel = null;
loadTeachPreset('assault');
function syncWeaponUi(){
  Object.keys(weaponBtns).forEach(function(id){
    weaponBtns[id].classList.toggle('on', state.equipped === id);
    if (state.failed[id]) weaponBtns[id].disabled = true;
  });
  if (weaponBtns.__none) weaponBtns.__none.classList.toggle('on', !state.equipped);
}
function isTeaching(){
  return !!(V.motion && !V.motionFading && V.motion.name === TEACH_ID);
}
function syncTeachStatus(){
  if (!teachStatusEl) return;
  teachStatusEl.textContent = isTeaching() ? '状態: ティーチング稼働中（編集中）' : '状態: 停止中（「ティーチング開始」または「読込」で編集）';
  teachStatusEl.style.color = isTeaching() ? '#9ef5b2' : '';
}
function buildTeachExportText(){
  var lines = [teachPose.preset + ': {'];
  lines.push('  spine:[' + teachPose.bones.spine.join(',') + '], chest:[' + teachPose.bones.chest.join(',') +
    '], neck:[' + teachPose.bones.neck.join(',') + '], head:[' + teachPose.bones.head.join(',') +
    '], hips:[' + teachPose.bones.hips.join(',') + '],');
  lines.push('  rightUpperArm:[' + teachPose.bones.rightUpperArm.join(',') + '], rightLowerArm:[' +
    teachPose.bones.rightLowerArm.join(',') + '], rightHand:[' + teachPose.bones.rightHand.join(',') + '],');
  lines.push('  leftUpperArm:[' + teachPose.bones.leftUpperArm.join(',') + '], leftLowerArm:[' +
    teachPose.bones.leftLowerArm.join(',') + '], leftHand:[' + teachPose.bones.leftHand.join(',') + ']');
  lines.push('}');
  if (state.equipped && GUN_WEAPONS[state.equipped]){
    var d = GUN_WEAPONS[state.equipped];
    lines.push('// ' + state.equipped + ': p:[' + d.p.map(function(v){ return v.toFixed(3); }).join(',') +
      '], r:[' + (d.r || [0,0,0]).map(function(v){ return Math.round(v); }).join(',') + ']');
  }
  lines.push('// hipsY:' + teachPose.hipsY.toFixed(3) +
    ' | legs: L[' + teachPose.bones.leftUpperLeg.join(',') + '/' + teachPose.bones.leftLowerLeg[0] + '/' + teachPose.bones.leftFoot[0] +
    '] R[' + teachPose.bones.rightUpperLeg.join(',') + '/' + teachPose.bones.rightLowerLeg[0] + '/' + teachPose.bones.rightFoot[0] + ']');
  return lines.join('\n');
}
function syncTeachOut(){
  if (teachOutEl) teachOutEl.value = buildTeachExportText();
}
function makeAxisRow(label, val, min, max, step, isFloat, onChange){
  var line = document.createElement('div');
  line.style.cssText = 'display:flex;align-items:center;gap:4px;margin:2px 0;font-size:11px;';
  var lab = document.createElement('span');
  lab.textContent = label; lab.style.cssText = 'width:58px;flex-shrink:0;';
  var inp = document.createElement('input');
  inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
  inp.style.cssText = 'flex:1;min-width:60px;';
  var vEl = document.createElement('span');
  vEl.style.cssText = 'width:40px;text-align:right;font-family:monospace;';
  vEl.textContent = isFloat ? Number(val).toFixed(3) : String(Math.round(val));
  function setVal(nv){
    nv = Math.max(min, Math.min(max, nv));
    nv = isFloat ? Math.round(nv * 1000) / 1000 : Math.round(nv);
    inp.value = nv;
    vEl.textContent = isFloat ? nv.toFixed(3) : String(nv);
    onChange(nv);
    syncTeachOut();
  }
  inp.addEventListener('input', function(){ setVal(parseFloat(inp.value)); });
  function jog(d, txt){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'act small'; b.textContent = txt;
    b.style.cssText = 'padding:1px 4px;font-size:10px;min-width:22px;';
    b.addEventListener('click', function(){ setVal(parseFloat(inp.value) + d); });
    return b;
  }
  var s1 = isFloat ? 0.002 : 1, s5 = isFloat ? 0.010 : 5;
  line.appendChild(lab);
  line.appendChild(jog(-s5, '-')); line.appendChild(jog(-s1, '<'));
  line.appendChild(inp);
  line.appendChild(jog(s1, '>')); line.appendChild(jog(s5, '+'));
  line.appendChild(vEl);
  return line;
}
function syncTeachUi(){
  syncTeachStatus();
  Object.keys(teachTabBtns).forEach(function(id){
    teachTabBtns[id].classList.toggle('on', teachPose.tab === id);
  });
  if (!teachControlsEl) return;
  teachControlsEl.innerHTML = '';
  if (teachPose.tab === 'weapon'){
    var wid = state.equipped;
    if (!wid || !GUN_WEAPONS[wid]){
      var msg = document.createElement('div');
      msg.style.cssText = 'font-size:11px;opacity:.8;padding:4px 0;';
      msg.textContent = '上の「武器（右手に装着）」から武器を選ぶと p / r を調整できます';
      teachControlsEl.appendChild(msg);
    } else {
      var def = GUN_WEAPONS[wid];
      if (!def.r) def.r = [0,0,0];
      ['X','Y','Z'].forEach(function(ax, i){
        teachControlsEl.appendChild(makeAxisRow('位置 ' + ax, def.p[i], -0.25, 0.25, 0.002, true, function(nv){
          def.p[i] = nv; applyPivotTransform(wid);
        }));
      });
      ['X','Y','Z'].forEach(function(ax, i){
        teachControlsEl.appendChild(makeAxisRow('回転 ' + ax, def.r[i], -180, 180, 1, false, function(nv){
          def.r[i] = nv; applyPivotTransform(wid);
        }));
      });
    }
  } else {
    var tabDef = TEACH_TABS.filter(function(t){ return t.id === teachPose.tab; })[0];
    if (tabDef){
      tabDef.items.forEach(function(item){
        var hd = document.createElement('div');
        hd.style.cssText = 'font-size:11px;font-weight:bold;margin:5px 0 1px;opacity:.85;';
        hd.textContent = item.title + ' (' + item.bn + ')';
        teachControlsEl.appendChild(hd);
        for (var ai = 0; ai < 3; ai++){
          (function(bn, idx, axLabel){
            teachControlsEl.appendChild(makeAxisRow(axLabel, teachPose.bones[bn][idx], -160, 160, 1, false, function(nv){
              teachPose.bones[bn][idx] = nv;
            }));
          })(item.bn, ai, item.axes[ai]);
        }
      });
      if (teachPose.tab === 'legs'){
        var hd2 = document.createElement('div');
        hd2.style.cssText = 'font-size:11px;font-weight:bold;margin:5px 0 1px;opacity:.85;';
        hd2.textContent = '腰の高さ (hipsY)';
        teachControlsEl.appendChild(hd2);
        teachControlsEl.appendChild(makeAxisRow('高さ Y', teachPose.hipsY, -0.25, 0.15, 0.002, true, function(nv){
          teachPose.hipsY = nv;
        }));
      }
    }
  }
  syncTeachOut();
}

function injectUi(){
  var anchor = document.getElementById('melee-groups');
  if (!anchor || document.getElementById('gun-weapon-row')) return;

  var det = document.createElement('details');
  det.className = 'grp'; det.open = true; det.id = 'gun-weapon-row';
  var sum = document.createElement('summary'); sum.textContent = '武器（右手に装着）';
  det.appendChild(sum);
  var row = document.createElement('div'); row.className = 'row';
  var none = document.createElement('button');
  none.type = 'button'; none.className = 'act small'; none.textContent = 'なし';
  none.addEventListener('click', function(){ equip(null); });
  row.appendChild(none); weaponBtns.__none = none;
  Object.keys(GUN_WEAPONS).forEach(function(id){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'act small'; b.textContent = GUN_WEAPONS[id].label;
    b.addEventListener('click', function(){ equip(id); });
    row.appendChild(b); weaponBtns[id] = b;
  });
  det.appendChild(row);
  anchor.parentNode.insertBefore(det, anchor);

  var tDet = document.createElement('details');
  tDet.className = 'grp'; tDet.open = true; tDet.id = 'gun-teach-box';
  var tSum = document.createElement('summary'); tSum.textContent = 'ポーズ・ティーチング（関節＆武器調整）';
  tDet.appendChild(tSum);

  teachStatusEl = document.createElement('div');
  teachStatusEl.style.cssText = 'font-size:11px;margin:2px 0 4px;';
  tDet.appendChild(teachStatusEl);

  var topRow = document.createElement('div');
  topRow.className = 'row'; topRow.style.marginBottom = '4px';
  var startBtn = document.createElement('button');
  startBtn.type = 'button'; startBtn.className = 'act small'; startBtn.textContent = 'ティーチング開始';
  startBtn.addEventListener('click', function(){ V.startMotion(TEACH_ID); });
  var stopBtn = document.createElement('button');
  stopBtn.type = 'button'; stopBtn.className = 'act small'; stopBtn.textContent = '終了';
  stopBtn.addEventListener('click', function(){ if (isTeaching()) V.stopMotion(false); });
  teachPresetSel = document.createElement('select');
  teachPresetSel.style.cssText = 'font-size:11px;padding:2px;';
  [
    ['assault','脇抱え(assault)'], ['shoulder_carry','肩担ぎ(javelin)'],
    ['carry','抱え(pod)'], ['hip','腰抱え(gatling)'], ['wand','ワンド(wand)'], ['stand','立ち(stand)']
  ].forEach(function(pair){
    var op = document.createElement('option'); op.value = pair[0]; op.textContent = pair[1];
    teachPresetSel.appendChild(op);
  });
  var loadBtn = document.createElement('button');
  loadBtn.type = 'button'; loadBtn.className = 'act small'; loadBtn.textContent = '読込';
  loadBtn.addEventListener('click', function(){
    var key = teachPresetSel.value;
    var defWpn = { assault:'akm', shoulder_carry:'javelin', carry:'pod', hip:'gatling', wand:'flame' };
    if (!state.equipped && defWpn[key]) equip(defWpn[key]);
    loadTeachPreset(key);
    if (!isTeaching()) V.startMotion(TEACH_ID);
  });
  topRow.appendChild(startBtn); topRow.appendChild(stopBtn);
  topRow.appendChild(teachPresetSel); topRow.appendChild(loadBtn);
  tDet.appendChild(topRow);

  var tabRow = document.createElement('div');
  tabRow.className = 'row'; tabRow.style.marginBottom = '4px';
  TEACH_TABS.forEach(function(t){
    var tb = document.createElement('button');
    tb.type = 'button'; tb.className = 'act small'; tb.textContent = t.label;
    tb.addEventListener('click', function(){ teachPose.tab = t.id; syncTeachUi(); });
    tabRow.appendChild(tb); teachTabBtns[t.id] = tb;
  });
  tDet.appendChild(tabRow);

  teachControlsEl = document.createElement('div');
  tDet.appendChild(teachControlsEl);

  var actRow = document.createElement('div');
  actRow.className = 'row'; actRow.style.marginTop = '6px';
  var applyBtn = document.createElement('button');
  applyBtn.type = 'button'; applyBtn.className = 'act small'; applyBtn.textContent = '現在のHoldへ即反映(テスト用)';
  applyBtn.addEventListener('click', function(){
    var key = teachPose.preset;
    if (key !== 'stand' && GUN_HOLDS[key]){
      GUN_BONES.forEach(function(bn){ GUN_HOLDS[key][bn] = teachPose.bones[bn].slice(); });
      if (state.equipped && GUN_HOLD_OFF[state.equipped]) delete GUN_HOLD_OFF[state.equipped];
      applyBtn.textContent = '反映しました!';
      setTimeout(function(){ applyBtn.textContent = '現在のHoldへ即反映(テスト用)'; }, 1000);
    }
  });
  var cpBtn = document.createElement('button');
  cpBtn.type = 'button'; cpBtn.className = 'act small'; cpBtn.textContent = 'コードをコピー';
  cpBtn.addEventListener('click', function(){
    var txt = buildTeachExportText();
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(function(){
        cpBtn.textContent = 'コピー済!';
        setTimeout(function(){ cpBtn.textContent = 'コードをコピー'; }, 1000);
      }, function(){ teachOutEl.select(); document.execCommand('copy'); });
    } else {
      teachOutEl.select(); document.execCommand('copy');
    }
  });
  actRow.appendChild(applyBtn); actRow.appendChild(cpBtn);
  tDet.appendChild(actRow);

  teachOutEl = document.createElement('textarea');
  teachOutEl.readOnly = true; teachOutEl.rows = 5;
  teachOutEl.style.cssText = 'width:100%;box-sizing:border-box;margin-top:4px;font:10px/1.35 monospace;resize:vertical;';
  tDet.appendChild(teachOutEl);

  anchor.parentNode.insertBefore(tDet, anchor);
  syncWeaponUi();
  syncTeachUi();
}

/* モーション登録: tab 'melee' に武器別グループとして並べる */
var groupLabels = {
  akm:'射撃：AKM', shotgun:'射撃：ポンプショットガン', sniper:'射撃：スナイパーライフル',
  javelin:'射撃：ジャベリン', pod:'射撃：ミサイルポッド', harpoon:'射撃：ハープーンガン',
  flame:'射撃：火炎放射ワンド', gatling:'射撃：ガトリング'
};
Object.keys(GUN_WEAPONS).forEach(function(wid){
  var list = GUN_MOTIONS.filter(function(m){ return m.weapon === wid; }).map(function(m){
    return { id:m.id, label:m.label, loop:m.loop, duration:m.duration,
      fn:function(el, w, c){ m.fn(el, w, c.blend, c.trackVal, c.gauss, c.bones.hips || null); } };
  });
  if (!list.length) return;
  V.registerMotions({ id:'gun_' + wid, label:groupLabels[wid], open:true, tab:'melee' }, list);
});

if (typeof document !== 'undefined'){
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectUi);
  else injectUi();
}
if (typeof requestAnimationFrame !== 'undefined' && typeof THREE !== 'undefined'){
  requestAnimationFrame(watcher);
}
})(window.VRMViewer = window.VRMViewer || {});