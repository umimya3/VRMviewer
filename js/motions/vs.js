(function(V){
"use strict";

V.registerMotions({ id:'vs1', label:'VSアクション（第1弾）', open:false }, [
  {
    id:'hit', label:'被弾・のけぞり', loop:false, duration:0.70,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var hSnap = c.gauss(el, 0.14, 0.09);
      var hRec = tv(el, [[0,0],[0.14,1],[0.4,0.55],[0.7,0]]);
      function hVal(base, hit){ return base + hit * Math.max(hSnap, hRec * 0.6); }
      b('head', hVal(0, -16), 0, hVal(0, 4), w);
      b('neck', hVal(0, -9), 0, 0, w);
      b('chest', hVal(0, -11), 0, 0, w);
      b('spine', hVal(0, -7), 0, 0, w);
      b('rightUpperArm', hVal(-70, 26), 0, hVal(5, 26), w);
      b('rightLowerArm', 0, 0, hVal(15, 22), w);
      b('leftUpperArm', hVal(-72, 22), 0, hVal(-6, -26), w);
      b('leftLowerArm', 0, 0, hVal(-14, -20), w);
      b('leftUpperLeg', hVal(0, -10), 0, 0, w);
      b('rightUpperLeg', hVal(0, 12), 0, 0, w);
      b('leftLowerLeg', hVal(2, 16), 0, 0, w);
      b('rightLowerLeg', hVal(2, 6), 0, 0, w);
      b('leftFoot', hVal(0, -8), 0, 0, w);
      b('rightFoot', hVal(0, 10), 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips){
        hips.obj.position.y += -0.012 * Math.max(hSnap, hRec * 0.5) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.16,-0.12],[0.42,-0.12],[0.7,0]]) * w;
      }
    }
  },
  {
    id:'down', label:'ダウン→起き上がり', loop:false, duration:2.30,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var dFall = tv(el, [[0,0],[0.34,1],[1.15,1],[1.5,0.25],[1.78,0],[2.3,0]]);
      var dPitch = -88 * dFall;
      b('spine', 6 * dFall, 0, 0, w);
      b('chest', 4 * dFall, 0, 0, w);
      b('neck', -14 * dFall, 0, 0, w);
      b('head', -20 * dFall + tv(el, [[0,0],[1.5,0],[1.78,6],[2.0,0],[2.3,0]]), 0, 0, w);
      b('rightUpperArm', tv(el, [[0,-70],[0.34,-20],[1.15,-24],[1.5,-48],[1.78,-62],[2.3,-70]]), 0,
        tv(el, [[0,5],[0.34,38],[1.15,42],[1.5,20],[1.78,8],[2.3,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.34,30],[1.15,34],[1.5,18],[2.3,15]]), w);
      b('leftUpperArm', tv(el, [[0,-72],[0.34,-26],[1.15,-30],[1.5,-52],[1.78,-64],[2.3,-72]]), 0,
        tv(el, [[0,-6],[0.34,-38],[1.15,-42],[1.5,-20],[1.78,-8],[2.3,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-14],[0.34,-28],[1.15,-30],[1.5,-16],[2.3,-14]]), w);
      var dKnee = tv(el, [[0,2],[0.34,34],[0.6,48],[1.15,44],[1.5,58],[1.78,10],[1.95,16],[2.3,2]]);
      b('leftUpperLeg', -0.55 * dKnee, 0, 0, w);
      b('rightUpperLeg', -0.55 * dKnee, 0, 0, w);
      b('leftLowerLeg', dKnee, 0, 0, w);
      b('rightLowerLeg', dKnee, 0, 0, w);
      b('leftFoot', -0.3 * dKnee, 0, 0, w);
      b('rightFoot', -0.3 * dKnee, 0, 0, w);
      if (hips){
        c.blendRaw('hips', dPitch, c.poseExtraCur.hipsY, 0, w);
        hips.obj.position.y += tv(el, [[0,0],[0.34,-0.52],[0.42,-0.55],[1.15,-0.55],[1.5,-0.38],[1.78,-0.01],[1.92,0.012],[2.05,-0.004],[2.3,0]]) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.34,-0.30],[1.15,-0.30],[1.5,-0.18],[1.78,0],[2.3,0]]) * w;
      }
    }
  },
  {
    id:'step', label:'ステップ（前）', loop:false, duration:0.50,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var sLean = tv(el, [[0,0],[0.08,0.4],[0.18,1],[0.34,0.75],[0.5,0]]);
      b('spine', 13 * sLean, 0, 0, w);
      b('chest', 8 * sLean, 0, 0, w);
      b('neck', -6 * sLean, 0, 0, w);
      b('head', -8 * sLean, 0, 0, w);
      b('leftUpperArm', -70 - 6 * sLean, 0, 24 * sLean, w);
      b('leftLowerArm', 0, 0, -(10 + 26 * sLean), w);
      b('rightUpperArm', -70 + 4 * sLean, 0, 5 - 22 * sLean, w);
      b('rightLowerArm', 0, 0, 15 + 18 * sLean, w);
      b('rightHand', -8 * sLean, 0, 0, w);
      b('leftUpperLeg', tv(el, [[0,0],[0.08,-8],[0.18,-34],[0.34,-12],[0.5,0]]), 0, 0, w);
      b('rightUpperLeg', tv(el, [[0,0],[0.08,6],[0.18,26],[0.34,8],[0.5,0]]), 0, 0, w);
      b('leftLowerLeg', tv(el, [[0,2],[0.18,20],[0.34,10],[0.5,2]]), 0, 0, w);
      b('rightLowerLeg', tv(el, [[0,2],[0.18,12],[0.34,22],[0.5,2]]), 0, 0, w);
      b('leftFoot', tv(el, [[0,0],[0.18,-10],[0.34,-4],[0.5,0]]), 0, 0, w);
      b('rightFoot', tv(el, [[0,0],[0.18,20],[0.34,8],[0.5,0]]), 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips){
        hips.obj.position.y += tv(el, [[0,0],[0.08,-0.03],[0.18,-0.015],[0.34,-0.03],[0.5,0]]) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.08,0.02],[0.18,0.55],[0.36,0.55],[0.5,0]]) * w;
      }
    }
  },
  {
    id:'stepback', label:'ステップ（後）', loop:false, duration:0.55,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var sbLean = tv(el, [[0,0],[0.08,0.4],[0.18,1],[0.36,0.7],[0.55,0]]);
      b('spine', -8 * sbLean, 0, 0, w);
      b('chest', -5 * sbLean, 0, 0, w);
      b('neck', 4 * sbLean, 0, 0, w);
      b('head', 5 * sbLean, 0, 0, w);
      b('leftUpperArm', -70 - 14 * sbLean, 0, -6 - 8 * sbLean, w);
      b('leftLowerArm', 0, 0, -(10 + 8 * sbLean), w);
      b('rightUpperArm', -70 - 18 * sbLean, 0, 5 + 10 * sbLean, w);
      b('rightLowerArm', 0, 0, 15 - 6 * sbLean, w);
      b('rightHand', -4 * sbLean, 0, 0, w);
      b('leftUpperLeg', tv(el, [[0,0],[0.18,18],[0.36,6],[0.55,0]]), 0, 0, w);
      b('rightUpperLeg', tv(el, [[0,0],[0.08,-6],[0.18,-30],[0.36,-10],[0.55,0]]), 0, 0, w);
      b('leftLowerLeg', tv(el, [[0,2],[0.18,10],[0.36,16],[0.55,2]]), 0, 0, w);
      b('rightLowerLeg', tv(el, [[0,2],[0.18,16],[0.36,8],[0.55,2]]), 0, 0, w);
      b('leftFoot', tv(el, [[0,0],[0.18,6],[0.55,0]]), 0, 0, w);
      b('rightFoot', tv(el, [[0,0],[0.18,-12],[0.36,-4],[0.55,0]]), 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips){
        hips.obj.position.y += tv(el, [[0,0],[0.08,-0.03],[0.18,-0.015],[0.36,-0.03],[0.55,0]]) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.08,-0.02],[0.18,-0.52],[0.38,-0.52],[0.55,0]]) * w;
      }
    }
  },
  { id:'stepleft', label:'ステップ（左）', loop:false, duration:0.50, fn:function(el, w, c){ sideStep(el, w, c, 1); } },
  { id:'stepright', label:'ステップ（右）', loop:false, duration:0.50, fn:function(el, w, c){ sideStep(el, w, c, -1); } }
]);

