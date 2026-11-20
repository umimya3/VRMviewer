(function(){
"use strict";

var V = window.VRMViewer = window.VRMViewer || {};
V.BUILD_ID = '2026-11-20.05';

var errbox = document.getElementById('errbox');
var loadmsg = document.getElementById('loadmsg');
var vrmVerEl = document.getElementById('vrmver');
var statsEl = document.getElementById('stats');
var overlay = document.getElementById('overlay');
var overlayTitle = document.getElementById('overlay-title');
var overlaySub = document.getElementById('overlay-sub');
var stage = document.getElementById('stage');

function showError(msg){
  errbox.style.display = 'block';
  errbox.textContent = 'エラー: ' + msg;
}
function errText(x){
  if (!x) return '';
  try { return String(x.message || x.name || x); } catch(e){ return ''; }
}
function isPolicyError(x){
  var m = errText(x);
  if (!m) return false;
  return /getGamepads/i.test(m)
    || (/gamepad/i.test(m) && /permission|policy|disallowed|SecurityError/i.test(m))
    || /disallowed by permissions policy/i.test(m);
}
window.addEventListener('error', function(e){
  if (isPolicyError(e.error) || isPolicyError(e.message)) return;
  showError(e.message || '不明なエラー');
});
window.addEventListener('unhandledrejection', function(e){
  if (isPolicyError(e.reason)){
    if (e.preventDefault) e.preventDefault();
    return;
  }
  showError('読み込みに失敗しました: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
});

function setLoading(show, title, sub){
  if (title !== undefined) overlayTitle.textContent = title;
  if (sub !== undefined) overlaySub.textContent = sub;
  overlay.classList.toggle('hide', !show);
}

V.showError = showError;
V.setLoading = setLoading;

/* ================= renderer / scene ================= */
var renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true, alpha:true });
} catch(e){
  showError('WebGLを初期化できませんでした: ' + e.message);
  return;
}
var COARSE_POINTER = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, COARSE_POINTER ? 1.75 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);

