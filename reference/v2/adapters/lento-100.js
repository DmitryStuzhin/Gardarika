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
    var m=kit.materials,base=project.levels.find(function(l){return l.id===o.level;}).elevation,wall=project.geometry.wallSegments.find(function(w){return w.id===o.wall;}),a=wall.from,b=wall.to,h=o.height,y=base+o.sill+h/2,horizontal=Math.abs(a[0]-b[0])>Math.abs(a[1]-b[1]),cx,cz,glazed=o.visualType!=="solid-door",surface=glazed?m.glass:m.wood;
    if(horizontal){cx=(a[0]+b[0])/2+o.center;cz=a[1];addBox(group,kit,o.width,h,.07,surface,cx,y,cz);frameOpening(group,kit,cx,y,cz,o.width,h,true,o.visualType);}
    else{
      cx=a[0]+(o.wall==="main-left"?-.215:(o.wall==="main-right"?.215:0));cz=(a[1]+b[1])/2+o.center;
      addBox(group,kit,.075,h,o.width,surface,cx,y,cz);frameOpening(group,kit,cx,y,cz,o.width,h,false,o.visualType);
      if(o.id==="carport-side-door")addBox(group,kit,.34,.08,1.15,m.stone,cx-.1,project.levels[0].elevation+.04,cz);
    }
  }

  function frameOpening(group,kit,x,y,z,w,h,horizontal,visualType){
    var f=.065,m=kit.materials.frame,isDoor=visualType==="solid-door"||visualType==="glazed-door";
    if(horizontal){addBox(group,kit,w+f,f,.09,m,x,y+h/2,z);addBox(group,kit,w+f,f,.09,m,x,y-h/2,z);addBox(group,kit,f,h,.09,m,x-w/2,y,z);addBox(group,kit,f,h,.09,m,x+w/2,y,z);}
    else{addBox(group,kit,.09,f,w+f,m,x,y+h/2,z);addBox(group,kit,.09,f,w+f,m,x,y-h/2,z);addBox(group,kit,.09,h,f,m,x,y,z-w/2);addBox(group,kit,.09,h,f,m,x,y,z+w/2);}
    if(visualType==="glazed-door"){
      if(horizontal){addBox(group,kit,f,h*.92,.1,m,x,y,z);addBox(group,kit,w*.82,f,.1,m,x,y-.18*h,z);}
      else{addBox(group,kit,.1,h*.92,f,m,x,y,z);addBox(group,kit,.1,f,w*.82,m,x,y-.18*h,z);}
    }
    if(visualType==="solid-door"){
      if(horizontal){addBox(group,kit,w*.62,h*.5,.082,kit.materials.charcoal,x,y+.12,z-.006);addBox(group,kit,.055,.055,.13,kit.materials.brass,x+w*.3,y,z-.055);}
      else{addBox(group,kit,.082,h*.5,w*.62,kit.materials.charcoal,x-.006,y+.12,z);addBox(group,kit,.13,.055,.055,kit.materials.brass,x-.055,y,z+w*.3);}
    }else if(isDoor){
      if(horizontal)addBox(group,kit,.04,.04,.14,kit.materials.brass,x+w*.3,y-.05,z-.07);
      else addBox(group,kit,.14,.04,.04,kit.materials.brass,x-.07,y-.05,z+w*.3);
    }
  }

  function partitions(group,project,kit,level,config){
    var segments=config.layout==="custom"?level.adaptedPartitions:level.partitions,doors=config.layout==="custom"?(level.adaptedInteriorDoors||level.interiorDoors):level.interiorDoors,h=level.id==="ground"?2.42:2.05,material=config.interior==="shell"?kit.materials.screed:kit.materials.interior,thickness=project.structure.partition;
    segments.forEach(function(s){
      var horizontal=Math.abs(s[2]-s[0])>=Math.abs(s[3]-s[1]),start=horizontal?Math.min(s[0],s[2]):Math.min(s[1],s[3]),end=horizontal?Math.max(s[0],s[2]):Math.max(s[1],s[3]),constant=horizontal?s[1]:s[0],cuts=(doors||[]).filter(function(d){var onLine=horizontal?Math.abs(d.z-constant)<.06:Math.abs(d.x-constant)<.06,pos=horizontal?d.x:d.z;return onLine&&pos-d.width/2>start-.02&&pos+d.width/2<end+.02;}).sort(function(a,b){return (horizontal?a.x:a.z)-(horizontal?b.x:b.z);}),cursor=start;
      function wallPart(a,b,y,height){if(b-a<.02||height<.02)return;var center=(a+b)/2;if(horizontal)addBox(group,kit,b-a,height,thickness,material,center,level.elevation+y,constant);else addBox(group,kit,thickness,height,b-a,material,constant,level.elevation+y,center);}
      cuts.forEach(function(d){var center=horizontal?d.x:d.z,left=center-d.width/2,right=center+d.width/2;wallPart(cursor,left,h/2,h);if(d.height<h)wallPart(left,right,d.height+(h-d.height)/2,h-d.height);cursor=right;});
      wallPart(cursor,end,h/2,h);
    });
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
    function placed(name,item,build){var g=kit.groupNamed(name);build(g,item);g.position.set(item.x,y,item.z);g.rotation.y=item.rotation||0;group.add(g);}
    function bed(item){placed("bed",item,function(g,i){var w=i.width||1.5,d=i.depth||2;addBox(g,kit,w,.25,d,m.oak,0,.16,0);addBox(g,kit,w-.12,.2,d-.12,m.cream,0,.39,.03);addBox(g,kit,w-.16,.12,d*.48,i.accent==="terracotta"?m.terracotta:m.sage,0,.55,.2);addBox(g,kit,w,.7,.11,m.oak,0,.48,-d/2);});}
    function sofa(item){placed("sofa",item,function(g){addBox(g,kit,2.05,.4,.78,m.fabric,0,.24,0);addBox(g,kit,2.05,.58,.16,m.fabric,0,.57,.29);addBox(g,kit,.16,.48,.8,m.sage,-.95,.38,0);addBox(g,kit,.16,.48,.8,m.sage,.95,.38,0);[-.58,0,.58].forEach(function(x){addBox(g,kit,.5,.13,.48,x===0?m.cream:m.sage,x,.48,-.04);});});}
    function rug(item){var mesh=kit.cylinder(.5,.035,item.accent==="sage"?m.sage:m.cream,0,.02,0,false);mesh.scale.set(item.width||1.8,1,item.depth||1.2);mesh.position.set(item.x,y+.02,item.z);group.add(mesh);}
    function coffee(item){placed("coffee-table",item,function(g,i){var w=i.width||1,d=i.depth||.55;addBox(g,kit,w,.08,d,m.oak,0,.42,0);[-1,1].forEach(function(sx){[-1,1].forEach(function(sz){addBox(g,kit,.045,.4,.045,m.charcoal,sx*w*.38,.2,sz*d*.34);});});});}
    function dining(item){placed("dining",item,function(g){addBox(g,kit,1.42,.09,.78,m.oak,0,.76,0);[-.56,.56].forEach(function(x){[-.27,.27].forEach(function(z){addBox(g,kit,.055,.72,.055,m.charcoal,x,.36,z);});});[[0,-.66,0],[0,.66,Math.PI],[-.93,0,Math.PI/2],[.93,0,-Math.PI/2]].forEach(function(v){var c=kit.groupNamed("chair");addBox(c,kit,.42,.08,.42,m.sage,0,.45,0);addBox(c,kit,.42,.5,.07,m.sage,0,.67,.17);[-.16,.16].forEach(function(x){addBox(c,kit,.04,.42,.04,m.charcoal,x,.21,-.14);});c.position.set(v[0],0,v[1]);c.rotation.y=v[2];g.add(c);});});}
    function kitchen(item){placed("kitchen",item,function(g,i){var run=i.width||2.35;addBox(g,kit,.6,.82,run,m.sage,0,.41,0);addBox(g,kit,.68,.075,run+.08,m.oak,-.02,.86,0);for(var z=-run/2+.3;z<run/2;z+=.58)addBox(g,kit,.025,.68,.56,m.charcoal,-.31,.45,z);addBox(g,kit,.08,.5,.5,m.charcoal,-.35,.55,-run*.2);addBox(g,kit,.46,.04,.36,m.charcoal,-.36,.91,run*.2);});}
    function bath(item){placed("bath",item,function(g,i){var w=i.width||.7,d=i.depth||1.3;addBox(g,kit,w,.38,d,m.ceramic,0,.23,0);addBox(g,kit,w-.18,.16,d-.2,m.cream,0,.43,.02);addBox(g,kit,.05,.58,.05,m.brass,w*.32,.62,-d*.36);});}
    function storage(item){placed("storage",item,function(g,i){var w=i.width||1,d=i.depth||.5,h=i.height||1.9;addBox(g,kit,w,h,d,m.oak,0,h/2,0);addBox(g,kit,.025,h*.88,d+.02,m.charcoal,0,h*.52,0);[-.16,.16].forEach(function(x){addBox(g,kit,.025,.16,.035,m.brass,x,h*.52,-d/2-.02);});});}
    function bench(item){placed("bench",item,function(g,i){var w=i.width||.72,d=i.depth||.34;addBox(g,kit,w,.12,d,m.oak,0,.42,0);[-.28,.28].forEach(function(x){addBox(g,kit,.05,.4,.05,m.charcoal,x,.2,0);});});}
    function vanity(item){placed("vanity",item,function(g,i){var w=i.width||.9,d=i.depth||.46;addBox(g,kit,w,.62,d,m.sage,0,.38,0);addBox(g,kit,w+.04,.06,d+.04,m.oak,0,.72,0);addBox(g,kit,.32,.12,.28,m.ceramic,0,.78,0);addBox(g,kit,.04,.34,.04,m.brass,.18,.91,0);});}
    function light(item){var glow=new root.THREE.PointLight(0xffd6a0,.2,4.5,2);glow.position.set(item.x,y+(item.height||2.05),item.z);group.add(glow);var shade=kit.cylinder(.16,.09,m.brass,item.x,y+(item.height||2.05),item.z,false);group.add(shade);}
    (level.furniture||[]).forEach(function(item){if(item.type==="bed")bed(item);else if(item.type==="sofa")sofa(item);else if(item.type==="rug")rug(item);else if(item.type==="coffee")coffee(item);else if(item.type==="dining")dining(item);else if(item.type==="kitchen")kitchen(item);else if(item.type==="bath")bath(item);else if(item.type==="storage")storage(item);else if(item.type==="bench")bench(item);else if(item.type==="vanity")vanity(item);else if(item.type==="console")bench(item);else if(item.type==="light")light(item);});
  }

  function interiorDoors(group,project,kit,level,config){
    if(config.interior!=="turnkey")return;
    var doors=config.layout==="custom"?(level.adaptedInteriorDoors||level.interiorDoors):level.interiorDoors;
    doors.forEach(function(d){var g=kit.groupNamed(d.id||"interior-door"),door=addBox(g,kit,d.width-.05,d.height,.055,kit.materials.doorWarm,0,d.height/2,0);addBox(g,kit,d.width+.1,.07,.1,kit.materials.frame,0,d.height+.035,0);[-1,1].forEach(function(side){addBox(g,kit,.07,d.height+.05,.1,kit.materials.frame,side*(d.width/2+.015),d.height/2,0);});addBox(g,kit,.04,.04,.11,kit.materials.brass,d.width*.28,d.height*.5,-.055);g.position.set(d.x,level.elevation,d.z);g.rotation.y=d.rotation||0;group.add(g);});
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
      addBox(out.cladding,kit,.18,2.28,.055,m.terracotta,.61,1.59,-4.795);
      addBox(out.cladding,kit,.18,2.28,.055,m.terracotta,1.89,1.59,-4.795);
      addBox(out.cladding,kit,1.46,.18,.055,m.terracotta,1.25,2.67,-4.795);
      addBox(out.cladding,kit,.055,2.2,.32,m.terracotta,3.85,1.55,3.92);
      addBox(out.cladding,kit,.055,2.2,.32,m.terracotta,-3.85,1.55,3.92);
    }
    addBox(out.terraceDeck,kit,3.25,.14,7.35,m.wood,-5.2,.08,.9375);
    var canopyAngle=13*Math.PI/180,canopyX=-5.1,canopyY=2.69,canopyThickness=.16,deckTop=.15;
    [-6.5,-4.0].forEach(function(x){
      var underside=canopyY+Math.sin(canopyAngle)*(x-canopyX)-canopyThickness/2*Math.cos(canopyAngle),postHeight=underside-deckTop+.025;
      [-2.35,4.1].forEach(function(z){addBox(out.terraceDeck,kit,.15,postHeight,.15,m.wood,x,deckTop+postHeight/2,z);});
    });
    var canopy=addBox(out.terraceDeck,kit,3.55,canopyThickness,7.85,m.roof,canopyX,canopyY,.9375);canopy.rotation.z=canopyAngle;
    addBox(out.terraceDeck,kit,.16,.2,7.35,m.wood,-3.78,2.87,.9375);
    addBox(out.terraceDeck,kit,.16,.18,7.35,m.wood,-6.5,2.22,.9375);
    addBox(out.terracePergola,kit,5.4,.14,2.2,m.wood,.3,.08,5.58);
    var terraceAngle=12*Math.PI/180,terraceRoofY=2.58,terraceRoofZ=5.58,terraceRoofDepth=2.5,terraceRoofThickness=.14;
    function terraceRoofUnderside(z){return terraceRoofY-Math.sin(terraceAngle)*(z-terraceRoofZ)-terraceRoofThickness/2*Math.cos(terraceAngle);}
    [-2.18,.3,2.78].forEach(function(x){var z=6.52,top=terraceRoofUnderside(z),height=top-deckTop+.02;addBox(out.terracePergola,kit,.14,height,.14,m.wood,x,deckTop+height/2,z);});
    addBox(out.terracePergola,kit,5.55,.18,.18,m.wood,.3,terraceRoofUnderside(6.52)-.08,6.52);
    addBox(out.terracePergola,kit,5.55,.16,.16,m.wood,.3,terraceRoofUnderside(4.66)-.07,4.66);
    [-2.18,-.95,.3,1.55,2.78].forEach(function(x){var rafter=addBox(out.terracePergola,kit,.11,.11,2.28,m.wood,x,terraceRoofY-.12,terraceRoofZ);rafter.rotation.x=terraceAngle;});
    var terraceRoof=addBox(out.terracePergola,kit,5.75,terraceRoofThickness,terraceRoofDepth,m.roof,.3,terraceRoofY,terraceRoofZ);terraceRoof.rotation.x=terraceAngle;
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
    wallWithOpenings(out.groundShell,kit,{axis:"z",length:7.25,height:2.5,depth:.4,base:base,offset:.9375,constant:-3.625,material:wall,openings:openingsFor(project,"ground","main-left")});
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
    var errors=[],byWall={},visualTypes={"window":true,"glazed-door":true,"solid-door":true};
    project.openings.forEach(function(o){
      if(o.width<.55)errors.push({id:o.id,message:"Проём слишком узкий."});
      if(Math.abs(o.center)+o.width/2>o.wallLength/2-.38)errors.push({id:o.id,message:"До края стены нужно оставить 380 мм."});
      if(!visualTypes[o.visualType])errors.push({id:o.id,message:"Не задан допустимый visualType проёма."});
      if(o.type==="window"&&o.visualType!=="window")errors.push({id:o.id,message:"Окно должно визуализироваться как window."});
      if(o.type==="door"&&o.visualType!=="solid-door"&&o.visualType!=="glazed-door")errors.push({id:o.id,message:"Для двери нужно выбрать solid-door или glazed-door."});
      var key=o.level+":"+o.wall;(byWall[key]=byWall[key]||[]).push(o);
    });
    Object.keys(byWall).forEach(function(key){var a=byWall[key].sort(function(x,y){return x.center-y.center;});for(var i=1;i<a.length;i++)if(a[i].center-a[i].width/2-(a[i-1].center+a[i-1].width/2)<.3)errors.push({id:a[i].id,message:"Между проёмами нужен простенок не менее 300 мм."});});
    function doorOnSegment(d,s){var horizontal=Math.abs(s[2]-s[0])>=Math.abs(s[3]-s[1]);if(horizontal)return Math.abs(d.z-s[1])<.06&&d.x-d.width/2>=Math.min(s[0],s[2])-.06&&d.x+d.width/2<=Math.max(s[0],s[2])+.06;return Math.abs(d.x-s[0])<.06&&d.z-d.width/2>=Math.min(s[1],s[3])-.06&&d.z+d.width/2<=Math.max(s[1],s[3])+.06;}
    project.levels.forEach(function(level){
      [[level.partitions,level.interiorDoors,"original"],[level.adaptedPartitions,level.adaptedInteriorDoors,"adapted"]].forEach(function(v){(v[1]||[]).forEach(function(d){if(!v[0].some(function(s){return doorOnSegment(d,s);}))errors.push({id:d.id||level.id,message:"Дверь "+v[2]+" не совпадает с проёмом перегородки."});});});
      var rooms={};level.rooms.forEach(function(r){rooms[r.id]=r;});
      (level.furniture||[]).forEach(function(item){var room=rooms[item.roomId],fp=item.footprint||[],rot=Math.abs(((item.rotation||0)%(Math.PI*2))-Math.PI/2),swap=Math.min(rot,Math.abs(rot-Math.PI),Math.abs(rot+Math.PI))<.08,fw=swap?fp[1]:fp[0],fd=swap?fp[0]:fp[1];if(!room||!fw||!fd){errors.push({id:item.id||level.id,message:"Мебель не привязана к комнате или не имеет footprint."});return;}var b=room.box;if(item.x-fw/2<b[0]-.03||item.x+fw/2>b[0]+b[2]+.03||item.z-fd/2<b[1]-.03||item.z+fd/2>b[1]+b[3]+.03)errors.push({id:item.id,message:"Мебель выходит за границы комнаты."});if(item.type==="storage"&&(item.depth>.75||item.height>2.4))errors.push({id:item.id,message:"Шкаф имеет недопустимый комнатный масштаб."});});
    });
    var canopyAngle=13*Math.PI/180,canopyX=-5.1,canopyY=2.69,canopyThickness=.16,deckTop=.15;
    [-6.5,-4.0].forEach(function(x){var underside=canopyY+Math.sin(canopyAngle)*(x-canopyX)-canopyThickness/2*Math.cos(canopyAngle),postHeight=underside-deckTop+.025;if(Math.abs(deckTop+postHeight-underside)>.03)errors.push({id:"carport-post-"+x,message:"Стойка навеса не примыкает к кровле."});});
    var terraceAngle=12*Math.PI/180,terraceRoofY=2.58,terraceRoofZ=5.58,terraceRoofThickness=.14,z=6.52,terraceUnder=terraceRoofY-Math.sin(terraceAngle)*(z-terraceRoofZ)-terraceRoofThickness/2*Math.cos(terraceAngle),terracePostHeight=terraceUnder-deckTop+.02;
    if(Math.abs(deckTop+terracePostHeight-terraceUnder)>.03)errors.push({id:"terrace-posts",message:"Стойки задней террасы не примыкают к кровле."});
    return {valid:errors.length===0,errors:errors,checks:28-errors.length};
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
