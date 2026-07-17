"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModuleFrame } from "@/app/components/ui/ModuleFrame";
import { Button } from "@/app/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/app/components/ui/DataState";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";
import { ActivitiesToolbar } from "./ActivitiesToolbar";
import { ActivityBulkActions } from "./ActivityBulkActions";
import { ActivityDrawer } from "./ActivityDrawer";
import { useActivitiesWorkspace } from "./useActivitiesWorkspace";
import { ActivityTableView } from "./views/ActivityTableView";
import { ActivityListView } from "./views/ActivityListView";
import { ActivityBoardView } from "./views/ActivityBoardView";
import { ActivityCalendarView } from "./views/ActivityCalendarView";
import { ActivityTimelineView } from "./views/ActivityTimelineView";

export function ActivitiesWorkspace(){
 const workspace=useActivitiesWorkspace();const router=useRouter();const params=useSearchParams();const setDrawerId=workspace.setDrawerId;
 useEffect(()=>{const timer=window.setTimeout(()=>{const activity=params.get("activity");const create=params.get("new");if(activity)setDrawerId(activity);else if(create==="1")setDrawerId("new")},0);return()=>window.clearTimeout(timer)},[params,setDrawerId]);
 function openDrawer(id:string|"new"|null){workspace.setDrawerId(id);const next=new URLSearchParams(params.toString());if(id==="new"){next.delete("activity");next.set("new","1")}else if(id){next.delete("new");next.set("activity",id)}else{next.delete("activity");next.delete("new")}router.replace(`/activities${next.toString()?`?${next}`:""}`,{scroll:false})}
 function boardMove(id:string,group:string){const item=workspace.items.find((value)=>value.id===id);if(!item)return;if(workspace.grouping==="responsible"){const user=workspace.options.users.find((value)=>value.id===group);void workspace.quickUpdate(id,{responsible_user_id:group==="__none"?null:group,responsible_name:user?.name??null})}else if(workspace.grouping==="project"){void workspace.quickUpdate(id,{project_id:group==="__none"?null:group})}else if(workspace.grouping==="priority"){void workspace.quickUpdate(id,{priority:group})}else void workspace.changeStatus(id,group)}
 const canCreate=workspace.permissions.can("activities","create");const canEdit=workspace.permissions.can("activities","edit","assigned");const canDelete=workspace.permissions.can("activities","delete","assigned");const canArchive=workspace.permissions.can("activities","archive","assigned")||canEdit;const canFiles=workspace.permissions.can("files","add_file","assigned");const canComments=workspace.permissions.can("comments","create","assigned");const canInternal=workspace.permissions.can("comments","create_internal","assigned");
 const allRows=workspace.filtered.flatMap((item)=>[item,...(item.children??[])]);
 return <ModuleFrame title="Atividades" subtitle="Tabela, lista, quadro, calendário e linha do tempo sobre os mesmos registros">
  <ActivitiesToolbar view={workspace.view} onView={workspace.setView} filters={workspace.filters} onFilters={(value)=>{workspace.setFilters(value);workspace.setPage(0)}} sorting={workspace.sorting} onSorting={workspace.setSorting} grouping={workspace.grouping} onGrouping={workspace.setGrouping} options={workspace.options} visible={workspace.visibleProperties} onVisible={workspace.setVisibleProperties} columnOrder={workspace.columnOrder} onColumnOrder={workspace.setColumnOrder} widths={workspace.columnWidths} onWidths={workspace.setColumnWidths} savedViews={workspace.savedViews} activeSavedViewId={workspace.activeSavedViewId} onLoadView={workspace.applySavedView} onSaveView={(name,isDefault)=>void workspace.persistView(name,isDefault)} onDeleteView={(id)=>void workspace.removeView(id)} selectedCount={workspace.selected.size} onNew={()=>openDrawer("new")} onReload={()=>void workspace.reload()} canCreate={canCreate}/>
  <ActivityBulkActions count={workspace.selected.size} options={workspace.options} pending={workspace.action.pending} onApply={(changes)=>void workspace.applyBulk(changes)} onClear={()=>workspace.setSelected(new Set())}/>
  <FeedbackMessage error={workspace.action.error} success={workspace.action.success}/>
  {workspace.error&&<ErrorState message={workspace.error} onRetry={()=>void workspace.reload()}/>} {workspace.loading?<LoadingState/>:workspace.filtered.length===0?<EmptyState title="Nenhuma atividade encontrada" description="Altere os filtros ou crie uma nova atividade."/>:<>
   {workspace.view==="table"&&<ActivityTableView items={workspace.filtered} options={workspace.options} visible={workspace.visibleProperties} order={workspace.columnOrder} widths={workspace.columnWidths} selected={workspace.selected} expanded={workspace.expanded} canEdit={canEdit} onSelect={workspace.toggleSelected} onSelectAll={(checked)=>workspace.setSelected(checked?new Set(allRows.map((item)=>item.id)):new Set())} onExpand={workspace.toggleExpanded} onOpen={(id)=>openDrawer(id)} onUpdate={(id,changes)=>void workspace.quickUpdate(id,changes)} onStatus={(id,status)=>void workspace.changeStatus(id,status)}/>} 
   {workspace.view==="list"&&<ActivityListView items={workspace.filtered} options={workspace.options} selected={workspace.selected} expanded={workspace.expanded} onSelect={workspace.toggleSelected} onExpand={workspace.toggleExpanded} onOpen={(id)=>openDrawer(id)} onStatus={(id,status)=>void workspace.changeStatus(id,status)} canEdit={canEdit}/>} 
   {workspace.view==="board"&&<ActivityBoardView items={workspace.filtered} options={workspace.options} grouping={workspace.grouping} canEdit={canEdit} onOpen={(id)=>openDrawer(id)} onMoveGroup={boardMove}/>} 
   {workspace.view==="calendar"&&<ActivityCalendarView items={workspace.filtered} options={workspace.options} onOpen={(id)=>openDrawer(id)}/>} 
   {workspace.view==="timeline"&&<ActivityTimelineView items={workspace.filtered} options={workspace.options} onOpen={(id)=>openDrawer(id)}/>} 
   <footer className="cs-pagination"><span>{workspace.total} atividade(s)</span><div><Button disabled={workspace.page===0} onClick={()=>workspace.setPage(Math.max(0,workspace.page-1))}>Anterior</Button><strong>{workspace.page+1} de {workspace.pageCount}</strong><Button disabled={workspace.page+1>=workspace.pageCount} onClick={()=>workspace.setPage(workspace.page+1)}>Próxima</Button><select value={workspace.pageSize} onChange={(e)=>{workspace.setPageSize(Number(e.target.value));workspace.setPage(0)}}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></div></footer>
  </>}
  {workspace.drawerId&&<ActivityDrawer activity={workspace.drawerActivity} isNew={workspace.drawerId==="new"} options={workspace.options} allActivities={workspace.items} defaultProjectId={params.get("project")??undefined} defaultClientId={params.get("client")??undefined} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} canArchive={canArchive} canFiles={canFiles} canComments={canComments} canInternal={canInternal} pending={workspace.action.pending} error={workspace.action.error} success={workspace.action.success} onClose={()=>openDrawer(null)} onOpen={(id)=>openDrawer(id)} onSave={workspace.saveActivity} onStatus={workspace.changeStatus} onDuplicate={(id)=>void workspace.duplicate(id)} onArchive={(id)=>void workspace.archive(id)} onReactivate={(id)=>void workspace.reactivate(id)} onDelete={(id)=>void workspace.remove(id)} onMove={workspace.move} onReload={workspace.reload}/>} 
 </ModuleFrame>
}