var scene = new THREE.Scene();
var SKY_FOG_COLOR = 0xcfeaf8;
var skyTex = (function(){
  var c = document.createElement('canvas'); c.width = 2; c.height = 512;
  var g = c.getContext('2d');
  var grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#2e7cd6');
  grad.addColorStop(0.45, '#63aae6');
  grad.addColorStop(0.78, '#a9d6f5');
  grad.addColorStop(1.0, '#e8f6fd');
  g.fillStyle = grad; g.fillRect(0, 0, 2, 512);
  var t = new THREE.CanvasTexture(c);
  if ('colorSpace' in t && THREE.SRGBColorSpace) t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
scene.background = skyTex;
scene.fog = new THREE.Fog(SKY_FOG_COLOR, 26, 95);

var camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.05, 240);
camera.position.set(1.15, 1.28, 2.75);

var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.86, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.3;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI * 0.62;
controls.autoRotateSpeed = 1.6;

/* lights */
var hemiLight = new THREE.HemisphereLight(0xffffff, 0x3a3f52, 0.85);
scene.add(hemiLight);

var keyLight = new THREE.DirectionalLight(0xfff2e6, 1.6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -3.5; keyLight.shadow.camera.right = 3.5;
keyLight.shadow.camera.top = 4; keyLight.shadow.camera.bottom = -1;
keyLight.shadow.bias = -0.0004;
scene.add(keyLight);

var rimLight = new THREE.DirectionalLight(0xf0a6be, 0.7);
rimLight.position.set(-2.0, 1.6, -1.8);
scene.add(rimLight);

var fillLight = new THREE.DirectionalLight(0xbfd9ff, 0.35);
fillLight.position.set(-1.4, 0.8, 2.2);
scene.add(fillLight);

var lightState = { key:1.6, az:39, el:45, amb:0.85, exp:1.05, shadow:true };
function updateKeyLightPosition(){
  var r = 3.8;
  var az = lightState.az * Math.PI / 180;
  var el = lightState.el * Math.PI / 180;
  var ch = Math.cos(el);
  keyLight.position.set(r * ch * Math.sin(az), 0.9 + r * Math.sin(el), r * ch * Math.cos(az));
}
updateKeyLightPosition();

/* floor & 1m grid */
var floorTex = (function(){
  var c = document.createElement('canvas'); c.width = c.height = 256;
  var g = c.getContext('2d');
  var grad = g.createRadialGradient(128,128,10,128,128,128);
  grad.addColorStop(0, 'rgba(255,255,255,0.20)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(c);
})();
var floor = new THREE.Mesh(
  new THREE.CircleGeometry(2.6, 48),
  new THREE.MeshStandardMaterial({ color:0xffffff, transparent:true, opacity:0.5, map:floorTex, roughness:1, metalness:0, depthWrite:false })
);
floor.rotation.x = -Math.PI / 2; floor.position.y = 0.001;
scene.add(floor);

var shadowCatcher = new THREE.Mesh(
  new THREE.PlaneGeometry(150, 150),
  new THREE.ShadowMaterial({ opacity: 0.32 })
);
shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.receiveShadow = true;
scene.add(shadowCatcher);

var gridHelper = new THREE.GridHelper(20, 20, 0x9fd8e8, 0x6f7a94);
gridHelper.position.y = 0.002;
if (gridHelper.material){
  gridHelper.material.transparent = true;
  gridHelper.material.opacity = 0.42;
}
scene.add(gridHelper);

V.COARSE_POINTER = COARSE_POINTER;
V.renderer = renderer;
V.scene = scene;
V.camera = camera;
V.controls = controls;
V.floor = floor;
V.shadowCatcher = shadowCatcher;
V.gridHelper = gridHelper;
V.skyTex = skyTex;
V.SKY_FOG_COLOR = SKY_FOG_COLOR;
V.hemiLight = hemiLight;
V.keyLight = keyLight;
V.lightState = lightState;
V.updateKeyLightPosition = updateKeyLightPosition;

/* ================= model & animation state ================= */
V.model = null;
V.bones = {};
V.swayBones = [];
V.springJoints = [];
V.exprBinds = {};
V.exprSlots = [];
V.exprValues = {};
V.exprNames = [];
V.isBuriRig = true;
V.modelInfo = { name:'', version:'', format:'VRM 1.0', tris:0, meshes:0, nodeCount:0, springCount:0 };

var D2R = Math.PI / 180;
var tmpQ = new THREE.Quaternion();
var tmpQ2 = new THREE.Quaternion();
var tmpQ3 = new THREE.Quaternion();
var tmpE = new THREE.Euler();

var VRM0_EXPR_MAP = {
  joy:'happy', angry:'angry', sorrow:'sad', fun:'relaxed', neutral:'neutral',
  blink:'blink', blink_l:'blinkLeft', blink_r:'blinkRight',
  a:'aa', i:'ih', u:'ou', e:'ee', o:'oh',
  lookup:'lookUp', lookdown:'lookDown', lookleft:'lookLeft', lookright:'lookRight'
};

V.joints = {
  headYaw:   { label:'頭・左右', min:-60, max:60,  val:0 },
  headPitch: { label:'頭・上下', min:-25, max:40,  val:0 },
  lArm:      { label:'左腕 上/下', min:-100, max:105, val:70 },
  rArm:      { label:'右腕 上/下', min:-100, max:105, val:70 },
  lElbow:    { label:'左ひじ', min:0, max:145, val:8 },
  rElbow:    { label:'右ひじ', min:0, max:145, val:8 },
  spine:     { label:'上体 前後', min:-15, max:38, val:0 }
};
V.jointCur = {};
Object.keys(V.joints).forEach(function(k){ V.jointCur[k] = V.joints[k].val; });

V.poseName = 'stand';
V.POSES = {
  stand:   { headYaw:0, headPitch:0, lArm:70,  rArm:70,   lElbow:8,  rElbow:8,  spine:0 },
  wave:    { headYaw:0, headPitch:0, lArm:70,  rArm:-98, lElbow:8,  rElbow:20, spine:0 },
  banzai:  { headYaw:0, headPitch:-6, lArm:-78, rArm:-78, lElbow:6, rElbow:6, spine:-4 },
  onehand: { headYaw:-8, headPitch:0, lArm:70, rArm:-95, lElbow:8,  rElbow:10, spine:0 },
  katsugu: { headYaw:0, headPitch:-2, lArm:72, rArm:82, lElbow:12, rElbow:145, spine:-2,
             extra:{ rArmZ:56, rHandX:24, rHandZ:39 } },
  kamae:   { headYaw:4, headPitch:2, lArm:42, rArm:40, lElbow:38, rElbow:36, spine:6,
             extra:{ rArmZ:48, lArmZ:-42, hipsY:8, chestY:4, rHandX:-26, rHandY:0, rHandZ:-12,
                     lLegZ:-6, rLegZ:6, lKnee:8, rKnee:12, hipsDrop:0.015 } },
  nio:     { headYaw:0, headPitch:12, lArm:75, rArm:75, lElbow:14, rElbow:14, spine:-6,
             extra:{ rArmZ:14, lArmZ:-14, rHandX:0, rHandZ:0,
                     lLegZ:-24, rLegZ:24, lKnee:16, rKnee:16, lFootX:-8, rFootX:-8, hipsDrop:0.04 } },
  boxing_guard:  { headYaw:-14, headPitch:8, lArm:38, rArm:36, lElbow:106, rElbow:110, spine:10,
                   extra:{ lArmZ:-64, rArmZ:56, hipsY:24, chestY:10, lLegX:-22, rLegX:18, lKnee:24, rKnee:18, hipsDrop:0.04 } },
  kungfu_ready:  { headYaw:-24, headPitch:2, lArm:8, rArm:-12, lElbow:14, rElbow:112, spine:6,
                   extra:{ lArmZ:-74, rArmZ:-24, hipsY:34, chestY:12, lLegX:-28, rLegX:20, lKnee:34, rKnee:18, hipsDrop:0.06 } },
  mabu:          { headYaw:0, headPitch:4, lArm:54, rArm:54, lElbow:92, rElbow:92, spine:6,
                   extra:{ lArmZ:26, rArmZ:-26, lLegZ:-26, rLegZ:26, lLegX:-20, rLegX:-20, lKnee:58, rKnee:58, lFootX:-16, rFootX:-16, hipsDrop:0.15 } },
  saiyan_charge: { headYaw:0, headPitch:12, lArm:46, rArm:46, lElbow:88, rElbow:88, spine:16,
                   extra:{ lArmZ:24, rArmZ:-24, lLegZ:-16, rLegZ:16, lLegX:-14, rLegX:-14, lKnee:38, rKnee:38, lFootX:-12, rFootX:-12, hipsDrop:0.09 } },
  toho_fuhai:    { headYaw:-26, headPitch:4, lArm:64, rArm:-10, lElbow:32, rElbow:12, spine:-4,
                   extra:{ lArmZ:34, rArmZ:68, hipsY:38, chestY:14, lLegX:-26, rLegX:24, lLegZ:-10, rLegZ:10, lKnee:36, rKnee:16, hipsDrop:0.06 } }
};

V.POSE_EXTRA_CHANNELS = ['rArmZ','lArmZ','hipsY','chestY','rHandX','rHandY','rHandZ',
                         'lLegX','rLegX','lLegZ','rLegZ','lKnee','rKnee','lFootX','rFootX','hipsDrop'];
V.poseExtraTarget = {};
V.poseExtraCur = {};
V.POSE_EXTRA_CHANNELS.forEach(function(k){ V.poseExtraTarget[k] = 0; V.poseExtraCur[k] = 0; });
V.setPoseExtra = function(extra){
  V.POSE_EXTRA_CHANNELS.forEach(function(k){ V.poseExtraTarget[k] = (extra && extra[k]) || 0; });
};

V.toggles = { blink:true, breath:true, sway:true, look:false, spin:false, wire:false, shadow:true, grid:true };
V.bowAnim = -1;
V.blinkAnim = -1;

V.TAIL_MODES = {
  normal:    { freq:0.6, amp:6,   pitch:0,   share:0.5,  expr:null },
  happy:     { freq:2.2, amp:22,  pitch:6,   share:0.5,  expr:'happy' },
  sleepy:    { freq:0.5, amp:1.5, pitch:-38, share:0.15, expr:'sleepy' },
  surprised: { freq:1.5, amp:3,   pitch:55,  share:0.85, expr:'surprised' }
};
V.tailMode = 'normal';
var tailRoot = null, tailMid = null, tailExpr = null;
var wagPhase = 0, wagFreqCur = 0.6, wagAmpCur = 6, wagPitchCur = 0, wagShareCur = 0.5;
var nextAutoBlink = 2.2, blinkPhase = -1;

V.motion = null;
V.motionW = 0;
V.motionFading = false;
V.motionSpeed = 1;
V.motionPaused = false;
V.motionScrubbing = false;

var pointer = { x:0, y:0, active:false };
var lookEyeYaw = 0, lookEyePitch = 0;
renderer.domElement.addEventListener('pointermove', function(e){
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  pointer.active = true;
});

/* ================= GLB / VRM helpers ================= */
function parseGlbJson(buf){
  var dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546C67) return null;
  var len = dv.getUint32(8, true);
  var off = 12, json = null;
  while (off < len){
    var clen = dv.getUint32(off, true);
    var ctype = dv.getUint32(off + 4, true);
    if (ctype === 0x4E4F534A){
      var bytes = new Uint8Array(buf, off + 8, clen);
      json = JSON.parse(new TextDecoder('utf-8').decode(bytes));
      break;
    }
    off += 8 + clen;
  }
  return json;
}

function disposeModel(){
  if (!V.model) return;
  scene.remove(V.model);
  V.model.traverse(function(o){
    if (o.geometry) o.geometry.dispose();
    if (o.material){
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){
        Object.keys(m).forEach(function(k){ if (m[k] && m[k].isTexture) m[k].dispose(); });
        m.dispose();
      });
    }
  });
  V.model = null; V.bones = {}; V.swayBones = []; V.springJoints = [];
  V.exprBinds = {}; V.exprSlots = []; V.exprValues = {}; V.exprNames = [];
  tailRoot = null; tailMid = null;
}

