/* Конструктор V3 · библиотека частей домов.
   Каждый дом — не цельная модель, а набор частей с «разъёмами»:
     core     — основной отапливаемый объём (обязателен, один);
     upper    — верхний уровень над основным объёмом (мансарда или этаж);
     roof     — система кровли основного объёма;
     annexes  — пристройки, которые стыкуются к стене основного объёма.
   Новый дом добавляется новым вызовом GC.registerHouse — код движка не меняется.
   Размеры: метры. Оси: x — ширина (запад → восток), z — глубина (фасад к улице −z → сад +z), y — вверх.
   Поле src у каждого значения: published — опубликовано в проекте, plan — снято с плана,
   inferred — выведено без разреза и должно быть проверено инженером. */
(function(root){
  "use strict";
  var GC = root.GC = root.GC || {};
  GC.houses = GC.houses || [];
  GC.registerHouse = function(h){ GC.houses.push(h); };

  /* ---------- Lento 100 ---------- */
  GC.registerHouse({
    id: "lento-100", name: "Lento 100", image: "assets/img/catalog/house-100.jpg",
    summary: "Компактный дом 100,9 м² со вторым этажом, тамбуром и навесом для машины",
    core: {
      id: "lento-100:core", label: "Основной объём Lento 100",
      w: 7.25, d: 7.25, wallH: 2.65, plinth: 0.45,
      src: {w: "published", d: "published", wallH: "published"},
      windows: {S: [[.28, 1.6, 1.5], [.74, 2.4, 2.1]], N: [[.3, 2.6, 2.1], [.75, 1.4, 1.5]], W: [[.5, 1.4, 1.5]], E: [[.35, 1.2, 1.5], [.72, 1.2, 1.5]]}
    },
    upper: {
      id: "lento-100:floor", type: "floor", label: "Второй этаж как у Lento 100",
      note: "вертикальные стены до карниза, 2 спальни и ванная наверху",
      wallH: 2.14, src: {wallH: "published"}
    },
    roof: {id: "lento-100:gable25", family: "gable", pitch: 25, label: "Двускатная 25° как у Lento 100", src: {pitch: "published"}},
    annexes: [
      {id: "lento-100:vestibule", kind: "vestibule", label: "Тамбур-вход (Lento 100)", note: "утеплённый тамбур 2,1 × 1,9 м перед входом",
       heated: true, along: 2.10, depth: 1.875, h: 2.25, roof: {family: "lean", pitch: 10}, sides: ["S"], align: "end",
       src: {along: "published", depth: "published"}},
      {id: "lento-100:carport", kind: "carport", label: "Навес для машины (Lento 100)", note: "открытый навес 3,15 × 7,25 м под односкатной кровлей",
       heated: false, along: 7.25, depth: 3.15, h: 2.65, roof: {family: "lean", pitch: 13}, sides: ["W", "E"], align: "start",
       src: {along: "published", depth: "published"}}
    ]
  });

  /* ---------- Lilia 105 ---------- */
  GC.registerHouse({
    id: "lilia-105", name: "Lilia 105", image: "assets/img/catalog/house-105.jpg",
    summary: "Классический дом 104,6 м² с жилой мансардой под кровлей 40°",
    core: {
      id: "lilia-105:core", label: "Основной объём Lilia 105",
      w: 8.2, d: 10.5, wallH: 2.8, plinth: 0.45,
      src: {w: "published", d: "published", wallH: "published"},
      windows: {S: [[.3, 1.5, 1.5], [.72, 1.1, 2.2]], N: [[.25, 2.4, 2.1], [.7, 1.8, 1.5]], W: [[.2, 1.2, 1.5], [.5, 1.2, 1.5], [.8, 1.2, 1.5]], E: [[.3, 1.6, 1.5], [.72, 1.6, 1.5]]}
    },
    upper: {
      id: "lilia-105:mansard", type: "mansard", label: "Жилая мансарда как у Lilia 105",
      note: "коленная стена 1,15 м, комнаты под скатами кровли",
      knee: 1.15, src: {knee: "inferred"}
    },
    roof: {id: "lilia-105:gable40", family: "gable", pitch: 40, label: "Двускатная 40° как у Lilia 105", src: {pitch: "published"}},
    annexes: []
  });

  /* ---------- Garden 106 ---------- */
  GC.registerHouse({
    id: "garden-106", name: "Garden 106", image: "assets/img/catalog/house-106.jpg",
    summary: "Одноэтажный дом 106,2 м² с гостиной 32 м², спальным крылом и навесом",
    core: {
      id: "garden-106:core", label: "Основной объём Garden 106",
      w: 13.4, d: 8.9, wallH: 2.9, plinth: 0.35,
      src: {w: "plan", d: "plan", wallH: "inferred"},
      windows: {S: [[.12, 1.4, 1.5], [.3, 1.4, 1.5], [.47, 1.4, 1.5], [.83, 1.4, 1.5]], N: [[.12, 2.8, 2.2]], W: [[.5, 1.8, 2.2]], E: [[.35, 1.2, 1.5], [.7, 1.2, 1.5]]}
    },
    upper: null,
    roof: {id: "garden-106:gable30", family: "gable", pitch: 30, label: "Двускатная 30° как у Garden 106", src: {pitch: "inferred"}},
    annexes: [
      {id: "garden-106:wing", kind: "wing", label: "Спальное крыло (Garden 106)", note: "две спальни 14,3 м² в крыле 8,76 × 3,75 м",
       heated: true, along: 8.76, depth: 3.75, h: "core", roof: {family: "core"}, sides: ["N", "E", "W"], align: "end",
       src: {along: "plan", depth: "plan"}},
      {id: "garden-106:carport", kind: "carport", label: "Навес для машины (Garden 106)", note: "открытый навес 3,0 × 8,9 м вдоль гостиной",
       heated: false, along: 8.9, depth: 3.0, h: 2.6, roof: {family: "lean", pitch: 8}, sides: ["W", "E"], align: "start",
       src: {along: "plan", depth: "plan", h: "inferred"}},
      {id: "garden-106:terrace", kind: "terrace", label: "Терраса у гостиной (Garden 106)", note: "настил 4,6 × 3,75 м с выходом из гостиной",
       heated: false, along: 4.64, depth: 3.75, h: 0, roof: {family: "none"}, sides: ["N", "S", "W", "E"], align: "start",
       src: {along: "plan", depth: "plan"}}
    ]
  });

  /* Общие системы кровли, которые можно поставить на любой основной объём.
     Уклон по умолчанию — типовой, помечен как inferred. */
  GC.genericRoofs = [
    {id: "generic:hip28", family: "hip", pitch: 28, label: "Вальмовая 28°", src: {pitch: "inferred"}},
    {id: "generic:flat", family: "flat", pitch: 2, label: "Плоская с парапетом", src: {pitch: "inferred"}}
  ];

  /* Конструктив и отделка — одинаковы для любой части любого дома, поэтому никогда не конфликтуют с формой.
     Ставки — демонстрационные, для проверки логики; перед публикацией их утверждает сметчик. */
  GC.finishes = {
    foundation: {label: "Фундамент", options: [
      {id: "slab", label: "Монолитная плита", note: "утеплённая плита 300 мм — для большинства грунтов", rate: 14500},
      {id: "strip", label: "Лента с плитой", note: "для пучинистых грунтов и участков с уклоном", rate: 16800},
      {id: "piles", label: "Сваи с ростверком", note: "для слабых грунтов и лёгких домов", rate: 11200}
    ]},
    walls: {label: "Стены", options: [
      {id: "aerated", label: "Газобетон 400 мм", note: "каменный дом без дополнительного утепления", rate: 10500, color: 0xd9dcd6},
      {id: "arbolit", label: "Арболит 400 мм", note: "тёплый блок из щепы и цемента, дышит как дерево", rate: 11800, color: 0xb78667},
      {id: "frame", label: "Каркас 250 мм", note: "быстрая сборка, минвата в каркасе", rate: 8200, color: 0xa87749}
    ]},
    roofCover: {label: "Покрытие кровли", options: [
      {id: "seam", label: "Фальцевая сталь", note: "строгие линии, служит долго", rate: 3900, color: 0x2f3239},
      {id: "tile", label: "Керамическая черепица", note: "классика, тяжелее и дороже", rate: 5200, color: 0x6e3b2c},
      {id: "soft", label: "Мягкая кровля", note: "тихая под дождём, проще в монтаже", rate: 2900, color: 0x4a4f55}
    ]},
    facade: {label: "Фасад", options: [
      {id: "plaster", label: "Штукатурка", note: "светлый минеральный фасад", rate: 3800, color: 0xf1efe9},
      {id: "clinker", label: "Клинкер", note: "кирпичная облицовка без ухода", rate: 6900, color: 0xa9765d},
      {id: "wood", label: "Планкен", note: "деревянная доска на подсистеме", rate: 5600, color: 0xb88a5a}
    ]},
    windows: {label: "Окна", options: [
      {id: "white", label: "ПВХ белые", note: "двухкамерный стеклопакет", rate: 21000, color: 0xf6f6f4},
      {id: "lam", label: "ПВХ с ламинацией", note: "тёмный профиль под графит", rate: 26000, color: 0x5c564f},
      {id: "alu", label: "Алюминий тёплый", note: "узкий профиль, большие стёкла", rate: 38000, color: 0x2a2e33}
    ]},
    /* внутри дома: на модели не показываются, но входят в смету */
    engineering: {label: "Инженерия", inside: true, options: [
      {id: "base", label: "Базовая", note: "котёл, радиаторы, вода, канализация, электрика", rate: 6200},
      {id: "comfort", label: "Комфорт", note: "плюс тёплый пол и приточная вентиляция", rate: 9800}
    ]},
    interior: {label: "Отделка", inside: true, options: [
      {id: "none", label: "Без отделки", note: "коробка с инженерией — отделку делаете сами", rate: 0},
      {id: "rough", label: "Черновая", note: "стяжка, штукатурка стен, разводка под чистовую", rate: 7500},
      {id: "fine", label: "Чистовая", note: "полы, стены, потолки и санузлы под ключ", rate: 19000}
    ]}
  };
})(typeof window !== "undefined" ? window : globalThis);
