(function (root) {
  "use strict";
  var G=root.GardarikaV2=root.GardarikaV2||{};
  G.GeometryAdapters=G.GeometryAdapters||{};

  function layers(kit){
    var names=["foundation","ground","groundShell","groundStructure","groundInterior","groundPartitions","groundFinish","groundDoors","groundFurniture","mansard","mansardShell","mansardStructure","mansardInterior","mansardPartitions","mansardFinish","mansardDoors","mansardFurniture","roof","details","facadeSkin","engineering","openings","groundOpenings","mansardOpenings","terraceDeck","terracePergola","cladding"],out={};
    names.forEach(function(name){out[name]=kit.groupNamed(name);});
    out.groundInterior.add(out.groundPartitions,out.groundFinish,out.groundDoors,out.groundFurniture);
    out.mansardInterior.add(out.mansardPartitions,out.mansardFinish,out.mansardDoors,out.mansardFurniture);
    out.ground.add(out.groundShell,out.groundStructure,out.groundInterior);
    out.mansard.add(out.mansardShell,out.mansardStructure,out.mansardInterior);
    out.openings.add(out.groundOpenings,out.mansardOpenings);
    out.details.add(out.facadeSkin,out.terraceDeck,out.terracePergola,out.cladding);
    return out;
  }

  function addBox(group,kit,w,h,d,material,x,y,z,ry,rz){
    var mesh=kit.box(w,h,d,material,x,y,z);if(ry)mesh.rotation.y=ry;if(rz)mesh.rotation.z=rz;group.add(mesh);return mesh;
  }

  function openingsFor(project,level,wall,extra){
    var list=project.openings.filter(function(o){return o.level===level&&o.wall===wall;}).map(function(o){return Object.assign({},o);});
    return list.concat(extra||[]).sort(function(a,b){return a.center-b.center;});
  }

  function wallWithOpenings(group,kit,opts){
    var start=-opts.length/2,cursor=start,depth=opts.depth||.4,items=(opts.openings||[]).slice().sort(function(a,b){return a.center-b.center;});
    function part(length,height,along,y){
      if(length<=.015||height<=.015)return;
      if(opts.axis==="x")addBox(group,kit,length,height,depth,opts.material,opts.offset+along,opts.base+y,opts.constant);
      else addBox(group,kit,depth,height,length,opts.material,opts.constant,opts.base+y,opts.offset+along);
    }
    items.forEach(function(o){
      var left=o.center-o.width/2,right=o.center+o.width/2;
      part(left-cursor,opts.height,(cursor+left)/2,opts.height/2);
      if(o.sill>0)part(o.width,o.sill,o.center,o.sill/2);
      var top=o.sill+o.height;if(top<opts.height)part(o.width,opts.height-top,o.center,top+(opts.height-top)/2);
      cursor=right;
    });
    part(opts.length/2-cursor,opts.height,(cursor+opts.length/2)/2,opts.height/2);
  }

  function triangle(group,T,material,width,height,y,z,front){
    var shape=new T.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(0,height);shape.closePath();
    var geometry=new T.ShapeGeometry(shape),mesh=new T.Mesh(geometry,material);mesh.position.set(0,y,z);if(front)mesh.rotation.y=Math.PI;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }

  function openingVisual(group,project,kit,o){
    var m=kit.materials,base=project.levels.find(function(l){return l.id===o.level;}).elevation,wall=project.geometry.wallSegments.find(function(w){return w.id===o.wall;}),a=wall.from,b=wall.to,h=o.height,y=base+o.sill+h/2,horizontal=Math.abs(a[0]-b[0])>Math.abs(a[1]-b[1]),cx,cz;
    if(horizontal){cx=(a[0]+b[0])/2+o.center;cz=a[1];addBox(group,kit,o.width,h,.07,o.type==="door"?m.doorWarm:m.glass,cx,y,cz);frameOpening(group,kit,cx,y,cz,o.width,h,true);}
    else{cx=a[0];cz=(a[1]+b[1])/2+o.center;addBox(group,kit,.07,h,o.width,o.type==="door"?m.doorWarm:m.glass,cx,y,cz);frameOpening(group,kit,cx,y,cz,o.width,h,false);}
  }

  function frameOpening(group,kit,x,y,z,w,h,horizontal){
    var f=.065,m=kit.materials.frame;
    if(horizontal){addBox(group,kit,w+f,f,.09,m,x,y+h/2,z);addBox(group,kit,w+f,f,.09,m,x,y-h/2,z);addBox(group,kit,f,h,.09,m,x-w/2,y,z);addBox(group,kit,f,h,.09,m,x+w/2,y,z);}
    else{addBox(group,kit,.09,f,w+f,m,x,y+h/2,z);addBox(group,kit,.09,f,w+f,m,x,y-h/2,z);addBox(group,kit,.09,h,f,m,x,y,z-w/2);addBox(group,kit,.09,h,f,m,x,y,z+w/2);}
  }

  function partitions(group,project,kit,level,config){
    var segments=config.layout==="custom"?level.adaptedPartitions:level.partitions,h=level.id==="ground"?2.42:2.05,material=config.interior==="shell"?kit.materials.screed:kit.materials.interior;
    segments.forEach(function(s){var dx=s[2]-s[0],dz=s[3]-s[1],len=Math.sqrt(dx*dx+dz*dz),mesh=addBox(group,kit,len,h,project.structure.partition,material,(s[0]+s[2])/2,level.elevation+h/2,(s[1]+s[3])/2);mesh.rotation.y=-Math.atan2(dz,dx);});
  }

  function slabAroundVoid(group,project,kit,y,material){
    var W=7.25,L=7.25,cx=0,cz=.9375,v=project.stairVoid,t=.2,left=-W/2,right=W/2,front=cz-L/2,back=cz+L/2,vL=v.x-v.width/2,vR=v.x+v.width/2,vF=v.z-v.depth/2,vB=v.z+v.depth/2;
    addBox(group,kit,vL-left,t,L,material,(left+vL)/2,y,cz);addBox(group,kit,right-vR,t,L,material,(vR+right)/2,y,cz);addBox(group,kit,v.width,t,vF-front,material,v.x,y,(front+vF)/2);addBox(group,kit,v.width,t,back-vB,material,v.x,y,(vB+back)/2);
  }

  function stairs(group,project,kit){
    var s=project.staircase,v=project.stairVoid,n=s.steps,d=s.run/n;
    for(var i=0;i<n;i++){var h=s.rise*(i+1),z=v.z-s.run/2+d*(i+.5);addBox(group,kit,s.width,h,d+.015,kit.materials.stair,v.x,project.structure.plinth+h/2,z);}
  }

  function furniture(group,project,kit,level,config){
    if(config.interior!=="turnkey")return;var m=kit.materials,y=level.elevation+.08;
    function bed(x,z,rotation){var g=kit.groupNamed("bed");addBox(g,kit,1.55,.32,2.05,m.oak,0,.2,0);addBox(g,kit,1.43,.22,1.9,m.cream,0,.46,.04);addBox(g,kit,1.5,.7,.13,m.oak,0,.53,-.96);g.position.set(x,y,z);g.rotation.y=rotation||0;group.add(g);}
    function sofa(x,z,rotation){var g=kit.groupNamed("sofa");addBox(g,kit,2.1,.45,.78,m.fabric,0,.26,0);addBox(g,kit,2.1,.62,.18,m.fabric,0,.6,.3);addBox(g,kit,.18,.5,.8,m.sage,-.96,.4,0);addBox(g,kit,.18,.5,.8,m.sage,.96,.4,0);g.position.set(x,y,z);g.rotation.y=rotation||0;group.add(g);}
    function table(x,z){addBox(group,kit,1.55,.1,.82,m.oak,x,y+.76,z);[-.62,.62].forEach(function(dx){[-.28,.28].forEach(function(dz){addBox(group,kit,.07,.72,.07,m.charcoal,x+dx,y+.36,z+dz);});});}
    if(level.id==="ground"){
      sofa(-1.45,2.75,Math.PI/2);addBox(group,kit,1.05,.12,.58,m.oak,-.1,y+.38,2.75);table(1.85,2.55);
      addBox(group,kit,.62,.9,2.75,m.sage,3.12,y+.45,.8);addBox(group,kit,.72,.08,2.85,m.oak,3.06,y+.94,.8);
      addBox(group,kit,.72,.44,1.25,m.ceramic,.68,y+.24,-3.55);addBox(group,kit,1.0,.45,.38,m.oak,1.72,y+.25,-3.55);
    }else{
      bed(-1.85,2.5,0);bed(1.85,2.5,0);addBox(group,kit,.8,1.85,1.8,m.oak,2.75,y+.93,1.25);addBox(group,kit,.75,.42,1.35,m.ceramic,2.4,y+.25,-1.4);
    }
  }

  function interiorDoors(group,project,kit,level,config){
    if(config.interior!=="turnkey")return;
    level.interiorDoors.forEach(function(d){var door=addBox(group,kit,d.width,d.height,.075,kit.materials.doorWarm,d.x,level.elevation+d.height/2,d.z);door.rotation.y=d.rotation||0;});
  }

  function foundation(group,project,kit,config){
    var m=kit.materials.plasterWarm,kind=config.foundation;
    if(kind==="slab"){
      addBox(group,kit,7.6,.34,7.6,m,0,.17,.9375);addBox(group,kit,2.35,.34,2.15,m,1.25,.17,-3.625);addBox(group,kit,3.2,.22,7.3,m,-5.2,.11,.9375);return;
    }
    if(kind==="strip"){
      [-2.6875,4.5625].forEach(function(z){addBox(group,kit,7.55,.5,.46,m,0,.25,z);});[-3.625,3.625].forEach(function(x){addBox(group,kit,.46,.5,6.8,m,x,.25,.9375);});addBox(group,kit,2.3,.5,.42,m,1.25,.25,-4.5625);return;
    }
    for(var px=-3.1;px<=3.1;px+=2.05)for(var pz=-2.15;pz<=4.1;pz+=2.05){var pile=kit.cylinder(.15,.85,m,px,-.08,pz,false);group.add(pile);}
    addBox(group,kit,7.55,.34,.38,m,0,.34,-2.6875);addBox(group,kit,7.55,.34,.38,m,0,.34,4.5625);addBox(group,kit,.38,.34,6.87,m,-3.625,.34,.9375);addBox(group,kit,.38,.34,6.87,m,3.625,.34,.9375);
  }

  function roofs(out,project,kit){
    var pitch=25*Math.PI/180,run=3.625+.55,rise=run*Math.tan(pitch),slope=run/Math.cos(pitch),centerZ=.9375,depth=8.05,eave=6.93-rise,m=kit.materials.roof;
    var left=addBox(out.roof,kit,slope,.18,depth,m,-run/2,eave+rise/2,centerZ,0,pitch),right=addBox(out.roof,kit,slope,.18,depth,m,run/2,eave+rise/2,centerZ,0,-pitch);left.name="main-roof-left";right.name="main-roof-right";
    addBox(out.roof,kit,.16,.22,depth+.08,kit.materials.roofEdge,0,6.93,centerZ);
    var porch=addBox(out.roof,kit,2.55,.14,2.15,m,1.25,2.78,-3.72);porch.rotation.x=-10*Math.PI/180;
    addBox(out.roof,kit,.55,1.8,.62,kit.materials.chimney,2.1,5.95,1.35);addBox(out.roof,kit,.72,.1,.78,kit.materials.roofEdge,2.1,6.88,1.35);
  }

  function exterior(out,project,kit,config){
    var m=kit.materials;
    if(config.facade==="clinker"){
      addBox(out.cladding,kit,2.45,2.1,.055,m.terracotta,1.2,1.52,-4.795);addBox(out.cladding,kit,1.75,2.1,.055,m.terracotta,.15,1.52,4.79);addBox(out.cladding,kit,.055,1.2,2.0,m.terracotta,3.85,1.05,-.65);
    }
    addBox(out.terraceDeck,kit,3.25,.14,7.35,m.wood,-5.2,.08,.9375);
    [-6.45,-3.95].forEach(function(x){[-2.35,4.1].forEach(function(z){addBox(out.terraceDeck,kit,.14,2.25,.14,m.wood,x,1.12,z);});});
    var canopy=addBox(out.terraceDeck,kit,3.55,.16,7.85,m.roof,-5.1,2.7,.9375);canopy.rotation.z=-13*Math.PI/180;
    addBox(out.terracePergola,kit,5.2,.14,2.0,m.wood,.3,.08,5.55);for(var i=0;i<5;i++)addBox(out.terracePergola,kit,.12,2.25,.12,m.wood,-2+i*1.15,1.12,6.35);
  }

  function engineering(group,project,kit,config){
    var count=config.engineering==="full"?3:(config.engineering==="basic"?2:1),m=[kit.materials.utilityWater,kit.materials.utilityHeat,kit.materials.utilityPower];
    for(var i=0;i<count;i++){addBox(group,kit,3.1,.065,.07,m[i],4.95,.16+i*.09,.3+i*.26);group.add(kit.cylinder(.05,.8,m[i],3.55,.52,.3+i*.26,false));}
  }

  function build(project,config,kit){
    var T=root.THREE,out=layers(kit),model=kit.groupNamed(project.id),wall=kit.materials.wallCore,base=.45;
    model.add(out.foundation,out.ground,out.mansard,out.roof,out.details,out.engineering,out.openings);
    foundation(out.foundation,project,kit,config);

    wallWithOpenings(out.groundShell,kit,{axis:"x",length:7.25,height:2.5,depth:.4,base:base,offset:0,constant:-2.6875,material:wall,openings:openingsFor(project,"ground","main-front",[{center:1.25,width:1.05,height:2.1,sill:0}])});
    wallWithOpenings(out.groundShell,kit,{axis:"x",length:7.25,height:2.5,depth:.4,base:base,offset:0,constant:4.5625,material:wall,openings:openingsFor(project,"ground","main-back")});
    wallWithOpenings(out.groundShell,kit,{axis:"z",length:7.25,height:2.5,depth:.4,base:base,offset:.9375,constant:-3.625,material:wall,openings:[]});
    wallWithOpenings(out.groundShell,kit,{axis:"z",length:7.25,height:2.5,depth:.4,base:base,offset:.9375,constant:3.625,material:wall,openings:openingsFor(project,"ground","main-right")});
    wallWithOpenings(out.groundShell,kit,{axis:"x",length:2.1,height:2.25,depth:.4,base:base,offset:1.25,constant:-4.5625,material:wall,openings:openingsFor(project,"ground","vestibule-front")});
    wallWithOpenings(out.groundShell,kit,{axis:"z",length:1.875,height:2.25,depth:.4,base:base,offset:-3.625,constant:.2,material:wall,openings:[]});
    wallWithOpenings(out.groundShell,kit,{axis:"z",length:1.875,height:2.25,depth:.4,base:base,offset:-3.625,constant:2.3,material:wall,openings:[]});

    wallWithOpenings(out.mansardShell,kit,{axis:"x",length:7.25,height:2.14,depth:.4,base:3.1,offset:0,constant:-2.6875,material:wall,openings:openingsFor(project,"mansard","main-front")});
    wallWithOpenings(out.mansardShell,kit,{axis:"x",length:7.25,height:2.14,depth:.4,base:3.1,offset:0,constant:4.5625,material:wall,openings:openingsFor(project,"mansard","main-back")});
    wallWithOpenings(out.mansardShell,kit,{axis:"z",length:7.25,height:2.14,depth:.4,base:3.1,offset:.9375,constant:-3.625,material:wall,openings:[]});
    wallWithOpenings(out.mansardShell,kit,{axis:"z",length:7.25,height:2.14,depth:.4,base:3.1,offset:.9375,constant:3.625,material:wall,openings:openingsFor(project,"mansard","main-right")});
    triangle(out.mansardShell,T,wall,7.25,1.69,5.24,-2.895,true);triangle(out.mansardShell,T,wall,7.25,1.69,5.24,4.77,false);

    addBox(out.groundStructure,kit,7.0,.18,7.0,kit.materials.slab,0,.36,.9375);addBox(out.groundStructure,kit,1.85,.18,1.58,kit.materials.slab,1.25,.36,-3.625);
    if(config.slab==="beams")for(var z=-2.25;z<=4.15;z+=.52)addBox(out.mansardStructure,kit,6.85,.18,.12,kit.materials.oak,0,2.96,z);else slabAroundVoid(out.mansardStructure,project,kit,2.98,kit.materials.slab);
    stairs(out.groundStructure,project,kit);partitions(out.groundPartitions,project,kit,project.levels[0],config);partitions(out.mansardPartitions,project,kit,project.levels[1],config);
    if(config.interior!=="shell"){addBox(out.groundFinish,kit,6.72,.055,6.72,config.interior==="turnkey"?kit.materials.oak:kit.materials.screed,0,.49,.9375);slabAroundVoid(out.mansardFinish,project,kit,3.13,config.interior==="turnkey"?kit.materials.oak:kit.materials.screed);}
    interiorDoors(out.groundDoors,project,kit,project.levels[0],config);interiorDoors(out.mansardDoors,project,kit,project.levels[1],config);furniture(out.groundFurniture,project,kit,project.levels[0],config);furniture(out.mansardFurniture,project,kit,project.levels[1],config);
    project.openings.forEach(function(o){openingVisual(o.level==="ground"?out.groundOpenings:out.mansardOpenings,project,kit,o);});
    roofs(out,project,kit);exterior(out,project,kit,config);engineering(out.engineering,project,kit,config);
    model.userData=out;return model;
  }

  function validate(project){
    var errors=[],byWall={};
    project.openings.forEach(function(o){
      if(o.width<.55)errors.push({id:o.id,message:"Проём слишком узкий."});
      if(Math.abs(o.center)+o.width/2>o.wallLength/2-.38)errors.push({id:o.id,message:"До края стены нужно оставить 380 мм."});
      var key=o.level+":"+o.wall;(byWall[key]=byWall[key]||[]).push(o);
    });
    Object.keys(byWall).forEach(function(key){var a=byWall[key].sort(function(x,y){return x.center-y.center;});for(var i=1;i<a.length;i++)if(a[i].center-a[i].width/2-(a[i-1].center+a[i-1].width/2)<.3)errors.push({id:a[i].id,message:"Между проёмами нужен простенок не менее 300 мм."});});
    return {valid:errors.length===0,errors:errors,checks:16-errors.length};
  }

  function quantities(project){
    var glazing=project.openings.reduce(function(sum,o){return sum+o.width*o.height;},0),perimeter=4*7.25+2*(2.1+1.875),wallGross=perimeter*2.5+4*7.25*2.14+7.25*1.69,wallNet=Math.max(0,wallGross-glazing),roofMain=2*8.05*(4.175/Math.cos(25*Math.PI/180)),roofAux=29.5;
    return {footprint:project.source.footprintArea,wallGross:wallGross,wallNet:wallNet,glazing:glazing,roofComputed:roofMain+roofAux,roofPublished:project.source.roofArea,usefulArea:project.source.usefulArea,costs:{},total:0};
  }

  function planSvg(project,levelId,config){
    var level=project.levels.find(function(l){return l.id===levelId;}),parts=config.layout==="custom"?level.adaptedPartitions:level.partitions,s=39,ox=282,oz=235;
    function X(x){return (ox+x*s).toFixed(1);}function Z(z){return (oz+z*s).toFixed(1);}
    var a=['<svg viewBox="0 0 520 480" aria-hidden="true">','<rect class="outer" x="'+X(-3.625)+'" y="'+Z(-2.6875)+'" width="'+(7.25*s).toFixed(1)+'" height="'+(7.25*s).toFixed(1)+'"/>'];
    if(levelId==="ground"){a.push('<rect class="outer" x="'+X(.2)+'" y="'+Z(-4.5625)+'" width="'+(2.1*s).toFixed(1)+'" height="'+(1.875*s).toFixed(1)+'"/>','<rect class="void" x="'+X(-6.775)+'" y="'+Z(-2.6875)+'" width="'+(3.15*s).toFixed(1)+'" height="'+(7.25*s).toFixed(1)+'"/>');}
    parts.forEach(function(p){a.push('<line class="part" x1="'+X(p[0])+'" y1="'+Z(p[1])+'" x2="'+X(p[2])+'" y2="'+Z(p[3])+'"/>');});
    var v=project.stairVoid;a.push('<rect class="stair" x="'+X(v.x-v.width/2)+'" y="'+Z(v.z-v.depth/2)+'" width="'+(v.width*s).toFixed(1)+'" height="'+(v.depth*s).toFixed(1)+'"/>');
    level.rooms.forEach(function(r){if(r.stair)return;var x=r.box[0]+r.box[2]/2,z=r.box[1]+r.box[3]/2;a.push('<text class="room-name" text-anchor="middle" x="'+X(x)+'" y="'+Z(z)+'" font-size="8.5">'+r.name+'</text><text class="room-area" text-anchor="middle" x="'+X(x)+'" y="'+(parseFloat(Z(z))+11)+'" font-size="7.5">'+String(r.area).replace('.',',')+' м²</text>');});
    a.push('<text x="282" y="18" text-anchor="middle" font-size="9" font-weight="700">основной объём 7,25 × 7,25 м</text></svg>');return a.join('');
  }

  G.GeometryAdapters["lento-100"]={build:build,validate:validate,quantities:quantities,planSvg:planSvg};
})(window);
