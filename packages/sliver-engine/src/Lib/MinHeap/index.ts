class MinHeap<T> {
  private data: T[] = [];

  constructor(private getScore: (item: T) => number) {}

  public get size(): number {
    return this.data.length;
  }

  public push(item: T): void {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  public pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const first = this.data[0]!;
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.bubbleDown(0);
    }
    return first;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (
        this.getScore(this.data[index]!) >= this.getScore(this.data[parent]!)
      ) {
        break;
      }
      [this.data[index], this.data[parent]] = [
        this.data[parent]!,
        this.data[index]!,
      ];
      index = parent;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.data.length;

    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;

      if (
        left < length &&
        this.getScore(this.data[left]!) < this.getScore(this.data[smallest]!)
      ) {
        smallest = left;
      }

      if (
        right < length &&
        this.getScore(this.data[right]!) < this.getScore(this.data[smallest]!)
      ) {
        smallest = right;
      }

      if (smallest === index) {
        return;
      }

      [this.data[index], this.data[smallest]] = [
        this.data[smallest]!,
        this.data[index]!,
      ];
      index = smallest;
    }
  }
}

export { MinHeap };
