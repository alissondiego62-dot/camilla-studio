"use client";
import { Suspense } from "react";
import { LoadingState } from "@/app/components/ui/DataState";
import { ActivitiesWorkspace } from "./ActivitiesWorkspace";
export function ActivitiesPage(){return <Suspense fallback={<LoadingState/>}><ActivitiesWorkspace/></Suspense>}
