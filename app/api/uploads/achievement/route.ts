import { NextResponse } from "next/server";

const UPLOAD_PRESET = "cp_achievements";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ??
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    return NextResponse.json({ error: "Cloudinary not configured." }, { status: 500 });
  }

  const uploadData = new FormData();
  uploadData.append("file", file);
  uploadData.append("upload_preset", UPLOAD_PRESET);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: uploadData,
    },
  );

  const payload = await uploadRes.json().catch(() => ({}));

  if (!uploadRes.ok) {
    const message =
      typeof payload?.error?.message === "string"
        ? payload.error.message
        : "Image upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({
    secure_url: payload.secure_url,
    public_id: payload.public_id,
  });
}
