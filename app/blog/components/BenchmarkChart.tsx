"use client";

import { motion } from "framer-motion";

export function BenchmarkChart({
  data,
}: {
  data: { label: string; value: number; color: string; unit?: string }[];
}) {
  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#0e0e1a] p-6 mb-6">
      <div className="space-y-4">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center gap-4">
            <span className="text-sm text-[#8888a8] w-32 shrink-0 text-right font-[family-name:var(--font-ibm-plex-mono)]">
              {item.label}
            </span>
            <div className="flex-1 h-8 bg-[#0a0a12] rounded-md overflow-hidden relative">
              <motion.div
                className="h-full rounded-md"
                style={{ backgroundColor: item.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / maxValue) * 100}%` }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.1,
                  ease: "easeOut",
                }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#d8d8e8] font-[family-name:var(--font-ibm-plex-mono)]">
                {item.value}
                {item.unit ?? ""}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
