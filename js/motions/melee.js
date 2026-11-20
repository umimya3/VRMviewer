(function(V){
"use strict";

/* ================= グループA：パンチ・掌底・連撃（7種） ================= */
V.registerMotions({ id:'melee_punch', label:'パンチ・掌底・連撃', open:true, tab:'melee' }, [
  {
    // ワンツー（左ジャブ→踏み込み右ストレート）
    id:'melee_jab_straight', label:'ワンツー（ジャブ→ストレート）', loop:false, duration:1.05,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var guard = tv(el, [[0,0],[0.12,1],[0.80,1],[1.05,0]]);
      var jab = tv(el, [[0,0],[0.14,0],[0.24,1],[0.36,0],[1.05,0]]);
      var cross = tv(el, [[0,0],[0.36,0],[0.52,1],[0.72,1],[1.05,0]]);
      var tw = c.isBuriRig ? 0 : -26 * guard;

      var yaw = 20 * guard - 14 * jab - 44 * cross;
      b('hips', 0, yaw, 0, w);
      b('spine', 8 * guard + 6 * cross, 0, 0, w);
      b('chest', 4 * guard, -14 * jab - 24 * cross, 0, w);
      b('neck', 0, -yaw * 0.5, 0, w);
      b('head', 4 * guard, -yaw * 0.7 + 10 * jab + 20 * cross, 0, w);

      // 左腕：ガードから素早いジャブ
      b('leftUpperArm', -70 + (36 * guard + 34 * jab), tw, (-62 - 22 * jab + 18 * cross) * guard, w);
      b('leftLowerArm', 0, 0, -14 + (-96 * guard + 92 * jab), w);

      // 右腕：顎横ガードから腰を捻って重いストレート
      b('rightUpperArm', -70 + (36 * guard + 34 * cross), tw, (54 - 16 * jab + 30 * cross) * guard, w);
      b('rightLowerArm', 0, 0, 15 + (98 * guard - 94 * cross), w);

      // ボクシングステップ足
      b('leftUpperLeg', (-20 - 10 * cross) * guard, 0, -4 * guard, w);
      b('leftLowerLeg', 2 + 24 * guard, 0, 0, w);
      b('rightUpperLeg', (16 + 8 * cross) * guard, 0, 4 * guard, w);
      b('rightLowerLeg', 2 + 16 * guard, 0, 0, w);
      if (hips){
        hips.obj.position.y += -0.04 * guard * w;
        hips.obj.position.z += (0.10 * jab + 0.30 * cross) * w;
      }
    }
  },
  {
    // フック → アッパーカット
    id:'melee_hook_upper', label:'左フック→右アッパー', loop:false, duration:1.25,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var guard = tv(el, [[0,0],[0.12,1],[0.98,1],[1.25,0]]);
      var hook = tv(el, [[0,0],[0.18,0],[0.34,1],[0.50,0],[1.25,0]]);
      var dip = tv(el, [[0,0],[0.45,0],[0.58,1],[0.72,0],[1.25,0]]);
      var upper = tv(el, [[0,0],[0.60,0],[0.76,1],[0.96,1],[1.25,0]]);
      var tw = c.isBuriRig ? 0 : -24 * guard;

      var yaw = 18 * guard - 46 * hook - 20 * dip + 34 * upper;
      b('hips', 0, yaw, 0, w);
      b('spine', 8 * guard + 14 * dip - 10 * upper, 0, 0, w);
      b('chest', 4 * guard, -22 * hook + 18 * upper, 0, w);
      b('neck', 0, -yaw * 0.45, 0, w);
      b('head', 4 * guard - 8 * upper, -yaw * 0.7, 0, w);

      // 左フック（腕を水平90°に曲げて横から叩き込む）
      b('leftUpperArm', -70 + (38 * guard + 32 * hook), tw, (-56 + 44 * hook) * guard, w);
      b('leftLowerArm', 0, 0, -14 + (-94 * guard + 16 * hook), w);

      // 右アッパー（低く落として下から顎をカチ上げる）
      b('rightUpperArm', -70 + (36 * guard - 20 * dip + 58 * upper), tw, (52 - 36 * dip + 28 * upper) * guard, w);
      b('rightLowerArm', 0, 0, 15 + (96 * guard - 14 * upper), w);

      var knee = 18 * guard + 34 * dip;
      b('leftUpperLeg', -0.55 * knee, 0, -4 * guard, w);
      b('rightUpperLeg', -0.55 * knee, 0, 4 * guard, w);
      b('leftLowerLeg', knee, 0, 0, w);
      b('rightLowerLeg', knee, 0, 0, w);
      if (hips){
        hips.obj.position.y += (-0.035 * guard - 0.08 * dip + 0.09 * upper) * w;
        hips.obj.position.z += (0.14 * hook + 0.34 * upper) * w;
      }
    }
  },
  {
    // オラオラ百裂拳（怒涛の高速連打→フィニッシュ右ストレート）
    id:'melee_rush_fists', label:'連続パンチ（百裂ラッシュ）', loop:false, duration:1.85,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var stance = tv(el, [[0,0],[0.15,1],[1.50,1],[1.85,0]]);
      var rush = (el > 0.16 && el < 1.15) ? Math.sin((el - 0.16) * 44) : 0;
      var lPunch = (el > 0.16 && el < 1.15) ? Math.max(0, rush) : 0;
      var rPunch = (el > 0.16 && el < 1.15) ? Math.max(0, -rush) : 0;
      var fin = tv(el, [[0,0],[1.16,0],[1.32,1],[1.52,1],[1.85,0]]);

      b('hips', 0, (-12 * rush - 42 * fin) * stance, 0, w);
      b('spine', 10 * stance + 6 * fin, 0, 0, w);
      b('chest', 6 * stance, (-10 * rush - 20 * fin) * stance, 0, w);
      b('head', -6 * stance, (10 * rush + 22 * fin) * stance, 0, w);

      // 左右の拳が高速で交互に突出し、最後(fin)に重い右ストレート
      var lArmExt = Math.max(0, lPunch - fin);
      var rArmExt = Math.max(rPunch, fin);
      b('leftUpperArm', -70 + (22 + 48 * lArmExt) * stance, 0, (-22 - 58 * lArmExt) * stance, w);
      b('leftLowerArm', 0, 0, -14 + (-86 * (1 - lArmExt * 0.92)) * stance, w);
      b('rightUpperArm', -70 + (22 + 48 * rArmExt) * stance, 0, (22 + 58 * rArmExt) * stance, w);
      b('rightLowerArm', 0, 0, 15 + (86 * (1 - rArmExt * 0.92)) * stance, w);

      var knee = 24 * stance;
      b('leftUpperLeg', -0.55 * knee, 0, -8 * stance, w);
      b('rightUpperLeg', -0.55 * knee, 0, 8 * stance, w);
      b('leftLowerLeg', knee, 0, 0, w);
      b('rightLowerLeg', knee, 0, 0, w);
      if (hips){
        hips.obj.position.y += -0.055 * stance * w;
        hips.obj.position.z += tv(el, [[0,0],[0.20,0.14],[1.15,0.22],[1.32,0.44],[1.55,0.44],[1.85,0]]) * w;
      }
    }
  },
  {
    // 双掌底（発勁）：両手を腰に引き、踏み込んで両掌を同時に突き出す
    id:'melee_double_palm', label:'双掌底（発勁）', loop:false, duration:1.25,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var coil = tv(el, [[0,0],[0.28,1],[0.42,1],[0.56,0],[1.25,0]]);
      var burst = tv(el, [[0,0],[0.44,0],[0.58,1],[0.92,1],[1.25,0]]);
      var tw = c.isBuriRig ? 0 : -65 * burst;

      b('spine', 10 * coil + 12 * burst, 0, 0, w);
      b('chest', 6 * coil + 8 * burst, 0, 0, w);
      b('head', -6 * coil - 8 * burst, 0, 0, w);

      // 腰で拳/掌を引く(coil) → 前方へ一気に両掌を突き出す(burst)
      b('rightUpperArm', -70 + 18 * coil + 72 * burst, tw, (-26 * coil + 76 * burst), w);
      b('rightLowerArm', 0, 0, 15 + 88 * coil - 10 * burst, w);
      b('leftUpperArm', -70 + 18 * coil + 72 * burst, tw, (26 * coil - 76 * burst), w);
      b('leftLowerArm', 0, 0, -15 - 88 * coil + 10 * burst, w);
      if (!c.isBuriRig && burst > 0.01){
        c.blendRaw('rightHand', 0, 0, 62 * burst, w);
        c.blendRaw('leftHand', 0, 0, 62 * burst, w);
      }

      var knee = 28 * coil + 34 * burst;
      b('leftUpperLeg', -42 * burst - 16 * coil, 0, -8 * (coil + burst), w);
      b('rightUpperLeg', 20 * burst - 16 * coil, 0, 8 * (coil + burst), w);
      b('leftLowerLeg', knee, 0, 0, w);
      b('rightLowerLeg', 28 * coil + 10 * burst, 0, 0, w);
      if (hips){
        hips.obj.position.y += (-0.07 * coil - 0.08 * burst) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.40,-0.04],[0.58,0.40],[0.92,0.40],[1.25,0]]) * w;
      }
    }
  },
  {
    // 踏み込み肘打ち（八極拳・頂心肘風）
    id:'melee_elbow_strike', label:'踏み込み肘打ち', loop:false, duration:1.10,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var yaw = tv(el, [[0,0],[0.22,-34],[0.45,42],[0.76,44],[1.10,0]]);
      b('hips', 0, yaw, 0, w);
      b('spine', tv(el, [[0,0],[0.22,12],[0.45,16],[0.76,14],[1.10,0]]), 0, 0, w);
      b('chest', 8 * tv(el, [[0,0],[0.22,1],[0.76,1],[1.10,0]]), yaw * 0.45, 0, w);
      b('head', -4, -yaw * 0.7, 0, w);

      // 右肘を鋭角に畳み、肩ごと前へ突き刺す
      b('rightUpperArm', tv(el, [[0,-70],[0.22,-10],[0.45,4],[0.76,4],[1.10,-70]]), 0,
        tv(el, [[0,5],[0.22,-38],[0.45,78],[0.76,78],[1.10,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.22,115],[0.45,124],[0.76,124],[1.10,15]]), w);

      // 左手で右前腕を押さえて威力を乗せる
      b('leftUpperArm', tv(el, [[0,-72],[0.22,-30],[0.45,-22],[0.76,-22],[1.10,-72]]), 0,
        tv(el, [[0,-6],[0.22,-34],[0.45,-58],[0.76,-58],[1.10,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-14],[0.22,-65],[0.45,-82],[0.76,-82],[1.10,-14]]), w);

      var knee = tv(el, [[0,2],[0.22,22],[0.45,38],[0.76,34],[1.10,2]]);
      b('leftUpperLeg', -0.58 * knee, 0, -4, w);
      b('rightUpperLeg', -0.42 * knee, 0, 4, w);
      b('leftLowerLeg', knee, 0, 0, w);
      b('rightLowerLeg', knee * 0.7, 0, 0, w);
      if (hips){
        hips.obj.position.y += tv(el, [[0,0],[0.45,-0.08],[0.76,-0.075],[1.10,0]]) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.45,0.46],[0.76,0.48],[1.10,0]]) * w;
      }
    }
  },
  {
    // 回転裏拳（スピニングバックブロー）
    id:'melee_backfist', label:'回転裏拳（バックブロー）', loop:false, duration:1.15,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var prog = Math.min(1, Math.max(0, (el - 0.16) / 0.56));
      var spinDeg = (el > 0.16 && el < 0.72) ? 360 * c.easeInOut(prog) : 0;
      var swing = tv(el, [[0,0],[0.22,1],[0.75,1],[1.15,0]]);

      b('spine', 8 * swing, 0, 0, w);
      b('chest', 4 * swing, 16 * swing, 0, w);
      b('head', -4 * swing, -12 * swing, 0, w);
      b('rightUpperArm', -70 + 74 * swing, 0, tv(el, [[0,5],[0.30,50],[0.56,-20],[0.80,-30],[1.15,5]]), w);
      b('rightLowerArm', 0, 0, 15 - 6 * swing, w);
      b('leftUpperArm', -72 + 24 * swing, 0, -42 * swing, w);
      b('leftLowerArm', 0, 0, -14 - 70 * swing, w);

      var knee = 24 * swing;
      b('leftUpperLeg', -0.55 * knee, 0, -4, w);
      b('rightUpperLeg', -0.55 * knee, 0, 4, w);
      b('leftLowerLeg', knee, 0, 0, w);
      b('rightLowerLeg', knee, 0, 0, w);
      if (hips){
        c.blendRaw('hips', 0, spinDeg, 0, w);
        hips.obj.position.y += -0.045 * swing * w;
        hips.obj.position.z += tv(el, [[0,0],[0.60,0.38],[0.88,0.38],[1.15,0]]) * w;
      }
    }
  },
  {
    // 地面叩き割り（ジャンプして右拳を地面に叩きつける）
    id:'melee_ground_smash', label:'地面叩き割りパンチ', loop:false, duration:1.45,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var lift = tv(el, [[0,0],[0.30,1],[0.52,1],[0.68,0],[1.45,0]]);
      var smash = tv(el, [[0,0],[0.54,0],[0.70,1],[1.08,1],[1.45,0]]);

      b('spine', -10 * lift + 36 * smash, 0, 0, w);
      b('chest', -6 * lift + 20 * smash, -10 * lift + 18 * smash, 0, w);
      b('head', -8 * lift + 10 * smash, 0, 0, w);

      b('rightUpperArm', tv(el, [[0,-70],[0.30,96],[0.52,96],[0.70,-28],[1.08,-28],[1.45,-70]]), 0,
        tv(el, [[0,5],[0.30,-16],[0.70,68],[1.08,68],[1.45,5]]), w);
      b('rightLowerArm', 0, 0, tv(el, [[0,15],[0.30,36],[0.70,8],[1.45,15]]), w);
      b('leftUpperArm', tv(el, [[0,-72],[0.30,18],[0.70,-48],[1.08,-48],[1.45,-72]]), 0,
        tv(el, [[0,-6],[0.30,-30],[0.70,32],[1.45,-6]]), w);
      b('leftLowerArm', 0, 0, tv(el, [[0,-14],[0.30,-42],[0.70,-16],[1.45,-14]]), w);

      b('leftUpperLeg', tv(el, [[0,0],[0.30,-34],[0.70,-72],[1.08,-70],[1.45,0]]), 0, -6, w);
      b('leftLowerLeg', tv(el, [[0,2],[0.30,52],[0.70,96],[1.08,92],[1.45,2]]), 0, 0, w);
      b('rightUpperLeg', tv(el, [[0,0],[0.30,14],[0.70,-16],[1.08,-16],[1.45,0]]), 0, 6, w);
      b('rightLowerLeg', tv(el, [[0,2],[0.30,22],[0.70,88],[1.08,84],[1.45,2]]), 0, 0, w);

      if (hips){
        var shake = (el > 0.70 && el < 0.90) ? 0.007 * Math.sin((el - 0.70) * 85) : 0;
        var arc = tv(el, [[0,0],[0.32,0.28],[0.54,0.18],[0.70,-0.32],[1.08,-0.31],[1.45,0]]);
        hips.obj.position.y += (arc + shake) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.70,0.44],[1.08,0.44],[1.45,0]]) * w;
      }
    }
  }
]);

