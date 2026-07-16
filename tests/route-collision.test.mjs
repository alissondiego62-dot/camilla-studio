import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

test("há somente uma implementação da rota /users", () => {
  const legacy = existsSync(resolve(root, "app/users/page.tsx"));
  const studio = existsSync(resolve(root, "app/(studio)/users/page.tsx"));
  assert.equal(studio, true, "A rota oficial app/(studio)/users/page.tsx deve existir");
  assert.equal(legacy, false, "Remova app/users/page.tsx: ele colide com app/(studio)/users/page.tsx");
});

test("não existe redirecionamento redundante em settings/users", () => {
  assert.equal(
    existsSync(resolve(root, "app/(studio)/settings/users/page.tsx")),
    false,
    "A gestão de usuários deve usar somente /users",
  );
});
