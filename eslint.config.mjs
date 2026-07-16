import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".output/**",
    "dist/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/functions/**",
    // Código histórico preservado somente para referência e reversão.
    "app/legacy-page.tsx",
    "app/components/ActivitiesWorkspace.tsx",
    "app/components/ArchitectureAgendaCalendar.tsx",
    "app/components/DriveIntegrationSettings.tsx",
    "app/components/InstallationAgendaView.tsx",
    "app/components/NotificationSettings.tsx",
    "components/**",
  ]),
]);

export default eslintConfig;
