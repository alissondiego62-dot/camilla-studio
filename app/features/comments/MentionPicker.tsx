"use client";
import type { MentionOption } from "./types";

export function MentionPicker({ users, value, onChange }: { users: MentionOption[]; value: string[]; onChange: (value: string[]) => void }) {
  return <label className="cs-mention-picker"><span>Mencionar usuários</span><select multiple value={value} onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>{users.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}</select><small>Use Ctrl ou Cmd para selecionar mais de uma pessoa.</small></label>;
}
