import { ProjectDetailPage } from "@/app/features/project-detail/ProjectDetailPage";

export default async function Page({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolved = await params;
  return <ProjectDetailPage projectId={resolved.id} />;
}
