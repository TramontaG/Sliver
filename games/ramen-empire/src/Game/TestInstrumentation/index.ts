import { spawnCustomerGroupMessage } from "../Messages/Restaurant";

type VectorLike = {
  x: number;
  y: number;
};

type RuntimeGameObject = {
  id: string;
  name: string;
  getPosition: () => VectorLike;
  getScenePosition: () => VectorLike;
  getChildren: () => RuntimeGameObject[];
};

type RuntimeScene = {
  getGameObjects: () => RuntimeGameObject[];
};

type RuntimeSceneManager = {
  tick: () => void;
};

type RuntimeContext = {
  getTickCount: () => number;
  getFrameCount: () => number;
  getTickRate: () => number;
  getCurrentScene: () => RuntimeScene | null;
  getActiveScenes: () => RuntimeScene[];
  getSceneManager: () => RuntimeSceneManager;
  sendMessage: <TPayload>(channel: string, payload: TPayload) => void;
};

type RuntimeGame = {
  getContext: () => RuntimeContext;
};

type EntitySnapshot = {
  id: string;
  name: string;
  position: VectorLike;
  scenePosition: VectorLike;
};

type SessionSnapshot = {
  tickCount: number;
  frameCount: number;
  tickRate: number;
  currentScene: string | null;
  activeScenes: string[];
};

type TableSnapshot = EntitySnapshot & {
  state: string | null;
  seatCount: number;
  activeGroupId: string | null;
  occupiedCustomerIds: string[];
};

type CustomerSnapshot = EntitySnapshot & {
  groupId: string | null;
  selected: boolean;
  state: string | null;
};

type OrderSnapshot = {
  id: string;
  status: string | null;
  tableId: string | null;
  customerId: string | null;
  items: string[];
};

type GameSnapshot = {
  session: SessionSnapshot;
  hero: EntitySnapshot | null;
  tables: TableSnapshot[];
  customers: CustomerSnapshot[];
  orders: OrderSnapshot[];
};

type BrowserTestApi = {
  getSnapshot: () => GameSnapshot;
  getTableState: (tableId: string) => string | null;
  getCustomers: () => CustomerSnapshot[];
  spawnCustomer: (count?: number) => void;
  tick: (count?: number) => GameSnapshot;
  startCanvasRecording: (options?: { fps?: number }) => Promise<boolean>;
  downloadCanvasRecording: (fileName?: string) => Promise<boolean>;
};

type BrowserTestApiHost = {
  __testApi?: BrowserTestApi;
};

type TestRuntimeEnv = {
  DEV?: boolean;
  MODE?: string;
};

declare global {
  interface Window {
    __testApi?: BrowserTestApi;
  }
}

type CanvasRecordingState = {
  mediaRecorder: MediaRecorder | null;
  stream: MediaStream | null;
  chunks: Blob[];
  mimeType: string;
  width: number;
  height: number;
  fps: number;
  stopPromise: Promise<Blob | null> | null;
};

const createCanvasRecordingState = (): CanvasRecordingState => {
  return {
    mediaRecorder: null,
    stream: null,
    chunks: [],
    mimeType: "video/webm",
    width: 0,
    height: 0,
    fps: 60,
    stopPromise: null,
  };
};

let canvasRecordingState = createCanvasRecordingState();

const toPoint = ({ x, y }: VectorLike): VectorLike => ({ x, y });

const getSceneName = (scene: RuntimeScene | null): string | null => {
  if (!scene) {
    return null;
  }

  const sceneRecord = scene as RuntimeScene & {
    name?: unknown;
  };

  return typeof sceneRecord.name === "string" ? sceneRecord.name : null;
};

const flattenGameObjects = (
  gameObjects: RuntimeGameObject[]
): RuntimeGameObject[] => {
  return gameObjects.flatMap((gameObject) => [
    gameObject,
    ...flattenGameObjects(gameObject.getChildren()),
  ]);
};

const readStringProperty = (
  source: object,
  candidates: string[]
): string | null => {
  const record = source as Record<string, unknown>;

  for (const candidate of candidates) {
    const value = record[candidate];
    if (typeof value === "string") {
      return value;
    }
  }

  return null;
};

const readStringArrayProperty = (
  source: object,
  candidates: string[]
): string[] => {
  const record = source as Record<string, unknown>;

  for (const candidate of candidates) {
    const value = record[candidate];
    if (
      Array.isArray(value) &&
      value.every((entry) => typeof entry === "string")
    ) {
      return [...value];
    }
  }

  return [];
};

