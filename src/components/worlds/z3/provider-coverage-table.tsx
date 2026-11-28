"use client";

import React from "react";
import providerCoverageData from "@/content/provider-coverage.json";

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "Supported") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-500/50 bg-emerald-950/50 text-emerald-300 font-mono text-xs sm:text-[13px] font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Supported
      </span>
    );
  }

  if (status === "Partial") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-amber-500/50 bg-amber-950/50 text-amber-300 font-mono text-xs sm:text-[13px] font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        Partial
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-rose-500/60 bg-rose-950/60 text-rose-300 font-mono text-xs sm:text-[13px] font-bold shadow-[0_0_8px_rgba(244,63,94,0.25)]">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
      Not supported
    </span>
  );
}

export function ProviderCoverageTable({ className = "" }: { className?: string }) {
  const { matrix } = providerCoverageData;

  const rows = [
    { key: "reachability_analysis", data: matrix.reachability_analysis },
    { key: "privilege_escalation_detection", data: matrix.privilege_escalation_detection },
    { key: "auto_repair", data: matrix.auto_repair },
    { key: "k8s_admission_webhook", data: matrix.k8s_admission_webhook },
  ];

  return (
    <div className={`w-full overflow-x-auto rounded border border-line bg-ink-2/60 ${className}`}>
      <table className="w-full text-left border-collapse min-w-[620px]">
        <thead>
          <tr className="border-b border-line bg-ink/80 text-mist font-mono text-xs sm:text-[13px] uppercase tracking-wider">
            <th scope="col" className="p-3 sm:p-3.5 w-1/4">
              Capability
            </th>
            <th scope="col" className="p-3 sm:p-3.5 w-1/4 text-[#5EEAD4]">
              AWS
            </th>
            <th scope="col" className="p-3 sm:p-3.5 w-1/4 text-sky-400">
              Azure
            </th>
            <th scope="col" className="p-3 sm:p-3.5 w-1/4 text-[#EF4444]">
              GCP
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60 font-ui text-xs sm:text-[13px]">
          {rows.map(({ key, data }) => (
            <tr
              key={key}
              className={`hover:bg-ink-2/40 transition-colors ${
                key === "auto_repair" ? "bg-rose-950/10" : ""
              }`}
            >
              <td className="p-3 sm:p-3.5 align-top">
                <span className="font-mono font-semibold text-feather block">
                  {data.name}
                </span>
                {key === "auto_repair" && (
                  <span className="font-mono text-[11px] sm:text-xs text-[#EF4444] font-medium block mt-1">
                    [GCP gap highlighted]
                  </span>
                )}
              </td>
              <td className="p-3 sm:p-3.5 align-top space-y-1.5">
                <StatusBadge status={data.aws.status} />
                <p className="font-mono text-[11px] sm:text-xs text-mist leading-relaxed">
                  {data.aws.details}
                </p>
              </td>
              <td className="p-3 sm:p-3.5 align-top space-y-1.5">
                <StatusBadge status={data.azure.status} />
                <p className="font-mono text-[11px] sm:text-xs text-mist leading-relaxed">
                  {data.azure.details}
                </p>
              </td>
              <td className="p-3 sm:p-3.5 align-top space-y-1.5">
                <StatusBadge status={data.gcp.status} />
                <p
                  className={`font-mono text-[11px] sm:text-xs leading-relaxed ${
                    data.gcp.status === "Not supported"
                      ? "text-rose-300 font-medium"
                      : "text-mist"
                  }`}
                >
                  {data.gcp.details}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProviderCoverageTable;
