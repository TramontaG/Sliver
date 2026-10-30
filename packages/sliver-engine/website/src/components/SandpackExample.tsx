import React, { useMemo, type JSX } from "react";
import {
  SandpackCodeEditor,
  SandpackLayout,
  type SandpackFile,
  type SandpackFiles,
  type SandpackOptions,
  SandpackPreview,
  SandpackProvider,
  type SandpackSetup,
} from "@codesandbox/sandpack-react";
import { useColorMode } from "@docusaurus/theme-common";
import { SANDPACK_LOCAL_ENGINE_FILES } from "../generated/sandpackLocalEngine";
import styles from "./SandpackExample.module.css";

const TS_CONFIG_PATH = "/tsconfig.json";
const DEFAULT_EDITOR_HEIGHT = 420;
const DEFAULT_CODE_HEAVY_PREVIEW_WIDTH = 400;
const SANDBOX_ENGINE_VERSION = "0.0.1-alpha-5";

const DEFAULT_TS_CONFIG_OVERRIDES = {
  compilerOptions: {
    target: "ESNext",
    module: "Preserve",
    moduleResolution: "bundler",
    moduleDetection: "force",
    allowImportingTsExtensions: true,
    verbatimModuleSyntax: true,
    resolveJsonModule: true,
    experimentalDecorators: true,
    useDefineForClassFields: true,
    strict: false,
    skipLibCheck: true,
  },
};

type ExampleFile = string | SandpackFile;

type SandpackExampleProps = {
  files: Record<string, ExampleFile>;
  hiddenFiles?: readonly string[];
  visibleFiles?: readonly string[];
  activeFile?: string;
  preserveFileReadOnly?: boolean;
  showRunButton?: boolean;
  showOpenInCodeSandbox?: boolean;
  layout?: "side-by-side" | "preview-first" | "editor-first" | "code-heavy";
  editorHeight?: number;
  previewHeight?: number;
  previewWidth?: number;
  options?: Omit<
    SandpackOptions,
    "visibleFiles" | "activeFile" | "editorHeight"
  >;
  customSetup?: SandpackSetup;
};

const normalizePath = (path: string): string => {
  if (path.startsWith("/")) {
    return path;
  }

  return `/${path}`;
};

const toSandpackFile = (file: ExampleFile): SandpackFile => {
  if (typeof file === "string") {
    return { code: file };
  }

  return file;
};

const parseJson = (value: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall back to a minimal object when the current tsconfig cannot be parsed.
  }

  return {};
};

const buildTsConfig = (existingCode?: string): string => {
  const current = existingCode ? parseJson(existingCode) : {};
  const compilerOptions =
    current.compilerOptions &&
    typeof current.compilerOptions === "object" &&
    !Array.isArray(current.compilerOptions)
      ? { ...(current.compilerOptions as Record<string, unknown>) }
      : {};

  const mergedConfig = {
    ...current,
    ...DEFAULT_TS_CONFIG_OVERRIDES,
    compilerOptions: {
      ...compilerOptions,
      ...DEFAULT_TS_CONFIG_OVERRIDES.compilerOptions,
    },
  };

  return `${JSON.stringify(mergedConfig, null, 2)}\n`;
};

const isHidden = (
  path: string,
  file: SandpackFile,
  hiddenFilesSet: ReadonlySet<string>,
): boolean => {
  return Boolean(file.hidden) || hiddenFilesSet.has(path);
};

const ensureEngineDependency = (
  setup: SandpackSetup | undefined,
): SandpackSetup => {
  return {
    ...setup,
    dependencies: {
      ...setup?.dependencies,
      "sliver-engine":
        setup?.dependencies?.["sliver-engine"] ?? SANDBOX_ENGINE_VERSION,
    },
  };
};

