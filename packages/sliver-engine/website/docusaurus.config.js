const path = require("node:path");
const { themes } = require("prism-react-renderer");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Sliver Engine",
  tagline: "Pre-alpha TypeScript/HTML5 Canvas 2D game engine",
  favicon: "img/favicon.svg",

  // Deployment settings (update when you publish the docs site)
  url: "https://example.com",
  baseUrl: "/",

  onBrokenLinks: "throw",
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: "/",
          sidebarPath: require.resolve("./sidebars.js"),
          editUrl: undefined,
          // Make "current" (unversioned docs in website/docs) the default during dev.
          // Versioned docs remain accessible under their version path.
          lastVersion: "current",
          versions: {
            current: {
              label: "Next",
            },
          },
        },
        blog: false,
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  plugins: [
    function webpackAliasesPlugin() {
      const sandpackDocsPath = path.resolve(__dirname, "docs/sandpack");

      const hasBabelLoader = (rule) => {
        if (!rule || typeof rule !== "object" || !Array.isArray(rule.use)) {
          return false;
        }

        return rule.use.some((useEntry) => {
          if (typeof useEntry === "string") {
            return useEntry.includes("babel-loader");
          }

          return (
            useEntry &&
            typeof useEntry.loader === "string" &&
            useEntry.loader.includes("babel-loader")
          );
        });
      };

      const appendExclude = (exclude) => {
        if (!exclude) {
          return [sandpackDocsPath];
        }

        if (Array.isArray(exclude)) {
          return [...exclude, sandpackDocsPath];
        }

        return [exclude, sandpackDocsPath];
      };

      return {
        name: "webpack-aliases-plugin",
        configureWebpack(config) {
          const existingRules =
            config &&
            config.module &&
            Array.isArray(config.module.rules)
              ? config.module.rules
              : [];
          const patchedRules = existingRules.map((rule) => {
            if (!hasBabelLoader(rule)) {
              return rule;
            }

            return {
              ...rule,
              exclude: appendExclude(rule.exclude),
            };
          });

          return {
            mergeStrategy: {
              "module.rules": "replace",
            },
            module: {
              rules: [
                {
                  test: /\.ts$/,
                  include: [sandpackDocsPath],
                  type: "asset/source",
                },
                {
                  resourceQuery: /raw/,
                  type: "asset/source",
                },
                ...patchedRules,
              ],
            },
            resolve: {
              alias: {
                shallowequal: path.resolve(__dirname, "src/shims/shallowequal.js"),
              },
            },
          };
        },
      };
    },
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "Sliver Engine",
        logo: {
          alt: "Sliver Engine",
          src: "img/logo.svg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "defaultSidebar",
            position: "left",
            label: "Docs",
          },
          {
            href: "https://github.com/your-org/your-repo",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [
              {
                label: "Getting started",
                to: "/getting-started",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Sliver Engine.`,
      },
      prism: {
        theme: themes.github,
        darkTheme: themes.dracula,
      },
    }),
};

module.exports = config;
