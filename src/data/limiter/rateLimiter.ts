/**
 * Simple rate limiter and retry helper with exponential backoff.
 */
export class RateLimiter {
  private minIntervalMs: number;
  private lastRequestTime: number = 0;

  constructor(requestsPerMinute: number = 30) {
    this.minIntervalMs = Math.ceil(60000 / requestsPerMinute);
  }

  /**
   * Waits if needed to respect the rate limit before returning.
   */
  public async schedule<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, this.minIntervalMs - elapsed));
    }
    this.lastRequestTime = Date.now();

    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (error) {
        attempt++;
        if (attempt >= maxRetries) {
          throw error;
        }
        // Exponential backoff: 500ms, 1000ms, 2000ms...
        const backoffMs = Math.pow(2, attempt) * 500;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }
}
