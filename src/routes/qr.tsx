import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Copy, QrCode as QrIcon, Wrench } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/qr")({
  head: () => ({
    meta: [
      { title: "QR Generator · MaintainIQ" },
      { name: "description", content: "Free QR code generator — turn any link or text into a downloadable QR." },
      { property: "og:title", content: "QR Generator · MaintainIQ" },
      { property: "og:description", content: "Generate downloadable QR codes for links, text, or Wi-Fi credentials." },
    ],
  }),
  component: QrGenerator,
});

type EccLevel = "L" | "M" | "Q" | "H";

function QrGenerator() {
  const [text, setText] = useState("https://maintainiq.app");
  const [size, setSize] = useState(320);
  const [ecc, setEcc] = useState<EccLevel>("M");
  const [fg, setFg] = useState("#0f172a");
  const [bg, setBg] = useState("#ffffff");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const trimmed = useMemo(() => text.trim(), [text]);

  useEffect(() => {
    if (!canvasRef.current || !trimmed) return;
    QRCode.toCanvas(canvasRef.current, trimmed, {
      width: size,
      margin: 2,
      errorCorrectionLevel: ecc,
      color: { dark: fg, light: bg },
    }).catch((e) => console.error(e));
  }, [trimmed, size, ecc, fg, bg]);

  function download(kind: "png" | "svg") {
    if (!trimmed) return toast.error("Enter some text first");
    if (kind === "png") {
      const c = canvasRef.current;
      if (!c) return;
      const link = document.createElement("a");
      link.download = `qr-${Date.now()}.png`;
      link.href = c.toDataURL("image/png");
      link.click();
    } else {
      QRCode.toString(trimmed, {
        type: "svg",
        errorCorrectionLevel: ecc,
        margin: 2,
        color: { dark: fg, light: bg },
      }).then((svg) => {
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = `qr-${Date.now()}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    }
  }

  async function copyPng() {
    const c = canvasRef.current;
    if (!c) return;
    try {
      const blob: Blob = await new Promise((resolve, reject) =>
        c.toBlob((b) => (b ? resolve(b) : reject(new Error("no blob"))), "image/png"),
      );
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("PNG copied to clipboard");
    } catch {
      toast.error("Clipboard image not supported here — use Download instead");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-hero text-primary-foreground shadow-glow">
              <Wrench className="h-3.5 w-3.5" />
            </span>
            MaintainIQ
          </Link>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <QrIcon className="h-3.5 w-3.5" /> QR generator
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Turn any link into a scannable QR
          </h1>
          <p className="mt-1 max-w-xl text-muted-foreground">
            Paste a URL, plain text, or Wi-Fi string. Customize colors and error correction, then
            download PNG or SVG.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]">
          <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-soft">
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="https://example.com or any text"
              />
              <p className="text-xs text-muted-foreground">
                Tip: for Wi-Fi use{" "}
                <code className="rounded bg-muted px-1">WIFI:T:WPA;S:MyNet;P:pass;;</code>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Size (px)</Label>
                <Input
                  type="number"
                  min={128}
                  max={1024}
                  step={32}
                  value={size}
                  onChange={(e) => setSize(Math.max(128, Math.min(1024, Number(e.target.value) || 320)))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Error correction</Label>
                <Select value={ecc} onValueChange={(v) => setEcc(v as EccLevel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Low (~7%)</SelectItem>
                    <SelectItem value="M">Medium (~15%)</SelectItem>
                    <SelectItem value="Q">Quartile (~25%)</SelectItem>
                    <SelectItem value="H">High (~30%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Foreground</Label>
                <Input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="h-10 w-full" />
              </div>
              <div className="space-y-1.5">
                <Label>Background</Label>
                <Input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-10 w-full" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={() => download("png")}>
                <Download className="mr-1.5 h-4 w-4" /> Download PNG
              </Button>
              <Button variant="secondary" onClick={() => download("svg")}>
                <Download className="mr-1.5 h-4 w-4" /> Download SVG
              </Button>
              <Button variant="ghost" onClick={copyPng}>
                <Copy className="mr-1.5 h-4 w-4" /> Copy PNG
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-center rounded-2xl border bg-card p-6 shadow-soft">
            {trimmed ? (
              <canvas ref={canvasRef} className="max-w-full rounded-md" />
            ) : (
              <div className="text-sm text-muted-foreground">Enter content to preview…</div>
            )}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border bg-secondary/40 p-5 text-sm text-muted-foreground">
          Managing assets? Every asset in MaintainIQ ships with its own scan-to-report QR label.{" "}
          <Link to="/auth" className="text-primary hover:underline">
            Sign in to your dashboard
          </Link>{" "}
          to generate and print bulk label sheets.
        </div>
      </main>
    </div>
  );
}
