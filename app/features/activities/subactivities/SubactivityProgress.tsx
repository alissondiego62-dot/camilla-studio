import type { ActivityRow } from "../types";
import { activityProgress } from "../activity-display";
export function SubactivityProgress({activity}:{activity:ActivityRow}){const progress=activityProgress(activity);return <div className="cs-subactivity-progress"><progress max="100" value={progress.value}/><span>{progress.label}</span></div>}
