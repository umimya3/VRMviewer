/* gun_motions_for_game.js — ぶりVS (Ver107) 輸入用・射撃武器モーション集
 * ビューワー開発環境 (js/motions/shooting.js) の移植可能ブロックから自動生成。
 * 手で編集しないこと (正本は shooting.js)。
 *
 * 組み込み手順 (ゲーム側 index.html):
 *  1. このファイルを <script> で読み込む (index.html 本体の後)。
 *  2. applyMotion(t) の先頭、applyCharMotionPose の直後に1行追加:
 *       if (applyGunMotion(name, el, w)) return;
 *  3. 武器GLBは GUN_WEAPONS の file 名で models/weapons/ に置き、
 *     WPN_GLB_FILES / 装着オフセット表に GUN_WEAPONS の p を転記する。
 *  4. モーションの長さは GUN_MOTIONS の duration / loop が正。
 *     戦闘数値 (ダメージ・リーチ等) はここには含まれない。ゲーム側で決める。
 */

/* 武器定義: file は models/weapons/ のファイル名 (ぶりVSと共通)。
   p = 右手への装着位置オフセット[m], r = 装着回転[deg] (グリップ微調整用)。
   ゲーム側 ZAKO_GLB_OFF と同じ役割。数値はチェック環境での初期値。 */
var GUN_WEAPONS = {
  sword:   { label:'鰤ソード',          file:'buri_sword.glb',         p:[0.010,0.020,0.010], r:[0,0,0], hold:'sword' },
  akm:     { label:'AKM',              file:'akm.glb',                  p:[0.010,0.020,0.010], r:[0,0,0], hold:'shoulder' },
  shotgun: { label:'ポンプショットガン', file:'pump_shotgun.glb',        p:[0.010,0.020,0.010], r:[0,0,0], hold:'shoulder' },
  sniper:  { label:'スナイパーライフル', file:'sniper_rifle.glb',        p:[0.010,0.020,0.010], r:[0,0,0], hold:'shoulder' },
  javelin: { label:'ジャベリン',        file:'javelin.glb',              p:[0.030,-0.020,0.060], r:[0,0,0], hold:'shoulder_carry' },
  pod:     { label:'ミサイルポッド',     file:'missile_pod_launcher.glb', p:[0.000,0.010,0.020], r:[0,0,0], hold:'carry' },
  harpoon: { label:'ハープーンガン',     file:'harpoon_gun.glb',          p:[0.010,0.020,0.010], r:[0,0,0], hold:'shoulder' },
  flame:   { label:'火炎放射ワンド',     file:'flamethrower_wand.glb',    p:[0.010,0.020,0.010], r:[0,0,0], hold:'wand' },
  gatling: { label:'ガトリング',        file:'portable_gatling_gun.glb', p:[0.010,0.020,0.010], r:[0,0,0], hold:'hip' }
};

/* 保持ポーズ: 立ち (stand) から保持形への補間 k=0..1 で使う絶対角度[deg]。
   airshot / bazooka (vs.js) の実測ポーズを基準に武器種別へ展開したもの。 */
