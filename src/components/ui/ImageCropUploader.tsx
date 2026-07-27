"use client";

import { useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { ImagePlus, Loader2, X, Crop as CropIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  name: string;
  defaultValue?: string | null;
  label?: string;
  aspect?: number; // width / height
}

const MAX_BYTES = 8 * 1024 * 1024;

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = area.width;
  canvas.height = area.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))), "image/jpeg", 0.92);
  });
}

// Same target aspect ratio as its plain counterpart (ImageUploader), but lets the
// admin reposition/zoom before saving — a wide carousel banner and a tall listing
// thumbnail behave very differently, so uploads that go into a fixed-shape slot
// (the ad carousel) benefit from cropping before the image is saved, not just a
// CSS object-fit guess afterward.
export function ImageCropUploader({ name, defaultValue, label = "Image (optional)", aspect = 16 / 9 }: Props) {
  const [preview, setPreview] = useState<string | null>(defaultValue ?? null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Image must be under 8MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawImage(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const applyCrop = async () => {
    if (!rawImage || !croppedArea) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await getCroppedBlob(rawImage, croppedArea);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required to upload");

      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
      setPreview(data.publicUrl);
      setRawImage(null);
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

      {rawImage ? (
        <div className="space-y-3">
          <div className="relative w-full h-56 bg-gray-900 rounded-xl overflow-hidden">
            <Cropper
              image={rawImage}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="flex items-center gap-3">
            <input type="range" min={1} max={3} step={0.05} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" />
            <button type="button" onClick={applyCrop} disabled={uploading} className="btn-primary py-2 px-4 text-sm shrink-0">
              {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Apply Crop"}
            </button>
            <button type="button" onClick={() => setRawImage(null)} className="btn-ghost py-2 px-3 text-sm shrink-0">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {preview ? (
            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-gray-200">
              <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setPreview(null)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-300">
              <ImagePlus className="h-6 w-6" />
            </div>
          )}
          <label className="btn-secondary py-2 px-4 text-sm cursor-pointer">
            <CropIcon className="h-4 w-4" /> {preview ? "Replace & Crop" : "Choose & Crop Image"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </label>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  );
}
