/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  defaultSidebar: [
    "intro",
    "getting-started",
    {
      type: "category",
      label: "Core concepts",
      items: [
        "concepts/game-context",
        "concepts/game-loop",
        "concepts/scenes",
        "concepts/game-objects",
        "concepts/walker",
        "concepts/physics",
        "concepts/events",
        "concepts/saves",
        "concepts/mixins",
        "concepts/rendering",
        "concepts/audio",
        "concepts/working-with-sprites",
        "concepts/scripted-events",
      ],
    },
    {
      type: "category",
      label: "Examples",
      items: [
        "examples/collecting-a-coin",
        "examples/health-bar",
        "examples/pause-menu",
        "examples/camera-follow",
        "examples/door-and-key",
        "examples/enemy-patrol",
        "examples/save-and-load-menu",
        "examples/scripted-cutscene",
        "examples/flappy-mini-game",
      ],
    },
  ],
};

module.exports = sidebars;