var GUN_STAND = {
  spine:[0,0,0], chest:[0,0,0], neck:[0,0,0], head:[0,0,0], hips:[0,0,0],
  rightUpperArm:[-70,0,5], rightLowerArm:[0,0,15], rightHand:[0,0,0],
  leftUpperArm:[-72,0,-6], leftLowerArm:[0,0,-14], leftHand:[0,0,0]
};
var GUN_HOLDS = {
  shoulder: {
    spine:[2,-6,0], chest:[2,-8,0], neck:[0,4,0], head:[2,10,3], hips:[0,-10,0],
    rightUpperArm:[-50,0,60], rightLowerArm:[0,0,74], rightHand:[-30,0,-50],
    leftUpperArm:[-18,0,-80], leftLowerArm:[0,0,-20], leftHand:[0,0,0]
  },
  shoulder_carry: {
    spine:[7,0,0], chest:[4,0,0], neck:[0,2,0], head:[5,4,0], hips:[0,-4,0],
    rightUpperArm:[-32,0,42], rightLowerArm:[0,0,8], rightHand:[-6,0,-12],
    leftUpperArm:[-38,0,-32], leftLowerArm:[0,0,-28], leftHand:[0,0,0]
  },
  carry: {
    spine:[6,0,0], chest:[3,0,0], neck:[0,0,0], head:[3,0,0], hips:[0,0,0],
    rightUpperArm:[-54,0,28], rightLowerArm:[0,0,40], rightHand:[-12,0,-22],
    leftUpperArm:[-56,0,-28], leftLowerArm:[0,0,-40], leftHand:[0,0,0]
  },
  hip: {
    spine:[9,0,0], chest:[5,0,0], neck:[-2,0,0], head:[4,0,0], hips:[0,-6,0],
    rightUpperArm:[-60,0,32], rightLowerArm:[0,0,46], rightHand:[-14,0,-24],
    leftUpperArm:[-34,0,-58], leftLowerArm:[0,0,-32], leftHand:[0,0,0]
  },
  wand: {
    spine:[2,-5,0], chest:[2,-7,0], neck:[0,3,0], head:[2,9,3], hips:[0,-8,0],
    rightUpperArm:[-52,0,54], rightLowerArm:[0,0,66], rightHand:[-26,0,-46],
    leftUpperArm:[-26,0,-72], leftLowerArm:[0,0,-26], leftHand:[0,0,0]
  }
};
var GUN_BONES = ['spine','chest','neck','head','hips',
  'rightUpperArm','rightLowerArm','rightHand','leftUpperArm','leftLowerArm','leftHand'];

/* 1フレーム分: 保持ポーズ (k) ＋ 追加オフセット add {bone:[dx,dy,dz]} を合成し、
   各ボーン1回だけ B を呼ぶ (blendBoneOffset は rest からの slerp なので二重呼びは合成にならない)。 */
function gunFrame(B, holdName, k, add, w){
  var S = GUN_STAND, P = GUN_HOLDS[holdName];
  for (var i = 0; i < GUN_BONES.length; i++){
    var bn = GUN_BONES[i], s = S[bn], p = P[bn], a = add[bn] || [0,0,0];
    B(bn, s[0] + (p[0] - s[0]) * k + a[0],
          s[1] + (p[1] - s[1]) * k + a[1],
          s[2] + (p[2] - s[2]) * k + a[2], w);
  }
}
/* 発射反動: 時刻 t0 に撃って tau で減衰する指数キック (vs.js の csKick と同型) */
function gunKick(el, t0, tau){ return el > t0 ? Math.exp(-(el - t0) / tau) : 0; }
/* 踏ん張り脚: 膝を少し曲げて重心を落とす */
function gunBrace(B, k, w){
  B('leftUpperLeg', -7 * k, 0, 2 * k, w); B('rightUpperLeg', -7 * k, 0, -2 * k, w);
  B('leftLowerLeg', 12 * k, 0, 0, w);    B('rightLowerLeg', 12 * k, 0, 0, w);
  B('leftFoot', -5 * k, 0, 0, w);        B('rightFoot', -5 * k, 0, 0, w);
}

/* モーション定義: fn(el, w, B, TV, G, H)
   B = blendBoneOffset(name,x,y,z,w), TV = trackVal, G = gauss, H = bones.hips (無い場合 null) */
