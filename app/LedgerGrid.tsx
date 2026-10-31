"use client";

// The audit ledger as a real, sortable/filterable AG Grid — every agent action
// (search, recommend, purchase, approval, denial) with amounts and the real
// PayPal order/capture ids. The Mandate is only trustworthy if its trail is
// legible; a data grid is the honest surface for an audit log.
import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ValueFormatterParams,
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

export type LedgerRow = {
  id: string;
  at: number;
  kind: string;
  summary: string;
  detail?: string;
  amountCents?: number;
  orderId?: string;
  captureId?: string;
};

// Dark theme tuned to the Gofer brand tokens.
const theme = themeQuartz.withParams({
  backgroundColor: "transparent",
  foregroundColor: "#cdd5e6",
  headerTextColor: "#9aa4bd",
  headerBackgroundColor: "rgba(255,255,255,0.03)",
  chromeBackgroundColor: "rgba(255,255,255,0.02)",
  borderColor: "rgba(255,255,255,0.07)",
  rowHoverColor: "rgba(59,125,255,0.08)",
  accentColor: "#3b7dff",
  fontFamily: "inherit",
  fontSize: 12,
  headerFontSize: 11,
  rowHeight: 44,
  headerHeight: 36,
  cellHorizontalPadding: 12,
});

const KIND: Record<string, { label: string; color: string; bg: string }> = {
  search: { label: "search", color: "#9aa4bd", bg: "rgba(255,255,255,0.06)" },
  recommend: { label: "recommend", color: "#8fb6ff", bg: "rgba(59,125,255,0.14)" },
  purchased: { label: "purchased", color: "#6ee7b7", bg: "rgba(16,185,129,0.15)" },
  needs_approval: { label: "needs approval", color: "#f5b544", bg: "rgba(245,181,68,0.14)" },
  denied: { label: "denied", color: "#ff8f8f", bg: "rgba(244,63,94,0.15)" },
};

export default function LedgerGrid({ rows }: { rows: LedgerRow[] }) {
  const columnDefs = useMemo<ColDef<LedgerRow>[]>(
    () => [
      {
        field: "at",
        headerName: "Time",
        width: 104,
        sort: "desc",
        valueFormatter: (p: ValueFormatterParams<LedgerRow, number>) =>
          p.value ? new Date(p.value).toLocaleTimeString([], { hour12: false }) : "",
      },
      {
        field: "kind",
        headerName: "Action",
        width: 140,
        cellRenderer: (p: { value: string }) => {
          const k = KIND[p.value] ?? { label: p.value, color: "#9aa4bd", bg: "rgba(255,255,255,0.06)" };
          return (
            <span
              style={{
                color: k.color,
                background: k.bg,
                padding: "3px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {k.label}
            </span>
          );
        },
      },
      { field: "summary", headerName: "Event", flex: 1, minWidth: 220, tooltipField: "detail", wrapText: true, autoHeight: true },
      {
        field: "amountCents",
        headerName: "Amount",
        width: 110,
        type: "rightAligned",
        cellStyle: { fontVariantNumeric: "tabular-nums", fontFamily: "ui-monospace, monospace" },
        valueFormatter: (p: ValueFormatterParams<LedgerRow, number>) =>
          p.value != null ? `$${(p.value / 100).toFixed(2)}` : "",
      },
      {
        headerName: "PayPal order · capture",
        colId: "paypal",
        width: 300,
        cellStyle: { fontFamily: "ui-monospace, monospace", color: "#8fb6ff", fontSize: 11 },
        valueGetter: (p) =>
          p.data?.orderId
            ? `${p.data.orderId}${p.data.captureId ? ` · ${p.data.captureId}` : ""}`
            : "",
      },
    ] as ColDef<LedgerRow>[],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({ sortable: true, filter: true, resizable: true, suppressHeaderMenuButton: false }),
    []
  );

  return (
    <div style={{ width: "100%", height: 320 }}>
      <AgGridReact<LedgerRow>
        theme={theme}
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={(p) => p.data.id}
        animateRows
        enableCellTextSelection
        tooltipShowDelay={300}
        overlayNoRowsTemplate={
          '<span style="color:#64748b;font-size:12px">No activity yet. Run an errand to watch the agent work.</span>'
        }
      />
    </div>
  );
}
