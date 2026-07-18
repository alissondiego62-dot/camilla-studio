import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const root=process.cwd();
test("gestão de usuários existe somente dentro de Configurações",()=>{
  assert.equal(existsSync(resolve(root,"app/(studio)/settings/users/page.tsx")),true);
  assert.equal(existsSync(resolve(root,"app/(studio)/users/page.tsx")),false);
  assert.equal(existsSync(resolve(root,"app/users/page.tsx")),false);
});