var GUN_MOTIONS = [
/* ---------------- AKM ---------------- */
{ id:'akm_aim', label:'構え（肩付け）', weapon:'akm', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.5,1],[2.4,1]]);
    var sway = Math.sin(el * 1.7) * 0.8 * k;
    gunFrame(B, 'shoulder', k, { head:[sway * 0.4, sway, 0], chest:[0, sway * 0.5, 0] }, w);
    gunBrace(B, k * 0.7, w);
    if (H) H.obj.position.y += -0.012 * k * w;
  } },
{ id:'akm_single', label:'単発', weapon:'akm', loop:false, duration:1.0,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.22,1],[0.8,1],[1.0,0]]);
    var kick = gunKick(el, 0.32, 0.05);
    gunFrame(B, 'shoulder', k, {
      spine:[-3.5 * kick, 0, 0], chest:[-2.5 * kick, 0, 0], head:[-3 * kick, 0, 0],
      rightUpperArm:[-5 * kick, 0, 7 * kick], rightHand:[13 * kick, 0, 0],
      leftUpperArm:[-3 * kick, 0, -5 * kick] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += -0.012 * k * w; H.obj.position.z += -0.03 * kick * w; }
  } },
{ id:'akm_burst', label:'3点バースト', weapon:'akm', loop:false, duration:1.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.22,1],[1.15,1],[1.4,0]]);
    var kick = gunKick(el, 0.35, 0.05) + 1.25 * gunKick(el, 0.47, 0.05) + 1.5 * gunKick(el, 0.59, 0.05);
    gunFrame(B, 'shoulder', k, {
      spine:[-3.5 * kick, 0, 0], chest:[-2.5 * kick, 0, 0], head:[-3 * kick, 0, 0],
      rightUpperArm:[-5 * kick, 0, 7 * kick], rightHand:[13 * kick, 0, 0],
      leftUpperArm:[-3 * kick, 0, -5 * kick] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += -0.012 * k * w; H.obj.position.z += -0.03 * kick * w; }
  } },
{ id:'akm_auto', label:'フルオート連射', weapon:'akm', loop:false, duration:2.2,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.22,1],[1.95,1],[2.2,0]]);
    var firing = (el > 0.4 && el < 1.8) ? 1 : 0;
    var jit = firing * Math.sin(el * 57) * 1.6;
    var climb = firing * TV(el, [[0.4,0],[1.8,1],[2.2,0]]) * 6;
    gunFrame(B, 'shoulder', k, {
      spine:[-4 * firing + jit * 0.3, 0, 0], chest:[-3 * firing, 0, 0], head:[-2 * firing - climb * 0.5, 0, 0],
      rightUpperArm:[-climb, jit * 0.4, 4 * firing], rightHand:[8 * firing, 0, 0],
      leftUpperArm:[-2 * firing, 0, -3 * firing] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += (-0.012 * k - 0.004 * firing) * w; H.obj.position.z += -0.035 * firing * k * w; }
  } },
{ id:'akm_reload', label:'リロード（マガジン交換）', weapon:'akm', loop:false, duration:2.3,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,1],[0.35,0.25],[1.85,0.25],[2.3,1]]);
    var reach = TV(el, [[0.35,0],[0.7,1],[1.15,1],[1.5,0],[2.3,0]]);
    var slap = G(el, 1.62, 0.05);
    gunFrame(B, 'shoulder', k, {
      rightUpperArm:[6 * reach, 0, -14 * reach], rightHand:[10 * reach, 0, 0],
      leftUpperArm:[26 * reach, 0, 26 * reach], leftLowerArm:[0, 0, 34 * reach],
      head:[8 * reach - 3 * slap, 0, 0], chest:[3 * reach, 0, 0],
      spine:[0, 0, 2 * slap] }, w);
    gunBrace(B, 0.6, w);
    if (H) H.obj.position.y += -0.006 * w;
  } },
