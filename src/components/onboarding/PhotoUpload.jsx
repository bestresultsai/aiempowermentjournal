import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";

// ---------------------------------------------------------------------------
// PhotoUpload — stub-mode headshot picker.
//
// Reads the chosen image as a base64 data URL (capped at ~500KB so we don't
// stuff huge blobs into Notion) and hands it up to the parent via
// `onChange(dataUrl)`. Falls back to a labeled drop zone when empty.
//
// Cloud storage (Cloudinary / Netlify Blobs) will replace the data URL with
// a real https URL later — the props stay identical.
// ---------------------------------------------------------------------------

const MAX_BYTES = 500 * 1024; // 500KB
const ACCEPT = "image/png,image/jpeg,image/webp";

export default function PhotoUpload({
  value,
  onChange,
  initials,
  size = 128,
}) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  function handleFile(file) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That doesn't look like an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large. Keep it under 500KB for now.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.onerror = () => setError("Couldn't read that file. Try another.");
    reader.readAsDataURL(file);
  }

  function handleInputChange(e) {
    handleFile(e.target.files?.[0]);
    // Reset so picking the same file twice still fires onChange.
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  function clearPhoto(e) {
    e.stopPropagation();
    onChange(null);
    setError(null);
  }

  return (
    <div className="flex items-start gap-5 flex-wrap">
      {/* Avatar preview / drop zone */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{ width: size, height: size }}
        className={
          "relative shrink-0 rounded-full flex items-center justify-center font-heading font-bold text-white transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 " +
          (value
            ? "bg-transparent"
            : dragOver
              ? "bg-brand-50 ring-2 ring-brand-500 ring-dashed"
              : "bg-brand-700 hover:bg-brand-600")
        }
      >
        {value ? (
          <>
            <img
              src={value}
              alt="Headshot preview"
              className="w-full h-full rounded-full object-cover"
              style={{ boxShadow: "0 0 0 3px #FAFAF7, 0 0 0 5px #2563EB" }}
            />
            <span
              role="button"
              tabIndex={0}
              onClick={clearPhoto}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") clearPhoto(e); }}
              className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-ink text-white flex items-center justify-center shadow-lift hover:bg-brand-700 transition-colors cursor-pointer"
              aria-label="Remove photo"
            >
              <X className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
          </>
        ) : (
          <span style={{ fontSize: Math.round(size * 0.32) }} className="select-none">
            {initials || "?"}
          </span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          onChange={handleInputChange}
          className="hidden"
        />
      </button>

      {/* CTA + helper text */}
      <div className="flex-1 min-w-[200px]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-soft text-[14px] font-heading font-semibold text-ink hover:bg-surface-soft hover:border-brand-500 transition-all duration-200"
        >
          <Camera className="w-4 h-4 text-brand-600" strokeWidth={2.5} />
          {value ? "Replace photo" : "Upload photo"}
        </button>
        <p className="text-[12px] text-ink-muted mt-2 leading-relaxed">
          Square JPG, PNG, or WebP. Under 500KB.<br />
          You can also drag and drop onto the circle.
        </p>
        {error && (
          <p className="text-[12px] text-red-600 mt-2 font-heading font-medium">{error}</p>
        )}
      </div>
    </div>
  );
}
