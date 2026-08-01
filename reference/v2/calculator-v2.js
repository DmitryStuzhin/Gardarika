(function () {
  "use strict";
  var G=window.GardarikaV2,T=window.THREE,project=G.cloneProject(),engine=G.Engine,config=JSON.parse(JSON.stringify(G.originalProject.package.defaults));
  var canvas=document.getElementById("modelCanvas"),panel=canvas.parentElement;
  var scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.1,120),renderer=new T.WebGLRenderer({canvas:canvas,antialias:true,alpha:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.setClearColor(0x000000,0);
  camera.position.set(10.5,10,-22);
  var controls=new T.OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=10;controls.maxDistance=35;controls.maxPolarAngle=Math.PI*.48;controls.target.set(0,3.1,0);
  scene.add(new T.HemisphereLight(0xeaf4f5,0x6f785e,.68));var sun=new T.DirectionalLight(0xffedd0,1.62);sun.position.set(-9,15,-8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-15;sun.shadow.camera.right=15;sun.shadow.camera.top=15;sun.shadow.camera.bottom=-15;sun.shadow.bias=-.00015;scene.add(sun);
  var fill=new T.DirectionalLight(0xb8d5de,.38);fill.position.set(10,8,12);scene.add(fill);

  var site=new T.Group();scene.add(site);
  var groundMat=new T.MeshStandardMaterial({color:0x91a87e,roughness:1}),pathMat=new T.MeshStandardMaterial({color:0xb0aca4,roughness:1});
  var ground=new T.Mesh(new T.CylinderGeometry(16,17,.32,64),groundMat);ground.position.y=-.22;ground.receiveShadow=true;site.add(ground);
  var soilTopMat=new T.MeshStandardMaterial({color:0x7c654c,roughness:1}),soilSideMat=new T.MeshStandardMaterial({color:0x66513d,roughness:1}),soilVisual=new T.Group();soilVisual.name="selected-soil-profile";site.add(soilVisual);
  var soilTop=new T.Mesh(new T.BoxGeometry(10.4,.16,12.7),soilTopMat);soilTop.position.y=.02;soilTop.receiveShadow=true;soilVisual.add(soilTop);
  var soilBody=new T.Mesh(new T.BoxGeometry(10.4,.72,12.7),soilSideMat);soilBody.position.y=-.42;soilBody.receiveShadow=true;soilVisual.add(soilBody);
  var soilBand=new T.Mesh(new T.BoxGeometry(10.44,.08,12.74),new T.MeshStandardMaterial({color:0xd8c39d,roughness:1}));soilBand.position.y=-.24;soilVisual.add(soilBand);soilVisual.visible=false;
  function siteBox(w,h,d,m,x,y,z){var o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;site.add(o);return o;}
  siteBox(2.3,.08,8.5,pathMat,6.0,.01,-3.3);siteBox(5.6,.09,2.5,pathMat,-.5,.02,6.2);
  var trunkMat=new T.MeshStandardMaterial({color:0x64503b,roughness:1}),leafMat=new T.MeshStandardMaterial({color:0x506f4d,roughness:.96}),leafLightMat=new T.MeshStandardMaterial({color:0x6e8960,roughness:.96});
  var treeLayout=project.id==="lento-100"?[[-8.7,-6,1.05],[-9,5,.78],[7,5,1.05],[8,-1,.72],[-7.5,8,.62]]:[[-7,-6,1.2],[-8,2,.8],[7,5,1.05],[8,-1,.72],[-6,7,.62]];
  treeLayout.forEach(function(v,i){var trunk=new T.Mesh(new T.CylinderGeometry(.16,.23,2.2,8),trunkMat);trunk.position.set(v[0],1,v[1]);trunk.castShadow=true;site.add(trunk);[[-.38,0,.08],[.38,.12,-.08],[0,.48,0]].forEach(function(o,j){var crown=new T.Mesh(new T.SphereGeometry((.86-j*.06)*v[2],14,10),j===1?leafLightMat:leafMat);crown.scale.set(1.1,1.28,.98);crown.position.set(v[0]+o[0]*v[2],2.45+o[1]*v[2],v[1]+o[2]);crown.castShadow=true;site.add(crown);});});
  var bushLayout=project.id==="lento-100"?[[-7.8,-4.5],[4.7,2.8],[-7.9,6.2],[3.8,5.35],[6.2,-2.6]]:[[-4.7,-4.1],[4.7,2.8],[-3.8,5.2],[3.8,5.35],[-5.1,1.8]];
  bushLayout.forEach(function(v,i){for(var j=0;j<3;j++){var bush=new T.Mesh(new T.SphereGeometry(.32+j*.04,10,7),j%2?leafLightMat:leafMat);bush.scale.y=.72;bush.position.set(v[0]+j*.38,.24,v[1]+(j%2)*.22);bush.castShadow=true;site.add(bush);}});
  var carMat=new T.MeshStandardMaterial({color:0x4b5554,roughness:.42,metalness:.12});siteBox(1.75,.5,3.8,carMat,6.0,.36,-5.1);var cabin=siteBox(1.55,.58,1.9,carMat,6.0,.83,-5.25);cabin.rotation.x=.02;

  var model=null,currentView="exterior",mode="original",selectedOpening=null,pendingFrame=0,renderActive=true;
  var buildActive=false,buildStep=0,siteSoil=project.site.defaultSoil,lastBuildFocusStep=-1,buildInteriorFloor="ground";
  function dim(value,digits){return Number(value).toLocaleString("ru-RU",{minimumFractionDigits:digits,maximumFractionDigits:digits});}
  function footprintText(){return dim(project.source.footprint[0],2)+" × "+dim(project.source.footprint[1],2)+" м";}
  function hydrateProjectMeta(){
    document.title=project.name+" — Калькулятор V2 · Гардарика";
    document.querySelectorAll("[data-project-name]").forEach(function(el){el.textContent=project.name;});
    document.querySelectorAll("[data-project-width]").forEach(function(el){el.textContent=dim(project.source.footprint[0],2);});
    document.querySelectorAll("[data-project-length]").forEach(function(el){el.textContent=dim(project.source.footprint[1],2);});
    document.querySelectorAll("[data-project-height]").forEach(function(el){el.textContent=dim(project.source.totalHeight,2);});
    document.querySelectorAll("[data-project-area]").forEach(function(el){el.textContent=dim(project.source.usefulArea,2);});
    document.querySelectorAll("[data-project-footprint-area]").forEach(function(el){el.textContent=dim(project.source.footprintArea,2);});
    document.querySelectorAll("[data-project-roof-area]").forEach(function(el){el.textContent=dim(project.source.roofArea,2);});
    document.querySelectorAll("[data-project-pitch]").forEach(function(el){el.textContent=dim(project.structure.roofPitch,0)+"°";});
    document.querySelectorAll("[data-project-footprint]").forEach(function(el){el.textContent=footprintText();});
    document.querySelectorAll("[data-project-kneewall]").forEach(function(el){el.textContent=dim(project.structure.kneeWall,2)+" м";});
    document.querySelectorAll("[data-project-type]").forEach(function(el){el.textContent=project.visual&&project.visual.projectType||"Дом с жилой мансардой";});
    document.querySelectorAll("[data-project-upper-name]").forEach(function(el){el.textContent=project.visual&&project.visual.upperLevelName||"жилая мансарда";});
    document.querySelectorAll("[data-project-upper-short]").forEach(function(el){el.textContent=project.visual&&project.visual.upperLevelShort||"Мансарда";});
    document.querySelectorAll("[data-project-upper-code]").forEach(function(el){el.textContent=project.visual&&project.visual.upperLevelCode||"М";});
    document.querySelectorAll("[data-project-upper-note]").forEach(function(el){el.textContent=project.visual&&project.visual.upperLevelNote||"внутри кровли · коленная стена";});
    panel.setAttribute("aria-label","Трёхмерная модель "+project.name);
  }
  var BUILD_STAGES=[
    {id:"site",kicker:"Подготовка",title:"Участок и грунт",description:"Начинаем не с картинки, а с основания: грунт определяет подготовку площадки, требования к фундаменту и точность сметы."},
    {id:"foundation",group:"foundation",kicker:"Основание",title:"Фундамент",description:"Выберите конструкцию основания. Пятно дома остаётся "+footprintText()+", меняются технология и стоимость."},
    {id:"walls",group:"walls",kicker:"Коробка",title:"Стены первого этажа",description:"Возводим внешний контур "+project.name+". Материал можно заменить, не меняя форму и положение проёмов."},
    {id:"slab",group:"slab",kicker:"Связь уровней",title:"Перекрытие и лестница",description:"Перекрытие связывает этажи, а лестничный проём остаётся точно на своём месте."},
    {id:"mansard",kicker:"Архитектура",title:"Жилая мансарда",description:"Поднимаем второй уровень внутри кровли — это не прямоугольная надстройка, а исходная геометрия "+project.name+"."},
    {id:"roofCover",group:"roofCover",kicker:"Силуэт",title:"Кровля "+dim(project.structure.roofPitch,0)+"°",description:"Выберите покрытие. Скаты, свесы и высота "+dim(project.source.totalHeight,2)+" м защищены и не смогут вылезти за стены."},
    {id:"windows",group:"windows",kicker:"Свет",title:"Окна и двери",description:"Добавляем исходные проёмы проекта. После сборки их можно безопасно адаптировать с проверкой пересечений."},
    {id:"facade",groups:["facade","terrace"],kicker:"Облик",title:"Фасад и терраса",description:"Настройте степень готовности фасада и террасы — архитектурный силуэт останется прежним."},
    {id:"engineering",group:"engineering",kicker:"Комфорт",title:"Инженерия",description:"Определите, что выполнить сразу: полный комплект, базовую разводку или только вводы."},
    {id:"layout",group:"layout",kicker:"Сценарий жизни",title:"Планировка",description:"Оставьте авторскую планировку или закажите адаптацию комнат, сохранив лестницу и несущую схему."},
    {id:"interior",group:"interior",kicker:"Готовность",title:"Внутренняя отделка",description:"Последний и самый заметный резерв бюджета: сравните готовый меблированный этаж, white box и пустую коробку. Верхний уровень обставлен в том же стиле."}
  ];
  function disposeObject(obj){obj.traverse(function(n){if(n.geometry)n.geometry.dispose();});}
  function rebuild(){
    if(model){scene.remove(model);disposeObject(model);}engine.applyAppearance(config);model=engine.build(project,config);model.userData.facadeSkin.visible=config.facade!=="prepared";model.userData.terraceDeck.visible=config.terrace!=="later";model.userData.terracePergola.visible=config.terrace==="full";model.userData.cladding.visible=config.facade==="clinker";scene.add(model);applyView(currentView,false);if(buildActive)applyBuildVisibility();updateData();
  }
  function scheduleRebuild(){if(pendingFrame)return;pendingFrame=requestAnimationFrame(function(){pendingFrame=0;rebuild();});}

  function setVisible(o,v){if(o)o.visible=v;}
  function applyView(view,animate){
    currentView=view;if(!model)return;var u=model.userData;u.ground.position.y=0;u.mansard.position.y=0;u.mansardOpenings.position.y=0;u.roof.position.y=0;u.details.position.y=0;
    [u.foundation,u.ground,u.groundShell,u.groundStructure,u.groundInterior,u.groundPartitions,u.groundFinish,u.groundDoors,u.groundFurniture,u.mansard,u.mansardShell,u.mansardStructure,u.mansardInterior,u.mansardPartitions,u.mansardFinish,u.mansardDoors,u.mansardFurniture,u.roof,u.details,u.openings,u.groundOpenings,u.mansardOpenings].forEach(function(o){setVisible(o,true);});setVisible(u.engineering,false);
    if(view==="exterior"){controls.target.set(0,3.1,0);document.getElementById("viewTitle").textContent="Точная внешняя форма";document.getElementById("viewHint").textContent="Тяните, чтобы повернуть · колесо — масштаб";}
    if(view==="ground"){setVisible(u.mansard,false);setVisible(u.roof,false);setVisible(u.details,false);setVisible(u.mansardOpenings,false);controls.target.set(0,1.2,0);if(animate)camera.position.set(.5,18.5,-2.2);document.getElementById("viewTitle").textContent="Первый этаж · исходное пятно "+footprintText();document.getElementById("viewHint").textContent="Кровля и верхний уровень скрыты, лестничный проём сохранён";}
    if(view==="mansard"){setVisible(u.foundation,false);setVisible(u.ground,false);setVisible(u.groundOpenings,false);setVisible(u.roof,false);setVisible(u.details,false);controls.target.set(0,4.15,0);if(animate)camera.position.set(.5,18.8,-2.2);document.getElementById("viewTitle").textContent=project.visual&&project.visual.upperViewTitle||"Мансарда внутри фактической кровли";document.getElementById("viewHint").textContent=project.visual&&project.visual.upperViewHint||"Коленные стены и скаты не заменены прямоугольным этажом";}
    if(view==="explode"){setVisible(u.details,false);u.mansard.position.y=1.2;u.mansardOpenings.position.y=1.2;u.roof.position.y=2.6;controls.target.set(0,4.1,0);document.getElementById("viewTitle").textContent="Связи уровней и кровли";document.getElementById("viewHint").textContent="Разнесённый вид: первый этаж не меняет габарит";}
    document.querySelectorAll("[data-view]").forEach(function(b){b.setAttribute("aria-pressed",b.dataset.view===view?"true":"false");});controls.update();updateSoilVisual();
  }

  function applyBuildVisibility(){
    if(!model||!buildActive)return;var u=model.userData,s=buildStep;
    u.ground.position.y=0;u.mansard.position.y=0;u.mansardOpenings.position.y=0;u.roof.position.y=0;u.details.position.y=0;
    setVisible(u.foundation,s>=1);setVisible(u.ground,true);setVisible(u.groundShell,s>=2);setVisible(u.groundStructure,s>=3);setVisible(u.groundInterior,s>=9);
    setVisible(u.mansard,true);setVisible(u.mansardShell,s>=4);setVisible(u.mansardStructure,s>=3);setVisible(u.mansardInterior,s>=9);
    setVisible(u.groundPartitions,s>=9);setVisible(u.mansardPartitions,s>=9);setVisible(u.groundDoors,s>=9);setVisible(u.mansardDoors,s>=9);setVisible(u.groundFinish,s>=10);setVisible(u.mansardFinish,s>=10);setVisible(u.groundFurniture,s>=10);setVisible(u.mansardFurniture,s>=10);
    setVisible(u.roof,s>=5);setVisible(u.openings,s>=6);setVisible(u.groundOpenings,s>=6);setVisible(u.mansardOpenings,s>=6);setVisible(u.details,s>=7);setVisible(u.engineering,s===8);
    if(s===9){setVisible(u.mansard,false);setVisible(u.mansardOpenings,false);setVisible(u.roof,false);setVisible(u.details,false);}
    if(s===10){setVisible(u.roof,false);setVisible(u.details,false);if(buildInteriorFloor==="ground"){setVisible(u.mansard,false);setVisible(u.mansardOpenings,false);}else{setVisible(u.foundation,false);setVisible(u.ground,false);setVisible(u.groundOpenings,false);setVisible(u.mansard,true);setVisible(u.mansardOpenings,true);}}
    updateSoilVisual();var soil=project.site.soils.find(function(item){return item.id===siteSoil;});
    document.getElementById("viewTitle").textContent=s===0?"Грунт: "+soil.name:(s===1?"Фундамент · "+soil.name:BUILD_STAGES[s].title+" · "+project.name);
    document.getElementById("viewHint").textContent=s===0?"Выберите грунт — на следующем шаге увидите требования к основанию":"Дом появляется по этапам, форма проекта остаётся связанной";
  }
  function focusBuildStage(){if(lastBuildFocusStep===buildStep)return;lastBuildFocusStep=buildStep;if(buildStep===9){camera.position.set(.5,18.5,-2.2);controls.target.set(0,1.2,0);}else if(buildStep===10){camera.position.set(.5,buildInteriorFloor==="mansard"?18.8:18.5,-2.2);controls.target.set(0,buildInteriorFloor==="mansard"?4.15:1.2,0);}else if(buildStep<=1){camera.position.set(10.5,8.5,-20);controls.target.set(0,.5,0);}else{camera.position.set(10.5,10,-22);controls.target.set(0,3.1,0);}controls.update();}
  function updateSoilVisual(){var palette={sand:[0xc7b384,0xa28c61,0xe1d2ae],loam:[0x80684e,0x604a37,0xb79871],clay:[0xa86748,0x784633,0xc68b65],peat:[0x4b3b2d,0x2f261f,0x725844],unknown:[0x88837a,0x66635d,0xaaa59c]},colors=palette[siteSoil]||palette.unknown;soilTopMat.color.setHex(colors[0]);soilSideMat.color.setHex(colors[1]);soilBand.material.color.setHex(colors[2]);soilVisual.visible=buildActive&&buildStep<=1;}

  function resetCamera(){camera.position.set(10.5,10,-22);controls.target.set(0,3.1,0);controls.update();}
  function resize(){var w=panel.clientWidth,h=panel.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(panel);resize();
  function render(){requestAnimationFrame(render);if(!renderActive||document.hidden)return;controls.update();renderer.render(scene,camera);}render();
  new IntersectionObserver(function(entries){renderActive=entries[0].isIntersecting;},{threshold:.01}).observe(panel);

  function fmt(n,d){return n.toLocaleString("ru-RU",{minimumFractionDigits:d||0,maximumFractionDigits:d||0});}
  function rub(n){return fmt(Math.round(n/1000)*1000)+" ₽";}
  function selectedOption(group){return group.options.find(function(o){return o.id===config[group.id];})||group.options[0];}
  function currentSoil(){return project.site.soils.find(function(soil){return soil.id===siteSoil;})||project.site.soils[0];}
  function foundationAdjustment(optionId){var soil=currentSoil();return soil.adjustments&&soil.adjustments[optionId]||0;}
  function foundationNote(option){var soil=currentSoil();return soil.foundationNotes&&soil.foundationNotes[option.id]||option.warning||option.tag||"";}
  function effectiveOptionPrice(group,option){return option.price+(group.id==="foundation"?foundationAdjustment(option.id):0);}
  function packagePrice(){
    var pack=project.package,q=engine.quantities(project),baseQ=engine.quantities(G.originalProject),lines=[{id:"fixed",name:pack.fixed.name,option:"Обязательная часть",price:pack.fixed.price}],total=pack.fixed.price;
    pack.groups.forEach(function(group){var option=selectedOption(group),price=effectiveOptionPrice(group,option);if(group.id==="windows")price*=q.glazing/baseQ.glazing;price=Math.round(price/1000)*1000;lines.push({id:group.id,name:group.name,option:option.name+(group.id==="foundation"&&foundationAdjustment(option.id)?" · подготовка основания":""),price:price});total+=price;});
    return {total:total,lines:lines,saving:pack.cataloguePrice-total};
  }
  function packageIsDefault(){return project.package.groups.every(function(g){return config[g.id]===project.package.defaults[g.id];});}
  function savingText(amount){if(amount>0)return "Экономия "+rub(amount);if(amount<0)return "Дороже на "+rub(Math.abs(amount));return "Без изменений";}
  function renderPackage(){
    var pack=project.package,base=pack.defaults;
    document.getElementById("packageGroups").innerHTML=pack.groups.map(function(group){
      var current=selectedOption(group),defaultOption=group.options.find(function(o){return o.id===base[group.id];});
      return '<section class="package-group"><div class="package-group-head"><div><h2>'+group.name+'</h2><p>'+(group.note||"")+'</p></div><output>'+rub(effectiveOptionPrice(group,current))+'</output></div><div class="package-options" role="group" aria-label="'+group.name+'">'+group.options.map(function(option){var delta=effectiveOptionPrice(group,option)-defaultOption.price,deltaText=delta===0?'цена проекта':(delta>0?'+':'−')+rub(Math.abs(delta)),soilWarning=group.id==="foundation"&&currentSoil().foundationNotes,note=group.id==="foundation"?foundationNote(option):(option.warning||option.tag||'');return '<button class="package-option" type="button" data-package-group="'+group.id+'" data-package-option="'+option.id+'" aria-pressed="'+(current.id===option.id)+'"><span>'+option.name+'</span><strong>'+deltaText+'</strong>'+(note?'<small data-tone="'+(option.warning||soilWarning?'warn':'base')+'">'+(option.tag&&!soilWarning?'<em class="option-tag">'+option.tag+'</em>':note)+'</small>':'')+'</button>';}).join('')+'</div></section>';
    }).join('');
  }
  function updatePrices(){
    var pricing=packagePrice(),pack=project.package,text=savingText(pricing.saving);
    ["navPrice","packageTotal","estimateTotal","footerPrice"].forEach(function(id){document.getElementById(id).textContent=rub(pricing.total);});
    document.getElementById("cataloguePrice").textContent=rub(pack.cataloguePrice);document.getElementById("packageSaving").textContent=text;document.getElementById("estimateSaving").textContent=text+" относительно каталожной комплектации";
    document.getElementById("costList").innerHTML=pricing.lines.map(function(line){var baseLine=line.id==="fixed"?pack.fixed.price:(pack.groups.find(function(g){return g.id===line.id;}).options.find(function(o){return o.id===pack.defaults[line.id];}).price),delta=line.price-baseLine;return '<div><dt>'+line.name+'<small>'+line.option+'</small></dt><dd class="'+(delta<0?'saving':'')+'">'+rub(line.price)+(delta?'<small>'+(delta>0?'+':'−')+rub(Math.abs(delta))+'</small>':'')+'</dd></div>';}).join('');
    var validation=engine.validate(project),status=document.getElementById("modelStatus");status.textContent=(pricing.saving>0?savingText(pricing.saving)+" · ":"")+(validation.valid?validation.checks+" проверок":"ошибка модели");status.parentElement.querySelector(".status-dot").style.background=validation.valid?"#5c8868":"#a54030";
    var live=document.getElementById("buildLivePrice");if(live)live.textContent=rub(pricing.total);
    if(buildActive)document.getElementById("navMode").textContent="сборка · шаг "+(buildStep+1);
    else document.getElementById("navMode").textContent=mode==="adapt"?"своя комплектация":(packageIsDefault()?"оригинал":"своя комплектация");
  }
  function updateData(){
    var validation=engine.validate(project),q=engine.quantities(project),status=document.getElementById("modelStatus");status.textContent=validation.valid?validation.checks+" проверок пройдено":"Найдена ошибка геометрии";
    status.parentElement.querySelector(".status-dot").style.background=validation.valid?"#5c8868":"#a54030";
    document.getElementById("openingCount").textContent=project.openings.length+" проёмов";
    document.getElementById("quantityList").innerHTML=[
      ["Пятно застройки",fmt(q.footprint,2)+" м²","опубликовано"],
      ["Наружные стены",fmt(q.wallNet,1)+" м²","нетто, из геометрии"],
      ["Окна и двери",fmt(q.glazing,1)+" м²","из всех фасадов"],
      ["Кровля",fmt(q.roofPublished,0)+" м²","паспорт проекта"],
      ["Кровля по модели",fmt(q.roofComputed,1)+" м²","контрольная величина"],
      ["Полезная площадь",fmt(q.usefulArea,2)+" м²","опубликовано"]
    ].map(function(r){return "<div><dt>"+r[0]+"</dt><dd>"+r[1]+"<small>"+r[2]+"</small></dd></div>";}).join("");
    updatePrices();
    if(selectedOpening)showOpeningValidation(validation);
  }

  function planSvg(levelId){
    var adapterPlan=engine.planSvg&&engine.planSvg(project,levelId,config);if(adapterPlan)return adapterPlan;
    var level=project.levels.find(function(l){return l.id===levelId;}),W=project.source.footprint[0],L=project.source.footprint[1],pad=25,vw=410,vh=520,s=Math.min((vw-pad*2)/W,(vh-pad*2)/L),ox=vw/2,oz=vh/2;
    function X(x){return (ox+x*s).toFixed(1);}function Z(z){return (oz+z*s).toFixed(1);}
    var out=['<svg viewBox="0 0 '+vw+' '+vh+'" aria-hidden="true">','<rect class="outer" x="'+X(-W/2)+'" y="'+Z(-L/2)+'" width="'+(W*s).toFixed(1)+'" height="'+(L*s).toFixed(1)+'" rx="1"/>'];
    var planPartitions=config.layout!=="custom"?level.partitions:(level.adaptedPartitions||level.partitions);
    planPartitions.forEach(function(p){out.push('<line class="part" x1="'+X(p[0])+'" y1="'+Z(p[1])+'" x2="'+X(p[2])+'" y2="'+Z(p[3])+'"/>');});
    if(levelId==="mansard"){var v=project.stairVoid;out.push('<rect class="void" x="'+X(v.x-v.width/2)+'" y="'+Z(v.z-v.depth/2)+'" width="'+(v.width*s).toFixed(1)+'" height="'+(v.depth*s).toFixed(1)+'"/>');}
    else{var v2=project.stairVoid;out.push('<rect class="stair" x="'+X(v2.x-v2.width/2)+'" y="'+Z(v2.z-v2.depth/2)+'" width="'+(v2.width*s).toFixed(1)+'" height="'+(v2.depth*s).toFixed(1)+'"/>');for(var j=1;j<10;j++)out.push('<line class="part" x1="'+X(v2.x-v2.width/2)+'" y1="'+Z(v2.z-v2.depth/2+v2.depth*j/10)+'" x2="'+X(v2.x+v2.width/2)+'" y2="'+Z(v2.z-v2.depth/2+v2.depth*j/10)+'"/>');}
    project.openings.filter(function(o){return o.level===levelId;}).forEach(function(o){var a=o.center-o.width/2,b=o.center+o.width/2;if(o.wall==="front")out.push('<line class="opening" x1="'+X(a)+'" y1="'+Z(-L/2)+'" x2="'+X(b)+'" y2="'+Z(-L/2)+'"/>');if(o.wall==="back")out.push('<line class="opening" x1="'+X(a)+'" y1="'+Z(L/2)+'" x2="'+X(b)+'" y2="'+Z(L/2)+'"/>');if(o.wall==="left")out.push('<line class="opening" x1="'+X(-W/2)+'" y1="'+Z(a)+'" x2="'+X(-W/2)+'" y2="'+Z(b)+'"/>');if(o.wall==="right")out.push('<line class="opening" x1="'+X(W/2)+'" y1="'+Z(a)+'" x2="'+X(W/2)+'" y2="'+Z(b)+'"/>');});
    level.rooms.forEach(function(r){var x=r.box[0]+r.box[2]/2,z=r.box[1]+r.box[3]/2;if(r.stair)return;out.push('<text class="room-name" text-anchor="middle" x="'+X(x)+'" y="'+Z(z)+'" font-size="8.5">'+r.name+'</text><text class="room-area" text-anchor="middle" x="'+X(x)+'" y="'+(parseFloat(Z(z))+11)+'" font-size="7.5">'+fmt(r.area,2)+' м²</text>');});
    out.push('<text x="'+X(0)+'" y="15" text-anchor="middle" font-size="9" font-weight="700">'+dim(W,2)+' м</text><text x="8" y="'+Z(0)+'" text-anchor="middle" font-size="9" font-weight="700" transform="rotate(-90 8 '+Z(0)+')">'+dim(L,2)+' м</text></svg>');return out.join("");
  }
  function showPlan(level){document.getElementById("planDrawing").innerHTML=planSvg(level);document.getElementById("planDrawing").setAttribute("aria-label",level==="ground"?"План первого этажа":"План "+((project.visual&&project.visual.upperLevelName)||"мансарды"));document.querySelectorAll("[data-plan]").forEach(function(b){b.setAttribute("aria-pressed",b.dataset.plan===level?"true":"false");});}

  function optionDelta(group,option){var base=group.options.find(function(o){return o.id===project.package.defaults[group.id];}),d=effectiveOptionPrice(group,option)-base.price;return d===0?"цена проекта":(d>0?"+":"−")+rub(Math.abs(d));}
  function groupOptionsHtml(group){return '<section class="builder-group"><div class="package-group-head"><div><h2>'+group.name+'</h2><p>'+(group.note||"")+'</p></div></div><div class="build-options" role="group" aria-label="'+group.name+'">'+group.options.map(function(option){var note=group.id==="foundation"?foundationNote(option):(option.warning||option.tag||"");return '<button class="build-option" type="button" data-build-group="'+group.id+'" data-build-option="'+option.id+'" aria-pressed="'+(config[group.id]===option.id)+'"><span>'+option.name+'</span><strong>'+optionDelta(group,option)+'</strong>'+(note?'<small>'+note+'</small>':'')+'</button>';}).join('')+'</div></section>';}
  function renderBuilderStage(){
    if(!buildActive)return;var stage=BUILD_STAGES[buildStep],options=document.getElementById("buildOptions");
    document.getElementById("buildStepLabel").textContent="Шаг "+(buildStep+1)+" из "+BUILD_STAGES.length;document.getElementById("buildProgressBar").style.width=((buildStep+1)/BUILD_STAGES.length*100)+"%";document.getElementById("buildKicker").textContent=stage.kicker;document.getElementById("buildTitle").textContent=stage.title;document.getElementById("buildDescription").textContent=stage.description;
    if(stage.id==="site")options.innerHTML=project.site.soils.map(function(soil){return '<button class="build-option" type="button" data-soil="'+soil.id+'" aria-pressed="'+(siteSoil===soil.id)+'"><span>'+soil.name+'</span><strong>'+(soil.id===project.site.defaultSoil?'рекомендуем':'')+'</strong><small>'+soil.note+'</small></button>';}).join('');
    else if(stage.id==="mansard")options.innerHTML='<div class="build-locked"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16 8-10 8 10M7 16v4h10v-4M12 10v10"/></svg><div><strong>Связанная геометрия проекта</strong><p>'+((project.visual&&project.visual.upperStructuralSummary)||('Коленная стена '+dim(project.structure.kneeWall,2)+' м, общая высота '+dim(project.source.totalHeight,2)+' м и лестничный проём восстановлены как единый узел.'))+' Этот этап нельзя случайно сломать настройками.</p></div></div>';
    else {var ids=stage.groups||[stage.group],groupsMarkup=ids.map(function(id){return groupOptionsHtml(project.package.groups.find(function(g){return g.id===id;}));}).join('');options.innerHTML=(stage.id==="interior"?'<div class="builder-floor-toggle" role="group" aria-label="Этаж интерьера"><button type="button" data-build-floor="ground" aria-pressed="'+(buildInteriorFloor==="ground")+'">Первый этаж</button><button type="button" data-build-floor="mansard" aria-pressed="'+(buildInteriorFloor==="mansard")+'">'+((project.visual&&project.visual.upperLevelShort)||'Мансарда')+'</button></div>':'')+groupsMarkup;}
    document.getElementById("buildPrev").textContent=buildStep===0?"Отменить":"Назад";document.getElementById("buildNext").textContent=buildStep===BUILD_STAGES.length-1?"Завершить адаптацию":"Следующий этап";document.querySelector(".inspector").dataset.buildStep=String(buildStep+1);applyBuildVisibility();focusBuildStage();updatePrices();
  }
  function resetProject(){project=G.cloneProject();config=JSON.parse(JSON.stringify(project.package.defaults));siteSoil=project.site.defaultSoil;selectedOpening=null;populateOpenings();renderPackage();showPlan("ground");}
  function setModeButtons(next){document.querySelectorAll("[data-mode]").forEach(function(b){b.setAttribute("aria-pressed",b.dataset.mode===next?"true":"false");});}
  function setEditorLock(){var locked=mode!=="adapt";document.getElementById("adaptLock").hidden=!locked;document.getElementById("openingEditor").hidden=locked;if(!locked&&!selectedOpening)selectOpening(project.openings[0].id);}
  function beginBuild(){resetProject();mode="adapt";buildActive=true;buildStep=0;lastBuildFocusStep=-1;buildInteriorFloor="ground";currentView="exterior";setModeButtons("adapt");document.getElementById("buildFlow").hidden=false;document.querySelector(".tabs").hidden=true;document.querySelectorAll("[data-panel]").forEach(function(p){p.hidden=true;});document.getElementById("handoff").hidden=true;document.querySelectorAll("[data-view]").forEach(function(b){b.disabled=true;});rebuild();resetCamera();renderBuilderStage();document.querySelector(".inspector").scrollIntoView({block:"start",behavior:"smooth"});}
  function leaveBuild(showEstimate){buildActive=false;document.getElementById("buildFlow").hidden=true;document.querySelector(".tabs").hidden=false;document.getElementById("handoff").hidden=false;document.querySelectorAll("[data-view]").forEach(function(b){b.disabled=false;});delete document.querySelector(".inspector").dataset.buildStep;setEditorLock();applyView("exterior",false);tab(showEstimate?"estimate":"project");updatePrices();}
  function cancelBuild(){resetProject();mode="original";setModeButtons("original");leaveBuild(false);rebuild();toast("Вернулись к исходному проекту "+project.name);}
  function completeBuild(){leaveBuild(true);toast("Адаптация собрана — смета обновлена");}
  function setMode(next){if(next==="adapt"){if(mode==="adapt")return;beginBuild();return;}if(buildActive){cancelBuild();return;}if(mode==="adapt"||next==="original"){resetProject();mode="original";setModeButtons("original");setEditorLock();rebuild();tab("project");toast("Вернулись к исходному проекту "+project.name);}}
  function populateOpenings(){var select=document.getElementById("openingSelect");select.innerHTML=project.openings.map(function(o){return '<option value="'+o.id+'">'+o.label+' · '+(o.level==="ground"?"1 этаж":"мансарда")+'</option>';}).join("");}
  function selectOpening(id){selectedOpening=project.openings.find(function(o){return o.id===id;});if(!selectedOpening)return;var len=selectedOpening.wallLength||((selectedOpening.wall==="front"||selectedOpening.wall==="back")?project.source.footprint[0]:project.source.footprint[1]),edge=.38,maxOffset=len/2-selectedOpening.width/2-edge;document.getElementById("openingSelect").value=id;var wr=document.getElementById("openingWidth"),or=document.getElementById("openingOffset");wr.value=selectedOpening.width;or.min=(-maxOffset).toFixed(2);or.max=maxOffset.toFixed(2);or.value=selectedOpening.center;updateOpeningOutputs();showOpeningValidation(engine.validate(project));}
  function updateOpeningOutputs(){document.getElementById("openingWidthValue").textContent=fmt(parseFloat(document.getElementById("openingWidth").value),2)+" м";document.getElementById("openingOffsetValue").textContent=fmt(parseFloat(document.getElementById("openingOffset").value),2)+" м";}
  function showOpeningValidation(v){var el=document.getElementById("openingValidation"),err=v.errors.find(function(e){return selectedOpening&&e.id===selectedOpening.id;});el.dataset.state=err?"error":"valid";el.querySelector("strong").textContent=err?"Изменение невозможно":"Геометрия корректна";el.querySelector("small").textContent=err?err.message:"Проём помещается в стене и не пересекается с соседними.";el.querySelector("svg").innerHTML=err?'<path d="m6 6 8 8m0-8-8 8"/>':'<path d="m5 10 3 3 7-7"/>';}
  function changeOpening(){
    if(!selectedOpening)return;
    var oldWidth=selectedOpening.width,oldCenter=selectedOpening.center;
    selectedOpening.width=parseFloat(document.getElementById("openingWidth").value);
    selectedOpening.center=parseFloat(document.getElementById("openingOffset").value);
    updateOpeningOutputs();
    var candidate=engine.validate(project);
    showOpeningValidation(candidate);
    if(!candidate.valid){selectedOpening.width=oldWidth;selectedOpening.center=oldCenter;document.getElementById("openingWidth").value=oldWidth;document.getElementById("openingOffset").value=oldCenter;updateOpeningOutputs();return;}
    scheduleRebuild();showPlan(selectedOpening.level);
  }
  function resetOpenings(){var fresh=G.cloneProject();project.openings=fresh.openings;populateOpenings();selectOpening(project.openings[0].id);rebuild();showPlan("ground");toast("Окна возвращены к исходному проекту");}
  function previewChoice(groupId){
    if(buildActive||!model)return;var u=model.userData,group=project.package.groups.find(function(g){return g.id===groupId;}),option=group&&group.options.find(function(o){return o.id===config[groupId];});
    if(groupId==="foundation"){applyView("exterior",false);[u.ground,u.mansard,u.roof,u.details,u.openings,u.engineering].forEach(function(o){setVisible(o,false);});setVisible(u.foundation,true);updateSoilVisual();soilVisual.visible=true;document.getElementById("viewTitle").textContent="Фундамент · "+option.name;document.getElementById("viewHint").textContent="Показана выбранная конструкция на грунте «"+currentSoil().name+"»";return;}
    if(groupId==="walls"){applyView("exterior",false);setVisible(u.roof,false);setVisible(u.details,false);setVisible(u.openings,false);document.getElementById("viewTitle").textContent="Стены · "+option.name;document.getElementById("viewHint").textContent="Фактура материала показана на всей коробке";return;}
    if(groupId==="slab"){applyView("explode",false);setVisible(u.groundShell,false);setVisible(u.mansardShell,false);setVisible(u.roof,false);setVisible(u.details,false);setVisible(u.openings,false);setVisible(u.groundInterior,false);setVisible(u.mansardInterior,false);document.getElementById("viewTitle").textContent="Перекрытие · "+option.name;document.getElementById("viewHint").textContent="Лестничный проём остаётся свободным";return;}
    if(groupId==="engineering"){applyView("exterior",false);setVisible(u.mansard,false);setVisible(u.roof,false);setVisible(u.details,false);setVisible(u.openings,false);setVisible(u.engineering,true);document.getElementById("viewTitle").textContent="Инженерия · "+option.name;document.getElementById("viewHint").textContent="Цветом показаны вода, отопление и электрика";return;}
    if(groupId==="layout"||groupId==="interior"){applyView("ground",true);if(groupId==="layout"){setVisible(u.groundFurniture,false);setVisible(u.groundFinish,false);}document.getElementById("viewTitle").textContent=(groupId==="layout"?"Планировка · ":"Интерьер · ")+option.name;document.getElementById("viewHint").textContent=groupId==="layout"?"Перегородки и двери перестроены":"Степень готовности показана внутри первого этажа";return;}
    applyView("exterior",false);document.getElementById("viewTitle").textContent=group.name+" · "+option.name;document.getElementById("viewHint").textContent="Выбранный вариант применён к 3D-модели";
  }
  function choosePackage(groupId,optionId){config[groupId]=optionId;renderPackage();rebuild();if(groupId==="layout"){var planButton=document.querySelector('[data-plan][aria-pressed="true"]');showPlan(planButton?planButton.dataset.plan:"ground");}if(buildActive)renderBuilderStage();else{previewChoice(groupId);toast(groupId==="foundation"&&foundationAdjustment(optionId)?"Добавлена подготовка основания для выбранного грунта":"Стоимость пересчитана — 3D-модель обновлена");}}
  function resetPackage(){config=JSON.parse(JSON.stringify(project.package.defaults));renderPackage();rebuild();toast("Возвращена комплектация из каталога с учётом грунта");}
  function tab(name){document.querySelectorAll("[data-tab]").forEach(function(b){b.setAttribute("aria-selected",b.dataset.tab===name?"true":"false");});document.querySelectorAll("[data-panel]").forEach(function(p){p.hidden=p.dataset.panel!==name;});}
  function toast(text){var t=document.getElementById("toast");t.textContent=text;t.hidden=false;clearTimeout(t._timer);t._timer=setTimeout(function(){t.hidden=true;},2600);}

  document.querySelectorAll("[data-view]").forEach(function(b){b.addEventListener("click",function(){applyView(b.dataset.view,true);});});
  document.querySelectorAll("[data-level-jump]").forEach(function(b){b.addEventListener("click",function(){applyView(b.dataset.levelJump,true);window.scrollTo({top:0,behavior:"smooth"});});});
  document.querySelectorAll("[data-mode]").forEach(function(b){b.addEventListener("click",function(){setMode(b.dataset.mode);});});
  document.querySelectorAll("[data-tab]").forEach(function(b){b.addEventListener("click",function(){tab(b.dataset.tab);});});
  document.querySelectorAll("[data-plan]").forEach(function(b){b.addEventListener("click",function(){showPlan(b.dataset.plan);});});
  document.getElementById("packageGroups").addEventListener("click",function(e){var button=e.target.closest("[data-package-option]");if(button)choosePackage(button.dataset.packageGroup,button.dataset.packageOption);});
  document.getElementById("buildOptions").addEventListener("click",function(e){var floor=e.target.closest("[data-build-floor]"),soil=e.target.closest("[data-soil]"),option=e.target.closest("[data-build-option]");if(floor){buildInteriorFloor=floor.dataset.buildFloor;lastBuildFocusStep=-1;renderBuilderStage();return;}if(soil){siteSoil=soil.dataset.soil;renderPackage();renderBuilderStage();rebuild();return;}if(option&&!option.disabled)choosePackage(option.dataset.buildGroup,option.dataset.buildOption);});
  document.getElementById("buildPrev").addEventListener("click",function(){if(buildStep===0){cancelBuild();return;}buildStep--;renderBuilderStage();});
  document.getElementById("buildNext").addEventListener("click",function(){if(buildStep===BUILD_STAGES.length-1){completeBuild();return;}buildStep++;renderBuilderStage();});
  document.getElementById("resetCamera").addEventListener("click",resetCamera);document.getElementById("unlockAdapt").addEventListener("click",function(){setMode("adapt");});document.getElementById("openingSelect").addEventListener("change",function(e){selectOpening(e.target.value);});document.getElementById("openingWidth").addEventListener("input",changeOpening);document.getElementById("openingOffset").addEventListener("input",changeOpening);document.getElementById("resetOpenings").addEventListener("click",resetOpenings);document.getElementById("resetPackage").addEventListener("click",resetPackage);document.getElementById("requestEstimate").addEventListener("click",function(){tab("estimate");toast("Смета собрана из выбранной комплектации");});
  hydrateProjectMeta();populateOpenings();renderPackage();showPlan("ground");rebuild();
})();