/* ---------------- ポンプショットガン ---------------- */
{ id:'sg_aim', label:'構え（肩付け）', weapon:'shotgun', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.5,1],[2.4,1]]);
    var sway = Math.sin(el * 1.6) * 0.8 * k;
    gunFrame(B, 'shoulder', k, { head:[sway * 0.4, sway, 0], chest:[0, sway * 0.5, 0] }, w);
    gunBrace(B, k * 0.8, w);
    if (H) H.obj.position.y += -0.014 * k * w;
  } },
{ id:'sg_fire_pump', label:'射撃→ポンプ', weapon:'shotgun', loop:false, duration:1.5,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.2,1],[1.3,1],[1.5,0]]);
    var kick = gunKick(el, 0.3, 0.06);
    var pump = TV(el, [[0.55,0],[0.72,1],[0.95,0],[1.5,0]]);
    var pj = G(el, 0.95, 0.04);
    gunFrame(B, 'shoulder', k, {
      spine:[-6 * kick + 1.5 * pj, 0, 0], chest:[-4 * kick, 0, 0], head:[-4 * kick, 0, 0],
      rightUpperArm:[-8 * kick, 0, 9 * kick], rightHand:[16 * kick, 0, 0],
      leftUpperArm:[-4 * kick + 13 * pump, 0, -6 * kick + 10 * pump],
      leftLowerArm:[0, 0, -16 * pump] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += -0.014 * k * w; H.obj.position.z += -0.05 * kick * w; }
  } },
{ id:'sg_double', label:'2連射（射撃-ポンプ-射撃）', weapon:'shotgun', loop:false, duration:2.0,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.2,1],[1.8,1],[2.0,0]]);
    var kick = gunKick(el, 0.3, 0.06) + gunKick(el, 1.25, 0.06);
    var pump = TV(el, [[0.55,0],[0.72,1],[0.95,0],[2.0,0]]);
    gunFrame(B, 'shoulder', k, {
      spine:[-6 * kick, 0, 0], chest:[-4 * kick, 0, 0], head:[-4 * kick, 0, 0],
      rightUpperArm:[-8 * kick, 0, 9 * kick], rightHand:[16 * kick, 0, 0],
      leftUpperArm:[-4 * kick + 13 * pump, 0, -6 * kick + 10 * pump],
      leftLowerArm:[0, 0, -16 * pump] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += -0.014 * k * w; H.obj.position.z += -0.05 * kick * w; }
  } },
{ id:'sg_load', label:'装填（1発ずつ）', weapon:'shotgun', loop:false, duration:1.7,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,0.7],[1.45,0.7],[1.7,0]]);
    var push = G(el, 0.7, 0.10) + G(el, 1.1, 0.10);
    gunFrame(B, 'shoulder', k, {
      rightUpperArm:[-10, 0, -8], rightHand:[-14, 0, 0],
      leftUpperArm:[10 * push, 0, 14 * push], leftLowerArm:[0, 0, 20 * push],
      head:[6, 0, 0], chest:[2, 0, 0] }, w);
    gunBrace(B, 0.6, w);
    if (H) H.obj.position.y += -0.008 * w;
  } },
/* ---------------- スナイパーライフル ---------------- */
{ id:'sr_aim', label:'狙撃構え（スコープ）', weapon:'sniper', loop:true, duration:2.8,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.7,1],[2.8,1]]);
    var breath = Math.sin(el * 2.2) * 0.5 * k;
    gunFrame(B, 'shoulder', k, { head:[breath * 0.3, breath * 0.4, 0], chest:[breath * 0.2, 0, 0],
      rightUpperArm:[0, 0, breath * 0.3] }, w);
    gunBrace(B, k, w);
    if (H) H.obj.position.y += -0.016 * k * w;
  } },
{ id:'sr_fire', label:'狙撃（単発）', weapon:'sniper', loop:false, duration:1.3,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.35,1],[1.05,1],[1.3,0]]);
    var kick = gunKick(el, 0.55, 0.07);
    gunFrame(B, 'shoulder', k, {
      spine:[-8 * kick, 0, 0], chest:[-5 * kick, 0, 0], head:[-7 * kick, 0, 0],
      neck:[-4 * kick, 0, 0],
      rightUpperArm:[-10 * kick, 0, 11 * kick], rightHand:[20 * kick, 0, 0],
      leftUpperArm:[-5 * kick, 0, -7 * kick] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += -0.016 * k * w; H.obj.position.z += -0.07 * kick * w; }
  } },
{ id:'sr_bolt', label:'ボルト操作', weapon:'sniper', loop:false, duration:1.6,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.3,1],[1.3,1],[1.6,0]]);
    var up = TV(el, [[0.4,0],[0.55,1],[0.7,1],[0.85,0],[1.6,0]]);
    var back = TV(el, [[0.55,0],[0.7,1],[0.85,1],[1.05,0],[1.6,0]]);
    gunFrame(B, 'shoulder', k, {
      rightUpperArm:[10 * up - 6 * back, 0, -16 * up + 8 * back],
      rightLowerArm:[0, 0, -20 * up + 26 * back],
      rightHand:[-18 * up + 10 * back, 0, 0],
      head:[4 * up, 6 * up, 0] }, w);
    gunBrace(B, k, w);
    if (H) H.obj.position.y += -0.016 * k * w;
  } },
{ id:'sr_fire_bolt', label:'狙撃→ボルト操作', weapon:'sniper', loop:false, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.35,1],[2.1,1],[2.4,0]]);
    var kick = gunKick(el, 0.55, 0.07);
    var up = TV(el, [[1.15,0],[1.3,1],[1.45,1],[1.6,0],[2.4,0]]);
    var back = TV(el, [[1.3,0],[1.45,1],[1.6,1],[1.8,0],[2.4,0]]);
    gunFrame(B, 'shoulder', k, {
      spine:[-8 * kick, 0, 0], chest:[-5 * kick, 0, 0], head:[-7 * kick + 4 * up, 6 * up, 0],
      neck:[-4 * kick, 0, 0],
      rightUpperArm:[-10 * kick + 10 * up - 6 * back, 0, 11 * kick - 16 * up + 8 * back],
      rightLowerArm:[0, 0, -20 * up + 26 * back],
      rightHand:[20 * kick - 18 * up + 10 * back, 0, 0],
      leftUpperArm:[-5 * kick, 0, -7 * kick] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += -0.016 * k * w; H.obj.position.z += -0.07 * kick * w; }
  } },
