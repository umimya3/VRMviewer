(function(V){
"use strict";

V.registerMotions({ id:'exvs', label:'EXVSシステム・長物武装', open:true }, [
  {
    // オーバーヒート着地（大硬直）：膝をつき肩で息をして大きな隙を晒す
    id:'oh_landing', label:'オバヒ着地（大硬直）', loop:false, duration:2.20,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var kneel = tv(el, [[0,0],[0.16,0.3],[0.32,1],[1.65,1],[2.05,0.2],[2.2,0]]);
      var pant = (el > 0.35 && el < 1.65) ? Math.sin((el - 0.35) * 11) * 1.8 : 0;

      b('spine', 28 * kneel + pant * 0.4, 0, 0, w);
      b('chest', 16 * kneel + pant, 0, 0, w);
      b('neck', 8 * kneel, 0, 0, w);
      b('head', 22 * kneel + pant * 0.6, 0, 0, w);

      // 左手は地面へついて体を支え、右手は武器を下げて脱力
      b('leftUpperArm', -72 + 44 * kneel, 0, -6 - 14 * kneel, w);
      b('leftLowerArm', 0, 0, -14 - 8 * kneel, w);
      b('rightUpperArm', -70 + 22 * kneel, 0, 5 + 10 * kneel, w);
      b('rightLowerArm', 0, 0, 15 + 10 * kneel, w);
      b('rightHand', 12 * kneel, 0, 0, w);

      // 片膝立ち風（左足を前に立て、右膝を深く落とす）
      b('leftUpperLeg', -66 * kneel, 0, -4 * kneel, w);
      b('leftLowerLeg', 2 + 88 * kneel, 0, 0, w);
      b('leftFoot', -18 * kneel, 0, 0, w);
      b('rightUpperLeg', -22 * kneel, 0, 4 * kneel, w);
      b('rightLowerLeg', 2 + 96 * kneel, 0, 0, w);
      b('rightFoot', 22 * kneel, 0, 0, w);
      b('hips', 0, 0, 0, w);

      if (hips){
        hips.obj.position.y += tv(el, [[0,0.28],[0.16,0],[0.32,-0.34],[1.65,-0.34],[2.2,0]]) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.32,0.06],[1.65,0.06],[2.2,0]]) * w;
      }
    }
  },
  {
    // 通常着地（小硬直）：軽やかな膝のクッション吸収
    id:'landing', label:'通常着地（小硬直）', loop:false, duration:0.55,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var knee = tv(el, [[0,14],[0.10,18],[0.20,44],[0.36,16],[0.55,2]]);
      var lean = tv(el, [[0,4],[0.20,12],[0.55,0]]);
      b('spine', lean, 0, 0, w);
      b('chest', lean * 0.6, 0, 0, w);
      b('neck', -lean * 0.4, 0, 0, w);
      b('head', -lean * 0.5, 0, 0, w);
      b('leftUpperArm', -70 + lean * 0.8, 0, -6 - lean, w);
      b('leftLowerArm', 0, 0, -14 - lean * 0.8, w);
      b('rightUpperArm', -70 + lean * 0.6, 0, 5 + lean * 0.8, w);
      b('rightLowerArm', 0, 0, 15 + lean * 0.8, w);
      b('leftUpperLeg', -0.55 * knee, 0, -3, w);
      b('rightUpperLeg', -0.55 * knee, 0, 3, w);
      b('leftLowerLeg', knee, 0, 0, w);
      b('rightLowerLeg', knee, 0, 0, w);
      b('leftFoot', -0.42 * knee, 0, 0, w);
      b('rightFoot', -0.42 * knee, 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips){
        hips.obj.position.y += tv(el, [[0,0.18],[0.10,0],[0.20,-0.075],[0.36,-0.02],[0.55,0]]) * w;
      }
    }
  },
  {
    // 自由落下（ループ）：ブーストオフで空から降りてくる姿勢
    id:'fall', label:'自由落下', loop:true, duration:1.60,
    fn:function(el, w, c){
      var b = c.blend, hips = c.bones.hips;
      var ph = el * (Math.PI * 2 / 1.60);
      var sway = Math.sin(ph);
      b('spine', 5 + 1.2 * sway, 0, 0, w);
      b('chest', 3, 0, 1.5 * Math.cos(ph), w);
      b('neck', -2, 0, 0, w);
      b('head', 6, 0, 0, w);
      b('leftUpperArm', -58 + 3 * sway, 0, -18, w);
      b('leftLowerArm', 0, 0, -28, w);
      b('rightUpperArm', -62 - 2 * sway, 0, -12, w);
      b('rightLowerArm', 0, 0, 26, w);
      b('rightHand', -8, 0, 0, w);
      b('leftUpperLeg', -18 + 3 * sway, 0, -4, w);
      b('rightUpperLeg', -6 - 3 * sway, 0, 4, w);
      b('leftLowerLeg', 32 + 4 * sway, 0, 0, w);
      b('rightLowerLeg', 18 - 4 * sway, 0, 0, w);
      b('leftFoot', 10, 0, 0, w);
      b('rightFoot', 14, 0, 0, w);
      b('hips', 0, 0, 0, w);
      if (hips) hips.obj.position.y += (0.18 + 0.015 * sway) * w;
    }
  },
  {
    // 振り向き撃ち（足止まり射撃）：空中で175°クルッと後ろを向いて発射し戻る
    id:'turn_shot', label:'振り向き撃ち', loop:false, duration:0.95,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var yaw = tv(el, [[0,0],[0.18,175],[0.60,175],[0.95,0]]);
      var aim = tv(el, [[0,0],[0.16,1],[0.58,1],[0.95,0]]);
      var kick = el > 0.28 ? Math.exp(-(el - 0.28) / 0.05) : 0;
      function val(s, a){ return s + (a - s) * aim; }

      b('spine', -3 * kick, val(0, -5), 0, w);
      b('chest', -2 * kick, val(0, -9), 0, w);
      b('neck', val(0, 1), val(0, 6), 0, w);
      b('head', val(0, 3), val(0, 13), val(0, 5), w);
      b('rightUpperArm', val(-70, -57), 0, val(5, 71), w);
      b('rightLowerArm', 0, 0, val(15, 85), w);
      b('rightHand', val(0, -35) + 11 * kick, 0, val(0, -57), w);
      b('leftUpperArm', val(-72, 9), 0, val(-6, -95), w);
      b('leftLowerArm', 0, 0, val(-14, -5), w);
      b('leftUpperLeg', val(0, -14), 0, -3 * aim, w);
      b('rightUpperLeg', val(0, 8), 0, 3 * aim, w);
      b('leftLowerLeg', val(2, 26), 0, 0, w);
      b('rightLowerLeg', val(2, 16), 0, 0, w);
      b('leftFoot', val(0, 10), 0, 0, w);
      b('rightFoot', val(0, 14), 0, 0, w);

      if (hips){
        c.blendRaw('hips', 0, yaw + val(0, -14), 0, w);
        hips.obj.position.y += tv(el, [[0,0],[0.18,0.14],[0.60,0.12],[0.95,0]]) * w;
        // 後ろ向き時はローカル-Z側へ反動が出るのでワールド空間を意識した押し戻し
        hips.obj.position.z += 0.025 * kick * w;
      }
    }
  },
  {
    // 照射ビーム（ゲロビ）：両手でライフルを腰に固定して極太ビームを照射し続ける
    id:'gerobi', label:'照射ビーム（ゲロビ）', loop:false, duration:2.40,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var hold = tv(el, [[0,0],[0.30,1],[1.85,1],[2.40,0]]);
      var firing = (el > 0.34 && el < 1.75) ? tv(el, [[0.34,0],[0.42,1],[1.68,1],[1.75,0]]) : 0;
      var vib = firing * Math.sin(el * 58);
      var endKick = (el > 1.75) ? Math.exp(-(el - 1.75) / 0.10) * firing : 0;
      function gVal(s, a){ return s + (a - s) * hold; }

      b('hips', 0, gVal(0, -12), 0, w);
      b('spine', gVal(0, 4) - 5 * firing + 0.6 * vib, gVal(0, -4), 0, w);
      b('chest', gVal(0, 2) - 3 * firing + 0.8 * vib, gVal(0, -8), 0, w);
      b('neck', gVal(0, 2), gVal(0, 6), 0, w);
      b('head', gVal(0, 4) + 0.5 * vib, gVal(0, 12), 0, w);

      // 右手は腰溜め保持、左手は銃身下をしっかり握り込んで反動を抑える
      b('rightUpperArm', gVal(-70, -52) + 1.2 * vib, 0, gVal(5, 58), w);
      b('rightLowerArm', 0, 0, gVal(15, 68), w);
      b('rightHand', gVal(0, -28) + 2.5 * firing + 1.5 * vib + 6 * endKick, 0, gVal(0, -46), w);
      b('leftUpperArm', gVal(-72, -14) + 1.0 * vib, 0, gVal(-6, -86), w);
      b('leftLowerArm', 0, 0, gVal(-14, -18), w);

      // 重心を落として踏ん張る
      var knee = gVal(2, 24);
      b('leftUpperLeg', -0.55 * knee, 0, -8 * hold, w);
      b('rightUpperLeg', -0.55 * knee, 0, 8 * hold, w);
      b('leftLowerLeg', knee, 0, 0, w);
      b('rightLowerLeg', knee, 0, 0, w);
      b('leftFoot', -0.45 * knee, 0, 0, w);
      b('rightFoot', -0.45 * knee, 0, 0, w);

      if (hips){
        hips.obj.position.y += gVal(0, -0.048) * w;
        hips.obj.position.z += (-0.045 * firing + 0.008 * vib) * w;
      }
    }
  },
  {
    // 強制ダウン吹き飛び（イエローダウン）：錐揉み吹っ飛び→地面バウンド→起き上がり
    id:'forced_down', label:'強制ダウン吹き飛び', loop:false, duration:3.00,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var pitch = tv(el, [[0,0],[0.25,-45],[0.62,-90],[2.25,-90],[2.65,-25],[3.0,0]]);
      var spin = (el < 0.65) ? Math.sin(Math.min(1, el / 0.65) * Math.PI) * 18 : 0;
      var downK = tv(el, [[0,0],[0.25,1],[2.25,1],[2.75,0]]);

      b('spine', 8 * downK, 0, spin * 0.4, w);
      b('chest', 4 * downK, 0, 0, w);
      b('neck', -10 * downK, 0, 0, w);
      b('head', -14 * downK, 0, 0, w);
      b('rightUpperArm', -70 + 60 * downK, 0, 5 + 38 * downK, w);
      b('rightLowerArm', 0, 0, 15 + 12 * downK, w);
      b('leftUpperArm', -72 + 62 * downK, 0, -6 - 38 * downK, w);
      b('leftLowerArm', 0, 0, -14 - 12 * downK, w);
      var fKnee = tv(el, [[0,2],[0.3,38],[0.65,12],[2.25,10],[2.6,45],[3.0,2]]);
      b('leftUpperLeg', -0.35 * fKnee, 0, -7 * downK, w);
      b('rightUpperLeg', -0.35 * fKnee, 0, 7 * downK, w);
      b('leftLowerLeg', fKnee, 0, 0, w);
      b('rightLowerLeg', fKnee, 0, 0, w);
      b('leftFoot', 10 * downK, 0, 0, w);
      b('rightFoot', 10 * downK, 0, 0, w);

      if (hips){
        c.blendRaw('hips', pitch, c.poseExtraCur.hipsY, spin, w);
        // 放物線吹っ飛び + 0.65〜0.92s で1バウンド + 2.25sから復帰
        var flyY = tv(el, [[0,0],[0.32,0.42],[0.65,-0.52],[0.78,-0.38],[0.92,-0.53],[2.25,-0.53],[2.65,-0.15],[3.0,0]]);
        var flyZ = tv(el, [[0,0],[0.65,-0.65],[0.92,-0.82],[2.25,-0.82],[2.75,-0.2],[3.0,0]]);
        hips.obj.position.y += flyY * w;
        hips.obj.position.z += flyZ * w;
      }
    }
  },
  {
    // 空中受け身：吹き飛び状態から空中で素早く1回転して体勢を立て直す
    id:'air_recovery', label:'空中受け身', loop:false, duration:0.85,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var prog = Math.min(1, Math.max(0, (el - 0.10) / 0.50));
      var pitch = (el < 0.10) ? tv(el, [[0,-18],[0.10,-18]]) : (-18 + 378 * c.easeInOut(prog));
      if (el > 0.60) pitch = tv(el, [[0.60,360],[0.85,360]]);
      var tuck = (el > 0.08 && el < 0.65) ? Math.sin(Math.min(1, (el - 0.08) / 0.57) * Math.PI) : 0;

      b('spine', 16 * tuck, 0, 0, w);
      b('chest', 10 * tuck, 0, 0, w);
      b('neck', 8 * tuck, 0, 0, w);
      b('head', 14 * tuck, 0, 0, w);
      b('leftUpperArm', -72 + 24 * tuck, 0, -6 - 24 * tuck, w);
      b('leftLowerArm', 0, 0, -14 - 50 * tuck, w);
      b('rightUpperArm', -70 + 24 * tuck, 0, 5 + 24 * tuck, w);
      b('rightLowerArm', 0, 0, 15 + 50 * tuck, w);
      var rKnee = 4 + 86 * tuck;
      b('leftUpperLeg', -0.65 * rKnee, 0, 0, w);
      b('rightUpperLeg', -0.65 * rKnee, 0, 0, w);
      b('leftLowerLeg', rKnee, 0, 0, w);
      b('rightLowerLeg', rKnee, 0, 0, w);
      b('leftFoot', 12 * tuck, 0, 0, w);
      b('rightFoot', 12 * tuck, 0, 0, w);

      if (hips){
        c.blendRaw('hips', pitch, c.poseExtraCur.hipsY, 0, w);
        hips.obj.position.y += tv(el, [[0,0.22],[0.35,0.40],[0.68,0.14],[0.85,0]]) * w;
        hips.obj.position.z += tv(el, [[0,-0.25],[0.50,-0.12],[0.85,0]]) * w;
      }
    }
  },
  {
    // リスポーン降下（再出撃）：高高度から降りてスッと減速着地
    id:'respawn', label:'リスポーン降下', loop:false, duration:1.40,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var dropPose = tv(el, [[0,1],[0.68,1],[0.95,0.2],[1.40,0]]);
      var absorb = tv(el, [[0,0],[0.70,0],[0.85,1],[1.10,0.2],[1.40,0]]);

      b('spine', 4 * dropPose + 10 * absorb, 0, 0, w);
      b('chest', 2 * dropPose + 6 * absorb, 0, 0, w);
      b('neck', -2 * dropPose - 4 * absorb, 0, 0, w);
      b('head', 6 * dropPose - 4 * absorb, 0, 0, w);
      b('leftUpperArm', -72 + 16 * dropPose + 8 * absorb, 0, -6 - 16 * dropPose, w);
      b('leftLowerArm', 0, 0, -14 - 16 * dropPose, w);
      b('rightUpperArm', -70 + 10 * dropPose + 6 * absorb, 0, 5 - 10 * dropPose, w);
      b('rightLowerArm', 0, 0, 15 + 14 * dropPose, w);
      b('leftUpperLeg', -24 * dropPose - 16 * absorb, 0, -3, w);
      b('rightUpperLeg', -6 * dropPose - 16 * absorb, 0, 3, w);
      b('leftLowerLeg', 2 + 40 * dropPose + 32 * absorb, 0, 0, w);
      b('rightLowerLeg', 2 + 14 * dropPose + 32 * absorb, 0, 0, w);
      b('leftFoot', 10 * dropPose - 14 * absorb, 0, 0, w);
      b('rightFoot', 12 * dropPose - 14 * absorb, 0, 0, w);
      b('hips', 0, 0, 0, w);

      if (hips){
        hips.obj.position.y += tv(el, [[0,1.50],[0.62,0.16],[0.76,0],[0.88,-0.055],[1.18,0],[1.40,0]]) * w;
      }
    }
  }
]);

})(window.VRMViewer);