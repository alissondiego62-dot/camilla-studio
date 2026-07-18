"use client";
import { useMemo } from "react";
import { useSynchronizedKanbanScroll } from "@/app/hooks/useSynchronizedKanbanScroll";
import { KanbanColumn } from "./KanbanColumn";
import type { AssignableUser, KanbanProject, WorkflowOption, WorkflowPatch } from "./types";
export function KanbanBoard({ projects, users, stages, statuses, canStage, canStatus, canResponsible, pendingIds, dropStage, onDropStage, onDropTarget, onPatch, onDragStart, onDragEnd }: {
  projects: KanbanProject[]; users: AssignableUser[]; stages:WorkflowOption[]; statuses:WorkflowOption[]; canStage:boolean;canStatus:boolean;canResponsible:boolean;pendingIds:Set<string>;dropStage:string|null;
  onDropStage:(projectId:string,stage:string)=>void;onDropTarget:(stage:string|null)=>void;onPatch:(project:KanbanProject,patch:WorkflowPatch)=>void;onDragStart:(id:string)=>void;onDragEnd:()=>void;
}){
  const dependencyKey=useMemo(()=>projects.map(p=>`${p.id}:${p.stage}`).join("|")+stages.map(s=>s.code).join("|"),[projects,stages]);
  const{boardRef,topScrollRef,scrollWidth,synchronize}=useSynchronizedKanbanScroll({enabled:true,dependencyKey});
  return <div className="cs-kanban-shell"><div className="cs-kanban-top-scroll" ref={topScrollRef} onScroll={e=>synchronize(e.currentTarget,boardRef.current)} aria-label="Rolagem horizontal superior do Kanban"><div style={{width:scrollWidth}}/></div><section className="cs-kanban cs-kanban-v3" ref={boardRef} onScroll={e=>synchronize(e.currentTarget,topScrollRef.current)} aria-label="Kanban de projetos">{stages.map(stage=><KanbanColumn key={stage.code} stage={stage.code} stageName={stage.name} stages={stages} statuses={statuses} projects={projects.filter(p=>p.stage===stage.code)} users={users} canStage={canStage} canStatus={canStatus} canResponsible={canResponsible} pendingIds={pendingIds} activeDrop={dropStage===stage.code} onDrop={onDropStage} onDragEnter={onDropTarget} onPatch={onPatch} onDragStart={onDragStart} onDragEnd={onDragEnd}/>)}</section></div>;
}
