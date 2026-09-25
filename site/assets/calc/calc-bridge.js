/* Связь калькулятора со старого сайта с новым сайтом.
   calculator.html#<slug> (или ?p=<slug>) открывает калькулятор сразу с домом из каталога. */
(function(){
  "use strict";
  var MAP = {
    "birch-132":"birch132","lilac-96":"lilac96","vesper-164":"vesper164",
    "lento-100":"lento100","linea-101":"linea101","lilia-105":"lilia105","garden-106":"garden106",
    "terra-113":"terra113","longhouse-119":"long119","judyta-120":"judyta120","gable-121":"gable121",
    "bgl-124":"bgl124","patio-127":"patio127","alto-130":"alto130","danar-138":"danar138","pine-141":"pine141"
  };
  var catalogIds = {};
  Object.keys(MAP).forEach(function(k){ catalogIds[MAP[k]] = true; });
  var picker = document.getElementById("projectPicker");
  if (!picker) return;
  function mark(){
    Array.prototype.forEach.call(picker.querySelectorAll(".project-choice"), function(b){
      b.classList.toggle("is-catalog", !!catalogIds[b.getAttribute("data-project")]);
    });
  }
  function choose(id){
    var btn = picker.querySelector('.project-choice[data-project="' + id + '"]');
    if (!btn) return false;
    btn.click();
    btn.scrollIntoView({block: "nearest", inline: "center"});
    return true;
  }
  mark();
  var slug = location.hash.slice(1) || new URLSearchParams(location.search).get("p");
  var id = slug && MAP[slug];
  choose(id || "birch132");
  window.scrollTo(0, 0);
  window.addEventListener("hashchange", function(){
    var id2 = MAP[location.hash.slice(1)];
    if (id2) choose(id2);
  });
})();