function patchTailTipSkin(){
  if (!V.model || !tailMid) return;
  V.model.traverse(function(o){
    if (!o.isSkinnedMesh || !o.skeleton || !o.geometry) return;
    var skBones = o.skeleton.bones;
    var midSlot = -1, neutralSlot = -1, i;
    for (i = 0; i < skBones.length; i++){
      if (skBones[i] === tailMid || skBones[i].name === 'Tails.002' || skBones[i].name === 'Tails002') midSlot = i;
      if (skBones[i].name === 'neutral_bone') neutralSlot = i;
    }
    if (midSlot < 0 || neutralSlot < 0 || midSlot === neutralSlot) return;
    var geo = o.geometry;
    var si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, pos = geo.attributes.position;
    if (!si || !sw || !pos) return;
    var min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], found = false;
    var v, s, a, dominant, dw, w, c;
    for (v = 0; v < pos.count; v++){
      dominant = -1; dw = -1;
      for (s = 0; s < 4; s++){ w = sw.getComponent(v, s); if (w > dw){ dw = w; dominant = si.getComponent(v, s); } }
      if (dominant === midSlot){
        found = true;
        for (a = 0; a < 3; a++){ c = pos.getComponent(v, a); if (c < min[a]) min[a] = c; if (c > max[a]) max[a] = c; }
      }
    }
    if (!found) return;
    var pad = 0.03, changed = false;
    for (v = 0; v < pos.count; v++){
      var inside = true;
      for (a = 0; a < 3; a++){
        c = pos.getComponent(v, a);
        if (c < min[a] - pad || c > max[a] + pad){ inside = false; break; }
      }
      if (!inside) continue;
      for (s = 0; s < 4; s++){
        if (si.getComponent(v, s) === neutralSlot && sw.getComponent(v, s) > 0){
          si.setComponent(v, s, midSlot); changed = true;
        }
      }
    }
    if (changed) si.needsUpdate = true;
  });
}

var TEX_CAP = COARSE_POINTER ? 1024 : 2048;
function capTextureSizes(){
  if (!V.model) return;
  var seen = [];
  function capOne(t){
    var img = t.image;
    if (!img || !img.width || !img.height) return;
    if (Math.max(img.width, img.height) <= TEX_CAP) return;
    var s = TEX_CAP / Math.max(img.width, img.height);
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * s));
    c.height = Math.max(1, Math.round(img.height * s));
    var g = c.getContext('2d');
    if (!g) return;
    try { g.drawImage(img, 0, 0, c.width, c.height); } catch(e){ return; }
    t.image = c;
    t.needsUpdate = true;
  }
  V.model.traverse(function(o){
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){
      Object.keys(m).forEach(function(k){
        var t = m[k];
        if (t && t.isTexture && seen.indexOf(t) < 0){ seen.push(t); capOne(t); }
      });
    });
  });
}

/* ================= SpringBone solver ================= */
var _sbVecA = new THREE.Vector3(), _sbVecB = new THREE.Vector3();
var _sbJointPos = new THREE.Vector3(), _sbNextTail = new THREE.Vector3();
var _sbInertia = new THREE.Vector3(), _sbStiff = new THREE.Vector3();
var _sbAimDir = new THREE.Vector3(), _sbNewDir = new THREE.Vector3();
var _sbColHead = new THREE.Vector3(), _sbColTail = new THREE.Vector3();
var _sbSeg = new THREE.Vector3(), _sbDiff = new THREE.Vector3();
var _sbParentQ = new THREE.Quaternion(), _sbRestWorldQ = new THREE.Quaternion();
var _sbDeltaWorldQ = new THREE.Quaternion(), _sbTmpQ = new THREE.Quaternion();

function buildSpringBones(glbJson, objByNodeIndex, skipSet){
  V.springJoints = [];
  if (!glbJson || !glbJson.extensions) return;
  V.model.updateMatrixWorld(true);
  var sb1 = glbJson.extensions.VRMC_springBone;
  var vrm0 = glbJson.extensions.VRM;

  function makeJointRecord(obj, nextObj, opts){
    if (!obj || skipSet.indexOf(obj) >= 0) return null;
    var jWorld = new THREE.Vector3(); obj.getWorldPosition(jWorld);
    var tWorld = new THREE.Vector3();
    if (nextObj) nextObj.getWorldPosition(tWorld);
    else if (obj.children && obj.children.length) obj.children[0].getWorldPosition(tWorld);
    else tWorld.copy(jWorld).add(new THREE.Vector3(0, -0.07, 0));
    var len = jWorld.distanceTo(tWorld);
    if (len < 0.005){ tWorld.copy(jWorld).add(new THREE.Vector3(0, -0.07, 0)); len = 0.07; }
    var worldQ = new THREE.Quaternion(); obj.getWorldQuaternion(worldQ);
    var boneAxis = tWorld.clone().sub(jWorld).normalize().applyQuaternion(worldQ.clone().invert());
    return {
      obj:obj, initialLocalQ:obj.quaternion.clone(), boneAxis:boneAxis, boneLength:len,
      currentTail:tWorld.clone(), prevTail:tWorld.clone(),
      hitRadius: opts.hitRadius != null ? opts.hitRadius : 0.02,
      stiffness: opts.stiffness != null ? opts.stiffness : 1.0,
      gravityPower: opts.gravityPower != null ? opts.gravityPower : 0.0,
      gravityDir: opts.gravityDir ? opts.gravityDir.clone().normalize() : new THREE.Vector3(0, -1, 0),
      dragForce: opts.dragForce != null ? opts.dragForce : 0.4,
      colliders: opts.colliders || []
    };
  }

  if (sb1 && Array.isArray(sb1.springs)){
    var cols1 = sb1.colliders || [], cgs1 = sb1.colliderGroups || [];
    var colObjs1 = cols1.map(function(c){
      var nodeObj = objByNodeIndex(c.node);
      if (!nodeObj || !c.shape) return null;
      if (c.shape.sphere){
        var off = c.shape.sphere.offset || [0,0,0];
        return { type:'sphere', nodeObj:nodeObj, offset:new THREE.Vector3(off[0]||0, off[1]||0, off[2]||0), radius:c.shape.sphere.radius || 0.05 };
      }
      if (c.shape.capsule){
        var off0 = c.shape.capsule.offset || [0,0,0], tail0 = c.shape.capsule.tail || [0,0,0];
        return {
          type:'capsule', nodeObj:nodeObj,
          offset:new THREE.Vector3(off0[0]||0, off0[1]||0, off0[2]||0),
          tail:new THREE.Vector3(tail0[0]||0, tail0[1]||0, tail0[2]||0),
          radius:c.shape.capsule.radius || 0.05
        };
      }
      return null;
    });
    sb1.springs.forEach(function(sp){
      var spCols = [];
      (sp.colliderGroups || []).forEach(function(cgIdx){
        var cg = cgs1[cgIdx];
        if (cg && cg.colliders) cg.colliders.forEach(function(ci){ if (colObjs1[ci]) spCols.push(colObjs1[ci]); });
      });
      var jlist = sp.joints || [];
      for (var i = 0; i < jlist.length; i++){
        var jd = jlist[i];
        var jObj = objByNodeIndex(jd.node);
        var nextObj = (i + 1 < jlist.length) ? objByNodeIndex(jlist[i + 1].node) : null;
        var gDir = jd.gravityDir || [0, -1, 0];
        var rec = makeJointRecord(jObj, nextObj, {
          hitRadius:jd.hitRadius, stiffness:jd.stiffness, gravityPower:jd.gravityPower,
          gravityDir:new THREE.Vector3(gDir[0]||0, gDir[1] != null ? gDir[1] : -1, gDir[2]||0),
          dragForce:jd.dragForce, colliders:spCols
        });
        if (rec) V.springJoints.push(rec);
      }
    });
  } else if (vrm0 && vrm0.secondaryAnimation){
    var sa = vrm0.secondaryAnimation;
    var cgs0 = (sa.colliderGroups || []).map(function(cg){
      var nObj = objByNodeIndex(cg.node);
      if (!nObj) return [];
      return (cg.colliders || []).map(function(c){
        var o = c.offset || {};
        return { type:'sphere', nodeObj:nObj, offset:new THREE.Vector3(o.x||0, o.y||0, o.z||0), radius:c.radius || 0.05 };
      });
    });
    (sa.boneGroups || []).forEach(function(bg){
      var spCols = [];
      (bg.colliderGroups || []).forEach(function(cgIdx){ if (cgs0[cgIdx]) spCols = spCols.concat(cgs0[cgIdx]); });
      var gd = bg.gravityDir || { x:0, y:-1, z:0 };
      var stiff = bg.stiffiness != null ? bg.stiffiness : bg.stiffnessForce;
      function walkChain(obj){
        var nextObj = (obj.children && obj.children.length) ? obj.children[0] : null;
        var rec = makeJointRecord(obj, nextObj, {
          hitRadius:bg.hitRadius, stiffness:stiff, gravityPower:bg.gravityPower,
          gravityDir:new THREE.Vector3(gd.x||0, gd.y != null ? gd.y : -1, gd.z||0),
          dragForce:bg.dragForce, colliders:spCols
        });
        if (rec) V.springJoints.push(rec);
        if (obj.children) obj.children.forEach(walkChain);
      }
      (bg.bones || []).forEach(function(nodeIdx){
        var rootObj = objByNodeIndex(nodeIdx);
        if (rootObj) walkChain(rootObj);
      });
    });
  }
}