function sideStep(el, w, c, sdir){
  var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
  var slLean = tv(el, [[0,0],[0.07,0.4],[0.16,1],[0.32,0.7],[0.5,0]]);
  b('hips', 0, 0, -7 * sdir * slLean, w);
  b('spine', 2 * slLean, 0, -4 * sdir * slLean, w);
  b('chest', 1 * slLean, 0, -3 * sdir * slLean, w);
  b('neck', -2 * slLean, 0, 3 * sdir * slLean, w);
  b('head', -3 * slLean, 0, 4 * sdir * slLean, w);
  b('leftUpperArm', -70, 0, -6 - 14 * sdir * slLean, w);
  b('leftLowerArm', 0, 0, -(10 + 10 * slLean), w);
  b('rightUpperArm', -70, 0, 5 - 16 * sdir * slLean, w);
  b('rightLowerArm', 0, 0, 15 + 12 * slLean, w);
  b('rightHand', -6 * slLean, 0, 0, w);
  var slKnee = 16 * slLean;
  b('leftUpperLeg', -6 * slLean, 0, (sdir > 0 ? -13 : 7) * slLean, w);
  b('rightUpperLeg', -6 * slLean, 0, (sdir > 0 ? -7 : 13) * slLean, w);
  b('leftLowerLeg', slKnee, 0, 0, w);
  b('rightLowerLeg', slKnee, 0, 0, w);
  b('leftFoot', -0.45 * slKnee, 0, 0, w);
  b('rightFoot', -0.45 * slKnee, 0, 0, w);
  if (hips){
    hips.obj.position.y += tv(el, [[0,0],[0.07,-0.025],[0.16,0.02],[0.32,-0.02],[0.5,0]]) * w;
    hips.obj.position.x += sdir * tv(el, [[0,0],[0.07,0.03],[0.16,0.5],[0.34,0.5],[0.5,0]]) * w;
  }
}

