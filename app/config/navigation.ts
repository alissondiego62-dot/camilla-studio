export type NavigationRequirement={module:string;action:string};
export type NavigationItem={href:string;label:string;icon:string;permissions:NavigationRequirement[]};
export const navigationItems:NavigationItem[]=[
  {href:"/dashboard",label:"Dashboard",icon:"⌂",permissions:[{module:"dashboard",action:"view"}]},
  {href:"/projects",label:"Projetos",icon:"▣",permissions:[{module:"projects",action:"view"}]},
  {href:"/kanban",label:"Kanban",icon:"▥",permissions:[{module:"kanban",action:"view"}]},
  {href:"/activities",label:"Atividades",icon:"✓",permissions:[{module:"activities",action:"view"}]},
  {href:"/agenda",label:"Agenda",icon:"◫",permissions:[{module:"agenda",action:"view"}]},
  {href:"/clients",label:"Clientes",icon:"◎",permissions:[{module:"clients",action:"view"}]},
  {href:"/finance",label:"Financeiro",icon:"R$",permissions:[{module:"finance_professional",action:"view"},{module:"finance_personal",action:"view"}]},
  {href:"/files",label:"Arquivos",icon:"↗",permissions:[{module:"files",action:"view"}]},
  {href:"/notifications",label:"Notificações",icon:"◉",permissions:[{module:"notifications",action:"view"}]},
  {href:"/history",label:"Histórico",icon:"↺",permissions:[{module:"history",action:"view"}]},
  {href:"/reports",label:"Relatórios",icon:"⌁",permissions:[{module:"reports",action:"view"}]},
  {href:"/users",label:"Usuários",icon:"♙",permissions:[{module:"users",action:"view"}]},
  {href:"/settings",label:"Configurações",icon:"⚙",permissions:[{module:"settings",action:"view"}]},
];
