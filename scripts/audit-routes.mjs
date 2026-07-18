import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
const root=process.cwd();const pages=[];
async function walk(dir){for(const name of await readdir(dir)){const path=join(dir,name);const info=await stat(path);if(info.isDirectory())await walk(path);else if(name==="page.tsx")pages.push(relative(root,path).replaceAll("\\","/"));}}
await walk(join(root,"app"));
const routes=new Map();for(const page of pages){const route="/"+page.replace(/^app\//,"").replace(/\/page\.tsx$/,"").split("/").filter((part)=>!/^\(.+\)$/.test(part)).join("/");const list=routes.get(route)||[];list.push(page);routes.set(route,list)}
const collisions=[...routes].filter(([,files])=>files.length>1);if(collisions.length){console.error(JSON.stringify(collisions,null,2));process.exit(1)}
console.log(`${pages.length} páginas analisadas; nenhuma colisão de rota.`);
