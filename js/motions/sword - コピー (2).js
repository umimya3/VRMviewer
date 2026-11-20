(function(V){
"use strict";

var BURST_SHOTS = [0.55, 0.66, 0.77];
var BURST_AMPS  = [0.7, 0.7, 1.0];

V.registerMotions({ id:'sword', label:'鰤ソード', open:true }, [
  {
    id:'chop', label:'必殺・真っ向唐竹割り', loop:false, duration:2.60,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips, rh = c.bones.rightHand;
      var twirlDeg = 0, twirling = false;
      if (el > 0.35 && el <= 0.95){ twirlDeg = 360 * c.easeInOut((el - 0.35) / 0.6); twirling = true; }
      else if (el > 0.95 && el < 1.05){ twirlDeg = 360; twirling = true; }
      b('rightUpperArm',
        tv(el, [[0,-70],[0.35,55],[0.95,62],[1.15,78],[1.45,78],[1.62,70],[1.82,-64],[2.0,-64],[2.25,-58],[2.42,32],[2.6,-70]]), 0,
        tv(el, [[0,5],[0.35,-18],[0.95,-20],[1.15,-24],[1.45,-24],[1.62,-16],[1.82,10],[2.0,10],[2.25,6],[2.42,-26],[2.6,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.35,20],[0.95,10],[1.15,8],[1.45,8],[1.82,12],[2.0,12],[2.6,15]]), w);
      b('rightHand',
        tv(el, [[0,0],[0.35,0],[1.15,7],[1.45,7],[1.82,0],[2.6,0]]), 0,
        tv(el, [[0,0],[1.15,-7],[1.45,-7],[1.82,0],[2.6,0]]), w);
      if (twirling && rh){
        c.tmpE.set(twirlDeg * c.D2R, 0, tv(el, [[0,0],[0.35,-14],[1.05,-7]]) * c.D2R);
        c.tmpQ.setFromEuler(c.tmpE);
        c.tmpQ2.copy(rh.rest).multiply(c.tmpQ);
        rh.obj.quaternion.slerp(c.tmpQ2, Math.max(w, 0.85));
      }
      b('leftUpperArm',
        tv(el, [[0,-72],[0.35,-30],[0.65,-38],[0.95,40],[1.15,62],[1.45,62],[1.62,52],[1.82,-46],[2.0,-46],[2.25,-40],[2.42,-8],[2.6,-72]]), 0,
        tv(el, [[0,-6],[0.35,-38],[0.65,-42],[0.95,-20],[1.45,-22],[1.82,10],[2.0,10],[2.42,-16],[2.6,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-14],[0.35,-24],[0.95,-28],[1.45,-30],[1.82,-12],[2.0,-12],[2.42,-20],[2.6,-14]]), w);
      var nSpn = tv(el, [[0,0],[0.35,-4],[0.95,-10],[1.15,-16],[1.45,-16],[1.62,-8],[1.82,22],[1.88,27],[2.0,22],[2.25,18],[2.42,2],[2.6,0]]);
      b('spine', nSpn, 0, 0, w);
      b('chest', nSpn * 0.6, 0, 0, w);
      b('neck', tv(el, [[0,0],[0.95,3],[1.45,5],[1.82,-2],[2.25,-4],[2.6,0]]), 0, 0, w);
      b('head', tv(el, [[0,0],[0.95,-6],[1.15,-10],[1.45,-10],[1.62,-4],[1.82,8],[1.88,11],[2.0,8],[2.25,-8],[2.42,-4],[2.6,0]]), 0, 0, w);
      var nKneeR = tv(el, [[0,0],[0.95,10],[1.45,12],[1.62,34],[1.82,38],[2.0,38],[2.25,34],[2.42,14],[2.6,0]]);
      var nKneeL = tv(el, [[0,0],[0.95,10],[1.45,12],[1.62,16],[1.82,19],[2.0,19],[2.25,16],[2.6,0]]);
      b('rightUpperLeg', tv(el, [[0,0],[1.45,0],[1.62,-26],[1.82,-30],[2.0,-30],[2.25,-26],[2.6,0]]), 0, 0, w);
      b('leftUpperLeg', tv(el, [[0,0],[1.45,0],[1.62,13],[1.82,15],[2.0,15],[2.25,13],[2.6,0]]), 0, 0, w);
      b('rightLowerLeg', nKneeR, 0, 0, w);
      b('leftLowerLeg', nKneeL, 0, 0, w);
      b('rightFoot', -0.45 * nKneeR, 0, 0, w);
      b('leftFoot', tv(el, [[0,0],[1.62,15],[1.82,17],[2.0,17],[2.6,0]]), 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips){
        var shake = (el > 1.82 && el < 2.0) ? 0.004 * Math.sin((el - 1.82) * 90) * (1 - (el - 1.82) / 0.18) : 0;
        hips.obj.position.y += (tv(el, [[0,0],[0.95,-0.02],[1.45,-0.03],[1.62,-0.07],[1.82,-0.075],[2.0,-0.07],[2.25,-0.06],[2.6,0]]) + shake) * w;
        hips.obj.position.z += tv(el, [[0,0],[1.45,0],[1.62,0.35],[1.82,0.35],[2.25,0.35],[2.6,0]]) * w;
      }
    }
  },
  {
    id:'shot1', label:'鰤ライフル単発', loop:false, duration:0.75,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var s1Kick = el > 0.30 ? Math.exp(-(el - 0.30) / 0.05) : 0;
      var s1Aim = tv(el, [[0,0],[0.14,1],[0.48,1],[0.75,0]]);
      function s1Val(stand, aim){ return stand + (aim - stand) * s1Aim; }
      b('hips', 0, s1Val(0, -14), 0, w);
      b('spine', -2.5 * s1Kick, s1Val(0, -5), 0, w);
      b('chest', -1.5 * s1Kick, s1Val(0, -9), 0, w);
      b('neck', s1Val(0, 1), s1Val(0, 6), 0, w);
      b('head', s1Val(0, 3), s1Val(0, 13), s1Val(0, 5), w);
      b('rightUpperArm', s1Val(-70, -57), 0, s1Val(5, 71), w);
      b('rightLowerArm', 0, 0, s1Val(15, 85), w);
      b('rightHand', s1Val(0, -35) + 10 * s1Kick, 0, s1Val(0, -57), w);
      b('leftUpperArm', s1Val(-72, 9), 0, s1Val(-6, -95), w);
      b('leftLowerArm', 0, 0, s1Val(-14, -5), w);
      b('leftUpperLeg', s1Val(0, -4), 0, 0, w);
      b('rightUpperLeg', s1Val(0, 3), 0, 0, w);
      b('leftLowerLeg', s1Val(2, 6), 0, 0, w);
      b('rightLowerLeg', s1Val(2, 5), 0, 0, w);
      b('leftFoot', s1Val(0, -3), 0, 0, w);
      b('rightFoot', s1Val(0, -2), 0, 0, w);
      if (hips) hips.obj.position.z += -0.015 * s1Kick * w;
    }
  },
  {
    id:'burst', label:'鰤ライフル 3点バースト', loop:false, duration:1.80,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var kick = 0;
      for (var bi = 0; bi < BURST_SHOTS.length; bi++){
        var bd = el - BURST_SHOTS[bi];
        if (bd >= 0) kick += BURST_AMPS[bi] * Math.exp(-bd / 0.05);
      }
      var aimK = tv(el, [[0,0],[0.35,1],[1.15,1],[1.55,0],[1.8,0]]);
      function aimVal(stand, aim){ return stand + (aim - stand) * aimK; }
      b('hips', 0, aimVal(0, -16), 0, w);
      b('spine', -1.5 * kick, aimVal(0, -6), 0, w);
      b('chest', -1 * kick, aimVal(0, -10), 0, w);
      b('neck', aimVal(0, 1), aimVal(0, 7), aimVal(0, 3), w);
      b('head', aimVal(0, 3), aimVal(0, 14), aimVal(0, 6), w);
      b('rightUpperArm', aimVal(-70, -58), 0, aimVal(5, 72), w);
      b('rightLowerArm', 0, 0, aimVal(15, 85), w);
      b('rightHand', aimVal(0, -35) + 9 * kick, 0, aimVal(0, -57), w);
      b('leftUpperArm', aimVal(-72, 9), 0, aimVal(-6, -95), w);
      b('leftLowerArm', 0, 0, aimVal(-14, -5), w);
      b('leftUpperLeg', aimVal(0, -4), 0, 0, w);
      b('rightUpperLeg', aimVal(0, 3), 0, 0, w);
      b('leftLowerLeg', aimVal(2, 6), 0, 0, w);
      b('rightLowerLeg', aimVal(2, 5), 0, 0, w);
      b('leftFoot', aimVal(0, -3), 0, 0, w);
      b('rightFoot', aimVal(0, -2), 0, 0, w);
      if (hips){
        hips.obj.position.z += -0.02 * kick * w;
        hips.obj.position.y += -0.004 * kick * w;
      }
    }
  },
  {
    id:'spin', label:'回転斬り', loop:false, duration:1.30,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var sp = Math.min(1, Math.max(0, (el - 0.25) / 0.8));
      var spinDeg = 360 * c.easeInOut(sp);
      if (el > 1.05) spinDeg += 5 * Math.sin((el - 1.05) * 18) * Math.exp(-(el - 1.05) * 6);
      var spKnee = tv(el, [[0,0],[0.2,12],[0.5,5],[1.0,6],[1.18,14],[1.3,0]]);
      b('rightUpperArm', -50, 0, tv(el, [[0,30],[0.6,50],[1.3,30]]), w);
      b('rightLowerArm', 0, 0, 6, w);
      b('rightHand', -12, 0, 0, w);
      b('leftUpperArm', -52, 0, -30, w);
      b('leftLowerArm', 0, 0, -22, w);
      b('spine', 3, 0, 0, w);
      b('chest', 2, 0, 0, w);
      b('neck', 0, 0, 0, w);
      b('head', -2, 0, 0, w);
      b('leftUpperLeg', -0.55 * spKnee, 0, 0, w);
      b('rightUpperLeg', -0.55 * spKnee, 0, 0, w);
      b('leftLowerLeg', spKnee, 0, 0, w);
      b('rightLowerLeg', spKnee, 0, 0, w);
      b('leftFoot', -0.45 * spKnee, 0, 0, w);
      b('rightFoot', -0.45 * spKnee, 0, 0, w);
      if (hips){
        c.blendRaw('hips', 0, c.poseExtraCur.hipsY + spinDeg, 0, w);
        hips.obj.position.y += -0.018 * Math.sin(Math.PI * Math.min(1, el / 1.3)) * w;
      }
    }
  },
  {
    id:'thrust', label:'フェンシング突き', loop:false, duration:1.30,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var tHipY = tv(el, [[0,0],[0.35,16],[0.55,18],[0.9,18],[1.12,10],[1.3,0]]);
      b('hips', 0, tHipY, 0, w);
      b('chest', tv(el, [[0,0],[0.35,3],[0.55,6],[0.9,6],[1.3,0]]), tHipY * 0.6, 0, w);
      b('spine', tv(el, [[0,0],[0.35,4],[0.55,9],[0.62,11],[0.9,9],[1.12,6],[1.3,0]]), tHipY * 0.25, 0, w);
      b('neck', 0, tv(el, [[0,0],[0.35,-9],[0.55,-10],[0.85,-10],[1.3,0]]), 0, w);
      b('head', -2, tv(el, [[0,0],[0.35,-13],[0.55,-14],[0.85,-14],[1.3,0]]), 0, w);
      b('rightUpperArm',
        tv(el, [[0,-70],[0.35,-16],[0.55,-10],[0.62,-9],[0.9,-10],[1.12,-13],[1.3,-70]]), 0,
        tv(el, [[0,5],[0.35,52],[0.55,58],[0.9,58],[1.12,54],[1.3,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.35,18],[0.55,3],[0.9,3],[1.3,15]]), w);
      b('rightHand', 0, 0, tv(el, [[0,0],[0.35,-24],[0.55,-14],[0.9,-14],[1.12,-18],[1.3,0]]), w);
      b('leftUpperArm',
        tv(el, [[0,-72],[0.35,-64],[0.55,-66],[0.85,-66],[1.3,-72]]), 0,
        tv(el, [[0,-6],[0.35,20],[0.55,26],[0.85,26],[1.3,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-14],[0.35,-8],[0.85,-8],[1.3,-14]]), w);
      b('leftUpperLeg', tv(el, [[0,0],[0.35,-24],[0.55,-44],[0.85,-44],[1.3,0]]), 0, 0, w);
      b('leftLowerLeg', tv(el, [[0,0],[0.35,26],[0.55,58],[0.85,58],[1.3,0]]), 0, 0, w);
      b('leftFoot', tv(el, [[0,0],[0.35,-8],[0.55,-15],[0.85,-15],[1.3,0]]), 0, 0, w);
      b('rightUpperLeg', tv(el, [[0,0],[0.35,16],[0.55,30],[0.85,30],[1.3,0]]), 0, 0, w);
      b('rightLowerLeg', tv(el, [[0,0],[0.35,10],[0.55,3],[0.85,3],[1.3,0]]), 0, 0, w);
      b('rightFoot', tv(el, [[0,0],[0.35,6],[0.55,28],[0.85,28],[1.3,0]]), 0, 0, w);
      if (hips){
        hips.obj.position.y += tv(el, [[0,0],[0.35,-0.04],[0.55,-0.10],[0.62,-0.108],[0.9,-0.10],[1.12,-0.06],[1.3,0]]) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.35,0.02],[0.55,0.40],[0.62,0.43],[0.9,0.40],[1.12,0.24],[1.3,0]]) * w;
      }
    }
  },
  {
    id:'bat', label:'バットフルスイング', loop:false, duration:1.30,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var bHipY = tv(el, [[0,0],[0.4,-48],[0.65,55],[0.95,68],[1.05,75],[1.18,42],[1.3,0]]);
      b('hips', 0, bHipY, 0, w);
      b('chest', tv(el, [[0,0],[0.4,-3],[0.65,5],[0.95,3],[1.3,0]]),
        tv(el, [[0,0],[0.4,-54],[0.65,48],[0.95,58],[1.05,64],[1.18,38],[1.3,0]]), 0, w);
      b('spine', tv(el, [[0,0],[0.4,-3],[0.65,5],[0.95,3],[1.3,0]]), bHipY * 0.2, 0, w);
      b('neck', 0, tv(el, [[0,0],[0.4,16],[0.65,-2],[0.95,-4],[1.3,0]]), 0, w);
      b('head', -2, tv(el, [[0,0],[0.4,38],[0.65,-6],[0.95,-12],[1.3,0]]), 0, w);
      b('rightUpperArm',
        tv(el, [[0,-70],[0.4,30],[0.65,-20],[0.95,-28],[1.3,-70]]), 0,
        tv(el, [[0,5],[0.4,-25],[0.65,80],[0.95,95],[1.05,103],[1.18,58],[1.3,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.4,95],[0.65,10],[0.95,35],[1.05,42],[1.3,15]]), w);
      b('rightHand', tv(el, [[0,0],[0.4,-10],[0.65,-12],[0.95,0],[1.3,0]]), 0, 0, w);
      b('leftUpperArm',
        tv(el, [[0,-72],[0.4,10],[0.65,-15],[0.95,-22],[1.3,-72]]), 0,
        tv(el, [[0,-6],[0.4,-35],[0.65,30],[0.95,42],[1.3,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-14],[0.4,-70],[0.65,-25],[0.95,-40],[1.3,-14]]), w);
      var bKnee = tv(el, [[0,0],[0.4,12],[0.65,8],[0.95,8],[1.3,0]]);
      b('leftUpperLeg', -0.55 * bKnee, 0, 0, w);
      b('rightUpperLeg', -0.55 * bKnee, 0, 0, w);
      b('leftLowerLeg', bKnee, 0, 0, w);
      b('rightLowerLeg', bKnee, 0, 0, w);
      b('leftFoot', -0.45 * bKnee, 0, 0, w);
      b('rightFoot', -0.45 * bKnee, 0, 0, w);
      if (hips){
        hips.obj.position.y += tv(el, [[0,0],[0.4,-0.02],[0.65,-0.04],[0.95,-0.025],[1.3,0]]) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.4,-0.03],[0.65,0.2],[0.95,0.2],[1.3,0]]) * w;
      }
    }
  },
  {
    id:'roll', label:'前方ローリング', loop:false, duration:1.25,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var rProg = Math.min(1, el / 0.95);
      var rEase = rProg * rProg * rProg * (rProg * (rProg * 6 - 15) + 10);
      var rollDeg = 360 * rEase;
      var rTuck = Math.sin(Math.PI * Math.min(1, el / 0.95));
      b('rightUpperArm', tv(el, [[0,-70],[0.15,-38],[0.5,-22],[0.85,-30],[1.05,-52],[1.25,-70]]), 0,
        tv(el, [[0,5],[0.15,20],[0.5,34],[0.85,26],[1.25,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.15,60],[0.5,95],[0.85,70],[1.05,30],[1.25,15]]), w);
      b('rightHand', tv(el, [[0,0],[0.2,-14],[0.6,-18],[1.0,0],[1.25,0]]), 0, 0, w);
      b('leftUpperArm', tv(el, [[0,-72],[0.15,-48],[0.5,-30],[0.85,-38],[1.05,-55],[1.25,-72]]), 0,
        tv(el, [[0,-6],[0.15,-16],[0.5,-28],[0.85,-20],[1.25,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-14],[0.15,-30],[0.5,-78],[0.85,-55],[1.05,-24],[1.25,-14]]), w);
      b('spine', 14 * rTuck, 0, 0, w);
      b('chest', 10 * rTuck, 0, 0, w);
      b('neck', 12 * rTuck, 0, 0, w);
      b('head', 20 * rTuck, 0, 0, w);
      var rKnee = tv(el, [[0,2],[0.15,42],[0.4,105],[0.65,110],[0.85,55],[1.0,26],[1.12,10],[1.25,2]]);
      b('leftUpperLeg', -0.62 * rKnee, 0, 0, w);
      b('rightUpperLeg', -0.62 * rKnee, 0, 0, w);
      b('leftLowerLeg', rKnee, 0, 0, w);
      b('rightLowerLeg', rKnee, 0, 0, w);
      b('leftFoot', -0.4 * rKnee + 14 * rTuck, 0, 0, w);
      b('rightFoot', -0.4 * rKnee + 14 * rTuck, 0, 0, w);
      if (hips){
        c.blendRaw('hips', rollDeg, c.poseExtraCur.hipsY, 0, w);
        hips.obj.position.y += tv(el, [[0,0],[0.15,-0.12],[0.35,-0.42],[0.5,-0.47],[0.65,-0.40],[0.82,-0.14],[0.95,-0.06],[1.1,-0.02],[1.25,0]]) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.2,0.12],[0.75,1.05],[0.95,1.05],[1.25,0]]) * w;
      }
    }
  },
  {
    id:'guard', label:'鰤ガード', loop:false, duration:1.40,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var gHit = c.gauss(el, 0.62, 0.055);
      var gK = tv(el, [[0,0],[0.15,1],[1.05,1],[1.3,0],[1.4,0]]);
      function gVal(stand, guard){ return stand + (guard - stand) * gK; }
      b('rightUpperArm', gVal(-70, -80), 0, gVal(5, 23), w);
      b('rightLowerArm', 0, 0, gVal(15, 86), w);
      b('rightHand', gVal(0, -5) - 8 * gHit, 0, gVal(0, 60), w);
      b('leftUpperArm', gVal(-72, -40), 0, gVal(-6, -80), w);
      b('leftLowerArm', 0, 0, gVal(-14, -82), w);
      b('spine', gVal(0, 3) - 3.5 * gHit, 0, 0, w);
      b('chest', gVal(0, 2) - 2 * gHit, 0, 0, w);
      b('neck', gVal(0, -2) + 2 * gHit, 0, 0, w);
      b('head', gVal(0, -3) + 3 * gHit, 0, 0, w);
      b('leftUpperLeg', gVal(0, -7), 0, 0, w);
      b('rightUpperLeg', gVal(0, -7), 0, 0, w);
      b('leftLowerLeg', gVal(2, 13), 0, 0, w);
      b('rightLowerLeg', gVal(2, 13), 0, 0, w);
      b('leftFoot', gVal(0, -6), 0, 0, w);
      b('rightFoot', gVal(0, -6), 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips){
        hips.obj.position.y += (gVal(0, -0.022) - 0.008 * gHit) * w;
        hips.obj.position.z += -0.038 * gHit * w;
      }
    }
  }
]);

})(window.VRMViewer);