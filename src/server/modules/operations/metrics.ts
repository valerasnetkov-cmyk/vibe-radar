export type JobMetric = { jobName: string; status: string; attempts: number; recordedAt: string };

export class OperationalMetrics {
  private readonly records: JobMetric[] = [];

  record(jobName: string, status: string, attempts: number): void {
    this.records.push({ jobName, status, attempts, recordedAt: new Date().toISOString() });
    if (this.records.length > 1000) this.records.shift();
  }

  snapshot(): readonly JobMetric[] {
    return [...this.records];
  }
}
