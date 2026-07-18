import{AdministrativeSettingsPage,type AdminField}from"./AdministrativeSettingsPage";
const fields:AdminField[]=[
 {key:"finance_currency",label:"Moeda",type:"select",defaultValue:"BRL",options:[{value:"BRL",label:"BRL — R$"}]},
 {key:"finance_default_environment",label:"Ambiente padrão",type:"select",defaultValue:"professional",options:[{value:"professional",label:"Profissional / CNPJ"}]},
 {key:"finance_require_approval",label:"Exigir aprovação de lançamentos",type:"checkbox",defaultValue:false},
 {key:"finance_require_environment_change_approval",label:"Exigir aprovação para mudança de ambiente",type:"checkbox",defaultValue:true},
 {key:"finance_allow_negative_balance",label:"Permitir saldo negativo",type:"checkbox",defaultValue:false},
 {key:"finance_negative_balance_warning",label:"Alertar projeção negativa",type:"checkbox",defaultValue:true},
 {key:"finance_recurring_generation_days",label:"Antecedência da recorrência em dias",type:"number",defaultValue:7},
 {key:"finance_default_payment_tolerance",label:"Tolerância para baixa excedente em R$",type:"number",defaultValue:0},
];
export function FinanceSettingsPage(){return <AdministrativeSettingsPage title="Financeiro" subtitle="Parâmetros gerais; os acessos pessoal e profissional permanecem separados no banco" fields={fields}/>}