/* ================= グループB：キック・足技（8種） ================= */
V.registerMotions({ id:'melee_kick', label:'キック・足技', open:true, tab:'melee' }, [
  {
    // 前蹴り（ヤクザキック）
    id:'melee_front_kick', label:'前蹴り（ヤクザキック）', loop:false, duration:1.00,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var ch = tv(el, [[0,0],[0.20,1],[0.32,0.5],[0.68,0.4],[1.00,0]]);
      var kick = tv(el, [[0,0],[0.24,0],[0.38,1],[0.62,1],[1.00,0]]);

      b('hips', 0, 14 * (ch + kick * 0.5), 0, w);
      b('spine', -18 * kick, 0, 0, w);
      b('chest', -10 * kick, 0, 0, w);
      b('head', 14 * kick, 0, 0, w);
      b('leftUpperArm', -70 + 36 * (ch + kick * 0.6), 0, -40 * (ch + kick * 0.6), w);
      b('leftLowerArm', 0, 0, -14 - 75 * (ch + kick * 0.6), w);
      b('rightUpperArm', -70 + 26 * (ch + kick * 0.6), 0, -18 * kick, w);
      b('rightLowerArm', 0, 0, 15 + 65 * (ch + kick * 0.6), w);

      // 右脚を胸前まで引き上げてから真っ直ぐ前へ蹴り出す
      b('rightUpperLeg', -76 * ch - 84 * kick, 0, 4 * kick, w);
      b('rightLowerLeg', 2 + 96 * ch + 4 * kick, 0, 0, w);
      b('rightFoot', 16 * ch - 14 * kick, 0, 0, w);
      b('leftLowerLeg', 2 + 10 * (ch + kick), 0, 0, w);
      if (hips){
        hips.obj.position.y += -0.02 * (ch + kick) * w;
        hips.obj.position.z += 0.14 * kick * w;
      }
    }
  },
  {
    // 上段回し蹴り（ハイキック）
    id:'melee_roundhouse', label:'上段回し蹴り（ハイキック）', loop:false, duration:1.15,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var piv = tv(el, [[0,0],[0.22,0.6],[0.44,1],[0.74,1],[1.15,0]]);
      var whip = tv(el, [[0,0],[0.26,0],[0.45,1],[0.72,1],[1.15,0]]);

      b('spine', -8 * piv, 0, 12 * piv, w);
      b('chest', -4 * piv, -16 * piv, 0, w);
      b('head', 4 * piv, -42 * piv, -16 * piv, w);
      b('leftUpperArm', -70 + 34 * piv, 0, -42 * piv, w);
      b('leftLowerArm', 0, 0, -14 - 76 * piv, w);
      b('rightUpperArm', -70 + 28 * piv, 0, 20 * piv, w);
      b('rightLowerArm', 0, 0, 15 + 64 * piv, w);

      // 軸足（左）を踏みしめつつ腰を傾け、右脚を高く横から振り抜く
      b('rightUpperLeg', -52 * piv - 14 * whip, 0, 38 * piv + 14 * whip, w);
      b('rightLowerLeg', 2 + 92 * (piv - whip * 0.92), 0, 0, w);
      b('rightFoot', 22 * whip, 0, 0, w);
      b('leftLowerLeg', 2 + 12 * piv, 0, 0, w);
      if (hips){
        c.blendRaw('hips', 0, 74 * piv, 26 * piv, w);
        hips.obj.position.y += -0.04 * piv * w;
        hips.obj.position.z += 0.16 * piv * w;
      }
    }
  },
  {
    // 横蹴り（サイドキック）
    id:'melee_side_kick', label:'横蹴り（サイドキック）', loop:false, duration:1.15,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var turn = tv(el, [[0,0],[0.24,1],[0.78,1],[1.15,0]]);
      var ch = tv(el, [[0,0],[0.24,1],[0.40,0],[1.15,0]]);
      var ext = tv(el, [[0,0],[0.30,0],[0.46,1],[0.76,1],[1.15,0]]);

      b('spine', -6 * turn, 0, 14 * ext, w);
      b('head', 4 * ext, -54 * turn, -18 * ext, w);
      b('leftUpperArm', -70 + 40 * turn, 0, -38 * turn, w);
      b('leftLowerArm', 0, 0, -14 - 78 * turn, w);
      b('rightUpperArm', -70 + 30 * turn, 0, -12 * ext, w);
      b('rightLowerArm', 0, 0, 15 + 70 * turn, w);

      b('rightUpperLeg', -62 * ch - 26 * ext, 0, 24 * ch + 62 * ext, w);
      b('rightLowerLeg', 2 + 98 * ch + 4 * ext, 0, 0, w);
      b('rightFoot', -12 * ext, 0, 0, w);
      b('leftLowerLeg', 2 + 14 * turn, 0, 0, w);
      if (hips){
        c.blendRaw('hips', 0, 82 * turn, 24 * ext, w);
        hips.obj.position.y += -0.05 * turn * w;
        hips.obj.position.z += 0.18 * ext * w;
      }
    }
  },
  {
    // 後ろ回し蹴り（360°回転踵蹴り）
    id:'melee_spin_hook_kick', label:'後ろ回し蹴り', loop:false, duration:1.25,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var prog = Math.min(1, Math.max(0, (el - 0.16) / 0.68));
      var spinDeg = (el > 0.16 && el < 0.84) ? -360 * c.easeInOut(prog) : 0;
      var k = tv(el, [[0,0],[0.22,1],[0.76,1],[1.25,0]]);

      b('spine', -12 * k, 0, 10 * k, w);
      b('head', 6 * k, 0, -8 * k, w);
      b('leftUpperArm', -70 + 30 * k, 0, -40 * k, w);
      b('leftLowerArm', 0, 0, -14 - 65 * k, w);
      b('rightUpperArm', -70 + 24 * k, 0, 26 * k, w);
      b('rightLowerArm', 0, 0, 15 + 55 * k, w);

      b('rightUpperLeg', -42 * k, 0, 48 * k, w);
      b('rightLowerLeg', 6, 0, 0, w);
      b('rightFoot', 16 * k, 0, 0, w);
      b('leftLowerLeg', 2 + 12 * k, 0, 0, w);
      if (hips){
        c.blendRaw('hips', 0, spinDeg, 18 * k, w);
        hips.obj.position.y += -0.03 * k * w;
        hips.obj.position.z += tv(el, [[0,0],[0.55,0.28],[0.88,0.28],[1.25,0]]) * w;
      }
    }
  },
  {
    // 踵落とし（足を天まで振り上げて真下に叩き落とす）
    id:'melee_axe_kick', label:'踵落とし', loop:false, duration:1.25,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var high = tv(el, [[0,0],[0.42,1],[0.54,1],[0.70,0],[1.25,0]]);
      var slam = tv(el, [[0,0],[0.55,0],[0.72,1],[0.96,1],[1.25,0]]);

      b('spine', -16 * high + 14 * slam, 0, 0, w);
      b('chest', -8 * high + 8 * slam, 0, 0, w);
      b('head', 10 * high, 0, 0, w);
      b('leftUpperArm', -70 + 30 * (high + slam), 0, -34 * (high + slam), w);
      b('leftLowerArm', 0, 0, -14 - 60 * (high + slam), w);
      b('rightUpperArm', -70 + 26 * (high + slam), 0, 20 * high - 24 * slam, w);
      b('rightLowerArm', 0, 0, 15 + 55 * (high + slam), w);

      // 脚を高く振り上げ（-112°）→ ドスンと振り下ろす
      b('rightUpperLeg', -112 * high - 28 * slam, 0, 6 * high, w);
      b('rightLowerLeg', 2 + 8 * high + 32 * slam, 0, 0, w);
      b('rightFoot', -12 * (high + slam), 0, 0, w);
      b('leftLowerLeg', 2 + 10 * high + 20 * slam, 0, 0, w);
      if (hips){
        hips.obj.position.y += (-0.03 * high - 0.06 * slam) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.72,0.32],[0.96,0.32],[1.25,0]]) * w;
      }
    }
  },
  {
    // 飛び膝蹴り
    id:'melee_knee_strike', label:'飛び膝蹴り', loop:false, duration:1.15,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var leap = tv(el, [[0,0],[0.18,0.4],[0.45,1],[0.72,0.8],[1.15,0]]);
      var hop = (el > 0.16 && el < 0.80) ? 0.42 * Math.sin((el - 0.16) / 0.64 * Math.PI) : 0;

      b('spine', -6 * leap, 0, 0, w);
      b('head', 6 * leap, 0, 0, w);
      // 両手で相手の襟元を掴んで引き下ろす動き
      b('rightUpperArm', -70 + 102 * leap, 0, 44 * leap, w);
      b('rightLowerArm', 0, 0, 15 + 58 * leap, w);
      b('leftUpperArm', -72 + 102 * leap, 0, -44 * leap, w);
      b('leftLowerArm', 0, 0, -14 - 58 * leap, w);

      b('rightUpperLeg', -96 * leap, 0, 4 * leap, w);
      b('rightLowerLeg', 2 + 106 * leap, 0, 0, w);
      b('rightFoot', 24 * leap, 0, 0, w);
      b('leftUpperLeg', 18 * leap, 0, 0, w);
      b('leftLowerLeg', 2 + 34 * leap, 0, 0, w);
      if (hips){
        hips.obj.position.y += (hop + tv(el, [[0,0],[0.16,-0.07],[0.45,0],[0.85,-0.05],[1.15,0]])) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.55,0.48],[0.85,0.48],[1.15,0]]) * w;
      }
    }
  },
  {
    // 足払い（低くしゃがみながら360°回転スウィープ）
    id:'melee_low_sweep', label:'足払い（回転スウィープ）', loop:false, duration:1.25,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var prog = Math.min(1, Math.max(0, (el - 0.22) / 0.64));
      var spinDeg = (el > 0.22 && el < 0.86) ? 360 * c.easeInOut(prog) : 0;
      var low = tv(el, [[0,0],[0.24,1],[0.88,1],[1.25,0]]);

      b('spine', 28 * low, 0, 0, w);
      b('chest', 14 * low, 0, 0, w);
      b('head', -12 * low, 0, 0, w);
      b('leftUpperArm', -70 + 30 * low, 0, -28 * low, w);
      b('leftLowerArm', 0, 0, -14 - 16 * low, w);
      b('rightUpperArm', -70 + 18 * low, 0, 24 * low, w);
      b('rightLowerArm', 0, 0, 15 + 30 * low, w);

      // 左脚で深くしゃがみ、右脚を真っ直ぐ横に伸ばして薙ぎ払う
      b('leftUpperLeg', -82 * low, 0, -4 * low, w);
      b('leftLowerLeg', 102 * low, 0, 0, w);
      b('rightUpperLeg', -46 * low, 0, 44 * low, w);
      b('rightLowerLeg', 4, 0, 0, w);
      if (hips){
        c.blendRaw('hips', 0, spinDeg, 0, w);
        hips.obj.position.y += -0.40 * low * w;
        hips.obj.position.z += tv(el, [[0,0],[0.50,0.22],[0.88,0.22],[1.25,0]]) * w;
      }
    }
  },
  {
    // 飛び蹴り（ライダーキック）：大ジャンプから斜め下へ一閃蹴り
    id:'melee_rider_kick', label:'飛び蹴り（ライダーキック）', loop:false, duration:1.45,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var airKick = tv(el, [[0,0],[0.24,0.2],[0.45,1],[0.92,1],[1.15,0.2],[1.45,0]]);
      var pitch = -40 * airKick;

      b('spine', 12 * airKick, 0, 0, w);
      b('head', 26 * airKick, 0, 0, w);
      b('rightUpperArm', -70 + 24 * airKick, 0, -34 * airKick, w);
      b('rightLowerArm', 0, 0, 15 + 48 * airKick, w);
      b('leftUpperArm', -72 + 40 * airKick, 0, -38 * airKick, w);
      b('leftLowerArm', 0, 0, -14 - 55 * airKick, w);

      // 右足を真っ直ぐ前方へ突き出し、左膝を深く抱える
      b('rightUpperLeg', -72 * airKick, 0, 4 * airKick, w);
      b('rightLowerLeg', 4, 0, 0, w);
      b('rightFoot', 18 * airKick, 0, 0, w);
      b('leftUpperLeg', -86 * airKick, 0, -6 * airKick, w);
      b('leftLowerLeg', 2 + 104 * airKick, 0, 0, w);

      if (hips){
        c.blendRaw('hips', pitch, c.poseExtraCur.hipsY, 0, w);
        var yArc = tv(el, [[0,0],[0.22,0.56],[0.48,0.52],[0.96,0.02],[1.10,-0.08],[1.45,0]]);
        hips.obj.position.y += yArc * w;
        hips.obj.position.z += tv(el, [[0,0],[0.22,0.10],[0.96,0.88],[1.20,0.88],[1.45,0]]) * w;
      }
    }
  }
]);

