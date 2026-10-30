class KeyAccumulator {
  private pressedKeys = new Set<string>();

  handleKeyDown(key: string): void {
    this.pressedKeys.add(key);
  }

  handleKeyUp(key: string): void {
    this.pressedKeys.delete(key);
  }

  getPressedKeys(): string[] {
    return Array.from(this.pressedKeys);
  }

  isPressed(key: string): boolean {
    return this.pressedKeys.has(key);
  }
}

export { KeyAccumulator };
