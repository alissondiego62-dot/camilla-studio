import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
export function FormField({ label, className="", ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className={className}><span>{label}</span><input {...props}/></label>; }
export function SelectField({ label, children, className="", ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) { return <label className={className}><span>{label}</span><select {...props}>{children}</select></label>; }