V.registerMotions({ id:'vs2', label:'VSアクション（第2弾）', open:false }, [
  {
    id:'airdash', label:'空中ダッシュ', loop:false, duration:0.95,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var adLean = tv(el, [[0,0],[0.14,0.5],[0.3,1],[0.55,0.9],[0.8,0.3],[0.95,0]]);
      b('spine', 15 * adLean, 0, 0, w);
      b('chest', 9 * adLean, 0, 0, w);
      b('neck', -7 * adLean, 0, 0, w);
      b('head', -9 * adLean, 0, 0, w);
      b('leftUpperArm', -70 + 8 * adLean, 0, 26 * adLean, w);
      b('leftLowerArm', 0, 0, -(10 + 20 * adLean), w);
      b('rightUpperArm', -70 + 10 * adLean, 0, 5 - 26 * adLean, w);
      b('rightLowerArm', 0, 0, 15 + 16 * adLean, w);
      b('rightHand', -10 * adLean, 0, 0, w);
      b('leftUpperLeg', tv(el, [[0,0],[0.14,-30],[0.3,14],[0.55,18],[0.8,-16],[0.95,0]]), 0, 0, w);
      b('rightUpperLeg', tv(el, [[0,0],[0.14,8],[0.3,26],[0.55,30],[0.8,6],[0.95,0]]), 0, 0, w);
      b('leftLowerLeg', tv(el, [[0,2],[0.14,44],[0.3,20],[0.55,16],[0.8,18],[0.95,2]]), 0, 0, w);
      b('rightLowerLeg', tv(el, [[0,2],[0.14,18],[0.3,34],[0.55,30],[0.8,12],[0.95,2]]), 0, 0, w);
      b('leftFoot', tv(el, [[0,0],[0.3,18],[0.8,-6],[0.95,0]]), 0, 0, w);
      b('rightFoot', tv(el, [[0,0],[0.3,22],[0.8,4],[0.95,0]]), 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips){
        hips.obj.position.y += tv(el, [[0,0],[0.14,0.10],[0.3,0.34],[0.55,0.30],[0.8,0.02],[0.88,-0.03],[0.95,0]]) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.14,0.05],[0.5,0.85],[0.8,0.85],[0.95,0]]) * w;
      }
    }
  },
  {
    id:'awaken', label:'覚醒（力溜め）', loop:false, duration:2.30,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var awCharge = tv(el, [[0,0],[0.45,1],[0.98,1],[1.08,0],[2.3,0]]);
      var awBurst = tv(el, [[0,0],[0.98,0],[1.1,1],[1.7,1],[2.05,0.3],[2.3,0]]);
      var awTremble = Math.sin(el * 66) * 1.1 * awCharge;
      b('spine', 13 * awCharge - 9 * awBurst + awTremble * 0.5, 0, 0, w);
      b('chest', 8 * awCharge - 6 * awBurst, 0, 0, w);
      b('neck', 6 * awCharge - 5 * awBurst + awTremble * 0.4, 0, 0, w);
      b('head', 15 * awCharge - 13 * awBurst + awTremble * 0.6, 0, 0, w);
      b('leftUpperArm', -70 - 6 * awCharge - 48 * awBurst, 0, -6 - 4 * awCharge - 26 * awBurst, w);
      b('leftLowerArm', 0, 0, -(10 + 42 * awCharge + 2 * awBurst), w);
      b('rightUpperArm', -70 - 6 * awCharge - 48 * awBurst, 0, 5 + 4 * awCharge + 26 * awBurst, w);
      b('rightLowerArm', 0, 0, 15 + 42 * awCharge - 3 * awBurst, w);
      b('rightHand', -6 * awBurst, 0, 0, w);
      var awKnee = 26 * awCharge + 5 * awBurst;
      b('leftUpperLeg', -0.55 * awKnee, 0, -4 * awCharge, w);
      b('rightUpperLeg', -0.55 * awKnee, 0, 4 * awCharge, w);
      b('leftLowerLeg', awKnee, 0, 0, w);
      b('rightLowerLeg', awKnee, 0, 0, w);
      b('leftFoot', -0.45 * awKnee, 0, 0, w);
      b('rightFoot', -0.45 * awKnee, 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips) hips.obj.position.y += (-0.052 * awCharge + 0.012 * awBurst) * w;
    }
  },
  {
    id:'intro', label:'登場', loop:false, duration:2.40,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var inCrouch = tv(el, [[0,0.25],[0.4,0.5],[0.48,1],[0.95,0.85],[1.5,0.1],[1.7,0],[2.4,0]]);
      var inShow = tv(el, [[0,0],[1.45,0],[1.65,1],[2.1,1],[2.4,0]]);
      b('spine', 10 * inCrouch - 3 * inShow, 0, 0, w);
      b('chest', 6 * inCrouch - 2 * inShow, 0, 0, w);
      b('neck', 5 * inCrouch - 2 * inShow, 0, 0, w);
      b('head', 12 * inCrouch - 5 * inShow, 0, 0, w);
      b('rightUpperArm',
        tv(el, [[0,-100],[0.48,-88],[1.45,-80],[1.65,-12],[2.1,-12],[2.4,-70]]), 0,
        tv(el, [[0,12],[0.48,10],[1.45,6],[1.65,56],[2.1,56],[2.4,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,20],[1.45,14],[1.65,4],[2.1,4],[2.4,15]]), w);
      b('rightHand', 0, 0, tv(el, [[0,0],[1.65,-16],[2.1,-16],[2.4,0]]), w);
      b('leftUpperArm',
        tv(el, [[0,-52],[0.48,-60],[1.45,-70],[1.65,-66],[2.1,-66],[2.4,-72]]), 0,
        tv(el, [[0,-24],[0.48,-18],[1.45,-6],[1.65,24],[2.1,24],[2.4,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-20],[1.45,-12],[1.65,-8],[2.1,-8],[2.4,-14]]), w);
      var inKnee = 54 * inCrouch;
      b('leftUpperLeg', -0.55 * inKnee, 0, 0, w);
      b('rightUpperLeg', -0.55 * inKnee, 0, 0, w);
      b('leftLowerLeg', inKnee, 0, 0, w);
      b('rightLowerLeg', inKnee, 0, 0, w);
      b('leftFoot', -0.45 * inKnee, 0, 0, w);
      b('rightFoot', -0.45 * inKnee, 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips) hips.obj.position.y += tv(el, [[0,0.55],[0.4,0.03],[0.48,-0.085],[0.95,-0.07],[1.5,-0.008],[2.4,0]]) * w;
    }
  }
]);

V.registerMotions({ id:'vs3', label:'VSアクション（第3弾）', open:false }, [
  {
    id:'charge', label:'チャージ溜め', loop:false, duration:2.40,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var chK = tv(el, [[0,0],[0.4,1],[2.05,1],[2.4,0]]);
      var chTremble = Math.sin(el * 52) * (0.5 + 1.4 * chK) * chK;
      function chVal(stand, held){ return stand + (held - stand) * chK; }
      b('rightUpperArm', chVal(-70, -34) + chTremble * 0.4, 0, chVal(5, 44), w);
      b('rightLowerArm', 0, 0, chVal(15, 6), w);
      b('rightHand', chVal(0, -4), 0, chVal(0, -10), w);
      b('leftUpperArm', chVal(-72, -40) + chTremble * 0.4, 0, chVal(-6, -34), w);
      b('leftLowerArm', 0, 0, chVal(-14, -30), w);
      b('spine', chVal(0, 9) + chTremble * 0.3, 0, 0, w);
      b('chest', chVal(0, 5), 0, 0, w);
      b('neck', chVal(0, 4), 0, 0, w);
      b('head', chVal(0, 6), 0, 0, w);
      var chKnee = chVal(2, 17);
      b('leftUpperLeg', chVal(0, -9), 0, -3 * chK, w);
      b('rightUpperLeg', chVal(0, -9), 0, 3 * chK, w);
      b('leftLowerLeg', chKnee, 0, 0, w);
      b('rightLowerLeg', chKnee, 0, 0, w);
      b('leftFoot', -0.45 * chKnee, 0, 0, w);
      b('rightFoot', -0.45 * chKnee, 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips){
        hips.obj.position.y += chVal(0, -0.032) * w;
        hips.obj.position.z += chVal(0, 0.03) * w;
      }
    }
  },
  {
    id:'defeat1', label:'敗北1（膝崩れ）', loop:false, duration:3.60,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var dfStagger = c.gauss(el, 0.25, 0.16);
      var dfDown = tv(el, [[0,0],[0.5,0.12],[1.1,1],[2.9,1],[3.6,0]]);
      var dfSway = Math.sin(el * 9) * 3 * dfStagger;
      b('spine', 26 * dfDown - 6 * dfStagger, 0, dfSway * 0.4, w);
      b('chest', 16 * dfDown - 4 * dfStagger, 0, 0, w);
      b('neck', 14 * dfDown, 0, dfSway * 0.3, w);
      b('head', 30 * dfDown - 8 * dfStagger, 0, dfSway * 0.3, w);
      b('rightUpperArm', -70 + 26 * dfDown + 10 * dfStagger, 0, 5 + 8 * dfDown, w);
      b('rightLowerArm', 0, 0, 15 - 7 * dfDown, w);
      b('rightHand', 10 * dfDown, 0, 0, w);
      b('leftUpperArm', -72 + 34 * dfDown, 0, -6 + 6 * dfDown, w);
      b('leftLowerArm', 0, 0, -14 + 8 * dfDown, w);
      b('leftUpperLeg', -18 * dfDown, 0, -3 * dfDown, w);
      b('rightUpperLeg', -14 * dfDown, 0, 3 * dfDown, w);
      b('leftLowerLeg', 74 * dfDown, 0, 0, w);
      b('rightLowerLeg', 74 * dfDown, 0, 0, w);
      b('leftFoot', 30 * dfDown, 0, 0, w);
      b('rightFoot', 30 * dfDown, 0, 0, w);
      if (hips){
        c.blendRaw('hips', 0, 0, dfSway * 0.5, w);
        hips.obj.position.y += (-0.36 * dfDown - 0.01 * dfStagger) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.5,-0.14],[1.1,-0.10],[2.9,-0.10],[3.6,0]]) * w;
      }
    }
  },
  {
    id:'defeat2', label:'敗北2（仰向け大の字）', loop:false, duration:3.60,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var fall = tv(el, [[0,0],[0.4,0.15],[0.85,1],[2.8,1],[3.6,0]]);
      var dPitch = -90 * fall;
      b('spine', 4 * fall, 0, 0, w);
      b('chest', 2 * fall, 0, 0, w);
      b('neck', -6 * fall, 0, 0, w);
      b('head', -8 * fall, 0, 0, w);
      b('rightUpperArm', -70 + (70 - 15) * fall, 0, 5 + 40 * fall, w);
      b('rightLowerArm', 0, 0, 15 - 5 * fall, w);
      b('leftUpperArm', -72 + (72 - 15) * fall, 0, -6 - 40 * fall, w);
      b('leftLowerArm', 0, 0, -14 + 5 * fall, w);
      b('leftUpperLeg', -4 * fall, 0, -8 * fall, w);
      b('rightUpperLeg', -4 * fall, 0, 8 * fall, w);
      b('leftLowerLeg', 4 * fall, 0, 0, w);
      b('rightLowerLeg', 4 * fall, 0, 0, w);
      b('leftFoot', 15 * fall, 0, 0, w);
      b('rightFoot', 15 * fall, 0, 0, w);
      if (hips){
        c.blendRaw('hips', dPitch, c.poseExtraCur.hipsY, 0, w);
        hips.obj.position.y += tv(el, [[0,0],[0.85,-0.52],[2.8,-0.52],[3.6,0]]) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.85,-0.35],[2.8,-0.35],[3.6,0]]) * w;
      }
    }
  },
  {
    id:'defeat3', label:'敗北3（悔しがり）', loop:false, duration:3.40,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var sit = tv(el, [[0,0],[0.4,1],[2.7,1],[3.4,0]]);
      var tantrum = (el > 0.6 && el < 2.5) ? Math.sin((el - 0.6) * 16) : 0;
      b('spine', (18 + 5 * Math.abs(tantrum)) * sit, 0, 0, w);
      b('chest', 10 * sit, 0, 0, w);
      b('neck', -4 * sit, 0, 0, w);
      b('head', (12 + 8 * tantrum) * sit, 0, 0, w);
      b('rightUpperArm', -70 + (45 + 25 * tantrum) * sit, 0, 15 * sit, w);
      b('rightLowerArm', 0, 0, 15 + 60 * sit, w);
      b('leftUpperArm', -72 + (45 - 25 * tantrum) * sit, 0, -15 * sit, w);
      b('leftLowerArm', 0, 0, -14 - 60 * sit, w);
      b('leftUpperLeg', -75 * sit, 0, -12 * sit, w);
      b('rightUpperLeg', -75 * sit, 0, 12 * sit, w);
      b('leftLowerLeg', 15 * sit, 0, 0, w);
      b('rightLowerLeg', 15 * sit, 0, 0, w);
      b('leftFoot', -10 * sit, 0, 0, w);
      b('rightFoot', -10 * sit, 0, 0, w);
      if (hips){
        hips.obj.position.y += -0.42 * sit * w;
        hips.obj.position.z += -0.15 * sit * w;
      }
    }
  }
]);

