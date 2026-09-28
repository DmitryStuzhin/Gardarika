/* Конструктор V3 · 3D-сцена. Строит дом из GC.massing — никаких веток «под конкретный дом».
   Слои повторяют порядок стройки: 0 фундамент · 1 стены · 2 верхний уровень · 3 кровля · 4 окна и фасад · 5 участок. */
(function(root){
  "use strict";
  var GC = root.GC = root.GC || {};
  var STAGES = ["Фундамент", "Стены", "Верхний уровень", "Кровля", "Окна и фасад", "Готовый дом"];
  GC.stages = STAGES;

  function canvasTex(draw, rep){
    var c = document.createElement("canvas"); c.width = c.height = 256; draw(c.getContext("2d"), 256);
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep || 1, rep || 1);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function lin(c){ return new THREE.Color(c).convertSRGBToLinear(); }   /* цвета заданы в sRGB, рендер — в линейном пространстве */
  function hex(n){ return "#" + ("000000" + n.toString(16)).slice(-6); }
  var TEX = {};
  function tex(kind, color){
    var key = kind + color; if (TEX[key]) return TEX[key];
    var c = hex(color), t;
    if (kind === "clinker") t = canvasTex(function(x, s){ x.fillStyle = "#d8d2c8"; x.fillRect(0, 0, s, s);
      for (var r = 0; r < 16; r++) for (var k = 0; k < 5; k++){ var off = r % 2 ? 25 : 0; x.fillStyle = c; x.globalAlpha = .82 + Math.random() * .18; x.fillRect(k * 51 + off - 25, r * 16 + 1, 48, 14); } x.globalAlpha = 1; });
    else if (kind === "wood") t = canvasTex(function(x, s){ x.fillStyle = c; x.fillRect(0, 0, s, s); x.strokeStyle = "rgba(60,40,20,.35)"; x.lineWidth = 2;
      for (var r = 0; r < 12; r++){ x.beginPath(); x.moveTo(0, r * 21.3); x.lineTo(s, r * 21.3); x.stroke(); } });
    else if (kind === "seam") t = canvasTex(function(x, s){ x.fillStyle = c; x.fillRect(0, 0, s, s); x.fillStyle = "rgba(255,255,255,.10)";
      for (var k = 0; k < 8; k++) x.fillRect(k * 32, 0, 3, s); });
    else if (kind === "tile") t = canvasTex(function(x, s){ x.fillStyle = c; x.fillRect(0, 0, s, s); x.strokeStyle = "rgba(0,0,0,.28)"; x.lineWidth = 3;
      for (var r = 0; r < 8; r++){ x.beginPath(); x.moveTo(0, r * 32); x.lineTo(s, r * 32); x.stroke(); for (var k = 0; k < 8; k++){ x.beginPath(); x.moveTo(k * 32 + (r % 2 ? 16 : 0), r * 32); x.lineTo(k * 32 + (r % 2 ? 16 : 0), r * 32 + 32); x.stroke(); } } });
    else t = canvasTex(function(x, s){ x.fillStyle = c; x.fillRect(0, 0, s, s); for (var i = 0; i < 1800; i++){ x.fillStyle = "rgba(0,0,0," + (Math.random() * .05) + ")"; x.fillRect(Math.random() * s, Math.random() * s, 2, 2); } });
    return TEX[key] = t;
  }

  function View(host){
    var self = this;
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
    this.renderer.setPixelRatio(Math.min(2, root.devicePixelRatio || 1));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.scene.background = lin(0xe7ece4);
    this.scene.fog = new THREE.Fog(lin(0xe7ece4), 70, 160);
    this.camera = new THREE.PerspectiveCamera(34, 1, .1, 400);
    this.camera.position.set(-22, 17, -26);
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.maxPolarAngle = Math.PI * .47; this.controls.minDistance = 8; this.controls.maxDistance = 90;
    this.controls.addEventListener("change", function(){ self.dirty = true; });
    this.scene.add(new THREE.HemisphereLight(0xffffff, lin(0xb9c2b0), .75));
    var sun = new THREE.DirectionalLight(0xfff3e0, .95); sun.position.set(-18, 30, -14); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048); var sc = sun.shadow.camera; sc.left = sc.bottom = -26; sc.right = sc.top = 26; sc.far = 90; sun.shadow.bias = -.0005;
    this.scene.add(sun);
    var ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({color: lin(0xa7b497), roughness: 1}));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; this.scene.add(ground);
    this.house = new THREE.Group(); this.scene.add(this.house);
    this.layers = [];
    this.stage = 5;
    this.resize();
    root.addEventListener("resize", function(){ self.resize(); });
    (function loop(){ requestAnimationFrame(loop); if (self.controls.update() || self.dirty){ self.renderer.render(self.scene, self.camera); self.dirty = false; } })();
  }
  View.prototype.resize = function(){
    var w = this.host.clientWidth || 600, h = this.host.clientHeight || 400;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.dirty = true;
  };
  View.prototype.setStage = function(n){
    this.stage = n;
    this.layers.forEach(function(g, i){ g.visible = i <= n; });
    this.dirty = true;
  };
  View.prototype.frame = function(V){
    var minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9, top = 0;
    V.forEach(function(v){ minX = Math.min(minX, v.x - v.w / 2); maxX = Math.max(maxX, v.x + v.w / 2); minZ = Math.min(minZ, v.z - v.d / 2); maxZ = Math.max(maxZ, v.z + v.d / 2); top = Math.max(top, v.y0 + v.h + (v.roof ? GC.roofGeom(v).rise : 0)); });
    var cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, span = Math.max(Math.hypot(maxX - minX, maxZ - minZ), top * 1.7);
    this.controls.target.set(cx, top * .4, cz);
    var dir = new THREE.Vector3(-.62, .5, -.72).normalize();
    this.camera.position.copy(this.controls.target).addScaledVector(dir, span * 1.45 / Math.min(1, (this.camera.aspect || 1) * .85) + 5);
    this.dirty = true;
  };

  View.prototype.build = function(res, fin){
    var self = this, V = GC.massing(res), F = GC.finishes;
    function opt(g, id){ return F[g].options.filter(function(o){ return o.id === id; })[0]; }
    while (this.house.children.length) this.house.remove(this.house.children[0]);
    this.layers = []; for (var i = 0; i < 6; i++){ var g = new THREE.Group(); this.layers.push(g); this.house.add(g); }
    var L = this.layers;
    function M(color, o){ return new THREE.MeshStandardMaterial(Object.assign({roughness: .85}, o || {}, {color: lin(color)})); }
    var mConc = M(0xbdbcb7), mStruct = M(opt("walls", fin.walls).color, {roughness: .95});
    var fac = opt("facade", fin.facade), mFac = fin.facade === "plaster" ? M(0xffffff, {map: tex("plaster", fac.color)}) : M(0xffffff, {map: tex(fin.facade, fac.color)});
    var rc = opt("roofCover", fin.roofCover), mRoof = M(0xffffff, {map: tex(fin.roofCover === "tile" ? "tile" : fin.roofCover === "seam" ? "seam" : "plaster", rc.color), roughness: .6, side: THREE.DoubleSide});
    var mFrame = M(opt("windows", fin.windows).color, {roughness: .4});
    var mGlass = new THREE.MeshStandardMaterial({color: lin(0x6f8ea3), roughness: .08, metalness: .25, transparent: true, opacity: .78});
    var mWood = M(0x8a6848), mDeck = M(0xa98563, {map: tex("wood", 0xa98563)}), mMetal = M(0x3b4046, {metalness: .5, roughness: .4}), mGravel = M(0xc9c4ba);

    function box(w, h, d, m, x, y, z, g){ var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; }
    /* стены объёма: четыре несущие стены (слой стен) и тонкая финишная оболочка (слой фасада) */
    function walls(v, g, skinG){
      var t = .38, y = v.y0 + v.h / 2;
      box(v.w, v.h, t, mStruct, v.x, y, v.z - v.d / 2 + t / 2, g); box(v.w, v.h, t, mStruct, v.x, y, v.z + v.d / 2 - t / 2, g);
      box(t, v.h, v.d - 2 * t, mStruct, v.x - v.w / 2 + t / 2, y, v.z, g); box(t, v.h, v.d - 2 * t, mStruct, v.x + v.w / 2 - t / 2, y, v.z, g);
      var s = .04;
      box(v.w + 2 * s, v.h, s, mFac, v.x, y, v.z - v.d / 2 - s / 2, skinG); box(v.w + 2 * s, v.h, s, mFac, v.x, y, v.z + v.d / 2 + s / 2, skinG);
      box(s, v.h, v.d, mFac, v.x - v.w / 2 - s / 2, y, v.z, skinG); box(s, v.h, v.d, mFac, v.x + v.w / 2 + s / 2, y, v.z, skinG);
      box(v.w + .1, .2, v.d + .1, mConc, v.x, v.y0 + v.h + .1, v.z, g);        /* перекрытие / обвязка */
    }
    function windowsOn(v, g){
      if (!v.windows) return;
      Object.keys(v.windows).forEach(function(side){
        v.windows[side].forEach(function(o){
          var along = (side === "S" || side === "N") ? v.w : v.d, ww = Math.min(o[1], along * .4), hh = Math.min(o[2], v.h - .25);
          var pos = -along / 2 + o[0] * along, y = v.y0 + (hh > 1.9 ? hh / 2 + .05 : v.h * .58);
          var off = .07, fx, fz, rot = 0;
          if (side === "S"){ fx = v.x + pos; fz = v.z - v.d / 2 - off; }
          else if (side === "N"){ fx = v.x + pos; fz = v.z + v.d / 2 + off; }
          else if (side === "W"){ fx = v.x - v.w / 2 - off; fz = v.z + pos; rot = Math.PI / 2; }
          else { fx = v.x + v.w / 2 + off; fz = v.z + pos; rot = Math.PI / 2; }
          var fr = new THREE.Mesh(new THREE.BoxGeometry(ww + .14, hh + .14, .06), mFrame); fr.position.set(fx, y, fz); fr.rotation.y = rot; g.add(fr);
          var gl = new THREE.Mesh(new THREE.BoxGeometry(ww, hh, .07), mGlass); gl.position.set(fx, y, fz); gl.rotation.y = rot; g.add(gl);
          if (ww > 1.5){ var mul = new THREE.Mesh(new THREE.BoxGeometry(.06, hh, .08), mFrame); mul.position.set(fx, y, fz); mul.rotation.y = rot; g.add(mul); }
        });
      });
    }
    function door(v, side, g){
      var w = 1.0, h = 2.2, off = .08, y = v.y0 + h / 2;
      if (side === "S") box(w, h, .08, mWood, v.x + (v.kind === "core" ? v.w * .12 : 0), y, v.z - v.d / 2 - off, g);
      else if (side === "N") box(w, h, .08, mWood, v.x, y, v.z + v.d / 2 + off, g);
      else box(.08, h, w, mWood, v.x + (side === "W" ? -1 : 1) * (v.w / 2 + off), y, v.z, g);
    }
    /* кровля над прямоугольником: двускатная, вальмовая, плоская, односкатная */
    function roof(v, base, g, gableG){
      var r = v.roof; if (!r) return;
      var ov = .5, t = Math.tan(r.pitch * Math.PI / 180);
      if (r.family === "flat"){
        box(v.w + .5, .22, v.d + .5, mRoof, v.x, base + .11, v.z, g);
        [[v.w + .5, .1, 0, -(v.d / 2 + .2)], [v.w + .5, .1, 0, v.d / 2 + .2]].forEach(function(p){ box(p[0], .35, .1, mRoof, v.x, base + .3, v.z + p[3], g); });
        box(.1, .35, v.d + .5, mRoof, v.x - v.w / 2 - .2, base + .3, v.z, g); box(.1, .35, v.d + .5, mRoof, v.x + v.w / 2 + .2, base + .3, v.z, g);
        return;
      }
      if (r.family === "lean"){
        /* односкатная: низ ската на отметке base по дальней от дома кромке, верх — у стены дома */
        var ns = r.away === "N" || r.away === "S", run = (ns ? v.d : v.w) + ov, other = (ns ? v.w : v.d) + ov, rise = run * t;
        var o = box(ns ? other : Math.hypot(run, rise), .12, ns ? Math.hypot(run, rise) : other, mRoof, v.x, base + rise / 2, v.z, g);
        var ang = Math.atan(t);
        if (r.away === "W") o.rotation.z = ang; else if (r.away === "E") o.rotation.z = -ang;
        else if (r.away === "S") o.rotation.x = -ang; else o.rotation.x = ang;
        return rise;
      }
      var span = r.alongZ ? v.w : v.d, len = (r.alongZ ? v.d : v.w) + 2 * ov, half = span / 2 + ov, rise2 = span / 2 * t;
      if (r.family === "gable"){
        /* два ската от карниза (с выносом) до конька + фронтоны в цвет фасада */
        var drop = ov * t, plen = Math.hypot(half, rise2 + drop), pa = Math.atan2(rise2 + drop, half), cy = base + (rise2 - drop) / 2;
        [-1, 1].forEach(function(s){
          if (r.alongZ){ var p1 = box(plen, .14, len, mRoof, v.x + s * half / 2, cy, v.z, g); p1.rotation.z = -s * pa; }
          else { var p2 = box(len, .14, plen, mRoof, v.x, cy, v.z + s * half / 2, g); p2.rotation.x = s * pa; }
        });
        var sh = new THREE.Shape(); sh.moveTo(-span / 2, 0); sh.lineTo(span / 2, 0); sh.lineTo(0, rise2); sh.closePath();
        var len2 = r.alongZ ? v.d : v.w, gmat = mFac.clone(); gmat.side = THREE.DoubleSide;
        [-1, 1].forEach(function(s){
          var gm = new THREE.Mesh(new THREE.ShapeGeometry(sh), gmat);
          if (r.alongZ) gm.position.set(v.x, base, v.z + s * (len2 / 2 + .03));
          else { gm.rotation.y = Math.PI / 2; gm.position.set(v.x + s * (len2 / 2 + .03), base, v.z); }
          gm.castShadow = true; gableG.add(gm);
        });
        return rise2;
      }
      /* вальмовая: конёк вдоль длинной стороны, четыре плоских ската */
      var a = v.w / 2 + ov, d = v.d / 2 + ov, yb = base - ov * t, yr = base + Math.min(v.w, v.d) / 2 * t, alongZ = d >= a, rr = Math.abs(d - a);
      var r1 = alongZ ? [v.x, yr, v.z - rr] : [v.x - rr, yr, v.z], r2 = alongZ ? [v.x, yr, v.z + rr] : [v.x + rr, yr, v.z];
      var c0 = [v.x - a, yb, v.z - d], c1 = [v.x + a, yb, v.z - d], c2 = [v.x + a, yb, v.z + d], c3 = [v.x - a, yb, v.z + d];
      var tr = alongZ ? [c0, c1, r1, c2, c3, r2, c1, c2, r2, c1, r2, r1, c3, c0, r1, c3, r1, r2] : [c3, c0, r1, c1, c2, r2, c0, c1, r2, c0, r2, r1, c2, c3, r1, c2, r1, r2];
      var pos = []; tr.forEach(function(p){ pos.push(p[0], p[1], p[2]); });
      var hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); hg.computeVertexNormals();
      var uv = []; for (var k = 0; k < tr.length; k++) uv.push(tr[k][0] * .25, tr[k][2] * .25); hg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      var hm = new THREE.Mesh(hg, mRoof); hm.castShadow = hm.receiveShadow = true; g.add(hm);
    }

    V.forEach(function(v){
      if (v.kind === "terrace"){
        box(v.w, .3, v.d, mDeck, v.x, .15, v.z, L[5]);
        return;
      }
      if (v.kind === "carport"){
        box(v.w + .4, .06, v.d + .4, mGravel, v.x, .03, v.z, L[0]);
        var ns = v.side === "N" || v.side === "S", run = ns ? v.d : v.w, tt = Math.tan(v.roof.pitch * Math.PI / 180);
        var xs = [v.x - v.w / 2 + .15, v.x + v.w / 2 - .15], zs = [v.z - v.d / 2 + .15, v.z, v.z + v.d / 2 - .15];
        xs.forEach(function(x){ zs.forEach(function(z){
          /* стойки у дома выше на подъём ската */
          var k = ns ? (v.side === "S" ? (z - (v.z - v.d / 2)) / v.d : ((v.z + v.d / 2) - z) / v.d) : (v.side === "W" ? (x - (v.x - v.w / 2)) / v.w : ((v.x + v.w / 2) - x) / v.w);
          var ph = v.h + k * run * tt; box(.14, ph, .14, mWood, x, ph / 2, z, L[1]);
        }); });
        roof(v, v.h, L[3], L[4]);
        return;
      }
      var upper = v.kind === "floor" || v.kind === "mansard";
      var wallG = upper ? L[2] : L[1];
      /* фундамент под каждый отапливаемый объём первого уровня */
      if (!upper){
        if (fin.foundation === "piles"){
          var nx = Math.max(2, Math.ceil(v.w / 3)), nz = Math.max(2, Math.ceil(v.d / 3));
          for (var ix = 0; ix < nx; ix++) for (var iz = 0; iz < nz; iz++){
            var pl = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .9, 12), mConc); pl.position.set(v.x - v.w / 2 + .3 + ix * (v.w - .6) / (nx - 1), .1, v.z - v.d / 2 + .3 + iz * (v.d - .6) / (nz - 1)); L[0].add(pl);
          }
          box(v.w + .1, .3, v.d + .1, mConc, v.x, v.y0 - .15, v.z, L[0]);
        } else if (fin.foundation === "strip"){
          var bt = .45;
          box(v.w + .3, v.y0 + .3, bt, mConc, v.x, (v.y0 - .3) / 2, v.z - v.d / 2 + bt / 2, L[0]); box(v.w + .3, v.y0 + .3, bt, mConc, v.x, (v.y0 - .3) / 2, v.z + v.d / 2 - bt / 2, L[0]);
          box(bt, v.y0 + .3, v.d - 2 * bt, mConc, v.x - v.w / 2 + bt / 2, (v.y0 - .3) / 2, v.z, L[0]); box(bt, v.y0 + .3, v.d - 2 * bt, mConc, v.x + v.w / 2 - bt / 2, (v.y0 - .3) / 2, v.z, L[0]);
          box(v.w - 2 * bt, .15, v.d - 2 * bt, mConc, v.x, v.y0 - .08, v.z, L[0]);
        } else box(v.w + .3, v.y0, v.d + .3, mConc, v.x, v.y0 / 2, v.z, L[0]);
      }
      if (v.kind === "mansard"){
        /* коленные стены вдоль конька, фронтоны до кровли */
        var r = v.roof, t = .38, span = r.alongZ ? v.w : v.d, len = r.alongZ ? v.d : v.w, rise = span / 2 * Math.tan(r.pitch * Math.PI / 180);
        if (r.alongZ){ box(t, v.h, v.d, mStruct, v.x - v.w / 2 + t / 2, v.y0 + v.h / 2, v.z, wallG); box(t, v.h, v.d, mStruct, v.x + v.w / 2 - t / 2, v.y0 + v.h / 2, v.z, wallG); }
        else { box(v.w, v.h, t, mStruct, v.x, v.y0 + v.h / 2, v.z - v.d / 2 + t / 2, wallG); box(v.w, v.h, t, mStruct, v.x, v.y0 + v.h / 2, v.z + v.d / 2 - t / 2, wallG); }
        var sh = new THREE.Shape(); sh.moveTo(-span / 2, 0); sh.lineTo(span / 2, 0); sh.lineTo(span / 2, v.h); sh.lineTo(0, v.h + rise); sh.lineTo(-span / 2, v.h); sh.closePath();
        [-1, 1].forEach(function(s){
          var geo = new THREE.ExtrudeGeometry(sh, {depth: t, bevelEnabled: false}), gm = new THREE.Mesh(geo, mStruct), gs = new THREE.Mesh(new THREE.ShapeGeometry(sh), mFac.clone());
          gs.material.side = THREE.DoubleSide;
          if (r.alongZ){ gm.position.set(v.x, v.y0, v.z + s * (len / 2) - (s > 0 ? t : 0)); gs.position.set(v.x, v.y0, v.z + s * (len / 2 + .03)); }
          else { gm.rotation.y = Math.PI / 2; gs.rotation.y = Math.PI / 2; gm.position.set(v.x + s * (len / 2) - (s > 0 ? t : 0), v.y0, v.z + 0); gs.position.set(v.x + s * (len / 2 + .03), v.y0, v.z); }
          gm.castShadow = true; wallG.add(gm); L[4].add(gs);
          /* окно во фронтоне мансарды */
          var wy = v.y0 + v.h + rise * .25, ww = Math.min(1.6, span * .22), wh = 1.3;
          var fr = new THREE.Mesh(new THREE.BoxGeometry(ww + .14, wh + .14, .06), mFrame), gl = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, .07), mGlass);
          [fr, gl].forEach(function(o){ if (r.alongZ) o.position.set(v.x, wy, v.z + s * (len / 2 + .08)); else { o.rotation.y = Math.PI / 2; o.position.set(v.x + s * (len / 2 + .08), wy, v.z); } L[4].add(o); });
        });
        roof(v, v.y0 + v.h, L[3], L[4]);
        return;
      }
      walls(v, wallG, L[4]);
      windowsOn(v, L[4]);
      if (v.door) door(v, v.door, L[4]);
      if (v.roof) roof(v, v.y0 + v.h + .2, L[3], L[4]);
    });
    /* дорожка к входу и газон вокруг — слой участка */
    var core = V[0];
    box(1.4, .04, 5, mGravel, core.x + core.w * .12, .02, core.z - core.d / 2 - 3.2, L[5]);
    this.lastMassing = V;
    this.setStage(this.stage);
    return V;
  };
  GC.View = View;
})(window);
