"use client";
import { Button } from "@/app/components/ui/Button";
import type { ActivityFilters, ActivityGroupBy, ActivitySavedView, ActivitySort, ActivityViewType, ActivityWorkspaceOptions } from "./types";

const viewLabels: Record<ActivityViewType,string> = { table:"Tabela", list:"Lista", board:"Quadro", calendar:"Calendário", timeline:"Linha do tempo" };
const propertyLabels: Record<string,string> = { title:"Atividade", project:"Projeto", client:"Cliente", responsible:"Responsável", status:"Status", priority:"Prioridade", start:"Início", due:"Prazo", stage:"Etapa", tags:"Tags", progress:"Progresso", updated:"Última edição" };

export function ActivitiesToolbar(props: {
  view: ActivityViewType; onView: (view: ActivityViewType) => void; filters: ActivityFilters; onFilters: (filters: ActivityFilters) => void;
  sorting: ActivitySort[]; onSorting: (sort: ActivitySort[]) => void; grouping: ActivityGroupBy; onGrouping: (group: ActivityGroupBy) => void;
  options: ActivityWorkspaceOptions; visible: string[]; onVisible: (items: string[]) => void; columnOrder: string[]; onColumnOrder:(items:string[])=>void;
  widths: Record<string,number>; onWidths:(value:Record<string,number>)=>void; savedViews: ActivitySavedView[]; activeSavedViewId:string;
  onLoadView:(view:ActivitySavedView)=>void; onSaveView:(name:string,isDefault:boolean)=>void; onDeleteView:(id:string)=>void;
  selectedCount:number; onNew:()=>void; onReload:()=>void; canCreate:boolean;
}) {
  const { filters, options } = props;
  function toggleProperty(property:string){ props.onVisible(props.visible.includes(property)?props.visible.filter((item)=>item!==property):[...props.visible,property]); }
  function moveProperty(property:string,direction:number){ const order=[...props.columnOrder]; const index=order.indexOf(property); const target=index+direction; if(index<0||target<0||target>=order.length)return; [order[index],order[target]]=[order[target],order[index]]; props.onColumnOrder(order); }
  return <section className="cs-activities-toolbar">
    <div className="cs-activities-toolbar-main">
      {props.canCreate && <Button variant="primary" onClick={props.onNew}>＋ Nova atividade</Button>}
      <label className="cs-activity-search"><span>⌕</span><input value={filters.search} onChange={(e)=>props.onFilters({...filters,search:e.target.value})} placeholder="Pesquisar atividades…" /></label>
      <select aria-label="Visualização" value={props.view} onChange={(e)=>props.onView(e.target.value as ActivityViewType)}>{Object.entries(viewLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
      <details><summary>Filtros</summary><div className="cs-activity-popover cs-filter-popover">
        <label>Status<select value={filters.statuses[0]??""} onChange={(e)=>props.onFilters({...filters,statuses:e.target.value?[e.target.value]:[]})}><option value="">Todos</option>{options.statuses.map((item)=><option key={item.code} value={item.code}>{item.name}</option>)}</select></label>
        <label>Prioridade<select value={filters.priorities[0]??""} onChange={(e)=>props.onFilters({...filters,priorities:e.target.value?[e.target.value]:[]})}><option value="">Todas</option><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select></label>
        <label>Responsável<select value={filters.responsibleId} onChange={(e)=>props.onFilters({...filters,responsibleId:e.target.value})}><option value="">Todos</option>{options.users.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Projeto<select value={filters.projectId} onChange={(e)=>props.onFilters({...filters,projectId:e.target.value})}><option value="">Todos</option>{options.projects.map((item)=><option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label>
        <label>Cliente<select value={filters.clientId} onChange={(e)=>props.onFilters({...filters,clientId:e.target.value})}><option value="">Todos</option>{options.clients.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Prazo<select value={filters.due} onChange={(e)=>props.onFilters({...filters,due:e.target.value as ActivityFilters["due"]})}><option value="all">Todos</option><option value="overdue">Vencidas</option><option value="today">Hoje</option><option value="week">Próximos 7 dias</option><option value="no_date">Sem prazo</option></select></label>
        <label>Tag<input value={filters.tag} onChange={(e)=>props.onFilters({...filters,tag:e.target.value})} /></label>
        <label className="cs-check-option"><input type="checkbox" checked={filters.includeArchived} onChange={(e)=>props.onFilters({...filters,includeArchived:e.target.checked})}/> Mostrar arquivadas</label>
      </div></details>
      <details><summary>Ordenar</summary><div className="cs-activity-popover"><label>Propriedade<select value={props.sorting[0]?.property??"updated"} onChange={(e)=>props.onSorting([{property:e.target.value,direction:props.sorting[0]?.direction??"desc"}])}>{Object.entries(propertyLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label>Direção<select value={props.sorting[0]?.direction??"desc"} onChange={(e)=>props.onSorting([{property:props.sorting[0]?.property??"updated",direction:e.target.value as "asc"|"desc"}])}><option value="asc">Crescente</option><option value="desc">Decrescente</option></select></label></div></details>
      <details><summary>Agrupar</summary><div className="cs-activity-popover"><select value={props.grouping} onChange={(e)=>props.onGrouping(e.target.value as ActivityGroupBy)}><option value="none">Sem agrupamento</option><option value="status">Status</option><option value="responsible">Responsável</option><option value="project">Projeto</option><option value="priority">Prioridade</option></select></div></details>
      <details><summary>Propriedades</summary><div className="cs-activity-popover cs-properties-popover">{props.columnOrder.filter((item)=>item!=="select").map((property)=><div className="cs-property-row" key={property}><label><input type="checkbox" checked={props.visible.includes(property)} onChange={()=>toggleProperty(property)}/>{propertyLabels[property]??property}</label><input aria-label={`Largura de ${property}`} type="number" min="90" max="600" value={props.widths[property]??150} onChange={(e)=>props.onWidths({...props.widths,[property]:Number(e.target.value)})}/><button type="button" onClick={()=>moveProperty(property,-1)}>↑</button><button type="button" onClick={()=>moveProperty(property,1)}>↓</button></div>)}</div></details>
      <details><summary>Visualizações</summary><div className="cs-activity-popover cs-saved-views"><button type="button" onClick={()=>{const name=prompt("Nome da visualização");if(name?.trim())props.onSaveView(name.trim(),false)}}>Salvar visualização atual</button><button type="button" onClick={()=>{const name=prompt("Nome da visualização padrão");if(name?.trim())props.onSaveView(name.trim(),true)}}>Salvar como padrão</button>{props.savedViews.map((saved)=><div key={saved.id} className={props.activeSavedViewId===saved.id?"active":""}><button type="button" onClick={()=>props.onLoadView(saved)}>{saved.name}{saved.is_default?" · padrão":""}</button><button type="button" aria-label={`Excluir ${saved.name}`} onClick={()=>props.onDeleteView(saved.id)}>×</button></div>)}</div></details>
      <Button onClick={props.onReload}>Atualizar</Button>
    </div>
    {props.selectedCount>0&&<p className="cs-selection-summary"><strong>{props.selectedCount}</strong> atividade(s) selecionada(s).</p>}
  </section>;
}