/* ---------------- ジャベリン ---------------- */
{ id:'jv_carry', label:'肩担ぎ', weapon:'javelin', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.5,1],[2.4,1]]);
    var sway = Math.sin(el * 1.6) * 0.7 * k;
    gunFrame(B, 'shoulder_carry', k, { head:[0, sway, 0] }, w);
    gunBrace(B, k * 0.5, w);
    if (H) H.obj.position.y += -0.008 * k * w;
  } },
{ id:'jv_lockon', label:'ロックオン', weapon:'javelin', loop:false, duration:2.0,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.45,1],[2.0,1]]);
    var track = Math.sin(el * 3.1) * 1.2 * k * TV(el, [[0.5,0],[0.9,1],[2.0,1]]);
    gunFrame(B, 'shoulder_carry', k, {
      rightUpperArm:[-14 * k, 0, 10 * k], rightHand:[-8 * k, 0, 0],
      leftUpperArm:[-8 * k, 0, -6 * k],
      head:[2 * k, track, 0], hips:[0, track * 0.6, 0], chest:[0, track * 0.4, 0] }, w);
    gunBrace(B, k * 0.7, w);
    if (H) H.obj.position.y += -0.01 * k * w;
  } },
{ id:'jv_fire', label:'発射', weapon:'javelin', loop:false, duration:1.7,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.4,1],[0.95,1],[1.35,0.3],[1.7,0]]);
    var launch = G(el, 0.62, 0.10);
    var rock = gunKick(el, 0.62, 0.12);
    gunFrame(B, 'shoulder_carry', k, {
      spine:[-7 * rock, 0, 0], chest:[-4 * rock, 0, 0], head:[-5 * rock + 4 * launch, 0, 0],
      rightUpperArm:[-16 * launch, 0, 6 * rock], rightHand:[10 * rock, 0, 0] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += -0.01 * k * w; H.obj.position.z += -0.04 * rock * w; }
  } },
