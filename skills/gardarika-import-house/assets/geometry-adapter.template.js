(function (root) {
  "use strict";
  var G = root.GardarikaV2 = root.GardarikaV2 || {};
  G.GeometryAdapters = G.GeometryAdapters || {};

  G.GeometryAdapters["HOUSE_ADAPTER_ID"] = {
    build: function (project, config, kit) {
      // Build every volume from HouseSpec dimensions. Do not reuse a roof or
      // upper floor from a different architectural family.
      var model = new THREE.Group();
      model.name = project.id;
      var names = [
        "foundation", "ground", "groundShell", "groundStructure", "groundInterior",
        "groundPartitions", "groundFinish", "groundDoors", "groundFurniture",
        "mansard", "mansardShell", "mansardStructure", "mansardInterior",
        "mansardPartitions", "mansardFinish", "mansardDoors", "mansardFurniture",
        "roof", "details", "facadeSkin", "engineering", "openings",
        "groundOpenings", "mansardOpenings", "terraceDeck", "terracePergola", "cladding"
      ];
      var layers = {};
      names.forEach(function (name) { layers[name] = new THREE.Group(); layers[name].name = name; });

      layers.groundInterior.add(layers.groundPartitions, layers.groundFinish, layers.groundDoors, layers.groundFurniture);
      layers.mansardInterior.add(layers.mansardPartitions, layers.mansardFinish, layers.mansardDoors, layers.mansardFurniture);
      layers.ground.add(layers.groundShell, layers.groundStructure, layers.groundInterior);
      layers.mansard.add(layers.mansardShell, layers.mansardStructure, layers.mansardInterior);
      layers.openings.add(layers.groundOpenings, layers.mansardOpenings);
      layers.details.add(layers.facadeSkin, layers.terraceDeck, layers.terracePergola, layers.cladding);
      model.add(layers.foundation, layers.ground, layers.mansard, layers.roof, layers.details, layers.engineering, layers.openings);

      // TODO: add exact footprint, level, roof, openings, finish, interior and
      // detail geometry. Use kit.box/materials when exposed by the host engine.

      model.userData = layers;
      return model;
    },
    validate: function (project) {
      return {valid: false, errors: [{id: project.id, message: "Custom geometry adapter is not implemented."}], checks: 0};
    },
    quantities: function (project) {
      throw new Error("Custom geometry quantities are not implemented for " + project.id);
    },
    planSvg: function (project, levelId, config) {
      throw new Error("Custom plan renderer is not implemented for " + project.id + " / " + levelId);
    }
  };
})(window);
