import type { DashboardGroupPoint } from "../types";
export function totalPoints(points: DashboardGroupPoint[]) { return points.reduce((sum, item) => sum + Number(item.count || 0), 0); }
export function pointPercent(value: number, total: number) { return total > 0 ? Math.max(1, (value / total) * 100) : 0; }
