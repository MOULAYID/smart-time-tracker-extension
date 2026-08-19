const DB_NAME = "smart-time-tracker";
const DB_VERSION = 1;

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
      const intervals = db.createObjectStore("activityIntervals", { keyPath: "id" });
      intervals.createIndex("startedAt", "startedAt");
      intervals.createIndex("domain", "domain");
      db.createObjectStore("trackerState", { keyPath: "key" });
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
  async #write(store, method, value) {
    const tx = this.db.transaction(store, "readwrite");
    await requestResult(tx.objectStore(store)[method](value));
  }
  async #read(store, key) {
    const tx = this.db.transaction(store, "readonly");
    return requestResult(tx.objectStore(store).get(key));
  }
}