V.resetSpringBones = function(){
  if (!V.model || !V.springJoints.length) return;
  V.springJoints.forEach(function(j){ j.obj.quaternion.copy(j.initialLocalQ); });
  V.model.updateMatrixWorld(true);
  V.springJoints.forEach(function(j){
    j.obj.getWorldPosition(_sbJointPos);
    j.obj.getWorldQuaternion(_sbRestWorldQ);
    _sbAimDir.copy(j.boneAxis).applyQuaternion(_sbRestWorldQ).multiplyScalar(j.boneLength);
    j.currentTail.copy(_sbJointPos).add(_sbAimDir);
    j.prevTail.copy(j.currentTail);
  });
};

function updateSpringBones(dt){
  var list = V.springJoints;
  if (!list.length) return;
  if (!V.toggles.sway){
    for (var k = 0; k < list.length; k++) list[k].obj.quaternion.copy(list[k].initialLocalQ);
    return;
  }
  var stepDt = Math.min(dt, 0.033);
  if (stepDt <= 0) return;

  for (var i = 0; i < list.length; i++){
    var j = list[i];
    if (j.obj.parent){
      j.obj.parent.updateWorldMatrix(true, false);
      j.obj.parent.getWorldQuaternion(_sbParentQ);
      _sbJointPos.copy(j.obj.position).applyMatrix4(j.obj.parent.matrixWorld);
    } else {
      _sbParentQ.identity();
      _sbJointPos.copy(j.obj.position);
    }

    _sbRestWorldQ.copy(_sbParentQ).multiply(j.initialLocalQ);
    _sbAimDir.copy(j.boneAxis).applyQuaternion(_sbRestWorldQ);

    _sbInertia.copy(j.currentTail).sub(j.prevTail).multiplyScalar(1 - j.dragForce);
    _sbStiff.copy(_sbAimDir).multiplyScalar(j.stiffness * stepDt);
    _sbNextTail.copy(j.currentTail).add(_sbInertia).add(_sbStiff)
      .addScaledVector(j.gravityDir, j.gravityPower * stepDt);

    _sbNextTail.sub(_sbJointPos).normalize().multiplyScalar(j.boneLength).add(_sbJointPos);

    for (var ci = 0; ci < j.colliders.length; ci++){
      var col = j.colliders[ci];
      var r = col.radius + j.hitRadius;
      if (col.type === 'sphere'){
        _sbColHead.copy(col.offset).applyMatrix4(col.nodeObj.matrixWorld);
        _sbDiff.copy(_sbNextTail).sub(_sbColHead);
        var d = _sbDiff.length();
        if (d < r){
          if (d > 1e-5) _sbDiff.multiplyScalar(r / d);
          else _sbDiff.set(0, r, 0);
          _sbNextTail.copy(_sbColHead).add(_sbDiff);
          _sbNextTail.sub(_sbJointPos).normalize().multiplyScalar(j.boneLength).add(_sbJointPos);
        }
      } else if (col.type === 'capsule'){
        _sbColHead.copy(col.offset).applyMatrix4(col.nodeObj.matrixWorld);
        _sbColTail.copy(col.tail).applyMatrix4(col.nodeObj.matrixWorld);
        _sbSeg.copy(_sbColTail).sub(_sbColHead);
        var segLenSq = _sbSeg.lengthSq();
        var proj = segLenSq > 1e-8 ? Math.max(0, Math.min(1, _sbVecA.copy(_sbNextTail).sub(_sbColHead).dot(_sbSeg) / segLenSq)) : 0;
        _sbVecB.copy(_sbColHead).addScaledVector(_sbSeg, proj);
        _sbDiff.copy(_sbNextTail).sub(_sbVecB);
        var dc = _sbDiff.length();
        if (dc < r){
          if (dc > 1e-5) _sbDiff.multiplyScalar(r / dc);
          else _sbDiff.set(0, r, 0);
          _sbNextTail.copy(_sbVecB).add(_sbDiff);
          _sbNextTail.sub(_sbJointPos).normalize().multiplyScalar(j.boneLength).add(_sbJointPos);
        }
      }
    }

    j.prevTail.copy(j.currentTail);
    j.currentTail.copy(_sbNextTail);

    _sbNewDir.copy(_sbNextTail).sub(_sbJointPos).normalize();
    _sbDeltaWorldQ.setFromUnitVectors(_sbAimDir, _sbNewDir);
    _sbTmpQ.copy(_sbParentQ).invert().multiply(_sbDeltaWorldQ).multiply(_sbRestWorldQ);
    j.obj.quaternion.copy(_sbTmpQ);
    j.obj.updateMatrix();
    if (j.obj.parent) j.obj.matrixWorld.multiplyMatrices(j.obj.parent.matrixWorld, j.obj.matrix);
    else j.obj.matrixWorld.copy(j.obj.matrix);
  }
}

