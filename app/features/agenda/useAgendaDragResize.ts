"use client";
import { useCallback, useEffect, useRef } from "react";
import { resizeItem } from "./agenda-date-utils";
import type { AgendaItem } from "./types";

export function useAgendaDragResize({snapMinutes,onResize}:{snapMinutes:number;onResize:(item:AgendaItem,endsAt:string)=>void}){
 const active=useRef<{item:AgendaItem;startY:number;lastSteps:number}|null>(null);
 const beginResize=useCallback((item:AgendaItem,event:React.PointerEvent)=>{event.preventDefault();event.stopPropagation();active.current={item,startY:event.clientY,lastSteps:0};(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)},[]);
 useEffect(()=>{function move(event:PointerEvent){if(!active.current)return;active.current.lastSteps=Math.round((event.clientY-active.current.startY)/12)}function end(){const value=active.current;active.current=null;if(!value||value.lastSteps===0)return;onResize(value.item,resizeItem(value.item,value.lastSteps*snapMinutes))}window.addEventListener("pointermove",move);window.addEventListener("pointerup",end);return()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",end)}},[onResize,snapMinutes]);
 return{beginResize};
}
