import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  ids: z.string().optional(), // comma-separated asset ids
});

export const Route = createFileRoute("/_authenticated/dashboard/assets/labels")({
  head: () => ({ meta: [{ title: "Bulk QR labels · MaintainIQ" }] }),
  validateSearch: searchSchema,
  component: BulkLabels,
});

type Asset = {
  id: string;
  asset_code: string;
  name: string;
  location: string | null;
};

function BulkLabels() {
  const { ids } = Route.useSearch();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    const idList = (ids ?? "").split(",").filter(Boolean);
    if (idList.length === 0) {
      setLoading(false);
      return;
    }
    supabase
      .from("assets")
      .select("id,asset_code,name,location")
      .in("id", idList)
      .then(({ data }) => {
        setAssets((data as Asset[]) ?? []);
        setLoading(false);
      });
  }, [ids]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Bulk QR label sheet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {assets.length} label{assets.length === 1 ? "" : "s"} · print or save as PDF from your browser's print dialog.
          </p>
        </div>
        <Button onClick={() => window.print()} disabled={assets.length === 0}>
          <Printer className="mr-1.5 h-4 w-4" /> Print sheet
        </Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : assets.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground print:hidden">
          No assets selected. Go back to the dashboard, tick the assets you want, then choose "Print label sheet".
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-3">
          {assets.map((a) => {
            const url = `${origin}/asset/${a.asset_code}`;
            return (
              <div
                key={a.id}
                className="flex flex-col items-center rounded-lg border bg-white p-4 text-center shadow-soft print:break-inside-avoid print:shadow-none print:border-neutral-300"
              >
                <div className="text-[10px] uppercase tracking-wider text-neutral-500">MaintainIQ</div>
                <div className="mt-0.5 text-sm font-semibold leading-tight text-neutral-900">{a.name}</div>
                <div className="text-[11px] text-neutral-600">
                  {a.asset_code}
                  {a.location ? ` · ${a.location}` : ""}
                </div>
                <div className="mt-2">
                  <QRCodeCanvas value={url} size={128} level="M" />
                </div>
                <div className="mt-2 max-w-[160px] text-[10px] leading-tight text-neutral-600">
                  Scan to view status or report an issue with this equipment.
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
