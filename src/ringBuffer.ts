export class RingBuffer<T> {
  private buf: T[] = [];
  private cursor = 0;

  constructor(private readonly size: number) {
    if (size <= 0) throw new Error('RingBuffer size must be > 0');
  }

  push(item: T): void {
    if (this.buf.length < this.size) {
      this.buf.push(item);
      return;
    }
    this.buf[this.cursor] = item;
    this.cursor = (this.cursor + 1) % this.size;
  }

  toArray(): T[] {
    if (this.buf.length < this.size) return this.buf.slice();
    return this.buf.slice(this.cursor).concat(this.buf.slice(0, this.cursor));
  }

  clear(): void {
    this.buf = [];
    this.cursor = 0;
  }

  get length(): number {
    return this.buf.length;
  }
}
