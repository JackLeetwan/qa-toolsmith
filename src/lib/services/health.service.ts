import type { HealthDTO } from "../../types/types";

/**
 * Checks application health status
 * @returns Application health status
 */
export function getHealth(): HealthDTO {
  // More complex checks can be added in the future
  return { status: "ok" };
}
