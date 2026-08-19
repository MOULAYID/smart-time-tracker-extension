export class MemoryRepository {
  constructor(state = null) { this.state = state; this.intervals = []; }
  async addInterval(interval) { this.intervals.push(interval); }
  async saveTrackerState(state) { this.state = structuredClone(state); }
  async loadTrackerState() { return this.state && structuredClone(this.state); }
}