/* ================= setupModel (VRM 1.0 & VRM 0.x) ================= */
function setupModel(gltf, glbJson){
  var vrm1 = (glbJson && glbJson.extensions && glbJson.extensions.VRMC_vrm) || null;
  var vrm0 = (!vrm1 && glbJson && glbJson.extensions && glbJson.extensions.VRM) || null;
  var nodes = (glbJson && glbJson.nodes) || [];

  V.model = new THREE.Group();
  var inner = gltf.scene;
  inner.position.set(0, 0, 0);
  inner.rotation.set(0, vrm0 ? Math.PI : 0, 0);
  V.model.add(inner);
  scene.add(V.model);

  V.model.traverse(function(o){
    if (o.isMesh){ o.castShadow = true; o.frustumCulled = false; }
  });

  function sanitize(nm){ return nm.replace(/\s+/g, '_').replace(/\./g, ''); }
  var bySanitized = {};
  V.model.traverse(function(o){ if (o.name) bySanitized[sanitize(o.name)] = o; });
  function findObj(glbName){
    return inner.getObjectByName(glbName) || bySanitized[sanitize(glbName)] || null;
  }
  function objByNodeIndex(idx){
    var nm = nodes[idx] && nodes[idx].name;
    return nm ? findObj(nm) : null;
  }

  V.model.updateMatrixWorld(true);

  function registerHumanBone(name, idx){
    var obj = objByNodeIndex(idx);
    if (!obj) return;
    var wq = new THREE.Quaternion();
    obj.getWorldQuaternion(wq);
    V.bones[name] = { obj:obj, rest:obj.quaternion.clone(), restPos:obj.position.clone(), restModelQ:wq, restModelQInv:wq.clone().invert() };
  }
  if (vrm1 && vrm1.humanoid && vrm1.humanoid.humanBones){
    Object.keys(vrm1.humanoid.humanBones).forEach(function(name){
      registerHumanBone(name, vrm1.humanoid.humanBones[name].node);
    });
  } else if (vrm0 && vrm0.humanoid && Array.isArray(vrm0.humanoid.humanBones)){
    vrm0.humanoid.humanBones.forEach(function(hb){
      if (hb && hb.bone && hb.node != null) registerHumanBone(hb.bone, hb.node);
    });
  }

  if (vrm1 && vrm1.meta){
    V.modelInfo.name = vrm1.meta.name || '';
    V.modelInfo.version = vrm1.meta.version || '';
    V.modelInfo.format = 'VRM 1.0';
  } else if (vrm0 && vrm0.meta){
    V.modelInfo.name = vrm0.meta.title || '';
    V.modelInfo.version = vrm0.meta.version || '';
    V.modelInfo.format = 'VRM 0.x';
  } else {
    V.modelInfo.name = '';
    V.modelInfo.version = '';
    V.modelInfo.format = 'GLB';
  }
  if (vrmVerEl) vrmVerEl.textContent = V.modelInfo.format;

  tailRoot = findObj('Tails.001');
  tailMid = findObj('Tails.002');
  V.isBuriRig = !!(vrm1 && ((tailRoot && findObj('Hair.000')) || /白海|buri/i.test(V.modelInfo.name || '')));
  patchTailTipSkin();

  var skipForSpring = [];
  if (V.isBuriRig){
    if (tailRoot) skipForSpring.push(tailRoot);
    if (tailMid) skipForSpring.push(tailMid);
  }
  buildSpringBones(glbJson, objByNodeIndex, skipForSpring);

  var springNodeSet = V.springJoints.map(function(j){ return j.obj; });
  var swayNames = ['Hair.000','Hair_Front','Hair_L.000','Hair_R.000','HairBack.001','HairBack.002','Ear_L.001','Ear_R.001','Tails.001','Tails.002'];
  swayNames.forEach(function(nm, i){
    var o = findObj(nm);
    if (o && springNodeSet.indexOf(o) < 0){
      V.swayBones.push({ obj:o, rest:o.quaternion.clone(), phase:i * 0.9, tail: nm.indexOf('Tail') === 0 });
    }
  });

  var slotSeen = {};
  function pushBind(resolved, mesh, index, weight){
    if (!mesh.isMesh || !mesh.morphTargetInfluences || index < 0 || index >= mesh.morphTargetInfluences.length) return;
    resolved.push({ mesh:mesh, index:index, weight:weight });
    var key = mesh.uuid + ':' + index;
    if (!slotSeen[key]){ slotSeen[key] = true; V.exprSlots.push({ mesh:mesh, index:index }); }
  }

  if (vrm1 && vrm1.expressions){
    var all = {};
    if (vrm1.expressions.preset) Object.keys(vrm1.expressions.preset).forEach(function(k){ all[k] = vrm1.expressions.preset[k]; });
    if (vrm1.expressions.custom) Object.keys(vrm1.expressions.custom).forEach(function(k){ all[k] = vrm1.expressions.custom[k]; });
    Object.keys(all).forEach(function(name){
      var def = all[name], resolved = [];
      (def.morphTargetBinds || []).forEach(function(b){
        var nodeObj = objByNodeIndex(b.node);
        if (!nodeObj) return;
        var w = (b.weight == null ? 1 : b.weight);
        nodeObj.traverse(function(o){ pushBind(resolved, o, b.index, w); });
      });
      if (resolved.length){
        V.exprBinds[name] = { isBinary: !!def.isBinary, binds: resolved };
        V.exprValues[name] = 0;
      }
    });
  } else if (vrm0 && vrm0.blendShapeMaster && Array.isArray(vrm0.blendShapeMaster.blendShapeGroups)){
    var gltfMeshes = (glbJson && glbJson.meshes) || [];
    vrm0.blendShapeMaster.blendShapeGroups.forEach(function(g){
      var rawPreset = (g.presetName || '').toLowerCase();
      var name = (rawPreset && rawPreset !== 'unknown' && VRM0_EXPR_MAP[rawPreset]) ? VRM0_EXPR_MAP[rawPreset] : (g.name || rawPreset);
      if (!name) return;
      var resolved = [];
      (g.binds || []).forEach(function(b){
        var w = (b.weight == null ? 1 : b.weight / 100);
        var matched = false;
        nodes.forEach(function(n, nIdx){
          if (n.mesh === b.mesh){
            var nObj = objByNodeIndex(nIdx);
            if (nObj){
              matched = true;
              nObj.traverse(function(o){ pushBind(resolved, o, b.index, w); });
            }
          }
        });
        if (!matched && gltfMeshes[b.mesh] && gltfMeshes[b.mesh].name){
          var mObj = findObj(gltfMeshes[b.mesh].name);
          if (mObj) mObj.traverse(function(o){ pushBind(resolved, o, b.index, w); });
        }
      });
      if (resolved.length){
        V.exprBinds[name] = { isBinary: !!g.isBinary, binds: resolved };
        V.exprValues[name] = 0;
      }
    });
  }

  V.exprNames = Object.keys(V.exprBinds);

  var tris = 0, meshCount = 0;
  V.model.traverse(function(o){
    if (o.isMesh){
      meshCount++;
      var g = o.geometry;
      if (g){
        var cnt = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0);
        tris += cnt / 3;
      }
    }
  });
  V.modelInfo.tris = Math.round(tris);
  V.modelInfo.meshes = meshCount;
  V.modelInfo.nodeCount = nodes.length;
  V.modelInfo.springCount = V.springJoints.length;

  capTextureSizes();
  V.frameCamera('full');
  V.setTailMode(V.tailMode);
  V.applyWireframe();
  V.resetSpringBones();
  if (V.onModelLoaded) V.onModelLoaded();
}

