import { Suspense } from "react";
import { LoadingState } from "@/app/components/ui/DataState";
import { ProjectsPage } from "@/app/features/projects/ProjectsPage";
export default function Page() { return <Suspense fallback={<LoadingState />}><ProjectsPage /></Suspense>; }
