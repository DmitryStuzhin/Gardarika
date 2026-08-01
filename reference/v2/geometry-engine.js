(function (root) {
  "use strict";
  var G = root.GardarikaV2 = root.GardarikaV2 || {};
  var T = root.THREE;

  function makeTexture(draw,repeatX,repeatY){
    if(!root.document||!T.CanvasTexture)return null;var canvas=root.document.createElement("canvas");canvas.width=canvas.height=256;var ctx=canvas.getContext("2d");draw(ctx,256);var texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(repeatX||1,repeatY||1);texture.anisotropy=4;texture.encoding=T.sRGBEncoding;return texture;
  }
  function noise(i){var x=Math.sin(i*91.73)*43758.5453;return x-Math.floor(x);}
  var textures={
    stucco:makeTexture(function(c,s){c.fillStyle="#f0ece3";c.fillRect(0,0,s,s);for(var i=0;i<700;i++){var a=.025+noise(i)*.055,v=210+Math.floor(noise(i+8)*35);c.fillStyle="rgba("+v+","+(v-3)+","+(v-8)+","+a+")";c.fillRect(noise(i+2)*s,noise(i+5)*s,1,1);}},2.2,2.2),
    wood:makeTexture(function(c,s){c.fillStyle="#75432e";c.fillRect(0,0,s,s);for(var y=0;y<s;y+=32){c.fillStyle="#512b1e";c.fillRect(0,y,s,2);c.fillStyle="rgba(235,174,126,.13)";c.fillRect(0,y+3,s,1);}for(var i=0;i<95;i++){var yy=noise(i+4)*s;c.strokeStyle="rgba(52,22,14,"+(.035+noise(i)*.08)+")";c.beginPath();c.moveTo(0,yy);c.bezierCurveTo(70,yy+noise(i+2)*5,160,yy-3,256,yy+noise(i+7)*4);c.stroke();}},2.5,3.4),
    roofTile:makeTexture(function(c,s){c.fillStyle="#303438";c.fillRect(0,0,s,s);for(var y=0;y<s;y+=18){c.fillStyle="rgba(255,255,255,.10)";c.fillRect(0,y,s,1);c.fillStyle="rgba(0,0,0,.22)";c.fillRect(0,y+2,s,2);for(var x=(y/18%2)*32;x<s;x+=64)c.fillRect(x,y,1,18);}},2.2,4.5),
    roofSoft:makeTexture(function(c,s){c.fillStyle="#383b3a";c.fillRect(0,0,s,s);for(var i=0;i<1100;i++){var v=70+Math.floor(noise(i)*35);c.fillStyle="rgba("+v+","+v+","+v+",.16)";c.fillRect(noise(i+5)*s,noise(i+9)*s,1,1);}},3,3),
    roofMetal:makeTexture(function(c,s){c.fillStyle="#303638";c.fillRect(0,0,s,s);for(var x=0;x<s;x+=42){c.fillStyle="rgba(255,255,255,.14)";c.fillRect(x,0,2,s);c.fillStyle="rgba(0,0,0,.22)";c.fillRect(x+3,0,2,s);}},3.6,1),
    stone:makeTexture(function(c,s){c.fillStyle="#77736b";c.fillRect(0,0,s,s);for(var i=0;i<1800;i++){var v=75+Math.floor(noise(i)*105);c.fillStyle="rgb("+v+","+v+","+(v-3)+")";var z=1+Math.floor(noise(i+2)*2);c.fillRect(noise(i+7)*s,noise(i+11)*s,z,z);}},2.2,2.2),
    soffit:makeTexture(function(c,s){c.fillStyle="#dedbd4";c.fillRect(0,0,s,s);for(var y=0;y<s;y+=26){c.fillStyle="rgba(105,105,100,.22)";c.fillRect(0,y,s,1);c.fillStyle="rgba(255,255,255,.5)";c.fillRect(0,y+1,s,1);}},2,4),
    glass:makeTexture(function(c,s){var g=c.createLinearGradient(0,0,0,s);g.addColorStop(0,"#a7bbc0");g.addColorStop(.38,"#6f8a8d");g.addColorStop(1,"#354d4c");c.fillStyle=g;c.fillRect(0,0,s,s);c.fillStyle="rgba(54,82,50,.20)";[[26,190,48,80],[92,216,70,72],[186,183,78,92],[238,224,54,68]].forEach(function(v){c.beginPath();c.ellipse(v[0],v[1],v[2],v[3],0,0,Math.PI*2);c.fill();});c.fillStyle="rgba(255,255,255,.09)";c.beginPath();c.moveTo(0,30);c.lineTo(92,0);c.lineTo(26,256);c.lineTo(0,256);c.fill();},1,1),
    aerated:makeTexture(function(c,s){c.fillStyle="#d8d5ca";c.fillRect(0,0,s,s);c.strokeStyle="rgba(104,103,96,.32)";c.lineWidth=2;for(var y=0;y<s;y+=42){c.beginPath();c.moveTo(0,y);c.lineTo(s,y);c.stroke();for(var x=(y/42%2)*54;x<s;x+=108){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+42);c.stroke();}}},2.8,3.2),
    arbolit:makeTexture(function(c,s){c.fillStyle="#b79d78";c.fillRect(0,0,s,s);for(var i=0;i<900;i++){var x=noise(i+2)*s,y=noise(i+8)*s,l=2+noise(i+5)*7;c.strokeStyle="rgba("+(70+Math.floor(noise(i)*70))+","+(55+Math.floor(noise(i+1)*55))+","+(35+Math.floor(noise(i+3)*40))+",.34)";c.beginPath();c.moveTo(x,y);c.lineTo(x+l,y+(noise(i+4)-.5)*5);c.stroke();}},2.4,2.4),
    frameCore:makeTexture(function(c,s){c.fillStyle="#cfb38d";c.fillRect(0,0,s,s);for(var x=0;x<s;x+=38){c.fillStyle="#8b5c37";c.fillRect(x,0,8,s);c.fillStyle="rgba(255,245,220,.32)";c.fillRect(x+9,0,2,s);}for(var y=0;y<s;y+=78){c.fillStyle="rgba(82,52,31,.4)";c.fillRect(0,y,s,5);}},3,2),
    oakFloor:makeTexture(function(c,s){c.fillStyle="#b98a60";c.fillRect(0,0,s,s);for(var y=0;y<s;y+=36){c.fillStyle="rgba(71,42,24,.22)";c.fillRect(0,y,s,2);for(var x=(y/36%2)*64;x<s;x+=128)c.fillRect(x,y,2,36);}for(var n=0;n<90;n++){c.strokeStyle="rgba(78,43,23,.10)";c.beginPath();c.moveTo(0,noise(n)*s);c.lineTo(s,noise(n+8)*s);c.stroke();}},3.2,4.2),
    fabric:makeTexture(function(c,s){c.fillStyle="#d7c7b1";c.fillRect(0,0,s,s);for(var i=0;i<1200;i++){var v=180+Math.floor(noise(i)*45);c.fillStyle="rgba("+v+","+(v-8)+","+(v-18)+",.16)";c.fillRect(noise(i+2)*s,noise(i+7)*s,1,1);}},2,2)
  };
  function mat(color, roughness, map) { return new T.MeshStandardMaterial({color:color, roughness:roughness == null ? .82 : roughness, metalness:0,map:map||null}); }
  function box(w,h,d,m,x,y,z) { var o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o; }
  function cylinder(radius,length,m,x,y,z,alongZ){var o=new T.Mesh(new T.CylinderGeometry(radius,radius,length,14),m);o.position.set(x,y,z);if(alongZ)o.rotation.x=Math.PI/2;o.castShadow=true;o.receiveShadow=true;return o;}
  function groupNamed(name) { var g=new T.Group();g.name=name;return g; }

  var materials = {
    plaster:mat(0xffffff,.92,textures.stucco), plasterWarm:mat(0x9a9992,.97,textures.stone), wood:mat(0xffffff,.76,textures.wood),door:mat(0xffffff,.7,textures.wood),stone:mat(0xffffff,.92,textures.stone),soffit:mat(0xffffff,.88,textures.soffit),
    roof:mat(0xffffff,.68,textures.roofTile), roofEdge:mat(0x252a2c,.58), glass:new T.MeshPhysicalMaterial({color:0xffffff,roughness:.18,metalness:.04,transparent:true,opacity:.76,transmission:.08,map:textures.glass}),
    frame:mat(0x5a3422,.48), slab:mat(0xc5c1b8,.96), interior:mat(0xf1e9dc,.96), stair:mat(0xb58a63,.84),wallCore:mat(0xffffff,.94,textures.aerated),
    oak:mat(0xffffff,.8,textures.oakFloor),fabric:mat(0xffffff,.95,textures.fabric),sage:mat(0x71806e,.9),terracotta:mat(0xb56e51,.9),cream:mat(0xe8ddcc,.94),charcoal:mat(0x3d3a34,.82),brass:mat(0xb59a62,.4),ceramic:mat(0xeee7dc,.75),screed:mat(0xb8b3aa,.98),doorWarm:mat(0x9d6944,.72),
    ground:mat(0x8fa47d,1), path:mat(0xa9a69e,1), rail:mat(0x8c9290,.36), chimney:mat(0xc8c7c1,.88),gutter:mat(0x343a3a,.48),woodJoint:mat(0x4f2c20,.82),utilityWater:mat(0x467c91,.58),utilityHeat:mat(0xb4603f,.58),utilityPower:mat(0xc29a45,.55)
  };

  function wallLength(p, wall) { return wall === "front" || wall === "back" ? p.source.footprint[0] : p.source.footprint[1]; }
  function wallOpenings(p,level,wall) { return p.openings.filter(function(o){return o.level===level&&o.wall===wall;}).sort(function(a,b){return a.center-b.center;}); }

  function addWallPiece(group, p, wall, center, length, bottom, height, elevation, material) {
    if(length<=.015||height<=.015)return;
    var W=p.source.footprint[0],L=p.source.footprint[1],th=p.structure.exteriorWall;
    var mesh;
    if(wall==="front") mesh=box(length,height,th,material,center,elevation+bottom+height/2,-L/2);
    if(wall==="back") mesh=box(length,height,th,material,center,elevation+bottom+height/2,L/2);
    if(wall==="left") mesh=box(th,height,length,material,-W/2,elevation+bottom+height/2,center);
    if(wall==="right") mesh=box(th,height,length,material,W/2,elevation+bottom+height/2,center);
    mesh.userData.kind="wall";mesh.userData.wall=wall;group.add(mesh);
  }

  function addGablePiece(group,p,wall,a,b,bottomA,bottomB,topA,topB,elevation,material){
    if(b-a<=.015||Math.max(topA-bottomA,topB-bottomB)<=.015)return;
    var shape=new T.Shape();shape.moveTo(a,bottomA);shape.lineTo(b,bottomB);shape.lineTo(b,topB);shape.lineTo(a,topA);shape.closePath();
    var geometry=new T.ExtrudeGeometry(shape,{depth:p.structure.exteriorWall,bevelEnabled:false,steps:1,curveSegments:1}),mesh=new T.Mesh(geometry,material||materials.wallCore),L=p.source.footprint[1];
    mesh.position.set(0,elevation,(wall==="front"?-L/2:L/2)-p.structure.exteriorWall/2);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.kind="wall";mesh.userData.wall=wall;group.add(mesh);
  }

  function buildRectWall(p, levelId, wall, elevation, height, material) {
    var g=groupNamed(levelId+"-"+wall), len=wallLength(p,wall), ops=wallOpenings(p,levelId,wall), bounds=[-len/2,len/2];
    ops.forEach(function(o){bounds.push(o.center-o.width/2,o.center+o.width/2);});
    bounds.sort(function(a,b){return a-b;});
    for(var i=0;i<bounds.length-1;i++){
      var a=bounds[i],b=bounds[i+1],mid=(a+b)/2, op=ops.find(function(o){return mid>o.center-o.width/2+.001&&mid<o.center+o.width/2-.001;});
      if(!op)addWallPiece(g,p,wall,mid,b-a,0,height,elevation,material);
      else{
        if(op.sill>0)addWallPiece(g,p,wall,mid,b-a,0,op.sill,elevation,material);
        var top=op.sill+op.height;if(top<height)addWallPiece(g,p,wall,mid,b-a,top,height-top,elevation,material);
      }
    }
    return g;
  }

  function buildGableWall(p, levelId, wall, elevation, material) {
    var g=groupNamed(levelId+"-"+wall),W=p.source.footprint[0],base=p.structure.kneeWall,pitch=p.structure.roofPitch*Math.PI/180,ops=wallOpenings(p,levelId,wall),bounds=[-W/2,W/2,0];
    ops.forEach(function(o){bounds.push(o.center-o.width/2,o.center+o.width/2);});bounds.sort(function(a,b){return a-b;});
    bounds=bounds.filter(function(v,i,a){return i===0||Math.abs(v-a[i-1])>.002;});
    for(var i=0;i<bounds.length-1;i++){
      var a=bounds[i],b=bounds[i+1],mid=(a+b)/2,ceilA=base+(W/2-Math.abs(a))*Math.tan(pitch),ceilB=base+(W/2-Math.abs(b))*Math.tan(pitch),op=ops.find(function(o){return mid>o.center-o.width/2+.001&&mid<o.center+o.width/2-.001;});
      if(!op)addGablePiece(g,p,wall,a,b,0,0,ceilA,ceilB,elevation,material);
      else{
        if(op.sill>0)addGablePiece(g,p,wall,a,b,0,0,op.sill,op.sill,elevation,material);
        var top=op.sill+op.height;if(top<Math.max(ceilA,ceilB))addGablePiece(g,p,wall,a,b,top,top,ceilA,ceilB,elevation,material);
      }
    }
    return g;
  }

  function addOpeningVisual(group,p,o,elevation){
    var W=p.source.footprint[0],L=p.source.footprint[1],th=.075, pane, frameDepth=.11,paneMaterial=o.id==="front-entry"?materials.door:materials.glass;
    var y=elevation+o.sill+o.height/2;
    if(o.wall==="front"||o.wall==="back"){
      var z=(o.wall==="front"?-L/2:L/2)+(o.wall==="front"?-.015:.015);
      pane=box(o.width-.1,o.height-.1,th,paneMaterial,o.center,y,z);
      addFrame(group,o.width,o.height,o.center,y,z,true,frameDepth);
      if(o.id==="front-entry")group.add(box(.22,o.height*.62,.018,materials.glass,o.center+.18,y+.12,z-.055));
    }else{
      var x=(o.wall==="left"?-W/2:W/2)+(o.wall==="left"?-.015:.015);
      pane=box(th,o.height-.1,o.width-.1,materials.glass,x,y,o.center);
      addFrame(group,o.width,o.height,o.center,y,x,false,frameDepth);
    }
    pane.userData={kind:"opening",id:o.id};group.add(pane);
  }
  function addFrame(group,w,h,c,y,constant,horizontal,depth){
    var f=.075, z=constant;
    if(horizontal){
      group.add(box(w+f,f,depth,materials.frame,c,y+h/2,z));group.add(box(w+f,f,depth,materials.frame,c,y-h/2,z));
      group.add(box(f,h,depth,materials.frame,c-w/2,y,z));group.add(box(f,h,depth,materials.frame,c+w/2,y,z));
      if(w>1.45)group.add(box(f,h,depth,materials.frame,c,y,z));
    }else{
      group.add(box(depth,f,w+f,materials.frame,z,y+h/2,c));group.add(box(depth,f,w+f,materials.frame,z,y-h/2,c));
      group.add(box(depth,h,f,materials.frame,z,y,c-w/2));group.add(box(depth,h,f,materials.frame,z,y,c+w/2));
      if(w>1.45)group.add(box(depth,h,f,materials.frame,z,y,c));
    }
  }

  function layoutPartitions(level,config){
    if(!config||config.layout!=="custom")return level.partitions;
    return level.adaptedPartitions||level.partitions;
  }

  function addPartitions(group,p,level,config){
    var y=level.id==="ground"?p.structure.groundWallHeight:2.35,elev=level.elevation,partitionMaterial=config&&config.interior==="shell"?materials.screed:materials.interior;
    layoutPartitions(level,config).forEach(function(s,i){var dx=s[2]-s[0],dz=s[3]-s[1],len=Math.sqrt(dx*dx+dz*dz),m=box(len,y,p.structure.partition,partitionMaterial,(s[0]+s[2])/2,elev+y/2,(s[1]+s[3])/2);m.rotation.y=-Math.atan2(dz,dx);m.name=level.id+"-partition-"+i;group.add(m);});
  }

  function addSlabAroundVoid(group,p,elevation){
    var W=p.source.footprint[0],L=p.source.footprint[1],v=p.stairVoid,t=p.structure.slab;
    var left=-W/2,right=W/2,front=-L/2,back=L/2,vL=v.x-v.width/2,vR=v.x+v.width/2,vF=v.z-v.depth/2,vB=v.z+v.depth/2;
    group.add(box(vL-left,t,L,materials.slab,(left+vL)/2,elevation,0));group.add(box(right-vR,t,L,materials.slab,(vR+right)/2,elevation,0));
    group.add(box(v.width,t,vF-front,materials.slab,v.x,elevation,(front+vF)/2));group.add(box(v.width,t,back-vB,materials.slab,v.x,elevation,(vB+back)/2));
  }

  function addStair(group,p){var v=p.stairVoid,s=p.staircase||{},n=s.steps||11,rise=s.rise||((p.levels[1].elevation-p.levels[0].elevation)/n),run=s.run||v.depth,d=run/n,sign=s.direction==="-z"?-1:1;for(var i=0;i<n;i++){var h=rise*(i+1),z=v.z-sign*run/2+sign*d*(i+.5);group.add(box((s.width||v.width)-.2,h,d+.02,materials.stair,v.x,p.structure.plinth+h/2,z));}}

  function addInterlevelStructure(group,p,config){
    var elevation=p.levels[1].elevation-.12;if(!config||config.slab!=="beams"){addSlabAroundVoid(group,p,elevation);return;}
    var W=p.source.footprint[0],L=p.source.footprint[1],v=p.stairVoid,vL=v.x-v.width/2,vR=v.x+v.width/2,vF=v.z-v.depth/2,vB=v.z+v.depth/2;
    for(var z=-L/2+.28;z<L/2-.2;z+=.58){if(z>vF&&z<vB){group.add(box(vL+W/2,.2,.14,materials.oak,(-W/2+vL)/2,elevation,z));group.add(box(W/2-vR,.2,.14,materials.oak,(vR+W/2)/2,elevation,z));}else group.add(box(W-.5,.2,.14,materials.oak,0,elevation,z));}
  }

  function addDoor(group,x,z,rotation,elevation,width,height){
    width=width||.82;height=height||2.04;var d=box(width,height,.09,materials.doorWarm,x,elevation+height/2,z);d.rotation.y=rotation||0;group.add(d);
    var handle=new T.Mesh(new T.SphereGeometry(.045,10,8),materials.brass);handle.position.set(x+(rotation?-.06:width*.33),elevation+height*.5,z+(rotation?width*.33:-.06));group.add(handle);
  }

  function addInteriorDoors(group,p,level,config){
    if(config&&config.interior!=="turnkey")return;var e=level.elevation+.04;
    if(Array.isArray(level.interiorDoors)){level.interiorDoors.forEach(function(d){addDoor(group,d.x,d.z,d.rotation||0,e,d.width,d.height);});return;}
    if(level.id==="ground"){addDoor(group,-1.2,-3.75,Math.PI/2,e);addDoor(group,1.45,-3.78,Math.PI/2,e);addDoor(group,3.18,-2.9,0,e);addDoor(group,2.05,-1.4,0,e);}
    else{addDoor(group,-2.35,-1.75,0,e);addDoor(group,2.35,-1.75,0,e);addDoor(group,-2.25,1,0,e);addDoor(group,2.25,.65,0,e);}
  }

  function rug(group,x,z,w,d,y,material){var r=new T.Mesh(new T.CylinderGeometry(.5,.5,.035,28),material);r.scale.set(w,1,d);r.position.set(x,y,z);r.receiveShadow=true;group.add(r);}
  function addBed(group,x,z,w,d,y,accent){group.add(box(w,.28,d,materials.oak,x,y+.18,z),box(w-.12,.22,d-.12,materials.cream,x,y+.42,z),box(w-.16,.12,d*.52,accent||materials.fabric,x,y+.57,z+d*.18));group.add(box(w,.72,.12,materials.oak,x,y+.52,z-d/2));}
  function addSofa(group,x,z,rotation,y){var g=groupNamed("sofa");g.add(box(2.25,.48,.82,materials.fabric,0,.27,0),box(2.25,.68,.18,materials.fabric,0,.62,.31),box(.18,.55,.84,materials.fabric,-1.04,.42,0),box(.18,.55,.84,materials.fabric,1.04,.42,0));for(var i=-1;i<=1;i++)g.add(box(.58,.16,.58,i===0?materials.sage:materials.cream,i*.67,.55,-.05));g.position.set(x,y,z);g.rotation.y=rotation||0;group.add(g);}
  function addDining(group,x,z,y){group.add(box(1.65,.1,.82,materials.oak,x,y+.78,z));for(var sx=-1;sx<=1;sx+=2)for(var sz=-1;sz<=1;sz+=2)group.add(box(.08,.74,.08,materials.charcoal,x+sx*.68,y+.37,z+sz*.28));[[0,-.72,0],[0,.72,Math.PI],[-1.05,0,Math.PI/2],[1.05,0,-Math.PI/2]].forEach(function(v){var chair=groupNamed("chair");chair.add(box(.46,.08,.46,materials.sage,0,.46,0),box(.46,.55,.09,materials.sage,0,.7,.18),box(.055,.45,.055,materials.charcoal,-.18,.22,-.16),box(.055,.45,.055,materials.charcoal,.18,.22,-.16));chair.position.set(x+v[0],y,z+v[1]);chair.rotation.y=v[2];group.add(chair);});}
  function addKitchen(group,y){group.add(box(.62,.9,3.1,materials.sage,3.45,y+.45,.25),box(.72,.09,3.2,materials.oak,3.39,y+.94,.25));for(var z=-.75;z<=1.1;z+=.62)group.add(box(.03,.73,.63,materials.charcoal,3.13,y+.48,z));group.add(box(1.55,.92,.72,materials.cream,2.05,y+.46,1.15),box(1.65,.08,.82,materials.oak,2.05,y+.96,1.15));}
  function addBath(group,x,z,y){group.add(box(.72,.12,1.45,materials.ceramic,x,y+.34,z),box(.72,.5,.12,materials.ceramic,x,y+.55,z-.66));var basin=new T.Mesh(new T.CylinderGeometry(.28,.22,.16,20),materials.ceramic);basin.position.set(x+.58,y+.82,z+.3);group.add(basin);group.add(box(.08,.72,.08,materials.brass,x+.58,y+.47,z+.3));}
  function addWarmLight(group,x,z,y){var glow=new T.PointLight(0xffd6a0,.22,5.2,2);glow.position.set(x,y,z);group.add(glow);group.add(cylinder(.16,.08,materials.brass,x,y+.02,z,false));}

  function addFloorFinish(group,p,level,config){
    if(!config||config.interior==="shell")return;var floorMaterial=config.interior==="turnkey"?materials.oak:materials.screed,W=p.source.footprint[0],L=p.source.footprint[1],e=level.elevation+.035;
    if(level.id==="ground")group.add(box(W-.48,.055,L-.48,floorMaterial,0,e,0));else{var v=p.stairVoid,left=-W/2+.24,right=W/2-.24,front=-L/2+.24,back=L/2-.24,vL=v.x-v.width/2,vR=v.x+v.width/2,vF=v.z-v.depth/2,vB=v.z+v.depth/2;group.add(box(vL-left,.055,back-front,floorMaterial,(left+vL)/2,e,(front+back)/2),box(right-vR,.055,back-front,floorMaterial,(vR+right)/2,e,(front+back)/2),box(v.width,.055,vF-front,floorMaterial,v.x,e,(front+vF)/2),box(v.width,.055,back-vB,floorMaterial,v.x,e,(vB+back)/2));}
  }

  function addFurniture(group,p,level,config){
    if(!config||config.interior!=="turnkey")return;var y=level.elevation+.08;
    if(Array.isArray(level.furniture)){
      level.furniture.forEach(function(item){var a=item.accent==="terracotta"?materials.terracotta:(item.accent==="sage"?materials.sage:materials.fabric),r=item.rotation||0;
        if(item.type==="bed")addBed(group,item.x,item.z,item.width||1.5,item.depth||2,y,a);
        else if(item.type==="sofa")addSofa(group,item.x,item.z,r,y);
        else if(item.type==="dining")addDining(group,item.x,item.z,y);
        else if(item.type==="kitchen"){var kitchenGroup=groupNamed("kitchen");addKitchen(kitchenGroup,0);kitchenGroup.position.set(item.x-3,y,item.z-.5);group.add(kitchenGroup);}
        else if(item.type==="bath")addBath(group,item.x,item.z,y);
        else if(item.type==="light")addWarmLight(group,item.x,item.z,y+(item.height||2.2));
        else if(item.type==="rug")rug(group,item.x,item.z,item.width||1.8,item.depth||1.2,y+.02,a);
        else if(item.type==="storage")group.add(box(item.width||1,item.height||1.8,item.depth||.45,materials.oak,item.x,y+(item.height||1.8)/2,item.z));
      });return;
    }
    if(level.id==="ground"){
      rug(group,-1.15,3.18,2.7,1.85,y,materials.cream);addSofa(group,-2.15,3.35,Math.PI/2,y);group.add(box(1.05,.12,.62,materials.oak,-.65,y+.38,3.15),cylinder(.06,.38,materials.brass,-.98,y+.19,2.92,false),cylinder(.06,.38,materials.brass,-.32,y+.19,3.38,false));
      addDining(group,1.85,2.9,y);addKitchen(group,y);addBed(group,-2.62,-3.55,1.45,2.0,y,materials.terracotta);rug(group,-2.62,-3.55,1.75,2.25,y+.02,materials.cream);addBath(group,2.05,-4.05,y);group.add(box(1.1,.46,.38,materials.oak,.35,y+.23,-4.15));addWarmLight(group,-1.2,3.2,y+2.25);addWarmLight(group,2.05,-.2,y+2.25);
    }else{
      addBed(group,-2.05,-3.25,1.35,1.9,y,materials.sage);addBed(group,1.75,-3.25,1.35,1.9,y,materials.terracotta);addBed(group,-1.5,2.65,1.65,2.1,y,materials.fabric);rug(group,-1.5,2.65,2.0,2.35,y+.02,materials.cream);group.add(box(.72,1.9,2.05,materials.oak,2.65,y+.95,2.55));addBath(group,2.35,-.45,y);addWarmLight(group,-1.5,2.55,y+2.1);addWarmLight(group,0,-2.9,y+2.1);
    }
  }

  function addFoundation(group,p,config){
    var W=p.source.footprint[0],L=p.source.footprint[1],kind=config&&config.foundation||"slab";
    if(kind==="slab"){group.add(box(W+.35,.36,L+.35,materials.plasterWarm,0,.18,0));return;}
    if(kind==="strip"){group.add(box(W+.35,.5,.48,materials.plasterWarm,0,.25,-L/2),box(W+.35,.5,.48,materials.plasterWarm,0,.25,L/2),box(.48,.5,L-.48,materials.plasterWarm,-W/2,.25,0),box(.48,.5,L-.48,materials.plasterWarm,W/2,.25,0));return;}
    for(var x=-W/2+.55;x<=W/2-.45;x+=1.75)for(var z=-L/2+.55;z<=L/2-.45;z+=2.1)group.add(cylinder(.15,.9,materials.plasterWarm,x,-.1,z,false));
    group.add(box(W+.2,.34,.36,materials.plasterWarm,0,.34,-L/2),box(W+.2,.34,.36,materials.plasterWarm,0,.34,L/2),box(.36,.34,L-.36,materials.plasterWarm,-W/2,.34,0),box(.36,.34,L-.36,materials.plasterWarm,W/2,.34,0));
  }

  function addEngineering(group,p,config){var W=p.source.footprint[0],kind=config&&config.engineering||"full",length=kind==="later"?1.25:3.5,start=W/2+length/2;group.add(box(length,.07,.08,materials.utilityWater,start,.12,1.25));if(kind!=="later")group.add(box(length,.07,.08,materials.utilityHeat,start,.12,1.5));if(kind==="full")group.add(box(length,.055,.055,materials.utilityPower,start,.18,1.75));group.add(cylinder(.055,.85,materials.utilityWater,W/2+.22,.52,1.25,false));if(kind!=="later")group.add(cylinder(.055,.85,materials.utilityHeat,W/2+.4,.52,1.5,false));}

  function addRoof(group,p){
    var W=p.source.footprint[0],L=p.source.footprint[1],s=p.structure,run=W/2+s.roofOverhangSide,pitch=s.roofPitch*Math.PI/180,slope=run/Math.cos(pitch),rise=run*Math.tan(pitch),eaveWall=p.levels[1].elevation+s.kneeWall,eave=eaveWall-s.roofOverhangSide*Math.tan(pitch),depth=L+2*s.roofOverhangGable;
    var left=box(slope,.18,depth,materials.roof,-run/2,eave+rise/2,0);left.rotation.z=pitch;left.name="roof-left";
    var right=box(slope,.18,depth,materials.roof,run/2,eave+rise/2,0);right.rotation.z=-pitch;right.name="roof-right";
    group.add(left,right);group.userData.baseY=0;
    var soffitLeft=box(slope-.08,.035,depth-.08,materials.soffit,-run/2,eave+rise/2-.12,0);soffitLeft.rotation.z=pitch;var soffitRight=box(slope-.08,.035,depth-.08,materials.soffit,run/2,eave+rise/2-.12,0);soffitRight.rotation.z=-pitch;group.add(soffitLeft,soffitRight);
    group.add(box(.18,.24,depth+.12,materials.roofEdge,0,eave+rise+.02,0));
    group.add(cylinder(.075,depth,materials.gutter,-run,eave-.11,0,true),cylinder(.075,depth,materials.gutter,run,eave-.11,0,true));
    group.add(cylinder(.06,eave,materials.gutter,-run,eave/2,-depth/2+.28,false),cylinder(.06,eave,materials.gutter,run,eave/2,depth/2-.28,false));
    var chimney=box(.62,2.0,.72,materials.chimney,2.55,eave+1.45,.35);group.add(chimney,box(.82,.12,.92,materials.roofEdge,2.55,eave+2.48,.35));
  }

  function addFacadeSkin(group,p,config){
    var skin=groupNamed("facade-skin"),th=.045,offset=p.structure.exteriorWall/2+th/2,skinP=Object.assign({},p,{structure:Object.assign({},p.structure,{exteriorWall:th})});group.add(skin);
    ["front","back","left","right"].forEach(function(w){var wall=buildRectWall(skinP,"ground",w,p.levels[0].elevation,p.structure.groundWallHeight,materials.plaster);if(w==="front")wall.position.z=-offset;if(w==="back")wall.position.z=offset;if(w==="left")wall.position.x=-offset;if(w==="right")wall.position.x=offset;skin.add(wall);});
    var left=buildRectWall(skinP,"mansard","left",p.levels[1].elevation,p.structure.kneeWall,materials.plaster),right=buildRectWall(skinP,"mansard","right",p.levels[1].elevation,p.structure.kneeWall,materials.plaster),front=buildGableWall(skinP,"mansard","front",p.levels[1].elevation,materials.plaster),back=buildGableWall(skinP,"mansard","back",p.levels[1].elevation,materials.plaster);left.position.x=-offset;right.position.x=offset;front.position.z=-offset;back.position.z=offset;skin.add(left,right,front,back);skin.visible=!config||config.facade!=="prepared";return skin;
  }

  function addExteriorDetails(group,p,config){
    var W=p.source.footprint[0],L=p.source.footprint[1],base=p.structure.plinth,facadeSkin=addFacadeSkin(group,p,config),terraceDeck=groupNamed("terrace-deck"),terracePergola=groupNamed("terrace-pergola"),cladding=groupNamed("facade-cladding"),balcony=groupNamed("balcony");group.add(terraceDeck,terracePergola,cladding,balcony);
    if(p.exteriorDetails){var targets={terraceDeck:terraceDeck,terracePergola:terracePergola,cladding:cladding,balcony:balcony,other:group};Object.keys(targets).forEach(function(key){(p.exteriorDetails[key]||[]).forEach(function(item){var size=item.size||[1,1,1],pos=item.position||[0,0,0],material=materials[item.material]||materials.wood,m=box(size[0],size[1],size[2],material,pos[0],pos[1],pos[2]);if(item.rotation)m.rotation.set(item.rotation[0]||0,item.rotation[1]||0,item.rotation[2]||0);targets[key].add(m);});});return {facadeSkin:facadeSkin,terraceDeck:terraceDeck,terracePergola:terracePergola,cladding:cladding};}
    terraceDeck.add(box(5.4,.16,2.2,materials.wood,-.65,.08,L/2+1.05));
    for(var i=0;i<5;i++)terracePergola.add(box(.13,2.45,.13,materials.wood,-2.5+i*1.22,1.22,L/2+2.0));
    for(var j=0;j<4;j++)terracePergola.add(box(5.2,.11,.12,materials.wood,-.65,2.1+j*.13,L/2+2.0));
    balcony.add(box(2.45,.16,1.0,materials.wood,.25,3.45,-L/2-.5));
    for(var r=0;r<7;r++)balcony.add(box(.045,.8,.045,materials.rail,-.75+r*.34,3.88,-L/2-.98));
    balcony.add(box(2.45,.06,.06,materials.wood,.25,4.27,-L/2-.98));
    cladding.add(box(W*.47,1.15,.055,materials.wood,-W*.235,base+1.05,-L/2-.23));
    for(var f=0;f<7;f++)cladding.add(box(W*.47,.014,.066,materials.woodJoint,-W*.235,base+.55+f*.16,-L/2-.27));
    cladding.add(box(1.05,1.48,.062,materials.stone,1.05,base+1.08,-L/2-.235));
    cladding.add(box(.055,1.1,L*.48,materials.wood,W/2+.23,base+1.05,L*.13));
    for(var q=0;q<7;q++)cladding.add(box(.066,.014,L*.48,materials.woodJoint,W/2+.27,base+.55+q*.16,L*.13));
    cladding.add(box(.062,1.35,1.15,materials.stone,W/2+.235,base+1.08,-L*.22));
    return {facadeSkin:facadeSkin,terraceDeck:terraceDeck,terracePergola:terracePergola,cladding:cladding};
  }

  function build(p,config){
    var rootGroup=groupNamed(p.id),foundation=groupNamed("foundation"),ground=groupNamed("level-ground"),groundShell=groupNamed("ground-shell"),groundStructure=groupNamed("ground-structure"),groundInterior=groupNamed("ground-interior"),groundPartitions=groupNamed("ground-partitions"),groundFinish=groupNamed("ground-finish"),groundDoors=groupNamed("ground-doors"),groundFurniture=groupNamed("ground-furniture"),mansard=groupNamed("level-mansard"),mansardShell=groupNamed("mansard-shell"),mansardStructure=groupNamed("mansard-structure"),mansardInterior=groupNamed("mansard-interior"),mansardPartitions=groupNamed("mansard-partitions"),mansardFinish=groupNamed("mansard-finish"),mansardDoors=groupNamed("mansard-doors"),mansardFurniture=groupNamed("mansard-furniture"),roof=groupNamed("roof"),details=groupNamed("details"),engineering=groupNamed("engineering"),openings=groupNamed("openings"),groundOpenings=groupNamed("openings-ground"),mansardOpenings=groupNamed("openings-mansard"),W=p.source.footprint[0],L=p.source.footprint[1];
    groundInterior.add(groundPartitions,groundFinish,groundDoors,groundFurniture);mansardInterior.add(mansardPartitions,mansardFinish,mansardDoors,mansardFurniture);ground.add(groundShell,groundStructure,groundInterior);mansard.add(mansardShell,mansardStructure,mansardInterior);openings.add(groundOpenings,mansardOpenings);rootGroup.add(foundation,ground,mansard,roof,details,engineering,openings);
    ["front","back","left","right"].forEach(function(w){groundShell.add(buildRectWall(p,"ground",w,p.levels[0].elevation,p.structure.groundWallHeight,materials.wallCore));});
    mansardShell.add(buildRectWall(p,"mansard","left",p.levels[1].elevation,p.structure.kneeWall,materials.wallCore));mansardShell.add(buildRectWall(p,"mansard","right",p.levels[1].elevation,p.structure.kneeWall,materials.wallCore));
    mansardShell.add(buildGableWall(p,"mansard","front",p.levels[1].elevation,materials.wallCore));mansardShell.add(buildGableWall(p,"mansard","back",p.levels[1].elevation,materials.wallCore));
    addPartitions(groundPartitions,p,p.levels[0],config);addPartitions(mansardPartitions,p,p.levels[1],config);addFloorFinish(groundFinish,p,p.levels[0],config);addFloorFinish(mansardFinish,p,p.levels[1],config);addInteriorDoors(groundDoors,p,p.levels[0],config);addInteriorDoors(mansardDoors,p,p.levels[1],config);addFurniture(groundFurniture,p,p.levels[0],config);addFurniture(mansardFurniture,p,p.levels[1],config);
    groundStructure.add(box(W-.5,.18,L-.5,materials.slab,0,p.levels[0].elevation-.09,0));addInterlevelStructure(mansardStructure,p,config);addStair(groundStructure,p);addFoundation(foundation,p,config);addEngineering(engineering,p,config);
    p.openings.forEach(function(o){addOpeningVisual(o.level==="ground"?groundOpenings:mansardOpenings,p,o,p.levels.find(function(l){return l.id===o.level;}).elevation);});
    addRoof(roof,p);var exteriorDetails=addExteriorDetails(details,p,config);
    rootGroup.userData={foundation:foundation,ground:ground,groundShell:groundShell,groundStructure:groundStructure,groundInterior:groundInterior,groundPartitions:groundPartitions,groundFinish:groundFinish,groundDoors:groundDoors,groundFurniture:groundFurniture,mansard:mansard,mansardShell:mansardShell,mansardStructure:mansardStructure,mansardInterior:mansardInterior,mansardPartitions:mansardPartitions,mansardFinish:mansardFinish,mansardDoors:mansardDoors,mansardFurniture:mansardFurniture,roof:roof,details:details,facadeSkin:exteriorDetails.facadeSkin,engineering:engineering,openings:openings,groundOpenings:groundOpenings,mansardOpenings:mansardOpenings,terraceDeck:exteriorDetails.terraceDeck,terracePergola:exteriorDetails.terracePergola,cladding:exteriorDetails.cladding};return rootGroup;
  }

  function validate(p){
    var errors=[];
    p.openings.forEach(function(o){
      var len=wallLength(p,o.wall),edge=.38;
      if(o.width<.55)errors.push({id:o.id,message:"Проём уже допустимого минимума."});
      if(Math.abs(o.center)+o.width/2>len/2-edge)errors.push({id:o.id,message:"До угла стены нужно оставить не менее 380 мм."});
      if(o.level==="mansard"){
        var openingTop=o.sill+o.height,available;
        if(o.wall==="front"||o.wall==="back"){
          var outerEdge=Math.max(Math.abs(o.center-o.width/2),Math.abs(o.center+o.width/2));
          available=p.structure.kneeWall+(p.source.footprint[0]/2-outerEdge)*Math.tan(p.structure.roofPitch*Math.PI/180);
        }else available=p.structure.kneeWall;
        if(openingTop>available-.08)errors.push({id:o.id,message:"Верх проёма пересекает скат кровли. Сдвиньте его к коньку или уменьшите высоту."});
      }
    });
    p.openings.forEach(function(a,i){p.openings.slice(i+1).forEach(function(b){if(a.level===b.level&&a.wall===b.wall&&Math.abs(a.center-b.center)<(a.width+b.width)/2+.3){var message="Между соседними проёмами нужно оставить простенок 300 мм.";errors.push({id:a.id,message:message});errors.push({id:b.id,message:message});}});});
    return {valid:errors.length===0,errors:errors,checks:12-errors.length};
  }

  function quantities(p){
    var W=p.source.footprint[0],L=p.source.footprint[1],per=2*(W+L),wallGross=per*(p.structure.groundWallHeight+p.structure.kneeWall)+W*(W/2*Math.tan(p.structure.roofPitch*Math.PI/180)),glazing=0;
    p.openings.forEach(function(o){glazing+=o.width*o.height;});
    var wallNet=Math.max(0,wallGross-glazing),computedRoof=2*(L+2*p.structure.roofOverhangGable)*(W/2+p.structure.roofOverhangSide)/Math.cos(p.structure.roofPitch*Math.PI/180);
    var costs={foundation:p.source.footprintArea*16000,walls:wallNet*12800,slab:p.source.footprintArea*2100,roof:p.source.roofArea*7400,openings:glazing*26000,facade:wallNet*3800,engineering:p.source.usefulArea*1900};
    var total=Object.keys(costs).reduce(function(s,k){return s+costs[k];},0);
    return {footprint:p.source.footprintArea,wallGross:wallGross,wallNet:wallNet,glazing:glazing,roofComputed:computedRoof,roofPublished:p.source.roofArea,usefulArea:p.source.usefulArea,costs:costs,total:total};
  }

  function applyAppearance(config){
    var wallMaps={aerated:textures.aerated,arbolit:textures.arbolit,frame:textures.frameCore},wallColors={aerated:0xf2eee5,arbolit:0xe6d2b7,frame:0xd8b88d},preparedColors={aerated:0xd5d2c7,arbolit:0xb89c77,frame:0xc9aa82};
    var frame={premium:0x5a3422,standard:0xe4e0d8};
    materials.wallCore.color.setHex(config.facade==="prepared"?(preparedColors[config.walls]||preparedColors.aerated):(wallColors[config.walls]||wallColors.aerated));materials.wallCore.map=wallMaps[config.walls]||textures.aerated;materials.wallCore.needsUpdate=true;
    materials.plaster.color.setHex(config.facade==="prepared"?0xc9cbc6:0xf5f1e9);materials.plaster.map=config.facade==="prepared"?null:textures.stucco;materials.plaster.needsUpdate=true;
    materials.roof.color.setHex(0xffffff);materials.roof.map=config.roofCover==="metal"?textures.roofMetal:(config.roofCover==="soft"?textures.roofSoft:textures.roofTile);materials.roof.needsUpdate=true;
    materials.frame.color.setHex(frame[config.windows]||frame.premium);materials.glass.color.setHex(config.windows==="standard"?0xd7e1df:0xffffff);materials.glass.opacity=config.windows==="standard"?.64:.78;
    materials.interior.color.setHex(config.interior==="turnkey"?0xf1e9dc:(config.interior==="prefinish"?0xf7f5f0:0xb8b3aa));materials.stair.color.setHex(config.slab==="beams"?0xa8754d:0xb58a63);
  }

  var kit={box:box,cylinder:cylinder,groupNamed:groupNamed,materials:materials,wallLength:wallLength,wallOpenings:wallOpenings};
  function adapterFor(p){return p.geometryAdapter&&G.GeometryAdapters&&G.GeometryAdapters[p.geometryAdapter];}
  function requiredAdapter(p){var adapter=adapterFor(p);if(p.geometryMode==="custom-adapter"&&!adapter)throw new Error("Geometry adapter is not loaded: "+p.geometryAdapter);return adapter;}
  function buildDispatch(p,config){var adapter=requiredAdapter(p);return adapter&&adapter.build?adapter.build(p,config,kit):build(p,config);}
  function validateDispatch(p){var adapter=requiredAdapter(p);return adapter&&adapter.validate?adapter.validate(p,kit):validate(p);}
  function quantitiesDispatch(p){var adapter=requiredAdapter(p);return adapter&&adapter.quantities?adapter.quantities(p,kit):quantities(p);}
  function planSvgDispatch(p,levelId,config){var adapter=adapterFor(p);return adapter&&adapter.planSvg?adapter.planSvg(p,levelId,config,kit):null;}
  G.EngineKit=kit;
  G.Engine={build:buildDispatch,validate:validateDispatch,quantities:quantitiesDispatch,planSvg:planSvgDispatch,applyAppearance:applyAppearance,materials:materials};
})(window);
