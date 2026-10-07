/** Memorie scurtă a ultimelor probleme, ca să nu reapară aceeași combinație prea curând. */
export class RecentKeys {
  private keys: string[];
  private set: Set<string>;

  constructor(
    private capacity = 300,
    initial: string[] = [],
  ) {
    this.keys = initial.slice(-capacity);
    this.set = new Set(this.keys);
  }

  has(key: string): boolean {
    return this.set.has(key);
  }

  add(key: string): void {
    if (this.set.has(key)) return;
    this.keys.push(key);
    this.set.add(key);
    while (this.keys.length > this.capacity) {
      const old = this.keys.shift()!;
      this.set.delete(old);
    }
  }

  toJSON(): string[] {
    return this.keys.slice();
  }
}
