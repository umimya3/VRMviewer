(function(V){
"use strict";

V.registerMotions({ id:'basic', label:'基本モーション', open:true }, [
  {
    id:'walk', label:'歩く', loop:true, duration:1.15,
    fn:function(el, w, c){
      var b = c.blend, hips = c.bones.hips;
      var ph = el * (Math.PI * 2 / 1.15);
      var s = Math.sin(ph), cs = Math.cos(ph);
      var legL = -26 * s, legR = 26 * s;
      var kneeL = 4 + 32 * Math.pow(Math.max(0, cs), 1.5);
      var kneeR = 4 + 32 * Math.pow(Math.max(0, -cs), 1.5);
      b('leftUpperLeg', legL, 0, 0, w);
      b('rightUpperLeg', legR, 0, 0, w);
      b('leftLowerLeg', kneeL, 0, 0, w);
      b('rightLowerLeg', kneeR, 0, 0, w);
      b('leftFoot', -legL * 0.45 + 12 * Math.max(0, -s) - 4 * Math.max(0, cs), 0, 0, w);
      b('rightFoot', -legR * 0.45 + 12 * Math.max(0, s) - 4 * Math.max(0, -cs), 0, 0, w);
      b('leftUpperArm', -68, 0, 13 * s, w);
      b('rightUpperArm', -68, 0, 13 * s, w);
      b('leftLowerArm', 0, 0, -(13 + 5 * s), w);
      b('rightLowerArm', 0, 0, 13 - 5 * s, w);
      b('spine', 4.5, 0, 0, w);
      b('chest', 3, 0, 0, w);
      b('neck', -3, 2 * s, 0, w);
      b('head', -4, 2.5 * s, 0, w);
      b('hips', 0, 3.5 * s, 2 * s, w);
      if (hips) hips.obj.position.y += (-0.014 + 0.011 * Math.cos(2 * ph)) * w;
    }
  },
  {
    id:'run', label:'走る', loop:true, duration:0.40,
    fn:function(el, w, c){
      var b = c.blend, hips = c.bones.hips;
      var rp = el * (Math.PI * 2 / 0.4);
      var rs = Math.sin(rp), rc = Math.cos(rp);
      var rLegL = -38 * rs, rLegR = 38 * rs;
      var rKneeL = 6 + 58 * Math.pow(Math.max(0, rc), 1.4);
      var rKneeR = 6 + 58 * Math.pow(Math.max(0, -rc), 1.4);
      b('leftUpperLeg', rLegL, 0, 0, w);
      b('rightUpperLeg', rLegR, 0, 0, w);
      b('leftLowerLeg', rKneeL, 0, 0, w);
      b('rightLowerLeg', rKneeR, 0, 0, w);
      b('leftFoot', -rLegL * 0.4 + 16 * Math.max(0, -rs) - 6 * Math.max(0, rc), 0, 0, w);
      b('rightFoot', -rLegR * 0.4 + 16 * Math.max(0, rs) - 6 * Math.max(0, -rc), 0, 0, w);
      b('leftUpperArm', -66 + 6 * rc, 0, 30 * rs, w);
      b('leftLowerArm', 0, 0, -(52 + 12 * rs), w);
      b('rightUpperArm', -58 + 3 * rc, 0, -20 - 7 * rs, w);
      b('rightLowerArm', 0, 0, 34 - 5 * rs, w);
      b('rightHand', -6, 0, 0, w);
      b('spine', 10, 0, 0, w);
      b('chest', 6, 2.5 * rs, 0, w);
      b('neck', -4, 0, 0, w);
      b('head', -6, 0, 0, w);
      b('hips', 0, 3 * rs, 2.5 * rs, w);
      if (hips) hips.obj.position.y += (-0.012 + 0.026 * Math.abs(Math.sin(rp))) * w;
    }
  },
  {
    id:'jump', label:'ジャンプ', loop:false, duration:0.90,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var airT = Math.min(1, Math.max(0, (el - 0.30) / 0.38));
      var airY = (el > 0.30 && el < 0.68) ? 0.30 * 4 * airT * (1 - airT) : 0;
      var tuck = (el > 0.30 && el < 0.68) ? Math.sin(airT * Math.PI) : 0;
      var jKnee = tv(el, [[0,2],[0.16,55],[0.3,6],[0.5,10],[0.68,14],[0.78,48],[0.9,2]]);
      b('rightUpperLeg', tv(el, [[0,0],[0.16,-30],[0.3,-3],[0.68,-8],[0.78,-26],[0.9,0]]) - 42 * tuck, 0, 0, w);
      b('leftUpperLeg', tv(el, [[0,0],[0.16,-30],[0.3,-3],[0.68,-8],[0.78,-26],[0.9,0]]) + 20 * tuck, 0, 0, w);
      b('rightLowerLeg', jKnee + 55 * tuck, 0, 0, w);
      b('leftLowerLeg', jKnee + 18 * tuck, 0, 0, w);
      b('rightFoot', tv(el, [[0,0],[0.16,-24],[0.3,4],[0.68,8],[0.78,-20],[0.9,0]]) + 10 * tuck, 0, 0, w);
      b('leftFoot', tv(el, [[0,0],[0.16,-24],[0.3,4],[0.68,8],[0.78,-20],[0.9,0]]) + 22 * tuck, 0, 0, w);
      var jArmX = tv(el, [[0,-70],[0.16,-84],[0.3,22],[0.5,16],[0.68,-6],[0.78,-38],[0.9,-70]]);
      b('leftUpperArm', jArmX + 14 * tuck, 0, tv(el, [[0,0],[0.16,10],[0.3,-6],[0.78,4],[0.9,0]]), w);
      b('rightUpperArm', jArmX - 26 * tuck, 0, tv(el, [[0,5],[0.16,-10],[0.3,6],[0.78,-4],[0.9,5]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-10],[0.3,-16],[0.78,-12],[0.9,-10]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,10],[0.3,20],[0.78,14],[0.9,10]]), w);
      b('spine', tv(el, [[0,0],[0.16,10],[0.3,-2],[0.5,0],[0.68,4],[0.78,12],[0.9,0]]), 0, 0, w);
      b('chest', tv(el, [[0,0],[0.16,5],[0.3,-1],[0.78,6],[0.9,0]]), 0, 0, w);
      b('neck', tv(el, [[0,0],[0.16,-4],[0.3,2],[0.78,-5],[0.9,0]]), 0, 0, w);
      b('head', tv(el, [[0,0],[0.16,-6],[0.3,3],[0.5,2],[0.78,-7],[0.9,0]]), 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips) hips.obj.position.y += (airY + tv(el, [[0,0],[0.16,-0.075],[0.3,0],[0.68,0],[0.78,-0.06],[0.9,0]])) * w;
    }
  },
  {
    // 肩を外側に捻って手のひらを正面へ向け、頭の横で自然に振る
    id:'wave', label:'手を振る', loop:false, duration:3.20,
    fn:function(el, w, c){
      var b = c.blend, s01 = c.smooth01;
      var e = s01(el / 0.45) * (1 - s01((el - 2.6) / 0.6));
      var wob = Math.sin((el - 0.45) * Math.PI * 2 * 2.1);

      if (c.isBuriRig){
        b('rightUpperArm', -70 + (158 + 5 * wob) * e, 0, 12 * e, w);
        b('rightLowerArm', 0, 0, 15 + (24 + 20 * wob) * e, w);
        b('rightHand', 0, 0, (12 * wob) * e, w);
      } else {
        // 汎用VRM：肩を -78° 外捻りして手のひらを正面へ、前腕を垂直に立て、手首を左右へワイパー振り
        b('rightUpperArm', -70 + (102 + 4 * wob) * e, -78 * e, 16 * e, w);
        b('rightLowerArm', 0, 0, 10 + (68 + 6 * wob) * e, w);
        c.blendRaw('rightHand', 0, (24 * wob) * e, -8 * e, w);
      }

      b('leftUpperArm', -70, 0, -6, w);
      b('leftLowerArm', 0, 0, -10, w);
      b('head', 0, -5 * e, (6 + 2.5 * wob) * e, w);
      b('neck', 0, -2 * e, 2 * e, w);
      b('spine', 0, 0, 2 * e, w);
      b('chest', 0, 0, 0, w);
      b('leftUpperLeg', 0, 0, 0, w);
      b('rightUpperLeg', 0, 0, 0, w);
      b('leftLowerLeg', 2, 0, 0, w);
      b('rightLowerLeg', 2, 0, 0, w);
      b('hips', 0, 0, 0, w);
    }
  },
  {
    id:'idle', label:'待機', loop:true, duration:4.18,
    fn:function(el, w, c){
      var b = c.blend, hips = c.bones.hips;
      var br = Math.sin(el * 1.5), sw = Math.sin(el * 0.55);
      b('chest', 1.8 * br, 0, 0, w);
      b('spine', 0.9 * br, 0, 0.6 * sw, w);
      b('neck', 0.8 * br, 1.5 * sw, 0, w);
      b('head', 1.2 * br, 3 * sw, 1.3 * Math.sin(el * 0.8), w);
      b('leftUpperArm', -70, 0, 1.6 * Math.sin(el * 0.9), w);
      b('rightUpperArm', -70, 0, 1.6 * Math.sin(el * 0.9 + 1.2), w);
      b('leftLowerArm', 0, 0, -10, w);
      b('rightLowerArm', 0, 0, 10, w);
      b('leftUpperLeg', 0, 0, 0, w);
      b('rightUpperLeg', 0, 0, 0, w);
      b('leftLowerLeg', 2, 0, 0, w);
      b('rightLowerLeg', 2, 0, 0, w);
      b('leftFoot', 0, 0, 0, w);
      b('rightFoot', 0, 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips) hips.obj.position.y += 0.004 * br * w;
    }
  }
]);

})(window.VRMViewer);