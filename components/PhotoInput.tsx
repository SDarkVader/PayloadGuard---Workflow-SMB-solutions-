"use client";

import { useRef, useState } from "react";

const MAX_PHOTOS = 4;
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

interface PhotoInputProps {
  photos: File[];
  onChange: (photos: File[]) => void;
}

export default function PhotoInput({ photos, onChange }: PhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const incoming = Array.from(fileList);
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setError(`Maximum ${MAX_PHOTOS} photos.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const accepted = incoming.slice(0, room);
    if (incoming.length > room) {
      setError(`Maximum ${MAX_PHOTOS} photos — added the first ${room}.`);
    }

    setCompressing(true);
    const compressed = await Promise.all(accepted.map(compressImage));
    setCompressing(false);
    onChange([...photos, ...compressed]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePhoto(index: number) {
    onChange(photos.filter((_, i) => i !== index));
  }

  const disabled = photos.length >= MAX_PHOTOS || compressing;

  return (
    <div className="field">
      <label
        htmlFor="photos"
        className={`photo-upload-button${disabled ? " is-disabled" : ""}`}
      >
        <span className="photo-upload-icon" aria-hidden="true">
          📷
        </span>
        <span className="photo-upload-text">
          {compressing ? "Compressing…" : "Add photos"}
          <span className="photo-upload-hint">optional, up to {MAX_PHOTOS}</span>
        </span>
      </label>
      <input
        ref={inputRef}
        type="file"
        id="photos"
        className="visually-hidden-input"
        accept="image/*"
        multiple
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />
      {compressing && <p className="photo-status">Compressing photos…</p>}
      {error && <p className="field-error">{error}</p>}
      {photos.length > 0 && (
        <ul className="photo-list">
          {photos.map((photo, index) => (
            <li key={`${photo.name}-${index}`}>
              <span>
                {photo.name} ({Math.round(photo.size / 1024)} KB)
              </span>
              <button type="button" onClick={() => removePhoto(index)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
