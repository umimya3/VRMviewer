(function(V){
"use strict";

V.registerMotions({ id:'emotes', label:'エモート（日常・感情・アイドル）', open:true }, [
  {
    // 両手を顔の両脇に掲げて元気よくバイバイ
    id:'emote_wave_both', label:'両手バイバイ', loop:false, duration:3.00,
    fn:function(el, w, c){
      var b = c.blend, s01 = c.smooth01, hips = c.bones.hips;
      var e = s01(el / 0.40) * (1 - s01((el - 2.50) / 0.50));
      var wob = Math.sin((el - 0.40) * Math.PI * 2 * 2.2);
      var tw = c.isBuriRig ? 0 : -76 * e;

      b('rightUpperArm', -70 + (104 + 5 * wob) * e, tw, 18 * e, w);
      b('rightLowerArm', 0, 0, 10 + (66 + 8 * wob) * e, w);
      b('leftUpperArm', -70 + (104 - 5 * wob) * e, tw, -18 * e, w);
      b('leftLowerArm', 0, 0, -10 - (66 - 8 * wob) * e, w);
      if (!c.isBuriRig){
        c.blendRaw('rightHand', 0, (22 * wob) * e, -6 * e, w);
        c.blendRaw('leftHand', 0, (22 * wob) * e, -6 * e, w);
      }

      b('head', -3 * e, 0, 5 * Math.sin(el * 3.5) * e, w);
      b('spine', -3 * e, 0, 0, w);
      var bounce = Math.abs(Math.sin(el * Math.PI * 2.2)) * e;
      b('leftLowerLeg', 2 + 10 * bounce, 0, 0, w);
      b('rightLowerLeg', 2 + 10 * bounce, 0, 0, w);
      if (hips) hips.obj.position.y += 0.014 * bounce * w;
    }
  },
  {
    // 相槌・うんうんと2回頷く
    id:'emote_nod', label:'うんうん頷く', loop:false, duration:1.60,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal;
      var hold = tv(el, [[0,0],[0.25,1],[1.30,1],[1.60,0]]);
      var nod = tv(el, [[0,0],[0.30,0],[0.48,18],[0.68,0],[0.88,20],[1.10,0],[1.60,0]]);
      b('head', nod, 0, 4 * hold, w);
      b('neck', nod * 0.45, 0, 0, w);
      b('spine', 4 * hold + nod * 0.15, 0, 0, w);
      b('leftUpperArm', -70 + 12 * hold, 0, -14 * hold, w);
      b('rightUpperArm', -70 + 12 * hold, 0, 14 * hold, w);
      b('leftLowerArm', 0, 0, -10 - 24 * hold, w);
      b('rightLowerArm', 0, 0, 10 + 24 * hold, w);
    }
  },
  {
    // 首を横に振りつつ「ううん、違うよ」と手を少し振る
    id:'emote_shake_head', label:'イヤイヤ首振り', loop:false, duration:1.80,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal;
      var hold = tv(el, [[0,0],[0.25,1],[1.45,1],[1.80,0]]);
      var shake = Math.sin((el - 0.25) * 14) * 22 * hold;
      var tw = c.isBuriRig ? 0 : -65 * hold;
      b('head', 4 * hold, shake, 0, w);
      b('neck', 2 * hold, shake * 0.4, 0, w);
      b('spine', -3 * hold, 0, 0, w);
      b('rightUpperArm', -70 + 48 * hold, tw, 24 * hold, w);
      b('rightLowerArm', 0, 0, 15 + 68 * hold, w);
      b('leftUpperArm', -70 + 18 * hold, 0, -10 * hold, w);
      b('leftLowerArm', 0, 0, -14 - 20 * hold, w);
      if (!c.isBuriRig) c.blendRaw('rightHand', 0, shake * 0.8, 0, w);
    }
  },
  {
    // 丁寧なお辞儀（両手を前に揃えて42°礼）
    id:'emote_bow_deep', label:'丁寧なお辞儀', loop:false, duration:2.40,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal;
      var k = tv(el, [[0,0],[0.65,1],[1.55,1],[2.40,0]]);
      b('spine', 26 * k, 0, 0, w);
      b('chest', 14 * k, 0, 0, w);
      b('neck', 6 * k, 0, 0, w);
      b('head', 10 * k, 0, 0, w);
      b('leftUpperArm', -70 + 12 * k, 0, -16 * k, w);
      b('rightUpperArm', -70 + 12 * k, 0, 16 * k, w);
      b('leftLowerArm', 0, 0, -10 - 24 * k, w);
      b('rightLowerArm', 0, 0, 10 + 24 * k, w);
    }
  },
  {
    // 応援・ガッツポーズ振り上げ（フレーフレー！）
    id:'emote_cheer', label:'応援・ガッツ！', loop:false, duration:2.40,
    fn:function(el, w, c){
      var b = c.blend, s01 = c.smooth01, hips = c.bones.hips;
      var e = s01(el / 0.32) * (1 - s01((el - 2.00) / 0.40));
      var beat = Math.sin((el - 0.30) * Math.PI * 4.5);
      var tw = c.isBuriRig ? 0 : -65 * e;

      b('rightUpperArm', -70 + (110 + 18 * beat) * e, tw, (18 + 6 * beat) * e, w);
      b('rightLowerArm', 0, 0, 12 + (58 - 16 * beat) * e, w);
      b('leftUpperArm', -70 + (110 - 18 * beat) * e, tw, (-18 + 6 * beat) * e, w);
      b('leftLowerArm', 0, 0, -12 - (58 + 16 * beat) * e, w);

      b('spine', -4 * e, 4 * beat * e, 0, w);
      b('head', -6 * e, 0, 5 * beat * e, w);
      var hop = Math.abs(beat) * e;
      b('leftLowerLeg', 2 + 16 * hop, 0, 0, w);
      b('rightLowerLeg', 2 + 16 * hop, 0, 0, w);
      if (hips) hips.obj.position.y += 0.04 * hop * w;
    }
  },
  {
    // 照れ・もじもじ（内股・肩すくめ・胸前で指もじもじ）
    id:'emote_shy', label:'照れ・もじもじ', loop:false, duration:2.80,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal;
      var k = tv(el, [[0,0],[0.45,1],[2.30,1],[2.80,0]]);
      var sway = Math.sin(el * 3.5) * k;
      b('hips', 0, 6 * sway, 3 * sway, w);
      b('spine', 6 * k, 0, -3 * sway, w);
      b('head', 10 * k, -10 * k + 4 * sway, 12 * k, w);
      b('leftUpperArm', -70 + 26 * k, 0, -34 * k, w);
      b('rightUpperArm', -70 + 26 * k, 0, 34 * k, w);
      b('leftLowerArm', 0, 0, -14 - 72 * k, w);
      b('rightLowerArm', 0, 0, 14 + 72 * k, w);
      // 少し内股＆膝を寄せる
      b('leftUpperLeg', -8 * k, -10 * k, 4 * k, w);
      b('rightUpperLeg', -8 * k, 10 * k, -4 * k, w);
      b('leftLowerLeg', 14 * k, 0, 0, w);
      b('rightLowerLeg', 14 * k, 0, 0, w);
    }
  },
  {
    // プンプン地団駄（腰に両手を当てて左右に足を踏み鳴らす）
    id:'emote_angry_stomp', label:'プンプン地団駄', loop:false, duration:2.20,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var k = tv(el, [[0,0],[0.30,1],[1.85,1],[2.20,0]]);
      var st = (el > 0.35 && el < 1.80) ? Math.sin((el - 0.35) * 18) : 0;
      b('spine', 6 * k, 0, 3 * st * k, w);
      b('head', 10 * k, -8 * st * k, 4 * st * k, w);
      // 両手を腰に当てる（肘を横に張る）
      b('rightUpperArm', -70 + 34 * k, 0, -10 * k, w);
      b('rightLowerArm', 0, 0, 15 + 75 * k, w);
      b('leftUpperArm', -70 + 34 * k, 0, 10 * k, w);
      b('leftLowerArm', 0, 0, -15 - 75 * k, w);
      // 左右交互に足を上げてドン！
      var lLift = Math.max(0, st) * k;
      var rLift = Math.max(0, -st) * k;
      b('leftUpperLeg', -28 * lLift, 0, -4 * k, w);
      b('leftLowerLeg', 4 + 48 * lLift, 0, 0, w);
      b('rightUpperLeg', -28 * rLift, 0, 4 * k, w);
      b('rightLowerLeg', 4 + 48 * rLift, 0, 0, w);
      if (hips) hips.obj.position.y += 0.015 * Math.abs(st) * k * w;
    }
  },
  {
    // 考え中（腕を組み、右手を顎に添えて首を傾げる）
    id:'emote_think', label:'うーん…考え中', loop:false, duration:2.80,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal;
      var k = tv(el, [[0,0],[0.45,1],[2.30,1],[2.80,0]]);
      var aha = tv(el, [[0,0],[1.75,0],[1.95,1],[2.15,0]]);
      var tw = c.isBuriRig ? 0 : -40 * k;
      b('spine', 4 * k, 0, -3 * k, w);
      b('head', 6 * k - 10 * aha, 10 * k, 14 * k, w);
      // 左腕は胸下に抱え、右肘を支える位置
      b('leftUpperArm', -70 + 22 * k, 0, -42 * k, w);
      b('leftLowerArm', 0, 0, -14 - 78 * k, w);
      // 右手を顎のそばへ
      b('rightUpperArm', -70 + 54 * k, tw, 44 * k, w);
      b('rightLowerArm', 0, 0, 15 + 98 * k, w);
    }
  },
  {
    // びっくり飛び跳ね（ピョコンと跳ねて両手を頬の前へ）
    id:'emote_surprised_jump', label:'びっくり飛び跳ね', loop:false, duration:1.30,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var k = tv(el, [[0,0],[0.15,1],[0.70,0.8],[1.30,0]]);
      var hop = (el > 0.05 && el < 0.50) ? 0.14 * Math.sin((el - 0.05) / 0.45 * Math.PI) : 0;
      var tw = c.isBuriRig ? 0 : -65 * k;
      b('spine', -10 * k, 0, 0, w);
      b('head', -8 * k, 0, 0, w);
      b('rightUpperArm', -70 + 78 * k, tw, 36 * k, w);
      b('rightLowerArm', 0, 0, 15 + 88 * k, w);
      b('leftUpperArm', -70 + 78 * k, tw, -36 * k, w);
      b('leftLowerArm', 0, 0, -15 - 88 * k, w);
      var knee = tv(el, [[0,2],[0.18,24],[0.48,14],[0.62,28],[1.30,2]]);
      b('leftUpperLeg', -0.55 * knee, 0, -3 * k, w);
      b('rightUpperLeg', -0.55 * knee, 0, 3 * k, w);
      b('leftLowerLeg', knee, 0, 0, w);
      b('rightLowerLeg', knee, 0, 0, w);
      if (hips) hips.obj.position.y += hop * w;
    }
  },
  {
    // ふあぁ…伸び＆あくび
    id:'emote_sleepy_yawn', label:'伸び＆あくび', loop:false, duration:3.20,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal;
      var str = tv(el, [[0,0],[0.60,1],[1.40,1],[1.95,0],[3.20,0]]);
      var yawn = tv(el, [[0,0],[1.75,0],[2.10,1],[2.75,1],[3.20,0]]);
      var tw = c.isBuriRig ? 0 : -60 * (str + yawn);
      // 伸びパート（両手を大きく頭上へ反る）→ あくびパート（右手を口元へ）
      b('spine', -14 * str + 5 * yawn, 0, 0, w);
      b('chest', -8 * str + 3 * yawn, 0, 0, w);
      b('head', -16 * str + 8 * yawn, 0, 8 * yawn, w);
      b('rightUpperArm', -70 + 150 * str + 78 * yawn, tw, 12 * str + 40 * yawn, w);
      b('rightLowerArm', 0, 0, 15 + 10 * str + 96 * yawn, w);
      b('leftUpperArm', -70 + 150 * str, tw, -12 * str, w);
      b('leftLowerArm', 0, 0, -15 - 10 * str, w);
    }
  },
  {
    // あはは！お腹を抱えて大笑い
    id:'emote_laugh', label:'あはは！大笑い', loop:false, duration:2.40,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var k = tv(el, [[0,0],[0.30,1],[1.95,1],[2.40,0]]);
      var ha = (el > 0.25 && el < 2.00) ? Math.sin((el - 0.25) * 18) : 0;
      b('spine', (10 - 6 * ha) * k, 0, 0, w);
      b('chest', (6 - 6 * ha) * k, 0, 0, w);
      b('head', (-8 - 6 * ha) * k, 0, 4 * ha * k, w);
      // 左手でお腹を抱え、右手は軽く口元・胸前へ
      b('leftUpperArm', -70 + 24 * k, 0, -36 * k, w);
      b('leftLowerArm', 0, 0, -14 - 76 * k, w);
      b('rightUpperArm', -70 + (32 + 6 * ha) * k, 0, 30 * k, w);
      b('rightLowerArm', 0, 0, 15 + 65 * k, w);
      b('leftLowerLeg', 12 * k, 0, 0, w);
      b('rightLowerLeg', 12 * k, 0, 0, w);
      if (hips) hips.obj.position.y += (-0.015 + 0.008 * ha) * k * w;
    }
  },
  {
    // パチパチ拍手
    id:'emote_clap', label:'パチパチ拍手', loop:false, duration:2.40,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal;
      var k = tv(el, [[0,0],[0.30,1],[2.05,1],[2.40,0]]);
      // 手を打ち合わせるリズム
      var clap = (el > 0.30 && el < 2.00) ? Math.abs(Math.sin((el - 0.30) * 11)) : 0;
      b('spine', 4 * k, 0, 0, w);
      b('head', 4 * k, 0, 4 * Math.sin(el * 5) * k, w);
      b('rightUpperArm', -70 + 30 * k, -20 * k, (44 - 16 * clap) * k, w);
      b('rightLowerArm', 0, 0, 15 + (68 - 10 * clap) * k, w);
      b('leftUpperArm', -70 + 30 * k, -20 * k, (-44 + 16 * clap) * k, w);
      b('leftLowerArm', 0, 0, -15 - (68 - 10 * clap) * k, w);
    }
  },
  {
    // ビシッと敬礼
    id:'emote_salute', label:'ビシッと敬礼', loop:false, duration:2.20,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal;
      var k = tv(el, [[0,0],[0.32,1],[1.75,1],[2.20,0]]);
      var tw = c.isBuriRig ? 0 : -62 * k;
      b('spine', -4 * k, 0, 0, w);
      b('chest', -2 * k, 0, 0, w);
      b('head', -4 * k, 0, 0, w);
      // 左手は体側へビシッと
      b('leftUpperArm', -70 - 6 * k, 0, 0, w);
      b('leftLowerArm', 0, 0, -4, w);
      // 右手は眉の横へ敬礼角度
      b('rightUpperArm', -70 + 82 * k, tw, 30 * k, w);
      b('rightLowerArm', 0, 0, 15 + 106 * k, w);
      if (!c.isBuriRig) c.blendRaw('rightHand', 0, 0, 0, w);
    }
  },
  {
    // アイドル決めポーズ（腰を片側へ引き、顔の横でポーズ）
    id:'emote_peace', label:'アイドル決めポーズ', loop:false, duration:2.60,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var k = tv(el, [[0,0],[0.40,1],[2.10,1],[2.60,0]]);
      var tw = c.isBuriRig ? 0 : -78 * k;
      b('hips', 0, -10 * k, 6 * k, w);
      b('spine', -4 * k, 0, -8 * k, w);
      b('head', -2 * k, 8 * k, 14 * k, w);
      // 右手は頬の横へ（手のひら正面）
      b('rightUpperArm', -70 + 102 * k, tw, 24 * k, w);
      b('rightLowerArm', 0, 0, 12 + 86 * k, w);
      if (!c.isBuriRig) c.blendRaw('rightHand', 0, 0, -6 * k, w);
      // 左手は腰に当てる
      b('leftUpperArm', -70 + 32 * k, 0, 10 * k, w);
      b('leftLowerArm', 0, 0, -14 - 72 * k, w);
      b('leftUpperLeg', -8 * k, 0, -5 * k, w);
      b('leftLowerLeg', 14 * k, 0, 0, w);
      if (hips) hips.obj.position.y += -0.015 * k * w;
    }
  },
  {
    // ご機嫌リズム揺れ（ループ）：軽快なアイドル系リズムステップ
    id:'emote_dance_idle', label:'ご機嫌リズム揺れ', loop:true, duration:2.00,
    fn:function(el, w, c){
      var b = c.blend, hips = c.bones.hips;
      var ph = el * (Math.PI * 2 / 2.00);
      var s = Math.sin(ph), s2 = Math.sin(ph * 2);
      var bounce = Math.max(0, -Math.cos(ph * 2));
      b('hips', 0, 8 * s, 5 * s, w);
      b('spine', 3, 0, -4 * s, w);
      b('chest', 2, -6 * s, 0, w);
      b('head', 2 * s2, 6 * s, 8 * s, w);
      b('leftUpperArm', -70 + 24 + 10 * s, 0, -18 - 12 * s, w);
      b('leftLowerArm', 0, 0, -52 - 14 * s, w);
      b('rightUpperArm', -70 + 24 - 10 * s, 0, 18 - 12 * s, w);
      b('rightLowerArm', 0, 0, 52 - 14 * s, w);
      b('leftUpperLeg', -10 * bounce, 0, -3, w);
      b('rightUpperLeg', -10 * bounce, 0, 3, w);
      b('leftLowerLeg', 4 + 20 * bounce, 0, 0, w);
      b('rightLowerLeg', 4 + 20 * bounce, 0, 0, w);
      if (hips){
        hips.obj.position.y += (-0.018 * bounce) * w;
        hips.obj.position.x += (0.04 * s) * w;
      }
    }
  },
  {
    // ぺたん座り・しょんぼり（体育座り風）
    id:'emote_sit_tired', label:'ぺたん座り・しょんぼり', loop:false, duration:3.20,
    fn:function(el, w, c){
      var b = c.blend, tv = c.trackVal, hips = c.bones.hips;
      var sit = tv(el, [[0,0],[0.65,1],[2.50,1],[3.20,0]]);
      b('spine', 20 * sit, 0, 0, w);
      b('chest', 12 * sit, 0, 0, w);
      b('neck', 8 * sit, 0, 0, w);
      b('head', 22 * sit, 0, 6 * sit, w);
      // 膝を抱えるように両腕を前へ回す
      b('leftUpperArm', -70 + 36 * sit, 0, -42 * sit, w);
      b('leftLowerArm', 0, 0, -14 - 46 * sit, w);
      b('rightUpperArm', -70 + 36 * sit, 0, 42 * sit, w);
      b('rightLowerArm', 0, 0, 15 + 46 * sit, w);
      // 膝を深く曲げて座り込む
      b('leftUpperLeg', -86 * sit, 0, -8 * sit, w);
      b('rightUpperLeg', -86 * sit, 0, 8 * sit, w);
      b('leftLowerLeg', 102 * sit, 0, 0, w);
      b('rightLowerLeg', 102 * sit, 0, 0, w);
      b('leftFoot', -12 * sit, 0, 0, w);
      b('rightFoot', -12 * sit, 0, 0, w);
      if (hips){
        hips.obj.position.y += -0.48 * sit * w;
        hips.obj.position.z += -0.10 * sit * w;
      }
    }
  }
]);

})(window.VRMViewer);