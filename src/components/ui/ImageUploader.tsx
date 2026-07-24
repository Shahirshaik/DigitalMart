"use client";

import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  name: string;
  defaultValue?: string | null;
  label?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;

export function ImageUploader({ name, defaultValue, label = "Photo (optional)" }: Props) {
  const [preview, setPreview] = useState<string | null>(defaultValue ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required to upload");

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
      setPreview(data.publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="hidden" name={name} value={preview ?? ""} />
      <div className="flex items-center gap-3">
        {preview ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200">
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            <button type="button" onClick={() => setPreview(null)}
              className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-300">
            <ImagePlus className="h-6 w-6" />
          </div>
        )}
        <label className="btn-secondary py-2 px-4 text-sm cursor-pointer">
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
            </>
          ) : preview ? "Replace Image" : "Choose Image"}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </label>
      </div>
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
