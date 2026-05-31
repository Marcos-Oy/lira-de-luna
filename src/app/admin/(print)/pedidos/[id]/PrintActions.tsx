"use client";

export default function PrintActions({ orderNumber }: { orderNumber: string }) {
  return (
    <div className="no-print bg-[#F7F4F1] border-b border-[#D8BFAE] px-6 py-3 flex items-center justify-between">
      <p className="text-[10px] tracking-[0.15em] uppercase text-[#8E7A6B]">
        Vista previa — pedido #{orderNumber}
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#CDA78F] hover:bg-[#8E7A6B] text-white text-[10px] tracking-[0.15em] uppercase px-5 py-2 transition-colors"
        >
          Imprimir / Guardar PDF
        </button>
        <button
          onClick={() => window.close()}
          className="text-[10px] tracking-[0.12em] uppercase px-5 py-2 border border-[#D8BFAE] text-[#8E7A6B] hover:border-[#CDA78F] transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
