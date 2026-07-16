"use client";
import { Modal } from "@/app/components/ui/Modal";
import { Button } from "@/app/components/ui/Button";
export function AgendaCreateMenu({dateLabel,onEvent,onActivity,onClose}:{dateLabel:string;onEvent:()=>void;onActivity:()=>void;onClose:()=>void}){return <Modal title="Adicionar à Agenda" onClose={onClose}><div className="cs-agenda-create-menu"><p>Data selecionada: <strong>{dateLabel}</strong></p><Button variant="primary" onClick={onEvent}>Criar evento</Button><Button onClick={onActivity}>Criar atividade</Button></div></Modal>}
