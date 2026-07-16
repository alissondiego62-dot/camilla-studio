"use client";

import Image from "next/image";
import { useState } from "react";
import type { FormEvent } from "react";
import { CAMILLA_BRAND } from "@/app/config/brand";
import { useAuth } from "@/app/providers/AuthProvider";
import { Button } from "@/app/components/ui/Button";
import { FeedbackMessage } from "@/app/components/ui/FeedbackMessage";

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="cs-login-page">
      <section className="cs-login-card">
        <Image
          src={CAMILLA_BRAND.logoPath}
          alt={CAMILLA_BRAND.companyName}
          width={210}
          height={216}
          priority
        />
        <div>
          <span className="cs-kicker">GESTÃO DE ARQUITETURA</span>
          <h1>{CAMILLA_BRAND.productName}</h1>
          <p>Projetos, agenda, atividades, clientes e financeiro em um único ambiente.</p>
        </div>
        <form onSubmit={submit} className="cs-form-stack">
          <label>
            <span>E-mail</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            <span>Senha</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <FeedbackMessage error={error} />
          <Button variant="primary" loading={busy}>Entrar</Button>
        </form>
      </section>
    </main>
  );
}
