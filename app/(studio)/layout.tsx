import type { ReactNode } from "react";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { NotificationProvider } from "@/app/providers/NotificationProvider";
import { StudioShell } from "@/app/components/layout/StudioShell";

export default function StudioLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AuthProvider><NotificationProvider><StudioShell>{children}</StudioShell></NotificationProvider></AuthProvider>;
}
