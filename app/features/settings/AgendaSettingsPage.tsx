import { AdministrativeSettingsPage, type AdminField } from "./AdministrativeSettingsPage";
const fields:AdminField[]=[
 {key:"agenda_default_view",label:"Visualização padrão",type:"select",defaultValue:"week",options:[{value:"day",label:"Dia"},{value:"week",label:"Semana"},{value:"month",label:"Mês"}]},
 {key:"agenda_week_starts_on",label:"Início da semana",type:"select",defaultValue:"monday",options:[{value:"monday",label:"Segunda-feira"},{value:"sunday",label:"Domingo"}]},
 {key:"agenda_snap_minutes",label:"Intervalo de arraste em minutos",type:"select",defaultValue:15,options:[{value:"15",label:"15 minutos"},{value:"30",label:"30 minutos"},{value:"60",label:"60 minutos"}]},
 {key:"agenda_show_weekends",label:"Exibir fins de semana",type:"checkbox",defaultValue:true},
 {key:"agenda_hide_cancelled",label:"Ocultar cancelados por padrão",type:"checkbox",defaultValue:true},
];
export function AgendaSettingsPage(){return <AdministrativeSettingsPage title="Agenda" subtitle="Preferências regionais, intervalos e visualização" fields={fields}/>}
