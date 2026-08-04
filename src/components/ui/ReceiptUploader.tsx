"use client";

import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  name: string;
  /** An order id (single checkout) or a checkout_batch_id (cart checkout) —
   * either scopes the storage path and is recognized by a matching RLS policy. */
  referenceId: string;
}

const MAX_BYTES = 8 * 1024 * 1024;

// payment-proofs is a private bucket — the hidden input carries the storage
// PATH (not a public URL); pages that display it later generate a short-lived
// signed URL server-side, scoped by the order's own RLS policy.
export function ReceiptUploader({ name, referenceId }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Image must be under 8MB");
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "jpg";
      const objectPath = `${referenceId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(objectPath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      setPath(objectPath);
      setFileName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="hidden" name={name} value={path ?? ""} />
      {fileName ? (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
          <span className="text-sm text-gray-700 truncate flex-1">{fileName}</span>
          <button type="button" onClick={() => { setFileName(null); setPath(null); }}
            className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="btn-secondary py-2.5 px-4 text-sm cursor-pointer w-full justify-center">
          {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</> : <><ImagePlus className="h-4 w-4" /> Upload Payment Screenshot (optional)</>}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </label>
      )}
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
