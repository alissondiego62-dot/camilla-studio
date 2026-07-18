import { EmptyState } from "@/app/components/ui/DataState";
import { FinanceEntriesTable } from "./FinanceEntriesTable";
import type { FinanceEntryRow } from "../types";

type Props = {
  items: FinanceEntryRow[];
  canViewValues: boolean;
  canSettle: boolean;
  onOpen: (id: string) => void;
  onSettle: (entry: FinanceEntryRow) => void;
  canCancel: boolean;
  onCancel: (entry: FinanceEntryRow) => void;
  canDelete: boolean;
  onDelete: (entry: FinanceEntryRow) => void;
};

export function FinanceRevenue({items,canViewValues,canSettle,onOpen,onSettle,canCancel,onCancel,canDelete,onDelete}:Props){return items.length?<FinanceEntriesTable items={items} canViewValues={canViewValues} canSettle={canSettle} onOpen={onOpen} onSettle={onSettle} canCancel={canCancel} onCancel={onCancel} canDelete={canDelete} onDelete={onDelete}/>:<EmptyState title="Nenhuma receita" description="Não há receitas para os filtros selecionados."/>}
