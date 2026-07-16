"use client";
import { useState } from "react";

export function DriveIntegrationSettings() {
  const [rootFolder, setRootFolder] = useState("Camilla Studio — Projetos");
  const [thumbs, setThumbs] = useState(true);
  const [syncMode, setSyncMode] = useState("manual");
  const [recursiveSync, setRecursiveSync] = useState(true);
  return <section className="drive-settings panel publicolor-settings-card">
    <div className="panel-head"><div><p className="eyebrow">INTEGRAÇÃO</p><h2>Google Drive</h2><p>Base preparada para receber o mesmo fluxo de upload, sincronização e auditoria usado na Publicolor.</p></div><span className="integration-status pending">Aguardando OAuth</span></div>
    <section className="drive-capability-grid">
      <article><span>↑</span><div><b>Upload direto</b><small>Enviar PDFs, DWGs, imagens e documentos sem sair do projeto.</small></div></article>
      <article><span>↻</span><div><b>Sincronização</b><small>Localizar arquivos adicionados diretamente no Drive.</small></div></article>
      <article><span>▧</span><div><b>Miniaturas</b><small>Capas de projetos e prévias para imagens e PDFs.</small></div></article>
      <article><span>⌁</span><div><b>Auditoria</b><small>Registrar envio, atualização, exclusão e responsável.</small></div></article>
    </section>
    <div className="drive-settings-grid">
      <label>Pasta raiz<input value={rootFolder} onChange={(event) => setRootFolder(event.target.value)} /></label>
      <label>Sincronização<select value={syncMode} onChange={(event) => setSyncMode(event.target.value)}><option value="manual">Manual</option><option value="on_open">Ao abrir o projeto</option><option value="scheduled">Agendada</option></select></label>
      <label className="switch-line"><input type="checkbox" checked={thumbs} onChange={(event) => setThumbs(event.target.checked)} /><span>Gerar e exibir miniaturas de PDFs e imagens</span></label>
      <label className="switch-line"><input type="checkbox" checked={recursiveSync} onChange={(event) => setRecursiveSync(event.target.checked)} /><span>Sincronizar subpastas recursivamente</span></label>
    </div>
    <div className="drive-folder-preview"><b>Estrutura padrão</b><code>{rootFolder}/Cliente/Projeto/01-Contrato · 02-Briefing · 03-Levantamento · 04-Criação · 05-Aprovações · 06-Executivo · 07-Revisões · 08-Renders · 09-Obra</code></div>
    <div className="drive-action-row"><button disabled>Conectar conta Google</button><button disabled>Testar conexão</button><button disabled>Sincronizar estrutura</button></div>
    <p className="settings-note">Próxima etapa: criar as rotas OAuth, persistir tokens de forma segura e adaptar o upload retomável da Publicolor para a tabela project_files.</p>
  </section>;
}
