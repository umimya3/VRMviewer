(function(V){
"use strict";

V.MOTION_GROUPS = [];
V.MOTION_DEFS = [];
V.MOTION_MAP = {};

function gauss(x, c, w){
  var d = (x - c) / w;
  return Math.exp(-d * d);
}
function smooth01(x){
  x = Math.min(1, Math.max(0, x));
  return x * x * (3 - 2 * x);
}
function easeInOut(x){
  x = Math.min(1, Math.max(0, x));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
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

V.math = {
  gauss: gauss,
  smooth01: smooth01,
  easeInOut: easeInOut,
  trackVal: trackVal,
  D2R: Math.PI / 180
};

V.registerGroup = function(grp){
  for (var i = 0; i < V.MOTION_GROUPS.length; i++){
    if (V.MOTION_GROUPS[i].id === grp.id){
      V.MOTION_GROUPS[i] = grp;
      return;
    }
  }
  V.MOTION_GROUPS.push(grp);
};

V.registerMotion = function(def){
  V.MOTION_MAP[def.id] = def;
  for (var i = 0; i < V.MOTION_DEFS.length; i++){
    if (V.MOTION_DEFS[i].id === def.id){
      V.MOTION_DEFS[i] = def;
      return;
    }
  }
  V.MOTION_DEFS.push(def);
};

V.registerMotions = function(groupDef, list){
  if (groupDef) V.registerGroup(groupDef);
  for (var i = 0; i < list.length; i++){
    var m = list[i];
    if (!m.group && groupDef) m.group = groupDef.id;
    V.registerMotion(m);
  }
};

})(window.VRMViewer = window.VRMViewer || {});