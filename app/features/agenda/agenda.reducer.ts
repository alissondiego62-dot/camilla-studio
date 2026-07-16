import type { AgendaItem } from "./types";
export type AgendaState={items:Record<string,AgendaItem>;order:string[]};
export type AgendaAction={type:"replace";items:AgendaItem[]}|{type:"upsert";item:AgendaItem}|{type:"remove";key:string};
export const emptyAgendaState:AgendaState={items:{},order:[]};
export function agendaReducer(state:AgendaState,action:AgendaAction):AgendaState{
 if(action.type==="replace"){const items=Object.fromEntries(action.items.map(item=>[item.item_key,item]));return{items,order:action.items.map(item=>item.item_key)}}
 if(action.type==="remove"){const items={...state.items};delete items[action.key];return{items,order:state.order.filter(key=>key!==action.key)}}
 const exists=Boolean(state.items[action.item.item_key]);return{items:{...state.items,[action.item.item_key]:action.item},order:exists?state.order:[...state.order,action.item.item_key]};
}
