"use client";

import { useEffect, useState } from "react";

type Props = {
  professionals: string[];
  defaultProfessional?: string;
  onChange?: (name: string) => void;
};

export default function ProfessionalFilterBar({
  professionals,
  defaultProfessional,
  onChange,
}: Props) {
  const [selected, setSelected] = useState(defaultProfessional || "");

  useEffect(() => {
    if (defaultProfessional) {
      setSelected(defaultProfessional);
      onChange?.(defaultProfessional);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultProfessional]);

  async function linkToMe() {
    if (!selected) return;

    const r = await fetch("/api/me/link-professional", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ konsistMedicoNome: selected }),
    });

    if (!r.ok) {
      alert("Erro ao vincular profissional.");
      return;
    }

    alert("Vinculado! Da próxima vez já abre no seu nome.");
  }

  function handleChange(value: string) {
    setSelected(value);
    onChange?.(value);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <label className="text-sm opacity-80">Profissional</label>

      <select
        className="h-9 rounded-md border border-white/10 bg-black/30 px-3"
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
      >
        <option value="">Todos</option>
        {professionals.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <button
        className="h-9 rounded-md bg-white/10 px-3 hover:bg-white/20"
        onClick={linkToMe}
        disabled={!selected}
        title={!selected ? "Selecione um profissional" : "Vincular esse profissional ao seu usuário"}
      >
        Vincular a mim
      </button>
    </div>
  );
}
