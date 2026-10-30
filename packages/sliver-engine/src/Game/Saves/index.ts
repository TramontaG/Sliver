type SaveId = string;

type SaveIndexEntry = {
  id: SaveId;
  createdAt: number;
  updatedAt: number;
  label?: string;
};

type SaveFile<T = unknown> = SaveIndexEntry & {
  data: T;
};

type GameSavesOptions = {
  namespace?: string;
};

const getLocalStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
};

const encodeUtf8ToBase64 = (value: string): string => {
  // Prefer Node/Bun (tests, tooling) if available.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maybeBuffer = (globalThis as any).Buffer as
    | { from(input: string, encoding: string): { toString(encoding: string): string } }
    | undefined;
  if (maybeBuffer) {
    return maybeBuffer.from(value, "utf-8").toString("base64");
  }

  if (typeof TextEncoder !== "undefined" && typeof btoa !== "undefined") {
    const bytes = new TextEncoder().encode(value);

    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
  }

  if (typeof btoa !== "undefined") {
    return btoa(unescape(encodeURIComponent(value)));
  }

  throw new Error("Base64 encoding is not available in this environment.");
};

const decodeBase64ToUtf8 = (base64: string): string => {
  // Prefer Node/Bun (tests, tooling) if available.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maybeBuffer = (globalThis as any).Buffer as
    | { from(input: string, encoding: string): { toString(encoding: string): string } }
    | undefined;
  if (maybeBuffer) {
    return maybeBuffer.from(base64, "base64").toString("utf-8");
  }

  if (typeof atob !== "undefined") {
    const binary = atob(base64);

    if (typeof TextDecoder !== "undefined") {
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }

    return decodeURIComponent(escape(binary));
  }

  throw new Error("Base64 decoding is not available in this environment.");
};

const encodeJsonToBase64 = (data: unknown): string => {
  return encodeUtf8ToBase64(JSON.stringify(data));
};

const decodeBase64ToJson = (base64: string): unknown => {
  return JSON.parse(decodeBase64ToUtf8(base64));
};

const generateSaveId = (): SaveId => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

class GameSaves {
  private namespace: string;
  private onLoadSaveFileCallback: ((save: SaveFile) => void) | null = null;

  constructor(options?: GameSavesOptions) {
    this.namespace = options?.namespace ?? "sliver-engine";
  }

  onLoadSaveFile(callback: ((save: SaveFile) => void) | null): this {
    this.onLoadSaveFileCallback = callback;
    return this;
  }

  create<T = unknown>(data: T, options?: { label?: string; id?: SaveId }): SaveId {
    const id = options?.id ?? generateSaveId();
    this.write(id, data, { label: options?.label, createIfMissing: true });
    return id;
  }

  write<T = unknown>(
    id: SaveId,
    data: T,
    options?: { label?: string; createIfMissing?: boolean }
  ): void {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }

    const now = Date.now();
    const index = this.readIndex(storage);
    const existing = index.find((s) => s.id === id);

    if (!existing && options?.createIfMissing === false) {
      return;
    }

    const createdAt = existing?.createdAt ?? now;
    const entry: SaveIndexEntry = {
      id,
      createdAt,
      updatedAt: now,
      label: options?.label ?? existing?.label,
    };

    const payload = encodeJsonToBase64(data);
    storage.setItem(this.saveKey(id), payload);

    const nextIndex = [
      ...index.filter((s) => s.id !== id),
      entry,
    ].sort((a, b) => b.updatedAt - a.updatedAt);
    this.writeIndex(storage, nextIndex);
  }

  read<T = unknown>(id: SaveId): SaveFile<T> | null {
    const storage = getLocalStorage();
    if (!storage) {
      return null;
    }

    const index = this.readIndex(storage);
    const entry = index.find((s) => s.id === id);
    if (!entry) {
      return null;
    }

    const encoded = storage.getItem(this.saveKey(id));
    if (!encoded) {
      return null;
    }

    try {
      const data = decodeBase64ToJson(encoded) as T;
      return { ...entry, data };
    } catch {
      return null;
    }
  }

  list(): SaveIndexEntry[] {
    const storage = getLocalStorage();
    if (!storage) {
      return [];
    }
    return this.readIndex(storage);
  }

  loadAll(): SaveFile[] {
    const storage = getLocalStorage();
    if (!storage) {
      return [];
    }

    const index = this.readIndex(storage);
    const loaded: SaveFile[] = [];

    for (const entry of index) {
      const encoded = storage.getItem(this.saveKey(entry.id));
      if (!encoded) continue;

      try {
        const data = decodeBase64ToJson(encoded);
        const save: SaveFile = { ...entry, data };
        loaded.push(save);
        this.onLoadSaveFileCallback?.(save);
      } catch {
        continue;
      }
    }

    return loaded;
  }

  delete(id: SaveId): void {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }

    storage.removeItem(this.saveKey(id));
    const index = this.readIndex(storage).filter((s) => s.id !== id);
    this.writeIndex(storage, index);
  }

  clear(): void {
    const storage = getLocalStorage();
    if (!storage) {
      return;
    }

    const index = this.readIndex(storage);
    for (const entry of index) {
      storage.removeItem(this.saveKey(entry.id));
    }
    storage.removeItem(this.indexKey());
  }

  private indexKey(): string {
    return `${this.namespace}:saves:index`;
  }

  private saveKey(id: SaveId): string {
    return `${this.namespace}:saves:${id}`;
  }

  private readIndex(storage: Storage): SaveIndexEntry[] {
    const raw = storage.getItem(this.indexKey());
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((s): s is SaveIndexEntry => {
          return (
            !!s &&
            typeof (s as SaveIndexEntry).id === "string" &&
            typeof (s as SaveIndexEntry).createdAt === "number" &&
            typeof (s as SaveIndexEntry).updatedAt === "number"
          );
        })
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  private writeIndex(storage: Storage, index: SaveIndexEntry[]): void {
    storage.setItem(this.indexKey(), JSON.stringify(index));
  }
}

export { GameSaves };
export type { GameSavesOptions, SaveFile, SaveId, SaveIndexEntry };
