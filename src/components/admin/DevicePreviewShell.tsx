"use client";

import { useState } from "react";
import { Smartphone, Tablet, Monitor } from "lucide-react";

type Device = "mobile" | "tablet" | "desktop";

export default function DevicePreviewShell({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<Device>("mobile");

  return (
    <div
      className="hidden xl:flex flex-col shrink-0 border-l border-[#D8BFAE] bg-[#EDEAE6] overflow-hidden"
      style={{ width: device === "mobile" ? "320px" : device === "tablet" ? "540px" : "680px" }}
    >
      {/* Device toggle bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#D8BFAE] bg-white shrink-0">
        <p className="text-[9px] tracking-[0.15em] uppercase text-[#8E7A6B]">Vista previa</p>
        <div className="flex gap-0.5">
          {([
            { id: "mobile",  Icon: Smartphone },
            { id: "tablet",  Icon: Tablet     },
            { id: "desktop", Icon: Monitor    },
          ] as const).map(({ id, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDevice(id)}
              className={`p-1.5 rounded transition-colors ${
                device === id
                  ? "bg-[#5C4A3E] text-white"
                  : "text-[#8E7A6B] hover:bg-[#D8BFAE]"
              }`}
            >
              <Icon size={13} />
            </button>
          ))}
        </div>
      </div>

      {/* Frame content */}
      <div className="flex-1 overflow-y-auto flex items-start justify-center p-5">
        {device === "mobile" ? (
          /* iPhone proportions */
          <div className="w-[240px] h-[520px] shrink-0">
            <div className="w-full h-full rounded-[2.2rem] border-[5px] border-[#3d2f26] bg-[#3d2f26] shadow-2xl flex flex-col overflow-hidden">
              <div className="h-6 shrink-0 flex items-center justify-center">
                <div className="w-16 h-3 rounded-full bg-[#2a1f17]" />
              </div>
              <div className="flex-1 bg-white overflow-y-auto min-h-0">
                {children}
              </div>
              <div className="h-5 shrink-0 flex items-center justify-center">
                <div className="w-20 h-1 rounded-full bg-[#8E7A6B]/60" />
              </div>
            </div>
          </div>
        ) : device === "tablet" ? (
          /* iPad portrait */
          <div className="w-[360px] h-[500px] shrink-0">
            <div
              className="w-full h-full rounded-[1.8rem] bg-[#3d2f26] shadow-2xl flex flex-col overflow-hidden"
              style={{ padding: "10px 8px 14px" }}
            >
              <div className="h-5 shrink-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#2a1f17]" />
              </div>
              <div className="flex-1 bg-white overflow-y-auto min-h-0 rounded-sm">
                {children}
              </div>
              <div className="h-4 shrink-0" />
            </div>
          </div>
        ) : (
          /* Monitor + stand */
          <div className="w-full flex flex-col items-center">
            <div
              className="w-full rounded-xl bg-[#3d2f26] shadow-2xl overflow-hidden flex flex-col"
              style={{ padding: "8px 8px 14px" }}
            >
              <div className="h-5 shrink-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-[#2a1f17]" />
              </div>
              <div className="bg-white overflow-y-auto min-h-0 rounded-sm" style={{ height: "420px" }}>
                {children}
              </div>
            </div>
            <div className="w-8 h-7 bg-[#5C4A3E]" />
            <div className="h-3 bg-[#5C4A3E] rounded-b-full" style={{ width: "40%" }} />
          </div>
        )}
      </div>
    </div>
  );
}