V.registerMotions({ id:'vs4', label:'VSアクション（第4弾）', open:false }, [
  {
    // 【リメイク】N格闘コンボ（3段）：右→左水平一閃 → 逆袈裟斬り上げ → 両手跳躍叩きつけ
    id:'combo', label:'格闘コンボ（3段・改）', loop:false, duration:2.05,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      b('hips', 0, tv(el, [
        [0,0],[0.16,-32],[0.40,36],[0.54,36],[0.80,-38],[0.96,-38],[1.22,0],[1.48,6],[1.72,6],[2.05,0]
      ]), 0, w);
      b('chest', tv(el, [[0,0],[0.40,10],[0.80,8],[1.22,-10],[1.48,18],[1.72,16],[2.05,0]]),
        tv(el, [[0,0],[0.16,-20],[0.40,24],[0.80,-26],[1.22,0],[2.05,0]]), 0, w);
      b('spine', tv(el, [[0,0],[0.40,10],[0.80,8],[1.22,-12],[1.48,22],[1.72,20],[2.05,0]]), 0, 0, w);
      b('neck', 0, tv(el, [[0,0],[0.40,-14],[0.80,14],[1.22,0]]), 0, w);
      b('head', tv(el, [[0,0],[1.22,-10],[1.48,12],[1.72,10],[2.05,0]]),
        tv(el, [[0,0],[0.40,-24],[0.80,26],[1.22,0]]), 0, w);

      // 右腕：1段水平薙ぎ → 2段逆手斜め上げ → 3段頭上振りかぶり→叩きつけ
      b('rightUpperArm', tv(el, [
        [0,-70],[0.16,2],[0.40,6],[0.54,4],[0.80,28],[0.96,30],[1.22,82],[1.48,-58],[1.72,-56],[2.05,-70]
      ]), 0, tv(el, [
        [0,5],[0.16,-44],[0.40,84],[0.54,82],[0.80,-42],[0.96,-44],[1.22,-18],[1.48,18],[1.72,18],[2.05,5]
      ]), w);
      b('rightLowerArm', 0, 0, tv(el, [
        [0,15],[0.16,32],[0.40,10],[0.80,12],[1.22,12],[1.48,8],[2.05,15]
      ]), w);
      b('rightHand', tv(el, [[0,0],[1.22,12],[1.48,-12],[1.72,-12],[2.05,0]]), 0,
        tv(el, [[0,0],[0.16,20],[0.40,-38],[0.80,28],[1.22,-12],[1.48,0],[2.05,0]]), w);

      // 左腕：1-2段はバランス、3段で剣を両手持ち叩きつけ
      b('leftUpperArm', tv(el, [
        [0,-72],[0.40,-48],[0.80,-46],[1.22,76],[1.48,-50],[1.72,-48],[2.05,-72]
      ]), 0, tv(el, [
        [0,-6],[0.40,26],[0.80,-26],[1.22,-20],[1.48,14],[2.05,-6]
      ]), w);
      b('leftLowerArm', 0, 0, tv(el, [
        [0,-14],[0.40,-20],[0.80,-24],[1.22,-28],[1.48,-10],[2.05,-14]
      ]), w);

      var cKnee = tv(el, [[0,2],[0.40,26],[0.80,24],[1.22,14],[1.48,46],[1.72,44],[2.05,2]]);
      b('leftUpperLeg', -0.55 * cKnee, 0, -4, w);
      b('rightUpperLeg', -0.55 * cKnee, 0, 4, w);
      b('leftLowerLeg', cKnee, 0, 0, w);
      b('rightLowerLeg', cKnee, 0, 0, w);
      b('leftFoot', -0.4 * cKnee, 0, 0, w);
      b('rightFoot', -0.4 * cKnee, 0, 0, w);

      if (hips){
        var leap = (el > 1.05 && el < 1.48) ? 0.14 * Math.sin((el - 1.05) / 0.43 * Math.PI) : 0;
        var shake = (el > 1.48 && el < 1.66) ? 0.005 * Math.sin((el - 1.48) * 85) : 0;
        hips.obj.position.y += (tv(el, [[0,0],[0.40,-0.045],[0.80,-0.04],[1.48,-0.10],[1.72,-0.095],[2.05,0]]) + leap + shake) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.40,0.20],[0.80,0.38],[1.48,0.60],[1.72,0.60],[2.05,0]]) * w;
      }
    }
  },
  {
    // 【リメイク】鰤アッパー（特格）：深く沈んで剣を引き、跳躍しながら天へ斬り上げる
    id:'upper', label:'鰤アッパー（特格・改）', loop:false, duration:1.35,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      b('hips', 0, tv(el, [[0,0],[0.32,-30],[0.62,28],[0.92,24],[1.35,0]]), 0, w);
      b('chest', tv(el, [[0,0],[0.32,14],[0.62,-12],[1.35,0]]),
        tv(el, [[0,0],[0.32,-18],[0.62,18],[1.35,0]]), 0, w);
      b('spine', tv(el, [[0,0],[0.32,24],[0.62,-14],[0.92,-10],[1.35,0]]), 0, 0, w);
      b('neck', tv(el, [[0,0],[0.32,8],[0.62,-6],[1.35,0]]), 0, 0, w);
      b('head', tv(el, [[0,0],[0.32,14],[0.62,-12],[0.92,-8],[1.35,0]]),
        tv(el, [[0,0],[0.32,18],[0.62,-14],[1.35,0]]), 0, w);

      b('rightUpperArm',
        tv(el, [[0,-70],[0.32,-68],[0.62,82],[0.92,84],[1.35,-70]]), 0,
        tv(el, [[0,5],[0.32,-26],[0.62,40],[0.92,34],[1.35,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.32,28],[0.62,10],[0.92,12],[1.35,15]]), w);
      b('rightHand', tv(el, [[0,0],[0.32,10],[0.62,-6],[1.35,0]]), 0,
        tv(el, [[0,0],[0.32,24],[0.62,-28],[0.92,-22],[1.35,0]]), w);

      b('leftUpperArm', tv(el, [[0,-72],[0.32,-48],[0.62,-20],[1.35,-72]]), 0,
        tv(el, [[0,-6],[0.32,-26],[0.62,36],[1.35,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-14],[0.32,-30],[0.62,-18],[1.35,-14]]), w);

      var uKnee = tv(el, [[0,2],[0.32,56],[0.56,8],[0.90,26],[1.35,2]]);
      b('leftUpperLeg', -0.55 * uKnee, 0, -4, w);
      b('rightUpperLeg', -0.55 * uKnee, 0, 4, w);
      b('leftLowerLeg', uKnee, 0, 0, w);
      b('rightLowerLeg', uKnee, 0, 0, w);
      b('leftFoot', -0.4 * uKnee + 14 * c.gauss(el, 0.62, 0.12), 0, 0, w);
      b('rightFoot', -0.4 * uKnee + 14 * c.gauss(el, 0.62, 0.12), 0, 0, w);

      if (hips){
        var hop = (el > 0.40 && el < 0.86) ? 0.18 * Math.sin((el - 0.40) / 0.46 * Math.PI) : 0;
        hips.obj.position.y += (tv(el, [[0,0],[0.32,-0.13],[0.56,0.02],[0.92,-0.04],[1.35,0]]) + hop) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.32,0],[0.62,0.34],[0.92,0.34],[1.35,0]]) * w;
      }
    }
  },
  {
    // 【リメイク】空中斬り：跳躍から空中で大きく振りかぶり、斜め一閃して降下着地
    id:'airslash', label:'空中斬り（改）', loop:false, duration:1.20,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var asAir = Math.min(1, Math.max(0, (el - 0.10) / 0.68));
      var asY = (el > 0.10 && el < 0.78) ? 0.38 * 4 * asAir * (1 - asAir) : 0;

      b('hips', 0, tv(el, [[0,0],[0.30,-28],[0.56,34],[0.86,32],[1.20,0]]), 0, w);
      b('spine', tv(el, [[0,0],[0.30,-12],[0.56,20],[0.86,20],[1.20,0]]), 0, 0, w);
      b('chest', tv(el, [[0,0],[0.30,-8],[0.56,12],[1.20,0]]),
        tv(el, [[0,0],[0.30,-16],[0.56,20],[1.20,0]]), 0, w);
      b('neck', 0, tv(el, [[0,0],[0.30,12],[0.56,-14],[1.20,0]]), 0, w);
      b('head', tv(el, [[0,0],[0.30,-8],[0.56,8],[1.20,0]]),
        tv(el, [[0,0],[0.30,20],[0.56,-22],[1.20,0]]), 0, w);

      b('rightUpperArm',
        tv(el, [[0,-70],[0.30,76],[0.56,-40],[0.86,-42],[1.20,-70]]), 0,
        tv(el, [[0,5],[0.30,-24],[0.56,76],[0.86,76],[1.20,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.30,22],[0.56,10],[1.20,15]]), w);
      b('rightHand', tv(el, [[0,0],[0.30,10],[0.56,-12],[1.20,0]]), 0,
        tv(el, [[0,0],[0.30,18],[0.56,-38],[0.86,-36],[1.20,0]]), w);

      b('leftUpperArm', tv(el, [[0,-72],[0.30,30],[0.56,-56],[1.20,-72]]), 0,
        tv(el, [[0,-6],[0.30,-28],[0.56,28],[1.20,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-14],[0.30,-26],[0.56,-16],[1.20,-14]]), w);

      var asKnee = tv(el, [[0,2],[0.30,44],[0.56,22],[0.86,44],[1.20,2]]);
      b('leftUpperLeg', -0.55 * asKnee, 0, -4, w);
      b('rightUpperLeg', -0.55 * asKnee, 0, 4, w);
      b('leftLowerLeg', asKnee, 0, 0, w);
      b('rightLowerLeg', asKnee, 0, 0, w);
      b('leftFoot', -0.35 * asKnee + 8, 0, 0, w);
      b('rightFoot', -0.35 * asKnee + 8, 0, 0, w);

      if (hips){
        hips.obj.position.y += (asY + tv(el, [[0,0],[0.86,-0.08],[1.20,0]])) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.56,0.36],[0.86,0.38],[1.20,0]]) * w;
      }
    }
  },
  {
    id:'airshot', label:'空中射撃', loop:false, duration:1.35,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var aiKick = el > 0.62 ? Math.exp(-(el - 0.62) / 0.06) : 0;
      var aiAim = tv(el, [[0,0],[0.3,1],[0.95,1],[1.2,0],[1.35,0]]);
      function aiVal(stand, aim){ return stand + (aim - stand) * aiAim; }
      var aiAir = Math.min(1, Math.max(0, (el - 0.1) / 0.8));
      var aiY = (el > 0.1 && el < 0.9) ? 0.30 * 4 * aiAir * (1 - aiAir) : 0;
      b('hips', 0, aiVal(0, -14), 0, w);
      b('spine', -2 * aiKick, aiVal(0, -5), 0, w);
      b('chest', -1.5 * aiKick, aiVal(0, -9), 0, w);
      b('head', aiVal(0, 3), aiVal(0, 13), aiVal(0, 5), w);
      b('neck', aiVal(0, 1), aiVal(0, 6), 0, w);
      b('rightUpperArm', aiVal(-70, -56), 0, aiVal(5, 70), w);
      b('rightLowerArm', 0, 0, aiVal(15, 84), w);
      b('rightHand', aiVal(0, -34) + 11 * aiKick, 0, aiVal(0, -56), w);
      b('leftUpperArm', aiVal(-72, 8), 0, aiVal(-6, -94), w);
      b('leftLowerArm', 0, 0, aiVal(-14, -5), w);
      b('leftUpperLeg', tv(el, [[0,0],[0.3,16],[0.9,10],[1.1,-8],[1.35,0]]), 0, 0, w);
      b('rightUpperLeg', tv(el, [[0,0],[0.3,24],[0.9,18],[1.1,-4],[1.35,0]]), 0, 0, w);
      b('leftLowerLeg', tv(el, [[0,2],[0.3,42],[0.9,30],[1.1,16],[1.35,2]]), 0, 0, w);
      b('rightLowerLeg', tv(el, [[0,2],[0.3,50],[0.9,36],[1.1,12],[1.35,2]]), 0, 0, w);
      b('leftFoot', tv(el, [[0,0],[0.3,20],[1.1,-4],[1.35,0]]), 0, 0, w);
      b('rightFoot', tv(el, [[0,0],[0.3,22],[1.1,-2],[1.35,0]]), 0, 0, w);
      if (hips){
        hips.obj.position.y += (aiY + tv(el, [[0,0],[1.1,-0.045],[1.35,0]])) * w;
        hips.obj.position.z += (-0.05 * aiKick + tv(el, [[0,0],[0.9,0.18],[1.35,0]])) * w;
      }
    }
  },
  {
    id:'bazooka', label:'鰤バズーカ（サブ射）', loop:false, duration:1.70,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var csHold = tv(el, [[0,0],[0.3,1],[0.85,1],[1.05,0.25],[1.35,0],[1.7,0]]);
      var csKick = el > 0.85 ? Math.exp(-(el - 0.85) / 0.09) : 0;
      var csTremble = Math.sin(el * 54) * 1.5 * csHold * (el < 0.85 ? 1 : 0);
      function csVal(stand, held){ return stand + (held - stand) * csHold; }
      b('rightUpperArm', csVal(-70, -32) + csTremble * 0.4 - 4 * csKick, 0, csVal(5, 42) + 8 * csKick, w);
      b('rightLowerArm', 0, 0, csVal(15, 6) + 10 * csKick, w);
      b('rightHand', csVal(0, -4) + 16 * csKick, 0, csVal(0, -10), w);
      b('leftUpperArm', csVal(-72, -38) + csTremble * 0.4, 0, csVal(-6, -32), w);
      b('leftLowerArm', 0, 0, csVal(-14, -28), w);
      b('spine', csVal(0, 8) + csTremble * 0.3 - 10 * csKick, 0, 0, w);
      b('chest', csVal(0, 5) - 6 * csKick, 0, 0, w);
      b('neck', csVal(0, 4) - 3 * csKick, 0, 0, w);
      b('head', csVal(0, 6) - 5 * csKick, 0, 0, w);
      var csKnee = csVal(2, 16) + 6 * csKick;
      b('leftUpperLeg', csVal(0, -9), 0, -3 * csHold, w);
      b('rightUpperLeg', csVal(0, -9), 0, 3 * csHold, w);
      b('leftLowerLeg', csKnee, 0, 0, w);
      b('rightLowerLeg', csKnee, 0, 0, w);
      b('leftFoot', -0.45 * csKnee, 0, 0, w);
      b('rightFoot', -0.45 * csKnee, 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips){
        hips.obj.position.y += (csVal(0, -0.03) - 0.01 * csKick) * w;
        hips.obj.position.z += (csVal(0, 0.03) - 0.16 * csKick) * w;
      }
    }
  },
  {
    id:'javelin', label:'鰤ジャベリン投擲', loop:false, duration:1.15,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      b('rightUpperArm',
        tv(el, [[0,-70],[0.38,-118],[0.45,-118],[0.56,-28],[0.8,-38],[1.15,-70]]), 0,
        tv(el, [[0,5],[0.38,26],[0.56,58],[1.15,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.38,46],[0.56,4],[1.15,15]]), w);
      b('rightHand',
        tv(el, [[0,0],[0.38,-30],[0.56,18],[1.15,0]]), 0,
        tv(el, [[0,0],[0.38,-40],[0.56,-10],[1.15,0]]), w);
      b('leftUpperArm',
        tv(el, [[0,-72],[0.38,-40],[0.56,-84],[1.15,-72]]), 0,
        tv(el, [[0,-6],[0.38,18],[0.56,-16],[1.15,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-14],[0.56,-30],[1.15,-14]]), w);
      b('spine', tv(el, [[0,0],[0.38,-7],[0.56,10],[1.15,0]]), tv(el, [[0,0],[0.38,10],[0.56,-8],[1.15,0]]), 0, w);
      b('chest', tv(el, [[0,0],[0.38,-4],[0.56,6],[1.15,0]]), 0, 0, w);
      b('neck', tv(el, [[0,0],[0.56,-4],[1.15,0]]), tv(el, [[0,0],[0.38,-8],[0.56,5],[1.15,0]]), 0, w);
      b('head', tv(el, [[0,0],[0.56,-3],[1.15,0]]), tv(el, [[0,0],[0.38,-10],[0.56,6],[1.15,0]]), 0, w);
      b('leftUpperLeg', tv(el, [[0,0],[0.38,-6],[0.56,-16],[1.15,0]]), 0, 0, w);
      b('rightUpperLeg', tv(el, [[0,0],[0.38,6],[0.56,10],[1.15,0]]), 0, 0, w);
      b('leftLowerLeg', tv(el, [[0,2],[0.56,10],[1.15,2]]), 0, 0, w);
      b('rightLowerLeg', tv(el, [[0,2],[0.56,14],[1.15,2]]), 0, 0, w);
      b('leftFoot', tv(el, [[0,0],[0.56,-4],[1.15,0]]), 0, 0, w);
      b('rightFoot', tv(el, [[0,0],[0.56,-6],[1.15,0]]), 0, 0, w);
      if (hips){
        hips.obj.position.y += tv(el, [[0,0],[0.38,-0.03],[0.56,-0.01],[1.15,0]]) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.38,0],[0.56,0.22],[0.9,0.22],[1.15,0]]) * w;
      }
    }
  },
  {
    id:'boostdash', label:'ブーストダッシュ', loop:true, duration:0.29,
    fn:function(el, w, c){
      var b = c.blend, hips = c.bones.hips;
      var bp = el * (Math.PI * 2 / 0.29);
      var bs = Math.sin(bp), bc = Math.cos(bp);
      var bLegL = -46 * bs, bLegR = 46 * bs;
      var bKneeL = 8 + 74 * Math.pow(Math.max(0, bc), 1.4);
      var bKneeR = 8 + 74 * Math.pow(Math.max(0, -bc), 1.4);
      b('leftUpperLeg', bLegL, 0, 0, w);
      b('rightUpperLeg', bLegR, 0, 0, w);
      b('leftLowerLeg', bKneeL, 0, 0, w);
      b('rightLowerLeg', bKneeR, 0, 0, w);
      b('leftFoot', -bLegL * 0.35 + 20 * Math.max(0, -bs), 0, 0, w);
      b('rightFoot', -bLegR * 0.35 + 20 * Math.max(0, bs), 0, 0, w);
      b('leftUpperArm', -52, 0, 30 + 4 * bs, w);
      b('leftLowerArm', 0, 0, -34, w);
      b('rightUpperArm', -50, 0, -32 - 4 * bs, w);
      b('rightLowerArm', 0, 0, 40, w);
      b('rightHand', -10, 0, 0, w);
      b('spine', 20, 0, 0, w);
      b('chest', 11, 2 * bs, 0, w);
      b('neck', -9, 0, 0, w);
      b('head', -12, 0, 0, w);
      b('hips', 0, 2.5 * bs, 2 * bs, w);
      if (hips) hips.obj.position.y += (-0.008 + 0.03 * Math.abs(Math.sin(bp))) * w;
    }
  },
  {
    id:'fly', label:'ブースト飛行', loop:true, duration:2.73,
    fn:function(el, w, c){
      var b = c.blend, hips = c.bones.hips;
      var fbob = Math.sin(el * 2.3);
      b('spine', 7, 0, 0, w);
      b('chest', 4, 0, 1.5 * fbob, w);
      b('neck', -3, 0, 0, w);
      b('head', -5, 0, 0, w);
      b('leftUpperLeg', -20, 0, -2, w);
      b('rightUpperLeg', 12, 0, 2, w);
      b('leftLowerLeg', 34, 0, 0, w);
      b('rightLowerLeg', 20, 0, 0, w);
      b('leftFoot', 14, 0, 0, w);
      b('rightFoot', 20, 0, 0, w);
      b('leftUpperArm', -64, 0, 16, w);
      b('leftLowerArm', 0, 0, -22, w);
      b('rightUpperArm', -60, 0, -14, w);
      b('rightLowerArm', 0, 0, 26, w);
      b('rightHand', -6, 0, 0, w);
      b('hips', 0, 0, 1.5 * fbob, w);
      if (hips) hips.obj.position.y += (0.03 + 0.018 * fbob) * w;
    }
  },
  {
    id:'launch', label:'打ち上げ被弾', loop:false, duration:2.00,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var lnAir = tv(el, [[0,0],[0.18,1],[0.85,1],[1.05,0],[2.0,0]]);
      var lnDown = tv(el, [[0,0],[0.95,0],[1.08,1],[1.55,1],[1.85,0],[2.0,0]]);
      var lnPitch = -26 * lnAir - 62 * lnDown;
      b('spine', -16 * lnAir + 6 * lnDown, 0, 0, w);
      b('chest', -11 * lnAir + 4 * lnDown, 0, 0, w);
      b('neck', -10 * lnAir - 12 * lnDown, 0, 0, w);
      b('head', -18 * lnAir - 16 * lnDown + tv(el, [[0,0],[1.85,0],[2.0,0]]), 0, 0, w);
      b('rightUpperArm', -70 + 48 * lnAir - 30 * lnDown, 0, 5 + 34 * lnAir + 6 * lnDown, w);
      b('rightLowerArm', 0, 0, 15 + 26 * lnAir + 10 * lnDown, w);
      b('leftUpperArm', -72 + 42 * lnAir - 26 * lnDown, 0, -6 - 34 * lnAir - 6 * lnDown, w);
      b('leftLowerArm', 0, 0, -14 - 24 * lnAir - 8 * lnDown, w);
      var lnKnee = 10 + 30 * lnAir + 28 * lnDown;
      b('leftUpperLeg', -0.5 * lnKnee, 0, 0, w);
      b('rightUpperLeg', -0.5 * lnKnee, 0, 0, w);
      b('leftLowerLeg', lnKnee, 0, 0, w);
      b('rightLowerLeg', lnKnee, 0, 0, w);
      b('leftFoot', -0.3 * lnKnee + 12 * lnAir, 0, 0, w);
      b('rightFoot', -0.3 * lnKnee + 12 * lnAir, 0, 0, w);
      if (hips){
        c.blendRaw('hips', lnPitch, c.poseExtraCur.hipsY, 0, w);
        var lnArc = (el > 0.1 && el < 1.0) ? 0.52 * Math.sin(Math.min(1, (el - 0.1) / 0.9) * Math.PI) : 0;
        hips.obj.position.y += (lnArc + tv(el, [[0,0],[1.08,-0.5],[1.55,-0.5],[1.85,-0.02],[2.0,0]])) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.6,-0.22],[1.08,-0.3],[1.55,-0.3],[2.0,0]]) * w;
      }
    }
  },
  {
    id:'stagger', label:'よろけ（ガード崩れ）', loop:false, duration:1.50,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var stK = tv(el, [[0,0],[0.12,1],[1.05,0.75],[1.5,0]]);
      var stWob = Math.sin(el * 11) * 7 * stK * Math.exp(-el * 0.7);
      b('hips', 0, 0, stWob * 0.6, w);
      b('spine', -8 * stK, 0, stWob * 0.5, w);
      b('chest', -6 * stK, 0, stWob * 0.4, w);
      b('neck', 4 * stK, stWob * 0.5, stWob * 0.5, w);
      b('head', 8 * stK + tv(el, [[0,0],[1.2,0],[1.38,-6],[1.5,0]]), stWob * 0.7, stWob * 0.6, w);
      b('rightUpperArm', -70 + 22 * stK + Math.sin(el * 11) * 14 * stK, 0, 5 + 24 * stK, w);
      b('rightLowerArm', 0, 0, 15 + 18 * stK, w);
      b('rightHand', 8 * stK, 0, 0, w);
      b('leftUpperArm', -72 + 20 * stK + Math.sin(el * 11 + 2.4) * 14 * stK, 0, -6 - 24 * stK, w);
      b('leftLowerArm', 0, 0, -(14 + 16 * stK), w);
      b('leftUpperLeg', tv(el, [[0,0],[0.3,18],[0.6,-8],[0.95,12],[1.5,0]]), 0, 0, w);
      b('rightUpperLeg', tv(el, [[0,0],[0.3,-10],[0.6,16],[0.95,-6],[1.5,0]]), 0, 0, w);
      b('leftLowerLeg', tv(el, [[0,2],[0.3,8],[0.6,20],[0.95,10],[1.5,2]]), 0, 0, w);
      b('rightLowerLeg', tv(el, [[0,2],[0.3,18],[0.6,8],[0.95,16],[1.5,2]]), 0, 0, w);
      b('leftFoot', tv(el, [[0,0],[0.6,8],[1.5,0]]), 0, 0, w);
      b('rightFoot', tv(el, [[0,0],[0.6,8],[1.5,0]]), 0, 0, w);
      if (hips){
        hips.obj.position.y += (-0.02 * stK + 0.006 * Math.abs(Math.sin(el * 11)) * stK) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.35,-0.16],[0.7,-0.3],[1.05,-0.36],[1.5,0]]) * w;
      }
    }
  },
  {
    id:'victory1', label:'勝利1（剣掲げ）', loop:false, duration:3.20,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var vcUp = tv(el, [[0,0],[0.4,0.3],[0.9,1],[2.7,1],[3.2,0]]);
      b('rightUpperArm', -70 + (145 * vcUp), 0, 5 + 16 * vcUp, w);
      b('rightLowerArm', 0, 0, 15 - 5 * vcUp, w);
      b('rightHand', -10 * vcUp, 0, 0, w);
      b('leftUpperArm', -72 + (40 * vcUp), 0, -6 - 28 * vcUp, w);
      b('leftLowerArm', 0, 0, -14 - 70 * vcUp, w);
      b('spine', -8 * vcUp, 0, 0, w);
      b('chest', -6 * vcUp, 0, 0, w);
      b('neck', -4 * vcUp, 0, 0, w);
      b('head', -8 * vcUp, 0, 0, w);
      var vcKnee = tv(el, [[0,2],[0.4,14],[0.9,4],[2.7,4],[3.2,2]]);
      b('leftUpperLeg', -0.55 * vcKnee, 0, -4 * vcUp, w);
      b('rightUpperLeg', -0.55 * vcKnee, 0, 4 * vcUp, w);
      b('leftLowerLeg', vcKnee, 0, 0, w);
      b('rightLowerLeg', vcKnee, 0, 0, w);
      b('leftFoot', -0.45 * vcKnee, 0, 0, w);
      b('rightFoot', -0.45 * vcKnee, 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips) hips.obj.position.y += (0.01 * vcUp) * w;
    }
  },
  {
    id:'victory2', label:'勝利2（大喜び）', loop:false, duration:3.20,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var joy = tv(el, [[0,0],[0.3,1],[2.7,1],[3.2,0]]);
      var hop = Math.max(
        (el > 0.2 && el < 0.6) ? 0.12 * Math.sin((el - 0.2) / 0.4 * Math.PI) : 0,
        Math.max(
          (el > 0.8 && el < 1.2) ? 0.12 * Math.sin((el - 0.8) / 0.4 * Math.PI) : 0,
          (el > 1.4 && el < 1.8) ? 0.10 * Math.sin((el - 1.4) / 0.4 * Math.PI) : 0
        )
      );
      var waveArm = Math.sin(el * 14) * 16 * joy;
      b('rightUpperArm', -70 + (155 + waveArm) * joy, 0, (20 + waveArm * 0.5) * joy, w);
      b('rightLowerArm', 0, 0, 15 + 20 * joy, w);
      b('leftUpperArm', -72 + (155 - waveArm) * joy, 0, (-20 - waveArm * 0.5) * joy, w);
      b('leftLowerArm', 0, 0, -14 - 20 * joy, w);
      b('spine', -4 * joy, 0, 0, w);
      b('chest', -2 * joy, 0, 0, w);
      b('head', -6 * joy, 0, waveArm * 0.3, w);
      var joyKnee = tv(el, [[0,2],[0.2,20],[0.4,4],[0.8,20],[1.0,4],[1.4,18],[1.6,4],[3.2,2]]);
      b('leftUpperLeg', -0.5 * joyKnee, 0, 0, w);
      b('rightUpperLeg', -0.5 * joyKnee, 0, 0, w);
      b('leftLowerLeg', joyKnee, 0, 0, w);
      b('rightLowerLeg', joyKnee, 0, 0, w);
      b('leftFoot', -0.3 * joyKnee, 0, 0, w);
      b('rightFoot', -0.3 * joyKnee, 0, 0, w);
      if (hips) hips.obj.position.y += hop * w;
    }
  },
  {
    id:'victory3', label:'勝利3（肩担ぎ仁王）', loop:false, duration:3.20,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var pose = tv(el, [[0,0],[0.6,1],[2.7,1],[3.2,0]]);
      b('rightUpperArm', -70 + (148 * pose), 0, 5 + 48 * pose, w);
      b('rightLowerArm', 0, 0, 15 + 120 * pose, w);
      b('rightHand', 20 * pose, 0, 30 * pose, w);
      b('leftUpperArm', -72 + (30 * pose), 0, -6 - 45 * pose, w);
      b('leftLowerArm', 0, 0, -14 - 70 * pose, w);
      b('spine', -8 * pose, 0, 0, w);
      b('chest', -6 * pose, 0, 0, w);
      b('neck', -4 * pose, 0, 0, w);
      b('head', -6 * pose, 0, 0, w);
      b('leftUpperLeg', 0, 0, -16 * pose, w);
      b('rightUpperLeg', 0, 0, 16 * pose, w);
      b('leftLowerLeg', 8 * pose, 0, 0, w);
      b('rightLowerLeg', 8 * pose, 0, 0, w);
      b('leftFoot', -6 * pose, 0, 0, w);
      b('rightFoot', -6 * pose, 0, 0, w);
      if (hips) hips.obj.position.y += -0.015 * pose * w;
    }
  }
]);

V.MOTION_MAP.chargeshot = V.MOTION_MAP.bazooka;

})(window.VRMViewer);