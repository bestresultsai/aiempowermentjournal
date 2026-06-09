# Headshot storage — current state + production path

## Where we are today (demo)

The `HeadshotUpload` component (`src/components/HeadshotUpload.jsx`) accepts an
image file from the admin, reads it with `FileReader.readAsDataURL`, and
writes the resulting **base64 data URL** straight onto the user record:

- Participants → `participant.headshotUrl` (via `setParticipantHeadshot`)
- Facilitators → `facilitator.headshotUrl` (via `updateFacilitator`)
- Onboarding profile → `user.headshotUrl` (PhotoUpload component, same shape)

Both participant + facilitator overlays persist through `localStorage`
(`brai_admin_facilitators`, the participant store, etc.). Renders use the
URL string directly with `<img src={url}>` — `data:` URLs render fine in
all browsers.

### Why this is fine for the demo

- Zero backend dependency
- Survives page reloads (localStorage)
- A 4 MB image becomes a ~5.5 MB base64 string after encoding. Each user has
  one headshot. A demo team with 50 users tops out around 275 MB of
  per-browser localStorage budget — well over the typical 5–10 MB browser
  cap. **This is the limit you'll hit first.**

### Why it won't scale

1. **localStorage quota.** Browsers cap localStorage at ~5–10 MB per origin.
   Even 5–10 headshots at full size will start evicting other state.
2. **Notion + Supabase don't want base64 strings in row data.** Even if the
   string fits in the column type, every query pays the encoding cost.
3. **CDN.** No image transforms, no caching, no thumbnails.

## Production path

Swap `readAsDataURL` for an upload to object storage. The component contract
(`onChange(url)`) stays the same — only the body of `handleFile` changes.
Everything downstream (form save, render, etc.) sees the same shape:
"a URL string." That URL just happens to be on a CDN instead of inline.

### Recommended stack: Supabase Storage

Lines up with the rest of the platform if we go Supabase for the DB.

```js
// Replace this block in HeadshotUpload.jsx:
//   const reader = new FileReader();
//   reader.readAsDataURL(file);
//
// With this:
const { data, error } = await supabase.storage
  .from("headshots")
  .upload(`${userId}/${crypto.randomUUID()}.${ext}`, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
if (error) { setError(error.message); setBusy(false); return; }
const { data: pub } = supabase.storage
  .from("headshots")
  .getPublicUrl(data.path);
onChange?.(pub.publicUrl);
```

Required Supabase bucket settings:
- **Bucket:** `headshots`, public read
- **Max file size:** 4 MB (mirrors LIMITS.attachmentBytes)
- **MIME allowlist:** `image/png`, `image/jpeg`, `image/webp`, `image/gif`
- **RLS:** signed-in users can write `userId/*`, super/admin can write anything

### Alternative: Cloudinary

Pros: free tier with image transforms (resize, format conversion to webp,
crop-to-face). Cons: another vendor.

```js
const fd = new FormData();
fd.append("file", file);
fd.append("upload_preset", "headshots_unsigned");
const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
  method: "POST", body: fd,
});
const j = await r.json();
onChange?.(j.secure_url);
```

### Alternative: S3 + CloudFront

Most enterprise-ready, most ops overhead. Use the AWS SDK presigned-URL flow:
admin requests `POST /api/headshots/upload-url`, server returns presigned URL,
client `PUT`s the file, server records the canonical CloudFront URL.

## Migration plan when we swap

Day-of-cutover work:

1. Add the storage bucket + RLS rules.
2. Update `HeadshotUpload.handleFile` (single function, ~15 lines).
3. Run a one-time backfill script that:
   - Scans every record with a `headshotUrl` starting with `data:`
   - Decodes the base64 to bytes
   - Uploads to the bucket
   - Rewrites `headshotUrl` to the public URL
4. Drop the `data:` prefix check in the URL sanitizer (currently bypassed for
   headshots in `AdminFacilitators` + `setParticipantHeadshot`).

No UI changes needed. No model changes needed. The contract was designed for
the swap.
