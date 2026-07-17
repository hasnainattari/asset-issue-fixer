import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

const MAX_FILES = 4;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic", "video/mp4", "video/quicktime"];

/**
 * Uploads files directly to the `evidence` Supabase Storage bucket and
 * reports back the resulting public URLs via onChange.
 *
 * pathPrefix must start with "public-reports/" for anonymous (unauthenticated)
 * use, since that's the only prefix anon is allowed to write to. Any other
 * prefix requires an authenticated session (technician/admin).
 */
export function EvidenceUpload({
  pathPrefix,
  value,
  onChange,
  label = "Evidence (optional)",
  maxFiles = MAX_FILES,
}: {
  pathPrefix: string;
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  maxFiles?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = maxFiles - value.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxFiles} files.`);
      return;
    }
    const picked = Array.from(files).slice(0, remaining);
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of picked) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`${file.name}: unsupported file type`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name}: exceeds 10MB limit`);
        continue;
      }
      const ext = file.name.split(".").pop() || "bin";
      const path = `${pathPrefix}${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("evidence").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (error) {
        toast.error(`${file.name}: ${error.message}`);
        continue;
      }
      const { data: pub } = supabase.storage.from("evidence").getPublicUrl(path);
      uploaded.push(pub.publicUrl);
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url) => (
            <div key={url} className="group relative h-20 w-20 overflow-hidden rounded-lg border bg-secondary/40">
              {/\.(mp4|mov)$/i.test(url) ? (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-6 w-6" />
                </div>
              ) : (
                <img src={url} alt="Evidence" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove evidence"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < maxFiles && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Paperclip className="mr-1.5 h-4 w-4" />}
            {uploading ? "Uploading…" : "Attach photo/video"}
          </Button>
          <span className="ml-2 text-xs text-muted-foreground">Up to {maxFiles}, 10MB each</span>
        </div>
      )}
    </div>
  );
}
