(function(V){
"use strict";

var BURST_SHOTS = [0.55, 0.66, 0.77];
var BURST_AMPS  = [0.7, 0.7, 1.0];

V.registerMotions({ id:'sword', label:'鰤ソード', open:true }, [
  {
    id:'chop', label:'必殺・真っ向唐竹割り', loop:false, duration:2.40,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      // 0.0-0.9s: 両手で重い剣を頭上高く担ぎ上げ、体を反らせてタメる
      // 0.9-1.15s: 頂点で一瞬の静止
      // 1.15-1.35s: 全身の体重で真っ向から地面へドォォンと叩きつける！
      // 1.35-1.65s: ヒットストップ・衝撃微振動
      // 1.65-2.40s: 重そうに持ち上げて通常姿勢へ
      var lift = tv(el, [[0,0],[0.85,1],[1.12,1],[1.32,0],[2.4,0]]);
      var smash = tv(el, [[0,0],[1.15,0],[1.32,1],[1.65,1],[2.0,0.3],[2.4,0]]);

      // 上体：持ち上げ時は後ろに大きく反り、叩きつけで前方深くへ前屈
      var spVal = -16 * lift + 28 * smash;
      b('spine', spVal, 0, 0, w);
      b('chest', spVal * 0.7, 0, 0, w);
      b('neck', -4 * lift - 6 * smash, 0, 0, w);
      b('head', -8 * lift + 12 * smash, 0, 0, w);

      // 右腕：両手で天高く掲げ（lift時 +85°）、一気に前方下段（-65°）へ振り下ろす
      b('rightUpperArm',
        tv(el, [[0,-70],[0.85,85],[1.12,85],[1.32,-65],[1.65,-65],[2.0,-45],[2.4,-70]]), 0,
        tv(el, [[0,5],[0.85,-22],[1.12,-22],[1.32,14],[1.65,14],[2.4,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.85,12],[1.12,10],[1.32,8],[1.65,8],[2.4,15]]), w);
      b('rightHand', tv(el, [[0,0],[0.85,10],[1.12,10],[1.32,-12],[1.65,-12],[2.4,0]]), 0, 0, w);

      // 左腕：右手に添えて両手持ちを維持しながら一緒に叩きつける
      b('leftUpperArm',
        tv(el, [[0,-72],[0.85,80],[1.12,80],[1.32,-55],[1.65,-55],[2.0,-35],[2.4,-72]]), 0,
        tv(el, [[0,-6],[0.85,-20],[1.12,-20],[1.32,12],[1.65,12],[2.4,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-14],[0.85,-24],[1.12,-22],[1.32,-8],[1.65,-8],[2.4,-14]]), w);

      // 脚部：叩きつけで膝を深く曲げて腰を落とす
      var kneeSmash = tv(el, [[0,2],[0.85,10],[1.15,8],[1.32,46],[1.65,44],[2.0,18],[2.4,2]]);
      b('leftUpperLeg', -0.55 * kneeSmash, 0, 0, w);
      b('rightUpperLeg', -0.55 * kneeSmash, 0, 0, w);
      b('leftLowerLeg', kneeSmash, 0, 0, w);
      b('rightLowerLeg', kneeSmash, 0, 0, w);
      b('leftFoot', -0.4 * kneeSmash, 0, 0, w);
      b('rightFoot', -0.4 * kneeSmash, 0, 0, w);
      b('hips', 0, 0, 0, w);

      if (hips){
        var shake = (el > 1.32 && el < 1.55) ? 0.005 * Math.sin((el - 1.32) * 80) : 0;
        // 叩きつけの沈み込み + 地面めり込み感
        hips.obj.position.y += (tv(el, [[0,0],[0.85,0.02],[1.15,0.01],[1.32,-0.12],[1.65,-0.11],[2.0,-0.04],[2.4,0]]) + shake) * w;
        // 踏み込み前進
        hips.obj.position.z += tv(el, [[0,0],[0.85,0],[1.15,0],[1.32,0.38],[1.75,0.38],[2.4,0]]) * w;
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
    // 全身を使った360度大回転薙ぎ払い斬り
    id:'spin', label:'回転斬り', loop:false, duration:1.35,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var sp = Math.min(1, Math.max(0, (el - 0.20) / 0.85));
      var spinDeg = 360 * c.easeInOut(sp);
      if (el > 1.05) spinDeg += 5 * Math.sin((el - 1.05) * 18) * Math.exp(-(el - 1.05) * 6);
      var spKnee = tv(el, [[0,2],[0.2,14],[0.55,8],[1.05,12],[1.2,16],[1.35,2]]);

      // 遠心力で剣を真横に水平に大きく広げて振り回す
      b('rightUpperArm', tv(el, [[0,-70],[0.2,-20],[0.6,15],[1.05,-10],[1.35,-70]]), 0,
        tv(el, [[0,5],[0.2,55],[0.6,85],[1.05,75],[1.35,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.2,25],[0.6,8],[1.05,20],[1.35,15]]), w);
      b('rightHand', -10, 0, 0, w);
      b('leftUpperArm', -55, 0, -35, w);
      b('leftLowerArm', 0, 0, -22, w);
      b('spine', 4, 0, 0, w);
      b('chest', 3, 0, 0, w);
      b('neck', 0, 0, 0, w);
      b('head', -3, 0, 0, w);
      b('leftUpperLeg', -0.55 * spKnee, 0, 0, w);
      b('rightUpperLeg', -0.55 * spKnee, 0, 0, w);
      b('leftLowerLeg', spKnee, 0, 0, w);
      b('rightLowerLeg', spKnee, 0, 0, w);
      b('leftFoot', -0.45 * spKnee, 0, 0, w);
      b('rightFoot', -0.45 * spKnee, 0, 0, w);
      if (hips){
        c.blendRaw('hips', 0, c.poseExtraCur.hipsY + spinDeg, 0, w);
        hips.obj.position.y += -0.02 * Math.sin(Math.PI * Math.min(1, el / 1.35)) * w;
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
    // 本格野球バッティングフォーム（右肩立て構え→一本足タイミング→腰回転フルスイング）
    id:'bat', label:'バットフルスイング', loop:false, duration:1.45,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      // 0.0-0.45s: 右打者の構え（右肩後ろにバットを垂直近く立てて両手握り、左足を上げてタメ）
      // 0.45-0.75s: 踏み込んで一気に水平フルスイング！
      // 0.75-1.10s: 左肩上へフォロースルー巻き付き＆打球見送り
      // 1.10-1.45s: 構えを解いて通常姿勢へ
      var bHipY = tv(el, [[0,0],[0.42,-38],[0.72,55],[1.05,68],[1.18,40],[1.45,0]]);
      b('hips', 0, bHipY, 0, w);
      b('chest', 0, tv(el, [[0,0],[0.42,-44],[0.72,50],[1.05,62],[1.45,0]]), 0, w);
      b('spine', tv(el, [[0,0],[0.42,4],[0.72,-4],[1.05,-6],[1.45,0]]), 0, 0, w);
      b('head', tv(el, [[0,0],[0.42,2],[0.72,-6],[1.05,-12],[1.45,0]]),
                 tv(el, [[0,0],[0.42,32],[0.72,-8],[1.05,-14],[1.45,0]]), 0, w);

      // 右腕：バットを右耳〜肩の後ろに立てて構え（Elbow深く曲げ）、インパクトで振り抜く
      b('rightUpperArm',
        tv(el, [[0,-70],[0.42,15],[0.72,-25],[1.05,-15],[1.45,-70]]), 0,
        tv(el, [[0,5],[0.42,-35],[0.72,65],[1.05,92],[1.45,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.42,105],[0.72,18],[1.05,65],[1.45,15]]), w);
      b('rightHand', tv(el, [[0,0],[0.42,-18],[0.72,12],[1.05,0],[1.45,0]]), 0, 0, w);

      // 左腕：右手に添えてバットを両手グリップ
      b('leftUpperArm',
        tv(el, [[0,-72],[0.42,-25],[0.72,-15],[1.05,-30],[1.45,-72]]), 0,
        tv(el, [[0,-6],[0.42,-42],[0.72,25],[1.05,38],[1.45,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-14],[0.42,-65],[0.72,-15],[1.05,-30],[1.45,-14]]), w);

      // 左脚（前足）：テイクバックで軽く引き上げてステップを踏み込む
      var stepKneeL = tv(el, [[0,2],[0.35,32],[0.55,10],[0.75,8],[1.45,2]]);
      b('leftUpperLeg', tv(el, [[0,0],[0.35,-22],[0.55,-8],[1.45,0]]), 0, 0, w);
      b('leftLowerLeg', stepKneeL, 0, 0, w);
      b('leftFoot', -0.4 * stepKneeL, 0, 0, w);

      // 右脚（軸足）：踏ん張って腰の回転を支える
      var kneeR = tv(el, [[0,2],[0.42,14],[0.72,22],[1.05,18],[1.45,2]]);
      b('rightUpperLeg', -0.5 * kneeR, 0, 0, w);
      b('rightLowerLeg', kneeR, 0, 0, w);
      b('rightFoot', tv(el, [[0,0],[0.72,18],[1.05,18],[1.45,0]]), 0, 0, w);

      if (hips){
        hips.obj.position.y += tv(el, [[0,0],[0.42,0.015],[0.72,-0.04],[1.05,-0.03],[1.45,0]]) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.42,-0.02],[0.72,0.18],[1.05,0.18],[1.45,0]]) * w;
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