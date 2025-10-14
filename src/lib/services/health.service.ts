import type { HealthDTO } from "../../types/types";

export class HealthService {
  /**
   * Checks application health status
   * @returns Application health status
   */
  static getHealth(): HealthDTO {
    // More complex checks can be added in the future
    return { status: "ok" };
  }
}
