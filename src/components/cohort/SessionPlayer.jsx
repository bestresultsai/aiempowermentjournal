// Minimal video embedder. Accepts Vimeo or YouTube URLs and converts them
// into the appropriate iframe embed URL. Falls back to a placeholder when
// the URL is missing.

function toEmbedUrl(url) {
  if (!url) return null;
  // Vimeo: https://vimeo.com/76979871  OR  https://player.vimeo.com/video/76979871
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // YouTube: https://youtube.com/watch?v=...   https://youtu.be/...
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  return url;
}

export default function SessionPlayer({ session }) {
  const embed = toEmbedUrl(session?.videoUrl);

  if (!embed) {
    return (
      <div style={{
        aspectRatio: "16 / 9", background: "#0F172A", color: "#94A3B8",
        borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14, marginBottom: 20,
      }}>
        Recording will be posted after the live session.
      </div>
    );
  }

  return (
    <div style={{ aspectRatio: "16 / 9", borderRadius: 12, overflow: "hidden", background: "#000", marginBottom: 20 }}>
      <iframe
        src={embed}
        title={session.title}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        style={{ border: 0, display: "block" }}
      />
    </div>
  );
}