/* ================= グループC：カンフー・東方不敗・サイヤ人・突進（7種） ================= */
V.registerMotions({ id:'melee_special', label:'カンフー・東方不敗・サイヤ人・突進', open:true, tab:'melee' }, [
  {
    // ショルダータックル（体当たり）：肩を入れて重戦車のように +0.8m 突進
    id:'melee_tackle', label:'ショルダータックル（体当たり）', loop:false, duration:1.15,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var hit = c.gauss(el, 0.50, 0.08);
      var k = tv(el, [[0,0],[0.18,0.4],[0.36,1],[0.76,1],[1.15,0]]);

      b('hips', 0, 42 * k, 0, w);
      b('spine', 22 * k - 6 * hit, 0, -8 * k, w);
      b('chest', 14 * k - 4 * hit, 12 * k, 0, w);
      b('neck', -10 * k, -18 * k, 0, w);
      b('head', -12 * k, -36 * k, 6 * k, w);

      // 右肩を前に突き出し、両腕は胸の前でガッチリ畳んでガード
      b('rightUpperArm', -70 + 30 * k, 0, 48 * k, w);
      b('rightLowerArm', 0, 0, 15 + 95 * k, w);
      b('leftUpperArm', -72 + 24 * k, 0, -34 * k, w);
      b('leftLowerArm', 0, 0, -14 - 84 * k, w);

      b('leftUpperLeg', -46 * k, 0, -6 * k, w);
      b('leftLowerLeg', 2 + 56 * k, 0, 0, w);
      b('rightUpperLeg', 26 * k, 0, 6 * k, w);
      b('rightLowerLeg', 2 + 12 * k, 0, 0, w);
      if (hips){
        hips.obj.position.y += -0.10 * k * w;
        hips.obj.position.z += (tv(el, [[0,0],[0.18,-0.06],[0.48,0.78],[0.80,0.76],[1.15,0]]) - 0.04 * hit) * w;
      }
    }
  },
  {
    // ミサイルドロップキック：跳び上がって空中で水平仰向けになり両足で蹴り飛ばす
    id:'melee_dropkick', label:'ドロップキック', loop:false, duration:1.50,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var fly = tv(el, [[0,0],[0.24,0.6],[0.42,1],[0.82,1],[1.15,0.6],[1.50,0]]);
      var pitch = tv(el, [[0,0],[0.22,-32],[0.45,-74],[0.78,-84],[1.15,-86],[1.36,-25],[1.50,0]]);

      b('spine', 16 * fly, 0, 0, w);
      b('head', 32 * fly, 0, 0, w);
      b('rightUpperArm', -70 + 62 * fly, 0, 5 + 36 * fly, w);
      b('rightLowerArm', 0, 0, 15 + 16 * fly, w);
      b('leftUpperArm', -72 + 62 * fly, 0, -6 - 36 * fly, w);
      b('leftLowerArm', 0, 0, -14 - 16 * fly, w);

      // 両脚を揃えて前方へ一気に蹴り出す
      var kick = tv(el, [[0,0],[0.22,0.5],[0.45,1],[0.85,1],[1.15,0.3],[1.50,0]]);
      b('leftUpperLeg', -74 * kick, 0, -5 * kick, w);
      b('rightUpperLeg', -74 * kick, 0, 5 * kick, w);
      b('leftLowerLeg', 2 + 68 * tv(el, [[0,0],[0.22,1],[0.45,0],[1.50,0]]), 0, 0, w);
      b('rightLowerLeg', 2 + 68 * tv(el, [[0,0],[0.22,1],[0.45,0],[1.50,0]]), 0, 0, w);
      b('leftFoot', -10 * kick, 0, 0, w);
      b('rightFoot', -10 * kick, 0, 0, w);

      if (hips){
        c.blendRaw('hips', pitch, c.poseExtraCur.hipsY, 0, w);
        var yPos = tv(el, [[0,0],[0.25,0.54],[0.55,0.48],[0.92,-0.46],[1.16,-0.48],[1.50,0]]);
        hips.obj.position.y += yPos * w;
        hips.obj.position.z += tv(el, [[0,0],[0.22,0.18],[0.82,0.82],[1.18,0.82],[1.50,0]]) * w;
      }
    }
  },
  {
    // 東方不敗・石破天驚連撃（馬歩→双掌連打→旋風脚→双掌フィニッシュ決め！）
    id:'melee_toho_combo', label:'東方不敗・流派連撃', loop:false, duration:2.15,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var spinProg = Math.min(1, Math.max(0, (el - 0.85) / 0.42));
      var spinYaw = (el > 0.85 && el < 1.27) ? 360 * c.easeInOut(spinProg) : 0;
      var rush = (el > 0.25 && el < 0.80) ? Math.sin((el - 0.25) * 32) : 0;
      var fin = tv(el, [[0,0],[1.25,0],[1.42,1],[1.85,1],[2.15,0]]);
      var base = tv(el, [[0,0],[0.18,1],[1.85,1],[2.15,0]]);
      var tw = c.isBuriRig ? 0 : -62 * fin;

      b('spine', 10 * base + 8 * fin, 0, 0, w);
      b('chest', 6 * base, (-16 * rush) * base, 0, w);
      b('head', -6 * base, (14 * rush) * base, 0, w);

      var lOut = Math.max(fin, Math.max(0, rush));
      var rOut = Math.max(fin, Math.max(0, -rush));
      b('leftUpperArm', -70 + (22 + 54 * lOut) * base, tw, (-20 - 58 * lOut) * base, w);
      b('leftLowerArm', 0, 0, -14 + (-86 * (1 - lOut * 0.90)) * base, w);
      b('rightUpperArm', -70 + (22 + 54 * rOut) * base, tw, (20 + 58 * rOut) * base, w);
      b('rightLowerArm', 0, 0, 15 + (86 * (1 - rOut * 0.90)) * base, w);
      if (!c.isBuriRig && fin > 0.01){
        c.blendRaw('rightHand', 0, 0, 62 * fin, w);
        c.blendRaw('leftHand', 0, 0, 62 * fin, w);
      }

      // 馬歩のワイドスタンス→フィニッシュの深い踏み込み
      var knee = 36 * base + 12 * fin;
      b('leftUpperLeg', (-0.45 * knee - 20 * fin) * base, 0, -16 * base, w);
      b('rightUpperLeg', (-0.45 * knee + 24 * fin) * base, 0, 16 * base, w);
      b('leftLowerLeg', knee, 0, 0, w);
      b('rightLowerLeg', knee * (1 - 0.5 * fin), 0, 0, w);
      if (hips){
        c.blendRaw('hips', 0, spinYaw, 0, w);
        hips.obj.position.y += (-0.11 * base + (el > 0.85 && el < 1.25 ? 0.14 : 0)) * w;
        hips.obj.position.z += tv(el, [[0,0],[0.85,0.22],[1.42,0.56],[1.85,0.56],[2.15,0]]) * w;
      }
    }
  },
  {
    // カンフー演武（鶴の構え→蛇拳突き→馬歩双掌）
    id:'melee_kungfu_kata', label:'カンフー演武（型）', loop:false, duration:2.20,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      // Phase1(0.25-0.80): 右足を上げた鶴の構え（両翼広げ）
      // Phase2(0.80-1.45): 低い馬歩に踏み込んで左掌前・右拳腰
      // Phase3(1.45-1.90): 右貫手／掌底を鋭く前へ
      var crane = tv(el, [[0,0],[0.30,1],[0.75,1],[0.95,0],[2.20,0]]);
      var horse = tv(el, [[0,0],[0.78,0],[1.00,1],[1.85,1],[2.20,0]]);
      var thrust = tv(el, [[0,0],[1.32,0],[1.50,1],[1.85,1],[2.20,0]]);

      b('hips', 0, -28 * crane + 26 * horse - 40 * thrust, 0, w);
      b('spine', -6 * crane + 10 * horse + 6 * thrust, 0, 0, w);
      b('head', 4 * crane - 4 * horse, 24 * crane - 22 * horse + 32 * thrust, 0, w);

      // 鶴の両翼広げ → 馬歩 → 右掌底突き
      b('rightUpperArm', -70 + 78 * crane + 16 * horse + 54 * thrust, 0,
        -12 * crane - 28 * horse + 96 * thrust, w);
      b('rightLowerArm', 0, 0, 15 + 18 * crane + 86 * horse - 90 * thrust, w);
      b('leftUpperArm', -72 + 76 * crane + 70 * horse, 0,
        10 * crane - 72 * horse + 94 * thrust, w);
      b('leftLowerArm', 0, 0, -14 - 20 * crane - 10 * horse - 80 * thrust, w);

      b('rightUpperLeg', -82 * crane - 18 * horse, 0, 10 * crane + 18 * horse, w);
      b('rightLowerLeg', 2 + 104 * crane + 46 * horse, 0, 0, w);
      b('leftUpperLeg', -6 * crane - 22 * horse, 0, -18 * horse, w);
      b('leftLowerLeg', 2 + 12 * crane + 52 * horse, 0, 0, w);
      if (hips){
        hips.obj.position.y += (-0.01 * crane - 0.14 * horse) * w;
        hips.obj.position.z += (0.28 * horse + 0.18 * thrust) * w;
      }
    }
  },
  {
    // サイヤ人・メテオラッシュ（高速空中連打→相手の上から両手ハンマースマッシュ）
    id:'melee_saiyan_rush', label:'サイヤ人・メテオラッシュ', loop:false, duration:2.35,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var rush = (el > 0.25 && el < 1.25) ? Math.sin((el - 0.25) * 42) : 0;
      var air = tv(el, [[0,0],[0.22,1],[1.65,1],[1.85,0],[2.35,0]]);
      var lift = tv(el, [[0,0],[1.26,0],[1.48,1],[1.62,1],[1.78,0],[2.35,0]]);
      var slam = tv(el, [[0,0],[1.62,0],[1.80,1],[2.08,1],[2.35,0]]);

      b('spine', 12 * air - 14 * lift + 30 * slam, 0, 0, w);
      b('chest', 6 * air, (-14 * rush) * air, 0, w);
      b('head', -10 * air - 8 * lift + 12 * slam, (12 * rush) * air, 0, w);

      var lAct = (el > 0.25 && el < 1.25) ? Math.max(0, rush) : 0;
      var rAct = (el > 0.25 && el < 1.25) ? Math.max(0, -rush) : 0;
      b('rightUpperArm', -70 + (26 + 44 * rAct) * air + 150 * lift - 20 * slam, 0,
        (24 + 54 * rAct) * air - 20 * lift + 64 * slam, w);
      b('rightLowerArm', 0, 0, 15 + 78 * (1 - rAct * 0.85) * air + 30 * lift - 20 * slam, w);
      b('leftUpperArm', -72 + (26 + 44 * lAct) * air + 150 * lift - 20 * slam, 0,
        (-24 - 54 * lAct) * air + 20 * lift - 64 * slam, w);
      b('leftLowerArm', 0, 0, -14 - 78 * (1 - lAct * 0.85) * air - 30 * lift + 20 * slam, w);

      var kickR = (el > 0.65 && el < 1.20) ? Math.max(0, Math.sin((el - 0.65) * 18)) : 0;
      b('rightUpperLeg', -24 * air - 48 * kickR - 40 * slam, 0, 6, w);
      b('rightLowerLeg', 2 + 44 * air * (1 - kickR * 0.8) + 64 * slam, 0, 0, w);
      b('leftUpperLeg', -14 * air - 48 * slam, 0, -6, w);
      b('leftLowerLeg', 2 + 28 * air + 68 * slam, 0, 0, w);
      if (hips){
        var yArc = tv(el, [[0,0],[0.25,0.28],[1.25,0.34],[1.50,0.62],[1.80,-0.16],[2.08,-0.14],[2.35,0]]);
        hips.obj.position.y += yArc * w;
        hips.obj.position.z += tv(el, [[0,0],[0.25,0.28],[1.25,0.44],[1.80,0.72],[2.08,0.72],[2.35,0]]) * w;
      }
    }
  },
  {
    // サイヤ人・気爆発（超覚醒）：低く気合を溜めて震え→オーラ爆発（浮遊＆絶叫）
    id:'melee_saiyan_aura', label:'サイヤ人・気爆発（超覚醒）', loop:false, duration:2.40,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var ch = tv(el, [[0,0],[0.38,1],[0.98,1],[1.10,0],[2.40,0]]);
      var burst = tv(el, [[0,0],[0.98,0],[1.12,1],[1.95,1],[2.40,0]]);
      var vib = Math.sin(el * 68) * (1.2 * ch + 0.9 * burst);

      b('spine', 16 * ch - 16 * burst + vib * 0.5, 0, 0, w);
      b('chest', 10 * ch - 10 * burst, 0, 0, w);
      b('neck', 8 * ch - 8 * burst, 0, 0, w);
      b('head', 14 * ch - 22 * burst + vib * 0.8, 0, 0, w);

      // 溜め：肘を曲げて腰横で拳を握り震える → 爆発：両腕を斜め下〜外へ大きく張り出す
      b('rightUpperArm', -70 + 18 * ch + 42 * burst + vib, 0, -24 * ch - 22 * burst, w);
      b('rightLowerArm', 0, 0, 15 + 88 * ch + 28 * burst, w);
      b('leftUpperArm', -72 + 18 * ch + 42 * burst - vib, 0, 24 * ch + 22 * burst, w);
      b('leftLowerArm', 0, 0, -14 - 88 * ch - 28 * burst, w);

      var knee = 36 * ch + 14 * burst;
      b('leftUpperLeg', -0.55 * knee, 0, -14 * (ch + burst), w);
      b('rightUpperLeg', -0.55 * knee, 0, 14 * (ch + burst), w);
      b('leftLowerLeg', knee, 0, 0, w);
      b('rightLowerLeg', knee, 0, 0, w);
      b('leftFoot', -0.35 * knee + 16 * burst, 0, 0, w);
      b('rightFoot', -0.35 * knee + 16 * burst, 0, 0, w);
      if (hips){
        hips.obj.position.y += (-0.09 * ch + 0.08 * burst) * w;
      }
    }
  },
  {
    // 気功波（かめはめ波スタイル）：右腰で両手を重ねて気溜め→前方へ両掌放出！
    id:'melee_kamehame', label:'気功波（エネルギー波）', loop:false, duration:2.30,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var ch = tv(el, [[0,0],[0.30,1],[1.15,1],[1.32,0],[2.30,0]]);
      var fire = tv(el, [[0,0],[1.16,0],[1.34,1],[1.96,1],[2.30,0]]);
      var vib = (el > 0.35 && el < 1.15) ? Math.sin(el * 60) * 1.4 : (el > 1.34 && el < 1.95 ? Math.sin(el * 56) * 1.0 : 0);
      var tw = c.isBuriRig ? 0 : -65 * fire;

      b('hips', 0, -52 * ch + 6 * fire, 0, w);
      b('spine', 12 * ch + 14 * fire, 0, 0, w);
      b('chest', 8 * ch + 8 * fire, -14 * ch, 0, w);
      b('neck', 0, 26 * ch, 0, w);
      b('head', -4 * ch - 6 * fire, 42 * ch, 0, w);

      // 溜め：両手を右腰横で向かい合わせる → 発射：正面へ両腕を同時に突き出す
      b('rightUpperArm', -70 + 18 * ch + 70 * fire + vib * 0.4, tw, -24 * ch + 76 * fire, w);
      b('rightLowerArm', 0, 0, 15 + 78 * ch - 8 * fire, w);
      b('leftUpperArm', -72 + 24 * ch + 72 * fire - vib * 0.4, tw, -58 * ch - 76 * fire, w);
      b('leftLowerArm', 0, 0, -14 - 72 * ch + 8 * fire, w);
      if (!c.isBuriRig && fire > 0.01){
        c.blendRaw('rightHand', 0, 0, 62 * fire, w);
        c.blendRaw('leftHand', 0, 0, 62 * fire, w);
      }

      var knee = 32 * ch + 36 * fire;
      b('leftUpperLeg', -0.55 * knee - 18 * fire, 0, -10 * (ch + fire), w);
      b('rightUpperLeg', -0.55 * knee + 18 * fire, 0, 10 * (ch + fire), w);
      b('leftLowerLeg', knee, 0, 0, w);
      b('rightLowerLeg', knee * (1 - 0.5 * fire), 0, 0, w);
      if (hips){
        hips.obj.position.y += (-0.075 * ch - 0.085 * fire) * w;
        hips.obj.position.z += (0.34 * fire) * w;
      }
    }
  }
]);

})(window.VRMViewer);