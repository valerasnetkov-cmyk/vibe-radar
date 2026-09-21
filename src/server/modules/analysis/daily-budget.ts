export class DailyAnalysisBudget {
  private day: string;
  private used = 0;

  constructor(
    private readonly limit: number,
    now = new Date(),
  ) {
    this.day = utcDay(now);
  }

  tryConsume(amount = 1, now = new Date()): boolean {
    this.resetIfNeeded(now);
    if (!Number.isInteger(amount) || amount < 1 || this.used + amount > this.limit) return false;
    this.used += amount;
    return true;
  }

  remaining(now = new Date()): number {
    this.resetIfNeeded(now);
    return Math.max(0, this.limit - this.used);
  }

  private resetIfNeeded(now: Date): void {
    const day = utcDay(now);
    if (day !== this.day) {
      this.day = day;
      this.used = 0;
    }
  }
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
