import { ImageIcon } from "lucide-react";

/** Read-only thumbnail strip for previously uploaded evidence URLs. */
export function EvidenceGallery({ urls }: { urls: string[] | null | undefined }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {urls.map((url) => {
        const isVideo = /\.(mp4|mov)$/i.test(url);
        return (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block h-16 w-16 overflow-hidden rounded-lg border bg-secondary/40 transition-opacity hover:opacity-80"
          >
            {isVideo ? (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon className="h-5 w-5" />
              </div>
            ) : (
              <img src={url} alt="Evidence" className="h-full w-full object-cover" />
            )}
          </a>
        );
      })}
    </div>
  );
}
