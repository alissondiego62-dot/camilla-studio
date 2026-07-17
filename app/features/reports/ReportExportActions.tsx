"use client";
import { Button } from "@/app/components/ui/Button";
import { exportReportCsv } from "./reports.export";
import { registerReportExport } from "./reports.service";
import type { ReportDefinition,ReportFilter } from "./types";
export function ReportExportActions({definition,filters,rows,canExport}:{definition:ReportDefinition;filters:ReportFilter;rows:Array<Record<string,unknown>>;canExport:boolean}){if(!canExport)return null;async function csv(){exportReportCsv(definition,rows);await registerReportExport(definition.code,"csv",filters,rows.length)}async function pdf(){await registerReportExport(definition.code,"pdf",filters,rows.length);window.print()}return <div className="cs-report-export-actions"><Button onClick={()=>void csv()}>Exportar planilha</Button><Button variant="primary" onClick={()=>void pdf()}>Imprimir / salvar PDF</Button></div>}