export const SandpackExample = ({
  files,
  hiddenFiles = [],
  visibleFiles,
  activeFile,
  preserveFileReadOnly = false,
  showRunButton = false,
  showOpenInCodeSandbox = false,
  layout = "side-by-side",
  editorHeight = DEFAULT_EDITOR_HEIGHT,
  previewHeight,
  previewWidth,
  options,
  customSetup,
}: SandpackExampleProps): JSX.Element => {
  const { colorMode } = useColorMode();
  const sandpackTheme = colorMode === "dark" ? "dark" : "light";
  const resolvedPreviewHeight = previewHeight ?? editorHeight;
  const resolvedPreviewWidth =
    previewWidth ?? DEFAULT_CODE_HEAVY_PREVIEW_WIDTH;
  const isStackedLayout = layout === "preview-first" || layout === "editor-first";
  const isPreviewFirst = layout === "preview-first";
  const isCodeHeavyLayout = layout === "code-heavy";
  const resolvedCodeHeavyPreviewHeight = isCodeHeavyLayout
    ? editorHeight
    : resolvedPreviewHeight;
  const wrapperClassName = isCodeHeavyLayout
    ? `${styles.wrapper} ${styles.codeHeavyWrapper}`
    : styles.wrapper;

  const normalizedPaths = useMemo(() => {
    return {
      hidden: new Set(hiddenFiles.map((path) => normalizePath(path))),
      visible: visibleFiles?.map((path) => normalizePath(path)),
      active: activeFile ? normalizePath(activeFile) : undefined,
    };
  }, [activeFile, hiddenFiles, visibleFiles]);

  const normalizedFiles = useMemo<SandpackFiles>(() => {
    const nextFiles: SandpackFiles = {};

    Object.entries(SANDPACK_LOCAL_ENGINE_FILES).forEach(([path, rawFile]) => {
      nextFiles[path] = rawFile;
    });

    Object.entries(files).forEach(([rawPath, rawFile]) => {
      const path = normalizePath(rawPath);
      const file = toSandpackFile(rawFile);
      const normalizedFile =
        !preserveFileReadOnly && typeof file === "object"
          ? (() => {
              const { readOnly: _readOnly, ...rest } = file;
              return rest;
            })()
          : file;

      nextFiles[path] = normalizedPaths.hidden.has(path)
        ? { ...normalizedFile, hidden: true }
        : normalizedFile;
    });

    const existingTsConfig = nextFiles[TS_CONFIG_PATH];
    const existingTsConfigFile =
      typeof existingTsConfig === "string"
        ? { code: existingTsConfig }
        : existingTsConfig;

    nextFiles[TS_CONFIG_PATH] = {
      code: buildTsConfig(existingTsConfigFile?.code),
      hidden: true,
      readOnly: true,
    };

    return nextFiles;
  }, [files, normalizedPaths.hidden, preserveFileReadOnly]);

  const resolvedCustomSetup = useMemo(() => {
    return ensureEngineDependency(customSetup);
  }, [customSetup]);

  const resolvedVisibleFiles = useMemo(() => {
    if (normalizedPaths.visible && normalizedPaths.visible.length > 0) {
      const explicitVisible = normalizedPaths.visible.filter(
        (path) => !normalizedPaths.hidden.has(path),
      );
      if (explicitVisible.length > 0) {
        return explicitVisible;
      }
    }

    const visible = Object.entries(normalizedFiles)
      .filter(([path, file]) => {
        const normalizedFile = typeof file === "string" ? { code: file } : file;
        return !isHidden(path, normalizedFile, normalizedPaths.hidden);
      })
      .map(([path]) => path);

    if (visible.length > 0) {
      return visible;
    }

    return Object.keys(normalizedFiles).slice(0, 1);
  }, [normalizedFiles, normalizedPaths.hidden, normalizedPaths.visible]);

  const resolvedActiveFile = normalizedPaths.active ?? resolvedVisibleFiles[0];

  return (
    <div className={wrapperClassName}>
      <SandpackProvider
        template="vanilla-ts"
        theme={sandpackTheme}
        files={normalizedFiles}
        customSetup={resolvedCustomSetup}
        options={{
          visibleFiles: resolvedVisibleFiles,
          activeFile: resolvedActiveFile,
          autorun: options?.autorun,
          autoReload: options?.autoReload,
          recompileMode: options?.recompileMode,
          recompileDelay: options?.recompileDelay,
          initMode: options?.initMode,
          initModeObserverOptions: options?.initModeObserverOptions,
          id: options?.id,
          logLevel: options?.logLevel,
          bundlerURL: options?.bundlerURL,
          startRoute: options?.startRoute,
          skipEval: options?.skipEval,
          fileResolver: options?.fileResolver,
          externalResources: options?.externalResources,
          classes: options?.classes,
        }}
      >
        <SandpackLayout
          style={
            isStackedLayout
              ? { flexDirection: "column", flexWrap: "nowrap" }
              : isCodeHeavyLayout
                ? { flexDirection: "row", flexWrap: "nowrap", alignItems: "stretch" }
              : undefined
          }
        >
          {isStackedLayout ? (
            <>
              {isPreviewFirst ? (
                <>
                  <SandpackPreview
                    showNavigator={options?.showNavigator ?? true}
                    showRefreshButton={options?.showRefreshButton ?? true}
                    showOpenInCodeSandbox={showOpenInCodeSandbox}
                    startRoute={options?.startRoute}
                    style={{
                      width: "100%",
                      minWidth: "100%",
                      height: resolvedPreviewHeight,
                      flex: "0 0 auto",
                    }}
                  />
                  <SandpackCodeEditor
                    showTabs={options?.showTabs ?? true}
                    showLineNumbers={options?.showLineNumbers ?? true}
                    showInlineErrors={options?.showInlineErrors ?? true}
                    wrapContent={options?.wrapContent ?? false}
                    closableTabs={options?.closableTabs}
                    showRunButton={showRunButton}
                    initMode={options?.initMode}
                    readOnly={options?.readOnly}
                    showReadOnly={options?.showReadOnly}
                    extensions={options?.codeEditor?.extensions}
                    extensionsKeymap={options?.codeEditor?.extensionsKeymap}
                    additionalLanguages={options?.codeEditor?.additionalLanguages}
                    style={{
                      width: "100%",
                      minWidth: "100%",
                      height: editorHeight,
                      flex: "0 0 auto",
                    }}
                  />
                </>
              ) : (
                <>
                  <SandpackCodeEditor
                    showTabs={options?.showTabs ?? true}
                    showLineNumbers={options?.showLineNumbers ?? true}
                    showInlineErrors={options?.showInlineErrors ?? true}
                    wrapContent={options?.wrapContent ?? false}
                    closableTabs={options?.closableTabs}
                    showRunButton={showRunButton}
                    initMode={options?.initMode}
                    readOnly={options?.readOnly}
                    showReadOnly={options?.showReadOnly}
                    extensions={options?.codeEditor?.extensions}
                    extensionsKeymap={options?.codeEditor?.extensionsKeymap}
                    additionalLanguages={options?.codeEditor?.additionalLanguages}
                    style={{
                      width: "100%",
                      minWidth: "100%",
                      height: editorHeight,
                      flex: "0 0 auto",
                    }}
                  />
                  <SandpackPreview
                    showNavigator={options?.showNavigator ?? true}
                    showRefreshButton={options?.showRefreshButton ?? true}
                    showOpenInCodeSandbox={showOpenInCodeSandbox}
                    startRoute={options?.startRoute}
                    style={{
                      width: "100%",
                      minWidth: "100%",
                      height: resolvedPreviewHeight,
                      flex: "0 0 auto",
                    }}
                  />
                </>
              )}
            </>
          ) : (
            <>
              <SandpackCodeEditor
                showTabs={options?.showTabs ?? true}
                showLineNumbers={options?.showLineNumbers ?? true}
                showInlineErrors={options?.showInlineErrors ?? true}
                wrapContent={options?.wrapContent ?? false}
                closableTabs={options?.closableTabs}
                showRunButton={showRunButton}
                initMode={options?.initMode}
                readOnly={options?.readOnly}
                showReadOnly={options?.showReadOnly}
                extensions={options?.codeEditor?.extensions}
                extensionsKeymap={options?.codeEditor?.extensionsKeymap}
                additionalLanguages={options?.codeEditor?.additionalLanguages}
                style={
                  isCodeHeavyLayout
                    ? { height: editorHeight, flex: "1 1 auto", minWidth: 0 }
                    : { height: editorHeight }
                }
              />
              <SandpackPreview
                showNavigator={options?.showNavigator ?? true}
                showRefreshButton={options?.showRefreshButton ?? true}
                showOpenInCodeSandbox={showOpenInCodeSandbox}
                startRoute={options?.startRoute}
                style={
                  isCodeHeavyLayout
                    ? {
                        height: resolvedCodeHeavyPreviewHeight,
                        width: resolvedPreviewWidth,
                        minWidth: resolvedPreviewWidth,
                        flex: `0 0 ${resolvedPreviewWidth}px`,
                      }
                    : { height: resolvedPreviewHeight }
                }
              />
            </>
          )}
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
};