const createEntitySnapshot = (gameObject: RuntimeGameObject): EntitySnapshot => {
  return {
    id: gameObject.id,
    name: gameObject.name,
    position: toPoint(gameObject.getPosition()),
    scenePosition: toPoint(gameObject.getScenePosition()),
  };
};

const createTableSnapshot = (gameObject: RuntimeGameObject): TableSnapshot => {
  const inspectableGameObject = gameObject as RuntimeGameObject & {
    getSeatCount?: () => number;
  };

  return {
    ...createEntitySnapshot(gameObject),
    state: readStringProperty(gameObject, [
      "serviceState",
      "tableState",
      "state",
    ]),
    seatCount:
      typeof inspectableGameObject.getSeatCount === "function"
        ? inspectableGameObject.getSeatCount()
        : gameObject.getChildren().filter((child) => child.name === "Seat").length,
    activeGroupId: readStringProperty(gameObject, [
      "activeGroupId",
      "groupId",
      "partyId",
    ]),
    occupiedCustomerIds: readStringArrayProperty(gameObject, [
      "occupiedCustomerIds",
      "customerIds",
    ]),
  };
};

const createCustomerSnapshot = (
  gameObject: RuntimeGameObject
): CustomerSnapshot => {
  const inspectableGameObject = gameObject as RuntimeGameObject & {
    selected?: unknown;
  };

  return {
    ...createEntitySnapshot(gameObject),
    groupId: readStringProperty(gameObject, ["groupId"]),
    selected: inspectableGameObject.selected === true,
    state: readStringProperty(gameObject, ["customerState", "state"]),
  };
};

const createOrderSnapshot = (gameObject: RuntimeGameObject): OrderSnapshot => {
  return {
    id: gameObject.id,
    status: readStringProperty(gameObject, ["status", "orderState"]),
    tableId: readStringProperty(gameObject, ["tableId"]),
    customerId: readStringProperty(gameObject, ["customerId"]),
    items: readStringArrayProperty(gameObject, ["items"]),
  };
};

const clampCustomerCount = (count?: number): number => {
  if (typeof count !== "number" || Number.isNaN(count)) {
    return 1;
  }

  return Math.max(1, Math.min(4, Math.floor(count)));
};

const normalizeTickCount = (count?: number): number => {
  if (typeof count !== "number" || Number.isNaN(count)) {
    return 1;
  }

  return Math.max(0, Math.floor(count));
};

const normalizeRecordingFps = (fps?: number): number => {
  if (typeof fps !== "number" || Number.isNaN(fps)) {
    return 60;
  }

  return Math.max(1, Math.min(120, Math.floor(fps)));
};

const getSupportedRecordingMimeType = (): string => {
  if (typeof MediaRecorder === "undefined") {
    return "video/webm";
  }

  const preferredMimeTypes = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  for (const mimeType of preferredMimeTypes) {
    if (
      typeof MediaRecorder.isTypeSupported === "function" &&
      MediaRecorder.isTypeSupported(mimeType)
    ) {
      return mimeType;
    }
  }

  return "video/webm";
};

const startCanvasRecording = async (
  options?: {
    fps?: number;
  }
): Promise<boolean> => {
  if (
    typeof document === "undefined" ||
    typeof HTMLCanvasElement === "undefined" ||
    typeof MediaRecorder === "undefined"
  ) {
    return false;
  }

  if (canvasRecordingState.mediaRecorder?.state === "recording") {
    return true;
  }

  const canvas = document.querySelector("canvas");
  if (!(canvas instanceof HTMLCanvasElement)) {
    return false;
  }

  const fps = normalizeRecordingFps(options?.fps);
  const stream = canvas.captureStream(fps);
  const mimeType = getSupportedRecordingMimeType();
  const mediaRecorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined
  );
  const chunks: Blob[] = [];

  mediaRecorder.addEventListener("dataavailable", (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  canvasRecordingState = {
    mediaRecorder,
    stream,
    chunks,
    mimeType: mediaRecorder.mimeType || mimeType || "video/webm",
    width: canvas.width,
    height: canvas.height,
    fps,
    stopPromise: null,
  };

  mediaRecorder.start(250);
  return true;
};

const stopCanvasRecording = async (): Promise<Blob | null> => {
  const activeRecording = canvasRecordingState;

  if (!activeRecording.mediaRecorder) {
    return null;
  }

  if (activeRecording.stopPromise) {
    return activeRecording.stopPromise;
  }

  activeRecording.stopPromise = new Promise((resolve, reject) => {
    const finalize = () => {
      try {
        const blob = new Blob(activeRecording.chunks, {
          type: activeRecording.mimeType,
        });
        resolve(blob);
      } catch (error) {
        reject(error);
      } finally {
        activeRecording.stream?.getTracks().forEach((track) => track.stop());
        canvasRecordingState = createCanvasRecordingState();
      }
    };

    if (activeRecording.mediaRecorder?.state === "inactive") {
      void finalize();
      return;
    }

    activeRecording.mediaRecorder.addEventListener(
      "stop",
      () => {
        void finalize();
      },
      { once: true }
    );
    activeRecording.mediaRecorder.stop();
  });

  return activeRecording.stopPromise;
};

const downloadCanvasRecording = async (fileName = "canvas-recording.webm") => {
  try {
    const recordingBlob = await stopCanvasRecording();
    if (!recordingBlob) {
      return false;
    }

    if (typeof document === "undefined" || typeof URL === "undefined") {
      return false;
    }

    const anchor = document.createElement("a");
    const objectUrl = URL.createObjectURL(recordingBlob);
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1000);

    return true;
  } catch {
    return false;
  }
};

