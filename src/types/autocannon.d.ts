declare module 'autocannon' {
  interface AutocannonOptions {
    url: string;
    connections?: number;
    duration?: number;
    pipelining?: number;
    headers?: Record<string, string>;
    body?: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    timeout?: number;
  }

  interface AutocannonResult {
    requests: {
      total: number;
      average: number;
      mean: number;
      stddev: number;
      min: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
    };
    latency: {
      average: number;
      mean: number;
      stddev: number;
      min: number;
      max: number;
      p50: number;
      p95: number;
      p99: number;
    };
    throughput: {
      average: number;
      mean: number;
      stddev: number;
      min: number;
      max: number;
    };
    errors: number;
    timeouts: number;
    duration: number;
    start: Date;
    finish: Date;
  }

  interface AutocannonInstance {
    on(event: 'done', callback: (result: AutocannonResult) => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
  }

  function autocannon(options: AutocannonOptions): AutocannonInstance;
  export = autocannon;
}
