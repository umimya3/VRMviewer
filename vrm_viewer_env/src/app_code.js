
(function(){
"use strict";
var errbox = document.getElementById('errbox');
function showError(msg){
  errbox.style.display = 'block';
  errbox.textContent = 'エラー: ' + msg;
}
/* Some host environments (a sandboxed preview iframe, an in-app
   WebView) deny optional device APIs through Permissions Policy.
   Calling them then raises a SecurityError — the Gamepad API is the
   known case here: navigator.getGamepads() throws instead of just
   being absent. Those denials are environmental, not app bugs: the
   affected feature quietly disables itself (see markPadBlocked),
   and they must never surface as the red error banner. The two
   global handlers below filter them out as a last line of defence
   behind the per-call-site guards; real errors still show. */
function errText(x){
  if (!x) return '';
  var s = '';
  try { s = String(x.message || x.name || x); } catch(e){ s = ''; }
  return s;
}
function isPolicyError(x){
  var m = errText(x);
  if (!m) return false;
  return /getGamepads/i.test(m)
    || (/gamepad/i.test(m) && /permission|policy|disallowed|SecurityError/i.test(m))
    || /disallowed by permissions policy/i.test(m);
}
function notePolicyError(x){
  if (/getGamepads|gamepad/i.test(errText(x))) markPadBlocked();
}
window.addEventListener('error', function(e){
  if (isPolicyError(e.error) || isPolicyError(e.message)){ notePolicyError(e.error || e.message); return; }
  showError(e.message || '不明なエラー');
});
window.addEventListener('unhandledrejection', function(e){
  if (isPolicyError(e.reason)){
    notePolicyError(e.reason);
    if (e.preventDefault) e.preventDefault();
    return;
  }
  showError('読み込みに失敗しました: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
});

/* ---- build stamp & stale-copy detection ----
   BUILD_ID is bumped on every JS change and shown in the status chip
   (see #buildstamp) so the running build can be identified at a glance.
   On load, the page re-fetches its own document with caching disabled:
   if the served copy carries a different BUILD_ID, this running copy
   came out of a browser cache (or an old local server still serving an
   old folder) and the stale banner says so with the remedy, instead of
   the game silently behaving like an older version. Detection is
   best-effort: any failure (offline, odd host path) stays silent. */
var BUILD_ID = '2026-11-06.10';
function checkStaleCopy(){
  if (typeof fetch !== 'function') return;
  function onText(t){
    if (!t) return;
    if (t.indexOf('Shiromi Buri VRM Viewer') < 0) return;
    var m = t.match(/BUILD_ID\s*=\s*'([^']+)'/);
    if (!m || m[1] === BUILD_ID) return;
    var bar = document.getElementById('stalebar');
    if (!bar) return;
    document.getElementById('stale-running').textContent = BUILD_ID;
    document.getElementById('stale-served').textContent = m[1];
    bar.hidden = false;
  }
  try {
    fetch('index.html', { cache:'no-store' }).then(function(r){
      return r && r.ok ? r.text() : null;
    }).then(onText).catch(function(){});
  } catch(e){ /* best-effort only */ }
}
window.addEventListener('load', function(){ setTimeout(checkStaleCopy, 600); });
var staleCloseBtn = document.getElementById('stale-close');
if (staleCloseBtn) staleCloseBtn.addEventListener('click', function(){
  document.getElementById('stalebar').hidden = true;
});

var stage = document.getElementById('stage');
var loadmsg = document.getElementById('loadmsg');
var statsEl = document.getElementById('stats');
var overlay = document.getElementById('overlay');

/* ================= renderer / scene ================= */
var renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias:true, preserveDrawingBuffer:true });
} catch(e){ showError('WebGLを初期化できませんでした: ' + e.message); return; }
var COARSE_POINTER = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, COARSE_POINTER ? 1.75 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);

var scene = new THREE.Scene();
/* Blue-sky backdrop: a vertical gradient texture (deep blue at the
   zenith fading to a pale horizon). It is the default background;
   the 背景 swatches in the panel can still switch to flat colors. */
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

var camera = new THREE.PerspectiveCamera(38, window.innerWidth/window.innerHeight, 0.05, 240);
camera.position.set(1.15, 1.28, 2.75);

var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.86, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.35;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI * 0.62;
controls.autoRotateSpeed = 1.6;

/* lights */
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f52, 0.85));
var key = new THREE.DirectionalLight(0xfff2e6, 1.6);
key.position.set(1.6, 2.6, 2.0);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -3.5; key.shadow.camera.right = 3.5;
key.shadow.camera.top = 4; key.shadow.camera.bottom = -1;
key.shadow.bias = -0.0004;
scene.add(key);
var rim = new THREE.DirectionalLight(0xf0a6be, 0.7);
rim.position.set(-2.0, 1.6, -1.8);
scene.add(rim);
var fill = new THREE.DirectionalLight(0xbfd9ff, 0.35);
fill.position.set(-1.4, 0.8, 2.2);
scene.add(fill);

/* floor */
var floorTex = (function(){
  var c = document.createElement('canvas'); c.width = c.height = 256;
  var g = c.getContext('2d');
  var grad = g.createRadialGradient(128,128,10,128,128,128);
  grad.addColorStop(0, 'rgba(255,255,255,0.20)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0,0,256,256);
  var t = new THREE.CanvasTexture(c); return t;
})();
var floor = new THREE.Mesh(
  new THREE.CircleGeometry(2.6, 48),
  new THREE.MeshStandardMaterial({ color:0xffffff, transparent:true, opacity:0.5, map:floorTex, roughness:1, metalness:0, depthWrite:false })
);
floor.rotation.x = -Math.PI/2; floor.position.y = 0.001;
scene.add(floor);
var shadowCatcher = new THREE.Mesh(
  new THREE.PlaneGeometry(150, 150),
  new THREE.ShadowMaterial({ opacity: 0.32 })
);
shadowCatcher.rotation.x = -Math.PI/2; shadowCatcher.receiveShadow = true;
scene.add(shadowCatcher);

/* ================= wide field for free-roam =================
   One big open ground: a playable disc of radius FIELD_R ringed by a
   low wooden fence, scattered low-poly trees and rocks, and a faint
   polar grid so distance reads while she walks. All primitives —
   no extra assets. The soft radial disc (`floor`, above) stays as a
   highlight that follows her around. */
var FIELD_R = 38;
var lockOccluders = [];   // trees & rocks: raycast targets for lock-on occlusion
(function buildField(){
  var group = new THREE.Group();
  var outer = new THREE.Mesh(
    new THREE.CircleGeometry(75, 64),
    new THREE.MeshStandardMaterial({ color:0x476b52, roughness:1, metalness:0 })
  );
  outer.rotation.x = -Math.PI/2; outer.position.y = -0.02; outer.receiveShadow = true;
  group.add(outer);
  var inner = new THREE.Mesh(
    new THREE.CircleGeometry(FIELD_R + 0.6, 64),
    new THREE.MeshStandardMaterial({ color:0x5d8266, roughness:1, metalness:0 })
  );
  inner.rotation.x = -Math.PI/2; inner.position.y = -0.01; inner.receiveShadow = true;
  group.add(inner);
  var grid = new THREE.PolarGridHelper(FIELD_R, 16, 9, 72, 0xffffff, 0xffffff);
  grid.position.y = 0.004;
  if (grid.material){ grid.material.transparent = true; grid.material.opacity = 0.07; grid.material.depthWrite = false; }
  group.add(grid);

  /* fence: posts + two rails around the playable edge */
  var woodMat = new THREE.MeshStandardMaterial({ color:0x7a5a3d, roughness:1, metalness:0 });
  var postGeo = new THREE.CylinderGeometry(0.04, 0.045, 1.0, 6);
  var postCount = 56;
  for (var pi = 0; pi < postCount; pi++){
    var pa = (pi / postCount) * Math.PI * 2;
    var post = new THREE.Mesh(postGeo, woodMat);
    post.position.set(Math.cos(pa) * FIELD_R, 0.5, Math.sin(pa) * FIELD_R);
    post.castShadow = true;
    group.add(post);
  }
  [0.42, 0.82].forEach(function(h){
    var rail = new THREE.Mesh(new THREE.TorusGeometry(FIELD_R, 0.028, 6, 128), woodMat);
    rail.rotation.x = Math.PI / 2; rail.position.y = h;
    group.add(rail);
  });

  /* scattered trees and rocks (seeded, so the field is stable) */
  var seed = 20261105;
  function rnd(){ seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  var trunkMat = new THREE.MeshStandardMaterial({ color:0x6b4a33, roughness:1, metalness:0 });
  var leafMats = [0x3f7048, 0x4c8455, 0x679a5e].map(function(c){
    return new THREE.MeshStandardMaterial({ color:c, roughness:1, metalness:0 });
  });
  var rockMat = new THREE.MeshStandardMaterial({ color:0x8d9299, roughness:1, metalness:0 });
  var trunkGeo = new THREE.CylinderGeometry(0.05, 0.09, 0.55, 6);
  var coneGeo1 = new THREE.ConeGeometry(0.58, 1.15, 7);
  var coneGeo2 = new THREE.ConeGeometry(0.4, 0.85, 7);
  var rockGeo = new THREE.DodecahedronGeometry(0.32, 0);
  for (var i = 0; i < 54; i++){
    var ang = rnd() * Math.PI * 2;
    var rad = 5.5 + rnd() * (FIELD_R - 8);
    var px = Math.cos(ang) * rad, pz = Math.sin(ang) * rad;
    if (rnd() < 0.6){
      var tree = new THREE.Group();
      var trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 0.27; trunk.castShadow = true; tree.add(trunk);
      var lm = leafMats[Math.floor(rnd() * leafMats.length)];
      var c1 = new THREE.Mesh(coneGeo1, lm); c1.position.y = 1.05; c1.castShadow = true; tree.add(c1);
      var c2 = new THREE.Mesh(coneGeo2, lm); c2.position.y = 1.62; c2.castShadow = true; tree.add(c2);
      var ts = 0.85 + rnd() * 0.9;
      tree.scale.set(ts, ts, ts);
      tree.rotation.y = rnd() * Math.PI * 2;
      tree.position.set(px, 0, pz);
      group.add(tree);
      lockOccluders.push(tree);
    } else {
      var rock = new THREE.Mesh(rockGeo, rockMat);
      var rs = 0.6 + rnd() * 1.3;
      rock.scale.set(rs, rs * (0.6 + rnd() * 0.5), rs);
      rock.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      rock.position.set(px, 0.08, pz);
      rock.castShadow = true;
      group.add(rock);
      lockOccluders.push(rock);
    }
  }
  scene.add(group);
})();

/* ================= destructible props =================
   Wooden crates and barrels scattered over the field. Attacks in
   free mode damage them (see updateAttackHits): a crate breaks in
   2 hits, a barrel in 3 (the 必殺 chop deals 3). A break bursts
   into debris shards, and the prop respawns after ~12s. */
var destructibles = [];
var debris = [];
var destroyedCount = 0;
var debrisGeo = new THREE.BoxGeometry(0.17, 0.17, 0.17);
(function buildDestructibles(){
  var group = new THREE.Group();
  var seed = 777001;
  function rnd(){ seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  var crateGeo = new THREE.BoxGeometry(0.82, 0.82, 0.82);
  var crateEdge = new THREE.EdgesGeometry(crateGeo);
  var barrelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.88, 12);
  var ringGeo = new THREE.TorusGeometry(0.345, 0.022, 6, 20);
  var ringMat = new THREE.MeshStandardMaterial({ color:0x45454e, roughness:0.7, metalness:0.4 });
  var placed = [];
  for (var i = 0; i < 11; i++){
    var px = 0, pz = 0, ok = false, tries = 0;
    while (!ok && tries++ < 40){
      var ang = rnd() * Math.PI * 2;
      var rad = 6.5 + rnd() * (FIELD_R - 11);
      px = Math.cos(ang) * rad; pz = Math.sin(ang) * rad;
      ok = true;
      for (var q = 0; q < placed.length; q++){
        if (Math.hypot(placed[q][0] - px, placed[q][1] - pz) <= 4.2){ ok = false; break; }
      }
    }
    placed.push([px, pz]);
    var isBarrel = (i % 3 === 2);
    var g = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: isBarrel ? 0x7d5a36 : 0x9a7448, roughness:1, metalness:0 });
    var body = new THREE.Mesh(isBarrel ? barrelGeo : crateGeo, mat);
    body.castShadow = true; body.position.y = isBarrel ? 0.44 : 0.41;
    g.add(body);
    if (isBarrel){
      [-0.26, 0.26].forEach(function(dy){
        var ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2; ring.position.y = 0.44 + dy;
        g.add(ring);
      });
    } else {
      var edges = new THREE.LineSegments(crateEdge, new THREE.LineBasicMaterial({ color:0x5f4226 }));
      edges.position.y = 0.41;
      g.add(edges);
    }
    g.position.set(px, 0, pz);
    g.rotation.y = rnd() * Math.PI * 2;
    group.add(g);
    destructibles.push({ mesh:g, mat:mat, x:px, z:pz, r: isBarrel ? 0.5 : 0.62,
      hp: isBarrel ? 3 : 2, maxHp: isBarrel ? 3 : 2, barrel: isBarrel,
      alive:true, shake:0, flash:0, respawnT:0, spawnT:1 });
  }
  scene.add(group);
})();

function destroyProp(o){
  o.alive = false; o.respawnT = 12; destroyedCount++;
  playBreakSfx();
  spawnImpact(_hitV.set(o.x, 0.55, o.z), 1.25, 0xffb066);
  spawnGroundRing(_hitV.set(o.x, 0.06, o.z), 2.0, 0xffb066);
  o.mesh.visible = false;
  o.shake = 0; o.flash = 0; o.mat.emissive.setRGB(0, 0, 0);
  var col = o.barrel ? 0x7d5a36 : 0x9a7448;
  for (var i = 0; i < 7; i++){
    var m = new THREE.Mesh(debrisGeo, new THREE.MeshStandardMaterial({ color: col, roughness:1, metalness:0, transparent:true }));
    var a = Math.random() * Math.PI * 2, sp = 0.8 + Math.random() * 1.6;
    m.position.set(o.x, 0.45, o.z);
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    m.castShadow = true;
    scene.add(m);
    debris.push({ mesh:m, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, vy: 2.0 + Math.random() * 1.8,
      rx: (Math.random() - 0.5) * 9, rz: (Math.random() - 0.5) * 9, life: 0 });
  }
}
function damageProp(o, dmg){
  if (!o.alive) return;
  o.hp -= dmg;
  o.shake = 1; o.flash = 1;
  if (o.hp <= 0) destroyProp(o);
  else {
    playHitSfx(dmg >= 2);
    spawnImpact(_hitV.set(o.x, 0.55, o.z), dmg >= 2 ? 0.8 : 0.55, 0xffc37a);
  }
}

/* per-frame prop effects: hit shake / flash, respawn, debris flight */
function updatePropsFx(dt){
  var t = lastT;
  for (var i = 0; i < destructibles.length; i++){
    var o = destructibles[i];
    if (!o.alive){
      if (o.respawnT > 0){
        o.respawnT -= dt;
        if (o.respawnT <= 0){
          o.alive = true; o.hp = o.maxHp; o.spawnT = 0;
          o.mesh.visible = true; o.mesh.rotation.x = 0; o.mesh.rotation.z = 0;
        }
      }
      continue;
    }
    if (o.spawnT < 1){
      o.spawnT = Math.min(1, o.spawnT + dt / 0.3);
      var sc = 0.25 + 0.75 * o.spawnT;
      o.mesh.scale.set(sc, sc, sc);
    }
    if (o.shake > 0.004){
      o.mesh.rotation.z = Math.sin(t * 75) * 0.05 * o.shake;
      o.mesh.rotation.x = Math.cos(t * 63) * 0.04 * o.shake;
      o.shake *= Math.exp(-9 * dt);
    } else if (o.mesh.rotation.z !== 0 || o.mesh.rotation.x !== 0){
      o.mesh.rotation.z = 0; o.mesh.rotation.x = 0;
    }
    if (o.flash > 0.02){
      o.mat.emissive.setRGB(0.5 * o.flash, 0.2 * o.flash, 0.06 * o.flash);
      o.flash *= Math.exp(-8 * dt);
    } else if (o.flash !== 0){
      o.flash = 0; o.mat.emissive.setRGB(0, 0, 0);
    }
  }
  for (var j = debris.length - 1; j >= 0; j--){
    var d = debris[j];
    d.life += dt;
    d.vy -= 7.5 * dt;
    d.mesh.position.x += d.vx * dt;
    d.mesh.position.z += d.vz * dt;
    d.mesh.position.y += d.vy * dt;
    if (d.mesh.position.y < 0.09){
      d.mesh.position.y = 0.09; d.vy *= -0.35; d.vx *= 0.7; d.vz *= 0.7;
    }
    d.mesh.rotation.x += d.rx * dt;
    d.mesh.rotation.z += d.rz * dt;
    if (d.life > 0.55) d.mesh.material.opacity = Math.max(0, 1 - (d.life - 0.55) / 0.3);
    if (d.life >= 0.85){
      scene.remove(d.mesh);
      d.mesh.material.dispose();
      debris.splice(j, 1);
    }
  }
}

/* ================= dummy buri creatures =================
   Sparring enemies: a buri fish with muscular human arms and legs,
   in the ブリ / マグロ / アカ color patterns — one per personality.
   They field in WAVES: at most 3 at a time (VS-series style), and
   the mission's kill target — the total to fell, 10..20, default
   10 — is fed in one reinforcement at a time as the field thins
   (see the enemy-total block below). Hits flinch them, アッパー
   and the 必殺 chop
   launch them, and at 0 HP they topple over; outside a mission
   they revive after a few seconds, during one they stay down.
   An HP bar floats over each head. */
var dummies = [];
var dummyDowns = 0;
function makeDummyFish(backCol, bellyCol, finCol){
  var g = new THREE.Group();
  var backMat = new THREE.MeshStandardMaterial({ color: backCol, roughness: 0.5, metalness: 0.3 });
  var bellyMat = new THREE.MeshStandardMaterial({ color: bellyCol, roughness: 0.6, metalness: 0.15 });
  var finMat = new THREE.MeshStandardMaterial({ color: finCol, roughness: 0.7, metalness: 0.1 });
  var skinMat = new THREE.MeshStandardMaterial({ color: 0xd99e73, roughness: 0.85, metalness: 0 });
  var darkMat = new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.4, metalness: 0 });
  var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0 });
  function add(geo, mat, x, y, z){
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true; g.add(m); return m;
  }
  var body = add(new THREE.SphereGeometry(0.52, 20, 14), backMat, 0, 1.06, 0);
  body.scale.set(0.82, 0.78, 1.6);
  var belly = add(new THREE.SphereGeometry(0.5, 18, 12), bellyMat, 0, 0.94, 0.05);
  belly.scale.set(0.72, 0.58, 1.48);
  var tailFin = add(new THREE.ConeGeometry(0.36, 0.55, 4), finMat, 0, 1.06, -0.98);
  tailFin.scale.set(0.16, 1, 1); tailFin.rotation.x = -Math.PI / 2;
  var dorsal = add(new THREE.ConeGeometry(0.24, 0.36, 4), finMat, 0, 1.5, -0.12);
  dorsal.scale.set(0.16, 1, 1);
  [-1, 1].forEach(function(s){
    var pec = add(new THREE.ConeGeometry(0.16, 0.34, 4), finMat, s * 0.44, 0.92, 0.3);
    pec.scale.set(0.2, 1, 1); pec.rotation.z = s * 2.2;
    add(new THREE.SphereGeometry(0.078, 10, 8), whiteMat, s * 0.31, 1.2, 0.55);
    add(new THREE.SphereGeometry(0.04, 8, 6), darkMat, s * 0.35, 1.2, 0.6);
    /* muscular arm: shoulder + bicep, forearm, fist */
    add(new THREE.SphereGeometry(0.155, 12, 10), skinMat, s * 0.47, 1.0, 0.18);
    var ua = add(new THREE.CylinderGeometry(0.105, 0.09, 0.4, 10), skinMat, s * 0.52, 0.82, 0.18);
    ua.rotation.z = s * 0.28;
    var fa = add(new THREE.CylinderGeometry(0.088, 0.078, 0.36, 10), skinMat, s * 0.58, 0.52, 0.2);
    fa.rotation.z = s * 0.14;
    add(new THREE.SphereGeometry(0.125, 12, 10), skinMat, s * 0.6, 0.3, 0.21);
    /* muscular leg: thigh, knee, shin, foot */
    var th = add(new THREE.CylinderGeometry(0.13, 0.105, 0.42, 10), skinMat, s * 0.21, 0.47, 0);
    add(new THREE.SphereGeometry(0.105, 10, 8), skinMat, s * 0.21, 0.27, 0.01);
    add(new THREE.CylinderGeometry(0.092, 0.075, 0.3, 10), skinMat, s * 0.21, 0.14, 0);
    add(new THREE.BoxGeometry(0.16, 0.07, 0.3), darkMat, s * 0.21, 0.035, 0.06);
  });
  add(new THREE.BoxGeometry(0.17, 0.03, 0.02), darkMat, 0, 0.93, 0.82);
  return { group: g, mats: [backMat, bellyMat, finMat, skinMat] };
}
/* ================= enemy total & waves （総撃破数と増援） =================
   VS-series population rules: at most MAX_ACTIVE_ENEMIES (3) are
   ever on the field at once — that cap is FIXED, not a setting.
   The debug panel slider instead picks the mission's TOTAL kill
   target (総撃破数, 10..20, default 10): the first wave of up to
   3 takes the field and the rest wait in the reinforcement queue.
   Each kill starts a short timer (~1.5s); when it fires, the next
   queued enemy spawns at a spot away from the player, until the
   queue is spent — felling the last fielded enemy after that is
   what clears the mission (see damageDummy / updateMission).
   Personalities (性格): マグロ = おとなしい / ブリ = ふつう /
   アカ = 好戦的 — the numbers live in PERSONALITIES (mission block).
   The mix is planned over the WHOLE total at roughly
   マグロ4 : ブリ4 : アカ2: per-type quotas are rounded from the
   ratio, then dealt out one enemy at a time to whichever type is
   furthest behind its share, so the spawn order stays interleaved
   and never clumps one personality into a single wave.
   A slider change made mid-mission is only PENDING: it applies at
   the next mission start / retry (resetBattlefield), so the
   remaining count never jumps under the player. On the title /
   result screens it applies on the spot. */
var ENEMY_TOTAL_DEFAULT = 10;
var MAX_ACTIVE_ENEMIES = 3;                    /* fixed cap （固定） */
var REINFORCE_DELAY = 1.5;                     /* seconds after a kill （仮） */
var enemyTotal = ENEMY_TOTAL_DEFAULT;          /* kill target of the built roster */
var enemyTotalPending = ENEMY_TOTAL_DEFAULT;   /* slider value */
var reinforcementQueue = [];                   /* personalities not yet spawned */
var reinforceT = -1;                           /* countdown to the next spawn; <0 = idle */
var rosterSpawned = 0;                         /* how many of the roster have spawned */
var ENEMY_TYPES = {
  gentle:     { name: 'マグロ', cols: [0x2e4a73, 0xcfd8de, 0x22364f] },
  normal:     { name: 'ブリ',   cols: [0x86a8bd, 0xdfe7ea, 0xe8c33a] },
  aggressive: { name: 'アカ',   cols: [0xb6493f, 0xe8c9b8, 0x8e352d] }
};
function enemyTypePlan(n){
  var want = { gentle: Math.round(n * 0.4), normal: 0, aggressive: Math.round(n * 0.2) };
  want.normal = Math.max(0, n - want.gentle - want.aggressive);
  var left = { gentle: want.gentle, normal: want.normal, aggressive: want.aggressive };
  var keys = ['gentle', 'normal', 'aggressive'];
  var plan = [];
  for (var i = 0; i < n; i++){
    var best = null, bestScore = -1;
    for (var k = 0; k < keys.length; k++){
      var key = keys[k];
      if (!left[key] || !want[key]) continue;
      var score = left[key] / want[key];
      if (score > bestScore){ bestScore = score; best = key; }
    }
    if (!best) best = 'normal';
    plan.push(best); left[best]--;
  }
  return plan;
}
/* spawn spots: a golden-angle spiral (radius 9m out to 22m), so
   1..20 enemies spread over the field without stacking and never
   land on her start point at the origin */
function enemySpawnPos(i, n){
  var a = 0.8 + i * 2.39996;
  var r = n <= 1 ? 11 : 9 + (i / (n - 1)) * 13;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}
function makeOneDummy(person, x, z, i){
  var t = ENEMY_TYPES[person];
  var made = makeDummyFish(t.cols[0], t.cols[1], t.cols[2]);
  made.group.position.set(x, 0, z);
  var yaw0 = Math.atan2(-x, -z);
  made.group.rotation.y = yaw0;
  scene.add(made.group);
  var bar = new THREE.Group();
  var bgS = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x10131a, transparent: true, opacity: 0.8, depthWrite: false }));
  bgS.scale.set(0.95, 0.13, 1);
  var fgS = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x7dd069, transparent: true, opacity: 0.95, depthWrite: false }));
  fgS.scale.set(0.88, 0.08, 1);
  bar.add(bgS); bar.add(fgS);
  bar.position.set(x, 2.05, z);
  scene.add(bar);
  dummies.push({ group: made.group, mats: made.mats, bar: bar, fg: fgS,
    name: t.name, person: person,
    x: x, z: z, spawnX: x, spawnZ: z, r: 0.85, hp: 12, maxHp: 12,
    alive: true, down: false, downT: 0,
    flinch: 0, flash: 0, vy: 0, airY: 0, kx: 0, kz: 0,
    phase: i * 2.1, spawnT: 1,
    /* personality-AI state (see updateDummyAI): wander / chase /
       windup / strike / recover, plus the lunge bookkeeping */
    aiState: 'wander', stateT: 0, decT: 0.4 + i * 0.3, atkCd: 2,
    atkDirX: 0, atkDirZ: 0, atkHitDone: true, visPitch: 0,
    atkWants: false, atkReqT: 0,
    /* lock-on bookkeeping: last player hit / (re)spawn time for
       f_eng and the fresh-spawn exclusion, debounced occlusion
       state, and the latest evaluated score */
    lastHitT: -99, bornT: -99,
    occRaw: false, occState: false, occStableT: 0, occDur: 0,
    lockScore: 0,
    /* enemy-AI state (see enemyMode / updateDummiesFx) */
    aiTx: x, aiTz: z, aiWait: i * 0.7, aiHasTarget: false, aiYaw: yaw0 });
}
function disposeDummy(d){
  scene.remove(d.group);
  scene.remove(d.bar);
  d.group.traverse(function(n){
    if (n.geometry) n.geometry.dispose();
    if (n.material) n.material.dispose();
  });
  d.bar.traverse(function(n){ if (n.material) n.material.dispose(); });
}
function aliveEnemyCount(){
  var c = 0;
  for (var i = 0; i < dummies.length; i++) if (dummies[i].alive && !dummies[i].down) c++;
  return c;
}
/* reinforcement spawn spots stay on the golden-angle spiral, but a
   candidate too close to her is skipped for the next angle over, so
   a fresh enemy never pops in on top of the fight */
function reinforcementSpawnPos(serial){
  var base = enemySpawnPos(serial, Math.max(4, enemyTotal));
  if (typeof model === 'undefined' || !model) return base;
  var r = Math.hypot(base.x, base.z);
  var a0 = Math.atan2(base.z, base.x);
  for (var k = 0; k < 8; k++){
    var a = a0 + k * 1.7;
    var cand = { x: Math.cos(a) * r, z: Math.sin(a) * r };
    if (Math.hypot(cand.x - model.position.x, cand.z - model.position.z) >= 8.5) return cand;
  }
  return base;
}
/* build a wave roster for a total of n: the first wave (at most
   MAX_ACTIVE_ENEMIES) takes the field, the rest of the personality
   plan waits in the reinforcement queue */
function buildWaveRoster(n){
  for (var i = dummies.length - 1; i >= 0; i--) disposeDummy(dummies[i]);
  dummies = [];
  enemyTotal = n;
  var plan = enemyTypePlan(n);
  var first = Math.min(MAX_ACTIVE_ENEMIES, n);
  for (var j = 0; j < first; j++){
    var p = enemySpawnPos(j, n);
    makeOneDummy(plan[j], p.x, p.z, j);
  }
  reinforcementQueue = plan.slice(first);
  rosterSpawned = first;
  reinforceT = -1;
}
buildWaveRoster(ENEMY_TOTAL_DEFAULT);
/* bring the next queued enemy onto the field: it scales in
   (spawnT) and gets the fresh-spawn lock-on grace via bornT */
function spawnNextReinforcement(){
  if (!reinforcementQueue.length) return;
  var person = reinforcementQueue.shift();
  var serial = rosterSpawned++;
  var p = reinforcementSpawnPos(serial);
  makeOneDummy(person, p.x, p.z, serial);
  var d = dummies[dummies.length - 1];
  d.spawnT = 0;
  d.bornT = (typeof lastT === 'number') ? lastT : -99;
  if (typeof updateGameHud === 'function') updateGameHud();
}
function setEnemyTotal(n){
  n = Math.max(10, Math.min(20, Math.round(n) || ENEMY_TOTAL_DEFAULT));
  enemyTotalPending = n;
  var out = document.getElementById('enemy-count-out');
  if (out) out.textContent = n + ' 体';
  var tc = document.getElementById('title-enemy-count');
  if (tc) tc.textContent = String(n);
  /* outside a live mission the new roster applies on the spot
     (and the kill tally restarts with it, so the HUD's remaining
     count — total minus downs — stays honest); mid-mission it
     stays pending until the next start / retry */
  var st = (typeof missionState !== 'undefined') ? missionState : 'boot';
  if (st !== 'playing' && st !== 'starting'){
    dummyDowns = 0;
    buildWaveRoster(n);
    if (typeof lockRelease === 'function') lockRelease('reset');
    if (typeof updateGameHud === 'function') updateGameHud();
  }
}
var enemyCountEl = document.getElementById('enemy-count');
if (enemyCountEl) enemyCountEl.addEventListener('input', function(){
  setEnemyTotal(parseInt(enemyCountEl.value, 10));
});

function damageDummy(d, dmg, launch){
  if (!d.alive || d.down) return;
  d.hp -= dmg;
  gainAwaken(dmg * AWK_GAIN_DEAL);   // dealing damage is the main way the 覚醒 gauge fills
  d.lastHitT = lastT; lastPlayerHitT = lastT;   // lock-on: f_eng + auto-switch timing
  d.flinch = 1; d.flash = 1;
  /* a solid hit interrupts a telegraphed enemy attack */
  if (d.aiState === 'windup'){ d.aiState = 'recover'; d.stateT = 0; d.atkCd = 0.9; d.visPitch = 0; }
  spawnImpact(_hitV.set(d.x, 1.05 + d.airY, d.z), launch ? 1.05 : 0.65, launch ? 0xffc84d : 0xffd9a0);
  var dx = d.x - model.position.x, dz = d.z - model.position.z;
  var dl = Math.hypot(dx, dz) || 1;
  var push = launch ? 1.4 : 2.4;
  d.kx = dx / dl * push; d.kz = dz / dl * push;
  if (launch && d.airY <= 0) d.vy = launch;
  if (d.hp <= 0){
    d.hp = 0; d.down = true; d.downT = 0; d.vy = 0; d.airY = 0;
    d.aiState = 'wander'; d.visPitch = 0; d.atkWants = false;
    dummyDowns++;
    playDownSfx();
    /* waves: while reinforcements remain, this kill only starts
       the ~1.5s spawn timer (updateMission fires the actual spawn,
       one at a time, while the field is under the 3-cap). The
       mission clears only once the queue is spent AND the last
       fielded enemy goes down. */
    if (typeof missionState !== 'undefined' && missionState === 'playing'){
      if (reinforcementQueue.length > 0){
        if (reinforceT < 0) reinforceT = REINFORCE_DELAY;
      } else {
        var allDown = true;
        for (var q = 0; q < dummies.length; q++) if (!dummies[q].down) allDown = false;
        if (allDown) missionClear();
      }
    }
  } else {
    playHitSfx(dmg >= 3);
  }
}

/* per-frame dummy effects: flinch / flash, knockback slide, launch
   physics with a small bounce, topple-and-revive, HP bar tracking */
function updateDummiesFx(dt){
  for (var i = 0; i < dummies.length; i++){
    var d = dummies[i];
    if (d.down){
      d.downT += dt;
      var kk = smooth01(Math.min(1, d.downT / 0.45));
      d.group.rotation.x = -Math.PI / 2 * 0.94 * kk;
      d.group.rotation.z = 0;
      d.bar.visible = false;
      /* during a mission a downed enemy stays down (it counts as
         defeated); the old revive only applies outside missions */
      if (d.downT >= 6.5 && (typeof missionState === 'undefined' || missionState !== 'playing')){
        d.down = false; d.hp = d.maxHp; d.spawnT = 0;
        d.bornT = lastT; d.lastHitT = -99; d.occState = false; d.occDur = 0;
        d.group.rotation.x = 0; d.flinch = 0; d.flash = 0;
        for (var m0 = 0; m0 < d.mats.length; m0++) d.mats[m0].emissive.setRGB(0, 0, 0);
      }
      continue;
    }
    if (d.kx !== 0 || d.kz !== 0){
      d.x += d.kx * dt; d.z += d.kz * dt;
      var rrD = Math.hypot(d.x, d.z), maxD = FIELD_R - 1.2;
      if (rrD > maxD){ d.x *= maxD / rrD; d.z *= maxD / rrD; }
      var dec = Math.exp(-6 * dt);
      d.kx *= dec; d.kz *= dec;
      if (Math.abs(d.kx) < 0.01) d.kx = 0;
      if (Math.abs(d.kz) < 0.01) d.kz = 0;
    }
    /* ---- enemy AI: personality state machine (see updateDummyAI).
       Skipped while launched, knocked back or flinching, outside a
       live mission phase, or when the override mode is 静止 ---- */
    if (typeof enemyMode !== 'undefined' && enemyMode !== 'idle' &&
        typeof freeMode !== 'undefined' && freeMode &&
        (typeof missionState === 'undefined' || missionState === 'playing' ||
         missionState === 'title' || missionState === 'starting') &&
        d.airY <= 0 && d.vy === 0 && d.flinch < 0.45 &&
        Math.abs(d.kx) < 0.25 && Math.abs(d.kz) < 0.25 && model){
      updateDummyAI(d, dt);
    } else if (d.visPitch) d.visPitch = 0;
    if (d.airY > 0 || d.vy > 0){
      d.vy -= 9.5 * dt;
      d.airY += d.vy * dt;
      if (d.airY <= 0){
        d.airY = 0;
        if (d.vy < -2.6){ d.vy = -d.vy * 0.28; d.flinch = Math.max(d.flinch, 0.7); playHitSfx(false); }
        else d.vy = 0;
      }
    }
    var grounded = d.airY <= 0 && d.vy === 0;
    d.group.position.set(d.x, d.airY + (grounded ? Math.sin(lastT * 1.4 + d.phase) * 0.02 : 0), d.z);
    d.group.rotation.x = (d.airY > 0 ? -Math.min(0.85, d.airY * 0.55) : 0) + (d.visPitch || 0);
    if (d.spawnT < 1){
      d.spawnT = Math.min(1, d.spawnT + dt / 0.3);
      var sc2 = 0.25 + 0.75 * d.spawnT;
      d.group.scale.set(sc2, sc2, sc2);
    }
    if (d.flinch > 0.004){
      d.group.rotation.z = Math.sin(lastT * 70) * 0.07 * d.flinch;
      d.flinch *= Math.exp(-7 * dt);
    } else d.group.rotation.z = 0;
    if (d.flash > 0.02){
      for (var m1 = 0; m1 < d.mats.length; m1++) d.mats[m1].emissive.setRGB(0.5 * d.flash, 0.22 * d.flash, 0.08 * d.flash);
      d.flash *= Math.exp(-8 * dt);
    } else if (d.flash !== 0){
      d.flash = 0;
      for (var m2 = 0; m2 < d.mats.length; m2++) d.mats[m2].emissive.setRGB(0, 0, 0);
    }
    var frac = d.hp / d.maxHp;
    d.bar.visible = true;
    d.bar.position.set(d.x, 2.05 + d.airY, d.z);
    d.fg.scale.x = Math.max(0.001, 0.88 * frac);
    d.fg.position.x = -0.44 * (1 - frac);
    d.fg.material.color.setHex(frac > 0.5 ? 0x7dd069 : (frac > 0.25 ? 0xe8c33a : 0xe5534b));
  }
  /* attack-token grants run once per frame, after every enemy's
     AI has had its say (see the anti-gank block) */
  updateAttackTokens();
  /* gentle separation so enemies never stack inside each other */
  for (var si = 0; si < dummies.length; si++){
    for (var sj = si + 1; sj < dummies.length; sj++){
      var a1 = dummies[si], a2 = dummies[sj];
      if (a1.down || a2.down) continue;
      var sdx = a2.x - a1.x, sdz = a2.z - a1.z;
      var sd = Math.hypot(sdx, sdz);
      if (sd > 0.001 && sd < 1.35){
        var push = (1.35 - sd) / 2;
        var ux = sdx / sd, uz = sdz / sd;
        a1.x -= ux * push; a1.z -= uz * push;
        a2.x += ux * push; a2.z += uz * push;
      }
    }
  }
}

/* attack hit detection against the props (free mode only). Melee
   strikes land in a frontal arc at each swing's impact time; shots
   are hitscan along her facing and stop at the nearest prop. */
var MELEE_SPECS = {
  combo:   { times:[0.42, 1.0, 1.52], range:1.95, dmg:1, arc:0.45 },
  upper:   { times:[0.68],            range:1.95, dmg:2, arc:0.45 },
  chop:    { times:[1.55],            range:2.15, dmg:3, arc:0.5 },
  spin:    { times:[0.55],            range:1.85, dmg:1, arc:-1 },
  bat:     { times:[0.55],            range:2.05, dmg:2, arc:0.45 },
  thrust:  { times:[0.5],             range:2.35, dmg:1, arc:0.78 },
  airslash:{ times:[0.52],            range:1.95, dmg:1, arc:0.45 }
};
var SHOT_SPECS = {
  shot1:     { times:[0.30],             range:14, dmg:1, width:0.3 },
  burst:     { times:[0.55, 0.66, 0.77], range:14, dmg:1, width:0.3 },
  airshot:   { times:[0.62],             range:12, dmg:1, width:0.3 },
  chargeshot:{ times:[0.85],             range:16, dmg:3, width:0.6 }
};
var hitMarkStart = null, hitMarkDone = {};
function updateAttackHits(){
  if (!motion || motionFading){ hitMarkStart = null; return; }
  if (hitMarkStart !== motion.start){ hitMarkStart = motion.start; hitMarkDone = {}; }
  var spec = MELEE_SPECS[motion.name], isShot = false;
  if (!spec){ spec = SHOT_SPECS[motion.name]; isShot = !!spec; }
  if (!spec) return;
  var el = lastT - motion.start;
  var fx = Math.sin(charYaw), fz = Math.cos(charYaw);
  for (var i = 0; i < spec.times.length; i++){
    if (el < spec.times[i] || hitMarkDone[i]) continue;
    hitMarkDone[i] = true;
    if (isShot){
      if (model.position.y > 2.4) continue;
      var best = null, bestAlong = Infinity;
      for (var a = 0; a < destructibles.length; a++){
        var o1 = destructibles[a];
        if (!o1.alive) continue;
        var dx1 = o1.x - model.position.x, dz1 = o1.z - model.position.z;
        var along = dx1 * fx + dz1 * fz;
        if (along < 0.4 || along > spec.range) continue;
        var lat = Math.abs(dx1 * fz - dz1 * fx);
        if (lat <= o1.r + spec.width && along < bestAlong){ best = o1; bestAlong = along; }
      }
      var bestD = null, bestDAlong = Infinity;
      for (var a2 = 0; a2 < dummies.length; a2++){
        var od = dummies[a2];
        if (!od.alive || od.down) continue;
        var dxd = od.x - model.position.x, dzd = od.z - model.position.z;
        var alongD = dxd * fx + dzd * fz;
        if (alongD < 0.4 || alongD > spec.range) continue;
        var latD = Math.abs(dxd * fz - dzd * fx);
        if (latD <= od.r + spec.width && alongD < bestDAlong){ bestD = od; bestDAlong = alongD; }
      }
      if (bestD && bestDAlong < bestAlong) damageDummy(bestD, spec.dmg, 0);
      else if (best) damageProp(best, spec.dmg);
    } else {
      if (model.position.y > 1.25) continue;
      for (var b = 0; b < destructibles.length; b++){
        var o2 = destructibles[b];
        if (!o2.alive) continue;
        var dx2 = o2.x - model.position.x, dz2 = o2.z - model.position.z;
        var dist = Math.hypot(dx2, dz2);
        if (dist > spec.range + o2.r) continue;
        if (spec.arc >= 0 && dist > 0.001 && (dx2 * fx + dz2 * fz) / dist < spec.arc) continue;
        damageProp(o2, spec.dmg);
      }
      for (var c = 0; c < dummies.length; c++){
        var d0 = dummies[c];
        if (!d0.alive || d0.down) continue;
        var dx3 = d0.x - model.position.x, dz3 = d0.z - model.position.z;
        var dist3 = Math.hypot(dx3, dz3);
        if (dist3 > spec.range + d0.r) continue;
        if (spec.arc >= 0 && dist3 > 0.001 && (dx3 * fx + dz3 * fz) / dist3 < spec.arc) continue;
        damageDummy(d0, spec.dmg, motion.name === 'upper' ? 3.4 : (motion.name === 'chop' ? 2.3 : 0));
      }
    }
  }
}

/* muzzle flash for the Buri Rifle burst: a small additive sprite parked
   at the fish's head (the muzzle) for a few frames per shot */
var flashTex = (function(){
  var c = document.createElement('canvas'); c.width = c.height = 128;
  var g = c.getContext('2d');
  var grad = g.createRadialGradient(64,64,2,64,64,62);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,236,170,0.95)');
  grad.addColorStop(0.6, 'rgba(255,180,80,0.45)');
  grad.addColorStop(1, 'rgba(255,150,50,0)');
  g.fillStyle = grad; g.fillRect(0,0,128,128);
  return new THREE.CanvasTexture(c);
})();
var flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0
}));
flashSprite.visible = false;
flashSprite.scale.set(0.2, 0.2, 1);
scene.add(flashSprite);
var flashK = 0;                 // 1 -> 0 flash strength within a shot window
var _tipV = new THREE.Vector3();

/* ================= flashy action FX + real projectiles =================
   The effects pass, two notches louder than the old muzzle-flash-only
   setup, because a shot you cannot SEE is a shot you cannot dodge:
   - every rifle round draws a thick two-layer tracer beam and sends
     a fat glowing bolt down it, ending in a flash + spark burst;
   - melee swings sweep a bright slash arc; the 必殺 chop adds a
     ground shockwave ring, a light pillar and a camera shake;
   - hits (melee, shot, explosive) burst light at the point of damage
     via spawnImpact(), called from damageDummy / damageProp;
   - the サブ射撃 bazooka and 特殊射撃 javelin are REAL projectiles:
     a big fish-shaped shell that homes on the target captured at
     fire time (switching targets later never bends it) and explodes,
     and a tumbling fish thrown on a parabola whose power and reach
     grow with the charge stage. Both leave glow / smoke trails.
   Weapon numbers for the two new arms are PROVISIONAL (仮置き). */
var SUB_CD = 3.0;                    // bazooka cooldown, seconds (仮)
var SP_CD = 1.2;                     // javelin cooldown, seconds (仮)
var JAV_T1 = 0.55, JAV_T2 = 1.15;    // charge-stage thresholds (仮)
var JAV_DMG = [2, 3, 4];             // javelin damage by stage (仮)
var JAV_SPD = [9.5, 12, 14.5];       // javelin throw speed by stage (仮)
var BAZ_SPEED = 7, BAZ_TURN = 26;    // shell speed / homing strength (仮)
console.info('[weapons] サブ射撃「鰤バズーカ」(威力3・爆風1.9m・CD3秒) と特殊射撃「鰤ジャベリン」(威力2/3/4・チャージ0.55/1.15秒) の数値は仮置きです');

var shakeAmp = 0;
function addShake(a){ if (a > shakeAmp) shakeAmp = a; }
var shotLight = new THREE.PointLight(0xffd9a0, 0, 7);
scene.add(shotLight);
var shotLightK = 0;
var _pv = new THREE.Vector3(), _pv2 = new THREE.Vector3(), _pv3 = new THREE.Vector3();
var _bv = new THREE.Vector3(), _hitV = new THREE.Vector3();
var FX_UP = new THREE.Vector3(0, 1, 0);

function getMuzzleWorld(out){
  if (bones.rightHand){
    bones.rightHand.obj.updateWorldMatrix(true, false);
    out.set(0, fishLen, 0);
    bones.rightHand.obj.localToWorld(out);
    return out;
  }
  out.copy(model.position); out.y += 1.3;
  return out;
}
function facingVec(out){ return out.set(Math.sin(charYaw), 0, Math.cos(charYaw)); }

/* the same frontal hitscan the damage pass uses, but returning the
   point the shot visually lands on (nearest dummy / prop, or the
   end of the range when it hits nothing) */
function shotHitPoint(range, width){
  var fx = Math.sin(charYaw), fz = Math.cos(charYaw);
  var ox = model.position.x, oz = model.position.z;
  var bestAlong = Infinity, bp = null;
  for (var i = 0; i < dummies.length; i++){
    var d = dummies[i];
    if (!d.alive || d.down) continue;
    var dx = d.x - ox, dz = d.z - oz;
    var along = dx * fx + dz * fz;
    if (along < 0.4 || along > range) continue;
    if (Math.abs(dx * fz - dz * fx) <= d.r + width && along < bestAlong){
      bestAlong = along; bp = new THREE.Vector3(d.x, 1.05 + d.airY, d.z);
    }
  }
  for (var j = 0; j < destructibles.length; j++){
    var o = destructibles[j];
    if (!o.alive) continue;
    var dx2 = o.x - ox, dz2 = o.z - oz;
    var along2 = dx2 * fx + dz2 * fz;
    if (along2 < 0.4 || along2 > range) continue;
    if (Math.abs(dx2 * fz - dz2 * fx) <= o.r + width && along2 < bestAlong){
      bestAlong = along2; bp = new THREE.Vector3(o.x, 0.5, o.z);
    }
  }
  if (bp) return { point: bp, hit: true };
  var mz = getMuzzleWorld(new THREE.Vector3());
  mz.x += fx * range; mz.z += fz * range;
  return { point: mz, hit: false };
}

/* ---- particles: one sprite each, pooled by a hard cap ---- */
var fxParts = [];
function spawnPart(pos, vel, life, size, color, opacity, grav, grow, add){
  if (fxParts.length > 240){
    var old = fxParts.shift();
    scene.remove(old.spr); old.spr.material.dispose();
  }
  var m = new THREE.SpriteMaterial({ map: flashTex, color: color, transparent: true, opacity: opacity,
    blending: add === false ? THREE.NormalBlending : THREE.AdditiveBlending, depthWrite: false });
  var spr = new THREE.Sprite(m);
  spr.position.copy(pos);
  spr.scale.set(size, size, 1);
  scene.add(spr);
  fxParts.push({ spr: spr, vx: vel.x, vy: vel.y, vz: vel.z, t: 0, life: life,
    o0: opacity, grav: grav || 0, grow: grow || 0, s0: size });
}

/* ---- impact burst: core flash + spark spray (+ ground ring low) ---- */
var fxBursts = [];
function spawnImpact(pos, s, color){
  var m = new THREE.SpriteMaterial({ map: flashTex, color: color, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false });
  var spr = new THREE.Sprite(m);
  spr.position.copy(pos);
  spr.scale.set(0.3 * s, 0.3 * s, 1);
  scene.add(spr);
  fxBursts.push({ spr: spr, t: 0, life: 0.16, s: s });
  spawnPart(pos, _pv.set(0, 0.3, 0), 0.3, 0.9 * s, color, 0.55, 0, 1.8);
  var n = 8 + Math.floor(5 * s);
  for (var i = 0; i < n; i++){
    var a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
    var sp = 1.3 + Math.random() * 2.4 * Math.min(1.4, s);
    _pv.set(Math.cos(a) * Math.cos(b) * sp, Math.abs(Math.sin(b)) * sp * 0.9 + 0.4, Math.sin(a) * Math.cos(b) * sp);
    spawnPart(pos, _pv, 0.28 + Math.random() * 0.25, 0.10 + Math.random() * 0.10 * s, color, 0.95, -5.5, 0.5);
  }
  if (pos.y < 0.4) spawnGroundRing(_pv.set(pos.x, 0.06, pos.z), 1.7 * s, color);
}

/* ---- ground shockwave ring ---- */
var fxRings = [];
var ringGeoFx = new THREE.RingGeometry(0.86, 1.0, 40);
function spawnGroundRing(pos, maxR, color){
  var m = new THREE.Mesh(ringGeoFx, new THREE.MeshBasicMaterial({ color: color, transparent: true,
    opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  m.position.copy(pos);
  m.scale.set(0.2, 0.2, 0.2);
  scene.add(m);
  fxRings.push({ mesh: m, t: 0, life: 0.42, maxR: maxR });
}

/* ---- tracer beam: fat outer glow + white-hot core ---- */
var fxBeams = [];
var beamGeoFx = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
function spawnBeam(a, b, radius, color){
  _bv.copy(b).sub(a);
  var len = _bv.length();
  if (len < 0.05) return;
  var grp = new THREE.Group();
  var cfgs = [[radius, color, 0.5], [radius * 0.45, 0xffffff, 0.95]];
  for (var i = 0; i < cfgs.length; i++){
    var m = new THREE.Mesh(beamGeoFx, new THREE.MeshBasicMaterial({ color: cfgs[i][1], transparent: true,
      opacity: cfgs[i][2], blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.scale.set(cfgs[i][0], len, cfgs[i][0]);
    grp.add(m);
  }
  grp.position.copy(a).addScaledVector(_bv, 0.5);
  grp.quaternion.setFromUnitVectors(FX_UP, _bv.normalize());
  scene.add(grp);
  fxBeams.push({ grp: grp, t: 0, life: 0.13 });
}

/* ---- traveling bolt: the bright round the eye can track/dodge ---- */
var fxBolts = [];
function spawnBolt(a, b, size, color, burstS){
  var m = new THREE.SpriteMaterial({ map: flashTex, color: color, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false });
  var spr = new THREE.Sprite(m);
  spr.position.copy(a);
  spr.scale.set(size, size, 1);
  scene.add(spr);
  var dist = a.distanceTo(b);
  fxBolts.push({ spr: spr, from: a.clone(), to: b.clone(), t: 0, size: size,
    dur: Math.max(0.03, dist / 48), burstS: burstS, color: color });
}

/* ---- vertical light pillar (chop) ---- */
var fxPillars = [];
function spawnPillar(pos, color){
  var m = new THREE.Mesh(beamGeoFx, new THREE.MeshBasicMaterial({ color: color, transparent: true,
    opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.scale.set(0.34, 2.9, 0.34);
  m.position.set(pos.x, 1.45, pos.z);
  scene.add(m);
  fxPillars.push({ mesh: m, t: 0, life: 0.35 });
}

/* ---- slash arc: a bright crescent swept in front of her ---- */
var fxArcs = [];
var slashGeoFx = new THREE.RingGeometry(0.55, 1.14, 24, 1, -0.6, 2.2);
var slashFullGeoFx = new THREE.RingGeometry(0.55, 1.14, 32, 1, 0, Math.PI * 2);
function spawnSlashArc(idx, s, color, full){
  if (!model) return;
  var m = new THREE.Mesh(full ? slashFullGeoFx : slashGeoFx, new THREE.MeshBasicMaterial({ color: color,
    transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  facingVec(_pv);
  m.position.set(model.position.x + _pv.x * 0.55, model.position.y + 1.08, model.position.z + _pv.z * 0.55);
  m.rotation.y = charYaw;
  scene.add(m);
  fxArcs.push({ mesh: m, t: 0, life: 0.18, dir: (idx % 2 === 0) ? 1 : -1, s: s, full: full });
}

function playBoomSfx(){
  if (!ensureSfx()) return;
  var t0 = sfxCtx.currentTime;
  sfxNoiseHit(t0, 0.4, 700, 0.85);
  var o = sfxCtx.createOscillator(), g = sfxCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t0);
  o.frequency.exponentialRampToValueAtTime(34, t0 + 0.4);
  g.gain.setValueAtTime(1.0, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
  o.connect(g); g.connect(sfxMaster);
  o.start(t0); o.stop(t0 + 0.5);
}

/* ---- fish-shaped shells for the bazooka / javelin ----
   Built from shared geometries; each shell owns its materials
   (flagged _own) so cleanup can dispose exactly those. The fish
   faces +Z, tail at -Z. */
var shellBodyGeo = new THREE.SphereGeometry(0.30, 14, 10);
var shellTailGeo = new THREE.ConeGeometry(0.24, 0.44, 4);
var shellFinGeo = new THREE.ConeGeometry(0.15, 0.26, 4);
function makeFishShell(s, bodyCol, finCol, glowCol){
  var g = new THREE.Group();
  var bm = new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.35, metalness: 0.45,
    emissive: bodyCol, emissiveIntensity: 0.35 });
  bm._own = true;
  var fm = new THREE.MeshStandardMaterial({ color: finCol, roughness: 0.6, metalness: 0.1,
    emissive: finCol, emissiveIntensity: 0.4 });
  fm._own = true;
  var body = new THREE.Mesh(shellBodyGeo, bm);
  body.scale.set(0.85, 0.8, 1.7);
  g.add(body);
  var tail = new THREE.Mesh(shellTailGeo, fm);
  tail.position.set(0, 0, -0.62); tail.scale.set(0.18, 1, 1); tail.rotation.x = -Math.PI / 2;
  g.add(tail);
  var dorsal = new THREE.Mesh(shellFinGeo, fm);
  dorsal.position.set(0, 0.28, -0.08); dorsal.scale.set(0.18, 1, 1);
  g.add(dorsal);
  var gm = new THREE.SpriteMaterial({ map: flashTex, color: glowCol, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false });
  gm._own = true;
  var glow = new THREE.Sprite(gm);
  glow.scale.set(1.5, 1.5, 1);
  g.add(glow);
  g.scale.setScalar(s);
  return g;
}

var projectiles = [];
function cleanupProj(p){
  scene.remove(p.mesh);
  p.mesh.traverse(function(n){ if (n.material && n.material._own) n.material.dispose(); });
}

/* サブ射撃・鰤バズーカ: a slow, fat fish shell that homes on the
   target locked at FIRE time. The target reference is captured in
   spawnBazookaProj and never re-read from the lock-on state, so
   switching targets mid-flight does not bend the shell. */
function spawnBazookaProj(){
  if (!model) return;
  var from = getMuzzleWorld(new THREE.Vector3());
  var tgt = (typeof lockTarget !== 'undefined' && lockTarget && lockAlive(lockTarget)) ? lockTarget : null;
  var vel;
  if (tgt){
    vel = new THREE.Vector3(tgt.x - from.x, (1.05 + tgt.airY) - from.y, tgt.z - from.z).normalize().multiplyScalar(BAZ_SPEED);
  } else {
    facingVec(_pv);
    vel = _pv.clone().multiplyScalar(BAZ_SPEED);
  }
  var mesh = makeFishShell(1.15, 0x86a8bd, 0xe8c33a, 0xffb066);
  mesh.position.copy(from);
  mesh.lookAt(_pv.copy(from).add(vel));
  scene.add(mesh);
  projectiles.push({ kind: 'bazooka', mesh: mesh, vel: vel, target: tgt,
    tx: tgt ? tgt.x : from.x + vel.x * 4, ty: tgt ? 1.05 + tgt.airY : from.y, tz: tgt ? tgt.z : from.z + vel.z * 4,
    t: 0, life: 4.5, trailT: 0 });
  spawnImpact(from, 0.8, 0xffb066);
  shotLight.position.copy(from); shotLight.color.setHex(0xffb066); shotLightK = 1;
  addShake(0.05);
}
function explodeBazooka(p){
  var pos = p.mesh.position.clone();
  spawnImpact(pos, 2.0, 0xffa03c);
  spawnGroundRing(_pv.set(pos.x, 0.06, pos.z), 3.0, 0xffa03c);
  shotLight.position.copy(pos); shotLight.color.setHex(0xffa03c); shotLightK = 1.5;
  addShake(0.14);
  playBoomSfx();
  var mainD = null, mainDist = 1.9;
  for (var i = 0; i < dummies.length; i++){
    var d = dummies[i];
    if (!d.alive || d.down) continue;
    var dd = Math.hypot(d.x - pos.x, d.z - pos.z);
    if (dd < mainDist){ mainDist = dd; mainD = d; }
  }
  for (var j = 0; j < dummies.length; j++){
    var d2 = dummies[j];
    if (!d2.alive || d2.down || d2 === mainD) continue;
    if (Math.hypot(d2.x - pos.x, d2.z - pos.z) < 1.9) damageDummy(d2, 1, 0);
  }
  if (mainD) damageDummy(mainD, 3, 4.4);   // direct hit: launched
  for (var q = 0; q < destructibles.length; q++){
    var o = destructibles[q];
    if (!o.alive) continue;
    if (Math.hypot(o.x - pos.x, o.z - pos.z) < 1.9) damageProp(o, 2);
  }
}

/* 特殊射撃・鰤ジャベリン: the fish itself, thrown on a parabola.
   Charge stage (set by fireJavelin) drives speed and damage. */
function spawnJavelinProj(){
  if (!model) return;
  var from = getMuzzleWorld(new THREE.Vector3());
  from.y += 0.12;
  var stage = javelinStage || 1;
  var spd = JAV_SPD[stage - 1];
  var vel;
  if (typeof lockTarget !== 'undefined' && lockTarget && lockAlive(lockTarget)){
    vel = new THREE.Vector3(lockTarget.x - from.x, 0, lockTarget.z - from.z);
    if (vel.lengthSq() < 1e-4) facingVec(vel);
    vel.normalize().multiplyScalar(spd);
  } else {
    facingVec(_pv);
    vel = _pv.clone().multiplyScalar(spd);
  }
  vel.y = spd * 0.42;
  var mesh = makeFishShell(0.95, 0xbfd9e2, 0xe8c33a, 0x9fe8ff);
  mesh.position.copy(from);
  scene.add(mesh);
  projectiles.push({ kind: 'javelin', mesh: mesh, vel: vel, stage: stage,
    t: 0, life: 3.2, spin: 0, trailT: 0 });
  shotLight.position.copy(from); shotLight.color.setHex(0x9fe8ff); shotLightK = 0.7;
}

/* per-frame FX update: beams, bolts, bursts, rings, pillars, arcs,
   particles, projectiles, lights and shake decay */
function updateFX(dt){
  var i, k;
  for (i = fxBeams.length - 1; i >= 0; i--){
    var bm2 = fxBeams[i]; bm2.t += dt;
    k = 1 - bm2.t / bm2.life;
    if (k <= 0){
      bm2.grp.children.forEach(function(c){ c.material.dispose(); });
      scene.remove(bm2.grp); fxBeams.splice(i, 1);
    } else bm2.grp.children.forEach(function(c, ci){ c.material.opacity = (ci === 0 ? 0.5 : 0.95) * k; });
  }
  for (i = fxBolts.length - 1; i >= 0; i--){
    var bo = fxBolts[i]; bo.t += dt;
    k = bo.t / bo.dur;
    if (k >= 1){
      spawnImpact(bo.to, bo.burstS, bo.color);
      scene.remove(bo.spr); bo.spr.material.dispose(); fxBolts.splice(i, 1);
    } else {
      bo.spr.position.lerpVectors(bo.from, bo.to, k);
      var bs = bo.size * (0.8 + 0.4 * Math.sin(k * Math.PI));
      bo.spr.scale.set(bs, bs, 1);
      bo.spr.material.opacity = 0.85 + 0.15 * Math.sin(k * Math.PI);
    }
  }
  for (i = fxBursts.length - 1; i >= 0; i--){
    var bu = fxBursts[i]; bu.t += dt;
    k = bu.t / bu.life;
    if (k >= 1){ scene.remove(bu.spr); bu.spr.material.dispose(); fxBursts.splice(i, 1); }
    else {
      var sc = (0.3 + 1.3 * k) * bu.s;
      bu.spr.scale.set(sc, sc, 1);
      bu.spr.material.opacity = 1 - k;
    }
  }
  for (i = fxRings.length - 1; i >= 0; i--){
    var rg = fxRings[i]; rg.t += dt;
    k = rg.t / rg.life;
    if (k >= 1){ scene.remove(rg.mesh); rg.mesh.material.dispose(); fxRings.splice(i, 1); }
    else {
      var rs = 0.2 + (rg.maxR - 0.2) * (1 - Math.pow(1 - k, 2));
      rg.mesh.scale.set(rs, rs, rs);
      rg.mesh.material.opacity = 0.85 * (1 - k);
    }
  }
  for (i = fxPillars.length - 1; i >= 0; i--){
    var pl = fxPillars[i]; pl.t += dt;
    k = pl.t / pl.life;
    if (k >= 1){ scene.remove(pl.mesh); pl.mesh.material.dispose(); fxPillars.splice(i, 1); }
    else pl.mesh.material.opacity = 0.5 * (1 - k);
  }
  for (i = fxArcs.length - 1; i >= 0; i--){
    var ar = fxArcs[i]; ar.t += dt;
    k = ar.t / ar.life;
    if (k >= 1){ scene.remove(ar.mesh); ar.mesh.material.dispose(); fxArcs.splice(i, 1); }
    else {
      ar.mesh.rotation.z = ar.full ? k * 5.5 : ar.dir * (-0.6 + 1.2 * k);
      var as = ar.s * (0.85 + 0.3 * k);
      ar.mesh.scale.set(as, as, as);
      ar.mesh.material.opacity = 0.85 * (1 - k);
    }
  }
  for (i = fxParts.length - 1; i >= 0; i--){
    var pa = fxParts[i]; pa.t += dt;
    k = pa.t / pa.life;
    if (k >= 1){ scene.remove(pa.spr); pa.spr.material.dispose(); fxParts.splice(i, 1); continue; }
    pa.vy += (pa.grav || 0) * dt;
    pa.spr.position.x += pa.vx * dt;
    pa.spr.position.y += pa.vy * dt;
    pa.spr.position.z += pa.vz * dt;
    var ps = pa.s0 * (1 + pa.grow * k);
    pa.spr.scale.set(ps, ps, 1);
    pa.spr.material.opacity = pa.o0 * (1 - k);
  }
  for (i = projectiles.length - 1; i >= 0; i--){
    var p = projectiles[i];
    p.t += dt;
    var pos = p.mesh.position;
    var dead = false, hitD = null, hitO = null;
    if (p.kind === 'bazooka'){
      if (p.target && lockAlive(p.target)){ p.tx = p.target.x; p.ty = 1.05 + p.target.airY; p.tz = p.target.z; }
      _pv.set(p.tx, p.ty, p.tz);
      var distT = _pv.distanceTo(pos);
      if (distT < 0.55){ explodeBazooka(p); dead = true; }
      else {
        _pv.sub(pos).normalize().multiplyScalar(BAZ_SPEED);
        _pv2.copy(_pv).sub(p.vel);
        var maxDv = BAZ_TURN * dt;
        if (_pv2.length() > maxDv) _pv2.setLength(maxDv);
        p.vel.add(_pv2);
        pos.addScaledVector(p.vel, dt);
        p.mesh.lookAt(_pv.copy(pos).add(p.vel));
      }
      p.trailT -= dt;
      if (!dead && p.trailT <= 0){
        p.trailT = 0.03;
        spawnPart(pos, _pv.set(0, 0.25, 0), 0.5, 0.4, 0x8a8f9a, 0.32, -0.3, 1.9, false);
        spawnPart(pos, _pv.set(0, 0, 0), 0.3, 0.55, 0xffb066, 0.6, 0, 1.2);
      }
    } else { /* javelin */
      p.vel.y -= 8.6 * dt;
      pos.addScaledVector(p.vel, dt);
      p.spin += dt * 11;
      p.mesh.lookAt(_pv.copy(pos).add(p.vel));
      p.mesh.rotateX(p.spin);
      p.trailT -= dt;
      if (p.trailT <= 0){
        p.trailT = 0.045;
        spawnPart(pos, _pv.set(0, 0, 0), 0.32, 0.42, 0x9fe8ff, 0.55, 0, 1.3);
      }
    }
    if (!dead){
      for (var di = 0; di < dummies.length; di++){
        var dd2 = dummies[di];
        if (!dd2.alive || dd2.down) continue;
        if (pos.distanceTo(_pv.set(dd2.x, 1.0 + dd2.airY, dd2.z)) < 0.95){ hitD = dd2; break; }
      }
      if (!hitD){
        for (var oi = 0; oi < destructibles.length; oi++){
          var oo = destructibles[oi];
          if (!oo.alive) continue;
          if (Math.hypot(oo.x - pos.x, oo.z - pos.z) < oo.r + 0.35 && pos.y < 1.15){ hitO = oo; break; }
        }
      }
      if (p.kind === 'bazooka'){
        if (hitD || hitO || pos.y <= 0.15){ explodeBazooka(p); dead = true; }
      } else {
        if (hitD){
          damageDummy(hitD, JAV_DMG[p.stage - 1], p.stage >= 3 ? 3.2 : (p.stage === 2 ? 1.4 : 0));
          spawnImpact(pos, 0.8 + 0.3 * p.stage, 0x9fe8ff);
          addShake(0.03 + 0.02 * p.stage);
          dead = true;
        } else if (hitO){
          damageProp(hitO, p.stage >= 2 ? 2 : 1);
          spawnImpact(pos, 0.8 + 0.2 * p.stage, 0x9fe8ff);
          dead = true;
        } else if (pos.y <= 0.1){
          spawnImpact(_pv.set(pos.x, 0.15, pos.z), 0.7, 0x9fe8ff);
          dead = true;
        }
      }
      if (!dead && p.t > p.life){
        if (p.kind === 'bazooka') explodeBazooka(p);
        else spawnImpact(pos, 0.6, 0x9fe8ff);
        dead = true;
      }
    }
    if (dead){ cleanupProj(p); projectiles.splice(i, 1); }
  }
  shotLightK *= Math.exp(-9 * dt);
  shotLight.intensity = 2.8 * shotLightK;
  if (shakeAmp > 0) shakeAmp *= Math.exp(-7 * dt);
}

/* shot / swing event scheduler: fires the visual side of each
   attack on the same timings the hit detection uses */
var FX_SHOT_TIMES = { shot1: [0.30], burst: BURST_SHOTS, airshot: [0.62], chargeshot: [0.85], bazooka: [0.85] };
var FX_SWING_TIMES = { combo: [0.42, 1.0, 1.52], upper: [0.68], chop: [1.55], spin: [0.55], bat: [0.55], thrust: [0.5], airslash: [0.52] };
var fxFiredStart = null, fxFired = {};
var javGlowStage = 1;
function onShotEvent(name, idx){
  if (!model) return;
  if (name === 'bazooka'){ spawnBazookaProj(); return; }
  var spec = SHOT_SPECS[name];
  if (!spec) return;
  var hp = shotHitPoint(spec.range, spec.width);
  var big = (name === 'chargeshot');
  var from = getMuzzleWorld(new THREE.Vector3());
  spawnBeam(from, hp.point, big ? 0.085 : 0.052, big ? 0x9fd8ff : 0xffcf7d);
  spawnBolt(from, hp.point, big ? 0.55 : 0.36, big ? 0x9fd8ff : 0xffd9a0, big ? 1.2 : ((name === 'burst' && idx === 2) ? 0.85 : 0.62));
  shotLight.position.copy(from); shotLight.color.setHex(big ? 0x9fd8ff : 0xffd9a0); shotLightK = 1;
  addShake(big ? 0.06 : 0.018);
}
function onSwingEvent(name, idx){
  if (!model) return;
  var big = (name === 'chop');
  spawnSlashArc(idx, big ? 1.5 : 1.0, (name === 'upper' || big) ? 0xffc84d : 0xbfefff, name === 'spin');
  if (big){
    facingVec(_pv);
    var fp = new THREE.Vector3(model.position.x + _pv.x * 1.7, 0.05, model.position.z + _pv.z * 1.7);
    spawnGroundRing(fp, 2.7, 0xffc84d);
    spawnPillar(fp, 0xffc84d);
    addShake(0.16);
  }
}
function updateActionFX(t, dt){
  if (motion && !motionFading){
    if (fxFiredStart !== motion.start){ fxFiredStart = motion.start; fxFired = {}; }
    var el = t - motion.start;
    var st = FX_SHOT_TIMES[motion.name];
    if (st) for (var i = 0; i < st.length; i++){
      var key = 's' + i;
      if (el >= st[i] && !fxFired[key]){ fxFired[key] = true; onShotEvent(motion.name, i); }
    }
    var sw = FX_SWING_TIMES[motion.name];
    if (sw) for (var j = 0; j < sw.length; j++){
      var key2 = 'w' + j;
      if (el >= sw[j] && !fxFired[key2]){ fxFired[key2] = true; onSwingEvent(motion.name, j); }
    }
    if (motion.name === 'javelin' && el >= 0.45 && !fxFired.thr){
      fxFired.thr = true;
      spawnJavelinProj();
    }
    /* bazooka aim glow while the launcher pose settles (0.25-0.85s) */
    if (motion.name === 'bazooka' && bones.rightHand && el > 0.25 && el < 0.85){
      bones.rightHand.obj.updateWorldMatrix(true, false);
      _tipV.set(0, fishLen, 0);
      bones.rightHand.obj.localToWorld(_tipV);
      flashSprite.position.copy(_tipV);
      flashSprite.material.color.setHex(0xffb066);
      var gk = (el - 0.25) / 0.6;
      var gs = 0.10 + 0.17 * gk;
      flashSprite.scale.set(gs, gs, 1);
      flashSprite.material.opacity = 0.2 + 0.45 * gk;
      flashSprite.visible = true;
    }
    /* boost dash: speed streaks streaming off her back */
    if (motion.name === 'boostdash' && model){
      facingVec(_pv);
      spawnPart(_pv2.set(model.position.x - _pv.x * 0.3 + (Math.random() - 0.5) * 0.4,
                         model.position.y + 0.9 + (Math.random() - 0.5) * 0.5,
                         model.position.z - _pv.z * 0.3 + (Math.random() - 0.5) * 0.4),
                _pv3.set(-_pv.x * 1.6, 0.1, -_pv.z * 1.6), 0.3, 0.3, 0x9fd8ff, 0.5, 0, 1.4);
    }
  }
  /* CS charge glow: while the shot button is held toward the burst
     threshold, the muzzle gathers light so the charge reads */
  if (bones.rightHand && kHeld && !kHeld.used){
    var hf = Math.min(1, (t - kHeld.t) / 0.5);
    bones.rightHand.obj.updateWorldMatrix(true, false);
    _tipV.set(0, fishLen, 0);
    bones.rightHand.obj.localToWorld(_tipV);
    flashSprite.position.copy(_tipV);
    flashSprite.material.color.setHex(0xffc37a);
    var ks = 0.14 + 0.30 * hf + 0.02 * Math.sin(t * 40) * hf;
    flashSprite.scale.set(ks, ks, 1);
    flashSprite.material.opacity = 0.25 + 0.65 * hf;
    flashSprite.visible = true;
  }
  /* javelin charge glow: cyan, stepping up with the charge stage */
  if (bones.rightHand && javHeld){
    var hold = t - javHeld.t;
    var stg = hold >= JAV_T2 ? 3 : (hold >= JAV_T1 ? 2 : 1);
    if (stg !== javGlowStage){ javGlowStage = stg; if (stg > 1) playLockSfx(); }
    bones.rightHand.obj.updateWorldMatrix(true, false);
    _tipV.set(0, fishLen, 0);
    bones.rightHand.obj.localToWorld(_tipV);
    flashSprite.position.copy(_tipV);
    flashSprite.material.color.setHex(0x9fe8ff);
    var js = 0.15 + 0.13 * stg + 0.02 * Math.sin(t * 34);
    flashSprite.scale.set(js, js, 1);
    flashSprite.material.opacity = 0.35 + 0.18 * stg;
    flashSprite.visible = true;
  } else javGlowStage = 1;
}

/* golden aura for the awakening (super mode): a warm point light plus
   a soft additive glow sprite behind her, both driven from animate()
   on the awaken motion's schedule */
var auraLight = new THREE.PointLight(0xffc84d, 0, 4.5);
auraLight.position.set(0, 1.15, 0.55);
scene.add(auraLight);
var auraSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: flashTex, color: 0xffcf5e, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0
}));
auraSprite.visible = false;
auraSprite.position.set(0, 1.02, 0);
auraSprite.scale.set(1.7, 1.7, 1);
scene.add(auraSprite);
var fishLen = 1.0;              // hand -> fish head distance (measured per model at load)
/* shot schedule of the 3-round burst, shared by the recoil in
   applyMotion() and the flash update in animate() */
var BURST_SHOTS = [0.55, 0.66, 0.77];
var BURST_AMPS = [0.7, 0.7, 1.0];

/* ================= sound effects (synthesized, no audio files) =================
   A tiny WebAudio synth: a low thump + noise smack for melee hits, a
   descending zap for rifle shots, a crunch for breaking props and a
   slide-whistle-ish fall for a downed dummy. The context is created
   lazily on the first pointer / key gesture (autoplay policy), and
   every play call is a no-op until then. */
var sfxCtx = null, sfxMaster = null, shotSndKey = '';
function ensureSfx(){
  if (sfxCtx){
    if (sfxCtx.state === 'suspended'){
      /* resume() returns a promise: an autoplay-policy rejection
         must be caught here, or it surfaces as an unhandled
         rejection in the global handler */
      try {
        var rp = sfxCtx.resume();
        if (rp && rp.catch) rp.catch(function(){});
      } catch(e){ /* audio stays suspended until the next gesture */ }
    }
    return sfxCtx;
  }
  try {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    sfxCtx = new AC();
    sfxMaster = sfxCtx.createGain();
    sfxMaster.gain.value = 0.45;
    sfxMaster.connect(sfxCtx.destination);
  } catch(e){ sfxCtx = null; }
  return sfxCtx;
}
window.addEventListener('pointerdown', ensureSfx);
window.addEventListener('keydown', ensureSfx);
function sfxNoiseSrc(){
  var len = Math.floor(sfxCtx.sampleRate * 0.5);
  var buf = sfxCtx.createBuffer(1, len, sfxCtx.sampleRate);
  var d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  var src = sfxCtx.createBufferSource(); src.buffer = buf; return src;
}
function sfxNoiseHit(t0, dur, freq, gain, type){
  var src = sfxNoiseSrc();
  var f = sfxCtx.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq;
  var g = sfxCtx.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(sfxMaster);
  src.start(t0); src.stop(t0 + dur + 0.02);
}
function playHitSfx(big){
  if (!ensureSfx()) return;
  var t0 = sfxCtx.currentTime;
  var o = sfxCtx.createOscillator(), g = sfxCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(big ? 150 : 195, t0);
  o.frequency.exponentialRampToValueAtTime(46, t0 + 0.12);
  g.gain.setValueAtTime(big ? 0.95 : 0.6, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + (big ? 0.24 : 0.15));
  o.connect(g); g.connect(sfxMaster);
  o.start(t0); o.stop(t0 + 0.26);
  sfxNoiseHit(t0, 0.06, 1100, big ? 0.4 : 0.3);
}
function playShotSfx(big){
  if (!ensureSfx()) return;
  var t0 = sfxCtx.currentTime;
  var dur = big ? 0.3 : 0.13;
  var o = sfxCtx.createOscillator(), g = sfxCtx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(big ? 640 : 920, t0);
  o.frequency.exponentialRampToValueAtTime(big ? 90 : 170, t0 + dur);
  g.gain.setValueAtTime(big ? 0.5 : 0.32, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(sfxMaster);
  o.start(t0); o.stop(t0 + dur + 0.02);
  sfxNoiseHit(t0, big ? 0.18 : 0.07, 2600, big ? 0.4 : 0.22, 'highpass');
  if (big) playHitSfx(true);
}
function playBreakSfx(){
  if (!ensureSfx()) return;
  var t0 = sfxCtx.currentTime;
  var src = sfxNoiseSrc();
  var f = sfxCtx.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(1500, t0);
  f.frequency.exponentialRampToValueAtTime(180, t0 + 0.3);
  var g = sfxCtx.createGain();
  g.gain.setValueAtTime(0.55, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.32);
  src.connect(f); f.connect(g); g.connect(sfxMaster);
  src.start(t0); src.stop(t0 + 0.35);
  playHitSfx(true);
}
function playDownSfx(){
  if (!ensureSfx()) return;
  var t0 = sfxCtx.currentTime;
  var o = sfxCtx.createOscillator(), g = sfxCtx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(520, t0);
  o.frequency.exponentialRampToValueAtTime(110, t0 + 0.38);
  g.gain.setValueAtTime(0.4, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);
  o.connect(g); g.connect(sfxMaster);
  o.start(t0); o.stop(t0 + 0.45);
  playHitSfx(true);
}
function playLockSfx(){
  if (!ensureSfx()) return;
  var t0 = sfxCtx.currentTime;
  var o = sfxCtx.createOscillator(), g = sfxCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(880, t0);
  o.frequency.setValueAtTime(1318, t0 + 0.055);
  g.gain.setValueAtTime(0.22, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.13);
  o.connect(g); g.connect(sfxMaster);
  o.start(t0); o.stop(t0 + 0.15);
}

/* ================= model state ================= */
var model = null;          // THREE.Group (gltf scene)
var bones = {};            // humanoid name -> {obj, rest:Quaternion, restPos:Vector3}
var swayBones = [];        // {obj, rest, phase, amp}
var exprBinds = {};        // expr name -> [{mesh, index, weight}]
var exprValues = {};       // expr name -> 0..1 (user)
var exprNames = [];
var modelInfo = { name:'', version:'', tris:0, meshes:0, nodeCount:0 };
var hipsRestY = 0;

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

/* All expressions are driven purely from the model's own VRM expression
   data (preset + custom); the viewer synthesizes none of its own. */
/* half-lidded eye states replace each other instead of stacking */
var EYE_STATE_EXPRS = ['sleepy','zito','satori'];

/* joints controlled by sliders: arm angle: + = down along body, - = raised */
var joints = {
  headYaw:   { label:'頭・左右', min:-60, max:60,  val:0 },
  headPitch: { label:'頭・上下', min:-25, max:40,  val:0 },
  lArm:      { label:'左腕 上/下', min:-100, max:105, val:70 },
  rArm:      { label:'右腕 上/下', min:-100, max:105, val:70 },
  lElbow:    { label:'左ひじ', min:0, max:145, val:8 },
  rElbow:    { label:'右ひじ', min:0, max:145, val:8 },
  spine:     { label:'上体 前後', min:-15, max:38, val:0 }
};
var jointCur = {}; // lerped current values
Object.keys(joints).forEach(function(k){ jointCur[k] = joints[k].val; });

var poseName = 'stand';
var POSES = {
  stand:   { headYaw:0, headPitch:0, lArm:70,  rArm:70,   lElbow:8,  rElbow:8,  spine:0 },
  wave:    { headYaw:0, headPitch:0, lArm:70,  rArm:-98, lElbow:8,  rElbow:20, spine:0 },
  banzai:  { headYaw:0, headPitch:-6, lArm:-78, rArm:-78, lElbow:6, rElbow:6, spine:-4 },
  onehand: { headYaw:-8, headPitch:0, lArm:70, rArm:-95, lElbow:8,  rElbow:10, spine:0 },
  /* Sword poses for the BuriSword (skinned 100% to the right hand bone in
     v4.4, pointing along the hand's local +Y, head away from the hand).
     The arm angles below were solved numerically against the model's own
     bone data so the fish lands where each pose wants it. */
  katsugu: { headYaw:0, headPitch:-2, lArm:72, rArm:82, lElbow:12, rElbow:145, spine:-2,
             extra:{ rArmZ:56, rHandX:24, rHandZ:39 } },
  kamae:   { headYaw:8, headPitch:2, lArm:48, rArm:48, lElbow:28, rElbow:35, spine:4,
             extra:{ rArmZ:27, lArmZ:-18, hipsY:-14, chestY:-6, rHandX:-19, rHandZ:-2 } },
  treize:  { headYaw:0, headPitch:5, lArm:74, rArm:68, lElbow:10, rElbow:14, spine:-2,
             extra:{ rArmZ:-3 } },
  /* 仁王立ち: legs spread to about twice shoulder width, knees soft,
     weight dropped; the fish stands vertically on its head in front of
     her center (tip at ground level, solved against the bone data) and
     both hands rest on the tail end, elbows out — a Niō statue's glare,
     chin up. Uses the leg / hips-drop extra channels below. */
  nio:     { headYaw:0, headPitch:-7, lArm:100, rArm:95, lElbow:34, rElbow:26, spine:-3,
             extra:{ rArmZ:46, lArmZ:-47, rHandX:11, rHandZ:-75,
                     lLegZ:-12, rLegZ:12, lKnee:10, rKnee:10, lFootX:-5, rFootX:-5, hipsDrop:0.02 } },
  windup:  { headYaw:0, headPitch:-6, lArm:80, rArm:-85, lElbow:10, rElbow:6, spine:-8,
             extra:{ rArmZ:-36, hipsY:8, rHandX:7, rHandZ:-7 } }
};

/* Sword poses need channels the sliders don't have (upper-arm swing,
   torso twist, hand tilt). They live in each pose's `extra` map and are
   lerped exactly like the slider joints. rArmZ/lArmZ: swing forward
   (+ on the right, - on the left); hipsY/chestY: torso twist;
   rHand*: right-hand tilt — tilting the hand aims the fish. */
var POSE_EXTRA_CHANNELS = ['rArmZ','lArmZ','hipsY','chestY','rHandX','rHandY','rHandZ',
                           'lLegZ','rLegZ','lKnee','rKnee','lFootX','rFootX','hipsDrop'];
var poseExtraTarget = {}, poseExtraCur = {};
POSE_EXTRA_CHANNELS.forEach(function(k){ poseExtraTarget[k] = 0; poseExtraCur[k] = 0; });
function setPoseExtra(extra){
  POSE_EXTRA_CHANNELS.forEach(function(k){ poseExtraTarget[k] = (extra && extra[k]) || 0; });
}

var toggles = { blink:true, breath:true, sway:true, look:false, spin:false, wire:false };
var bowAnim = -1;   // 0..1 progress, -1 idle
var blinkAnim = -1; // one-shot blink

/* procedural motions (viewer-side bone animation; the model file is untouched) */
var motion = null;        // { name:'walk'|'jump'|'wave'|'idle', start:seconds }
var motionW = 0;          // blend weight 0..1 toward the motion pose
var motionFading = false; // true while blending back to the pose preset

/* ---- emotion-linked tail wag ----
   Layered additively on top of the sway pass each frame (see animate()).
   Axes measured from this model's bone data: on both Tails.001 and
   Tails.002, local Z swings the tip sideways (left/right seen from
   behind) and local X pitches it up/down (+X = up and back, -X = droop).
   freq in Hz, amp/pitch in degrees. */
var tailRoot = null;      // Tails.001 Object3D
var tailMid = null;       // Tails.002 Object3D
var TAIL_MODES = {
  normal:    { freq:0.6, amp:6,  pitch:0,   share:0.5,  expr:null },
  happy:     { freq:2.2, amp:22, pitch:6,   share:0.5,  expr:'happy' },
  sleepy:    { freq:0.5, amp:1.5, pitch:-38, share:0.15, expr:'sleepy' },
  surprised: { freq:1.5, amp:3,  pitch:55,  share:0.85, expr:'surprised' }
};
var tailMode = 'normal';
var tailExpr = null;      // expression currently forced by the tail mode
var wagPhase = 0;                       // accumulated so freq changes stay smooth
var wagFreqCur = TAIL_MODES.normal.freq;
var wagAmpCur = TAIL_MODES.normal.amp;
var wagPitchCur = 0;
var wagShareCur = TAIL_MODES.normal.share; // how much of the pitch Tails.002 takes
var lastT = 0;            // clock.elapsedTime of the latest rendered frame
var nextAutoBlink = 2.2, blinkPhase = -1;

var pointer = { x:0, y:0, active:false };
renderer.domElement.addEventListener('pointermove', function(e){
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  pointer.active = true;
});

/* ================= GLB / VRM parsing ================= */
function parseGlbJson(buf){
  var dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546C67) return null; // 'glTF'
  var len = dv.getUint32(8, true);
  var off = 12, json = null;
  while (off < len){
    var clen = dv.getUint32(off, true);
    var ctype = dv.getUint32(off + 4, true);
    if (ctype === 0x4E4F534A){ // JSON
      var bytes = new Uint8Array(buf, off + 8, clen);
      json = JSON.parse(new TextDecoder('utf-8').decode(bytes));
      break;
    }
    off += 8 + clen;
  }
  return json;
}

function disposeModel(){
  if (!model) return;
  scene.remove(model);
  model.traverse(function(o){
    if (o.geometry) o.geometry.dispose();
    if (o.material){
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){
        Object.keys(m).forEach(function(k){ if (m[k] && m[k].isTexture) m[k].dispose(); });
        m.dispose();
      });
    }
  });
  model = null; bones = {}; swayBones = []; exprBinds = {}; exprValues = {}; exprNames = [];
  tailRoot = null; tailMid = null;
}

/* The shipped model has a handful of tail-tip vertices bound to the
   static 'neutral_bone' instead of Tails.002 (checked in the model's
   skin data: 10 of the 270 tip vertices). At rest they coincide with
   the tip, but any larger tail rotation leaves them behind and the
   triangles between stretch into a thin spike. Rebind those stray
   vertices — only the ones sitting inside the Tails.002 vertex cloud —
   to Tails.002 so the tip follows the wag. The model file is untouched;
   this patches the loaded geometry in memory. */
function patchTailTipSkin(){
  if (!model || !tailMid) return;
  model.traverse(function(o){
    if (!o.isSkinnedMesh || !o.skeleton || !o.geometry) return;
    var bones = o.skeleton.bones;
    var midSlot = -1, neutralSlot = -1, i;
    for (i = 0; i < bones.length; i++){
      if (bones[i] === tailMid || bones[i].name === 'Tails.002' || bones[i].name === 'Tails002') midSlot = i;
      if (bones[i].name === 'neutral_bone') neutralSlot = i;
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

/* Measure how far the Buri Sword's head sits from the right-hand bone
   along the hand's local +Y (the way the fish is rigged), so the muzzle
   flash can be placed on the tip. Falls back to 1.0m. */
function measureFishLen(){
  fishLen = 1.0;
  if (!model || !bones.rightHand) return;
  var sword = null;
  model.traverse(function(o){ if (o.isMesh && /buri/i.test(o.name || '')) sword = o; });
  if (!sword || !sword.geometry || !sword.geometry.attributes.position) return;
  model.updateMatrixWorld(true);
  var m = new THREE.Matrix4().copy(bones.rightHand.obj.matrixWorld).invert()
    .multiply(sword.matrixWorld);
  var pos = sword.geometry.attributes.position;
  var v = new THREE.Vector3();
  var maxY = 0;
  for (var i = 0; i < pos.count; i++){
    v.fromBufferAttribute(pos, i).applyMatrix4(m);
    if (v.y > maxY) maxY = v.y;
  }
  if (maxY > 0.3 && maxY < 1.6) fishLen = maxY;
}

/* Phone GPUs run out of texture memory on this model: the body and
   hair textures are 4096x4096 (about 85MB each once decoded, with
   mipmaps), which is the likely cause of the flat, texture-less look
   and the jank on phones. Cap every texture at 2048px (1024px on
   touch devices) by redrawing it smaller in memory at load — the
   model file itself is untouched, and the difference is invisible
   at phone viewing distances, while texture memory drops to about
   a quarter. */
var TEX_CAP = COARSE_POINTER ? 1024 : 2048;
function capTextureSizes(){
  if (!model) return;
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
  model.traverse(function(o){
    if (!o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){
      Object.keys(m).forEach(function(k){
        var t = m[k];
        if (t && t.isTexture && seen.indexOf(t) < 0){ seen.push(t); capOne(t); }
      });
    });
  });
}

function setupModel(gltf, glbJson){
  model = gltf.scene;
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  charYaw = 0;
  scene.add(model);
  model.traverse(function(o){
    if (o.isMesh){ o.castShadow = true; o.frustumCulled = false; }
  });

  var vrm = (glbJson && glbJson.extensions && glbJson.extensions.VRMC_vrm) || null;
  var nodes = (glbJson && glbJson.nodes) || [];
  /* GLTFLoader sanitizes node names (spaces -> _, dots removed); mirror that. */
  function sanitize(nm){ return nm.replace(/\s+/g, '_').replace(/\./g, ''); }
  var bySanitized = {};
  model.traverse(function(o){ if (o.name) bySanitized[sanitize(o.name)] = o; });
  function findObj(glbName){
    return model.getObjectByName(glbName) || bySanitized[sanitize(glbName)] || null;
  }
  function objByNodeIndex(idx){
    var nm = nodes[idx] && nodes[idx].name;
    return nm ? findObj(nm) : null;
  }

  /* humanoid bones */
  if (vrm && vrm.humanoid && vrm.humanoid.humanBones){
    Object.keys(vrm.humanoid.humanBones).forEach(function(name){
      var idx = vrm.humanoid.humanBones[name].node;
      var obj = objByNodeIndex(idx);
      if (obj) bones[name] = { obj: obj, rest: obj.quaternion.clone(), restPos: obj.position.clone() };
    });
  }
  if (bones.hips) hipsRestY = bones.hips.restPos.y;

  /* sway bones: hair + tail (non-humanoid joints) by node name */
  var swayNames = ['Hair.000','Hair_Front','Hair_L.000','Hair_R.000','HairBack.001','HairBack.002','Ear_L.001','Ear_R.001','Tails.001','Tails.002'];
  swayNames.forEach(function(nm, i){
    var o = findObj(nm);
    if (o) swayBones.push({ obj:o, rest:o.quaternion.clone(), phase:i * 0.9, tail: nm.indexOf('Tail') === 0 });
  });

  /* tail chain for the procedural wag (applied after the sway pass) */
  tailRoot = findObj('Tails.001');
  tailMid = findObj('Tails.002');
  patchTailTipSkin();

  /* expressions */
  if (vrm && vrm.expressions){
    var all = {};
    if (vrm.expressions.preset) Object.keys(vrm.expressions.preset).forEach(function(k){ all[k] = vrm.expressions.preset[k]; });
    if (vrm.expressions.custom) Object.keys(vrm.expressions.custom).forEach(function(k){ all[k] = vrm.expressions.custom[k]; });
    Object.keys(all).forEach(function(name){
      var binds = (all[name].morphTargetBinds || []);
      var resolved = [];
      binds.forEach(function(b){
        var nodeObj = objByNodeIndex(b.node);
        if (!nodeObj) return;
        nodeObj.traverse(function(o){
          if (o.isMesh && o.morphTargetInfluences && b.index < o.morphTargetInfluences.length){
            resolved.push({ mesh:o, index:b.index, weight:(b.weight == null ? 1 : b.weight) });
          }
        });
      });
      if (resolved.length){ exprBinds[name] = resolved; exprValues[name] = 0; }
    });
  }

  exprNames = Object.keys(exprBinds);

  /* stats */
  var tris = 0, meshCount = 0;
  model.traverse(function(o){
    if (o.isMesh){
      meshCount++;
      var g = o.geometry;
      if (g){
        var cnt = g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0);
        tris += cnt / 3;
      }
    }
  });
  modelInfo.tris = Math.round(tris);
  modelInfo.meshes = meshCount;
  modelInfo.nodeCount = nodes.length;
  if (vrm && vrm.meta){ modelInfo.name = vrm.meta.name || ''; modelInfo.version = vrm.meta.version || ''; }

  measureFishLen();
  capTextureSizes();

  /* frame camera to model */
  frameCamera('full');
  buildExprUI();
  setTailMode(tailMode); /* re-apply the linked expression to the new model */
  updateInfoPanel();
  applyWireframe();
}

function loadVrmFromArrayBuffer(buf, label){
  var glbJson = null;
  try { glbJson = parseGlbJson(buf); } catch(e){ /* non-GLB */ }
  var loader = new THREE.GLTFLoader();
  loader.parse(buf, '', function(gltf){
    disposeModel();
    motion = null; motionW = 0; motionFading = false; syncMotionButtons();
    setupModel(gltf, glbJson);
    loadmsg.textContent = (label || 'モデル') + ' を読み込みました';
    loadmsg.className = 'done';
    overlay.classList.add('hide');
    /* start in game mode by default; the viewer / debug panel stays
       tucked away until the ⚙ button (or H key) opens it. The game
       opens on the TITLE screen: PRESS START begins the mission. */
    if (typeof setFreeMode === 'function' && !freeMode) setFreeMode(true);
    if (typeof setPanelOpen === 'function') setPanelOpen(false);
    if (typeof enterTitle === 'function') enterTitle();
    else if (typeof updateGameHud === 'function') updateGameHud();
  }, function(err){
    showError('VRMの解析に失敗しました: ' + (err && err.message ? err.message : err));
    overlay.classList.add('hide');
  });
}

/* The model is ~14.0MB and the serving layer cannot deliver it as a single
   response (the fetch aborts with ERR_FAILED), so download it as a series
   of HTTP Range requests (the server advertises Accept-Ranges: bytes) and
   reassemble the exact same bytes in memory. If a server ignores Range and
   answers 200, its body already is the whole file and is used as-is. */
function fetchModelInChunks(url){
  var CHUNK = 8 * 1024 * 1024;
  function fetchRange(start, end){
    return fetch(url, { headers: { 'Range': 'bytes=' + start + '-' + end } });
  }
  return fetchRange(0, CHUNK - 1).then(function(r){
    if (r.status === 200) return r.arrayBuffer();
    if (r.status !== 206) throw new Error('HTTP ' + r.status);
    var m = /\/(\d+)\s*$/.exec(r.headers.get('Content-Range') || '');
    var total = m ? parseInt(m[1], 10) : 0;
    return r.arrayBuffer().then(function(first){
      if (!total || total <= first.byteLength) return first;
      var parts = [new Uint8Array(first)];
      var received = first.byteLength;
      loadmsg.textContent = 'モデルを読み込んでいます… ' + Math.round(received / total * 100) + '%';
      var chain = Promise.resolve();
      for (var start = received; start < total; start += CHUNK){
        (function(chunkStart){
          chain = chain.then(function(){
            var end = Math.min(chunkStart + CHUNK, total) - 1;
            return fetchRange(chunkStart, end).then(function(rr){
              if (rr.status !== 206) throw new Error('HTTP ' + rr.status);
              return rr.arrayBuffer();
            }).then(function(buf){
              parts.push(new Uint8Array(buf));
              received += buf.byteLength;
              loadmsg.textContent = 'モデルを読み込んでいます… ' + Math.round(received / total * 100) + '%';
            });
          });
        })(start);
      }
      return chain.then(function(){
        var out = new Uint8Array(total);
        var off = 0;
        parts.forEach(function(p){ out.set(p, off); off += p.byteLength; });
        if (off !== total) throw new Error('モデルのダウンロードが不完全です');
        return out.buffer;
      });
    });
  });
}

function loadDefault(){
  fetchModelInChunks('data:application/octet-stream;base64,/*__MODEL_B64__*/')
    .then(function(buf){ loadVrmFromArrayBuffer(buf, 'Shiromi Buri v4.6'); })
    .catch(function(e){ showError('モデルの読み込みに失敗しました: ' + e.message); overlay.classList.add('hide'); });
}

/* ================= UI: expressions ================= */
var exprSlidersEl = document.getElementById('expr-sliders');
function buildExprUI(){
  exprSlidersEl.innerHTML = '';
  var ordered = EXPR_ORDER.filter(function(n){ return exprBinds[n]; });
  exprNames.forEach(function(n){ if (ordered.indexOf(n) < 0) ordered.push(n); });
  ordered.forEach(function(name){
    var row = document.createElement('div'); row.className = 'slider';
    var lab = document.createElement('span'); lab.textContent = EXPR_LABELS[name] || name;
    var input = document.createElement('input');
    input.type = 'range'; input.min = '0'; input.max = '100'; input.value = String(Math.round((exprValues[name]||0)*100));
    input.setAttribute('aria-label', lab.textContent);
    var out = document.createElement('output'); out.textContent = input.value + '%';
    input.addEventListener('input', function(){
      exprValues[name] = input.value / 100;
      out.textContent = input.value + '%';
      syncPresetButtons(); syncExtraButtons();
    });
    row.appendChild(lab); row.appendChild(input); row.appendChild(out);
    exprSlidersEl.appendChild(row);
    input._exprName = name; input._out = out;
  });
}
function refreshExprSliders(){
  exprSlidersEl.querySelectorAll('input[type="range"]').forEach(function(input){
    var v = Math.round((exprValues[input._exprName] || 0) * 100);
    input.value = String(v); input._out.textContent = v + '%';
  });
}
function setExpression(name, value){
  if (!(name in exprValues)) return;
  exprValues[name] = value;
}
function clearExpressions(){
  Object.keys(exprValues).forEach(function(k){ exprValues[k] = 0; });
  refreshExprSliders(); syncPresetButtons(); syncExtraButtons(); syncMouthButtons();
}
function syncPresetButtons(){
  document.querySelectorAll('#expr-presets button').forEach(function(b){
    b.classList.toggle('on', (exprValues[b.dataset.expr] || 0) > 0.5);
  });
}
function syncMouthButtons(){
  document.querySelectorAll('#mouth-row button').forEach(function(b){
    var m = b.dataset.mouth;
    b.classList.toggle('on', m ? (exprValues[m] || 0) > 0.5 : ['aa','ih','ou','ee','oh'].every(function(k){ !(k in exprValues) || exprValues[k] === 0; }));
  });
}
function syncExtraButtons(){
  document.querySelectorAll('#expr-extra button').forEach(function(b){
    b.classList.toggle('on', (exprValues[b.dataset.expr] || 0) > 0.5);
  });
}
document.querySelectorAll('#expr-presets button').forEach(function(b){
  b.addEventListener('click', function(){
    var name = b.dataset.expr;
    var now = (exprValues[name] || 0) > 0.5;
    ['happy','angry','sad','surprised','relaxed'].forEach(function(k){ setExpression(k, 0); });
    if (!now) setExpression(name, 1);
    refreshExprSliders(); syncPresetButtons();
  });
});
document.querySelectorAll('#expr-extra button').forEach(function(b){
  b.addEventListener('click', function(){
    var name = b.dataset.expr;
    if (!(name in exprValues)) return;
    var now = (exprValues[name] || 0) > 0.5;
    if (EYE_STATE_EXPRS.indexOf(name) >= 0){
      EYE_STATE_EXPRS.forEach(function(k){ setExpression(k, 0); });
    }
    setExpression(name, now ? 0 : 1);
    refreshExprSliders(); syncExtraButtons();
  });
});
document.querySelectorAll('#mouth-row button').forEach(function(b){
  b.addEventListener('click', function(){
    ['aa','ih','ou','ee','oh'].forEach(function(k){ setExpression(k, 0); });
    if (b.dataset.mouth) setExpression(b.dataset.mouth, 1);
    refreshExprSliders(); syncMouthButtons();
  });
});
document.getElementById('expr-reset').addEventListener('click', clearExpressions);
document.getElementById('blink-once').addEventListener('click', function(){ blinkAnim = 0; });

/* ================= UI: joints & poses ================= */
var jointSlidersEl = document.getElementById('joint-sliders');
Object.keys(joints).forEach(function(k){
  var j = joints[k];
  var row = document.createElement('div'); row.className = 'slider';
  var lab = document.createElement('span'); lab.textContent = j.label;
  var input = document.createElement('input');
  input.type = 'range'; input.min = String(j.min); input.max = String(j.max); input.value = String(j.val);
  input.setAttribute('aria-label', j.label);
  var out = document.createElement('output'); out.textContent = j.val + '°';
  input.addEventListener('input', function(){
    joints[k].val = Number(input.value);
    out.textContent = input.value + '°';
    stopMotion();
    setPoseExtra(null);
    setPose('custom');
  });
  row.appendChild(lab); row.appendChild(input); row.appendChild(out);
  jointSlidersEl.appendChild(row);
  j._input = input; j._out = out;
});
function refreshJointSliders(){
  Object.keys(joints).forEach(function(k){
    joints[k]._input.value = String(joints[k].val);
    joints[k]._out.textContent = joints[k].val + '°';
  });
}
function setPose(name){
  poseName = name;
  document.querySelectorAll('#pose-row button, #sword-pose-row button').forEach(function(b){
    b.classList.toggle('on', b.dataset.pose === name);
  });
}
function applyPose(name){
  stopMotion();
  var p = POSES[name];
  if (p) Object.keys(p).forEach(function(k){ if (k !== 'extra' && joints[k]) joints[k].val = p[k]; });
  refreshJointSliders();
  setPoseExtra(p && p.extra);
  setPose(name);
}
document.querySelectorAll('#pose-row button, #sword-pose-row button').forEach(function(b){
  b.addEventListener('click', function(){ applyPose(b.dataset.pose); });
});
document.getElementById('bow-once').addEventListener('click', function(){ if (bowAnim < 0) bowAnim = 0; });
document.getElementById('jump-once').addEventListener('click', function(){ startMotion('jump'); });

/* ================= UI: procedural motions ================= */
function startMotion(name){
  motion = { name: name, start: lastT };
  motionFading = false;
  syncMotionButtons();
}
function stopMotion(){
  if (motion && !motionFading){
    motionFading = true;
    syncMotionButtons();
  }
}
function syncMotionButtons(){
  document.querySelectorAll('#motion-row button[data-motion], #sword-motion-row button[data-motion], #vs-motion-row button[data-motion], #vs2-motion-row button[data-motion], #vs3-motion-row button[data-motion], #vs4-motion-row button[data-motion]').forEach(function(b){
    var active = !!motion && !motionFading && motion.name === b.dataset.motion;
    b.classList.toggle('on', active);
  });
}
document.querySelectorAll('#motion-row button[data-motion], #sword-motion-row button[data-motion], #vs-motion-row button[data-motion], #vs2-motion-row button[data-motion], #vs3-motion-row button[data-motion], #vs4-motion-row button[data-motion]').forEach(function(b){
  b.addEventListener('click', function(){ startMotion(b.dataset.motion); });
});
document.getElementById('motion-stop').addEventListener('click', stopMotion);

/* ================= UI: tail modes ================= */
function setTailMode(mode){
  if (!TAIL_MODES[mode]) return;
  tailMode = mode;
  document.querySelectorAll('#tail-row button').forEach(function(b){
    b.classList.toggle('on', b.dataset.tail === mode);
  });
  /* expression link: release the expression the previous mode forced,
     then apply the new mode's (ふつう clears it and sets none) */
  if (tailExpr) setExpression(tailExpr, 0);
  tailExpr = TAIL_MODES[mode].expr;
  if (tailExpr){
    if (tailExpr === 'happy' || tailExpr === 'surprised'){
      ['happy','angry','sad','surprised','relaxed'].forEach(function(k){
        if (k !== tailExpr) setExpression(k, 0);
      });
    }
    if (EYE_STATE_EXPRS.indexOf(tailExpr) >= 0){
      EYE_STATE_EXPRS.forEach(function(k){ if (k !== tailExpr) setExpression(k, 0); });
    }
    setExpression(tailExpr, 1);
  }
  refreshExprSliders(); syncPresetButtons(); syncExtraButtons();
}
document.querySelectorAll('#tail-row button').forEach(function(b){
  b.addEventListener('click', function(){ setTailMode(b.dataset.tail); });
});

/* ================= UI: toggles / bg / camera / file ================= */
function bindToggle(id, keyName, onChange){
  var el = document.getElementById(id);
  el.addEventListener('click', function(){
    toggles[keyName] = !toggles[keyName];
    el.setAttribute('aria-pressed', String(toggles[keyName]));
    if (onChange) onChange(toggles[keyName]);
  });
}
bindToggle('tg-blink', 'blink');
bindToggle('tg-breath', 'breath');
bindToggle('tg-sway', 'sway');
bindToggle('tg-look', 'look');
bindToggle('tg-spin', 'spin', function(on){ controls.autoRotate = on; });
bindToggle('tg-wire', 'wire', function(){ applyWireframe(); });
function applyWireframe(){
  if (!model) return;
  model.traverse(function(o){
    if (o.isMesh && o.material){
      (Array.isArray(o.material) ? o.material : [o.material]).forEach(function(m){ m.wireframe = toggles.wire; });
    }
  });
}
var BG = {
  sky:{ sky:true, fog:true },
  studio:{ color:0x232733, fog:true }, pink:{ color:0xf6c6d3, fog:false },
  mint:{ color:0xbfe6dd, fog:false }, night:{ color:0x0d1020, fog:true },
  white:{ color:0xf4f4f6, fog:false }
};
document.querySelectorAll('#bg-swatches button').forEach(function(b){
  b.addEventListener('click', function(){
    var bg = BG[b.dataset.bg]; if (!bg) return;
    scene.background = bg.sky ? skyTex : new THREE.Color(bg.color);
    scene.fog = bg.fog ? new THREE.Fog(bg.sky ? SKY_FOG_COLOR : bg.color, 26, 95) : null;
    document.querySelectorAll('#bg-swatches button').forEach(function(x){ x.classList.toggle('on', x === b); });
  });
});

var camAnim = null;
function flyTo(pos, tgt){
  camAnim = {
    p0: camera.position.clone(), p1: pos, t0: controls.target.clone(), t1: tgt, t: 0
  };
}
function frameCamera(mode){
  if (!model){ flyTo(new THREE.Vector3(1.15,1.28,2.75), new THREE.Vector3(0,0.86,0)); return; }
  var box = new THREE.Box3().setFromObject(model);
  var size = box.getSize(new THREE.Vector3());
  var h = size.y;
  var cy = box.min.y + h * 0.52;
  var headY = box.max.y - h * 0.08;
  var tanF = Math.tan((camera.fov * Math.PI / 180) / 2);
  function fitDist(halfW){
    return Math.max((h / 2) / tanF, halfW / (tanF * camera.aspect)) * 1.18;
  }
  var halfW = Math.min(size.x / 2, 0.55); /* T-pose arm span would push the camera too far */
  if (mode === 'full')  flyTo(new THREE.Vector3(0.85, cy + 0.12, fitDist(halfW)), new THREE.Vector3(0, cy, 0));
  if (mode === 'face')  flyTo(new THREE.Vector3(0.22, headY, 0.62), new THREE.Vector3(0, headY - 0.03, 0));
  if (mode === 'front') flyTo(new THREE.Vector3(0, cy + 0.05, fitDist(halfW)), new THREE.Vector3(0, cy, 0));
  if (mode === 'side')  flyTo(new THREE.Vector3(fitDist(size.z / 2), cy + 0.05, 0), new THREE.Vector3(0, cy, 0));
  if (mode === 'back')  flyTo(new THREE.Vector3(-0.6, cy + 0.1, -fitDist(halfW)), new THREE.Vector3(0, cy, 0));
}
document.querySelectorAll('#cambar button[data-cam]').forEach(function(b){
  b.addEventListener('click', function(){ frameCamera(b.dataset.cam); });
});

/* fullscreen: on phones the browser chrome eats a big share of the
   small screen, so offer a one-tap fullscreen toggle (and try to
   settle into landscape while it is on) */
var fsBtn = document.getElementById('fsbtn');
function syncFsBtn(){ if (fsBtn) fsBtn.textContent = document.fullscreenElement ? '全画面を終了' : '全画面'; }
if (fsBtn){
  fsBtn.addEventListener('click', function(){
    if (document.fullscreenElement){
      if (document.exitFullscreen){
        try {
          var ep = document.exitFullscreen();
          if (ep && ep.catch) ep.catch(function(){});
        } catch(e){ /* leaving fullscreen is best-effort */ }
      }
      return;
    }
    if (!document.documentElement.requestFullscreen) return;
    try {
      var p = document.documentElement.requestFullscreen();
      if (p && p.catch) p.catch(function(){});
    } catch(e){ /* fullscreen can be denied synchronously too (policy / gesture rules) */ }
    if (COARSE_POINTER && screen.orientation && screen.orientation.lock){
      try {
        var lp = screen.orientation.lock('landscape');
        if (lp && lp.catch) lp.catch(function(){});
      } catch(e){ /* orientation lock is best-effort only */ }
    }
  });
  document.addEventListener('fullscreenchange', syncFsBtn);
}

document.getElementById('shot').addEventListener('click', function(){
  renderer.render(scene, camera);
  var a = document.createElement('a');
  a.href = renderer.domElement.toDataURL('image/png');
  a.download = 'shiromi_buri.png';
  a.click();
});

var fileInput = document.getElementById('file-open');
fileInput.addEventListener('change', function(){
  var f = fileInput.files && fileInput.files[0];
  if (!f) return;
  overlay.classList.remove('hide');
  f.arrayBuffer().then(function(buf){ loadVrmFromArrayBuffer(buf, f.name); })
    .catch(function(e){ showError('ファイルを開けませんでした: ' + (e && e.message ? e.message : e)); overlay.classList.add('hide'); });
  fileInput.value = '';
});
window.addEventListener('dragover', function(e){ e.preventDefault(); document.body.classList.add('dragging'); });
window.addEventListener('dragleave', function(e){ if (!e.relatedTarget) document.body.classList.remove('dragging'); });
window.addEventListener('drop', function(e){
  e.preventDefault(); document.body.classList.remove('dragging');
  var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f){
    overlay.classList.remove('hide');
    f.arrayBuffer().then(function(buf){ loadVrmFromArrayBuffer(buf, f.name); })
      .catch(function(e){ showError('ファイルを開けませんでした: ' + (e && e.message ? e.message : e)); overlay.classList.add('hide'); });
  }
});

var panel = document.getElementById('panel');
var panelToggle = document.getElementById('paneltoggle');
var debugFab = document.getElementById('debugFab');
function setPanelOpen(open){
  panel.classList.toggle('closed', !open);
  document.body.classList.toggle('panel-open', open);
  panelToggle.setAttribute('aria-expanded', String(open));
}
panelToggle.addEventListener('click', function(){ setPanelOpen(false); });
if (debugFab) debugFab.addEventListener('click', function(){ setPanelOpen(panel.classList.contains('closed')); });
window.addEventListener('keydown', function(e){
  if (e.key === 'h' || e.key === 'H'){ setPanelOpen(panel.classList.contains('closed')); }
  if (e.key === 'Escape' && !panel.classList.contains('closed')) setPanelOpen(false);
});
setPanelOpen(false);

/* ================= enemy behaviour mode (override) =================
   idle:   stand still (the old dummy behaviour)
   auto:   personality AI (default) — wander, spot the player, roll
           the personality's chase probability, close in and attack
   wander: wander only, never engages
   chase:  every enemy engages at once (personality speed / attack
           frequency still apply), for checking the combat pressure */
var enemyMode = 'auto';
function setEnemyMode(mode){
  if (mode === 'attack') mode = 'auto';   // legacy value from older builds
  enemyMode = mode;
  var btns = document.querySelectorAll('[data-enemy]');
  for (var i = 0; i < btns.length; i++){
    btns[i].classList.toggle('on', btns[i].getAttribute('data-enemy') === mode);
  }
  for (var j = 0; j < dummies.length; j++){
    dummies[j].aiWait = 0.3 + Math.random() * 1.2;
    dummies[j].aiHasTarget = false;
    dummies[j].atkWants = false;
    if (dummies[j].aiState !== 'windup' && dummies[j].aiState !== 'strike'){
      dummies[j].aiState = 'wander'; dummies[j].stateT = 0;
    }
  }
}
document.addEventListener('click', function(e){
  var b = e.target && e.target.closest ? e.target.closest('[data-enemy]') : null;
  if (b && !b.disabled) setEnemyMode(b.getAttribute('data-enemy'));
});

/* ================= personalities & enemy AI =================
   One state machine for all three, differentiated ONLY by these
   numbers (all PROVISIONAL / 仮置き):
     gentle （おとなしい, マグロ): mostly wanders — small detection
       radius, a low chase roll, slow approach, rare slow attacks.
     normal （ふつう, ブリ): the baseline.
     aggressive （好戦的, アカ): spots her from far away, almost
       always gives chase, closes fast and attacks often.
   States: wander -> (detection roll) -> chase -> windup (telegraph:
   rear back + warning glow) -> strike (a short lunge; one hit check)
   -> recover (personality cooldown) -> windup again or chase. */
var PERSONALITIES = {
  gentle:     { label: 'おとなしい', detectR: 9,  chaseProb: 0.15, decInt: 1.4,
                wanderSpeed: 0.7,  chaseSpeed: 1.25, atkRange: 1.9,
                atkProb: 0.35, windup: 0.85, dmg: 8,  cdMin: 2.6, cdMax: 4.2 },
  normal:     { label: 'ふつう',     detectR: 13, chaseProb: 0.55, decInt: 1.0,
                wanderSpeed: 0.9,  chaseSpeed: 1.9,  atkRange: 1.95,
                atkProb: 0.7,  windup: 0.65, dmg: 10, cdMin: 1.8, cdMax: 3.0 },
  aggressive: { label: '好戦的',     detectR: 18, chaseProb: 0.95, decInt: 0.6,
                wanderSpeed: 1.05, chaseSpeed: 2.6,  atkRange: 2.0,
                atkProb: 1.0,  windup: 0.5,  dmg: 12, cdMin: 1.1, cdMax: 2.0 }
};
console.info('[mission] 敵の性格・威力・プレイヤーHP・制限時間などの数値は全て仮置きです');

/* ================= anti-gank: attack tokens =================
   Playtest fix: with several enemies crowding her, chained hits
   made escape nearly impossible and the awakening became the only
   way out. So attacks are now rationed, fighting-game style:
   - at most ATK_TOKEN_MAX enemies may be in windup/strike at
     once. An enemy that wants to attack files a REQUEST
     (d.atkWants) and waits at the encirclement ring (~5m) until
     updateAttackTokens grants it a token; the token is held
     implicitly by being in windup/strike and freed when the
     strike ends, is interrupted, or the enemy goes down.
   - grants prefer the aggressive personality, then the earliest
     requester.
   - a GLOBAL cooldown follows every grant: for ATK_GLOBAL_CD
     seconds no other enemy may START a new attack, so hits land
     staggered instead of in a pile.
   All numbers PROVISIONAL （仮置き). */
var ATK_TOKEN_MAX = 2;
var ATK_GLOBAL_CD = 0.8;         /* seconds between attack starts */
var ATK_RING_DIST = 5;           /* encirclement standoff (m) */
var atkLastGrantT = -99;
var ATK_PRIORITY = { aggressive: 0, normal: 1, gentle: 2 };
function updateAttackTokens(){
  if (typeof missionState === 'undefined' || missionState !== 'playing') return;
  if (typeof enemyMode !== 'undefined' && (enemyMode === 'idle' || enemyMode === 'wander')) return;
  if (typeof freeMode !== 'undefined' && !freeMode) return;
  var active = 0;
  for (var i = 0; i < dummies.length; i++){
    var d0 = dummies[i];
    if (!d0.down && (d0.aiState === 'windup' || d0.aiState === 'strike')) active++;
  }
  if (active >= ATK_TOKEN_MAX) return;
  if (lastT - atkLastGrantT < ATK_GLOBAL_CD) return;
  var best = null, bestPri = 99, bestReqT = Infinity;
  for (var j = 0; j < dummies.length; j++){
    var d = dummies[j];
    if (d.down || !d.atkWants || d.aiState !== 'chase') continue;
    var pri = (d.person in ATK_PRIORITY) ? ATK_PRIORITY[d.person] : 1;
    if (pri < bestPri || (pri === bestPri && d.atkReqT < bestReqT)){
      best = d; bestPri = pri; bestReqT = d.atkReqT;
    }
  }
  if (!best) return;
  best.atkWants = false;
  best.aiState = 'windup';
  best.stateT = 0;
  atkLastGrantT = lastT;
}

function aiMoveToward(d, tx, tz, speed, dt){
  var dx = tx - d.x, dz = tz - d.z;
  var dist = Math.hypot(dx, dz);
  if (dist < 0.01) return dist;
  var wantYaw = Math.atan2(dx, dz);
  var step = wrapPi(wantYaw - d.aiYaw);
  d.aiYaw += step * Math.min(1, dt * 5);
  d.group.rotation.y = d.aiYaw;
  d.x += (dx / dist) * speed * dt;
  d.z += (dz / dist) * speed * dt;
  var rr = Math.hypot(d.x, d.z), mx = FIELD_R - 1.2;
  if (rr > mx){ d.x *= mx / rr; d.z *= mx / rr; }
  return dist;
}
function aiFacePlayer(d, dt){
  var wantYaw = Math.atan2(model.position.x - d.x, model.position.z - d.z);
  var step = wrapPi(wantYaw - d.aiYaw);
  d.aiYaw += step * Math.min(1, dt * 6);
  d.group.rotation.y = d.aiYaw;
}

function updateDummyAI(d, dt){
  var P = PERSONALITIES[d.person] || PERSONALITIES.normal;
  var canAttack = (typeof missionState !== 'undefined' && missionState === 'playing');
  var forceChase = (enemyMode === 'chase');
  /* on the title screen and during 作戦開始 the enemies only wander,
     so the backdrop stays calm and the mission starts clean */
  var wanderOnly = (enemyMode === 'wander') || !canAttack;
  var dxp = model.position.x - d.x, dzp = model.position.z - d.z;
  var distP = Math.hypot(dxp, dzp);
  d.visPitch = 0;

  if (d.aiState === 'windup' && canAttack){
    d.stateT += dt;
    aiFacePlayer(d, dt);
    var wk = Math.min(1, d.stateT / P.windup);
    d.visPitch = -0.28 * wk;                       /* rear back: the telegraph */
    if (wk > 0.5) d.flash = Math.max(d.flash, 0.45);   /* warning glow */
    if (d.stateT >= P.windup){
      d.aiState = 'strike'; d.stateT = 0; d.atkHitDone = false;
      d.atkDirX = distP > 0.05 ? dxp / distP : Math.sin(d.aiYaw);
      d.atkDirZ = distP > 0.05 ? dzp / distP : Math.cos(d.aiYaw);
    }
    return;
  }
  if (d.aiState === 'strike' && canAttack){
    d.stateT += dt;
    d.visPitch = 0.3;                              /* pitched into the lunge */
    d.x += d.atkDirX * 7.5 * dt;
    d.z += d.atkDirZ * 7.5 * dt;
    var rrS2 = Math.hypot(d.x, d.z), mxS = FIELD_R - 1.2;
    if (rrS2 > mxS){ d.x *= mxS / rrS2; d.z *= mxS / rrS2; }
    d.group.rotation.y = d.aiYaw = Math.atan2(d.atkDirX, d.atkDirZ);
    if (!d.atkHitDone && d.stateT >= 0.1){
      d.atkHitDone = true;
      var hd = Math.hypot(model.position.x - d.x, model.position.z - d.z);
      if (hd < 1.7 && model.position.y < 1.5){
        damagePlayer(P.dmg, { from: d, launch: model.position.y > 0.25 });
      }
    }
    if (d.stateT >= 0.26){
      d.aiState = 'recover'; d.stateT = 0;
      d.atkCd = P.cdMin + Math.random() * (P.cdMax - P.cdMin);
    }
    return;
  }
  if (d.aiState === 'recover' && canAttack){
    d.stateT += dt;
    aiFacePlayer(d, dt);
    if (d.stateT >= d.atkCd){
      d.stateT = 0;
      /* recovering into range files an attack REQUEST instead of
         lunging directly — the token grant (updateAttackTokens)
         decides who may actually start, and when */
      if (distP <= P.atkRange + 0.5 && Math.random() <= P.atkProb){
        d.atkWants = true; d.atkReqT = lastT;
      }
      d.aiState = 'chase';
    }
    return;
  }
  if (d.aiState === 'chase' && !wanderOnly){
    if (!forceChase && distP > P.detectR * 1.6){ d.aiState = 'wander'; d.aiHasTarget = false; d.atkWants = false; return; }
    if (d.atkWants){
      /* queued for an attack token: hold the encirclement ring
         instead of piling onto her — close in if too far, back
         off if too close, keep facing her, and never start the
         attack until the grant comes */
      if (distP > ATK_RING_DIST + 0.6){
        aiMoveToward(d, model.position.x, model.position.z, P.chaseSpeed, dt);
      } else if (distP < ATK_RING_DIST - 0.6){
        var bx = d.x - model.position.x, bz = d.z - model.position.z;
        var bl = Math.hypot(bx, bz) || 1;
        d.x += (bx / bl) * P.wanderSpeed * dt;
        d.z += (bz / bl) * P.wanderSpeed * dt;
        var rrQ = Math.hypot(d.x, d.z), mxQ = FIELD_R - 1.2;
        if (rrQ > mxQ){ d.x *= mxQ / rrQ; d.z *= mxQ / rrQ; }
        aiFacePlayer(d, dt);
      } else {
        aiFacePlayer(d, dt);
      }
      /* knocked far out of the fight: drop the request */
      if (distP > P.atkRange + 3) d.atkWants = false;
      return;
    }
    if (distP > P.atkRange){
      aiMoveToward(d, model.position.x, model.position.z, P.chaseSpeed, dt);
    } else {
      aiFacePlayer(d, dt);
      if (canAttack){
        if (Math.random() <= P.atkProb){ d.atkWants = true; d.atkReqT = lastT; }
        else { d.aiState = 'recover'; d.stateT = 0; d.atkCd = 0.8 + Math.random() * 0.8; }
      }
    }
    return;
  }
  /* ---- wander (default state) ---- */
  if (d.aiState !== 'wander') d.aiState = 'wander';
  if (d.aiWait > 0){
    d.aiWait -= dt;
  } else {
    if (!d.aiHasTarget){
      var wa = Math.random() * Math.PI * 2;
      var wr = 4 + Math.random() * (FIELD_R - 9);
      d.aiTx = Math.cos(wa) * wr; d.aiTz = Math.sin(wa) * wr;
      d.aiHasTarget = true;
    }
    var wDist = aiMoveToward(d, d.aiTx, d.aiTz, P.wanderSpeed, dt);
    if (wDist < 0.5){ d.aiHasTarget = false; d.aiWait = 1.2 + Math.random() * 2.6; }
  }
  /* detection: while the player is inside the personality's radius,
     roll the chase probability every decision interval */
  if (!wanderOnly){
    if (distP <= (forceChase ? 999 : P.detectR)){
      d.decT -= dt;
      if (d.decT <= 0){
        d.decT = P.decInt;
        if (forceChase || Math.random() < P.chaseProb) d.aiState = 'chase';
      }
    } else if (d.decT > 0.25) d.decT = 0.25;
  }
}

/* ================= mission flow （勝ち負け） =================
   boot -> title (タイトル画面) -> starting （作戦開始 banner) ->
   playing -> clear （作戦完了） / fail （作戦失敗）. Player HP and
   the 180s limit live here; every number is PROVISIONAL （仮置き). */
var MISSION_TIME = 180;          /* seconds （仮） */
var PLAYER_MAX_HP = 100;         /* （仮） */
var missionState = 'boot';
var playerHp = PLAYER_MAX_HP;
var playerInvulnT = 0;
var timeLeft = MISSION_TIME;
var missionT = 0;                /* elapsed in the current state */
var resultShown = false;
var failReason = '';
var hudSyncT = 0;
var titleEl = document.getElementById('titleScreen');
var resultEl = document.getElementById('resultScreen');
var bannerEl = document.getElementById('missionBanner');
var dmgFlashEl = document.getElementById('dmgflash');
var ghRemainEl = document.getElementById('gh-remain');
var ghScoreEl = document.getElementById('gh-score');
var ghHpFillEl = document.getElementById('gh-hpfill');
var ghHpNumEl = document.getElementById('gh-hpnum');
var ghTimeEl = document.getElementById('gh-time');
var ghTimerWrapEl = document.getElementById('gh-timerwrap');

function fmtMissionTime(s){
  s = Math.max(0, s);
  var m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return m + ':' + (ss < 10 ? '0' : '') + ss;
}
function baseScore(){ return dummyDowns * 1000 + destroyedCount * 100; }
function updateGameHud(){
  if (!ghRemainEl) return;
  /* remaining = every enemy not yet felled: those on the field
     PLUS those still waiting in the reinforcement queue */
  var remain = Math.max(0, enemyTotal - dummyDowns);
  ghRemainEl.textContent = String(remain);
  if (ghScoreEl) ghScoreEl.textContent = '撃破 ' + dummyDowns + ' ・ 破壊 ' + destroyedCount + ' ・ スコア ' + baseScore();
  if (ghHpFillEl){
    var frac = Math.max(0, playerHp / PLAYER_MAX_HP);
    ghHpFillEl.style.width = (frac * 100).toFixed(0) + '%';
    ghHpFillEl.className = frac <= 0.3 ? 'low' : (frac <= 0.6 ? 'mid' : '');
    ghHpFillEl.id = 'gh-hpfill';
  }
  if (ghHpNumEl) ghHpNumEl.textContent = Math.max(0, Math.ceil(playerHp)) + ' / ' + PLAYER_MAX_HP;
  if (ghTimeEl) ghTimeEl.textContent = fmtMissionTime(timeLeft);
  if (ghTimerWrapEl) ghTimerWrapEl.classList.toggle('urgent', missionState === 'playing' && timeLeft <= 30);
  syncAwakenHud();
}

function flashDamage(guarded){
  if (!dmgFlashEl) return;
  dmgFlashEl.style.transition = 'none';
  dmgFlashEl.style.opacity = guarded ? '0.45' : '0.85';
  void dmgFlashEl.offsetWidth;
  dmgFlashEl.style.transition = 'opacity .5s';
  dmgFlashEl.style.opacity = '0';
}
function isGuarding(){
  if (!motion || motionFading || motion.name !== 'guard') return false;
  var el = lastT - motion.start;
  return el >= 0.05 && el <= 1.15;
}
/* an enemy strike lands: HP drops, she flinches (hit) or goes down
   (launched / hit while airborne). Guarding cuts the damage to a
   fifth and never launches. Brief invulnerability follows so a
   crowd cannot chain her to death in one second. */
function damagePlayer(dmg, opt){
  opt = opt || {};
  if (missionState !== 'playing' || playerHp <= 0 || !model) return;
  if (playerInvulnT > 0) return;
  var hpBefore = playerHp;
  var guarded = isGuarding();
  /* knockback (anti-gank): longer than before, and the direction
     is blended AWAY FROM THE PACK — 65% away from the centroid of
     every enemy within 6.5m, 35% directly away from the attacker —
     so a hit in the middle of a crowd shoves her OUT of it, never
     across it into the next enemy's arms */
  var kb = guarded ? 0.3 : 1.15;
  if (opt.from){
    var kx = model.position.x - opt.from.x, kz = model.position.z - opt.from.z;
    var kl = Math.hypot(kx, kz) || 1;
    kx /= kl; kz /= kl;
    var cx = 0, cz = 0, cn = 0;
    for (var ci = 0; ci < dummies.length; ci++){
      var cd = dummies[ci];
      if (!cd.alive || cd.down) continue;
      if (Math.hypot(cd.x - model.position.x, cd.z - model.position.z) < 6.5){
        cx += cd.x; cz += cd.z; cn++;
      }
    }
    if (cn > 0){
      var gx = model.position.x - cx / cn, gz = model.position.z - cz / cn;
      var gl = Math.hypot(gx, gz);
      if (gl > 0.05){
        kx = kx * 0.35 + (gx / gl) * 0.65;
        kz = kz * 0.35 + (gz / gl) * 0.65;
        var kl2 = Math.hypot(kx, kz) || 1;
        kx /= kl2; kz /= kl2;
      }
    }
    model.position.x += kx * kb;
    model.position.z += kz * kb;
    var rrK = Math.hypot(model.position.x, model.position.z);
    if (rrK > FIELD_R){ model.position.x *= FIELD_R / rrK; model.position.z *= FIELD_R / rrK; }
    /* face the attacker so the reaction reads from the front */
    charYaw = Math.atan2(opt.from.x - model.position.x, opt.from.z - model.position.z);
    model.rotation.y = charYaw;
  }
  spawnImpact(_hitV.set(model.position.x, model.position.y + 1.05, model.position.z), guarded ? 0.5 : 0.8, guarded ? 0x9fd8e8 : 0xff9a7a);
  if (guarded){
    playerHp -= Math.max(1, Math.round(dmg * 0.2));
    playerInvulnT = 0.8;
    playHitSfx(false);
    addShake(0.012);
    flashDamage(true);
  } else {
    playerHp -= dmg;
    var wasFlying = flying;
    flying = false; kHeld = null; javHeld = null;
    /* escape guarantee (anti-gank): the invulnerability now lasts
       well past the reaction — a plain hit buys 1.4s, and a down
       buys 3.4s, which covers the whole 2.3s down/get-up motion
       PLUS about a second standing, so she always gets up
       invincible and gets a real chance to step out (the get-up
       can also be cancelled into a step / air dash — see
       escapeWindow in tryStep) instead of eating the next hit
       the frame she stands */
    if (opt.launch || wasFlying || model.position.y > 0.25){
      vy = Math.min(vy, -0.5);
      startMotion('down');
      playerInvulnT = 3.4;
    } else {
      startMotion('hit');
      playerInvulnT = 1.4;
    }
    playHitSfx(true);
    addShake(0.02);
    flashDamage(false);
  }
  /* taking damage also feeds the 覚醒 gauge, at about half the
     efficiency of dealing it (measured on HP actually lost, so a
     guarded hit counts for less) */
  if (hpBefore > playerHp) gainAwaken((hpBefore - playerHp) * AWK_GAIN_TAKE);
  if (playerHp <= 0){
    playerHp = 0;
    missionFail('HPが尽きました');
  }
  updateGameHud();
}

function resetBattlefield(){
  /* the wave roster is rebuilt from scratch at every mission
     start / retry (and on entering the title): the slider's total
     (10..20) becomes the kill target, the first wave of at most 3
     takes the field and the rest re-fill the reinforcement queue.
     A downed enemy never revives mid-mission (see
     updateDummiesFx), so clearing always means spending the whole
     queue AND felling every enemy it sent in. */
  buildWaveRoster(enemyTotalPending);
  dummyDowns = 0;
  destroyedCount = 0;
  atkLastGrantT = -99;   /* attack tokens start from a clean slate */
  for (var j = 0; j < destructibles.length; j++){
    var o = destructibles[j];
    o.alive = true; o.hp = o.maxHp; o.respawnT = 0; o.spawnT = 1;
    o.mesh.visible = true; o.mesh.rotation.x = 0; o.mesh.rotation.z = 0;
  }
  lockRelease('reset');
  if (model){
    model.position.set(0, 0, 0);
    charYaw = 0; model.rotation.y = 0;
    flying = false; vy = 0; stepTravel = null; meleeTravel = null;
    boost = 100; boostHot = false;
    if (motion && !LOCO[motion.name]) stopMotion();
    flyTo(new THREE.Vector3(1.4, 1.7, 3.4), new THREE.Vector3(0, 0.92, 0));
  }
  playerHp = PLAYER_MAX_HP;
  playerInvulnT = 0;
  timeLeft = MISSION_TIME;
  awkGauge = 0;
  awkFullNotified = false;
  cleanupAwaken();
}

function enterTitle(){
  missionState = 'title';
  missionT = 0; resultShown = false;
  resetBattlefield();
  if (resultEl) resultEl.hidden = true;
  if (bannerEl) bannerEl.classList.remove('show');
  if (titleEl) titleEl.hidden = false;
  updateGameHud();
}
/* PRESS START accepted: close the title, flash 作戦開始， then the
   mission clock starts */
function startMission(){
  if (missionState !== 'title' && missionState !== 'clear' && missionState !== 'fail') return;
  resetBattlefield();
  missionState = 'starting';
  missionT = 0; resultShown = false; failReason = '';
  if (titleEl) titleEl.hidden = true;
  if (resultEl) resultEl.hidden = true;
  if (typeof setPanelOpen === 'function') setPanelOpen(false);
  if (bannerEl){ bannerEl.textContent = '作戦開始！'; bannerEl.classList.add('show'); }
  playLockSfx();
  updateGameHud();
}
function missionClear(){
  if (missionState !== 'playing') return;
  missionState = 'clear';
  missionT = 0;
  reinforceT = -1;
  cleanupAwaken();
  startMotion('victory');
  playLockSfx();
  updateGameHud();
}
function missionFail(reason){
  if (missionState !== 'playing' && missionState !== 'starting') return;
  missionState = 'fail';
  missionT = 0;
  failReason = reason || '';
  reinforceT = -1;
  cleanupAwaken();
  flying = false;
  if (bannerEl) bannerEl.classList.remove('show');
  startMotion('defeat');
  updateGameHud();
}
function showResult(){
  resultShown = true;
  var win = (missionState === 'clear');
  var tEl = document.getElementById('resultTitle');
  var rEl = document.getElementById('resultReason');
  var sEl = document.getElementById('resultStats');
  var rankEl = document.getElementById('resultRank');
  var rankValEl = document.getElementById('resultRankVal');
  if (tEl){ tEl.textContent = win ? '作戦完了！' : '作戦失敗'; tEl.className = win ? 'win' : 'lose'; }
  if (rEl) rEl.textContent = win ? '上陸した寒ブリを全て倒しました' : (failReason ? '理由：' + failReason : '');
  var elapsed = MISSION_TIME - timeLeft;
  var timeBonus = win ? Math.round(timeLeft) * 10 : 0;
  var hpBonus = win ? Math.round(playerHp) * 5 : 0;
  var total = baseScore() + timeBonus + hpBonus;
  var rows = [
    ['経過時間', fmtMissionTime(elapsed)],
    ['撃破', dummyDowns + ' 体 （' + (dummyDowns * 1000) + '）'],
    ['破壊', destroyedCount + ' 個 （' + (destroyedCount * 100) + '）'],
    ['残りHP', Math.max(0, Math.ceil(playerHp)) + ' / ' + PLAYER_MAX_HP]
  ];
  if (win){
    rows.push(['タイムボーナス', '+' + timeBonus]);
    rows.push(['HPボーナス', '+' + hpBonus]);
  }
  rows.push(['スコア', String(total)]);
  if (sEl){
    sEl.textContent = '';
    rows.forEach(function(r){
      var div = document.createElement('div');
      div.className = 'rrow';
      var a = document.createElement('span'); a.textContent = r[0];
      var b = document.createElement('span'); b.textContent = r[1];
      div.appendChild(a); div.appendChild(b);
      sEl.appendChild(div);
    });
  }
  if (rankEl && rankValEl){
    rankEl.hidden = !win;
    /* rank lines scale with the roster: the kill score alone is
       1000 per enemy, so the old fixed lines (tuned for 3 enemies)
       are re-based on the current count */
    var killBase = enemyTotal * 1000;
    if (win) rankValEl.textContent = total >= killBase + 2000 ? 'S' : (total >= killBase + 1400 ? 'A' : (total >= killBase + 600 ? 'B' : 'C'));
  }
  if (resultEl) resultEl.hidden = false;
}
function updateMission(dt){
  missionT += dt;
  if (playerInvulnT > 0) playerInvulnT -= dt;
  hudSyncT += dt;
  if (hudSyncT > 0.12){ hudSyncT = 0; if (missionState === 'playing') updateGameHud(); }
  if (missionState === 'starting'){
    if (missionT >= 1.6){
      missionState = 'playing';
      missionT = 0;
      if (bannerEl) bannerEl.classList.remove('show');
    }
  } else if (missionState === 'playing'){
    /* reinforcement drip: one spawn per ~1.5s timer, and only
       while the field is under the fixed 3-cap — two quick kills
       therefore refill one enemy at a time, never a sudden crowd */
    if (reinforceT >= 0){
      reinforceT -= dt;
      if (reinforceT <= 0){
        spawnNextReinforcement();
        reinforceT = (reinforcementQueue.length > 0 && aliveEnemyCount() < MAX_ACTIVE_ENEMIES)
          ? REINFORCE_DELAY : -1;
      }
    }
    timeLeft -= dt;
    if (timeLeft <= 0){
      timeLeft = 0;
      missionFail('制限時間切れ');
    }
  } else if ((missionState === 'clear' || missionState === 'fail') && !resultShown){
    if (missionT >= 1.4) showResult();
  }
  if (dmgFlashEl && playerInvulnT > 0 && missionState === 'playing'){
    /* subtle red edge pulse while invulnerable after a hit */
  }
}
/* title / result input: click, tap, keys, pad buttons */
if (titleEl) titleEl.addEventListener('click', function(){ ensureSfx(); startMission(); });
var retryBtnEl = document.getElementById('retryBtn');
if (retryBtnEl) retryBtnEl.addEventListener('click', function(){ ensureSfx(); startMission(); });
window.addEventListener('keydown', function(e){
  var tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (missionState === 'title'){
    var k0 = (e.key || '').toLowerCase();
    if (k0 === 'h' || e.key === 'Escape') return;   // panel keys keep working
    ensureSfx();
    startMission();
  } else if ((missionState === 'clear' || missionState === 'fail') && resultShown){
    if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); ensureSfx(); startMission(); }
  }
});

/* ================= awakening （覚醒）: the Buri Bits =================
   A second ultimate on top of the 必殺 chop, driven by its OWN gauge
   (the gold bar in the game HUD — separate from BOOST):
   - the gauge (max 100) fills mainly by DEALING damage (see the
     gainAwaken call in damageDummy), and at about half efficiency
     by TAKING damage (measured on HP actually lost, in
     damagePlayer). It never fills while the awakening itself runs.
   - at full gauge it can be fired with the O key, the pad's
     L3+R3 click combo, or the on-screen 覚醒 button (which only
     appears while the gauge is full). Firing zeroes the gauge.
   - for 12s she carries the golden aura (the awaken motion's glow,
     held for the duration in animate()) and 12 Buri Bits deploy
     FUNNEL-style: they burst out of her in a fan, then each bit is
     ASSIGNED an enemy (spread across the field, about two bits per
     enemy at most, the locked enemy first), races to it at high
     speed, and holds a firing position 2-4m off it — repositioning
     every half-second or so — while firing a thin beam (light
     streak + tracer bolt + impact sparks) about every 0.7s,
     staggered across the twelve. When a bit's assigned enemy falls
     it is re-dealt to the least-covered living enemy and flies
     over. Bits are a little larger than the old swarm version and
     leave a light trail so the eye can follow them. Bits are
     invincible; when the time runs out they all fly back to her
     and vanish, and any mission end sweeps them away at once.
   Every number here is PROVISIONAL （仮置き). */
var AWK_MAX = 100;
var AWK_DURATION = 12;          /* seconds （仮） */
var AWK_GAIN_DEAL = 5;          /* gauge per point of damage dealt （仮） */
var AWK_GAIN_TAKE = 2;          /* gauge per HP lost — ~half the dealing rate （仮） */
var AWK_BIT_COUNT = 12;
var AWK_BIT_DMG = 3;            /* per beam hit （仮） */
var AWK_BIT_INTERVAL = 0.7;     /* seconds between one bit's shots （仮） */
var AWK_BIT_COLOR = 0xffd76a;
console.info('[awaken] 覚醒（ブリビット12基・12秒・ゲージ与ダメ×5/被ダメ×2・ビーム威力3/0.7秒）の数値は全て仮置きです');

var awkGauge = 0;
var awkActive = false;
var awkEndT = 0;
var awkBits = [];
var awkReturning = false;
var awkReturnT = 0;
var awkFullNotified = false;
var lastBitSfxT = -9;
var awkBannerUntil = -1;
var awkHudT = 0;
var ghAwkFillEl = document.getElementById('gh-awkfill');
var ghAwkNumEl = document.getElementById('gh-awknum');
var ghAwkWrapEl = document.getElementById('gh-awk');
var awkBtnEl = document.getElementById('awkbtn');
var _awkA = new THREE.Vector3();

function gainAwaken(points){
  if (awkActive || typeof missionState === 'undefined' || missionState !== 'playing') return;
  if (!(points > 0) || awkGauge >= AWK_MAX) return;
  awkGauge = Math.min(AWK_MAX, awkGauge + points);
  if (awkGauge >= AWK_MAX && !awkFullNotified){
    awkFullNotified = true;
    playLockSfx();   /* the READY blip: the gauge just filled */
  }
  syncAwakenHud();
}
function syncAwakenHud(){
  if (ghAwkFillEl) ghAwkFillEl.style.width = (awkGauge / AWK_MAX * 100).toFixed(0) + '%';
  if (ghAwkWrapEl) ghAwkWrapEl.classList.toggle('full', !awkActive && awkGauge >= AWK_MAX);
  if (ghAwkNumEl){
    ghAwkNumEl.textContent = awkActive
      ? '覚醒中 ' + Math.max(0, awkEndT - lastT).toFixed(1) + '秒'
      : (awkGauge >= AWK_MAX ? '覚醒OK！' : String(Math.floor(awkGauge)));
  }
  if (awkBtnEl){
    var show = (typeof freeMode !== 'undefined' && freeMode) && !awkActive &&
      awkGauge >= AWK_MAX && typeof missionState !== 'undefined' && missionState === 'playing';
    awkBtnEl.classList.toggle('show', !!show);
  }
}
function disposeBit(b){
  scene.remove(b.mesh);
  b.mesh.traverse(function(n){ if (n.material && n.material._own) n.material.dispose(); });
}
function cleanupBits(){
  for (var i = 0; i < awkBits.length; i++) disposeBit(awkBits[i]);
  awkBits = [];
}
function cleanupAwaken(){
  cleanupBits();
  awkActive = false;
  awkReturning = false;
  syncAwakenHud();
}
function spawnBits(){
  cleanupBits();
  for (var i = 0; i < AWK_BIT_COUNT; i++){
    /* a touch larger than the old formation-swarm bits (0.5), with
       the glow sprite scaled along, so a bit stays readable while
       it races across the field */
    var mesh = makeFishShell(0.72, 0x9fc3d4, 0xe8c33a, AWK_BIT_COLOR);
    mesh.position.set(model.position.x, model.position.y + 1.1, model.position.z);
    scene.add(mesh);
    /* deployment burst: straight out of her in a fan with real
       speed, then each bit breaks off toward its assigned enemy */
    var la = (i / AWK_BIT_COUNT) * Math.PI * 2 + Math.random() * 0.35;
    awkBits.push({ mesh: mesh,
      vel: new THREE.Vector3(Math.cos(la) * 13, 3.5 + Math.random() * 2.5, Math.sin(la) * 13),
      phase: (i / AWK_BIT_COUNT) * Math.PI * 2,
      seed: Math.random() * 100,
      state: 'deploy', stateT: 0,
      tgt: null,
      /* firing-position orbit around the assigned enemy: angle,
         standoff 2..4m, height, and a spin direction/speed; the
         slot is re-rolled every ~0.5-1.0s (see updateAwaken) so a
         bit never sits still like a turret */
      orbA: Math.random() * Math.PI * 2,
      orbR: 2 + Math.random() * 2,
      orbH: 1.1 + Math.random() * 1.5,
      orbSpin: (1.6 + Math.random() * 1.4) * (i % 2 ? 1 : -1),
      reposT: 0.3 + Math.random() * 0.6,
      /* the twelve first shots are spread across one interval, so
         the barrage starts staggered instead of in one volley */
      fireT: lastT + 0.8 + i * (AWK_BIT_INTERVAL / AWK_BIT_COUNT),
      trailT: Math.random() * 0.05 });
  }
  assignBitTargets();
}
function tryAwaken(){
  if (typeof freeMode === 'undefined' || !freeMode || !model || awkActive) return false;
  if (typeof missionState === 'undefined' || missionState !== 'playing') return false;
  if (awkGauge < AWK_MAX) return false;
  awkGauge = 0;
  awkFullNotified = false;
  awkActive = true;
  awkReturning = false;
  awkEndT = lastT + AWK_DURATION;
  startMotion('awaken');
  spawnBits();
  spawnGroundRing(_pv.set(model.position.x, 0.06, model.position.z), 2.6, AWK_BIT_COLOR);
  spawnPillar(new THREE.Vector3(model.position.x, 0, model.position.z), AWK_BIT_COLOR);
  addShake(0.08);
  playLockSfx();
  if (bannerEl){
    bannerEl.textContent = '覚醒！';
    bannerEl.classList.add('show');
    awkBannerUntil = lastT + 1.3;
  }
  syncAwakenHud();
  return true;
}
if (awkBtnEl) awkBtnEl.addEventListener('click', function(){ ensureSfx(); tryAwaken(); });

/* funnel assignment: deal the bits across the living enemies.
   Every unassigned (or widowed) bit goes to the currently
   least-covered enemy — with the locked enemy sorted first, so it
   draws the extra firepower when the counts tie. Greedy
   least-covered dealing keeps the spread at about two bits per
   enemy when there are many enemies, and automatically relaxes
   (4 per enemy against 3, all 12 against 1) when there are few. */
function countBitsOn(t){
  var n = 0;
  for (var i = 0; i < awkBits.length; i++) if (awkBits[i].tgt === t) n++;
  return n;
}
function assignBitTargets(){
  var alive = [];
  for (var i = 0; i < dummies.length; i++) if (lockAlive(dummies[i])) alive.push(dummies[i]);
  for (var j = 0; j < awkBits.length; j++){
    if (awkBits[j].tgt && !lockAlive(awkBits[j].tgt)) awkBits[j].tgt = null;
  }
  if (!alive.length) return;
  if (typeof lockTarget !== 'undefined' && lockTarget && lockAlive(lockTarget)){
    alive.sort(function(a, b){ return (b === lockTarget ? 1 : 0) - (a === lockTarget ? 1 : 0); });
  }
  for (var k = 0; k < awkBits.length; k++){
    var bk = awkBits[k];
    if (bk.tgt) continue;
    var best = null, bestN = Infinity;
    for (var m = 0; m < alive.length; m++){
      var n2 = countBitsOn(alive[m]);
      if (n2 < bestN){ bestN = n2; best = alive[m]; }
    }
    bk.tgt = best;
    /* a fresh assignment also gets a fresh firing slot, so the bit
       visibly breaks off toward a new position */
    bk.orbA = Math.random() * Math.PI * 2;
    bk.orbR = 2 + Math.random() * 2;
    bk.orbH = 1.1 + Math.random() * 1.5;
    bk.reposT = 0.3 + Math.random() * 0.6;
  }
}

/* fallback target for a bit with no living assignment: the locked
   enemy first, else the nearest living one to the firing bit */
function pickBitTarget(fromPos){
  if (typeof lockTarget !== 'undefined' && lockTarget && lockAlive(lockTarget)) return lockTarget;
  var best = null, bestD = Infinity;
  for (var i = 0; i < dummies.length; i++){
    var d = dummies[i];
    if (!lockAlive(d)) continue;
    var dd = Math.hypot(d.x - fromPos.x, d.z - fromPos.z);
    if (dd < bestD){ bestD = dd; best = d; }
  }
  return best;
}
function fireBit(b){
  /* a funnel shoots at ITS assigned enemy; the pick is only a
     fallback for the brief moment no assignment is alive */
  var tgt = (b.tgt && lockAlive(b.tgt)) ? b.tgt : pickBitTarget(b.mesh.position);
  if (!tgt) return;
  var from = b.mesh.position.clone();
  var to = new THREE.Vector3(tgt.x, 1.05 + tgt.airY, tgt.z);
  spawnBeam(from, to, 0.028, AWK_BIT_COLOR);
  spawnBolt(from, to, 0.2, 0xffe9a0, 0.4);
  damageDummy(tgt, AWK_BIT_DMG, 0);
  /* twelve bits firing is a lot of zaps: throttle the shared shot
     sound so the barrage reads as a stream, not a buzz */
  if (lastT - lastBitSfxT > 0.13){ lastBitSfxT = lastT; playShotSfx(false); }
}

/* per-frame bit flight — the funnel state machine:
   deploy: the launch burst out of her (initial velocity, ~0.45s);
   engage: steer hard at a firing slot that circles the ASSIGNED
     enemy at 2-4m standoff and is re-rolled every ~0.5-1.0s, so
     bits keep swooping from angle to angle around their own enemy
     instead of orbiting her; the stiff spring + 22m/s cap makes
     them overshoot and carve, funnel-style. A bit whose enemy fell
     is re-dealt (assignBitTargets) and visibly flies over to the
     next one. With no living enemy left a bit falls back to a
     loose orbit around her until the sweep comes.
   return: at time-out every anchor collapses onto her chest and
     the bits dock and vanish. Fast bits shed a short light trail
     so the whole dance stays readable on screen. */
function updateAwaken(dt){
  if (awkBannerUntil > 0 && lastT > awkBannerUntil){
    awkBannerUntil = -1;
    if (bannerEl && typeof missionState !== 'undefined' && missionState === 'playing')
      bannerEl.classList.remove('show');
  }
  if (!awkBits.length) return;
  if (!model){ cleanupAwaken(); return; }
  if (awkActive && !awkReturning && lastT >= awkEndT){
    awkReturning = true;
    awkReturnT = lastT;
    for (var ri = 0; ri < awkBits.length; ri++) awkBits[ri].state = 'return';
  }
  if (!awkReturning){
    var needDeal = false;
    for (var ni = 0; ni < awkBits.length; ni++){
      if (!awkBits[ni].tgt || !lockAlive(awkBits[ni].tgt)) needDeal = true;
    }
    if (needDeal) assignBitTargets();
  }
  var px = model.position.x, py = model.position.y, pz = model.position.z;
  for (var i = awkBits.length - 1; i >= 0; i--){
    var b = awkBits[i];
    var pos = b.mesh.position;
    if (awkReturning || b.state === 'return'){
      _awkA.set(px, py + 1.1, pz);
      _pv.copy(_awkA).sub(pos).multiplyScalar(5.0);
      b.vel.lerp(_pv, Math.min(1, dt * 5.5));
      if (b.vel.length() > 20) b.vel.setLength(20);
      pos.addScaledVector(b.vel, dt);
    } else if (b.state === 'deploy'){
      b.stateT += dt;
      b.vel.y -= 2.0 * dt;   /* the burst arcs very slightly */
      pos.addScaledVector(b.vel, dt);
      if (b.stateT >= 0.45) b.state = 'engage';
    } else {
      var t = (b.tgt && lockAlive(b.tgt)) ? b.tgt : null;
      if (t){
        b.reposT -= dt;
        if (b.reposT <= 0){
          b.reposT = 0.45 + Math.random() * 0.55;
          b.orbA += (0.7 + Math.random() * 2.2) * (Math.random() < 0.5 ? -1 : 1);
          b.orbR = 2 + Math.random() * 2;
          b.orbH = 1.1 + Math.random() * 1.5;
        }
        b.orbA += b.orbSpin * dt;
        _awkA.set(t.x + Math.cos(b.orbA) * b.orbR,
                  t.airY + b.orbH + Math.sin(lastT * 3.1 + b.seed) * 0.25,
                  t.z + Math.sin(b.orbA) * b.orbR);
      } else {
        var ang2 = b.phase + lastT * 2.2;
        _awkA.set(px + Math.cos(ang2) * 2.2,
                  py + 1.5 + Math.sin(lastT * 2.0 + b.seed) * 0.4,
                  pz + Math.sin(ang2) * 2.2);
      }
      _pv.copy(_awkA).sub(pos).multiplyScalar(5.2);
      b.vel.lerp(_pv, Math.min(1, dt * 5.5));
      if (b.vel.length() > 22) b.vel.setLength(22);
      pos.addScaledVector(b.vel, dt);
    }
    if (pos.y < 0.22) pos.y = 0.22;
    var rrB = Math.hypot(pos.x, pos.z), mxB = FIELD_R + 3;
    if (rrB > mxB){ pos.x *= mxB / rrB; pos.z *= mxB / rrB; }
    if (b.vel.lengthSq() > 0.25) b.mesh.lookAt(_pv.copy(pos).add(b.vel));
    /* light trail while moving fast — the readability cue that
       lets the eye track twelve funnels at once */
    b.trailT -= dt;
    if (b.trailT <= 0 && b.vel.lengthSq() > 36){
      b.trailT = 0.045;
      spawnPart(pos, _pv.set(0, 0, 0), 0.3, 0.42, AWK_BIT_COLOR, 0.45, 0, 0.3);
    }
    if (awkReturning){
      if (pos.distanceTo(_awkA) < 0.45 || lastT - awkReturnT > 1.2){
        disposeBit(b);
        awkBits.splice(i, 1);
      }
      continue;
    }
    if (b.state === 'engage' && typeof missionState !== 'undefined' &&
        missionState === 'playing' && lastT >= b.fireT){
      b.fireT = lastT + AWK_BIT_INTERVAL + (Math.random() * 0.16 - 0.08);
      fireBit(b);
    }
  }
  if (awkReturning && !awkBits.length){
    awkActive = false;
    awkReturning = false;
    syncAwakenHud();
  }
  if (awkActive){
    awkHudT += dt;
    if (awkHudT > 0.1){ awkHudT = 0; syncAwakenHud(); }
  }
}

function updateInfoPanel(){
  var el = document.getElementById('modelinfo');
  var boneCount = Object.keys(bones).length;
  el.textContent = '';
  function line(label, value){
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(label + ': '));
    var b = document.createElement('b'); b.textContent = value;
    div.appendChild(b);
    return div;
  }
  el.appendChild(line('モデル', (modelInfo.name || '—') + (modelInfo.version ? ' v' + modelInfo.version : '')));
  var d2 = document.createElement('div');
  d2.appendChild(document.createTextNode('ポリゴン: '));
  var b2 = document.createElement('b'); b2.textContent = modelInfo.tris.toLocaleString(); d2.appendChild(b2);
  d2.appendChild(document.createTextNode(' ／ メッシュ: '));
  var b3 = document.createElement('b'); b3.textContent = String(modelInfo.meshes); d2.appendChild(b3);
  el.appendChild(d2);
  var d3 = document.createElement('div');
  d3.appendChild(document.createTextNode('ヒューマノイドボーン: '));
  var b4 = document.createElement('b'); b4.textContent = String(boneCount); d3.appendChild(b4);
  d3.appendChild(document.createTextNode(' ／ 操作できる表情: '));
  var b5 = document.createElement('b'); b5.textContent = exprNames.length + '種'; d3.appendChild(b5);
  el.appendChild(d3);
}

/* ================= lock-on targeting (VS-style, design v2) =================
   Scoring and state transitions are kept separate, and the second
   design pass wins wherever it contradicts the first:

   - Score is a MULTIPLICATIVE gate product, never a plain sum:
       S = G_scr x G_los x G_state x
           (w_ang f_ang + w_dist f_dist + w_thr f_thr + w_eng f_eng + w_con f_con)
     G_scr falls with NDC distance off-screen and bottoms at 0.2
     behind the camera (never a hard exclusion). G_los is 0.6 while
     occluded and 0.35 once occlusion passes 2s. G_state is 0.3 for
     the first second after a (re)spawn; downed targets are excluded
     outright. Weights switch with context: normal vs afterKill
     (where f_con rewards candidates along the kill direction).
   - f_eng works even on these motionless dummies: hits I landed in
     the last 2s (decaying) x 0.7, plus 0.5 when the target is at
     <=25% HP. f_thr stays 0 while the enemies are dummies.
   - Manual switching walks a PERSISTENT azimuth ring: off-screen
     and occluded enemies stay on the ring (dropping them is what
     traps VS-likes into A<->B ping-pong with 3+ targets). Only the
     downed, the beyond-R_BREAK and (n/a here) invincible are off
     it, and pairs closer than 6 degrees keep their previous order
     (RING_HYST). Switch input is dedicated — pad X / right-stick
     flick / Q,E keys / the touch button / tapping the enemy — and
     never borrows the movement stick's direction.
   - Automatic switching is conservative: it fires only when the
     current score has rotted below 0.20, a candidate clears 0.45
     AND the sticky-effective current score (S x 1.25 + 0.05), the
     same candidate holds that for 0.6s, I have not landed a hit in
     1.5s, no attack is playing, and 1.0s passed since the last
     switch. Every switch logs its reason: manual / afterKill /
     auto / lost.
   - Kills hold the lock on the death spot for KILL_HOLD (0.35s)
     with the camera stopped, remember the kill bearing (deadDir),
     then reselect with afterKill weights. Killing the last enemy
     releases the lock and eases the camera back behind her facing
     over 0.6s.
   - The camera is an orbit camera with yaw follow — no midpoint
     lookAt. Desired yaw is chased at gain 9/s capped at 540 deg/s
     with the target's angular velocity fed forward; gain rises
     (smoothed, and calmed at melee range) while the target sits
     past |ndc.x| 0.55. Pitch follows half the elevation to the
     target, clamped. The orbit radius eases to a separation-based
     framing distance so both fighters stay in frame — with a
     point-blank push-back — the FOV widens by up to +6 up close,
     and the camera never dips below 0.35m. A dedicated unlock
     (R key / pad LB / the UNLOCK button / long-press of the touch
     switch button) hands the camera back to free orbit so effects
     can be watched from any angle; attacking re-locks. A switch replays the yaw
     gap as an easeOutCubic transition (T from the gap, <=0.5s) and
     latches the movement basis to the pre-switch yaw for 0.15s
     (MOVE_LATCH). Switch input during the finisher (chop) is
     buffered once and fires when the motion ends.
   - Reticle bands: melee (red, diamond + dot) reaches as far as
     her reach plus what the boost dash can close — it shrinks with
     the gauge and demotes to the shot band under 15% boost; shot
     (yellow circle) to the rifle's 14m; far (blue, dashed). The
     judged distance leads the real one by closing speed x 0.12s,
     band edges carry +-5% hysteresis and a 0.12s minimum hold, and
     an occluded target draws a gray dashed reticle instead.
   Distances are re-scaled from the design's 10u-tall cast to this
   field: she is ~1.55m in a 38m-radius arena, so R_LOCK covers
   practically the whole field and R_BREAK is 1.2x that. Times,
   angles and weights are the design's own. */
var LOCK = {
  R_LOCK: 34,
  R_BREAK: 41,
  R_SHOT: 14,
  MELEE_REACH: 3.2,
  MELEE_BOOST: 3.4,
  W_NORMAL: { ang: 0.42, dist: 0.32, thr: 0.15, eng: 0.11, con: 0 },
  W_KILL:   { ang: 0.22, dist: 0.22, thr: 0.16, eng: 0.08, con: 0.32 },
  KILL_HOLD: 0.35,
  OCC_TICK: 0.125,
  OCC_DEBOUNCE: 0.2,
  RING_HYST: 6 * Math.PI / 180
};
var lockTarget = null;
var lockLastDir = 1;
var lastSwitchT = -99;
var lastPlayerHitT = -99;
var lockBufferedDir = 0;
var killHold = false, killHoldT = 0, killWasLast = false;
var deadDir = null, deadPos = null, afterKillUntil = -1;
var camReturn = null;
var lockAz = 0, lockPitch = 0.32, lockBack = 0, lockBackApplied = 0, lockFov = 38;
var lockCamR = 0;         // eased orbit radius while the lock camera frames the fight
var lockGainBoost = 1;    // smoothed version of the off-centre yaw-gain boost
var camDragging = false;
var latchAz = 0, latchT = 0;
var switchTrans = null;
var lockWiggleT = 0;
var autoCand = null, autoCandT = 0;
var occTickT = 0;
var lockRingPrev = [];
var prevTgtAzP = null, tgtAngVel = 0;
var lockDistNow = 0, lockPrevDist = 0, lockClosing = 0, lockJudged = 0;
var lockBand = -1, lockBandT = -9;
var lockRaycaster = new THREE.Raycaster();
var lockRayList = [];
var _lk1 = new THREE.Vector3(), _lk2 = new THREE.Vector3(), _lk3 = new THREE.Vector3();
var reticleEl = document.getElementById('reticle');
var rNameEl = document.getElementById('rname');
var rDistEl = document.getElementById('rdist');
var rFillEl = document.getElementById('rfill');
var lockArrowEl = document.getElementById('lockarrow');
var unlockBtnEl = document.getElementById('unlockbtn');

function lockClamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function lockClamp01(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }
function wrapPi(a){
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function lerpAngle(a, b, k){ return a + wrapPi(b - a) * k; }
function lockAlive(d){ return !!(d && d.alive && !d.down); }
function distToDummy(d){
  var dx = d.x - model.position.x, dz = d.z - model.position.z;
  var dy = d.airY - model.position.y;
  return Math.sqrt(dx * dx + dz * dz + dy * dy);
}
/* angle between the camera's view direction and the target (rad) */
function angleFromCamera(d){
  camera.getWorldDirection(_lk2);
  _lk1.set(d.x, d.airY + 1.05, d.z).sub(camera.position).normalize();
  return _lk2.angleTo(_lk1);
}
/* G_scr: 1 on screen; outside, decays with NDC overshoot distance
   and floors at 0.2 — behind the camera is exactly 0.2 */
function gateScreen(d){
  _lk1.set(d.x, d.airY + 1.05, d.z).project(camera);
  if (_lk1.z > 1) return 0.2;
  var ex = Math.max(0, Math.abs(_lk1.x) - 1);
  var ey = Math.max(0, Math.abs(_lk1.y) - 1);
  if (ex === 0 && ey === 0) return 1;
  return Math.max(0.2, 1 - 0.6 * Math.hypot(ex, ey));
}
function lockScoreOf(d, w){
  var dist = distToDummy(d);
  var angDeg = angleFromCamera(d) * 180 / Math.PI;
  var fAng = 1 - smooth01(lockClamp01((angDeg - 8) / (70 - 8)));
  var fDist = lockClamp01(1 - dist / LOCK.R_LOCK);
  var fThr = 0;   // dummies never threaten; the term wakes up with real AI
  var hitAge = lastT - d.lastHitT;
  var fEng = (hitAge < 2 ? 0.7 * (1 - hitAge / 2) : 0) + (d.hp <= d.maxHp * 0.25 ? 0.5 : 0);
  if (fEng > 1) fEng = 1;
  var fCon = 0;
  if (deadDir !== null){
    var b = Math.atan2(d.x - model.position.x, d.z - model.position.z);
    fCon = lockClamp01(0.5 + 0.5 * Math.cos(b - deadDir));
  }
  var gScr = gateScreen(d);
  var gLos = d.occState ? (d.occDur > 2 ? 0.35 : 0.6) : 1;
  var gState = (lastT - d.bornT < 1) ? 0.3 : 1;
  return gScr * gLos * gState *
    (w.ang * fAng + w.dist * fDist + w.thr * fThr + w.eng * fEng + w.con * fCon);
}

/* occlusion: raycasts throttled to 8Hz against trees, rocks and the
   live props; the debounced state flips only after the raw result
   holds for 0.2s, and occDur times the current occluded stretch */
function raycastOccluded(d){
  _lk1.set(d.x, d.airY + 1.0, d.z);
  _lk2.copy(_lk1).sub(camera.position);
  var dist = _lk2.length();
  if (dist < 1.2) return false;
  _lk2.divideScalar(dist);
  lockRaycaster.set(camera.position, _lk2);
  lockRaycaster.far = dist - 0.7;
  return lockRaycaster.intersectObjects(lockRayList, true).length > 0;
}
function updateOcclusion(dt){
  occTickT += dt;
  var tick = false;
  if (occTickT >= LOCK.OCC_TICK){
    occTickT = 0; tick = true;
    lockRayList.length = 0;
    for (var q = 0; q < lockOccluders.length; q++) lockRayList.push(lockOccluders[q]);
    for (var p = 0; p < destructibles.length; p++){
      if (destructibles[p].alive) lockRayList.push(destructibles[p].mesh);
    }
  }
  for (var i = 0; i < dummies.length; i++){
    var d = dummies[i];
    if (tick) d.occRaw = raycastOccluded(d);
    if (d.occRaw === d.occState) d.occStableT = 0;
    else {
      d.occStableT += dt;
      if (d.occStableT >= LOCK.OCC_DEBOUNCE){
        d.occState = d.occRaw; d.occStableT = 0;
        if (d.occState) d.occDur = 0;
      }
    }
    if (d.occState) d.occDur += dt; else d.occDur = 0;
  }
}

function syncLockCam(){
  _lk1.copy(camera.position).sub(controls.target);
  var r = _lk1.length() || 1;
  lockAz = Math.atan2(_lk1.x, _lk1.z);
  lockPitch = Math.asin(lockClamp(_lk1.y / r, -1, 1));
  lockCamR = r; lockGainBoost = 1;
  prevTgtAzP = null; tgtAngVel = 0;
}
function setLockTarget(to, reason){
  var from = lockTarget;
  if (to && !from) syncLockCam();
  lockTarget = to;
  lastSwitchT = lastT;
  autoCand = null; autoCandT = 0;
  prevTgtAzP = null; tgtAngVel = 0;
  if (to){
    lockPrevDist = distToDummy(to);
    lockBand = -1;
    var desAz = Math.atan2(model.position.x - to.x, model.position.z - to.z);
    var dYaw = Math.abs(wrapPi(desAz - lockAz));
    /* switch transition: replay the yaw gap with easeOutCubic over
       T = 0.16 + 0.35 x (|dyaw|/180deg)^0.8, capped at 0.5s */
    switchTrans = { t: 0, fromAz: lockAz,
      T: Math.min(0.5, 0.16 + 0.35 * Math.pow(dYaw / Math.PI, 0.8)) };
    /* MOVE_LATCH: movement reads the pre-switch yaw for 0.15s */
    latchAz = lockAz; latchT = 0.15;
    camReturn = null;
    playLockSfx();
  }
  console.debug('[lockon] ' + reason + ': ' + (from ? from.name : '—') +
    ' -> ' + (to ? to.name : '—'));
}
function lockAcquire(reason){
  if (!model) return false;
  var w = (lastT < afterKillUntil) ? LOCK.W_KILL : LOCK.W_NORMAL;
  var best = null, bestS = -1;
  for (var i = 0; i < dummies.length; i++){
    var d = dummies[i];
    if (!lockAlive(d)) continue;
    if (lastT - d.bornT < 1) continue;   // fresh spawns: manual ring only
    if (distToDummy(d) > LOCK.R_LOCK) continue;
    var s = lockScoreOf(d, w);
    d.lockScore = s;
    if (s > bestS){ bestS = s; best = d; }
  }
  if (!best) return false;
  setLockTarget(best, reason);
  return true;
}
function lockRelease(reason){
  if (lockTarget && reason){
    console.debug('[lockon] ' + reason + ': ' + lockTarget.name + ' -> —');
  }
  lockTarget = null; killHold = false; switchTrans = null;
  autoCand = null; autoCandT = 0;
}
/* signed azimuth of a dummy around the camera axis (left < 0 < right) */
function azimuthOfDummy(d){
  camera.getWorldDirection(_lk2); _lk2.y = 0;
  if (_lk2.lengthSq() < 1e-6) _lk2.set(0, 0, -1);
  _lk2.normalize();
  _lk3.setFromMatrixColumn(camera.matrixWorld, 0); _lk3.y = 0;
  if (_lk3.lengthSq() < 1e-6) _lk3.set(1, 0, 0);
  _lk3.normalize();
  var dx = d.x - camera.position.x, dz = d.z - camera.position.z;
  return Math.atan2(dx * _lk3.x + dz * _lk3.z, dx * _lk2.x + dz * _lk2.z);
}
/* the persistent ring: every living dummy inside R_BREAK, sorted by
   azimuth; near-ties (< 6 deg) keep the previous ring's order */
function buildRing(){
  var list = [];
  for (var i = 0; i < dummies.length; i++){
    var d = dummies[i];
    if (!d.alive || d.down) continue;
    if (distToDummy(d) > LOCK.R_BREAK) continue;
    list.push({ d: d, az: azimuthOfDummy(d) });
  }
  var prev = lockRingPrev;
  list.sort(function(a, b){
    var da = a.az - b.az;
    if (Math.abs(da) < LOCK.RING_HYST){
      var ia = prev.indexOf(a.d), ib = prev.indexOf(b.d);
      if (ia >= 0 && ib >= 0) return ia - ib;
    }
    return da;
  });
  lockRingPrev = list.map(function(e){ return e.d; });
  return list;
}
function doRingSwitch(dir, reason){
  if (!lockTarget) return false;
  var ring = buildRing();
  if (ring.length <= 1){ lockWiggleT = 0.28; return false; }   // "nobody else" wiggle
  var idx = -1, i;
  for (i = 0; i < ring.length; i++) if (ring[i].d === lockTarget) idx = i;
  var next = null;
  if (idx >= 0) next = ring[(idx + dir + ring.length) % ring.length];
  else {
    var curAz = azimuthOfDummy(lockTarget);
    if (dir > 0){
      for (i = 0; i < ring.length; i++) if (ring[i].az > curAz + 1e-4){ next = ring[i]; break; }
      if (!next) next = ring[0];
    } else {
      for (i = ring.length - 1; i >= 0; i--) if (ring[i].az < curAz - 1e-4){ next = ring[i]; break; }
      if (!next) next = ring[ring.length - 1];
    }
  }
  if (!next || next.d === lockTarget) return false;
  lockLastDir = dir;
  setLockTarget(next.d, reason);
  return true;
}
/* the one funnel for every switch input: acquire when unlocked,
   buffer (once) while the finisher plays, otherwise walk the ring */
function lockSwitchRequest(dir){
  if (!freeMode || !model) return;
  if (!lockTarget){ lockAcquire('manual'); return; }
  if (motion && motion.name === 'chop' && !motionFading){ lockBufferedDir = dir; return; }
  doRingSwitch(dir, 'manual');
}
function faceLockTarget(){
  if (!lockTarget || !lockAlive(lockTarget) || !model) return;
  charYaw = Math.atan2(lockTarget.x - model.position.x, lockTarget.z - model.position.z);
  model.rotation.y = charYaw;
}
function startCamReturn(){
  _lk1.copy(camera.position).sub(controls.target);
  camReturn = { t: 0, fromAz: Math.atan2(_lk1.x, _lk1.z), toAz: charYaw + Math.PI };
}

/* conservative auto-switch: every gate must hold at once */
function runAutoSwitch(dt, lt){
  var sCur = lockScoreOf(lt, LOCK.W_NORMAL);
  lt.lockScore = sCur;
  var best = null, bestS = -1;
  for (var i = 0; i < dummies.length; i++){
    var d = dummies[i];
    if (d === lt || !lockAlive(d)) continue;
    if (lastT - d.bornT < 1) continue;
    if (distToDummy(d) > LOCK.R_LOCK) continue;
    var s = lockScoreOf(d, LOCK.W_NORMAL);
    d.lockScore = s;
    if (s > bestS){ bestS = s; best = d; }
  }
  var actionPlaying = !!(motion && !motionFading && !LOCO[motion.name]);
  var ok = !!best && sCur < 0.20 && bestS >= 0.45 &&
    bestS > sCur * 1.25 + 0.05 &&
    (lastT - lastPlayerHitT) >= 1.5 && !actionPlaying &&
    (lastT - lastSwitchT) >= 1.0;
  if (ok){
    if (autoCand === best) autoCandT += dt;
    else { autoCand = best; autoCandT = 0; }
    if (autoCandT >= 0.6) setLockTarget(best, 'auto');
  } else { autoCand = null; autoCandT = 0; }
}

function updateLock(dt){
  if (!model){ reticleEl.style.display = 'none'; lockArrowEl.style.display = 'none'; return; }
  if (!freeMode){ updateLockHud(); return; }
  if (latchT > 0) latchT -= dt;
  if (lockWiggleT > 0) lockWiggleT -= dt;
  updateOcclusion(dt);
  var lt = lockTarget;
  if (lt){
    lockDistNow = distToDummy(lt);
    if (dt > 0){
      lockClosing = lockClamp((lockPrevDist - lockDistNow) / dt, -6, 6);
      lockJudged = Math.max(0, lockDistNow - lockClosing * 0.12);
    }
    lockPrevDist = lockDistNow;
  }
  /* a switch buffered during the finisher fires as it ends */
  if (lockBufferedDir !== 0){
    var chopActive = !!(motion && motion.name === 'chop' && !motionFading);
    if (!chopActive && lockTarget){
      var bd = lockBufferedDir; lockBufferedDir = 0;
      doRingSwitch(bd, 'manual');
    } else if (!lockTarget) lockBufferedDir = 0;
  }
  lt = lockTarget;
  if (lt){
    if (killHold){
      killHoldT += dt;
      if (killHoldT >= LOCK.KILL_HOLD){
        killHold = false;
        afterKillUntil = lastT + 1.5;
        var hadOthers = false;
        for (var i = 0; i < dummies.length; i++) if (lockAlive(dummies[i])) hadOthers = true;
        if (!lockAcquire('afterKill')){
          console.debug('[lockon] lost: ' + lt.name + ' -> —');
          lockTarget = null;
          if (killWasLast || !hadOthers) startCamReturn();
        }
      }
    } else if (!lockAlive(lt)){
      /* target died: hold the lock on the death spot, camera stopped */
      killHold = true; killHoldT = 0;
      deadDir = Math.atan2(lt.x - model.position.x, lt.z - model.position.z);
      deadPos = { x: lt.x, z: lt.z, airY: lt.airY };
      killWasLast = true;
      for (var j = 0; j < dummies.length; j++){
        if (dummies[j] !== lt && lockAlive(dummies[j])) killWasLast = false;
      }
    } else if (lockDistNow > LOCK.R_BREAK){
      var fromD = lt;
      lockTarget = null;
      if (!lockAcquire('lost')){
        console.debug('[lockon] lost: ' + fromD.name + ' -> —');
      }
    } else if (lt.occState && lt.occDur >= 2.0){
      /* occluded for 2s: hand over to the best visible candidate,
         if there is one; otherwise sit tight */
      var bestVis = null, bestVisS = -1;
      for (var k = 0; k < dummies.length; k++){
        var dv = dummies[k];
        if (dv === lt || !lockAlive(dv) || dv.occState) continue;
        if (lastT - dv.bornT < 1) continue;
        if (distToDummy(dv) > LOCK.R_LOCK) continue;
        var sv = lockScoreOf(dv, LOCK.W_NORMAL);
        if (sv > bestVisS){ bestVisS = sv; bestVis = dv; }
      }
      if (bestVis) setLockTarget(bestVis, 'lost');
      else runAutoSwitch(dt, lt);
    } else {
      runAutoSwitch(dt, lt);
    }
  }
  updateLockHud();
}

/* ---- lock-on camera: orbit + yaw follow (called from the free-roam
   camera step, after the target glide, never during KILL_HOLD) ---- */
function applyCamSpherical(r, az, pitch){
  var cp = Math.cos(pitch);
  camera.position.set(
    controls.target.x + r * cp * Math.sin(az),
    controls.target.y + r * Math.sin(pitch),
    controls.target.z + r * cp * Math.cos(az));
}
function updateBackOff(dt){
  var want = 0;
  if (lockTarget && lockAlive(lockTarget) && !killHold){
    want = 1.25 * (1 - lockClamp01(lockDistNow / LOCK.R_SHOT));
  }
  lockBack += (want - lockBack) * Math.min(1, dt * 4);
  if (lockTarget && lockAlive(lockTarget) && !killHold){
    /* while locked, the framing radius in updateLockCamera owns
       the camera distance (it already includes a point-blank
       push-back), so the back-off must not ALSO shove the camera
       along its offset — the two together double the correction
       and the framing breathes. Here it only feeds the FOV. */
    lockBackApplied = lockBack;
  } else if (!lockTarget){
    /* unlocked: forget the back-off entirely, so releasing the
       lock never drags the now-free camera in or out */
    lockBack = 0; lockBackApplied = 0;
  } else {
    var delta = lockBack - lockBackApplied;
    if (Math.abs(delta) > 0.0005){
      _lk3.copy(camera.position).sub(controls.target);
      var len = _lk3.length();
      if (len > 1e-4){
        _lk3.multiplyScalar(Math.max(0.4, len + delta) / len);
        camera.position.copy(controls.target).add(_lk3);
        lockBackApplied = lockBack;
      }
    }
  }
  var wantFov = 38 + 6 * lockClamp01(lockBack / 1.25);
  lockFov += (wantFov - lockFov) * Math.min(1, dt * 4);
  if (Math.abs(lockFov - camera.fov) > 0.02){
    camera.fov = lockFov;
    camera.updateProjectionMatrix();
  }
}
function updateLockCamera(dt){
  if (killHold) return;   // camera stopped during KILL_HOLD
  _lk1.copy(camera.position).sub(controls.target);
  var r = _lk1.length();
  if (r < 1e-4) return;
  var curAz = Math.atan2(_lk1.x, _lk1.z);
  var curPitch = Math.asin(lockClamp(_lk1.y / r, -1, 1));
  if (camReturn){
    camReturn.t += dt;
    var kk = Math.min(1, camReturn.t / 0.6);
    var ek = 1 - Math.pow(1 - kk, 3);
    applyCamSpherical(r, lerpAngle(camReturn.fromAz, camReturn.toAz, ek), curPitch);
    if (camera.position.y < 0.35) camera.position.y = 0.35;
    if (kk >= 1) camReturn = null;
    updateBackOff(dt);
    return;
  }
  if (!lockTarget || !lockAlive(lockTarget)){ updateBackOff(dt); return; }
  var d = lockTarget;
  if (camDragging){ lockAz = curAz; lockPitch = curPitch; lockCamR = r; prevTgtAzP = null; return; }
  /* feed-forward: the target's angular velocity around her */
  var azP = Math.atan2(d.x - model.position.x, d.z - model.position.z);
  if (prevTgtAzP !== null && dt > 0){
    var vel = lockClamp(wrapPi(azP - prevTgtAzP) / dt, -3, 3);
    tgtAngVel += (vel - tgtAngVel) * 0.45;
  } else tgtAngVel = 0;
  prevTgtAzP = azP;
  var horiz = Math.hypot(d.x - model.position.x, d.z - model.position.z);
  var desAz = azP + Math.PI + tgtAngVel * 0.15;
  _lk2.set(d.x, d.airY + 1.05, d.z).project(camera);
  /* the off-centre boost used to switch 1x/1.8x in a single frame,
     which read as a snap whenever the target crossed |ndc.x| 0.55;
     ease it instead. At melee range the whole gain calms down —
     a camera that whips at full speed while she circles in close
     is the main thing that made the lock camera feel broken. */
  lockGainBoost += (((Math.abs(_lk2.x) > 0.55) ? 1.8 : 1) - lockGainBoost) * Math.min(1, dt * 6);
  var gain = 9 * lockGainBoost * lockClamp(0.5 + lockDistNow / 5, 0.55, 1);
  if (horiz < 0.6) desAz = lockAz;   // nearly above/below: freeze yaw
  if (switchTrans){
    switchTrans.t += dt;
    var tt = Math.min(1, switchTrans.t / switchTrans.T);
    lockAz = lerpAngle(switchTrans.fromAz, desAz, 1 - Math.pow(1 - tt, 3));
    if (tt >= 1) switchTrans = null;
  } else {
    var err = wrapPi(desAz - lockAz);
    var step = err * (1 - Math.exp(-gain * dt));
    var maxStep = (540 * Math.PI / 180) * dt;
    lockAz += lockClamp(step, -maxStep, maxStep);
  }
  var elevDeg = Math.atan2((d.airY + 1.05) - (model.position.y + 1.05),
    Math.max(horiz, 0.001)) * 180 / Math.PI;
  var desPitch = lockClamp(0.5 * elevDeg - 6, -12, 28) * Math.PI / 180;
  lockPitch += (desPitch - lockPitch) * Math.min(1, dt * 5);
  /* framing distance: ease the orbit radius toward a separation-
     based ideal so BOTH fighters stay in frame — out as they
     separate, in as they close, with an extra push-back at point
     blank so her back never swallows the target. Whatever radius
     the player left the free camera at no longer decides the
     lock-on framing. */
  var rIdeal = lockClamp(3.3 + lockDistNow * 0.30, 3.6, 7.2) +
    0.9 * (1 - lockClamp01(lockDistNow / 5));
  if (!(lockCamR > 0)) lockCamR = r;
  lockCamR += (rIdeal - lockCamR) * Math.min(1, dt * 2.5);
  applyCamSpherical(lockCamR, lockAz, lockPitch);
  /* never sink the lock camera under the floor on a low pitch */
  if (camera.position.y < 0.35) camera.position.y = 0.35;
  updateBackOff(dt);
}

/* ---- reticle & off-screen arrow ---- */
function lockBandFor(judged){
  var rM = LOCK.MELEE_REACH + LOCK.MELEE_BOOST * lockClamp01(boost / 100);
  var rS = LOCK.R_SHOT;
  if (lockBand === 0) return judged <= rM * 1.05 ? 0 : (judged <= rS * 1.05 ? 1 : 2);
  if (lockBand === 1) return judged <= rM * 0.95 ? 0 : (judged <= rS * 1.05 ? 1 : 2);
  if (lockBand === 2) return judged <= rS * 0.95 ? (judged <= rM * 0.95 ? 0 : 1) : 2;
  return judged <= rM ? 0 : (judged <= rS ? 1 : 2);
}
var BAND_COLORS = ['#ff5147', '#ffd83d', '#6fb3ff'];
function updateLockHud(){
  /* the unlock button lights up while a lock is live, so it reads
     as "press to release THIS lock", not as a mode toggle */
  if (unlockBtnEl) unlockBtnEl.classList.toggle('on',
    !!(freeMode && lockTarget && lockAlive(lockTarget)));
  var d = null, ax = 0, ay = 0, az = 0;
  if (freeMode && killHold && deadPos && lockTarget){
    d = lockTarget; ax = deadPos.x; ay = deadPos.airY + 1.05; az = deadPos.z;
  } else if (freeMode && lockTarget && lockAlive(lockTarget)){
    d = lockTarget; ax = d.x; ay = d.airY + 1.05; az = d.z;
  }
  if (!d){ reticleEl.style.display = 'none'; lockArrowEl.style.display = 'none'; return; }
  camera.updateMatrixWorld();
  _lk1.set(ax, ay, az);
  _lk3.copy(_lk1);
  camera.worldToLocal(_lk3);
  var behind = _lk3.z > 0;
  _lk2.copy(_lk1).project(camera);
  /* band with +-5% hysteresis, 0.12s minimum hold, boost demotion */
  var nb = lockBandFor(lockJudged);
  if (lockBand < 0){ lockBand = nb; lockBandT = lastT; }
  else if (nb !== lockBand && lastT - lockBandT >= 0.12){ lockBand = nb; lockBandT = lastT; }
  var dispBand = (lockBand === 0 && boost < 15) ? 1 : lockBand;
  var occluded = !!(d.occState && !killHold);
  var col = (occluded || killHold) ? '#9aa3b2' : BAND_COLORS[dispBand];
  if (behind || Math.abs(_lk2.x) > 1.02 || Math.abs(_lk2.y) > 1.02){
    reticleEl.style.display = 'none';
    var dx = _lk3.x, dy = -_lk3.y;
    if (behind){ dx = -dx; dy = -dy; }
    var dl = Math.hypot(dx, dy) || 1;
    var rad = Math.min(window.innerWidth, window.innerHeight) * 0.36;
    lockArrowEl.style.display = 'block';
    lockArrowEl.style.left = (window.innerWidth / 2 + dx / dl * rad) + 'px';
    lockArrowEl.style.top = (window.innerHeight / 2 + dy / dl * rad) + 'px';
    lockArrowEl.style.color = col;
    lockArrowEl.style.transform = 'translate(-50%,-50%) rotate(' +
      (Math.atan2(dy, dx) * 180 / Math.PI) + 'deg)';
    return;
  }
  lockArrowEl.style.display = 'none';
  var px = (_lk2.x * 0.5 + 0.5) * window.innerWidth;
  var py = (-_lk2.y * 0.5 + 0.5) * window.innerHeight;
  if (lockWiggleT > 0){
    px += Math.sin((0.28 - lockWiggleT) * 70) * 8 * (lockWiggleT / 0.28);
  }
  var sc = lockClamp(1.15 - lockDistNow * 0.02, 0.6, 1.1) * (dispBand === 2 ? 0.85 : 1);
  reticleEl.style.display = 'block';
  reticleEl.style.left = px + 'px';
  reticleEl.style.top = py + 'px';
  reticleEl.style.transform = 'translate(-50%,-50%) scale(' + sc.toFixed(3) + ')';
  reticleEl.className = 'band' + dispBand + (occluded ? ' occ' : '');
  reticleEl.style.setProperty('--rc', col);
  rNameEl.textContent = d.name;
  rDistEl.textContent = lockDistNow.toFixed(1) + 'm' + (occluded ? '・遮蔽中' : '');
  rFillEl.style.width = Math.max(0, d.hp / d.maxHp * 100) + '%';
}

/* dedicated unlock button: one tap releases the lock and hands
   the camera back to free orbit, so effects can be watched from
   any angle (attacking or switching re-locks, as before) */
unlockBtnEl.addEventListener('click', function(){
  ensureSfx();
  lockRelease('manual');
});

/* touch switch button: tap = next target on the ring, long-press
   (0.55s) = release the lock */
var lockBtnEl = document.getElementById('lockbtn');
var lockBtnDown = false, lockBtnLong = false, lockBtnTimer = null;
lockBtnEl.addEventListener('pointerdown', function(e){
  e.preventDefault();
  ensureSfx();
  lockBtnDown = true; lockBtnLong = false;
  lockBtnTimer = setTimeout(function(){
    lockBtnLong = true;
    lockRelease('manual');
  }, 550);
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(function(ev){
  lockBtnEl.addEventListener(ev, function(){
    if (!lockBtnDown) return;
    lockBtnDown = false;
    if (lockBtnTimer){ clearTimeout(lockBtnTimer); lockBtnTimer = null; }
    if (ev === 'pointerup' && !lockBtnLong) lockSwitchRequest(1);
  });
});

/* direct target tap: a clean tap on the field (not a drag) raycasts
   the dummies and locks the tapped one. The same press doubles as
   the camera-drag tracker for the lock-on camera. */
var tapTrack = null;
renderer.domElement.addEventListener('pointerdown', function(e){
  camDragging = true;
  tapTrack = { x: e.clientX, y: e.clientY, t: performance.now() };
});
window.addEventListener('pointerup', function(e){
  camDragging = false;
  if (!tapTrack) return;
  var moved = Math.hypot(e.clientX - tapTrack.x, e.clientY - tapTrack.y);
  var dtms = performance.now() - tapTrack.t;
  tapTrack = null;
  if (!freeMode || !model || moved > 10 || dtms > 350) return;
  if (motion && motion.name === 'chop' && !motionFading) return;
  _lk1.set((e.clientX / window.innerWidth) * 2 - 1,
    -(e.clientY / window.innerHeight) * 2 + 1, 0.5).unproject(camera);
  _lk1.sub(camera.position).normalize();
  lockRaycaster.set(camera.position, _lk1);
  lockRaycaster.far = 120;
  var groups = [];
  for (var i = 0; i < dummies.length; i++) if (lockAlive(dummies[i])) groups.push(dummies[i].group);
  var hits = lockRaycaster.intersectObjects(groups, true);
  if (!hits.length) return;
  var obj = hits[0].object;
  for (var j = 0; j < dummies.length; j++){
    var node = obj, found = false;
    while (node){ if (node === dummies[j].group){ found = true; break; } node = node.parent; }
    if (found){
      if (lockTarget !== dummies[j]) setLockTarget(dummies[j], 'manual');
      break;
    }
  }
});
window.addEventListener('pointercancel', function(){ camDragging = false; tapTrack = null; });

/* ================= free-roam movement =================
   Free mode walks the MODEL GROUP around the wide field — the
   procedural motions (walk / run / jump …) are in-place, so world
   translation and facing live here. Movement is camera-relative,
   the fence radius clamps her in, and locomotion reuses the
   existing walk / run motions, so tail, sway and expressions keep
   working exactly as in the viewer. */
var freeMode = false;
var keysDown = {};
var joyVec = { x:0, y:0, active:false };
var LOCO = { walk:true, run:true, idle:true, boostdash:true, fly:true };
var charYaw = 0;               // facing, radians (model faces +Z at 0)
var moveSpeedNow = 0;          // ground speed this frame (drives the walk-shoot leg cycle)
var posInfoEl = document.getElementById('posinfo');
var freeInfoT = 0;
var _fwd = new THREE.Vector3(), _rgt = new THREE.Vector3(), _mv = new THREE.Vector3(), _want = new THREE.Vector3();
var UP_Y = new THREE.Vector3(0, 1, 0);

/* ---- combat input (VS-style split controls + debug keys) ----
   Play controls keep movement and attacks on separate keys, like
   the original series: WASD moves, J/K/L/U/I attack, Space jumps
   and — pressed again (or Shift) while airborne — air-dashes.
   The number keys 1-0 are a debug row that calls motions directly
   for checking them one by one. */
var kHeld = null;              // { t, used } while K is held (tap = single shot, hold = CS burst)
var subCdUntil = -9, spCdUntil = -9;   // provisional cooldowns for the sub / special shots
var javHeld = null;            // { t } while the javelin button is held (charge)
var javelinStage = 1;          // charge stage of the javelin being thrown (1-3)
var airDashStart = null;       // motion.start of the airdash being tracked for travel transfer
var airDashPrevZ = 0;          // last frame's airdash root-offset value
var DEBUG_KEYS = { '1':'combo', '2':'upper', '3':'burst', '4':'bazooka', '5':'chop',
                   '6':'guard', '7':'roll', '8':'step', '9':'airdash', '0':'boostdash' };

/* ---- boost gauge + boost flight ----
   One VS-style gauge feeds every boost move: engaging flight (12),
   air dash (18), double-tap step (15), and per-second drains while
   flying or boost-dashing. It refills on the ground after a short
   delay; emptying it overheats the gauge — no boost moves until it
   climbs back to 35. Flight is a physics layer on the model group:
   model.position.y is hers while flying / falling, with the 'fly'
   loop motion as the airborne pose. */
var boost = 100, boostHot = false, boostUsedT = -9;
var flying = false, vy = 0, jumpHeldBtn = false;
var boostFillEl = document.getElementById('boostfill');
var boostBarEl = document.getElementById('boostbar');
function spendBoost(cost){
  if (boostHot || boost < cost) return false;
  boost -= cost; boostUsedT = lastT;
  if (boost <= 0){ boost = 0; boostHot = true; }
  return true;
}
function drainBoost(rate, dt){
  boost -= rate * dt; boostUsedT = lastT;
  if (boost <= 0){ boost = 0; boostHot = true; return false; }
  return true;
}

/* ---- double-tap step ---- */
var DIR_KEYS = { w:'f', arrowup:'f', s:'b', arrowdown:'b', a:'l', arrowleft:'l', d:'r', arrowright:'r' };
var lastTap = {};        // canonical direction -> performance.now() of the previous tap
var stepTravel = null;   // { dx, dz, t0, startRef, prev } burst travel of a running step

/* ---- advancing melee （踏み込み） ----
   VS melee is not done standing still: every swing steps her IN,
   so a combo walks itself toward the target a little at a time.
   These tracks are the CUMULATIVE metres of real model-group
   travel over each motion's elapsed time — a lunge lands with
   each hit mark (combo: 0.42 / 1.00 / 1.52s), the upper scoops
   forward as it rises, the finisher keeps its single stamp step,
   and the air slash carries its momentum forward. Travel runs
   along her facing, which tracks the locked target, so the
   advance homes; updateFreeMove caps the total at the locked
   target's distance minus 0.85m so she pulls up in front of it
   instead of pushing through. */
var meleeTravel = null;   // { startRef, prev, cap } of the running advance
var MELEE_ADVANCE = {
  combo:    [[0,0],[0.30,0.04],[0.42,0.42],[0.62,0.47],[1.00,0.88],[1.20,0.93],[1.52,1.30],[1.95,1.35]],
  upper:    [[0,0],[0.38,0.03],[0.68,0.58],[0.90,0.64],[1.35,0.64]],
  chop:     [[0,0],[1.45,0.02],[1.62,0.42],[2.60,0.42]],
  airslash: [[0,0],[0.30,0.08],[0.74,0.62],[1.15,0.68]]
};

/* combined keyboard + joystick input vector (x: right, y: forward) */
function inputVec(){
  var ix = 0, iy = 0;
  if (keysDown['w'] || keysDown['arrowup']) iy += 1;
  if (keysDown['s'] || keysDown['arrowdown']) iy -= 1;
  if (keysDown['a'] || keysDown['arrowleft']) ix -= 1;
  if (keysDown['d'] || keysDown['arrowright']) ix += 1;
  if (joyVec.active){ ix += joyVec.x; iy += -joyVec.y; }
  if (padVec.active){ ix += padVec.x; iy += padVec.y; }
  return { x: ix, y: iy };
}
/* camera-relative world move direction for an input vector */
function camMoveVec(ix, iy, out){
  /* MOVE_LATCH: for 0.15s after a target switch, movement still
     reads against the pre-switch camera yaw, so a switch mid-strafe
     does not yank her run direction around */
  if (latchT > 0) _fwd.set(-Math.sin(latchAz), 0, -Math.cos(latchAz));
  else { camera.getWorldDirection(_fwd); _fwd.y = 0; }
  if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1);
  _fwd.normalize();
  _rgt.crossVectors(_fwd, UP_Y);
  out.set(0, 0, 0).addScaledVector(_fwd, iy).addScaledVector(_rgt, ix);
  return out;
}
/* airborne = boost-flying, off the ground, or the jump motion is
   past its crouch and still flying */
function isAirborne(){
  if (!freeMode || !model) return false;
  if (flying || model.position.y > 0.02) return true;
  return !!(motion && motion.name === 'jump' && !motionFading &&
            (lastT - motion.start) >= 0.22);
}

function setFreeMode(on){
  freeMode = on;
  document.body.classList.toggle('freemode', on);
  /* the panel would cover the play field, so tuck it away when
     game mode starts (reopen any time via the faint ⚙ mark in the
     top-right corner / H key — the panel is hidden by default) */
  if (on && typeof setPanelOpen === 'function') setPanelOpen(false);
  var tg = document.getElementById('tg-free');
  if (tg) tg.setAttribute('aria-pressed', String(on));
  if (!on){
    lockTarget = null; killHold = false; camReturn = null; switchTrans = null;
    lockBufferedDir = 0; lockBack = 0; lockBackApplied = 0; lockFov = 38;
    if (Math.abs(camera.fov - 38) > 0.01){ camera.fov = 38; camera.updateProjectionMatrix(); }
    keysDown = {};
    kHeld = null;
    javHeld = null;
    cleanupAwaken();
    airDashStart = null;
    dpadClear();
    flying = false; vy = 0; stepTravel = null; meleeTravel = null; lastTap = {};
    if (model) model.position.y = 0;
    if (motion && LOCO[motion.name]) stopMotion();
  } else if (model){
    toggles.spin = false; controls.autoRotate = false;
    var st = document.getElementById('tg-spin');
    if (st) st.setAttribute('aria-pressed', 'false');
    flyTo(new THREE.Vector3(model.position.x + 1.4, 1.7, model.position.z + 3.4),
          new THREE.Vector3(model.position.x, 0.92, model.position.z));
  }
}
document.getElementById('tg-free').addEventListener('click', function(){ setFreeMode(!freeMode); });
document.getElementById('free-reset').addEventListener('click', function(){
  if (!model) return;
  model.position.set(0, 0, 0);
  charYaw = 0; model.rotation.y = 0;
  flying = false; vy = 0; stepTravel = null;
  if (motion && motion.name === 'fly') stopMotion();
  flyTo(new THREE.Vector3(1.4, 1.7, 3.4), new THREE.Vector3(0, 0.92, 0));
});

function tryJump(){
  if (!freeMode || !model) return;
  if (flying){ endFlight(); return; }
  if (isAirborne() || model.position.y > 0.03){ tryBoostFly(); return; }
  if (!motion || LOCO[motion.name]) startMotion('jump');
}

/* ブースト飛行: pressing jump again in the air spends boost to
   fly. The physics live in updateFreeMove: while the jump key is
   held she climbs, released she hovers, and pressing jump once
   more (or running the gauge dry) drops her back into a fall. */
function tryBoostFly(){
  if (!freeMode || !model || flying) return false;
  if (!spendBoost(12)) return false;
  flying = true;
  if (model.position.y < 0.3) model.position.y = 0.3;
  vy = Math.max(vy, 0.9);
  startMotion('fly');
  return true;
}
function endFlight(){
  flying = false;
  if (motion && motion.name === 'fly') stopMotion();
}

/* 空中ダッシュ: while the jump is airborne, dash toward the current
   movement input (camera-relative); with no input she dashes the
   way she faces. Facing snaps to the dash direction, like the
   ground movement's turn. The dash's travel is kept as real
   displacement by updateFreeMove (see the transfer there). */
function tryAirDash(){
  if (!freeMode || !model) return false;
  if (!isAirborne()) return false;
  if (!spendBoost(18)) return false;
  var iv = inputVec();
  if (Math.hypot(iv.x, iv.y) > 0.12){
    camMoveVec(iv.x, iv.y, _mv);
    if (_mv.lengthSq() > 1e-6){
      charYaw = Math.atan2(_mv.x, _mv.z);
      model.rotation.y = charYaw;
    }
  }
  startMotion('airdash');
  return true;
}

/* ステップ (double-tap): tapping a direction key twice in quick
   succession bursts her that way — camera-relative like movement,
   but she KEEPS her facing (VS-style), so the step motion played is
   whichever of front / back / left / right is closest to the tapped
   direction. The travel is applied to the model group in
   updateFreeMove, so the burst distance stays as real movement. */
/* escape window: while she is in the back half of a hit reaction,
   or in the rise of the down/get-up motion, AND still inside the
   post-hit invulnerability, a step (or, airborne, an air dash —
   which never had a busy-motion gate) may CANCEL the reaction.
   That is the guaranteed way out of an encirclement: get up, step
   through the ring, breathe. */
function escapeWindow(){
  if (!motion || motionFading) return false;
  if (typeof playerInvulnT === 'undefined' || playerInvulnT <= 0) return false;
  var el = lastT - motion.start;
  if (motion.name === 'hit') return el >= 0.15;
  if (motion.name === 'down') return el >= 1.35;   /* the kip-up starts ~1.5s in */
  return false;
}
function tryStep(dir){
  if (!freeMode || !model) return false;
  if (flying || model.position.y > 0.02) return false;
  if (motion && motion.name === 'jump' && !motionFading) return false;
  if (motion && !motionFading && !LOCO[motion.name] && !escapeWindow()) return false;
  var iv = { f:[0, 1], b:[0, -1], l:[-1, 0], r:[1, 0] }[dir];
  if (!iv) return false;
  camMoveVec(iv[0], iv[1], _mv);
  if (_mv.lengthSq() < 1e-6) return false;
  _mv.normalize();
  if (!spendBoost(15)) return false;
  var fx = Math.sin(charYaw), fz = Math.cos(charYaw);
  var lx = fz, lz = -fx;   // her left in world space (facing +Z -> +X)
  var dF = _mv.x * fx + _mv.z * fz;
  var dL = _mv.x * lx + _mv.z * lz;
  var name = 'step', best = dF;
  if (-dF > best){ best = -dF; name = 'stepback'; }
  if (dL > best){ best = dL; name = 'stepleft'; }
  if (-dL > best){ best = -dL; name = 'stepright'; }
  startMotion(name);
  stepTravel = { dx: _mv.x, dz: _mv.z, t0: lastT, startRef: motion.start, prev: 0 };
  return true;
}

/* attack keys: J melee / K shot / L special / U finisher / I guard.
   In the air, melee and shot become their air versions; the rest
   wait for landing. On the ground an attack can be started from
   locomotion but not while another one-shot is playing. */
function tryAttack(kind){
  if (!freeMode || !model) return;
  /* attacking with no lock goes through ACQUIRING first; with a
     lock she turns to face it, so melee arcs and the hitscan shot
     line track the locked target */
  if (kind !== 'guard' && !lockTarget) lockAcquire('manual');
  faceLockTarget();
  if (isAirborne()){
    if (kind === 'melee') startMotion('airslash');
    else if (kind === 'shot') startMotion('airshot');
    return;
  }
  if (motion && !motionFading && !LOCO[motion.name]) return;
  if (kind === 'melee') startMotion('combo');
  else if (kind === 'shot') startMotion('shot1');
  else if (kind === 'sub'){
    /* サブ射撃・鰤バズーカ (provisional cooldown): the braced
       launcher pose; the homing fish shell spawns at its 0.85s
       fire mark via the FX scheduler */
    if (lastT < subCdUntil) return;
    subCdUntil = lastT + SUB_CD;
    startMotion('bazooka');
  }
  else if (kind === 'upper') startMotion('upper');
  else if (kind === 'chop') startMotion('chop');
  else if (kind === 'guard') startMotion('guard');
}

/* 特殊射撃・鰤ジャベリン: press-and-hold charges (3 stages), and
   releasing throws. The charge itself is just a held timestamp —
   the glow lives in updateActionFX, the stage is decided here at
   release and read by spawnJavelinProj when the throw motion
   reaches its release mark. */
function startJavelinCharge(){
  if (!freeMode || !model || isAirborne()) return;
  if (motion && !motionFading && !LOCO[motion.name]) return;
  if (lastT < spCdUntil) return;
  if (!javHeld) javHeld = { t: lastT };
}
function fireJavelin(){
  if (!javHeld) return;
  var hold = lastT - javHeld.t;
  javHeld = null;
  if (!freeMode || !model || isAirborne()) return;
  if (motion && !motionFading && !LOCO[motion.name]) return;
  if (lastT < spCdUntil) return;
  javelinStage = hold >= JAV_T2 ? 3 : (hold >= JAV_T1 ? 2 : 1);
  spCdUntil = lastT + SP_CD;
  if (!lockTarget) lockAcquire('manual');
  faceLockTarget();
  startMotion('javelin');
}

/* debug row 1-0: call a motion directly, interrupting whatever is
   playing (it is for checking motions, not for playing fair) */
function triggerDebugMotion(name){
  if (!freeMode || !model) return;
  if (name === 'boostdash'){
    if (motion && motion.name === 'boostdash' && !motionFading) stopMotion();
    else startMotion('boostdash');
    return;
  }
  startMotion(name);
}
var jumpBtnEl = document.getElementById('atk-jump');
jumpBtnEl.addEventListener('pointerdown', function(e){
  e.preventDefault();
  jumpHeldBtn = true;
  tryJump();
});
['pointerup', 'pointerleave', 'pointercancel'].forEach(function(ev){
  jumpBtnEl.addEventListener(ev, function(){ jumpHeldBtn = false; });
});

/* on-screen attack buttons (touch): the same actions as the J/K/L/U/I
   keys, so mobile players can fight too. The rifle button mirrors the
   K key exactly — it shares kHeld, so a tap fires the single shot and
   a 0.5s hold fires the CS burst via updateFreeMove. The two corner
   buttons are the new arms: bazooka (tap) and javelin (hold to
   charge, release to throw). */
function bindAtkBtn(id, onDown, onUp){
  var el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('pointerdown', function(e){
    e.preventDefault();
    ensureSfx();
    onDown();
  });
  if (onUp){
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function(ev){
      el.addEventListener(ev, onUp);
    });
  }
}
bindAtkBtn('atk-melee', function(){ tryAttack('melee'); });
bindAtkBtn('atk-upper', function(){ tryAttack('upper'); });
bindAtkBtn('atk-chop', function(){ tryAttack('chop'); });
bindAtkBtn('atk-guard', function(){ tryAttack('guard'); });
bindAtkBtn('atk-shot',
  function(){ if (!kHeld) kHeld = { t: lastT, used: false }; },
  function(){
    if (kHeld){
      if (!kHeld.used) tryAttack('shot');
      kHeld = null;
    }
  });
bindAtkBtn('atk-sub', function(){ tryAttack('sub'); });
bindAtkBtn('atk-sp',
  function(){ startJavelinCharge(); },
  function(){ fireJavelin(); });

window.addEventListener('keydown', function(e){
  if (!freeMode) return;
  var tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  /* title / result screens own the keyboard (their own listener
     starts or retries the mission); gameplay keys stay inert */
  if (typeof missionState !== 'undefined' &&
      (missionState === 'title' || missionState === 'clear' || missionState === 'fail')) return;
  var k = (e.key || '').toLowerCase();
  if (k === ' ' || k === 'spacebar'){
    e.preventDefault();
    if (tag === 'BUTTON') e.target.blur();
    keysDown[' '] = true;
    if (!e.repeat) tryJump();
    return;
  }
  if (k.indexOf('arrow') === 0) e.preventDefault();
  if (tag === 'BUTTON' && 'wasd'.indexOf(k) >= 0) e.target.blur();
  /* double-tap a direction key -> step that way */
  var dirK = DIR_KEYS[k];
  if (dirK && !e.repeat){
    var nowTap = performance.now();
    if (lastTap[dirK] && nowTap - lastTap[dirK] < 300){ tryStep(dirK); lastTap[dirK] = 0; }
    else lastTap[dirK] = nowTap;
  }
  if (!e.repeat){
    if (k === 'shift') tryAirDash();
    else if (k === 'e') lockSwitchRequest(1);
    else if (k === 'q') lockSwitchRequest(-1);
    else if (k === 'r') lockRelease('manual');   /* R: ロック解除 (camera goes free) */
    else if (k === 'o') tryAwaken();   /* O: 覚醒 (full gauge only) */
    else if (k === 'j') tryAttack('melee');
    else if (k === 'n') tryAttack('sub');
    else if (k === 'm') startJavelinCharge();
    else if (k === 'l') tryAttack('upper');
    else if (k === 'u') tryAttack('chop');
    else if (k === 'i') tryAttack('guard');
    else if (k === 'k') kHeld = { t: lastT, used: false };
    else if (DEBUG_KEYS[k]) triggerDebugMotion(DEBUG_KEYS[k]);
  }
  keysDown[k] = true;
});
window.addEventListener('keyup', function(e){
  var k = (e.key || '').toLowerCase();
  keysDown[k] = false;
  /* M released: throw the javelin at whatever stage it charged to */
  if (k === 'm') fireJavelin();
  /* K released before the CS threshold = a single-shot tap (in the
     air, an air shot); a hold that already fired does nothing */
  if (k === 'k' && kHeld){
    if (!kHeld.used) tryAttack('shot');
    kHeld = null;
  }
});
window.addEventListener('blur', function(){ keysDown = {}; lastTap = {}; jumpHeldBtn = false; javHeld = null; dpadClear(); });

/* on-screen cross key (D-pad), bottom-left: four semi-transparent
   direction buttons in a plus layout — the touch counterpart of
   the gamepad's D-pad in the VS layout. Held directions feed the
   shared joyVec, so camera-relative steering and speed behave
   exactly like the other inputs, and two buttons held together
   give diagonals. A quick double-tap of one direction steps that
   way (or air-dashes when airborne), mirroring the keyboard and
   the physical pad. */
var dpadHeld = {};
var dpTapDirName = null, dpTapTime = 0;
function dpadSync(){
  var ix = (dpadHeld.r ? 1 : 0) - (dpadHeld.l ? 1 : 0);
  var iy = (dpadHeld.b ? 1 : 0) - (dpadHeld.f ? 1 : 0);
  joyVec.x = ix; joyVec.y = iy;
  joyVec.active = (ix !== 0 || iy !== 0);
}
function dpadTapDirection(dir){
  var now = performance.now();
  if (dpTapDirName === dir && now - dpTapTime < 300){
    dpTapDirName = null; dpTapTime = 0;
    if (isAirborne()) tryAirDash();
    else tryStep(dir);
  } else {
    dpTapDirName = dir; dpTapTime = now;
  }
}
function dpadClear(){
  dpadHeld = {};
  document.querySelectorAll('#dpad .dbtn.on').forEach(function(el){ el.classList.remove('on'); });
  dpadSync();
}
document.querySelectorAll('#dpad .dbtn').forEach(function(el){
  var dir = el.getAttribute('data-dir');
  el.addEventListener('pointerdown', function(e){
    e.preventDefault();
    ensureSfx();
    if (el.setPointerCapture){ try { el.setPointerCapture(e.pointerId); } catch(err){} }
    dpadHeld[dir] = true;
    el.classList.add('on');
    dpadSync();
    dpadTapDirection(dir);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function(ev){
    el.addEventListener(ev, function(){
      if (!dpadHeld[dir]) return;
      dpadHeld[dir] = false;
      el.classList.remove('on');
      dpadSync();
    });
  });
  el.addEventListener('contextmenu', function(e){ e.preventDefault(); });
});

/* ================= physical gamepad (VS layout) =================
   Standard-mapping gamepad, polled once per frame, following the
   Gundam VS layout: left stick / D-pad move, A jumps, B shoots
   (tap = single shot, hold = CS burst, mirroring the K key through
   the shared kHeld state), RB is the sub shot (鰤バズーカ), LT the
   special shot (鰤ジャベリン: hold to charge, release to throw),
   Y melee, RT the special melee (upper), the
   right-stick click fires the finisher (the extreme-burst slot),
   and START toggles free mode. X switches the lock-on target to
   its right neighbour on the azimuth ring (and locks on when
   unlocked), a right-stick flick switches directionally across
   the 0.55 deadzone, and LB releases the lock. Double-tapping a direction —
   D-pad presses or quick stick flicks — steps, or air-dashes when
   airborne, like the keyboard's double-tap. */
var padVec = { x:0, y:0, active:false };
var padPrev = [];
var padAwkComboPrev = false;   // L3+R3 both held last poll (awakening combo edge)
var padRsX = 0;   // previous right-stick X, for flick detection
var padJumpHeld = false;
var padFlickDir = null, padTapDirName = null, padTapTime = 0;
var padStatusEl = document.getElementById('padstatus');
/* navigator.getGamepads() throws a SecurityError (not just absent)
   when the embedding frame's Permissions Policy disallows the
   "gamepad" feature — e.g. inside a sandboxed preview iframe.
   Defence is layered, so the denial can never reach the red error
   banner: (1) padPolicyAllows() asks the policy first and the API
   is never called at all when the frame disallows it; (2) every
   remaining call goes through safeGetGamepads(), whose try/catch
   marks the API blocked on the first throw and stops polling
   cleanly; (3) the global error handlers at the top of this script
   recognise any gamepad policy error that still slips through and
   swallow it via notePolicyError() -> markPadBlocked(). */
var padApiBlocked = padApiBlocked || false;   /* may already be set by the global error filter */
function markPadBlocked(){
  padApiBlocked = true;
  padVec.active = false; padJumpHeld = false;
  if (padStatusEl) padStatusEl.textContent = 'ゲームパッド: この表示環境では利用できません（キーボード／タッチ操作は使えます）';
}
function padPolicyAllows(){
  try {
    var pp = document.permissionsPolicy || document.featurePolicy;
    if (pp && typeof pp.allowsFeature === 'function') return !!pp.allowsFeature('gamepad');
  } catch(e){ /* the policy API itself is best-effort */ }
  return true;   /* unknown -> fall back to the guarded call */
}
function safeGetGamepads(){
  if (padApiBlocked) return null;
  if (!padPolicyAllows()){ markPadBlocked(); return null; }
  try {
    if (!navigator.getGamepads){ markPadBlocked(); return null; }
    return navigator.getGamepads();
  } catch(e){
    markPadBlocked();
    return null;
  }
}
function setPadStatus(){
  if (!padStatusEl || padApiBlocked) return;
  var gps = safeGetGamepads();
  if (!gps) return;
  var name = '';
  for (var i = 0; i < gps.length; i++){ if (gps[i]){ name = gps[i].id; break; } }
  padStatusEl.textContent = name
    ? 'ゲームパッド接続中: ' + name.replace(/\s+/g, ' ').slice(0, 64)
    : 'ゲームパッド: 未接続（つなぐと上の配置でそのまま遊べます）';
}
window.addEventListener('gamepadconnected', setPadStatus);
window.addEventListener('gamepaddisconnected', setPadStatus);
setPadStatus();
/* Live pad feedback, driven from the poll loop: the
   gamepadconnected event fires only on the first button press
   after page load and is missed entirely in some embeds, so the
   status line also follows whatever the poll actually sees.
   The echo of the currently actuated buttons / sticks is the
   on-screen proof that pad input is arriving at all. */
var padLiveId = null, padLiveText = '';
var PAD_BTN_LABELS = ['A','B','X','Y','LB','RB','LT','RT','Back','START','L3','R3','十字↑','十字↓','十字←','十字→'];
function padLiveUpdate(gp, standard, pressed){
  if (!padStatusEl || padApiBlocked) return;
  var head = 'ゲームパッド接続中: ' + gp.id.replace(/\s+/g, ' ').slice(0, 56)
    + (standard ? '' : '（DirectInput配置で読み替え中）');
  var acts = [];
  for (var n = 0; n < 16; n++){ if (pressed(n)) acts.push(PAD_BTN_LABELS[n]); }
  if (gp.axes.length >= 2 && Math.hypot(gp.axes[0], gp.axes[1]) > 0.3) acts.push('左スティック');
  if (gp.axes.length >= 4 && Math.hypot(gp.axes[2], gp.axes[3]) > 0.3) acts.push('右スティック');
  var txt = head + (acts.length ? ' ｜ 入力中: ' + acts.join('・') : ' ｜ ボタンを押すとここに表示されます');
  if (txt !== padLiveText){ padLiveText = txt; padStatusEl.textContent = txt; }
  padLiveId = gp.id;
}
function padLiveClear(){
  if (!padLiveId) return;
  padLiveId = null; padLiveText = '';
  if (padStatusEl && !padApiBlocked)
    padStatusEl.textContent = 'ゲームパッド: 未接続（つなぐと上の配置でそのまま遊べます）';
}
function padTapDirection(dir){
  var now = performance.now();
  if (padTapDirName === dir && now - padTapTime < 300){
    padTapDirName = null; padTapTime = 0;
    if (isAirborne()) tryAirDash();
    else tryStep(dir);
  } else {
    padTapDirName = dir; padTapTime = now;
  }
}
function pollGamepad(){
  if (padApiBlocked) return;
  var gps = safeGetGamepads();
  if (!gps) return;
  var gp = null;
  for (var i = 0; i < gps.length; i++){
    if (gps[i] && gps[i].connected){ gp = gps[i]; break; }
  }
  if (!gp){ padVec.active = false; padJumpHeld = false; padLiveClear(); return; }
  var b = gp.buttons;
  /* Non-standard mapping (a DirectInput pad — e.g. a Logitech
     F310 with its back switch on "D"): the face buttons arrive
     in PlayStation order [X, A, B, Y] instead of the standard
     [A, B, X, Y], so rotate them back into standard slots.
     Every other index (shoulders, triggers, Back/START, stick
     clicks, D-pad) already lines up with the standard layout. */
  var gpStandard = (gp.mapping === 'standard');
  var nb = b;
  if (!gpStandard && b.length >= 4){
    nb = b.slice();
    nb[0] = b[1]; nb[1] = b[2]; nb[2] = b[0]; nb[3] = b[3];
  }
  function pressed(n){ var btn = nb[n]; return !!(btn && (btn.pressed || btn.value > 0.35)); }
  function edge(n){ return pressed(n) && !padPrev[n]; }
  padLiveUpdate(gp, gpStandard, pressed);
  /* title screen: any pad button is PRESS START. Result screens:
     gameplay input stays inert until the retry (button / Enter). */
  if (typeof missionState !== 'undefined' &&
      (missionState === 'title' || missionState === 'clear' || missionState === 'fail')){
    var anyPadEdge = false;
    for (var pq = 0; pq < Math.min(16, b.length); pq++) if (edge(pq)) anyPadEdge = true;
    if (anyPadEdge && missionState === 'title'){ ensureSfx(); startMission(); }
    for (var pn = 0; pn < b.length; pn++) padPrev[pn] = pressed(pn);
    padJumpHeld = false;
    padVec.active = false;
    return;
  }
  if (edge(9)) setFreeMode(!freeMode);   /* START */
  if (freeMode){
    if (edge(0)) tryJump();                                  /* A: jump / flight */
    if (edge(3)) tryAttack('melee');                         /* Y: 格闘 */
    if (edge(2)) lockSwitchRequest(1);                       /* X: ターゲット切替え（右隣） */
    if (edge(4)) lockRelease('manual');                      /* LB: ロック解除 */
    if (edge(7)) tryAttack('upper');                         /* RT: 特殊格闘 */
    if (edge(5)) tryAttack('sub');                           /* RB: サブ射撃・鰤バズーカ */
    /* L3+R3 together fires the 覚醒 — checked before R3's solo
       必殺 so the combo wins when both clicks land in one poll */
    var awkCombo = pressed(10) && pressed(11);
    if (awkCombo && !padAwkComboPrev) tryAwaken();
    padAwkComboPrev = awkCombo;
    if (edge(11) && !awkCombo) tryAttack('chop');            /* R3: 必殺 */
    if (edge(6)) startJavelinCharge();                       /* LT: 特殊射撃（押してチャージ） */
    if (!pressed(6) && padPrev[6]) fireJavelin();            /* LT: 離して鰤ジャベリン投擲 */
    /* B mirrors the K key: the press starts the shared hold timer,
       and releasing early fires the tap shot */
    if (edge(1) && !kHeld) kHeld = { t: lastT, used: false };
    if (!pressed(1) && padPrev[1] && kHeld){
      if (!kHeld.used) tryAttack('shot');
      kHeld = null;
    }
    if (edge(12)) padTapDirection('f');
    if (edge(13)) padTapDirection('b');
    if (edge(14)) padTapDirection('l');
    if (edge(15)) padTapDirection('r');
  }
  padJumpHeld = pressed(0);
  /* movement vector: the D-pad wins, otherwise the left stick */
  var dx = 0, dy = 0;
  if (pressed(14)) dx -= 1;
  if (pressed(15)) dx += 1;
  if (pressed(12)) dy += 1;
  if (pressed(13)) dy -= 1;
  if (dx === 0 && dy === 0 && gp.axes.length >= 2){
    var ax = gp.axes[0], ay = gp.axes[1];
    if (Math.hypot(ax, ay) > 0.18){ dx = ax; dy = -ay; }
  }
  padVec.x = dx; padVec.y = dy; padVec.active = (dx !== 0 || dy !== 0);
  /* quick stick flicks feed the same double-tap step / air dash */
  if (freeMode && gp.axes.length >= 2){
    var sx = gp.axes[0], sy = gp.axes[1];
    var dir = null;
    if (Math.hypot(sx, sy) > 0.72){
      dir = Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 'r' : 'l') : (sy > 0 ? 'b' : 'f');
    }
    if (dir && dir !== padFlickDir) padTapDirection(dir);
    padFlickDir = dir;
  } else padFlickDir = null;
  /* right-stick flicks switch the lock-on target directionally:
     crossing the 0.55 deadzone is the flick (switchDeadzone) */
  if (freeMode && gp.axes.length >= 4){
    var rsx = gp.axes[2];
    if (padRsX <= 0.55 && rsx > 0.55) lockSwitchRequest(1);
    else if (padRsX >= -0.55 && rsx < -0.55) lockSwitchRequest(-1);
    padRsX = rsx;
  }
  for (var n = 0; n < b.length; n++) padPrev[n] = pressed(n);
}

function updateFreeMove(dt){
  if (!model) return;

  /* K long-press: crossing the hold threshold fires the CS —
     the 3-round burst (ground only, and not while another
     one-shot is playing) */
  if (kHeld && !kHeld.used && lastT - kHeld.t >= 0.5){
    kHeld.used = true;
    if (!isAirborne() && !(motion && !motionFading && !LOCO[motion.name])){
      if (!lockTarget) lockAcquire('manual');
      faceLockTarget();
      startMotion('burst');
    }
  }

  /* prop hit detection for the current attack motion */
  updateAttackHits();

  /* ---- boost gauge: regen on the ground after a short delay ---- */
  var boostingNow = !!(motion && motion.name === 'boostdash' && !motionFading);
  if (!flying && !boostingNow && model.position.y <= 0.001 && lastT - boostUsedT > 0.45 && boost < 100){
    boost = Math.min(100, boost + 40 * dt);
  }
  if (boostHot && boost >= 35) boostHot = false;
  if (boostFillEl){
    boostFillEl.style.width = boost.toFixed(0) + '%';
    boostBarEl.classList.toggle('hot', boostHot);
    boostBarEl.classList.toggle('low', !boostHot && boost < 30);
  }

  /* ---- boost flight physics ----
     While the plain jump / air-dash motions play, they own the
     vertical axis (their root offsets are the height). Otherwise
     flight and gravity integrate model.position.y here. */
  var jumpOwnsY = !!(motion && (motion.name === 'jump' || motion.name === 'airdash') && !motionFading);
  if (!jumpOwnsY){
    if (flying){
      var ascend = !!(keysDown[' '] || jumpHeldBtn || padJumpHeld);
      if (!drainBoost(ascend ? 36 : 22, dt)) flying = false;
      if (flying){
        var vyT = ascend ? 2.3 : -0.12;
        vy += (vyT - vy) * Math.min(1, dt * 5);
        model.position.y += vy * dt;
        if (model.position.y > 6){ model.position.y = 6; vy = Math.min(vy, 0); }
        if (model.position.y < 0) model.position.y = 0;
        if (!motion) startMotion('fly');
      }
    }
    if (!flying && model.position.y > 0){
      vy -= 7.5 * dt;
      model.position.y += vy * dt;
      if (model.position.y <= 0){
        model.position.y = 0; vy = 0;
        if (motion && motion.name === 'fly') stopMotion();
      }
    }
  }

  /* ---- double-tap step travel: a ~1.15m burst along the tapped
     direction, most of it in the first third of a second ---- */
  if (stepTravel){
    if (!motion || motion.start !== stepTravel.startRef || motionFading){
      stepTravel = null;
    } else {
      var elSt = lastT - stepTravel.t0;
      var pSt = smooth01(Math.min(1, elSt / 0.34));
      var dSt = (pSt - stepTravel.prev) * 1.15;
      stepTravel.prev = pSt;
      if (dSt > 0){
        model.position.x += stepTravel.dx * dSt;
        model.position.z += stepTravel.dz * dSt;
        var rrS = Math.hypot(model.position.x, model.position.z);
        if (rrS > FIELD_R){ model.position.x *= FIELD_R / rrS; model.position.z *= FIELD_R / rrS; }
      }
      if (elSt > 0.55) stepTravel = null;
    }
  }

  /* ---- advancing melee travel: while a melee motion plays, run
     its MELEE_ADVANCE track out as real forward displacement.
     Starting a fresh motion (re)arms the tracker with the stop
     distance to the locked target computed at that moment. ---- */
  if (motion && !motionFading && MELEE_ADVANCE[motion.name]){
    if (!meleeTravel || meleeTravel.startRef !== motion.start){
      var capM = Infinity;
      if (lockTarget && lockAlive(lockTarget)){
        capM = Math.max(0, distToDummy(lockTarget) - 0.85);
      }
      meleeTravel = { startRef: motion.start, prev: 0, cap: capM };
    }
    var cumM = Math.min(trackVal(lastT - motion.start, MELEE_ADVANCE[motion.name]), meleeTravel.cap);
    var dM = cumM - meleeTravel.prev;
    meleeTravel.prev = cumM;
    if (dM > 0){
      model.position.x += Math.sin(charYaw) * dM;
      model.position.z += Math.cos(charYaw) * dM;
      var rrM = Math.hypot(model.position.x, model.position.z);
      if (rrM > FIELD_R){ model.position.x *= FIELD_R / rrM; model.position.z *= FIELD_R / rrM; }
    }
  } else meleeTravel = null;

  /* air dash travel transfer: the airdash motion's root offset
     dashes her forward visually, then glides back to the mark in
     its last 0.15s. Hand that glide-back amount to the model group
     instead, so the dash distance stays as real travel. */
  if (motion && motion.name === 'airdash' && !motionFading){
    var elA = lastT - motion.start;
    var zc = trackVal(elA, [[0,0],[0.14,0.05],[0.5,0.85],[0.8,0.85],[0.95,0]]);
    if (airDashStart === motion.start && elA > 0.8){
      var back = airDashPrevZ - zc;
      if (back > 0){
        model.position.x += Math.sin(charYaw) * back;
        model.position.z += Math.cos(charYaw) * back;
        var rrA = Math.hypot(model.position.x, model.position.z);
        if (rrA > FIELD_R){ model.position.x *= FIELD_R / rrA; model.position.z *= FIELD_R / rrA; }
      }
    }
    airDashStart = motion.start;
    airDashPrevZ = zc;
  } else {
    airDashStart = null;
  }

  /* gather input: keyboard + joystick */
  var iv = inputVec();
  var ix = iv.x, iy = iv.y;
  var mag = Math.hypot(ix, iy);
  var moving = mag > 0.12;
  var joyMag = Math.hypot(joyVec.x, joyVec.y);
  var padMag = Math.hypot(padVec.x, padVec.y);
  var running = !!keysDown['shift'] || (joyVec.active && joyMag > 0.92) || (padVec.active && padMag > 0.92);
  var actionPlaying = !!(motion && !motionFading && !LOCO[motion.name]);
  var boosting = !!(motion && motion.name === 'boostdash' && !motionFading);
  if (boosting && !drainBoost(15, dt)) stopMotion();

  moveSpeedNow = 0;
  if (moving){
    camMoveVec(ix, iy, _mv);
    if (_mv.lengthSq() > 1) _mv.normalize();
    /* face the way she walks (shortest-arc turn) — while locked,
       facing belongs to the lock-on below instead */
    if (!lockTarget || !lockAlive(lockTarget)){
      var targetYaw = Math.atan2(_mv.x, _mv.z);
      var dyaw = targetYaw - charYaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      charYaw += dyaw * Math.min(1, dt * 10);
      model.rotation.y = charYaw;
    }
    /* translate unless a one-shot action (other than jump) owns
       her — the single shot (shot1) is the exception: it is the
       walk-and-shoot weapon, so her feet keep moving under it */
    var mobileShot = !!(motion && motion.name === 'shot1' && !motionFading);
    if (!actionPlaying || motion.name === 'jump' || mobileShot){
      var speed = boosting ? 6.8 : (flying ? 5.4 : (running ? 4.3 : 1.7));
      moveSpeedNow = speed * Math.min(1, mag);
      model.position.addScaledVector(_mv, speed * dt * Math.min(1, mag));
      var rr = Math.hypot(model.position.x, model.position.z);
      if (rr > FIELD_R){
        model.position.x *= FIELD_R / rr;
        model.position.z *= FIELD_R / rr;
      }
    }
  }

  /* while locked she keeps facing the target (VS-style): movement
     stays camera-relative, her body tracks the locked dummy */
  if (lockTarget && lockAlive(lockTarget) && !killHold){
    var lYaw = Math.atan2(lockTarget.x - model.position.x, lockTarget.z - model.position.z);
    var lDy = wrapPi(lYaw - charYaw);
    charYaw += lDy * Math.min(1, dt * 7);
    model.rotation.y = charYaw;
  }

  /* drive the locomotion motions. Boost dash owns locomotion while
     it is on: input just steers and propels her at boost speed, and
     it keeps looping when input stops until toggled off or an
     action replaces it. */
  if (!actionPlaying && !boosting && !flying && model.position.y <= 0.02){
    if (moving){
      var want = running ? 'run' : 'walk';
      if (!motion || motionFading || motion.name !== want) startMotion(want);
    } else if (motion && LOCO[motion.name] && motion.name !== 'jump'){
      stopMotion();
    }
  }

  /* camera follow: glide the orbit target with her, keeping the
     camera's relative offset (skipped while a preset flight runs).
     During KILL_HOLD the camera stops dead; while locked, the
     lock-on camera layers yaw follow / pitch / back-off on top. */
  if (!camAnim){
    if (!killHold){
      _want.set(model.position.x, 0.92 + model.position.y * 0.85, model.position.z);
      var fk = Math.min(1, dt * 6);
      var ddx = (_want.x - controls.target.x) * fk;
      var ddy = (_want.y - controls.target.y) * fk;
      var ddz = (_want.z - controls.target.z) * fk;
      controls.target.x += ddx; controls.target.y += ddy; controls.target.z += ddz;
      camera.position.x += ddx; camera.position.y += ddy; camera.position.z += ddz;
    }
    updateLockCamera(dt);
  }

  freeInfoT += dt;
  if (posInfoEl && freeInfoT > 0.15){
    freeInfoT = 0;
    posInfoEl.textContent = '位置: ' + model.position.x.toFixed(1) + ', ' + model.position.z.toFixed(1) +
      (moving ? (boosting ? '（ブースト中）' : (running ? '（走行中）' : '（歩行中）')) : (isAirborne() ? '（空中）' : '')) +
      ' ／ 破壊: ' + destroyedCount + ' ／ ダミー撃破: ' + dummyDowns +
      (lockTarget && lockAlive(lockTarget) ? ' ／ ロック中: ' + lockTarget.name + '（' + lockDistNow.toFixed(1) + 'm）' : '');
    if (typeof updateGameHud === 'function') updateGameHud();
  }
}

/* ================= animation ================= */
var D2R = Math.PI / 180;
var tmpQ = new THREE.Quaternion();
var tmpE = new THREE.Euler();
function setBoneOffset(name, xDeg, yDeg, zDeg){
  var b = bones[name]; if (!b) return;
  tmpE.set(xDeg * D2R, yDeg * D2R, zDeg * D2R);
  tmpQ.setFromEuler(tmpE);
  b.obj.quaternion.copy(b.rest).multiply(tmpQ);
}


/* ---- procedural motions ----
   Bone-local axes for this rig (checked against the model's bone data):
   torso/legs/feet pitch forward/back around local X (legs: -X = forward
   swing, lower leg +X = knee bend, foot +X = toes down); upper arms
   raise/lower around local X like the pose sliders, and swing forward
   (-Z = forward on the left, +Z on the right). Every helper silently
   skips a bone the model does not have. */
var tmpQ2 = new THREE.Quaternion();
function blendBoneOffset(name, xDeg, yDeg, zDeg, w){
  var b = bones[name]; if (!b) return;
  tmpE.set(xDeg * D2R, yDeg * D2R, zDeg * D2R);
  tmpQ.setFromEuler(tmpE);
  tmpQ2.copy(b.rest).multiply(tmpQ);
  b.obj.quaternion.slerp(tmpQ2, w);
}
function gauss(x, c, w){ var d = (x - c) / w; return Math.exp(-d * d); }
function smooth01(x){ x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); }
function easeInOut(x){ x = Math.min(1, Math.max(0, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; }
/* keyframe track for the sword motions: [[seconds, value], ...] with
   smoothstep interpolation between keys */
function trackVal(el, keys){
  if (el <= keys[0][0]) return keys[0][1];
  for (var i = 1; i < keys.length; i++){
    if (el <= keys[i][0]){
      var k = smooth01((el - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]));
      return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * k;
    }
  }
  return keys[keys.length - 1][1];
}

function applyMotion(t){
  var el = t - motion.start;
  var w = motionW;
  var name = motion.name;

  if (name === 'walk'){
    /* in-place walk cycle: legs alternate, knees bend on the swing-through,
       arms swing against the legs, body bobs twice per cycle, slight lean */
    var ph = el * (Math.PI * 2 / 1.15);
    var s = Math.sin(ph), c = Math.cos(ph);
    var legL = -26 * s, legR = 26 * s;
    var kneeL = 4 + 32 * Math.pow(Math.max(0, c), 1.5);
    var kneeR = 4 + 32 * Math.pow(Math.max(0, -c), 1.5);
    blendBoneOffset('leftUpperLeg', legL, 0, 0, w);
    blendBoneOffset('rightUpperLeg', legR, 0, 0, w);
    blendBoneOffset('leftLowerLeg', kneeL, 0, 0, w);
    blendBoneOffset('rightLowerLeg', kneeR, 0, 0, w);
    blendBoneOffset('leftFoot', -legL * 0.45 + 12 * Math.max(0, -s) - 4 * Math.max(0, c), 0, 0, w);
    blendBoneOffset('rightFoot', -legR * 0.45 + 12 * Math.max(0, s) - 4 * Math.max(0, -c), 0, 0, w);
    blendBoneOffset('leftUpperArm', -68, 0, 13 * s, w);
    blendBoneOffset('rightUpperArm', -68, 0, 13 * s, w);
    blendBoneOffset('leftLowerArm', 0, 0, -(13 + 5 * s), w);
    blendBoneOffset('rightLowerArm', 0, 0, (13 - 5 * s), w);
    blendBoneOffset('spine', 4.5, 0, 0, w);
    blendBoneOffset('chest', 3, 0, 0, w);
    blendBoneOffset('neck', -3, 2 * s, 0, w);
    blendBoneOffset('head', -4, 2.5 * s, 0, w);
    blendBoneOffset('hips', 0, 3.5 * s, 2 * s, w);
    if (bones.hips) bones.hips.obj.position.y += (-0.014 + 0.011 * Math.cos(2 * ph)) * w;
  }
  else if (name === 'idle'){
    /* gentle idle: slow breathing and sway of chest, shoulders and head */
    var br = Math.sin(el * 1.5), sw = Math.sin(el * 0.55);
    blendBoneOffset('chest', 1.8 * br, 0, 0, w);
    blendBoneOffset('spine', 0.9 * br, 0, 0.6 * sw, w);
    blendBoneOffset('neck', 0.8 * br, 1.5 * sw, 0, w);
    blendBoneOffset('head', 1.2 * br, 3 * sw, 1.3 * Math.sin(el * 0.8), w);
    blendBoneOffset('leftUpperArm', -70, 0, 1.6 * Math.sin(el * 0.9), w);
    blendBoneOffset('rightUpperArm', -70, 0, 1.6 * Math.sin(el * 0.9 + 1.2), w);
    blendBoneOffset('leftLowerArm', 0, 0, -10, w);
    blendBoneOffset('rightLowerArm', 0, 0, 10, w);
    blendBoneOffset('leftUpperLeg', 0, 0, 0, w);
    blendBoneOffset('rightUpperLeg', 0, 0, 0, w);
    blendBoneOffset('leftLowerLeg', 2, 0, 0, w);
    blendBoneOffset('rightLowerLeg', 2, 0, 0, w);
    blendBoneOffset('leftFoot', 0, 0, 0, w);
    blendBoneOffset('rightFoot', 0, 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips) bones.hips.obj.position.y += 0.004 * br * w;
  }
  else if (name === 'jump'){
    /* ジャンプ (rebuilt, about 0.9s) — a real jump's four beats instead
       of a body that merely bobs up and down:
       0.00-0.16 anticipation crouch (knees and hips sink, arms swing
       back), 0.16-0.30 extension (legs drive, arms swing forward-up,
       body stretches), 0.30-0.68 airborne on a parabola (which slows
       at the top on its own) with the front knee tucked up and the
       back leg trailing, the sword arm lagging a beat behind the rise,
       0.68-0.80 touch-down into a deep absorb, then recover by 0.90. */
    if (el >= 0.9){ stopMotion(); return; }
    var airT = Math.min(1, Math.max(0, (el - 0.30) / 0.38));
    var airY = (el > 0.30 && el < 0.68) ? 0.30 * 4 * airT * (1 - airT) : 0;
    var tuck = (el > 0.30 && el < 0.68) ? Math.sin(airT * Math.PI) : 0;
    var jKnee = trackVal(el, [[0,2],[0.16,55],[0.3,6],[0.5,10],[0.68,14],[0.78,48],[0.9,2]]);
    blendBoneOffset('rightUpperLeg', trackVal(el, [[0,0],[0.16,-30],[0.3,-3],[0.68,-8],[0.78,-26],[0.9,0]]) - 42 * tuck, 0, 0, w);
    blendBoneOffset('leftUpperLeg', trackVal(el, [[0,0],[0.16,-30],[0.3,-3],[0.68,-8],[0.78,-26],[0.9,0]]) + 20 * tuck, 0, 0, w);
    blendBoneOffset('rightLowerLeg', jKnee + 55 * tuck, 0, 0, w);
    blendBoneOffset('leftLowerLeg', jKnee + 18 * tuck, 0, 0, w);
    blendBoneOffset('rightFoot', trackVal(el, [[0,0],[0.16,-24],[0.3,4],[0.68,8],[0.78,-20],[0.9,0]]) + 10 * tuck, 0, 0, w);
    blendBoneOffset('leftFoot', trackVal(el, [[0,0],[0.16,-24],[0.3,4],[0.68,8],[0.78,-20],[0.9,0]]) + 22 * tuck, 0, 0, w);
    /* arms: swing back in the crouch, drive up on extension; in the air
       the left arm stays up while the sword arm trails lower, dragged
       by the fish's weight, then both come forward for the landing */
    var jArmX = trackVal(el, [[0,-70],[0.16,-84],[0.3,22],[0.5,16],[0.68,-6],[0.78,-38],[0.9,-70]]);
    blendBoneOffset('leftUpperArm', jArmX + 14 * tuck, 0, trackVal(el, [[0,0],[0.16,10],[0.3,-6],[0.78,4],[0.9,0]]), w);
    blendBoneOffset('rightUpperArm', jArmX - 26 * tuck, 0, trackVal(el, [[0,5],[0.16,-10],[0.3,6],[0.78,-4],[0.9,5]]), w);
    blendBoneOffset('leftLowerArm', 0, 0, trackVal(el, [[0,-10],[0.3,-16],[0.78,-12],[0.9,-10]]), w);
    blendBoneOffset('rightLowerArm', 0, 0, trackVal(el, [[0,10],[0.3,20],[0.78,14],[0.9,10]]), w);
    blendBoneOffset('spine', trackVal(el, [[0,0],[0.16,10],[0.3,-2],[0.5,0],[0.68,4],[0.78,12],[0.9,0]]), 0, 0, w);
    blendBoneOffset('chest', trackVal(el, [[0,0],[0.16,5],[0.3,-1],[0.78,6],[0.9,0]]), 0, 0, w);
    blendBoneOffset('neck', trackVal(el, [[0,0],[0.16,-4],[0.3,2],[0.78,-5],[0.9,0]]), 0, 0, w);
    blendBoneOffset('head', trackVal(el, [[0,0],[0.16,-6],[0.3,3],[0.5,2],[0.78,-7],[0.9,0]]), 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += (airY + trackVal(el, [[0,0],[0.16,-0.075],[0.3,0],[0.68,0],[0.78,-0.06],[0.9,0]])) * w;
    }
  }
  else if (name === 'run'){
    /* 走る (loop): a ~2.5 steps/s cycle with a real flight phase — both
       feet leave the ground each stride. Torso leans ~10° into it, the
       left arm pumps hard, and the sword arm trails behind her with the
       fish streaming back, bobbing only a little. Head stays level. */
    var rp = el * (Math.PI * 2 / 0.4);
    var rs = Math.sin(rp), rc = Math.cos(rp);
    var rLegL = -38 * rs, rLegR = 38 * rs;
    var rKneeL = 6 + 58 * Math.pow(Math.max(0, rc), 1.4);
    var rKneeR = 6 + 58 * Math.pow(Math.max(0, -rc), 1.4);
    blendBoneOffset('leftUpperLeg', rLegL, 0, 0, w);
    blendBoneOffset('rightUpperLeg', rLegR, 0, 0, w);
    blendBoneOffset('leftLowerLeg', rKneeL, 0, 0, w);
    blendBoneOffset('rightLowerLeg', rKneeR, 0, 0, w);
    blendBoneOffset('leftFoot', -rLegL * 0.4 + 16 * Math.max(0, -rs) - 6 * Math.max(0, rc), 0, 0, w);
    blendBoneOffset('rightFoot', -rLegR * 0.4 + 16 * Math.max(0, rs) - 6 * Math.max(0, -rc), 0, 0, w);
    blendBoneOffset('leftUpperArm', -66 + 6 * rc, 0, 30 * rs, w);
    blendBoneOffset('leftLowerArm', 0, 0, -(52 + 12 * rs), w);
    /* sword arm held back and low, pumping only slightly against the legs */
    blendBoneOffset('rightUpperArm', -58 + 3 * rc, 0, -20 - 7 * rs, w);
    blendBoneOffset('rightLowerArm', 0, 0, 34 - 5 * rs, w);
    blendBoneOffset('rightHand', -6, 0, 0, w);
    blendBoneOffset('spine', 10, 0, 0, w);
    blendBoneOffset('chest', 6, 2.5 * rs, 0, w);
    blendBoneOffset('neck', -4, 0, 0, w);
    blendBoneOffset('head', -6, 0, 0, w);
    blendBoneOffset('hips', 0, 3 * rs, 2.5 * rs, w);
    if (bones.hips) bones.hips.obj.position.y += (-0.012 + 0.026 * Math.abs(Math.sin(rp))) * w;
  }
  else if (name === 'wave'){
    /* one-shot: raise the right arm, wave a few times, lower it (about 3.2s) */
    if (el >= 3.2){ stopMotion(); return; }
    var e = smooth01(el / 0.45) * (1 - smooth01((el - 2.6) / 0.6));
    var wob = Math.sin((el - 0.45) * Math.PI * 2 * 1.7);
    blendBoneOffset('rightUpperArm', -70 - 26 * e + 4 * wob * e, 0, 0, w);
    blendBoneOffset('rightLowerArm', 0, 0, 10 + (16 + 22 * wob) * e, w);
    blendBoneOffset('leftUpperArm', -70, 0, 0, w);
    blendBoneOffset('leftLowerArm', 0, 0, -10, w);
    blendBoneOffset('head', 0, -5 * e, 5 * e, w);
    blendBoneOffset('neck', 0, -2 * e, 2 * e, w);
    blendBoneOffset('spine', 0, 0, 1.5 * e, w);
    blendBoneOffset('chest', 0, 0, 0, w);
    blendBoneOffset('leftUpperLeg', 0, 0, 0, w);
    blendBoneOffset('rightUpperLeg', 0, 0, 0, w);
    blendBoneOffset('leftLowerLeg', 0, 0, 0, w);
    blendBoneOffset('rightLowerLeg', 0, 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
  }
  else if (name === 'chop'){
    /* 必殺・真っ向唐竹割り v3 (REDONE, about 2.6s) — the user rejected
       v2 wholesale ("全体的に違う") and asked for 外連味: kabuki-style
       showmanship. So this is built as 静と動 — big showy stillness
       against one explosive drop — NOT a textbook kendo men strike.
       Everything stays on her FRONT centerline (hips yaw = 0 the whole
       time, per the new front-facing rule for attacks).
       0.00-0.35  she rises up, right arm lifting the fish overhead.
       0.35-0.95  見せ回し: the fish TWIRLS one full turn overhead in
                  her right hand (propeller show-off), left arm spread
                  wide for balance and flair.
       0.95-1.45  両手で頭上後方へ深く振りかぶり、体を反らせる —
                  then the 見得: a bold FREEZE at the top (flat keys
                  1.15-1.45), chin up, staring down the front.
       1.45-1.62  踏み込み: one big ~0.35m stamp step straight forward,
                  the whole body sinking as the foot lands.
       1.62-1.82  振り下ろし: a huge whole-body arc (spine bows like a
                  bow), the fish overshooting to near floor level.
       1.82-2.00  long hit-stop (0.18s, flat keys) with a small impact
                  tremble in the root.
       2.00-2.25  決め: hold at the bottom, chin lifted,堂々.
       2.25-2.60  余韻: she hauls the fish up onto her shoulder
                  (担ぎ) as a show-off beat, then settles to stand. */
    if (el >= 2.6){ stopMotion(); return; }
    /* twirl: a true 360° spin of the fish in the raised right hand.
       Written directly onto the hand bone AFTER the blends below,
       because quaternion slerping takes the shortest path and would
       spin it backwards. 360° == 0° at the end, so it hands back to
       the normal windup keys seamlessly. */
    var twirlDeg = 0, twirling = false;
    if (el > 0.35 && el <= 0.95){ twirlDeg = 360 * easeInOut((el - 0.35) / 0.6); twirling = true; }
    else if (el > 0.95 && el < 1.05){ twirlDeg = 360; twirling = true; }
    blendBoneOffset('rightUpperArm',
      trackVal(el, [[0,-70],[0.35,55],[0.95,62],[1.15,78],[1.45,78],[1.62,70],[1.82,-64],[2.0,-64],[2.25,-58],[2.42,32],[2.6,-70]]), 0,
      trackVal(el, [[0,5],[0.35,-18],[0.95,-20],[1.15,-24],[1.45,-24],[1.62,-16],[1.82,10],[2.0,10],[2.25,6],[2.42,-26],[2.6,5]]), w);
    blendBoneOffset('rightLowerArm', 0, 0, trackVal(el, [[0,15],[0.35,20],[0.95,10],[1.15,8],[1.45,8],[1.82,12],[2.0,12],[2.6,15]]), w);
    blendBoneOffset('rightHand',
      trackVal(el, [[0,0],[0.35,0],[1.15,7],[1.45,7],[1.82,0],[2.6,0]]), 0,
      trackVal(el, [[0,0],[1.15,-7],[1.45,-7],[1.82,0],[2.6,0]]), w);
    if (twirling && bones.rightHand){
      tmpE.set(twirlDeg * D2R, 0, trackVal(el, [[0,0],[0.35,-14],[1.05,-7]]) * D2R);
      tmpQ.setFromEuler(tmpE);
      tmpQ2.copy(bones.rightHand.rest).multiply(tmpQ);
      bones.rightHand.obj.quaternion.slerp(tmpQ2, Math.max(w, 0.85));
    }
    /* left arm: spread wide during the twirl (flair), joins the grip
       for the windup, drives down with the chop, lifts in the carry */
    blendBoneOffset('leftUpperArm',
      trackVal(el, [[0,-72],[0.35,-30],[0.65,-38],[0.95,40],[1.15,62],[1.45,62],[1.62,52],[1.82,-46],[2.0,-46],[2.25,-40],[2.42,-8],[2.6,-72]]), 0,
      trackVal(el, [[0,-6],[0.35,-38],[0.65,-42],[0.95,-20],[1.45,-22],[1.82,10],[2.0,10],[2.42,-16],[2.6,-6]]), w);
    blendBoneOffset('leftLowerArm', 0, 0, trackVal(el, [[0,-14],[0.35,-24],[0.95,-28],[1.45,-30],[1.82,-12],[2.0,-12],[2.42,-20],[2.6,-14]]), w);
    /* torso: arch BACK for the mie, bow hard forward for the drop,
       then chin-up at the kime despite the bowed body (showmanship) */
    var nSpn = trackVal(el, [[0,0],[0.35,-4],[0.95,-10],[1.15,-16],[1.45,-16],[1.62,-8],[1.82,22],[1.88,27],[2.0,22],[2.25,18],[2.42,2],[2.6,0]]);
    blendBoneOffset('spine', nSpn, 0, 0, w);
    blendBoneOffset('chest', nSpn * 0.6, 0, 0, w);
    blendBoneOffset('neck', trackVal(el, [[0,0],[0.95,3],[1.45,5],[1.82,-2],[2.25,-4],[2.6,0]]), 0, 0, w);
    blendBoneOffset('head', trackVal(el, [[0,0],[0.95,-6],[1.15,-10],[1.45,-10],[1.62,-4],[1.82,8],[1.88,11],[2.0,8],[2.25,-8],[2.42,-4],[2.6,0]]), 0, 0, w);
    /* legs: soft charge crouch, then the stamp step splits them —
       right leg steps in deep, left leg trails; both hold the kime */
    var nKneeR = trackVal(el, [[0,0],[0.95,10],[1.45,12],[1.62,34],[1.82,38],[2.0,38],[2.25,34],[2.42,14],[2.6,0]]);
    var nKneeL = trackVal(el, [[0,0],[0.95,10],[1.45,12],[1.62,16],[1.82,19],[2.0,19],[2.25,16],[2.6,0]]);
    blendBoneOffset('rightUpperLeg', trackVal(el, [[0,0],[1.45,0],[1.62,-26],[1.82,-30],[2.0,-30],[2.25,-26],[2.6,0]]), 0, 0, w);
    blendBoneOffset('leftUpperLeg', trackVal(el, [[0,0],[1.45,0],[1.62,13],[1.82,15],[2.0,15],[2.25,13],[2.6,0]]), 0, 0, w);
    blendBoneOffset('rightLowerLeg', nKneeR, 0, 0, w);
    blendBoneOffset('leftLowerLeg', nKneeL, 0, 0, w);
    blendBoneOffset('rightFoot', -0.45 * nKneeR, 0, 0, w);
    blendBoneOffset('leftFoot', trackVal(el, [[0,0],[1.62,15],[1.82,17],[2.0,17],[2.6,0]]), 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips){
      var shake = (el > 1.82 && el < 2.0) ? 0.004 * Math.sin((el - 1.82) * 90) * (1 - (el - 1.82) / 0.18) : 0;
      bones.hips.obj.position.y += (trackVal(el, [[0,0],[0.95,-0.02],[1.45,-0.03],[1.62,-0.07],[1.82,-0.075],[2.0,-0.07],[2.25,-0.06],[2.6,0]]) + shake) * w;
      /* the stamp step: straight FORWARD (+Z, her facing) only */
      bones.hips.obj.position.z += trackVal(el, [[0,0],[1.45,0],[1.62,0.35],[1.82,0.35],[2.25,0.35],[2.6,0]]) * w;
    }
  }
  else if (name === 'shot1'){
    /* 鰤ライフル単発 (about 0.75s): the MAIN shot in the new loadout.
       A quick shoulder-and-fire in the burst's aim family, snapped
       in and out around ONE shot at 0.30s. Unlike every other attack
       it does NOT stop her feet: updateFreeMove keeps translating
       while it plays, and when she is moving the legs run the walk
       cycle under the aim pose (phased on the global clock, scaled
       by moveSpeedNow) — the walk-and-shoot weapon. */
    if (el >= 0.75){ stopMotion(); return; }
    var s1Kick = el > 0.30 ? Math.exp(-(el - 0.30) / 0.05) : 0;
    var s1Aim = trackVal(el, [[0,0],[0.14,1],[0.48,1],[0.75,0]]);
    function s1Val(stand, aim){ return stand + (aim - stand) * s1Aim; }
    blendBoneOffset('hips', 0, s1Val(0, -14), 0, w);
    blendBoneOffset('spine', -2.5 * s1Kick, s1Val(0, -5), 0, w);
    blendBoneOffset('chest', -1.5 * s1Kick, s1Val(0, -9), 0, w);
    blendBoneOffset('neck', s1Val(0, 1), s1Val(0, 6), 0, w);
    blendBoneOffset('head', s1Val(0, 3), s1Val(0, 13), s1Val(0, 5), w);
    blendBoneOffset('rightUpperArm', s1Val(-70, -57), 0, s1Val(5, 71), w);
    blendBoneOffset('rightLowerArm', 0, 0, s1Val(15, 85), w);
    blendBoneOffset('rightHand', s1Val(0, -35) + 10 * s1Kick, 0, s1Val(0, -57), w);
    blendBoneOffset('leftUpperArm', s1Val(-72, 9), 0, s1Val(-6, -95), w);
    blendBoneOffset('leftLowerArm', 0, 0, s1Val(-14, -5), w);
    if (moveSpeedNow > 0.05){
      var s1ph = t * (Math.PI * 2 / 1.15);
      var s1s = Math.sin(s1ph), s1c = Math.cos(s1ph);
      var s1amp = Math.min(1, moveSpeedNow / 1.7);
      blendBoneOffset('leftUpperLeg', -26 * s1s * s1amp, 0, 0, w);
      blendBoneOffset('rightUpperLeg', 26 * s1s * s1amp, 0, 0, w);
      blendBoneOffset('leftLowerLeg', (4 + 32 * Math.pow(Math.max(0, s1c), 1.5)) * s1amp, 0, 0, w);
      blendBoneOffset('rightLowerLeg', (4 + 32 * Math.pow(Math.max(0, -s1c), 1.5)) * s1amp, 0, 0, w);
      blendBoneOffset('leftFoot', 11.7 * s1s * s1amp, 0, 0, w);
      blendBoneOffset('rightFoot', -11.7 * s1s * s1amp, 0, 0, w);
      if (bones.hips) bones.hips.obj.position.y += 0.011 * Math.cos(2 * s1ph) * s1amp * w;
    } else {
      blendBoneOffset('leftUpperLeg', s1Val(0, -4), 0, 0, w);
      blendBoneOffset('rightUpperLeg', s1Val(0, 3), 0, 0, w);
      blendBoneOffset('leftLowerLeg', s1Val(2, 6), 0, 0, w);
      blendBoneOffset('rightLowerLeg', s1Val(2, 5), 0, 0, w);
      blendBoneOffset('leftFoot', s1Val(0, -3), 0, 0, w);
      blendBoneOffset('rightFoot', s1Val(0, -2), 0, 0, w);
    }
    if (bones.hips) bones.hips.obj.position.z += -0.015 * s1Kick * w;
  }
  else if (name === 'burst'){
    /* 鰤ライフル 3点バースト (new, about 1.8s) — replaces 薙ぎ払い,
       whose horizontal-arc read duplicated the (passing) bat swing.
       The fish is shouldered like an assault rifle: tail (grip) at her
       right shoulder, body level and pointing forward, left hand under
       the belly as a handguard, cheek welded to the body. The aim pose
       was solved against the model's bone data (fish axis pitch ~0°,
       grip hand at shoulder height 1.29m, support hand under the fish).
       0.00-0.35 she blades her torso ~30° and brings the fish up;
       three shots at 0.55 / 0.66 / 0.77 (BURST_SHOTS), each kicking the
       muzzle up a few degrees and shoving her a couple of cm back into
       the shoulder — the third kicks hardest — with a flash sprite on
       the fish's head (see animate()). Aim holds to ~1.15, then she
       lowers the fish and settles back by 1.80. */
    if (el >= 1.8){ stopMotion(); return; }
    var kick = 0;
    for (var bi = 0; bi < BURST_SHOTS.length; bi++){
      var bd = el - BURST_SHOTS[bi];
      if (bd >= 0) kick += BURST_AMPS[bi] * Math.exp(-bd / 0.05);
    }
    var aimIn = [[0,0],[0.35,1],[1.15,1],[1.55,0],[1.8,0]];
    var aimK = trackVal(el, aimIn);
    function aimVal(stand, aim){ return stand + (aim - stand) * aimK; }
    blendBoneOffset('hips', 0, aimVal(0, -16), 0, w);
    blendBoneOffset('spine', -1.5 * kick, aimVal(0, -6), 0, w);
    blendBoneOffset('chest', -1 * kick, aimVal(0, -10), 0, w);
    blendBoneOffset('neck', aimVal(0, 1), aimVal(0, 7), aimVal(0, 3), w);
    /* cheek weld: head turns onto the fish's line and tilts in toward it */
    blendBoneOffset('head', aimVal(0, 3), aimVal(0, 14), aimVal(0, 6), w);
    blendBoneOffset('rightUpperArm', aimVal(-70, -58), 0, aimVal(5, 72), w);
    blendBoneOffset('rightLowerArm', 0, 0, aimVal(15, 85), w);
    /* +hand X is the muzzle-up direction in this grip (checked on the
       bone data), so the recoil kick adds to it */
    blendBoneOffset('rightHand', aimVal(0, -35) + 9 * kick, 0, aimVal(0, -57), w);
    blendBoneOffset('leftUpperArm', aimVal(-72, 9), 0, aimVal(-6, -95), w);
    blendBoneOffset('leftLowerArm', 0, 0, aimVal(-14, -5), w);
    blendBoneOffset('leftUpperLeg', aimVal(0, -4), 0, 0, w);
    blendBoneOffset('rightUpperLeg', aimVal(0, 3), 0, 0, w);
    blendBoneOffset('leftLowerLeg', aimVal(2, 6), 0, 0, w);
    blendBoneOffset('rightLowerLeg', aimVal(2, 5), 0, 0, w);
    blendBoneOffset('leftFoot', aimVal(0, -3), 0, 0, w);
    blendBoneOffset('rightFoot', aimVal(0, -2), 0, 0, w);
    if (bones.hips){
      /* each shot shoves the whole body back a couple of cm (-Z, the
         way she faces is +Z), recovering between shots */
      bones.hips.obj.position.z += -0.02 * kick * w;
      bones.hips.obj.position.y += -0.004 * kick * w;
    }
  }
  else if (name === 'spin'){
    /* 回転斬り (about 1.3s): TWO-HANDED grip the whole time, giant-swing
       style — both arms extended forward holding the fish out in front
       while the whole body spins 360° with the fish swung wide, and a
       slight crouch before and after the spin. The hips Y target is set
       directly (not through blendBoneOffset) so the angle can run
       through a full 2π. */
    if (el >= 1.3){ stopMotion(); return; }
    var sp = Math.min(1, Math.max(0, (el - 0.25) / 0.8));
    var spinDeg = 360 * easeInOut(sp);
    /* the fish is heavy: once the turn lands, its momentum rocks her a
       few degrees past the stop before settling (decaying wobble) */
    if (el > 1.05) spinDeg += 5 * Math.sin((el - 1.05) * 18) * Math.exp(-(el - 1.05) * 6);
    var spKnee = trackVal(el, [[0,0],[0.2,12],[0.5,5],[1.0,6],[1.18,14],[1.3,0]]);
    /* two-handed forward hold (left hand up on the grip, approximating
       the right hand); the fish flares wider mid-spin, pulling her out */
    blendBoneOffset('rightUpperArm', -50, 0, trackVal(el, [[0,30],[0.6,50],[1.3,30]]), w);
    blendBoneOffset('rightLowerArm', 0, 0, 6, w);
    blendBoneOffset('rightHand', -12, 0, 0, w);
    blendBoneOffset('leftUpperArm', -52, 0, -30, w);
    blendBoneOffset('leftLowerArm', 0, 0, -22, w);
    blendBoneOffset('spine', 3, 0, 0, w);
    blendBoneOffset('chest', 2, 0, 0, w);
    blendBoneOffset('neck', 0, 0, 0, w);
    blendBoneOffset('head', -2, 0, 0, w);
    blendBoneOffset('leftUpperLeg', -0.55 * spKnee, 0, 0, w);
    blendBoneOffset('rightUpperLeg', -0.55 * spKnee, 0, 0, w);
    blendBoneOffset('leftLowerLeg', spKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', spKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.45 * spKnee, 0, 0, w);
    blendBoneOffset('rightFoot', -0.45 * spKnee, 0, 0, w);
    if (bones.hips){
      tmpE.set(0, (poseExtraCur.hipsY + spinDeg) * D2R, 0);
      tmpQ.setFromEuler(tmpE);
      tmpQ2.copy(bones.hips.rest).multiply(tmpQ);
      bones.hips.obj.quaternion.slerp(tmpQ2, w);
      bones.hips.obj.position.y += -0.018 * Math.sin(Math.PI * Math.min(1, el / 1.3)) * w;
    }
  }
  else if (name === 'thrust'){
    /* フェンシング突き v3 — FRONT-FACING (about 1.3s). The old version
       stood side-on (hips yaw 55°) and lunged diagonally; the user's
       new rule is that attacks go toward the character's FRONT, so the
       en-garde yaw is gone: hips yaw stays within 18°, the root drives
       straight forward (+Z only, ~0.40m), and she lunges out of a
       left-foot-forward stance like a fencer attacking down the piste
       — which is also how the Gyan actually thrusts. The earlier fix
       is kept: the fish stays LEVEL at chest height the whole way
       (the arm carries the leveling, the wrist mostly yaws). */
    if (el >= 1.3){ stopMotion(); return; }
    var tHipY = trackVal(el, [[0,0],[0.35,16],[0.55,18],[0.9,18],[1.12,10],[1.3,0]]);
    blendBoneOffset('hips', 0, tHipY, 0, w);
    blendBoneOffset('chest', trackVal(el, [[0,0],[0.35,3],[0.55,6],[0.9,6],[1.3,0]]), tHipY * 0.6, 0, w);
    blendBoneOffset('spine', trackVal(el, [[0,0],[0.35,4],[0.55,9],[0.62,11],[0.9,9],[1.12,6],[1.3,0]]), tHipY * 0.25, 0, w);
    /* head counter-yaws so her gaze stays on the front target */
    blendBoneOffset('neck', 0, trackVal(el, [[0,0],[0.35,-9],[0.55,-10],[0.85,-10],[1.3,0]]), 0, w);
    blendBoneOffset('head', -2, trackVal(el, [[0,0],[0.35,-13],[0.55,-14],[0.85,-14],[1.3,0]]), 0, w);
    /* right arm reaches straight out the front: raised forward and
       swung across the centerline, elbow snapping straight at 0.55 */
    blendBoneOffset('rightUpperArm',
      trackVal(el, [[0,-70],[0.35,-16],[0.55,-10],[0.62,-9],[0.9,-10],[1.12,-13],[1.3,-70]]), 0,
      trackVal(el, [[0,5],[0.35,52],[0.55,58],[0.9,58],[1.12,54],[1.3,5]]), w);
    blendBoneOffset('rightLowerArm', 0, 0, trackVal(el, [[0,15],[0.35,18],[0.55,3],[0.9,3],[1.3,15]]), w);
    blendBoneOffset('rightHand', 0, 0,
      trackVal(el, [[0,0],[0.35,-24],[0.55,-14],[0.9,-14],[1.12,-18],[1.3,0]]), w);
    /* left arm trails back along the front axis for balance */
    blendBoneOffset('leftUpperArm',
      trackVal(el, [[0,-72],[0.35,-64],[0.55,-66],[0.85,-66],[1.3,-72]]), 0,
      trackVal(el, [[0,-6],[0.35,20],[0.55,26],[0.85,26],[1.3,-6]]), w);
    blendBoneOffset('leftLowerArm', 0, 0, trackVal(el, [[0,-14],[0.35,-8],[0.85,-8],[1.3,-14]]), w);
    /* left foot forward: front (left) leg bends deep in the lunge,
       back (right) leg straightens out behind onto the toe */
    blendBoneOffset('leftUpperLeg', trackVal(el, [[0,0],[0.35,-24],[0.55,-44],[0.85,-44],[1.3,0]]), 0, 0, w);
    blendBoneOffset('leftLowerLeg', trackVal(el, [[0,0],[0.35,26],[0.55,58],[0.85,58],[1.3,0]]), 0, 0, w);
    blendBoneOffset('leftFoot', trackVal(el, [[0,0],[0.35,-8],[0.55,-15],[0.85,-15],[1.3,0]]), 0, 0, w);
    blendBoneOffset('rightUpperLeg', trackVal(el, [[0,0],[0.35,16],[0.55,30],[0.85,30],[1.3,0]]), 0, 0, w);
    blendBoneOffset('rightLowerLeg', trackVal(el, [[0,0],[0.35,10],[0.55,3],[0.85,3],[1.3,0]]), 0, 0, w);
    blendBoneOffset('rightFoot', trackVal(el, [[0,0],[0.35,6],[0.55,28],[0.85,28],[1.3,0]]), 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += trackVal(el, [[0,0],[0.35,-0.04],[0.55,-0.10],[0.62,-0.108],[0.9,-0.10],[1.12,-0.06],[1.3,0]]) * w;
      /* lunge straight FORWARD along her facing (+Z): no sideways X
         component at all; momentum overshoots a touch at 0.62 and the
         recovery hauls the heavy fish back slowly at first */
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.35,0.02],[0.55,0.40],[0.62,0.43],[0.9,0.40],[1.12,0.24],[1.3,0]]) * w;
    }
  }
  else if (name === 'bat'){
    /* バットフルスイング (new, about 1.3s): baseball stance — body
       side-on, the fish held up on the right shoulder like a bat with
       BOTH hands on the grip, a small step-load coiling the torso;
       then hips and torso rotate hard and the fish swings horizontally
       in one big level arc past the front, wrapping into a full
       follow-through to her left, with a ~0.2m stride toward the
       target. Recover by 1.30. */
    if (el >= 1.3){ stopMotion(); return; }
    /* follow-through overshoots at 1.05s — the fish's momentum wraps
       her past the stop — and the recovery hauls the weight back slow */
    var bHipY = trackVal(el, [[0,0],[0.4,-48],[0.65,55],[0.95,68],[1.05,75],[1.18,42],[1.3,0]]);
    blendBoneOffset('hips', 0, bHipY, 0, w);
    blendBoneOffset('chest', trackVal(el, [[0,0],[0.4,-3],[0.65,5],[0.95,3],[1.3,0]]),
      trackVal(el, [[0,0],[0.4,-54],[0.65,48],[0.95,58],[1.05,64],[1.18,38],[1.3,0]]), 0, w);
    blendBoneOffset('spine', trackVal(el, [[0,0],[0.4,-3],[0.65,5],[0.95,3],[1.3,0]]), bHipY * 0.2, 0, w);
    blendBoneOffset('neck', 0, trackVal(el, [[0,0],[0.4,16],[0.65,-2],[0.95,-4],[1.3,0]]), 0, w);
    blendBoneOffset('head', -2, trackVal(el, [[0,0],[0.4,38],[0.65,-6],[0.95,-12],[1.3,0]]), 0, w);
    /* bat on the right shoulder: right elbow cocked, forearm folded up;
       left hand crosses in to join the grip */
    blendBoneOffset('rightUpperArm',
      trackVal(el, [[0,-70],[0.4,30],[0.65,-20],[0.95,-28],[1.3,-70]]), 0,
      trackVal(el, [[0,5],[0.4,-25],[0.65,80],[0.95,95],[1.05,103],[1.18,58],[1.3,5]]), w);
    blendBoneOffset('rightLowerArm', 0, 0, trackVal(el, [[0,15],[0.4,95],[0.65,10],[0.95,35],[1.05,42],[1.3,15]]), w);
    blendBoneOffset('rightHand', trackVal(el, [[0,0],[0.4,-10],[0.65,-12],[0.95,0],[1.3,0]]), 0, 0, w);
    blendBoneOffset('leftUpperArm',
      trackVal(el, [[0,-72],[0.4,10],[0.65,-15],[0.95,-22],[1.3,-72]]), 0,
      trackVal(el, [[0,-6],[0.4,-35],[0.65,30],[0.95,42],[1.3,-6]]), w);
    blendBoneOffset('leftLowerArm', 0, 0, trackVal(el, [[0,-14],[0.4,-70],[0.65,-25],[0.95,-40],[1.3,-14]]), w);
    var bKnee = trackVal(el, [[0,0],[0.4,12],[0.65,8],[0.95,8],[1.3,0]]);
    blendBoneOffset('leftUpperLeg', -0.55 * bKnee, 0, 0, w);
    blendBoneOffset('rightUpperLeg', -0.55 * bKnee, 0, 0, w);
    blendBoneOffset('leftLowerLeg', bKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', bKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.45 * bKnee, 0, 0, w);
    blendBoneOffset('rightFoot', -0.45 * bKnee, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += trackVal(el, [[0,0],[0.4,-0.02],[0.65,-0.04],[0.95,-0.025],[1.3,0]]) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.4,-0.03],[0.65,0.2],[0.95,0.2],[1.3,0]]) * w;
    }
  }
  else if (name === 'roll'){
    /* 前方ローリング (new, about 1.25s): a forward ukemi roll. She
       dips, tucks chin and knees, pulls the fish in tight to her chest
       (so it never stabs or scrapes the ground), rolls one full turn
       over the shoulder line while the root travels ~1.05m forward,
       lands on her feet in a small crouch, stands — and the root then
       glides back to the mark like the other one-shot motions.
       The hips pitch is set directly (like the spin) so the angle can
       run through a full 360°. */
    if (el >= 1.25){ stopMotion(); return; }
    var rProg = Math.min(1, el / 0.95);
    var rEase = rProg * rProg * rProg * (rProg * (rProg * 6 - 15) + 10);
    var rollDeg = 360 * rEase;
    var rTuck = Math.sin(Math.PI * Math.min(1, el / 0.95));
    blendBoneOffset('rightUpperArm', trackVal(el, [[0,-70],[0.15,-38],[0.5,-22],[0.85,-30],[1.05,-52],[1.25,-70]]), 0,
      trackVal(el, [[0,5],[0.15,20],[0.5,34],[0.85,26],[1.25,5]]), w);
    blendBoneOffset('rightLowerArm', 0, 0, trackVal(el, [[0,15],[0.15,60],[0.5,95],[0.85,70],[1.05,30],[1.25,15]]), w);
    /* fish hugged across the chest, head pointing back over her left
       shoulder — clear of the ground through the whole turn */
    blendBoneOffset('rightHand', trackVal(el, [[0,0],[0.2,-14],[0.6,-18],[1.0,0],[1.25,0]]), 0, 0, w);
    blendBoneOffset('leftUpperArm', trackVal(el, [[0,-72],[0.15,-48],[0.5,-30],[0.85,-38],[1.05,-55],[1.25,-72]]), 0,
      trackVal(el, [[0,-6],[0.15,-16],[0.5,-28],[0.85,-20],[1.25,-6]]), w);
    blendBoneOffset('leftLowerArm', 0, 0, trackVal(el, [[0,-14],[0.15,-30],[0.5,-78],[0.85,-55],[1.05,-24],[1.25,-14]]), w);
    blendBoneOffset('spine', 14 * rTuck, 0, 0, w);
    blendBoneOffset('chest', 10 * rTuck, 0, 0, w);
    blendBoneOffset('neck', 12 * rTuck, 0, 0, w);
    blendBoneOffset('head', 20 * rTuck, 0, 0, w);
    var rKnee = trackVal(el, [[0,2],[0.15,42],[0.4,105],[0.65,110],[0.85,55],[1.0,26],[1.12,10],[1.25,2]]);
    blendBoneOffset('leftUpperLeg', -0.62 * rKnee, 0, 0, w);
    blendBoneOffset('rightUpperLeg', -0.62 * rKnee, 0, 0, w);
    blendBoneOffset('leftLowerLeg', rKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', rKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.4 * rKnee + 14 * rTuck, 0, 0, w);
    blendBoneOffset('rightFoot', -0.4 * rKnee + 14 * rTuck, 0, 0, w);
    if (bones.hips){
      tmpE.set(rollDeg * D2R, poseExtraCur.hipsY * D2R, 0);
      tmpQ.setFromEuler(tmpE);
      tmpQ2.copy(bones.hips.rest).multiply(tmpQ);
      bones.hips.obj.quaternion.slerp(tmpQ2, w);
      /* center drops as the body goes over (shoulders/back pass near
         the floor mid-roll), with a landing dip when her feet return */
      bones.hips.obj.position.y += trackVal(el, [[0,0],[0.15,-0.12],[0.35,-0.42],[0.5,-0.47],[0.65,-0.40],[0.82,-0.14],[0.95,-0.06],[1.1,-0.02],[1.25,0]]) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.2,0.12],[0.75,1.05],[0.95,1.05],[1.25,0]]) * w;
    }
  }
  else if (name === 'guard'){
    /* 鰤ガード (new, about 1.4s): the fish's broad body becomes the
       shield. She snaps it up vertically in front of her chest (the
       pose was solved on the bone data: fish axis ~(0.13, 0.97, 0.18),
       covering chin to waist), left hand bracing its side, knees bent
       and weight dropped to brace. At ~0.62s she takes a hit: one small
       knock-back shove that the guard absorbs, then she settles and
       lowers the fish by 1.40. */
    if (el >= 1.4){ stopMotion(); return; }
    var gHit = gauss(el, 0.62, 0.055);
    var gK = trackVal(el, [[0,0],[0.15,1],[1.05,1],[1.3,0],[1.4,0]]);
    function gVal(stand, guard){ return stand + (guard - stand) * gK; }
    blendBoneOffset('rightUpperArm', gVal(-70, -80), 0, gVal(5, 23), w);
    blendBoneOffset('rightLowerArm', 0, 0, gVal(15, 86), w);
    blendBoneOffset('rightHand', gVal(0, -5) - 8 * gHit, 0, gVal(0, 60), w);
    blendBoneOffset('leftUpperArm', gVal(-72, -40), 0, gVal(-6, -80), w);
    blendBoneOffset('leftLowerArm', 0, 0, gVal(-14, -82), w);
    blendBoneOffset('spine', gVal(0, 3) - 3.5 * gHit, 0, 0, w);
    blendBoneOffset('chest', gVal(0, 2) - 2 * gHit, 0, 0, w);
    blendBoneOffset('neck', gVal(0, -2) + 2 * gHit, 0, 0, w);
    blendBoneOffset('head', gVal(0, -3) + 3 * gHit, 0, 0, w);
    blendBoneOffset('leftUpperLeg', gVal(0, -7), 0, 0, w);
    blendBoneOffset('rightUpperLeg', gVal(0, -7), 0, 0, w);
    blendBoneOffset('leftLowerLeg', gVal(2, 13), 0, 0, w);
    blendBoneOffset('rightLowerLeg', gVal(2, 13), 0, 0, w);
    blendBoneOffset('leftFoot', gVal(0, -6), 0, 0, w);
    blendBoneOffset('rightFoot', gVal(0, -6), 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += (gVal(0, -0.022) - 0.008 * gHit) * w;
      bones.hips.obj.position.z += -0.038 * gHit * w;
    }
  }  else if (name === 'hit'){
    /* 被弾・のけぞり (VS batch 1, about 0.7s): a mid-size knockback
       reaction that reads from the FRONT — the hit lands on her front,
       head and chest snap back, both arms flail up-out, one foot
       skids back ~0.12m, then she shakes it off and resets. */
    if (el >= 0.7){ stopMotion(); return; }
    var hSnap = gauss(el, 0.14, 0.09);
    var hRec = trackVal(el, [[0,0],[0.14,1],[0.4,0.55],[0.7,0]]);
    function hVal(base, hit){ return base + hit * Math.max(hSnap, hRec * 0.6); }
    blendBoneOffset('head', hVal(0, -16), 0, hVal(0, 4), w);
    blendBoneOffset('neck', hVal(0, -9), 0, 0, w);
    blendBoneOffset('chest', hVal(0, -11), 0, 0, w);
    blendBoneOffset('spine', hVal(0, -7), 0, 0, w);
    blendBoneOffset('rightUpperArm', hVal(-70, 26), 0, hVal(5, 26), w);
    blendBoneOffset('rightLowerArm', 0, 0, hVal(15, 22), w);
    blendBoneOffset('leftUpperArm', hVal(-72, 22), 0, hVal(-6, -26), w);
    blendBoneOffset('leftLowerArm', 0, 0, hVal(-14, -20), w);
    blendBoneOffset('leftUpperLeg', hVal(0, -10), 0, 0, w);
    blendBoneOffset('rightUpperLeg', hVal(0, 12), 0, 0, w);
    blendBoneOffset('leftLowerLeg', hVal(2, 16), 0, 0, w);
    blendBoneOffset('rightLowerLeg', hVal(2, 6), 0, 0, w);
    blendBoneOffset('leftFoot', hVal(0, -8), 0, 0, w);
    blendBoneOffset('rightFoot', hVal(0, 10), 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += -0.012 * Math.max(hSnap, hRec * 0.5) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.16,-0.12],[0.42,-0.12],[0.7,0]]) * w;
    }
  }
  else if (name === 'down'){
    /* ダウン → 起き上がり (VS batch 1, about 2.3s): knocked flat on
       her back, a beat on the floor, then a quick kip-up style rise
       (VS get-ups are fast, with an invincible feel). The hips pitch
       is set directly (like the roll) so she can go fully supine:
       -88° lays her back along the floor, root dropped and slid back.
       The fish stays gripped, ending up resting across her chest. */
    if (el >= 2.3){ stopMotion(); return; }
    var dFall = trackVal(el, [[0,0],[0.34,1],[1.15,1],[1.5,0.25],[1.78,0],[2.3,0]]);
    var dPitch = -88 * dFall;
    blendBoneOffset('spine', 6 * dFall, 0, 0, w);
    blendBoneOffset('chest', 4 * dFall, 0, 0, w);
    blendBoneOffset('neck', -14 * dFall, 0, 0, w);
    blendBoneOffset('head', -20 * dFall + trackVal(el, [[0,0],[1.5,0],[1.78,6],[2.0,0],[2.3,0]]), 0, 0, w);
    /* arms thrown out as she goes over, then planted to push up */
    blendBoneOffset('rightUpperArm', trackVal(el, [[0,-70],[0.34,-20],[1.15,-24],[1.5,-48],[1.78,-62],[2.3,-70]]), 0,
      trackVal(el, [[0,5],[0.34,38],[1.15,42],[1.5,20],[1.78,8],[2.3,5]]), w);
    blendBoneOffset('rightLowerArm', 0, 0, trackVal(el, [[0,15],[0.34,30],[1.15,34],[1.5,18],[2.3,15]]), w);
    blendBoneOffset('leftUpperArm', trackVal(el, [[0,-72],[0.34,-26],[1.15,-30],[1.5,-52],[1.78,-64],[2.3,-72]]), 0,
      trackVal(el, [[0,-6],[0.34,-38],[1.15,-42],[1.5,-20],[1.78,-8],[2.3,-6]]), w);
    blendBoneOffset('leftLowerArm', 0, 0, trackVal(el, [[0,-14],[0.34,-28],[1.15,-30],[1.5,-16],[2.3,-14]]), w);
    /* legs kick up as she falls, knees bent on the floor, then drive
       the rise; a little overshoot bounce at 1.9 as she lands up */
    var dKnee = trackVal(el, [[0,2],[0.34,34],[0.6,48],[1.15,44],[1.5,58],[1.78,10],[1.95,16],[2.3,2]]);
    blendBoneOffset('leftUpperLeg', -0.55 * dKnee, 0, 0, w);
    blendBoneOffset('rightUpperLeg', -0.55 * dKnee, 0, 0, w);
    blendBoneOffset('leftLowerLeg', dKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', dKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.3 * dKnee, 0, 0, w);
    blendBoneOffset('rightFoot', -0.3 * dKnee, 0, 0, w);
    if (bones.hips){
      tmpE.set(dPitch * D2R, poseExtraCur.hipsY * D2R, 0);
      tmpQ.setFromEuler(tmpE);
      tmpQ2.copy(bones.hips.rest).multiply(tmpQ);
      bones.hips.obj.quaternion.slerp(tmpQ2, w);
      /* root: drops to the floor as she lies back, slides back a
         little, springs up fast 1.5-1.78, small bounce, settle */
      bones.hips.obj.position.y += trackVal(el, [[0,0],[0.34,-0.52],[0.42,-0.55],[1.15,-0.55],[1.5,-0.38],[1.78,-0.01],[1.92,0.012],[2.05,-0.004],[2.3,0]]) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.34,-0.30],[1.15,-0.30],[1.5,-0.18],[1.78,0],[2.3,0]]) * w;
    }
  }
  else if (name === 'step'){
    /* ステップ・前 (VS batch 1, about 0.5s): the VS basic movement —
       a quick burst step straight FORWARD. Tiny crouch, explosive
       ~0.55m dash in 0.18s with the torso pitched in and arms trailing
       (the fish streams behind), a short skid-stop, then — like the
       other one-shots — the root glides back to the mark. */
    if (el >= 0.5){ stopMotion(); return; }
    var sLean = trackVal(el, [[0,0],[0.08,0.4],[0.18,1],[0.34,0.75],[0.5,0]]);
    blendBoneOffset('spine', 13 * sLean, 0, 0, w);
    blendBoneOffset('chest', 8 * sLean, 0, 0, w);
    blendBoneOffset('neck', -6 * sLean, 0, 0, w);
    blendBoneOffset('head', -8 * sLean, 0, 0, w);
    blendBoneOffset('leftUpperArm', -70 - 6 * sLean, 0, 24 * sLean, w);
    blendBoneOffset('leftLowerArm', 0, 0, -(10 + 26 * sLean), w);
    blendBoneOffset('rightUpperArm', -70 + 4 * sLean, 0, 5 - 22 * sLean, w);
    blendBoneOffset('rightLowerArm', 0, 0, 15 + 18 * sLean, w);
    blendBoneOffset('rightHand', -8 * sLean, 0, 0, w);
    /* scissor legs: front leg reaches, back leg drives, mid-dash */
    blendBoneOffset('leftUpperLeg', trackVal(el, [[0,0],[0.08,-8],[0.18,-34],[0.34,-12],[0.5,0]]), 0, 0, w);
    blendBoneOffset('rightUpperLeg', trackVal(el, [[0,0],[0.08,6],[0.18,26],[0.34,8],[0.5,0]]), 0, 0, w);
    blendBoneOffset('leftLowerLeg', trackVal(el, [[0,2],[0.18,20],[0.34,10],[0.5,2]]), 0, 0, w);
    blendBoneOffset('rightLowerLeg', trackVal(el, [[0,2],[0.18,12],[0.34,22],[0.5,2]]), 0, 0, w);
    blendBoneOffset('leftFoot', trackVal(el, [[0,0],[0.18,-10],[0.34,-4],[0.5,0]]), 0, 0, w);
    blendBoneOffset('rightFoot', trackVal(el, [[0,0],[0.18,20],[0.34,8],[0.5,0]]), 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += trackVal(el, [[0,0],[0.08,-0.03],[0.18,-0.015],[0.34,-0.03],[0.5,0]]) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.08,0.02],[0.18,0.55],[0.36,0.55],[0.5,0]]) * w;
    }
  }
  else if (name === 'stepback'){
    /* ステップ・後 (remaining steps, about 0.55s): the retreating
       burst step — the forward step's mirror. Tiny crouch, an
       explosive ~0.52m dash straight BACK, torso pitched slightly
       back with both arms swung forward-down for balance (the sword
       arm keeps the fish up in front, ready), a short skid-stop,
       then the root glides back to the mark. */
    if (el >= 0.55){ stopMotion(); return; }
    var sbLean = trackVal(el, [[0,0],[0.08,0.4],[0.18,1],[0.36,0.7],[0.55,0]]);
    blendBoneOffset('spine', -8 * sbLean, 0, 0, w);
    blendBoneOffset('chest', -5 * sbLean, 0, 0, w);
    blendBoneOffset('neck', 4 * sbLean, 0, 0, w);
    blendBoneOffset('head', 5 * sbLean, 0, 0, w);
    blendBoneOffset('leftUpperArm', -70 - 14 * sbLean, 0, -6 - 8 * sbLean, w);
    blendBoneOffset('leftLowerArm', 0, 0, -(10 + 8 * sbLean), w);
    blendBoneOffset('rightUpperArm', -70 - 18 * sbLean, 0, 5 + 10 * sbLean, w);
    blendBoneOffset('rightLowerArm', 0, 0, 15 - 6 * sbLean, w);
    blendBoneOffset('rightHand', -4 * sbLean, 0, 0, w);
    /* right foot reaches back first, the left follows through */
    blendBoneOffset('leftUpperLeg', trackVal(el, [[0,0],[0.18,18],[0.36,6],[0.55,0]]), 0, 0, w);
    blendBoneOffset('rightUpperLeg', trackVal(el, [[0,0],[0.08,-6],[0.18,-30],[0.36,-10],[0.55,0]]), 0, 0, w);
    blendBoneOffset('leftLowerLeg', trackVal(el, [[0,2],[0.18,10],[0.36,16],[0.55,2]]), 0, 0, w);
    blendBoneOffset('rightLowerLeg', trackVal(el, [[0,2],[0.18,16],[0.36,8],[0.55,2]]), 0, 0, w);
    blendBoneOffset('leftFoot', trackVal(el, [[0,0],[0.18,6],[0.55,0]]), 0, 0, w);
    blendBoneOffset('rightFoot', trackVal(el, [[0,0],[0.18,-12],[0.36,-4],[0.55,0]]), 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += trackVal(el, [[0,0],[0.08,-0.03],[0.18,-0.015],[0.36,-0.03],[0.55,0]]) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.08,-0.02],[0.18,-0.52],[0.38,-0.52],[0.55,0]]) * w;
    }
  }
  else if (name === 'stepleft' || name === 'stepright'){
    /* ステップ・左 / 右 (remaining steps, about 0.5s): a quick lateral
       hop. She stays facing the FRONT the whole time (VS side-steps
       do not turn): the body leans INTO the travel direction, the
       legs scissor sideways under her — leading leg reaching out,
       trailing leg tucking under — both arms swing against the motion
       for balance and the fish trails behind the hop. sdir: +1 = her
       left (root +X), -1 = her right (root -X). Ends with the usual
       glide back to the mark. Leg Z signs follow the rig convention
       used by the 仁王立ち pose (left leg out = -Z, right leg out = +Z). */
    if (el >= 0.5){ stopMotion(); return; }
    var sdir = (name === 'stepleft') ? 1 : -1;
    var slLean = trackVal(el, [[0,0],[0.07,0.4],[0.16,1],[0.32,0.7],[0.5,0]]);
    blendBoneOffset('hips', 0, 0, -7 * sdir * slLean, w);
    blendBoneOffset('spine', 2 * slLean, 0, -4 * sdir * slLean, w);
    blendBoneOffset('chest', 1 * slLean, 0, -3 * sdir * slLean, w);
    blendBoneOffset('neck', -2 * slLean, 0, 3 * sdir * slLean, w);
    blendBoneOffset('head', -3 * slLean, 0, 4 * sdir * slLean, w);
    blendBoneOffset('leftUpperArm', -70, 0, -6 - 14 * sdir * slLean, w);
    blendBoneOffset('leftLowerArm', 0, 0, -(10 + 10 * slLean), w);
    blendBoneOffset('rightUpperArm', -70, 0, 5 - 16 * sdir * slLean, w);
    blendBoneOffset('rightLowerArm', 0, 0, 15 + 12 * slLean, w);
    blendBoneOffset('rightHand', -6 * slLean, 0, 0, w);
    var slKnee = 16 * slLean;
    blendBoneOffset('leftUpperLeg', -6 * slLean, 0, (sdir > 0 ? -13 : 7) * slLean, w);
    blendBoneOffset('rightUpperLeg', -6 * slLean, 0, (sdir > 0 ? -7 : 13) * slLean, w);
    blendBoneOffset('leftLowerLeg', slKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', slKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.45 * slKnee, 0, 0, w);
    blendBoneOffset('rightFoot', -0.45 * slKnee, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += trackVal(el, [[0,0],[0.07,-0.025],[0.16,0.02],[0.32,-0.02],[0.5,0]]) * w;
      bones.hips.obj.position.x += sdir * trackVal(el, [[0,0],[0.07,0.03],[0.16,0.5],[0.34,0.5],[0.5,0]]) * w;
    }
  }
  else if (name === 'airdash'){
    /* 空中ダッシュ (VS batch 2, about 0.95s): the step's airborne
       sibling — a short hop launches her, then she bursts straight
       FORWARD through the air (~0.85m), torso pitched into the dash,
       legs and arms trailing, the fish streaming behind her. She
       sinks back down, touches into a small landing absorb, and the
       root glides back to the mark like the other one-shots. */
    if (el >= 0.95){ stopMotion(); return; }
    var adLean = trackVal(el, [[0,0],[0.14,0.5],[0.3,1],[0.55,0.9],[0.8,0.3],[0.95,0]]);
    blendBoneOffset('spine', 15 * adLean, 0, 0, w);
    blendBoneOffset('chest', 9 * adLean, 0, 0, w);
    blendBoneOffset('neck', -7 * adLean, 0, 0, w);
    blendBoneOffset('head', -9 * adLean, 0, 0, w);
    /* arms trail behind the dash; the sword arm streams the fish back */
    blendBoneOffset('leftUpperArm', -70 + 8 * adLean, 0, 26 * adLean, w);
    blendBoneOffset('leftLowerArm', 0, 0, -(10 + 20 * adLean), w);
    blendBoneOffset('rightUpperArm', -70 + 10 * adLean, 0, 5 - 26 * adLean, w);
    blendBoneOffset('rightLowerArm', 0, 0, 15 + 16 * adLean, w);
    blendBoneOffset('rightHand', -10 * adLean, 0, 0, w);
    /* legs: front knee tucks at the launch, both trail toes-down in
       the dash, then reach forward for the landing */
    blendBoneOffset('leftUpperLeg', trackVal(el, [[0,0],[0.14,-30],[0.3,14],[0.55,18],[0.8,-16],[0.95,0]]), 0, 0, w);
    blendBoneOffset('rightUpperLeg', trackVal(el, [[0,0],[0.14,8],[0.3,26],[0.55,30],[0.8,6],[0.95,0]]), 0, 0, w);
    blendBoneOffset('leftLowerLeg', trackVal(el, [[0,2],[0.14,44],[0.3,20],[0.55,16],[0.8,18],[0.95,2]]), 0, 0, w);
    blendBoneOffset('rightLowerLeg', trackVal(el, [[0,2],[0.14,18],[0.3,34],[0.55,30],[0.8,12],[0.95,2]]), 0, 0, w);
    blendBoneOffset('leftFoot', trackVal(el, [[0,0],[0.3,18],[0.8,-6],[0.95,0]]), 0, 0, w);
    blendBoneOffset('rightFoot', trackVal(el, [[0,0],[0.3,22],[0.8,4],[0.95,0]]), 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += trackVal(el, [[0,0],[0.14,0.10],[0.3,0.34],[0.55,0.30],[0.8,0.02],[0.88,-0.03],[0.95,0]]) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.14,0.05],[0.5,0.85],[0.8,0.85],[0.95,0]]) * w;
    }
  }
  else if (name === 'awaken'){
    /* 覚醒 (VS batch 2, about 2.3s): the charge-up that flips her
       into the golden super mode. She sinks low and GATHERS — fists
       clenched hard at her sides, head down, a fine tremble building
       through the charge (0.1-1.0) — then at 1.0s the power BURSTS:
       both arms thrown up and wide, chest out, chin up, the fish
       raised to the sky, and the golden aura (light + glow sprite,
       driven in animate() on this same schedule) flares. She holds
       the power pose while the glow dies down, then settles. */
    if (el >= 2.3){ stopMotion(); return; }
    var awCharge = trackVal(el, [[0,0],[0.45,1],[0.98,1],[1.08,0],[2.3,0]]);
    var awBurst = trackVal(el, [[0,0],[0.98,0],[1.1,1],[1.7,1],[2.05,0.3],[2.3,0]]);
    var awTremble = Math.sin(el * 66) * 1.1 * awCharge;
    blendBoneOffset('spine', 13 * awCharge - 9 * awBurst + awTremble * 0.5, 0, 0, w);
    blendBoneOffset('chest', 8 * awCharge - 6 * awBurst, 0, 0, w);
    blendBoneOffset('neck', 6 * awCharge - 5 * awBurst + awTremble * 0.4, 0, 0, w);
    blendBoneOffset('head', 15 * awCharge - 13 * awBurst + awTremble * 0.6, 0, 0, w);
    /* charge: arms pulled down, elbows bent hard, fists clenched at
       her hips. burst: both arms flung up and out, elbows soft */
    blendBoneOffset('leftUpperArm',
      -70 - 6 * awCharge - 48 * awBurst, 0, -6 - 4 * awCharge - 26 * awBurst, w);
    blendBoneOffset('leftLowerArm', 0, 0, -(10 + 42 * awCharge + 2 * awBurst), w);
    blendBoneOffset('rightUpperArm',
      -70 - 6 * awCharge - 48 * awBurst, 0, 5 + 4 * awCharge + 26 * awBurst, w);
    blendBoneOffset('rightLowerArm', 0, 0, 15 + 42 * awCharge - 3 * awBurst, w);
    blendBoneOffset('rightHand', -6 * awBurst, 0, 0, w);
    /* legs brace wide-ish in the charge crouch, straighten tall on
       the burst (up on the toes a touch), then settle */
    var awKnee = 26 * awCharge + 5 * awBurst;
    blendBoneOffset('leftUpperLeg', -0.55 * awKnee, 0, -4 * awCharge, w);
    blendBoneOffset('rightUpperLeg', -0.55 * awKnee, 0, 4 * awCharge, w);
    blendBoneOffset('leftLowerLeg', awKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', awKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.45 * awKnee, 0, 0, w);
    blendBoneOffset('rightFoot', -0.45 * awKnee, 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += (-0.052 * awCharge + 0.012 * awBurst) * w;
    }
  }
  else if (name === 'intro'){
    /* 登場 (VS batch 2, about 2.4s): her round-start entrance. She
       drops in from above with the fish held high, lands in a deep
       crouch (head bowed a beat), rises slowly — then snaps the fish
       out to a front-facing point in one flourish, holds it a moment
       like a challenge, and settles to stand. */
    if (el >= 2.4){ stopMotion(); return; }
    var inCrouch = trackVal(el, [[0,0.25],[0.4,0.5],[0.48,1],[0.95,0.85],[1.5,0.1],[1.7,0],[2.4,0]]);
    var inShow = trackVal(el, [[0,0],[1.45,0],[1.65,1],[2.1,1],[2.4,0]]);
    blendBoneOffset('spine', 10 * inCrouch - 3 * inShow, 0, 0, w);
    blendBoneOffset('chest', 6 * inCrouch - 2 * inShow, 0, 0, w);
    blendBoneOffset('neck', 5 * inCrouch - 2 * inShow, 0, 0, w);
    blendBoneOffset('head', 12 * inCrouch - 5 * inShow, 0, 0, w);
    /* falling/landing: fish held high in the right hand, left arm
       out for balance. flourish: the right arm snaps the fish out to
       a level front point (same reach as the thrust), left arm back */
    blendBoneOffset('rightUpperArm',
      trackVal(el, [[0,-100],[0.48,-88],[1.45,-80],[1.65,-12],[2.1,-12],[2.4,-70]]), 0,
      trackVal(el, [[0,12],[0.48,10],[1.45,6],[1.65,56],[2.1,56],[2.4,5]]), w);
    blendBoneOffset('rightLowerArm', 0, 0,
      trackVal(el, [[0,20],[1.45,14],[1.65,4],[2.1,4],[2.4,15]]), w);
    blendBoneOffset('rightHand', 0, 0,
      trackVal(el, [[0,0],[1.65,-16],[2.1,-16],[2.4,0]]), w);
    blendBoneOffset('leftUpperArm',
      trackVal(el, [[0,-52],[0.48,-60],[1.45,-70],[1.65,-66],[2.1,-66],[2.4,-72]]), 0,
      trackVal(el, [[0,-24],[0.48,-18],[1.45,-6],[1.65,24],[2.1,24],[2.4,-6]]), w);
    blendBoneOffset('leftLowerArm', 0, 0,
      trackVal(el, [[0,-20],[1.45,-12],[1.65,-8],[2.1,-8],[2.4,-14]]), w);
    var inKnee = 54 * inCrouch;
    blendBoneOffset('leftUpperLeg', -0.55 * inKnee, 0, 0, w);
    blendBoneOffset('rightUpperLeg', -0.55 * inKnee, 0, 0, w);
    blendBoneOffset('leftLowerLeg', inKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', inKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.45 * inKnee, 0, 0, w);
    blendBoneOffset('rightFoot', -0.45 * inKnee, 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips){
      /* drop-in from above, deep absorb at 0.48, slow rise, settle */
      bones.hips.obj.position.y += trackVal(el, [[0,0.55],[0.4,0.03],[0.48,-0.085],[0.95,-0.07],[1.5,-0.008],[2.4,0]]) * w;
    }
  }
  else if (name === 'charge'){
    /* チャージ溜め (VS batch 3, about 2.4s): she plants her feet,
       takes the fish in BOTH hands and holds it level out in front
       of her chest, and CHARGES — the VS charge-shot / charge-melee
       stance. Distinct from 覚醒: that one is the super-mode burst
       with the golden aura; this is a held, building charge. The
       tremble grows with the charge level and a glow gathers on the
       fish's head (driven in animate() on this same schedule): full
       charge at 1.7s, a firmer steady hold to 2.05, then she lets
       the stance go and settles back to stand. */
    if (el >= 2.4){ stopMotion(); return; }
    var chK = trackVal(el, [[0,0],[0.4,1],[2.05,1],[2.4,0]]);
    var chTremble = Math.sin(el * 52) * (0.5 + 1.4 * chK) * chK;
    function chVal(stand, held){ return stand + (held - stand) * chK; }
    /* two-handed hold: right arm reaches out front, left hand joins
       the grip under the fish, both shaking harder as it charges */
    blendBoneOffset('rightUpperArm', chVal(-70, -34) + chTremble * 0.4, 0, chVal(5, 44), w);
    blendBoneOffset('rightLowerArm', 0, 0, chVal(15, 6), w);
    blendBoneOffset('rightHand', chVal(0, -4), 0, chVal(0, -10), w);
    blendBoneOffset('leftUpperArm', chVal(-72, -40) + chTremble * 0.4, 0, chVal(-6, -34), w);
    blendBoneOffset('leftLowerArm', 0, 0, chVal(-14, -30), w);
    /* braced: lean into it, knees deepening, eyes locked down the
       fish's line at the target in front of her */
    blendBoneOffset('spine', chVal(0, 9) + chTremble * 0.3, 0, 0, w);
    blendBoneOffset('chest', chVal(0, 5), 0, 0, w);
    blendBoneOffset('neck', chVal(0, 4), 0, 0, w);
    blendBoneOffset('head', chVal(0, 6), 0, 0, w);
    var chKnee = chVal(2, 17);
    blendBoneOffset('leftUpperLeg', chVal(0, -9), 0, -3 * chK, w);
    blendBoneOffset('rightUpperLeg', chVal(0, -9), 0, 3 * chK, w);
    blendBoneOffset('leftLowerLeg', chKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', chKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.45 * chKnee, 0, 0, w);
    blendBoneOffset('rightFoot', -0.45 * chKnee, 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += chVal(0, -0.032) * w;
      bones.hips.obj.position.z += chVal(0, 0.03) * w;
    }
  }
  else if (name === 'defeat'){
    /* 敗北ポーズ (VS batch 3, about 3.6s): the round is lost. She
       staggers back, unsteady (0-0.5s), her knees buckle and she
       crumples (0.5-1.1s) into a kneeling collapse — head bowed
       deep, shoulders slumped, the sword arm gone limp so the fish
       droops down beside her, the left hand reaching down-forward
       to brace against the ground. She holds the slump to 2.9s (in
       a game it would hold until the round resets), then slowly
       pushes herself back up so the viewer returns to stand. */
    if (el >= 3.6){ stopMotion(); return; }
    var dfStagger = gauss(el, 0.25, 0.16);
    var dfDown = trackVal(el, [[0,0],[0.5,0.12],[1.1,1],[2.9,1],[3.6,0]]);
    var dfSway = Math.sin(el * 9) * 3 * dfStagger;
    blendBoneOffset('spine', 26 * dfDown - 6 * dfStagger, 0, dfSway * 0.4, w);
    blendBoneOffset('chest', 16 * dfDown - 4 * dfStagger, 0, 0, w);
    blendBoneOffset('neck', 14 * dfDown, 0, dfSway * 0.3, w);
    /* head hangs all the way down in the slump */
    blendBoneOffset('head', 30 * dfDown - 8 * dfStagger, 0, dfSway * 0.3, w);
    /* sword arm limp: hangs down-forward, fish drooping beside her */
    blendBoneOffset('rightUpperArm', -70 + 26 * dfDown + 10 * dfStagger, 0, 5 + 8 * dfDown, w);
    blendBoneOffset('rightLowerArm', 0, 0, 15 - 7 * dfDown, w);
    blendBoneOffset('rightHand', 10 * dfDown, 0, 0, w);
    /* left arm reaches down-forward, bracing her on the ground */
    blendBoneOffset('leftUpperArm', -72 + 34 * dfDown, 0, -6 + 6 * dfDown, w);
    blendBoneOffset('leftLowerArm', 0, 0, -14 + 8 * dfDown, w);
    /* kneel: thighs fold, shins tuck under, toes point back */
    blendBoneOffset('leftUpperLeg', -18 * dfDown, 0, -3 * dfDown, w);
    blendBoneOffset('rightUpperLeg', -14 * dfDown, 0, 3 * dfDown, w);
    blendBoneOffset('leftLowerLeg', 74 * dfDown, 0, 0, w);
    blendBoneOffset('rightLowerLeg', 74 * dfDown, 0, 0, w);
    blendBoneOffset('leftFoot', 30 * dfDown, 0, 0, w);
    blendBoneOffset('rightFoot', 30 * dfDown, 0, 0, w);
    blendBoneOffset('hips', 0, 0, dfSway * 0.5, w);
    if (bones.hips){
      bones.hips.obj.position.y += (-0.36 * dfDown - 0.01 * dfStagger) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.5,-0.14],[1.1,-0.10],[2.9,-0.10],[3.6,0]]) * w;
    }
  }
  else if (name === 'combo'){
    /* 格闘コンボ3段 (VS batch 4, about 1.95s): the missing ground
       chain. All three hits stay on the FRONT centerline, each with
       its own small forward step so the chain visibly advances.
       1段目 (0-0.5): right horizontal slash right-to-left.
       2段目 (0.5-1.05): backhand return slash left-to-right, torso
       recoiling the other way. 3段目 (1.05-1.95): a short overhead
       chop as the finisher — smaller and faster than the 必殺, with
       a brief hit-stop at 1.52 — then recover. */
    if (el >= 1.95){ stopMotion(); return; }
    blendBoneOffset('hips', 0, trackVal(el, [[0,0],[0.18,-24],[0.42,26],[0.62,22],[0.8,-26],[1.0,-20],[1.2,0],[1.45,4],[1.6,4],[1.95,0]]), 0, w);
    blendBoneOffset('chest', 0, trackVal(el, [[0,0],[0.18,-16],[0.42,18],[0.8,-18],[1.0,-12],[1.2,0],[1.95,0]]), 0, w);
    blendBoneOffset('spine', trackVal(el, [[0,0],[0.42,4],[1.0,4],[1.2,-8],[1.45,16],[1.6,16],[1.95,0]]), 0, 0, w);
    blendBoneOffset('head', trackVal(el, [[0,0],[1.2,-4],[1.45,5],[1.95,0]]), trackVal(el, [[0,0],[0.42,-10],[1.0,10],[1.95,0]]), 0, w);
    blendBoneOffset('neck', 0, trackVal(el, [[0,0],[0.42,-7],[1.0,7],[1.95,0]]), 0, w);
    blendBoneOffset('rightUpperArm',
      trackVal(el, [[0,-70],[0.18,-38],[0.42,-34],[0.62,-40],[0.8,-36],[1.0,-38],[1.2,52],[1.45,-58],[1.6,-58],[1.95,-70]]), 0,
      trackVal(el, [[0,5],[0.18,-42],[0.42,58],[0.62,52],[0.8,-48],[1.0,40],[1.2,-16],[1.45,8],[1.6,8],[1.95,5]]), w);
    blendBoneOffset('rightLowerArm', 0, 0, trackVal(el, [[0,15],[0.42,10],[1.0,12],[1.2,8],[1.45,14],[1.95,15]]), w);
    blendBoneOffset('rightHand', trackVal(el, [[0,0],[1.2,6],[1.45,0],[1.95,0]]), 0, 0, w);
    blendBoneOffset('leftUpperArm',
      trackVal(el, [[0,-72],[0.42,-56],[1.0,-58],[1.2,30],[1.45,-40],[1.6,-40],[1.95,-72]]), 0,
      trackVal(el, [[0,-6],[0.42,22],[1.0,-24],[1.2,-18],[1.45,8],[1.95,-6]]), w);
    blendBoneOffset('leftLowerArm', 0, 0, trackVal(el, [[0,-14],[1.2,-26],[1.45,-12],[1.95,-14]]), w);
    var cKnee = trackVal(el, [[0,2],[0.42,10],[1.0,12],[1.2,8],[1.45,22],[1.6,22],[1.95,2]]);
    blendBoneOffset('leftUpperLeg', -0.55 * cKnee, 0, 0, w);
    blendBoneOffset('rightUpperLeg', -0.55 * cKnee, 0, 0, w);
    blendBoneOffset('leftLowerLeg', cKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', cKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.45 * cKnee, 0, 0, w);
    blendBoneOffset('rightFoot', -0.45 * cKnee, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += trackVal(el, [[0,0],[0.42,-0.02],[1.0,-0.03],[1.45,-0.055],[1.6,-0.055],[1.95,0]]) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.42,0.14],[1.0,0.28],[1.45,0.42],[1.6,0.42],[1.95,0]]) * w;
    }
  }
  else if (name === 'upper'){
    /* 鰤アッパー・特殊格闘 (VS batch 4 revised, about 1.35s): the
       special-melee slot. Her tail is a CAT tail — it is never a
       weapon; every attack is the buri swung as a blunt instrument.
       Here she sinks into a deep crouch and drags the fish low along
       the ground at her right side, then uncoils upward in one
       scooping arc: the fish's whole weight sweeps up through the
       front centerline from ankle height to overhead, the launcher
       that pairs with 打ち上げ被弾. She rises onto her toes with
       the follow-through, fish finishing high, then hauls the
       weight back down and settles. All on the front, no spin. */
    if (el >= 1.35){ stopMotion(); return; }
    /* torso: coil down-right in the windup, snap open upward */
    blendBoneOffset('hips', 0,
      trackVal(el, [[0,0],[0.38,-18],[0.55,2],[0.72,12],[0.95,7],[1.35,0]]), 0, w);
    blendBoneOffset('chest', 0,
      trackVal(el, [[0,0],[0.38,-12],[0.72,8],[0.95,5],[1.35,0]]), 0, w);
    blendBoneOffset('spine',
      trackVal(el, [[0,0],[0.38,18],[0.55,5],[0.72,-9],[0.9,-7],[1.15,0],[1.35,0]]), 0, 0, w);
    blendBoneOffset('neck',
      trackVal(el, [[0,0],[0.38,7],[0.72,-4],[1.35,0]]), 0, 0, w);
    blendBoneOffset('head',
      trackVal(el, [[0,0],[0.38,12],[0.55,2],[0.72,-8],[0.95,-5],[1.35,0]]), 0, 0, w);
    /* sword arm: dragged low with the elbow bent (fish head near the
       ground), then one straight rising sweep to overhead */
    blendBoneOffset('rightUpperArm',
      trackVal(el, [[0,-70],[0.38,-82],[0.55,-26],[0.72,64],[0.9,72],[1.12,26],[1.35,-70]]), 0,
      trackVal(el, [[0,5],[0.38,28],[0.55,30],[0.72,12],[0.9,9],[1.35,5]]), w);
    blendBoneOffset('rightLowerArm', 0, 0,
      trackVal(el, [[0,15],[0.38,40],[0.55,20],[0.72,5],[0.9,9],[1.35,15]]), w);
    /* wrist cocks back in the drag so the fish trails, then snaps
       through at the top of the scoop */
    blendBoneOffset('rightHand',
      trackVal(el, [[0,0],[0.38,-18],[0.55,-6],[0.72,12],[0.95,8],[1.35,0]]), 0, 0, w);
    /* left arm: low guard in the crouch, flung back-up as a
       counterweight while the scoop goes up */
    blendBoneOffset('leftUpperArm',
      trackVal(el, [[0,-72],[0.38,-62],[0.72,-18],[0.9,-24],[1.35,-72]]), 0,
      trackVal(el, [[0,-6],[0.38,-18],[0.72,26],[0.9,20],[1.35,-6]]), w);
    blendBoneOffset('leftLowerArm', 0, 0,
      trackVal(el, [[0,-14],[0.72,-32],[1.35,-14]]), w);
    /* legs: deep crouch, explosive extension onto the toes at the
       scoop (brief toe-point around 0.7s), small absorb, settle */
    var uKnee = trackVal(el, [[0,2],[0.38,48],[0.52,20],[0.64,4],[0.85,7],[1.05,12],[1.35,2]]);
    var uToe = 16 * gauss(el, 0.72, 0.13);
    blendBoneOffset('leftUpperLeg', -0.55 * uKnee, 0, -3, w);
    blendBoneOffset('rightUpperLeg', -0.55 * uKnee, 0, 3, w);
    blendBoneOffset('leftLowerLeg', uKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', uKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.45 * uKnee + uToe, 0, 0, w);
    blendBoneOffset('rightFoot', -0.45 * uKnee + uToe, 0, 0, w);
    if (bones.hips){
      /* sink deep, spring up past standing height with the scoop,
         land soft and glide the stride back */
      bones.hips.obj.position.y += trackVal(el, [[0,0],[0.38,-0.115],[0.52,-0.02],[0.66,0.032],[0.85,0.026],[1.05,-0.01],[1.35,0]]) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.38,0.02],[0.66,0.2],[0.9,0.21],[1.15,0.08],[1.35,0]]) * w;
    }
  }
  else if (name === 'airslash'){
    /* 空中斬り (VS batch 4, about 1.15s): jump-in air-to-ground
       slash. A quick hop, and at the top she slashes DOWN diagonally
       across the front (fish from upper right to lower left of her
       centerline), carries the momentum into a low landing crouch,
       then stands. Root rises on a short parabola and drives about
       0.3m forward. */
    if (el >= 1.15){ stopMotion(); return; }
    var asAir = Math.min(1, Math.max(0, (el - 0.12) / 0.62));
    var asY = (el > 0.12 && el < 0.74) ? 0.34 * 4 * asAir * (1 - asAir) : 0;
    blendBoneOffset('hips', 0, trackVal(el, [[0,0],[0.3,-14],[0.52,20],[0.74,14],[1.15,0]]), 0, w);
    blendBoneOffset('spine', trackVal(el, [[0,0],[0.3,-6],[0.52,14],[0.74,18],[0.95,8],[1.15,0]]), 0, 0, w);
    blendBoneOffset('chest', trackVal(el, [[0,0],[0.52,8],[0.95,4],[1.15,0]]), 0, 0, w);
    blendBoneOffset('head', trackVal(el, [[0,0],[0.3,-5],[0.52,4],[1.15,0]]), 0, 0, w);
    blendBoneOffset('neck', trackVal(el, [[0,0],[0.52,2],[1.15,0]]), 0, 0, w);
    blendBoneOffset('rightUpperArm',
      trackVal(el, [[0,-70],[0.3,58],[0.52,-52],[0.74,-48],[0.95,-40],[1.15,-70]]), 0,
      trackVal(el, [[0,5],[0.3,-22],[0.52,44],[0.74,40],[1.15,5]]), w);
    blendBoneOffset('rightLowerArm', 0, 0, trackVal(el, [[0,15],[0.3,10],[0.52,12],[1.15,15]]), w);
    blendBoneOffset('leftUpperArm',
      trackVal(el, [[0,-72],[0.3,-28],[0.52,-58],[0.95,-64],[1.15,-72]]), 0,
      trackVal(el, [[0,-6],[0.3,-30],[0.52,18],[1.15,-6]]), w);
    blendBoneOffset('leftLowerArm', 0, 0, trackVal(el, [[0,-14],[0.52,-10],[1.15,-14]]), w);
    var asKnee = trackVal(el, [[0,2],[0.3,38],[0.52,26],[0.74,10],[0.9,34],[1.15,2]]);
    blendBoneOffset('leftUpperLeg', -0.55 * asKnee, 0, 0, w);
    blendBoneOffset('rightUpperLeg', -0.55 * asKnee, 0, 0, w);
    blendBoneOffset('leftLowerLeg', asKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', asKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.4 * asKnee + 8, 0, 0, w);
    blendBoneOffset('rightFoot', -0.4 * asKnee + 8, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += (asY + trackVal(el, [[0,0],[0.9,-0.05],[1.15,0]])) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.74,0.3],[0.95,0.3],[1.15,0]]) * w;
    }
  }
  else if (name === 'airshot'){
    /* 空中射撃 (VS batch 4, about 1.35s): the rifle's air version.
       She hops, shoulders the fish level in mid-air (same aim family
       as the ground burst, legs trailing instead of planted) and
       fires ONE shot at 0.62s — flash and recoil on that timing
       (flash handled in animate()) — then drops into a landing
       absorb and settles. */
    if (el >= 1.35){ stopMotion(); return; }
    var aiKick = el > 0.62 ? Math.exp(-(el - 0.62) / 0.06) : 0;
    var aiAim = trackVal(el, [[0,0],[0.3,1],[0.95,1],[1.2,0],[1.35,0]]);
    function aiVal(stand, aim){ return stand + (aim - stand) * aiAim; }
    var aiAir = Math.min(1, Math.max(0, (el - 0.1) / 0.8));
    var aiY = (el > 0.1 && el < 0.9) ? 0.30 * 4 * aiAir * (1 - aiAir) : 0;
    blendBoneOffset('hips', 0, aiVal(0, -14), 0, w);
    blendBoneOffset('spine', -2 * aiKick, aiVal(0, -5), 0, w);
    blendBoneOffset('chest', -1.5 * aiKick, aiVal(0, -9), 0, w);
    blendBoneOffset('head', aiVal(0, 3), aiVal(0, 13), aiVal(0, 5), w);
    blendBoneOffset('neck', aiVal(0, 1), aiVal(0, 6), 0, w);
    blendBoneOffset('rightUpperArm', aiVal(-70, -56), 0, aiVal(5, 70), w);
    blendBoneOffset('rightLowerArm', 0, 0, aiVal(15, 84), w);
    blendBoneOffset('rightHand', aiVal(0, -34) + 11 * aiKick, 0, aiVal(0, -56), w);
    blendBoneOffset('leftUpperArm', aiVal(-72, 8), 0, aiVal(-6, -94), w);
    blendBoneOffset('leftLowerArm', 0, 0, aiVal(-14, -5), w);
    /* legs trail tucked in the air, reach down for the landing */
    blendBoneOffset('leftUpperLeg', trackVal(el, [[0,0],[0.3,16],[0.9,10],[1.1,-8],[1.35,0]]), 0, 0, w);
    blendBoneOffset('rightUpperLeg', trackVal(el, [[0,0],[0.3,24],[0.9,18],[1.1,-4],[1.35,0]]), 0, 0, w);
    blendBoneOffset('leftLowerLeg', trackVal(el, [[0,2],[0.3,42],[0.9,30],[1.1,16],[1.35,2]]), 0, 0, w);
    blendBoneOffset('rightLowerLeg', trackVal(el, [[0,2],[0.3,50],[0.9,36],[1.1,12],[1.35,2]]), 0, 0, w);
    blendBoneOffset('leftFoot', trackVal(el, [[0,0],[0.3,20],[1.1,-4],[1.35,0]]), 0, 0, w);
    blendBoneOffset('rightFoot', trackVal(el, [[0,0],[0.3,22],[1.1,-2],[1.35,0]]), 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += (aiY + trackVal(el, [[0,0],[1.1,-0.045],[1.35,0]])) * w;
      bones.hips.obj.position.z += (-0.05 * aiKick + trackVal(el, [[0,0],[0.9,0.18],[1.35,0]])) * w;
    }
  }
  else if (name === 'chargeshot' || name === 'bazooka'){
    /* チャージ射撃 (VS batch 4, about 1.7s): the release for the
       チャージ溜め stance. She holds the two-handed charge pose
       (tremble growing, glow gathering — flash sprite in animate()
       builds on the same schedule) and at 0.85s FIRES: one huge
       recoil that rocks her whole body back, the fish kicking up,
       root shoved back ~0.16m. Then she rides the recoil out,
       lowers the fish, and settles.
       The サブ射撃・鰤バズーカ fires from this same braced
       two-handed pose at the same 0.85s mark (its fish shell is a
       real projectile — see spawnBazookaProj). */
    if (el >= 1.7){ stopMotion(); return; }
    var csHold = trackVal(el, [[0,0],[0.3,1],[0.85,1],[1.05,0.25],[1.35,0],[1.7,0]]);
    var csKick = el > 0.85 ? Math.exp(-(el - 0.85) / 0.09) : 0;
    var csTremble = Math.sin(el * 54) * 1.5 * csHold * (el < 0.85 ? 1 : 0);
    function csVal(stand, held){ return stand + (held - stand) * csHold; }
    blendBoneOffset('rightUpperArm', csVal(-70, -32) + csTremble * 0.4 - 4 * csKick, 0, csVal(5, 42) + 8 * csKick, w);
    blendBoneOffset('rightLowerArm', 0, 0, csVal(15, 6) + 10 * csKick, w);
    blendBoneOffset('rightHand', csVal(0, -4) + 16 * csKick, 0, csVal(0, -10), w);
    blendBoneOffset('leftUpperArm', csVal(-72, -38) + csTremble * 0.4, 0, csVal(-6, -32), w);
    blendBoneOffset('leftLowerArm', 0, 0, csVal(-14, -28), w);
    blendBoneOffset('spine', csVal(0, 8) + csTremble * 0.3 - 10 * csKick, 0, 0, w);
    blendBoneOffset('chest', csVal(0, 5) - 6 * csKick, 0, 0, w);
    blendBoneOffset('neck', csVal(0, 4) - 3 * csKick, 0, 0, w);
    blendBoneOffset('head', csVal(0, 6) - 5 * csKick, 0, 0, w);
    var csKnee = csVal(2, 16) + 6 * csKick;
    blendBoneOffset('leftUpperLeg', csVal(0, -9), 0, -3 * csHold, w);
    blendBoneOffset('rightUpperLeg', csVal(0, -9), 0, 3 * csHold, w);
    blendBoneOffset('leftLowerLeg', csKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', csKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.45 * csKnee, 0, 0, w);
    blendBoneOffset('rightFoot', -0.45 * csKnee, 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += (csVal(0, -0.03) - 0.01 * csKick) * w;
      bones.hips.obj.position.z += (csVal(0, 0.03) - 0.16 * csKick) * w;
    }
  }
  else if (name === 'javelin'){
    /* 鰤ジャベリン投擲 (about 1.15s): she hoists the fish high
       behind her head, takes one stamping step and HURLS it — the
       projectile spawns at the 0.45s release (FX scheduler) and
       flies a real tumbling parabola. The charge stage was decided
       by how long the button was held before this motion started
       (see fireJavelin); it drives the shell's speed and damage. */
    if (el >= 1.15){ stopMotion(); return; }
    blendBoneOffset('rightUpperArm',
      trackVal(el, [[0,-70],[0.38,-118],[0.45,-118],[0.56,-28],[0.8,-38],[1.15,-70]]), 0,
      trackVal(el, [[0,5],[0.38,26],[0.56,58],[1.15,5]]), w);
    blendBoneOffset('rightLowerArm', 0, 0, trackVal(el, [[0,15],[0.38,46],[0.56,4],[1.15,15]]), w);
    blendBoneOffset('rightHand',
      trackVal(el, [[0,0],[0.38,-30],[0.56,18],[1.15,0]]), 0,
      trackVal(el, [[0,0],[0.38,-40],[0.56,-10],[1.15,0]]), w);
    blendBoneOffset('leftUpperArm',
      trackVal(el, [[0,-72],[0.38,-40],[0.56,-84],[1.15,-72]]), 0,
      trackVal(el, [[0,-6],[0.38,18],[0.56,-16],[1.15,-6]]), w);
    blendBoneOffset('leftLowerArm', 0, 0, trackVal(el, [[0,-14],[0.56,-30],[1.15,-14]]), w);
    blendBoneOffset('spine',
      trackVal(el, [[0,0],[0.38,-7],[0.56,10],[1.15,0]]),
      trackVal(el, [[0,0],[0.38,10],[0.56,-8],[1.15,0]]), 0, w);
    blendBoneOffset('chest', trackVal(el, [[0,0],[0.38,-4],[0.56,6],[1.15,0]]), 0, 0, w);
    blendBoneOffset('neck', trackVal(el, [[0,0],[0.56,-4],[1.15,0]]),
      trackVal(el, [[0,0],[0.38,-8],[0.56,5],[1.15,0]]), 0, w);
    blendBoneOffset('head', trackVal(el, [[0,0],[0.56,-3],[1.15,0]]),
      trackVal(el, [[0,0],[0.38,-10],[0.56,6],[1.15,0]]), 0, w);
    blendBoneOffset('leftUpperLeg', trackVal(el, [[0,0],[0.38,-6],[0.56,-16],[1.15,0]]), 0, 0, w);
    blendBoneOffset('rightUpperLeg', trackVal(el, [[0,0],[0.38,6],[0.56,10],[1.15,0]]), 0, 0, w);
    blendBoneOffset('leftLowerLeg', trackVal(el, [[0,2],[0.56,10],[1.15,2]]), 0, 0, w);
    blendBoneOffset('rightLowerLeg', trackVal(el, [[0,2],[0.56,14],[1.15,2]]), 0, 0, w);
    blendBoneOffset('leftFoot', trackVal(el, [[0,0],[0.56,-4],[1.15,0]]), 0, 0, w);
    blendBoneOffset('rightFoot', trackVal(el, [[0,0],[0.56,-6],[1.15,0]]), 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += trackVal(el, [[0,0],[0.38,-0.03],[0.56,-0.01],[1.15,0]]) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.38,0],[0.56,0.22],[0.9,0.22],[1.15,0]]) * w;
    }
  }
  else if (name === 'fly'){
    /* ブースト飛行 (LOOP): the airborne pose while the boost-flight
       physics in updateFreeMove carry model.position.y. Torso pitched
       slightly into the flight, front knee tucked, back leg trailing
       toes-down, the fish held low-forward in the sword hand, the
       other arm out for balance, with a gentle hover bob. Loops
       until the flight ends or another motion replaces it. */
    var fbob = Math.sin(el * 2.3);
    blendBoneOffset('spine', 7, 0, 0, w);
    blendBoneOffset('chest', 4, 0, 1.5 * fbob, w);
    blendBoneOffset('neck', -3, 0, 0, w);
    blendBoneOffset('head', -5, 0, 0, w);
    blendBoneOffset('leftUpperLeg', -20, 0, -2, w);
    blendBoneOffset('rightUpperLeg', 12, 0, 2, w);
    blendBoneOffset('leftLowerLeg', 34, 0, 0, w);
    blendBoneOffset('rightLowerLeg', 20, 0, 0, w);
    blendBoneOffset('leftFoot', 14, 0, 0, w);
    blendBoneOffset('rightFoot', 20, 0, 0, w);
    blendBoneOffset('leftUpperArm', -64, 0, 16, w);
    blendBoneOffset('leftLowerArm', 0, 0, -22, w);
    blendBoneOffset('rightUpperArm', -60, 0, -14, w);
    blendBoneOffset('rightLowerArm', 0, 0, 26, w);
    blendBoneOffset('rightHand', -6, 0, 0, w);
    blendBoneOffset('hips', 0, 0, 1.5 * fbob, w);
    if (bones.hips) bones.hips.obj.position.y += (0.03 + 0.018 * fbob) * w;
  }
  else if (name === 'boostdash'){
    /* ブーストダッシュ (VS batch 4, LOOP): held boost movement —
       faster and flatter than 走る. Torso pitched ~20° into it, both
       arms pinned back, the fish streaming behind her, legs cycling
       at ~3.4 steps/s with a long flight phase. Loops until stopped,
       like walk/run. */
    var bp = el * (Math.PI * 2 / 0.29);
    var bs = Math.sin(bp), bc = Math.cos(bp);
    var bLegL = -46 * bs, bLegR = 46 * bs;
    var bKneeL = 8 + 74 * Math.pow(Math.max(0, bc), 1.4);
    var bKneeR = 8 + 74 * Math.pow(Math.max(0, -bc), 1.4);
    blendBoneOffset('leftUpperLeg', bLegL, 0, 0, w);
    blendBoneOffset('rightUpperLeg', bLegR, 0, 0, w);
    blendBoneOffset('leftLowerLeg', bKneeL, 0, 0, w);
    blendBoneOffset('rightLowerLeg', bKneeR, 0, 0, w);
    blendBoneOffset('leftFoot', -bLegL * 0.35 + 20 * Math.max(0, -bs), 0, 0, w);
    blendBoneOffset('rightFoot', -bLegR * 0.35 + 20 * Math.max(0, bs), 0, 0, w);
    /* arms pinned back by the wind; the sword arm streams the fish */
    blendBoneOffset('leftUpperArm', -52, 0, 30 + 4 * bs, w);
    blendBoneOffset('leftLowerArm', 0, 0, -34, w);
    blendBoneOffset('rightUpperArm', -50, 0, -32 - 4 * bs, w);
    blendBoneOffset('rightLowerArm', 0, 0, 40, w);
    blendBoneOffset('rightHand', -10, 0, 0, w);
    blendBoneOffset('spine', 20, 0, 0, w);
    blendBoneOffset('chest', 11, 2 * bs, 0, w);
    blendBoneOffset('neck', -9, 0, 0, w);
    blendBoneOffset('head', -12, 0, 0, w);
    blendBoneOffset('hips', 0, 2.5 * bs, 2 * bs, w);
    if (bones.hips) bones.hips.obj.position.y += (-0.008 + 0.03 * Math.abs(Math.sin(bp))) * w;
  }
  else if (name === 'launch'){
    /* 打ち上げ被弾 (VS batch 4, about 2.0s): the launcher reaction —
       distinct from the ground のけぞり. The hit scoops her UP: back
       arched, arms and legs flung out, she sails up ~0.5m, tips over
       in the air, and crashes down onto her back (hips pitch set
       directly, like ダウン), lies there a beat, then pushes up and
       resets — faster than the full down get-up, since a launcher
       follow-up is already coming. */
    if (el >= 2.0){ stopMotion(); return; }
    var lnAir = trackVal(el, [[0,0],[0.18,1],[0.85,1],[1.05,0],[2.0,0]]);
    var lnDown = trackVal(el, [[0,0],[0.95,0],[1.08,1],[1.55,1],[1.85,0],[2.0,0]]);
    var lnPitch = -26 * lnAir - 62 * lnDown;
    blendBoneOffset('spine', -16 * lnAir + 6 * lnDown, 0, 0, w);
    blendBoneOffset('chest', -11 * lnAir + 4 * lnDown, 0, 0, w);
    blendBoneOffset('neck', -10 * lnAir - 12 * lnDown, 0, 0, w);
    blendBoneOffset('head', -18 * lnAir - 16 * lnDown + trackVal(el, [[0,0],[1.85,0],[2.0,4],[2.0,4]]), 0, 0, w);
    blendBoneOffset('rightUpperArm', -70 + 48 * lnAir - 30 * lnDown, 0, 5 + 34 * lnAir + 6 * lnDown, w);
    blendBoneOffset('rightLowerArm', 0, 0, 15 + 26 * lnAir + 10 * lnDown, w);
    blendBoneOffset('leftUpperArm', -72 + 42 * lnAir - 26 * lnDown, 0, -6 - 34 * lnAir - 6 * lnDown, w);
    blendBoneOffset('leftLowerArm', 0, 0, -14 - 24 * lnAir - 8 * lnDown, w);
    var lnKnee = 10 + 30 * lnAir + 28 * lnDown;
    blendBoneOffset('leftUpperLeg', -0.5 * lnKnee, 0, 0, w);
    blendBoneOffset('rightUpperLeg', -0.5 * lnKnee, 0, 0, w);
    blendBoneOffset('leftLowerLeg', lnKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', lnKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.3 * lnKnee + 12 * lnAir, 0, 0, w);
    blendBoneOffset('rightFoot', -0.3 * lnKnee + 12 * lnAir, 0, 0, w);
    if (bones.hips){
      tmpE.set(lnPitch * D2R, poseExtraCur.hipsY * D2R, 0);
      tmpQ.setFromEuler(tmpE);
      tmpQ2.copy(bones.hips.rest).multiply(tmpQ);
      bones.hips.obj.quaternion.slerp(tmpQ2, w);
      var lnArc = (el > 0.1 && el < 1.0) ? 0.52 * Math.sin(Math.min(1, (el - 0.1) / 0.9) * Math.PI) : 0;
      bones.hips.obj.position.y += (lnArc + trackVal(el, [[0,0],[1.08,-0.5],[1.55,-0.5],[1.85,-0.02],[2.0,0]])) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.6,-0.22],[1.08,-0.3],[1.55,-0.3],[2.0,0]]) * w;
    }
  }
  else if (name === 'stagger'){
    /* よろけ・ガード崩れ (VS batch 4, about 1.5s): the long
       reaction — guard crushed, she reels. Distinct from 被弾
       (short snap): she stumbles back two unsteady steps over a
       full second, torso swaying side to side with a decaying
       wobble, arms windmilling for balance, head rolling dizzily,
       the fish dragging low — then catches herself, shakes her
       head, and resets. */
    if (el >= 1.5){ stopMotion(); return; }
    var stK = trackVal(el, [[0,0],[0.12,1],[1.05,0.75],[1.5,0]]);
    var stWob = Math.sin(el * 11) * 7 * stK * Math.exp(-el * 0.7);
    blendBoneOffset('hips', 0, 0, stWob * 0.6, w);
    blendBoneOffset('spine', -8 * stK, 0, stWob * 0.5, w);
    blendBoneOffset('chest', -6 * stK, 0, stWob * 0.4, w);
    blendBoneOffset('neck', 4 * stK, stWob * 0.5, stWob * 0.5, w);
    blendBoneOffset('head', 8 * stK + trackVal(el, [[0,0],[1.2,0],[1.38,-6],[1.5,0]]), stWob * 0.7, stWob * 0.6, w);
    /* windmilling arms, out of phase with each other */
    blendBoneOffset('rightUpperArm', -70 + 22 * stK + Math.sin(el * 11) * 14 * stK, 0, 5 + 24 * stK, w);
    blendBoneOffset('rightLowerArm', 0, 0, 15 + 18 * stK, w);
    blendBoneOffset('rightHand', 8 * stK, 0, 0, w);
    blendBoneOffset('leftUpperArm', -72 + 20 * stK + Math.sin(el * 11 + 2.4) * 14 * stK, 0, -6 - 24 * stK, w);
    blendBoneOffset('leftLowerArm', 0, 0, -(14 + 16 * stK), w);
    /* two stumbling steps back: legs alternate unevenly */
    blendBoneOffset('leftUpperLeg', trackVal(el, [[0,0],[0.3,18],[0.6,-8],[0.95,12],[1.5,0]]), 0, 0, w);
    blendBoneOffset('rightUpperLeg', trackVal(el, [[0,0],[0.3,-10],[0.6,16],[0.95,-6],[1.5,0]]), 0, 0, w);
    blendBoneOffset('leftLowerLeg', trackVal(el, [[0,2],[0.3,8],[0.6,20],[0.95,10],[1.5,2]]), 0, 0, w);
    blendBoneOffset('rightLowerLeg', trackVal(el, [[0,2],[0.3,18],[0.6,8],[0.95,16],[1.5,2]]), 0, 0, w);
    blendBoneOffset('leftFoot', trackVal(el, [[0,0],[0.6,8],[1.5,0]]), 0, 0, w);
    blendBoneOffset('rightFoot', trackVal(el, [[0,0],[0.6,8],[1.5,0]]), 0, 0, w);
    if (bones.hips){
      bones.hips.obj.position.y += (-0.02 * stK + 0.006 * Math.abs(Math.sin(el * 11)) * stK) * w;
      bones.hips.obj.position.z += trackVal(el, [[0,0],[0.35,-0.16],[0.7,-0.3],[1.05,-0.36],[1.5,0]]) * w;
    }
  }
  else if (name === 'victory'){
    /* 勝利モーション (VS batch 4, about 3.2s): the round-win beat.
       A small delighted hop, the fish TWIRLED once overhead (same
       direct-hand technique as the 唐竹割り show-off), then both
       arms up in a banzai with the fish raised to the sky, a second
       smaller hop, and a held win pose — chest out, chin up — before
       she settles back to stand. */
    if (el >= 3.2){ stopMotion(); return; }
    var vcTwirl = 0, vcTwirling = false;
    if (el > 0.55 && el <= 1.15){ vcTwirl = 360 * easeInOut((el - 0.55) / 0.6); vcTwirling = true; }
    else if (el > 1.15 && el < 1.25){ vcTwirl = 360; vcTwirling = true; }
    var vcUp = trackVal(el, [[0,0],[0.45,0.4],[1.25,1],[2.7,1],[3.2,0]]);
    var vcHop = Math.max(
      (el > 0.05 && el < 0.45) ? 0.10 * Math.sin((el - 0.05) / 0.4 * Math.PI) : 0,
      (el > 1.5 && el < 1.82) ? 0.06 * Math.sin((el - 1.5) / 0.32 * Math.PI) : 0);
    blendBoneOffset('rightUpperArm',
      trackVal(el, [[0,-70],[0.45,-30],[1.25,-96],[2.7,-96],[3.2,-70]]), 0,
      trackVal(el, [[0,5],[0.45,-14],[1.25,16],[2.7,16],[3.2,5]]), w);
    blendBoneOffset('rightLowerArm', 0, 0, trackVal(el, [[0,15],[1.25,8],[3.2,15]]), w);
    blendBoneOffset('rightHand', -4 * vcUp, 0, 0, w);
    if (vcTwirling && bones.rightHand){
      tmpE.set(vcTwirl * D2R, 0, -10 * D2R);
      tmpQ.setFromEuler(tmpE);
      tmpQ2.copy(bones.rightHand.rest).multiply(tmpQ);
      bones.rightHand.obj.quaternion.slerp(tmpQ2, Math.max(w, 0.85));
    }
    blendBoneOffset('leftUpperArm',
      trackVal(el, [[0,-72],[0.45,-40],[1.25,-94],[2.7,-94],[3.2,-72]]), 0,
      trackVal(el, [[0,-6],[1.25,-18],[2.7,-18],[3.2,-6]]), w);
    blendBoneOffset('leftLowerArm', 0, 0, trackVal(el, [[0,-14],[1.25,-8],[3.2,-14]]), w);
    blendBoneOffset('spine', -5 * vcUp, 0, 0, w);
    blendBoneOffset('chest', -3 * vcUp, 0, 0, w);
    blendBoneOffset('neck', -4 * vcUp, 0, 0, w);
    blendBoneOffset('head', -8 * vcUp, 0, 2 * Math.sin(el * 2.2) * vcUp, w);
    var vcKnee = trackVal(el, [[0,2],[0.05,16],[0.25,4],[1.5,14],[1.66,4],[3.2,2]]);
    blendBoneOffset('leftUpperLeg', -0.55 * vcKnee, 0, -3 * vcUp, w);
    blendBoneOffset('rightUpperLeg', -0.55 * vcKnee, 0, 3 * vcUp, w);
    blendBoneOffset('leftLowerLeg', vcKnee, 0, 0, w);
    blendBoneOffset('rightLowerLeg', vcKnee, 0, 0, w);
    blendBoneOffset('leftFoot', -0.45 * vcKnee, 0, 0, w);
    blendBoneOffset('rightFoot', -0.45 * vcKnee, 0, 0, w);
    blendBoneOffset('hips', 0, 0, 0, w);
    if (bones.hips) bones.hips.obj.position.y += vcHop * w;
  }

}

var clock = new THREE.Clock();
var frames = 0, fpsTime = 0;

function animate(){
  requestAnimationFrame(animate);
  var dt = Math.min(clock.getDelta(), 0.05);
  var t = clock.elapsedTime;
  lastT = t;
  try {
    /* camera fly */
    if (camAnim){
      camAnim.t += dt / 0.7;
      var k = camAnim.t >= 1 ? 1 : (1 - Math.pow(1 - camAnim.t, 3));
      camera.position.lerpVectors(camAnim.p0, camAnim.p1, k);
      controls.target.lerpVectors(camAnim.t0, camAnim.t1, k);
      if (camAnim.t >= 1) camAnim = null;
    }
    controls.update();
    pollGamepad();

    if (model){
      /* lerp joint sliders */
      Object.keys(joints).forEach(function(k){
        jointCur[k] += (joints[k].val - jointCur[k]) * Math.min(1, dt * 10);
      });
      /* lerp pose extra channels (sword poses) the same way */
      POSE_EXTRA_CHANNELS.forEach(function(k){
        poseExtraCur[k] += (poseExtraTarget[k] - poseExtraCur[k]) * Math.min(1, dt * 10);
      });

      var wave = (poseName === 'wave');
      var bowX = 0;
      if (bowAnim >= 0){
        bowAnim += dt / 1.6;
        if (bowAnim >= 1) bowAnim = -1;
        else bowX = Math.sin(bowAnim * Math.PI) * 34;
      }
      var breath = toggles.breath ? Math.sin(t * 1.7) : 0;
      var breathX = toggles.breath ? breath * 1.6 : 0;

      /* look-at pointer overrides head sliders */
      var headYaw = jointCur.headYaw, headPitch = jointCur.headPitch;
      if (toggles.look && pointer.active){
        headYaw += -pointer.x * 32;
        headPitch += pointer.y * 18;
      }

      var rElbow = jointCur.rElbow;
      if (wave){
        rElbow = 24 + Math.sin(t * 7) * 24;
      }

      /* apply bones (offsets relative to rest pose) */
      setBoneOffset('head', headPitch + bowX * 0.45, headYaw, 0);
      setBoneOffset('neck', bowX * 0.25, headYaw * 0.4, 0);
      setBoneOffset('spine', jointCur.spine + bowX * 0.55 + breathX * 0.4, 0, 0);
      setBoneOffset('chest', bowX * 0.35 + breathX, poseExtraCur.chestY, 0);
      /* bone local axes calibrated against this rig:
         upper arms raise/lower around local X (negative = down), elbows bend around local Z.
         Arm angle is measured from the T-pose: -90 = arm pointing straight up.
         Verified against the bone data: past about -100 the hand crosses the body's
         midline and the raise looks wrong, so presets and the slider stay above that. */
      setBoneOffset('leftUpperArm', -jointCur.lArm + (toggles.breath ? breath * 1.0 : 0), 0, poseExtraCur.lArmZ);
      setBoneOffset('rightUpperArm', -jointCur.rArm + (toggles.breath ? breath * 1.0 : 0), 0, poseExtraCur.rArmZ);
      setBoneOffset('leftLowerArm', 0, 0, -jointCur.lElbow);
      setBoneOffset('rightLowerArm', 0, 0, rElbow);
      /* the fish sword rides on the right hand bone; the hand tilt aims it */
      setBoneOffset('rightHand', poseExtraCur.rHandX, poseExtraCur.rHandY, poseExtraCur.rHandZ);
      setBoneOffset('leftUpperLeg', 0, 0, poseExtraCur.lLegZ);
      setBoneOffset('rightUpperLeg', 0, 0, poseExtraCur.rLegZ);
      setBoneOffset('leftLowerLeg', poseExtraCur.lKnee, 0, 0);
      setBoneOffset('rightLowerLeg', poseExtraCur.rKnee, 0, 0);
      setBoneOffset('leftFoot', poseExtraCur.lFootX, 0, 0);
      setBoneOffset('rightFoot', poseExtraCur.rFootX, 0, 0);
      setBoneOffset('hips', 0, poseExtraCur.hipsY, 0);

      if (bones.hips){
        bones.hips.obj.position.y = bones.hips.restPos.y - poseExtraCur.hipsDrop + (toggles.breath ? Math.sin(t * 1.7) * 0.0035 : 0);
        /* sword motions add their own forward step （踏み込み） on top of
           this per-frame reset, so the root always glides back cleanly */
        bones.hips.obj.position.x = bones.hips.restPos.x;
        bones.hips.obj.position.z = bones.hips.restPos.z;
      }

      /* free-roam: move the model group around the field (and keep
         the key light, her ground highlight and the aura with her) */
      if (freeMode) updateFreeMove(dt);
      updatePropsFx(dt);
      updateDummiesFx(dt);
      if (typeof updateMission === 'function') updateMission(dt);
      updateAwaken(dt);
      updateLock(dt);
      key.position.set(model.position.x + 1.6, 2.6, model.position.z + 2.0);
      key.target.position.set(model.position.x, 0, model.position.z);
      key.target.updateMatrixWorld();
      floor.position.x = model.position.x; floor.position.z = model.position.z;
      auraLight.position.set(model.position.x, model.position.y + 1.15, model.position.z + 0.45);
      auraSprite.position.set(model.position.x, model.position.y + 1.02, model.position.z);

      /* procedural motion: ramp the blend weight, then override the body
         bones. Expressions are applied further below and keep working. */
      if (motion){
        var wTarget = motionFading ? 0 : 1;
        var wStep = dt / 0.3;
        if (motionW < wTarget) motionW = Math.min(wTarget, motionW + wStep);
        else if (motionW > wTarget) motionW = Math.max(wTarget, motionW - wStep);
        if (motionFading && motionW <= 0){
          motion = null; motionFading = false; syncMotionButtons();
        }
      }
      if (motion && motionW > 0.001) applyMotion(t);

      /* muzzle flash: during the burst, light the fish's head for a
         few frames at each shot on the BURST_SHOTS schedule */
      flashSprite.visible = false;
      flashSprite.material.color.setHex(0xffffff);
      if (motion && motion.name === 'burst' && !motionFading && bones.rightHand){
        var elF = t - motion.start;
        for (var fi = 0; fi < BURST_SHOTS.length; fi++){
          var fd = elF - BURST_SHOTS[fi];
          if (fd >= 0 && fd <= 0.055){
            if (shotSndKey !== motion.start + 'b' + fi){ shotSndKey = motion.start + 'b' + fi; playShotSfx(false); }
            flashK = 1 - fd / 0.055;
            bones.rightHand.obj.updateWorldMatrix(true, false);
            _tipV.set(0, fishLen, 0);
            bones.rightHand.obj.localToWorld(_tipV);
            flashSprite.position.copy(_tipV);
            var fsc = (0.15 + 0.19 * flashK) * (fi === 2 ? 1.25 : 1);
            flashSprite.scale.set(fsc, fsc, 1);
            flashSprite.material.opacity = flashK;
            flashSprite.visible = true;
            break;
          }
        }
      }
      else if (motion && (motion.name === 'airshot' || motion.name === 'chargeshot') && !motionFading && bones.rightHand){
        /* single big shots: air shot fires at 0.62s, the charge shot
           at 0.85s — a gathering glow before the charge shot, then a
           flash larger than any burst round */
        var elS2 = t - motion.start;
        var shotAt = motion.name === 'airshot' ? 0.62 : 0.85;
        var sd2 = elS2 - shotAt;
        var glowK = 0;
        if (motion.name === 'chargeshot' && elS2 > 0.3 && elS2 < shotAt){
          glowK = (elS2 - 0.3) / (shotAt - 0.3);
        }
        if ((sd2 >= 0 && sd2 <= 0.07) || glowK > 0){
          if (sd2 >= 0 && sd2 <= 0.07 && shotSndKey !== motion.start + 's'){
            shotSndKey = motion.start + 's';
            playShotSfx(motion.name === 'chargeshot');
          }
          bones.rightHand.obj.updateWorldMatrix(true, false);
          _tipV.set(0, fishLen, 0);
          bones.rightHand.obj.localToWorld(_tipV);
          flashSprite.position.copy(_tipV);
          if (sd2 >= 0 && sd2 <= 0.07){
            flashK = 1 - sd2 / 0.07;
            var ssc = (0.16 + 0.22 * flashK) * (motion.name === 'chargeshot' ? 1.8 : 1.1);
            flashSprite.scale.set(ssc, ssc, 1);
            flashSprite.material.opacity = flashK;
          } else {
            var gsc = 0.08 + 0.18 * glowK;
            flashSprite.scale.set(gsc, gsc, 1);
            flashSprite.material.opacity = 0.15 + 0.5 * glowK;
          }
          flashSprite.visible = true;
        }
      }
      else if (motion && motion.name === 'charge' && !motionFading && bones.rightHand){
        /* charge glow gathering on the fish's head, on the same
           schedule as the charge motion: it builds 0.4-1.7s, pulses
           gently while at full charge, and dies as the stance is
           released */
        var elC = t - motion.start;
        var cl = trackVal(elC, [[0,0],[0.4,0.12],[1.7,1],[2.05,1],[2.4,0]]);
        if (elC > 1.7 && elC < 2.05) cl *= 0.92 + 0.08 * Math.sin(elC * 26);
        cl *= motionW;
        if (cl > 0.02){
          bones.rightHand.obj.updateWorldMatrix(true, false);
          _tipV.set(0, fishLen, 0);
          bones.rightHand.obj.localToWorld(_tipV);
          flashSprite.position.copy(_tipV);
          var csc = 0.10 + 0.26 * cl;
          flashSprite.scale.set(csc, csc, 1);
          flashSprite.material.opacity = 0.18 + 0.62 * cl;
          flashSprite.visible = true;
        }
      }

      /* flashy action FX scheduler: tracer beams / bolts / slash
         arcs / charge glows / projectile launches, on the same
         motion timings as the hit detection (defined with the FX
         system above) */
      updateActionFX(t, dt);

      /* golden aura: follows the awaken motion's schedule — a faint
         warm shimmer while she gathers (with a fine flicker), a full
         flare on the burst at 1.0s, holding while the power pose
         lasts, then dying away as she settles */
      var auraK = 0;
      if (motion && motion.name === 'awaken' && !motionFading){
        var elAw = t - motion.start;
        auraK = trackVal(elAw, [[0,0],[0.45,0.16],[0.98,0.3],[1.1,1],[1.7,0.85],[2.05,0.3],[2.3,0]]);
        if (elAw > 0.45 && elAw < 1.0) auraK += 0.045 * Math.sin(elAw * 66);
        auraK = Math.min(1, Math.max(0, auraK)) * motionW;
      }
      /* while the awakening runs, the aura holds at a steady golden
         burn for the whole 12s (the motion's own flare covers the
         opening burst, this carries it to the end) */
      if (awkActive){
        var awkAuraK = 0.62 + 0.07 * Math.sin(t * 24);
        if (awkAuraK > auraK) auraK = awkAuraK;
      }
      auraLight.intensity = auraK * 2.4;
      auraSprite.visible = auraK > 0.01;
      if (auraSprite.visible){
        auraSprite.material.opacity = auraK * 0.5;
        var auraScale = 1.45 + 0.4 * auraK + 0.03 * Math.sin(t * 30) * auraK;
        auraSprite.scale.set(auraScale, auraScale, 1);
      }

      /* sway: hair / ears / tail */
      swayBones.forEach(function(s){
        if (!toggles.sway){ s.obj.quaternion.copy(s.rest); return; }
        var amp = s.tail ? 5.5 : 2.6;
        var sx = Math.sin(t * 1.9 + s.phase) * amp;
        var sz = Math.cos(t * 1.5 + s.phase * 1.3) * amp * 0.7;
        tmpE.set(sx * D2R, 0, sz * D2R);
        tmpQ.setFromEuler(tmpE);
        s.obj.quaternion.copy(s.rest).multiply(tmpQ);
      });

      /* tail wag: procedural, applied AFTER the sway pass above so it
         layers on top instead of fighting it. Local Z = sideways swing,
         local X = pitch (droop/lift offset). Tails.002 follows the root
         with a phase lag and a touch more bend, like a real wag. Runs
         regardless of pose presets and procedural motions. */
      if (tailRoot || tailMid){
        var tm = TAIL_MODES[tailMode];
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
      var blinkVal = exprValues.blink || 0;
      if (blinkAnim >= 0){
        blinkAnim += dt / 0.22;
        if (blinkAnim >= 1) blinkAnim = -1;
        else blinkVal = Math.max(blinkVal, Math.sin(blinkAnim * Math.PI));
      } else if (toggles.blink){
        if (blinkPhase < 0 && t > nextAutoBlink){ blinkPhase = 0; }
        if (blinkPhase >= 0){
          blinkPhase += dt / 0.2;
          if (blinkPhase >= 1){ blinkPhase = -1; nextAutoBlink = t + 2.2 + Math.random() * 2.6; }
          else blinkVal = Math.max(blinkVal, Math.sin(blinkPhase * Math.PI));
        }
      }

      /* apply expressions */
      Object.keys(exprBinds).forEach(function(name){
        var v = (name === 'blink') ? Math.min(1, blinkVal) : (exprValues[name] || 0);
        if (v === 0 && name !== 'blink'){
          /* still write 0 once to clear */
        }
        exprBinds[name].forEach(function(b){
          b.mesh.morphTargetInfluences[b.index] = v * b.weight;
        });
      });
    }

    /* FX pass + camera shake (offset applied for the render only,
       then taken back off so OrbitControls never sees it) */
    updateFX(dt);
    var shX = 0, shY = 0;
    if (shakeAmp > 0.002){
      shX = (Math.random() * 2 - 1) * shakeAmp;
      shY = (Math.random() * 2 - 1) * shakeAmp * 0.7;
      camera.position.x += shX;
      camera.position.y += shY;
    }
    renderer.render(scene, camera);
    if (shX || shY){ camera.position.x -= shX; camera.position.y -= shY; }

    frames++; fpsTime += dt;
    if (fpsTime >= 0.5){
      var fps = Math.round(frames / fpsTime);
      frames = 0; fpsTime = 0;
      if (model){
        statsEl.hidden = false;
        statsEl.textContent = fps + ' FPS ／ ' + modelInfo.tris.toLocaleString() + ' ポリゴン ／ 表情 ' + exprNames.length + '種';
      }
    }
  } catch(err){
    if (isPolicyError(err)) notePolicyError(err);
    else showError('描画中にエラー: ' + err.message);
  }
}

window.addEventListener('resize', function(){
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

loadDefault();
animate();
})();
