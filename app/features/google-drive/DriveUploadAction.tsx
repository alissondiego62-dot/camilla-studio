"use client";
import { useRef } from "react";
import { Button } from "@/app/components/ui/Button";
import { useAsyncAction } from "@/app/hooks/useAsyncAction";
import { uploadFileToDrive } from "./google-drive.service";
import type { DriveRelation } from "./types";
export function DriveUploadAction({relation,category="other",onSaved}:{relation:DriveRelation;category?:string;onSaved:()=>Promise<void>}){const input=useRef<HTMLInputElement>(null);const action=useAsyncAction();async function choose(file?:File){if(!file)return;const result=await action.run(()=>uploadFileToDrive(file,{...relation,category,name:file.name}),"Arquivo enviado ao Google Drive.");if(result.ok)await onSaved()}return <><input ref={input} hidden type="file" onChange={(event)=>void choose(event.target.files?.[0])}/><Button loading={action.pending} onClick={()=>input.current?.click()}>Enviar ao Drive</Button>{action.error&&<small className="cs-error-text">{action.error}</small>}</>}
