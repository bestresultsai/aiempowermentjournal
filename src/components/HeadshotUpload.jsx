import { useRef, useState } from "react";
import { Camera, Upload, X, Loader2, AlertCircle } from "lucide-react";
import { formatBytes, LIMITS } from "../lib/inputValidation";
import { initSupabase, isSupabaseEnabled } from "../lib/supabase";

// ---------------------------------------------------------------------------
// HeadshotUpload — reusable image-upload component for profile photos.
//
// Path swap (task #549): now uploads to the Supabase Storage `avatars` bucket
// and returns the public URL, so headshots no longer bloat localStorage or
// the profiles row with a base64 blob. The bucket has RLS restricting inserts
// to paths whose first folder segment equals auth.uid(), so files are keyed
// on the uploader's UID (`{uid}/headshot-{ts}-{rand}.{ext}`). Reads are public
// because the bucket is public — the browser only needs the URL.
//
// Fallback: if Supabase isn't wired (demo mode) or the user isn't signed in
// yet, we still read the file as a base64 data URL so the field fills in
// synchronously. The component contract — onChange(url|null) — is unchanged.
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
const AVATARS_BUCKET = "avatars";
// Best-effort mime → extension mapping so uploaded files carry a sensible
// extension in Supabase Storage (helps when someone downloads them raw).
const EXTENSION_BY_MIME = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export default function HeadshotUpload({ value, onChange, name = "", size = "md" }) {
  const fileInputRef = useRef(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const initials = (name || "")
    .split(" ").filter(Boolean).slice(0, 2)
    .map((w) => w[0]).join("").toUpperCase() || "?";

  async function handleFile(file) {
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
    try {
      const url = await uploadHeadshot(file);
      onChange?.(url);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[headshot] upload failed:", err?.message || err);
      setError(err?.message || "Couldn't upload that photo. Try another.");
    } finally {
      setBusy(false);
    }
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

// Upload the file to the avatars bucket when Supabase is wired + the caller
// is signed in. Returns the public URL on success. Falls back to a base64
// data URL for demo mode + pre-auth flows (the onboarding wizard can start
// before the auth session is fully hydrated in some edge cases).
async function uploadHeadshot(file) {
  if (!isSupabaseEnabled()) return readAsDataUrl(file);
  const client = await initSupabase();
  if (!client) return readAsDataUrl(file);

  const { data: sessionData } = await client.auth.getSession();
  const authUser = sessionData?.session?.user;
  // Not signed in → keep the base64 path so the field still fills in. Once
  // the user completes auth, whatever writes the field to Supabase can swap
  // the base64 URL for a real upload if we choose to.
  if (!authUser?.id) return readAsDataUrl(file);

  const ext = EXTENSION_BY_MIME[file.type] || "jpg";
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${authUser.id}/headshot-${Date.now()}-${rand}.${ext}`;

  const { error: upErr } = await client.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) throw new Error(upErr.message || "Storage upload failed.");

  const { data: urlData } = client.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(path);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) throw new Error("Uploaded, but couldn't resolve the public URL.");
  return publicUrl;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error("Couldn't read that file. Try another."));
    reader.readAsDataURL(file);
  });
}
