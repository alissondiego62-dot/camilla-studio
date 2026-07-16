export type ChecklistTemplate={id:string;name:string;description:string|null;stage_code:string;active:boolean;version:number;created_at:string;updated_at:string;items:ChecklistTemplateItem[]};
export type ChecklistTemplateItem={id:string;template_id:string;title:string;section:string|null;required:boolean;position:number;active:boolean};
