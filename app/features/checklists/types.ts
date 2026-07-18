export type ChecklistTemplateItem={id:string;template_id:string;title:string;section:string|null;required:boolean;position:number;active:boolean};
export type StageChecklist={stage_id:string;stage_code:string;stage_name:string;stage_color:string|null;stage_position:number;template_id:string;items:ChecklistTemplateItem[]};
export type ChecklistTemplate={id:string;name:string;description:string|null;stage_code:string;active:boolean;version:number;created_at:string;updated_at:string;items:ChecklistTemplateItem[]};
