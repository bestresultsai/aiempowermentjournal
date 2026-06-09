import { useRef, useState } from "react";
import { Camera, Upload, X, Loader2, AlertCircle } from "lucide-react";
import { formatBytes, LIMITS } from "../lib/inputValidation";

// ---------------------------------------------------------------------------
// HeadshotUpload — reusable image-upload component for profile photos.
//
// Today: inlines the file as a base64 data URL and writes it directly onto
// the user/participant record. This is fine for the demo + small teams but
// will blow up localStorage past a few dozen images.
//
// Production path: swap `readAsDataURL` for an upload to S3 / Cloudinary /
// Supabase Storage. The component contract (onChange(url)) stays the same;
// only the body of `handleFile` changes.
//
// Props:
//   value         current headshot URL or data URL (or null)
//   onChange      (url | null) => void
//   name          for accessible alt-text fallback
//   size          "sm" (40px) | "md" (64px, default) | "lg" (96px)
// ---------------------------------------------------------------------------

const ALLOWED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
const SIZE_PX = { sm: 40, md: 64, lg: 96 };

export default function HeadshotUpload({ value, onChange, name = "", size = "md" }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const initials = (name || "")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase() || "?";

  function handleFile(file) {
    setError("");
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setError("Pick a PNG, JPG, WebP, or GIF.");
      return;
    }
    if (file.size > LIMITS.attachmentBytes) {
      setError(`Image is too large. Max ${formatBytes(LIMITS.attachmentBytes)}.`);
      return;
    }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      onChange?.(reader.result);
      setBusy(false);
    };
    reader.onerror = () => {
      setError("Couldn't read that file. Try another.");
      setBusy(false);
    };
    reader.readAsDataURL(file);
  }

  function handleRemove() {
    setError("");
    onChange?.(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const px = SIZE_PX[size] || SIZE_PX.md;

  return (
    <div>
      <div className="flex items-center gap-3">
        <div
          className="rounded-full overflow-hidden bg-brand-700 text-white flex items-center justify-center font-heading font-extrabold shrink-0 relative"
          style={{ width: px, height: px, fontSize: Math.round(px * 0.28) }}
        >
          {value ? (
            <img
              src={value}
              alt={name || "Headshot"}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
          {busy && (
            <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" strokeWidth={2.5} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-soft text-[12px] font-heading font-bold text-ink hover:bg-surface-soft cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" strokeWidth={2.5} />
            {value ? "Replace" : "Upload photo"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-heading font-semibold text-ink-muted hover:text-ink hover:bg-surface-soft transition-colors"
            >
              <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="text-[11px] text-ink-subtle mt-1.5 inline-flex items-center gap-1">
        <Camera className="w-3 h-3" strokeWidth={2.5} />
        PNG, JPG, or WebP. Up to {formatBytes(LIMITS.attachmentBytes)}.
      </div>
      {error && (
        <div className="mt-2 inline-flex items-center gap-1 text-[12px] text-rose-700">
          <AlertCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
          {error}
        </div>
      )}
    </div>
  );
}