/* ---------------- ミサイルポッド ---------------- */
{ id:'pod_carry', label:'抱え構え', weapon:'pod', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.5,1],[2.4,1]]);
    var sway = Math.sin(el * 1.5) * 0.7 * k;
    gunFrame(B, 'carry', k, { head:[0, sway, 0], hips:[0, sway * 0.5, 0] }, w);
    gunBrace(B, k * 0.6, w);
    if (H) H.obj.position.y += -0.01 * k * w;
  } },
{ id:'pod_single', label:'単発', weapon:'pod', loop:false, duration:1.3,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[1.05,1],[1.3,0]]);
    var dip = G(el, 0.48, 0.09);
    var rock = gunKick(el, 0.48, 0.10);
    gunFrame(B, 'carry', k, {
      spine:[-5 * rock, 0, 0], chest:[-3 * rock, 0, 0], head:[-3 * rock, 0, 0],
      rightUpperArm:[9 * dip, 0, 4 * rock], leftUpperArm:[9 * dip, 0, -4 * rock],
      rightHand:[8 * rock, 0, 0] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += (-0.01 * k - 0.012 * dip) * w; H.obj.position.z += -0.035 * rock * w; }
  } },
{ id:'pod_salvo', label:'斉射（3連）', weapon:'pod', loop:false, duration:2.1,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[1.85,1],[2.1,0]]);
    var dip = G(el, 0.45, 0.09) + G(el, 0.8, 0.09) + G(el, 1.15, 0.09);
    var rock = gunKick(el, 0.45, 0.10) + gunKick(el, 0.8, 0.10) + gunKick(el, 1.15, 0.10);
    var shake = (el > 0.4 && el < 1.35) ? Math.sin(el * 49) * 1.1 : 0;
    gunFrame(B, 'carry', k, {
      spine:[-5 * rock, shake * 0.3, 0], chest:[-3 * rock, 0, 0], head:[-3 * rock, shake * 0.4, 0],
      rightUpperArm:[9 * dip, 0, 4 * rock], leftUpperArm:[9 * dip, 0, -4 * rock],
      rightHand:[8 * rock, 0, 0] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += (-0.01 * k - 0.012 * dip) * w; H.obj.position.z += -0.035 * rock * w; }
  } },
{ id:'pod_reload', label:'予備ミサイル装填', weapon:'pod', loop:false, duration:2.2,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.3,0.8],[1.9,0.8],[2.2,0]]);
    var reach = TV(el, [[0.4,0],[0.8,1],[1.3,1],[1.7,0],[2.2,0]]);
    var pat = G(el, 1.45, 0.06);
    gunFrame(B, 'carry', k, {
      rightUpperArm:[8 * reach, 0, -6 * reach],
      leftUpperArm:[-24 * reach, 0, -30 * reach], leftLowerArm:[0, 0, -30 * reach],
      leftHand:[-16 * pat, 0, 0],
      head:[7 * reach, -6 * reach, 0], chest:[3 * reach, -3 * reach, 0] }, w);
    gunBrace(B, 0.7, w);
    if (H) H.obj.position.y += -0.012 * w;
  } },
/* ---------------- ハープーンガン ---------------- */
{ id:'hp_aim', label:'構え（肩付け）', weapon:'harpoon', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.5,1],[2.4,1]]);
    var sway = Math.sin(el * 1.6) * 0.8 * k;
    gunFrame(B, 'shoulder', k, { head:[sway * 0.4, sway, 0] }, w);
    gunBrace(B, k * 0.7, w);
    if (H) H.obj.position.y += -0.012 * k * w;
  } },
{ id:'hp_fire', label:'発射', weapon:'harpoon', loop:false, duration:1.2,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.22,1],[0.95,1],[1.2,0]]);
    var kick = gunKick(el, 0.38, 0.05);
    var lean = TV(el, [[0.38,0],[0.6,1],[1.0,0],[1.2,0]]);
    gunFrame(B, 'shoulder', k, {
      spine:[-4 * kick + 5 * lean, 0, 0], chest:[-3 * kick + 3 * lean, 0, 0], head:[-3 * kick, 0, 0],
      rightUpperArm:[-6 * kick, 0, 8 * kick], rightHand:[14 * kick, 0, 0],
      leftUpperArm:[-3 * kick, 0, -5 * kick] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += -0.012 * k * w; H.obj.position.z += (-0.04 * kick + 0.03 * lean) * w; }
  } },
{ id:'hp_reel', label:'リール巻き取り', weapon:'harpoon', loop:false, duration:2.2,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[1.95,1],[2.2,0]]);
    var crank = (el > 0.3 && el < 1.9) ? el * 12.0 : 0;
    var cx = Math.sin(crank) * 13, cz = Math.cos(crank) * 13;
    var tug = G(el, 0.75, 0.09) + G(el, 1.2, 0.09) + G(el, 1.65, 0.09);
    gunFrame(B, 'shoulder', k, {
      leftUpperArm:[cx * 0.5, 0, -8 + cz * 0.4], leftLowerArm:[0, 0, -18 + cx * 0.5],
      leftHand:[cx * 0.6, 0, cz * 0.6],
      spine:[6 * tug, 0, 0], chest:[4 * tug, 0, 0], head:[-3 * tug, 0, 0],
      rightUpperArm:[3 * tug, 0, 2 * tug] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += -0.012 * k * w; H.obj.position.z += -0.05 * tug * w; }
  } },