V.loadVrmFromArrayBuffer = function(buf, label){
  var glbJson = null;
  try { glbJson = parseGlbJson(buf); } catch(e){}
  var loader = new THREE.GLTFLoader();
  setLoading(true, 'モデルを解析しています…', label || '');
  loader.parse(buf, '', function(gltf){
    disposeModel();
    V.stopMotion(true);
    setupModel(gltf, glbJson);
    loadmsg.textContent = (V.modelInfo.name || label || 'モデル') + ' を読み込みました';
    loadmsg.className = 'done';
    setLoading(false);
  }, function(err){
    showError('VRMの解析に失敗しました: ' + (err && err.message ? err.message : err));
    setLoading(false);
  });
};

function fetchModelInChunks(url){
  return fetch(url).then(function(res){
    if (!res.ok) throw new Error('HTTP ' + res.status + ' (' + res.statusText + ')');
    var total = parseInt(res.headers.get('Content-Length') || '0', 10);

    if (res.body && typeof ReadableStream !== 'undefined' && total > 0){
      var reader = res.body.getReader();
      var received = 0;
      var chunks = [];
      function pump(){
        return reader.read().then(function(result){
          if (result.done){
            var out = new Uint8Array(received);
            var pos = 0;
            for (var i = 0; i < chunks.length; i++){
              out.set(chunks[i], pos);
              pos += chunks[i].byteLength;
            }
            return out.buffer;
          }
          chunks.push(result.value);
          received += result.value.byteLength;
          var pct = Math.round(received / total * 100);
          loadmsg.textContent = 'モデルを読み込んでいます… ' + pct + '%';
          setLoading(true, 'モデルを読み込んでいます…', pct + '%');
          return pump();
        });
      }
      return pump();
    }
    return res.arrayBuffer();
  });
}

V.loadDefault = function(){
  if (window.location.protocol === 'file:'){
    var msg = 'ブラウザのセキュリティ制限のため、file:/// からは自動読み込みできません。\n' +
              'ローカルサーバーを起動して http://localhost:8000 で開くか、\n' +
              '画面上の「VRMを開く」から assets/model.vrm を選択してください。';
    showError(msg);
    setLoading(false);
    return;
  }

  setLoading(true, 'モデルを読み込んでいます…', '初期モデルを取得中');
  fetchModelInChunks('assets/model.vrm')
    .then(function(buf){ V.loadVrmFromArrayBuffer(buf, '初期モデル'); })
    .catch(function(e){
      showError('モデルの読み込みに失敗しました: ' + e.message + '\n（assets/model.vrm が存在するか、ローカルサーバーが起動しているか確認してください）');
      setLoading(false);
    });
};

/* ================= Viewer actions ================= */
V.setExpression = function(name, value){
  if (!(name in V.exprValues)) return;
  V.exprValues[name] = value;
};
V.clearExpressions = function(){
  Object.keys(V.exprValues).forEach(function(k){ V.exprValues[k] = 0; });
};

V.setTailMode = function(mode){
  if (!V.TAIL_MODES[mode]) return;
  V.tailMode = mode;
  if (tailExpr) V.setExpression(tailExpr, 0);
  tailExpr = V.TAIL_MODES[mode].expr;
  if (tailExpr){
    if (tailExpr === 'happy' || tailExpr === 'surprised'){
      ['happy','angry','sad','surprised','relaxed'].forEach(function(k){
        if (k !== tailExpr) V.setExpression(k, 0);
      });
    }
    if (['sleepy','zito','satori'].indexOf(tailExpr) >= 0){
      ['sleepy','zito','satori'].forEach(function(k){ if (k !== tailExpr) V.setExpression(k, 0); });
    }
    V.setExpression(tailExpr, 1);
  }
  if (V.onTailUiSync) V.onTailUiSync();
};

V.applyWireframe = function(){
  if (!V.model) return;
  V.model.traverse(function(o){
    if (o.isMesh && o.material){
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){ m.wireframe = V.toggles.wire; });
    }
  });
};

var camAnim = null;
function flyTo(pos, tgt){
  camAnim = { p0: camera.position.clone(), p1: pos, t0: controls.target.clone(), t1: tgt, t: 0 };
}
V.frameCamera = function(mode){
  if (!V.model){ flyTo(new THREE.Vector3(1.15,1.28,2.75), new THREE.Vector3(0,0.86,0)); return; }
  V.model.updateMatrixWorld(true);
  var box = new THREE.Box3().setFromObject(V.model);
  var size = box.getSize(new THREE.Vector3());
  var h = Math.max(0.4, size.y);
  var cy = box.min.y + h * 0.52;
  var headY = box.max.y - h * 0.08;
  var tanF = Math.tan((camera.fov * Math.PI / 180) / 2);
  function fitDist(halfW){
    return Math.max((h / 2) / tanF, halfW / (tanF * camera.aspect)) * 1.18;
  }
  var halfW = Math.min(size.x / 2, 0.55);
  if (mode === 'full')  flyTo(new THREE.Vector3(0.85, cy + 0.12, fitDist(halfW)), new THREE.Vector3(0, cy, 0));
  if (mode === 'face')  flyTo(new THREE.Vector3(0.22, headY, 0.62), new THREE.Vector3(0, headY - 0.03, 0));
  if (mode === 'front') flyTo(new THREE.Vector3(0, cy + 0.05, fitDist(halfW)), new THREE.Vector3(0, cy, 0));
  if (mode === 'side')  flyTo(new THREE.Vector3(fitDist(size.z / 2), cy + 0.05, 0), new THREE.Vector3(0, cy, 0));
  if (mode === 'back')  flyTo(new THREE.Vector3(-0.6, cy + 0.1, -fitDist(halfW)), new THREE.Vector3(0, cy, 0));
};

V.capturePng = function(transparent){
  var prevBg = scene.background, prevFog = scene.fog;
  var prevFloor = floor.visible, prevShadow = shadowCatcher.visible, prevGrid = gridHelper.visible;
  if (transparent){
    scene.background = null;
    scene.fog = null;
    floor.visible = false;
    shadowCatcher.visible = false;
    gridHelper.visible = false;
    renderer.setClearColor(0x000000, 0);
  }
  renderer.render(scene, camera);
  var url = renderer.domElement.toDataURL('image/png');
  if (transparent){
    scene.background = prevBg;
    scene.fog = prevFog;
    floor.visible = prevFloor;
    shadowCatcher.visible = prevShadow;
    gridHelper.visible = prevGrid;
    renderer.render(scene, camera);
  }
  var a = document.createElement('a');
  a.href = url;
  a.download = (V.modelInfo.name ? V.modelInfo.name.replace(/[^\w\u3040-\u9fff-]+/g, '_') : 'vrm_capture') + (transparent ? '_alpha.png' : '.png');
  a.click();
};

/* ================= Motion control ================= */
V.startMotion = function(name){
  var def = (V.MOTION_MAP && V.MOTION_MAP[name]) || { id:name, label:name, loop:false, duration:2.0 };
  V.motion = { name:name, elapsed:0, duration:def.duration, loop:!!def.loop };
  V.motionFading = false;
  V.motionPaused = false;
  if (V.onMotionUiSync) V.onMotionUiSync();
};
V.stopMotion = function(immediate){
  if (immediate){
    V.motion = null; V.motionW = 0; V.motionFading = false; V.motionPaused = false;
    if (V.onMotionUiSync) V.onMotionUiSync();
    return;
  }
  if (V.motion && !V.motionFading){
    V.motionFading = true;
    V.motionPaused = false;
    if (V.onMotionUiSync) V.onMotionUiSync();
  }
};
V.toggleMotionPause = function(){
  if (!V.motion || V.motionFading) return;
  V.motionPaused = !V.motionPaused;
  if (V.onMotionUiSync) V.onMotionUiSync();
};
V.restartMotion = function(){
  if (!V.motion) return;
  V.motion.elapsed = 0;
  V.motionFading = false;
  if (V.onMotionUiSync) V.onMotionUiSync();
};

