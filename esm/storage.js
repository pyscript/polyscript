import IDBMap from '@webreflection/idb-map';

export default class Storage extends Map {
  #map;
  #queue;
  constructor(name) {
    super();
    this.#map = new IDBMap(name);
    this.#queue = this.#map.entries().then(entries => {
      for (const [key, value] of entries)
        this.set(key, value);
    });
  }
  async sync() {
    await this.#queue;
  }
  clear() {
    this.#queue = this.#queue.then(() => this.#map.clear());
    return super.clear();
  }
  delete(key) {
    this.#queue = this.#queue.then(() => this.#map.delete(key));
    return super.delete(key);
  }
  set(key, value) {
    this.#queue = this.#queue.then(() => this.#map.set(key, value));
    return super.set(key, value);
  }
}