const createGameSnapshot = (game: RuntimeGame): GameSnapshot => {
  const context = game.getContext();
  const currentScene = context.getCurrentScene();
  const currentSceneObjects = currentScene
    ? flattenGameObjects(currentScene.getGameObjects())
    : [];
  const hero = currentSceneObjects.find((gameObject) => gameObject.name === "Hero");

  return {
    session: {
      tickCount: context.getTickCount(),
      frameCount: context.getFrameCount(),
      tickRate: context.getTickRate(),
      currentScene: getSceneName(currentScene),
      activeScenes: context
        .getActiveScenes()
        .map((scene) => getSceneName(scene))
        .filter((sceneName): sceneName is string => sceneName !== null),
    },
    hero: hero ? createEntitySnapshot(hero) : null,
    tables: currentSceneObjects
      .filter((gameObject) => gameObject.name === "Table")
      .map(createTableSnapshot),
    customers: currentSceneObjects
      .filter((gameObject) => gameObject.name === "Customer")
      .map(createCustomerSnapshot),
    orders: currentSceneObjects
      .filter((gameObject) => gameObject.name === "Order")
      .map(createOrderSnapshot),
  };
};

const advanceGameTicks = (game: RuntimeGame, count = 1): GameSnapshot => {
  const context = game.getContext();
  const ticksToRun = normalizeTickCount(count);
  const tickableGame = game as RuntimeGame & {
    onTick?: () => void;
  };

  for (let tickIndex = 0; tickIndex < ticksToRun; tickIndex += 1) {
    tickableGame.onTick?.();
    context.getSceneManager().tick();
  }

  return createGameSnapshot(game);
};

const createBrowserTestApi = (game: RuntimeGame): BrowserTestApi => {
  return {
    getSnapshot: () => createGameSnapshot(game),
    getTableState: (tableId: string) => {
      const table = createGameSnapshot(game).tables.find(
        (tableSnapshot) => tableSnapshot.id === tableId
      );

      return table?.state ?? null;
    },
    getCustomers: () => createGameSnapshot(game).customers,
    spawnCustomer: (count?: number) => {
      game.getContext().sendMessage(spawnCustomerGroupMessage, {
        count: clampCustomerCount(count),
      });
    },
    tick: (count?: number) => advanceGameTicks(game, count),
    startCanvasRecording,
    downloadCanvasRecording,
  };
};

const isBrowserTestApiEnabled = (env: TestRuntimeEnv = import.meta.env) => {
  return env.DEV === true || env.MODE === "test";
};

const installBrowserTestApi = (
  game: RuntimeGame,
  host: BrowserTestApiHost,
  env: TestRuntimeEnv = import.meta.env
): BrowserTestApi | null => {
  if (!isBrowserTestApiEnabled(env)) {
    delete host.__testApi;
    return null;
  }

  const api = createBrowserTestApi(game);
  host.__testApi = api;

  return api;
};

export {
  advanceGameTicks,
  createBrowserTestApi,
  createGameSnapshot,
  installBrowserTestApi,
  isBrowserTestApiEnabled,
};
export type {
  BrowserTestApi,
  BrowserTestApiHost,
  CustomerSnapshot,
  EntitySnapshot,
  GameSnapshot,
  OrderSnapshot,
  RuntimeGame,
  RuntimeGameObject,
  RuntimeScene,
  SessionSnapshot,
  TableSnapshot,
};