/* ================= Bone offset helpers ================= */
function mapToCharEuler(name, xDeg, yDeg, zDeg){
  if (name === 'leftUpperArm')  return [yDeg, zDeg, xDeg];
  if (name === 'rightUpperArm') return [yDeg, zDeg, -xDeg];
  if (name === 'leftLowerArm')  return [0, zDeg, 0];
  if (name === 'rightLowerArm') return [0, zDeg, 0];
  if (name === 'leftUpperLeg' || name === 'rightUpperLeg') return [xDeg, yDeg, -zDeg];
  return [xDeg, yDeg, zDeg];
}
function makeCharLocalDelta(b, cx, cy, cz){
  tmpE.set(cx * D2R, cy * D2R, cz * D2R);
  tmpQ.setFromEuler(tmpE);
  return tmpQ3.copy(b.restModelQInv).multiply(tmpQ).multiply(b.restModelQ);
}
function setBoneOffset(name, xDeg, yDeg, zDeg){
  var b = V.bones[name]; if (!b) return;
  if (V.isBuriRig){
    tmpE.set(xDeg * D2R, yDeg * D2R, zDeg * D2R);
    tmpQ.setFromEuler(tmpE);
    b.obj.quaternion.copy(b.rest).multiply(tmpQ);
  } else {
    var c = mapToCharEuler(name, xDeg, yDeg, zDeg);
    b.obj.quaternion.copy(b.rest).multiply(makeCharLocalDelta(b, c[0], c[1], c[2]));
  }
}
function setCharDirectOffset(name, cx, cy, cz){
  var b = V.bones[name]; if (!b) return;
  b.obj.quaternion.copy(b.rest).multiply(makeCharLocalDelta(b, cx, cy, cz));
}
function blendBoneOffset(name, xDeg, yDeg, zDeg, w){
  var b = V.bones[name]; if (!b) return;
  if (V.isBuriRig){
    tmpE.set(xDeg * D2R, yDeg * D2R, zDeg * D2R);
    tmpQ.setFromEuler(tmpE);
    tmpQ2.copy(b.rest).multiply(tmpQ);
    b.obj.quaternion.slerp(tmpQ2, w);
  } else {
    var c = mapToCharEuler(name, xDeg, yDeg, zDeg);
    tmpQ2.copy(b.rest).multiply(makeCharLocalDelta(b, c[0], c[1], c[2]));
    b.obj.quaternion.slerp(tmpQ2, w);
  }
}
function blendCharRaw(name, xDeg, yDeg, zDeg, w){
  var b = V.bones[name]; if (!b) return;
  if (V.isBuriRig){
    tmpE.set(xDeg * D2R, yDeg * D2R, zDeg * D2R);
    tmpQ.setFromEuler(tmpE);
    tmpQ2.copy(b.rest).multiply(tmpQ);
    b.obj.quaternion.slerp(tmpQ2, w);
  } else {
    tmpQ2.copy(b.rest).multiply(makeCharLocalDelta(b, xDeg, yDeg, zDeg));
    b.obj.quaternion.slerp(tmpQ2, w);
  }
}

/* ================= Main loop ================= */
var clock = new THREE.Clock();
var frames = 0, fpsTime = 0;

