import { ClientDetailPage } from "@/app/features/clients/ClientDetailPage";
export default async function Page({params}:{params:Promise<{id:string}>|{id:string}}){const resolved=await params;return <ClientDetailPage clientId={resolved.id}/>}
