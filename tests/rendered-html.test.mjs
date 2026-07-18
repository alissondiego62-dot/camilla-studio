import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { once } from "node:events";
import test from "node:test";

const port = 39173;
let server;
const buildAvailable=existsSync(new URL("../.output/server/index.mjs",import.meta.url));

const routes = new Map([
  ["/dashboard", "Dashboard"],
  ["/projects", "Projetos"],
  ["/projects/00000000-0000-4000-8000-000000000000", "Carregando projeto"],
  ["/kanban", "Kanban"],
  ["/activities", "Atividades"],
  ["/agenda", "Agenda"],
  ["/clients", "Clientes"],
  ["/clients/00000000-0000-4000-8000-000000000000", "Cliente"],
  ["/finance", "Financeiro"],
  ["/notifications", "Notificações"],
  ["/settings", "Configurações"],
  ["/settings/general", "Configurações gerais"],
  ["/settings/system", "Informações do sistema"],
  ["/settings/users", "Usuários"],
  ["/settings/permissions", "Perfis e permissões"],
  ["/settings/workflows", "Etapas e status"],
  ["/settings/checklists", "Checklists"],
  ["/settings/notifications", "Notificações"],
  ["/settings/agenda", "Agenda"],
  ["/settings/finance", "Financeiro"],
  ["/settings/categories", "Categorias"],
  ["/settings/files", "Arquivos e miniaturas"],
  ["/settings/security", "Segurança"],
  ["/settings/integrations", "Integrações"],
  ["/settings/google-drive", "Google Drive"],
  ["/settings/versions", "Histórico de versões"],
]);

async function waitForServer() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/dashboard`);
      if (response.status > 0) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error("O servidor de teste não iniciou dentro do limite esperado.");
}

test.before(async (context) => {
  if(!buildAvailable){context.skip("Build não incluído no pacote de distribuição.");return;}
  server = spawn(process.execPath, [".output/server/index.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await waitForServer();
});

test.after(async () => {
  if(!buildAvailable)return;
  if (!server || server.killed) return;
  server.kill("SIGTERM");
  await Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  if (!server.killed) server.kill("SIGKILL");
});

test("redireciona a raiz para o dashboard", {skip:!buildAvailable}, async () => {
  const response = await fetch(`http://127.0.0.1:${port}/`, { redirect: "manual" });
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location")).pathname, "/dashboard");
});

for (const [route, title] of routes) {
  test(`renderiza ${route} de forma independente`, {skip:!buildAvailable}, async () => {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      headers: { accept: "text/html" },
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    const html = await response.text();
    assert.match(html, /<html lang="pt-BR">/i);
    assert.match(html, /Camilla Studio/i);
    assert.match(html, /Pular para o conteúdo principal/i);
    assert.match(html, /id="main-content"/i);
    assert.match(html, new RegExp(title, "i"));
  });
}