function animate(){
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  var t = clock.elapsedTime;
  try {
    if (camAnim){
      camAnim.t += dt / 0.7;
      var k = camAnim.t >= 1 ? 1 : (1 - Math.pow(1 - camAnim.t, 3));
      camera.position.lerpVectors(camAnim.p0, camAnim.p1, k);
      controls.target.lerpVectors(camAnim.t0, camAnim.t1, k);
      if (camAnim.t >= 1) camAnim = null;
    }
    controls.update();

    if (V.model){
      var bones = V.bones;
      Object.keys(V.joints).forEach(function(key){
        V.jointCur[key] += (V.joints[key].val - V.jointCur[key]) * Math.min(1, dt * 10);
      });
      V.POSE_EXTRA_CHANNELS.forEach(function(key){
        V.poseExtraCur[key] += (V.poseExtraTarget[key] - V.poseExtraCur[key]) * Math.min(1, dt * 10);
      });

      var wave = (V.poseName === 'wave');
      var bowX = 0;
      if (V.bowAnim >= 0){
        V.bowAnim += dt / 1.6;
        if (V.bowAnim >= 1) V.bowAnim = -1;
        else bowX = Math.sin(V.bowAnim * Math.PI) * 34;
      }
      var breath = V.toggles.breath ? Math.sin(t * 1.7) : 0;
      var breathX = V.toggles.breath ? breath * 1.6 : 0;

      var headYaw = V.jointCur.headYaw, headPitch = V.jointCur.headPitch;
      var targetEyeYaw = 0, targetEyePitch = 0;
      if (V.toggles.look && pointer.active){
        headYaw += -pointer.x * 20;
        headPitch += pointer.y * 12;
        targetEyeYaw = Math.max(-15, Math.min(15, -pointer.x * 16));
        targetEyePitch = Math.max(-10, Math.min(10, pointer.y * 10));
      }
      lookEyeYaw += (targetEyeYaw - lookEyeYaw) * Math.min(1, dt * 12);
      lookEyePitch += (targetEyePitch - lookEyePitch) * Math.min(1, dt * 12);

      var rElbow = V.jointCur.rElbow;
      if (wave) rElbow = 24 + Math.sin(t * 7) * 24;

      setBoneOffset('head', headPitch + bowX * 0.45, headYaw, 0);
      setBoneOffset('neck', bowX * 0.25, headYaw * 0.4, 0);
      setBoneOffset('spine', V.jointCur.spine + bowX * 0.55 + breathX * 0.4, 0, 0);
      setBoneOffset('chest', bowX * 0.35 + breathX, V.poseExtraCur.chestY, 0);
      setBoneOffset('leftUpperArm', -V.jointCur.lArm + (V.toggles.breath ? breath * 1.0 : 0), 0, V.poseExtraCur.lArmZ);
      var rArmTwist = (!V.isBuriRig && wave) ? -75 : 0;
      setBoneOffset('rightUpperArm', -V.jointCur.rArm + (V.toggles.breath ? breath * 1.0 : 0), rArmTwist, V.poseExtraCur.rArmZ);
      setBoneOffset('leftLowerArm', 0, 0, -V.jointCur.lElbow);
      setBoneOffset('rightLowerArm', 0, 0, rElbow);
      setBoneOffset('rightHand', V.poseExtraCur.rHandX, V.poseExtraCur.rHandY, V.poseExtraCur.rHandZ);
      setBoneOffset('leftUpperLeg', V.poseExtraCur.lLegX, 0, V.poseExtraCur.lLegZ);
      setBoneOffset('rightUpperLeg', V.poseExtraCur.rLegX, 0, V.poseExtraCur.rLegZ);
      setBoneOffset('leftLowerLeg', V.poseExtraCur.lKnee, 0, 0);
      setBoneOffset('rightLowerLeg', V.poseExtraCur.rKnee, 0, 0);
      setBoneOffset('leftFoot', V.poseExtraCur.lFootX, 0, 0);
      setBoneOffset('rightFoot', V.poseExtraCur.rFootX, 0, 0);
      setBoneOffset('hips', 0, V.poseExtraCur.hipsY, 0);

      if (bones.leftEye) setCharDirectOffset('leftEye', lookEyePitch, lookEyeYaw, 0);
      if (bones.rightEye) setCharDirectOffset('rightEye', lookEyePitch, lookEyeYaw, 0);

      if (bones.hips){
        bones.hips.obj.position.y = bones.hips.restPos.y - V.poseExtraCur.hipsDrop + (V.toggles.breath ? Math.sin(t * 1.7) * 0.0035 : 0);
        bones.hips.obj.position.x = bones.hips.restPos.x;
        bones.hips.obj.position.z = bones.hips.restPos.z;
      }

      /* motion state & playback */
      if (V.motion){
        var wTarget = V.motionFading ? 0 : 1;
        var wStep = dt / 0.25;
        if (V.motionW < wTarget) V.motionW = Math.min(wTarget, V.motionW + wStep);
        else if (V.motionW > wTarget) V.motionW = Math.max(wTarget, V.motionW - wStep);

        if (V.motionFading && V.motionW <= 0){
          V.motion = null; V.motionFading = false;
          if (V.onMotionUiSync) V.onMotionUiSync();
        } else if (!V.motionFading && !V.motionPaused && !V.motionScrubbing){
          V.motion.elapsed += dt * V.motionSpeed;
          if (!V.motion.loop && V.motion.elapsed >= V.motion.duration){
            V.motion.elapsed = V.motion.duration;
            V.stopMotion(false);
          }
          if (V.onMotionUiSync) V.onMotionUiSync();
        }
      }

      if (V.motion && V.motionW > 0.001 && V.MOTION_MAP && V.math){
        var mDef = V.MOTION_MAP[V.motion.name];
        if (mDef && mDef.fn){
          var el = V.motion.loop ? V.motion.elapsed : Math.min(V.motion.elapsed, V.motion.duration);
          mDef.fn(el, V.motionW, {
            bones: bones,
            isBuriRig: V.isBuriRig,
            poseExtraCur: V.poseExtraCur,
            blend: blendBoneOffset,
            blendRaw: blendCharRaw,
            trackVal: V.math.trackVal,
            gauss: V.math.gauss,
            smooth01: V.math.smooth01,
            easeInOut: V.math.easeInOut,
            D2R: D2R,
            tmpQ: tmpQ,
            tmpQ2: tmpQ2,
            tmpE: tmpE
          });
        }
      }

      /* SpringBone physics + fallback sway */
      updateSpringBones(dt);
      V.swayBones.forEach(function(s){
        if (!V.toggles.sway){ s.obj.quaternion.copy(s.rest); return; }
        var amp = s.tail ? 5.5 : 2.6;
        var sx = Math.sin(t * 1.9 + s.phase) * amp;
        var sz = Math.cos(t * 1.5 + s.phase * 1.3) * amp * 0.7;
        tmpE.set(sx * D2R, 0, sz * D2R);
        tmpQ.setFromEuler(tmpE);
        s.obj.quaternion.copy(s.rest).multiply(tmpQ);
      });

      /* tail wag */
      if (tailRoot || tailMid){
        var tm = V.TAIL_MODES[V.tailMode];
        wagFreqCur += (tm.freq - wagFreqCur) * Math.min(1, dt * 3);
        wagAmpCur += (tm.amp - wagAmpCur) * Math.min(1, dt * 5);
        wagPitchCur += (tm.pitch - wagPitchCur) * Math.min(1, dt * 4);
        wagShareCur += (tm.share - wagShareCur) * Math.min(1, dt * 4);
        wagPhase += Math.PI * 2 * wagFreqCur * dt;
        if (tailRoot){
          tmpE.set(wagPitchCur * D2R, 0, Math.sin(wagPhase) * wagAmpCur * D2R);
          tmpQ.setFromEuler(tmpE);
          tailRoot.quaternion.multiply(tmpQ);
        }
        if (tailMid){
          tmpE.set(wagPitchCur * wagShareCur * D2R, 0, Math.sin(wagPhase - 1.0) * wagAmpCur * 1.25 * D2R);
          tmpQ.setFromEuler(tmpE);
          tailMid.quaternion.multiply(tmpQ);
        }
      }

      /* blink */
      var blinkVal = V.exprValues.blink || 0;
      if (V.blinkAnim >= 0){
        V.blinkAnim += dt / 0.22;
        if (V.blinkAnim >= 1) V.blinkAnim = -1;
        else blinkVal = Math.max(blinkVal, Math.sin(V.blinkAnim * Math.PI));
      } else if (V.toggles.blink){
        if (blinkPhase < 0 && t > nextAutoBlink) blinkPhase = 0;
        if (blinkPhase >= 0){
          blinkPhase += dt / 0.2;
          if (blinkPhase >= 1){ blinkPhase = -1; nextAutoBlink = t + 2.2 + Math.random() * 2.6; }
          else blinkVal = Math.max(blinkVal, Math.sin(blinkPhase * Math.PI));
        }
      }

      /* expressions: zero all slots first, then accumulate clamped [0..1] */
      for (var si = 0; si < V.exprSlots.length; si++){
        var sl = V.exprSlots[si];
        sl.mesh.morphTargetInfluences[sl.index] = 0;
      }
      var hasEyeBones = !!(bones.leftEye || bones.rightEye);
      Object.keys(V.exprBinds).forEach(function(name){
        var entry = V.exprBinds[name];
        var v = (name === 'blink') ? Math.min(1, blinkVal) : (V.exprValues[name] || 0);
        if (!hasEyeBones && V.toggles.look && pointer.active){
          if (name === 'lookLeft')  v = Math.max(v, Math.max(0, lookEyeYaw / 15));
          if (name === 'lookRight') v = Math.max(v, Math.max(0, -lookEyeYaw / 15));
          if (name === 'lookDown')  v = Math.max(v, Math.max(0, lookEyePitch / 10));
          if (name === 'lookUp')    v = Math.max(v, Math.max(0, -lookEyePitch / 10));
        }
        if (entry.isBinary) v = v > 0.5 ? 1 : 0;
        if (v <= 0) return;
        for (var bi = 0; bi < entry.binds.length; bi++){
          var b = entry.binds[bi];
          var cur = b.mesh.morphTargetInfluences[b.index];
          b.mesh.morphTargetInfluences[b.index] = Math.min(1, cur + v * b.weight);
        }
      });
    }

    renderer.render(scene, camera);

    frames++; fpsTime += dt;
    if (fpsTime >= 0.5){
      var fps = Math.round(frames / fpsTime);
      frames = 0; fpsTime = 0;
      if (V.model){
        statsEl.hidden = false;
        statsEl.textContent = fps + ' FPS ／ ' + V.modelInfo.tris.toLocaleString() + ' ポリゴン ／ 表情 ' + V.exprNames.length + '種';
      }
    }
  } catch(err){
    if (!isPolicyError(err)) showError('描画中にエラー: ' + err.message);
  }
}

window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

V.boot = function(){
  V.loadDefault();
  animate();
};

})();