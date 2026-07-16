"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { usePermissions } from "@/app/hooks/usePermissions";
import {
  archiveActivity, bulkUpdateActivities, createActivity, deleteActivityLogically, deleteActivityView,
  duplicateActivity, listActivitiesPage, listActivityWorkspaceOptions, listSavedActivityViews, moveActivity,
  reactivateActivity, saveActivityView, setActivityStatus, updateActivity,
} from "./activities.service";
import { buildActivityTree, matchesActivityFilters, sortActivities } from "./activities.filters";
import { patchActivity, patchManyActivities, removeActivity, replaceActivity } from "./activities.reducer";
import type {
  ActivityFilters, ActivityGroupBy, ActivityMutation, ActivityRow, ActivitySavedView, ActivitySort,
  ActivityViewType, ActivityWorkspaceOptions,
} from "./types";
import { defaultActivityFilters, defaultColumnOrder, defaultVisibleProperties } from "./types";

const emptyOptions: ActivityWorkspaceOptions = { statuses: [], projects: [], clients: [], users: [], stages: [] };

export function useActivitiesWorkspace() {
  const permissions = usePermissions();
  const action = useAsyncAction();
  const [items, setItems] = useState<ActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<ActivityWorkspaceOptions>(emptyOptions);
  const [savedViews, setSavedViews] = useState<ActivitySavedView[]>([]);
  const [activeSavedViewId, setActiveSavedViewId] = useState("");
  const [view, setView] = useState<ActivityViewType>("table");
  const [filters, setFilters] = useState<ActivityFilters>(defaultActivityFilters);
  const [sorting, setSorting] = useState<ActivitySort[]>([{ property: "updated", direction: "desc" }]);
  const [grouping, setGrouping] = useState<ActivityGroupBy>("none");
  const [visibleProperties, setVisibleProperties] = useState<string[]>(defaultVisibleProperties);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnOrder);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({ title: 320, project: 190, responsible: 170, status: 150, due: 150 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drawerId, setDrawerId] = useState<string | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await listActivitiesPage({ page, pageSize, search: filters.search, includeArchived: filters.includeArchived });
      setItems(result.items); setTotal(result.count);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar as atividades."); }
    finally { setLoading(false); }
  }, [filters.includeArchived, filters.search, page, pageSize]);

  const loadMetadata = useCallback(async () => {
    try {
      const [nextOptions, views] = await Promise.all([listActivityWorkspaceOptions(), listSavedActivityViews()]);
      setOptions(nextOptions); setSavedViews(views);
      const defaultView = views.find((item) => item.is_default);
      if (defaultView && !activeSavedViewId) applySavedView(defaultView, false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar os filtros de atividades."); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { const timer=window.setTimeout(() => void loadMetadata(),0); return()=>window.clearTimeout(timer); }, [loadMetadata]);
  useEffect(() => { const timer=window.setTimeout(() => void load(),0); return()=>window.clearTimeout(timer); }, [load]);

  const roots = useMemo(() => buildActivityTree(items), [items]);
  const filtered = useMemo(() => sortActivities(roots.filter((item) => matchesActivityFilters(item, filters)), sorting), [filters, roots, sorting]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const treeRows = roots.flatMap((item) => [item, ...(item.children ?? [])]);
  const drawerActivity = drawerId && drawerId !== "new" ? treeRows.find((item) => item.id === drawerId) ?? null : null;

  function applySavedView(saved: ActivitySavedView, mark = true) {
    setView(saved.view_type); setFilters({ ...defaultActivityFilters, ...saved.filters }); setSorting(saved.sorting ?? []);
    setGrouping(saved.grouping?.property ?? "none"); setVisibleProperties(saved.visible_properties?.length ? saved.visible_properties : defaultVisibleProperties);
    setColumnOrder(saved.column_order?.length ? saved.column_order : defaultColumnOrder); setColumnWidths(saved.column_widths ?? {});
    setPageSize(saved.page_size || 25); setPage(0); if (mark) setActiveSavedViewId(saved.id);
  }

  const updateLocal = useCallback((next: ActivityRow) => { setItems((current) => replaceActivity(current, next)); }, []);

  async function saveActivity(id: string | null, mutation: ActivityMutation) {
    if (id) {
      const result = await action.run(() => updateActivity(id, mutation), "Atividade atualizada.");
      if (result.ok) updateLocal(result.data);
      return result;
    }
    const result = await action.run(() => createActivity(mutation), "Atividade criada.");
    if (result.ok) { await load(); setDrawerId(result.data); }
    return result;
  }

  async function quickUpdate(id: string, mutation: ActivityMutation) {
    const previous = items.find((item) => item.id === id);
    if (!previous) return;
    setItems((current) => patchActivity(current, id, mutation as Partial<ActivityRow>));
    const result = await action.run(() => updateActivity(id, mutation));
    if (result.ok) updateLocal(result.data); else setItems((current) => replaceActivity(current, previous));
  }

  async function changeStatus(id: string, status: string, force = false, reason = "") {
    const previous = items.find((item) => item.id === id); if (!previous) return;
    setItems((current) => patchActivity(current, id, { status, progress: status === "completed" ? 100 : previous.progress }));
    const result = await action.run(() => setActivityStatus(id, status, force, reason), "Status atualizado.");
    if (result.ok) { updateLocal(result.data); await load(); } else setItems((current) => replaceActivity(current, previous));
    return result;
  }

  async function applyBulk(changes: ActivityMutation) {
    const ids = [...selected]; if (!ids.length) return;
    const before = items;
    setItems((current) => patchManyActivities(current, selected, changes as Partial<ActivityRow>));
    const result = await action.run(() => bulkUpdateActivities(ids, changes), `${ids.length} atividade(s) atualizada(s).`);
    if (result.ok) { setSelected(new Set()); await load(); } else setItems(before);
  }

  async function duplicate(id: string) { const result = await action.run(() => duplicateActivity(id), "Atividade duplicada."); if (result.ok) { await load(); setDrawerId(result.data); } }
  async function archive(id: string) { const result = await action.run(() => archiveActivity(id), "Atividade arquivada."); if (result.ok) { setItems((current) => patchActivity(current, id, { archived_at: new Date().toISOString() })); setDrawerId(null); } }
  async function reactivate(id: string) { const result = await action.run(() => reactivateActivity(id), "Atividade reativada."); if (result.ok) { setItems((current) => patchActivity(current, id, { archived_at: null })); } }
  async function remove(id: string) { const result = await action.run(() => deleteActivityLogically(id), "Atividade excluída."); if (result.ok) { setItems((current) => removeActivity(current, id)); setDrawerId(null); } }
  async function move(id: string, parentId: string | null, position?: number) { const result = await action.run(() => moveActivity(id, parentId, position), "Atividade movida."); if (result.ok) await load(); return result; }

  async function persistView(name: string, isDefault = false) {
    const current = savedViews.find((item) => item.id === activeSavedViewId);
    const result = await action.run(() => saveActivityView({
      id: current?.id, name, view_type: view, filters, sorting, grouping: { property: grouping }, visible_properties: visibleProperties,
      column_order: columnOrder, column_widths: columnWidths, page_size: pageSize, is_default: isDefault || current?.is_default || false,
    }), current ? "Visualização atualizada." : "Visualização salva.");
    if (result.ok) { setSavedViews((views) => [...views.filter((item) => item.id !== result.data.id), result.data]); setActiveSavedViewId(result.data.id); }
  }

  async function removeView(id: string) { const result = await action.run(() => deleteActivityView(id), "Visualização excluída."); if (result.ok) { setSavedViews((views) => views.filter((item) => item.id !== id)); if (activeSavedViewId === id) setActiveSavedViewId(""); } }

  function toggleSelected(id: string) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function toggleExpanded(id: string) { setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }

  return {
    items: treeRows, roots, filtered, total, page, pageSize, pageCount, loading, error, options, savedViews, activeSavedViewId,
    view, filters, sorting, grouping, visibleProperties, columnOrder, columnWidths, selected, expanded, drawerId, drawerActivity,
    action, permissions,
    setPage, setPageSize, setView, setFilters, setSorting, setGrouping, setVisibleProperties, setColumnOrder, setColumnWidths,
    setSelected, toggleSelected, toggleExpanded, setDrawerId, applySavedView, saveActivity, quickUpdate, changeStatus,
    applyBulk, duplicate, archive, reactivate, remove, move, persistView, removeView, reload: load,
  };
}
