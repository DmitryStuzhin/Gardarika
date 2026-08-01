(function (root) {
  "use strict";
  var G = root.GardarikaV2 = root.GardarikaV2 || {};

  G.originalProject = {
    id: "lilia-105",
    name: "Lilia 105",
    version: 1,
    units: "m",
    source: {
      usefulArea: 104.58,
      footprintArea: 86.12,
      roofArea: 147,
      volume: 493,
      totalHeight: 8.14,
      minPlot: [15.2, 19.5],
      footprint: [8.2, 10.5],
      roofPitch: 40,
      confidence: {
        footprint: "published",
        roofPitch: "published",
        totalHeight: "published",
        openings: "traced-from-elevations",
        partitions: "traced-from-plans",
        kneeWall: "inferred-without-section"
      }
    },
    structure: {
      exteriorWall: 0.4,
      partition: 0.12,
      groundWallHeight: 2.8,
      slab: 0.25,
      kneeWall: 1.15,
      plinth: 0.45,
      roofPitch: 40,
      roofOverhangSide: 0.55,
      roofOverhangGable: 0.38
    },
    site: {
      defaultSoil:"loam",
      soils:[
        {id:"sand",name:"Песок",note:"Высокая несущая способность"},
        {id:"loam",name:"Суглинок",note:"Нужен дренаж и утеплённая отмостка"},
        {id:"clay",name:"Глина",note:"Сильно пучинистый грунт"},
        {id:"peat",name:"Торф",note:"Нужно специальное основание после геологии",adjustments:{slab:900000,strip:1150000,piles:0},foundationNotes:{slab:"Плита возможна после выторфовки или устройства искусственного основания",strip:"Лента — только по отдельному инженерному решению",piles:"Базовый вариант: сваи до плотного слоя"}},
        {id:"unknown",name:"Не знаю",note:"Добавим геологию перед расчётом"}
      ]
    },
    package: {
      cataloguePrice: 15000000,
      fixed: { name:"Проект, работы и логистика", price:1650000 },
      defaults: {foundation:"slab",walls:"aerated",slab:"concrete",roofCover:"ceramic",facade:"clinker",windows:"premium",engineering:"full",layout:"original",interior:"turnkey",terrace:"full"},
      groups: [
        {id:"foundation",name:"Фундамент",note:"Окончательный выбор — после геологии",options:[
          {id:"slab",name:"Монолитная плита",price:1550000,tag:"в проекте"},
          {id:"strip",name:"Лента",price:1280000},
          {id:"piles",name:"Сваи с ростверком",price:1000000,warning:"Нужен расчёт по геологии"}
        ]},
        {id:"walls",name:"Конструкция стен",note:"Форма и планировка не меняются",options:[
          {id:"aerated",name:"Газобетон 400 мм",price:2000000,tag:"в проекте"},
          {id:"arbolit",name:"Арболит 400 мм",price:2420000},
          {id:"frame",name:"Тёплый каркас",price:1720000,warning:"Пересчитаем узлы"}
        ]},
        {id:"slab",name:"Перекрытие и лестница",note:"Связывает первый этаж и мансарду",options:[
          {id:"concrete",name:"Монолитное перекрытие",price:900000,tag:"в проекте"},
          {id:"beams",name:"Деревянные балки",price:620000,warning:"Потребуется усиленная шумоизоляция"}
        ]},
        {id:"roofCover",name:"Покрытие кровли",note:"Угол 40° и силуэт сохраняются",options:[
          {id:"ceramic",name:"Керамическая черепица",price:1400000,tag:"в проекте"},
          {id:"soft",name:"Мягкая черепица",price:1050000},
          {id:"metal",name:"Фальцевая кровля",price:850000}
        ]},
        {id:"facade",name:"Фасад",note:"Меняется материал, не геометрия",options:[
          {id:"clinker",name:"Штукатурка + дерево",price:1250000,tag:"на визуализации"},
          {id:"plaster",name:"Штукатурка",price:760000},
          {id:"prepared",name:"Под отделку",price:350000}
        ]},
        {id:"windows",name:"Окна и двери",note:"Все проёмы остаются на местах",options:[
          {id:"premium",name:"Дерево-алюминий · панорама",price:1150000,tag:"в проекте"},
          {id:"standard",name:"ПВХ · ламинация",price:780000}
        ]},
        {id:"engineering",name:"Инженерия",note:"Можно выполнить после коробки",options:[
          {id:"full",name:"Под ключ",price:2000000,tag:"в проекте"},
          {id:"basic",name:"Базовый комплект",price:1200000},
          {id:"later",name:"Только вводы",price:420000}
        ]},
        {id:"layout",name:"Планировка",note:"Несущая схема и лестница остаются на местах",options:[
          {id:"original",name:"Планировка Lilia 105",price:0,tag:"в проекте"},
          {id:"custom",name:"Адаптация архитектором",price:450000,warning:"После интервью о сценариях жизни"}
        ]},
        {id:"interior",name:"Внутренняя отделка",note:"Главный резерв для снижения бюджета",options:[
          {id:"turnkey",name:"Готово к переезду",price:2500000,tag:"в проекте"},
          {id:"prefinish",name:"White box",price:1200000},
          {id:"shell",name:"Без отделки",price:350000}
        ]},
        {id:"terrace",name:"Терраса и пергола",note:"Дом остаётся пригодным для эксплуатации",options:[
          {id:"full",name:"Полная терраса",price:600000,tag:"в проекте"},
          {id:"base",name:"Только настил",price:300000},
          {id:"later",name:"Построить позже",price:0}
        ]}
      ]
    },
    stairVoid: { x: -0.65, z: -0.55, width: 2.15, depth: 3.55 },
    staircase: { steps: 11, rise: 0.2773, run: 3.55, width: 2.15, direction: "+z" },
    levels: [
      {
        id: "ground", name: "Первый этаж", elevation: 0.45,
        rooms: [
          { id:"living", name:"Гостиная", area:25.63, box:[-3.9,1.55,7.8,3.5] },
          { id:"kitchen", name:"Кухня", area:7.60, box:[1.25,-0.55,2.65,2.1] },
          { id:"hall", name:"Холл", area:9.25, box:[-0.45,-2.25,2.0,3.8] },
          { id:"stairs", name:"Лестница", area:4.85, box:[-2.2,-1.2,1.75,2.75], stair:true },
          { id:"guest", name:"Комната", area:6.83, box:[-3.9,-4.95,2.7,3.4] },
          { id:"bath", name:"Санузел", area:3.92, box:[1.55,-4.95,2.35,2.05] },
          { id:"utility", name:"Техническая", area:1.48, box:[2.85,-2.85,1.05,1.45] },
          { id:"vestibule", name:"Тамбур", area:3.31, box:[-0.2,-4.95,1.65,2.05] }
        ],
        partitions: [
          [-1.2,-5.05,-1.2,-1.55], [1.45,-5.05,1.45,-2.9],
          [-3.9,-1.55,-1.2,-1.55], [-1.2,-2.9,3.9,-2.9],
          [2.75,-2.9,2.75,-1.4], [0.95,-1.4,3.9,-1.4],
          [-2.25,-1.55,-2.25,1.55], [-2.25,1.55,0.9,1.55]
        ],
        adaptedPartitions: [[-1.2,-5.05,-1.2,-1.55],[1.45,-5.05,1.45,-2.9],[-3.9,-1.55,-1.2,-1.55],[-1.2,-2.9,3.9,-2.9],[2.75,-2.9,2.75,-1.4],[1.75,-1.4,3.9,-1.4],[-2.25,-1.55,-2.25,.25]]
      },
      {
        id: "mansard", name: "Жилая мансарда", elevation: 3.5,
        rooms: [
          { id:"bed1", name:"Спальня", area:8.35, box:[-3.45,-4.55,3.0,2.8] },
          { id:"bed2", name:"Спальня", area:9.17, box:[0.45,-4.55,3.0,2.8] },
          { id:"upperhall", name:"Холл", area:4.34, box:[-1.4,-1.75,2.8,2.7] },
          { id:"upperbath", name:"Ванная", area:3.84, box:[1.4,-1.75,2.05,2.4] },
          { id:"master", name:"Мастер-спальня", area:11.22, box:[-3.45,1.0,4.25,3.55] },
          { id:"wardrobe", name:"Гардероб", area:3.99, box:[0.8,1.0,2.65,2.25] }
        ],
        partitions: [
          [-0.35,-4.55,-0.35,-1.75], [-3.45,-1.75,-1.4,-1.75],
          [1.4,-1.75,3.45,-1.75], [0.8,1.0,0.8,4.55],
          [-3.45,1.0,-1.4,1.0], [1.4,0.65,3.45,0.65]
        ],
        adaptedPartitions: [[-.35,-4.55,-.35,-1.75],[-3.45,-1.75,-1.4,-1.75],[1.4,-1.75,3.45,-1.75],[1.35,.65,1.35,4.55],[-3.45,1,-1.4,1],[1.4,.65,3.45,.65]]
      }
    ],
    openings: [
      {id:"front-entry", label:"Входная дверь", level:"ground", wall:"front", type:"door", center:-0.25, width:1.05, height:2.2, sill:0},
      {id:"front-horizontal", label:"Окно кабинета", level:"ground", wall:"front", type:"window", center:-2.35, width:2.15, height:0.75, sill:1.15},
      {id:"front-upper", label:"Балконное окно", level:"mansard", wall:"front", type:"door", center:0.25, width:1.8, height:2.25, sill:0},
      {id:"rear-portal", label:"Портал гостиной", level:"ground", wall:"back", type:"window", center:-0.65, width:3.15, height:2.25, sill:0.12},
      {id:"rear-door", label:"Дверь на террасу", level:"ground", wall:"back", type:"door", center:2.45, width:1.05, height:2.25, sill:0},
      {id:"rear-upper-left", label:"Окно спальни слева", level:"mansard", wall:"back", type:"door", center:-1.85, width:1.3, height:2.05, sill:0.08},
      {id:"rear-upper-right", label:"Окно спальни справа", level:"mansard", wall:"back", type:"door", center:1.85, width:1.3, height:2.05, sill:0.08},
      {id:"left-kitchen", label:"Окно кухни", level:"ground", wall:"left", type:"window", center:1.65, width:2.25, height:0.8, sill:1.12},
      {id:"right-living", label:"Окно гостиной", level:"ground", wall:"right", type:"window", center:1.35, width:2.7, height:0.9, sill:1.02}
    ]
  };

  G.cloneProject = function () {
    return JSON.parse(JSON.stringify(G.originalProject));
  };
})(window);
