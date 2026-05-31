"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden flex items-center gap-2 px-6 py-2.5 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.2em] uppercase transition-colors"
    >
      <Printer size={13} strokeWidth={1.5} />
      Guardar / Imprimir PDF
    </button>
  );
}
