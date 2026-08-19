const DB_NAME = "smart-time-tracker";
const DB_VERSION = 2;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDbTrackingRepository {
  constructor(indexedDBFactory = globalThis.indexedDB) { this.factory = indexedDBFactory; this.db = null; }
  async open() {
    if (!this.factory) throw new Error("IndexedDB is unavailable");
    const request = this.factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("activityIntervals")) {
        const intervals = db.createObjectStore("activityIntervals", { keyPath: "id" });
        intervals.createIndex("startedAt", "startedAt");
        intervals.createIndex("domain", "domain");
      }
      if (!db.objectStoreNames.contains("trackerState")) db.createObjectStore("trackerState", { keyPath: "key" });
      if (!db.objectStoreNames.contains("classificationRules")) {
        const rules = db.createObjectStore("classificationRules", { keyPath: "id" });
        rules.createIndex("typePattern", ["type", "pattern"], { unique: true });
      }
    };
    this.db = await requestResult(request);
    return this;
  }
  async addInterval(interval) { return this.#write("activityIntervals", "add", interval); }
  async saveTrackerState(state) { return this.#write("trackerState", "put", { key: "current", ...state }); }
  async loadTrackerState() {
    const row = await this.#read("trackerState", "current");
    if (!row) return null;
    const { key, ...state } = row;
    return state;
  }
  async listIntervals({ from, to, limit = 500 }) {
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) throw new Error("Invalid interval range");
    const tx = this.db.transaction("activityIntervals", "readonly");
    const index = tx.objectStore("activityIntervals").index("startedAt");
    const range = IDBKeyRange.bound(from, to, false, true);
    const rows = await requestResult(index.getAll(range, Math.min(Math.max(limit, 1), 2000)));
    return rows.sort((a, b) => b.startedAt - a.startedAt);
  }
  async updateIntervalClassification(id, classification) {
    const row = await this.#read("activityIntervals", id);
    if (!row) throw new Error("Activity interval not found");
    return this.#write("activityIntervals", "put", { ...row, classification });
  }
  async listClassificationRules() {
    const tx = this.db.transaction("classificationRules", "readonly");
    return requestResult(tx.objectStore("classificationRules").getAll());
  }
  async #write(store, method, value) {
    const tx = this.db.transaction(store, "readwrite");
    await requestResult(tx.objectStore(store)[method](value));
  }
  async #read(store, key) {
    const tx = this.db.transaction(store, "readonly");
    return requestResult(tx.objectStore(store).get(key));
  }
}
