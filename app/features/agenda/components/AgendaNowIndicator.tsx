"use client";
import { minutesOfDay, todayKey } from "../agenda-date-utils";
export function AgendaNowIndicator({day}:{day:string}){if(day!==todayKey())return null;const top=minutesOfDay(new Date().toISOString())/1440*100;return <div className="cs-agenda-now" style={{top:`${top}%`}}><span/></div>}