/* ---------------- 火炎放射ワンド ---------------- */
{ id:'fl_aim', label:'構え', weapon:'flame', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.5,1],[2.4,1]]);
    var sway = Math.sin(el * 1.6) * 0.8 * k;
    gunFrame(B, 'wand', k, { head:[sway * 0.4, sway, 0] }, w);
    gunBrace(B, k * 0.7, w);
    if (H) H.obj.position.y += -0.012 * k * w;
  } },
{ id:'fl_spray', label:'放射（左右に払う）', weapon:'flame', loop:false, duration:2.6,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.25,1],[2.3,1],[2.6,0]]);
    var on = TV(el, [[0.3,0],[0.45,1],[2.15,1],[2.3,0],[2.6,0]]);
    var sweep = Math.sin((el - 0.45) * 2.4) * 11 * on;
    var jolt = G(el, 0.38, 0.05) + G(el, 2.22, 0.05);
    gunFrame(B, 'wand', k, {
      hips:[0, sweep * 0.8, 0], chest:[0, sweep * 0.5, 0], head:[0, sweep * 0.35, 0],
      spine:[4 * on - 3 * jolt, sweep * 0.3, 0],
      rightUpperArm:[-4 * on + 5 * jolt, 0, 3 * on], leftUpperArm:[-3 * on, 0, -3 * on],
      rightHand:[6 * jolt, 0, 0] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += -0.014 * k * w; H.obj.position.z += -0.03 * on * w; }
  } },
{ id:'fl_pilot', label:'点火確認', weapon:'flame', loop:false, duration:1.6,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.3,0.8],[1.3,0.8],[1.6,0]]);
    var look = TV(el, [[0.35,0],[0.6,1],[1.1,1],[1.35,0],[1.6,0]]);
    var puff = G(el, 1.05, 0.05);
    gunFrame(B, 'wand', k, {
      rightUpperArm:[-16 * look, 0, 10 * look + 5 * puff], rightHand:[-10 * look + 8 * puff, 0, 0],
      head:[10 * look, 8 * look, 6 * look], neck:[5 * look, 4 * look, 0],
      leftUpperArm:[6 * look, 0, 10 * look] }, w);
    gunBrace(B, 0.6, w);
    if (H) H.obj.position.y += -0.008 * w;
  } },
/* ---------------- ガトリング ---------------- */
{ id:'gt_carry', label:'腰抱え', weapon:'gatling', loop:true, duration:2.4,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.5,1],[2.4,1]]);
    var sway = Math.sin(el * 1.5) * 0.7 * k;
    gunFrame(B, 'hip', k, { head:[0, sway, 0] }, w);
    gunBrace(B, k, w);
    if (H) H.obj.position.y += -0.018 * k * w;
  } },
{ id:'gt_barrage', label:'スピンアップ→連射', weapon:'gatling', loop:false, duration:2.8,
  fn:function(el, w, B, TV, G, H){
    var k = TV(el, [[0,0],[0.3,1],[2.5,1],[2.8,0]]);
    var spin = TV(el, [[0.2,0],[0.85,1],[2.3,1],[2.6,0],[2.8,0]]);
    var firing = (el > 0.85 && el < 2.3) ? 1 : 0;
    var vib = firing * Math.sin(el * 47) * 1.3;
    gunFrame(B, 'hip', k, {
      spine:[5 * spin + vib * 0.3, 0, 0], chest:[3 * spin + vib * 0.3, 0, 0],
      head:[-2 * spin + vib * 0.3, 0, 0],
      rightUpperArm:[vib * 0.5, 0, 3 * firing], rightHand:[5 * firing + vib * 0.4, 0, 0],
      leftUpperArm:[vib * 0.5, 0, -3 * firing] }, w);
    gunBrace(B, k, w);
    if (H){ H.obj.position.y += (-0.018 * k - 0.006 * firing) * w; H.obj.position.z += -0.04 * firing * w; }
  } }
];

/* ゲーム側アダプタ: applyMotion の原始関数へ接続する */
var GUN_MOTION_MAP = {};
GUN_MOTIONS.forEach(function(m){ GUN_MOTION_MAP[m.id] = m; });
function applyGunMotion(name, el, w){
  var d = GUN_MOTION_MAP[name];
  if (!d) return false;
  d.fn(el, w, blendBoneOffset, trackVal, gauss, (typeof bones !== 'undefined' && bones.hips) ? bones.hips : null);
  return true;
}
