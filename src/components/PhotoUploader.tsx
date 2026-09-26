import React, { useRef, useState } from 'react';
import { Camera, Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface PhotoUploaderProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onChange,
  maxPhotos = 4
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > maxPhotos) {
      setError(`You can upload at most ${maxPhotos} photos of the building and entrance.`);
      return;
    }

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setError('Please select valid image files.');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError('Image file is too large (max 8MB per photo).');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          onChange([...photos, base64]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
            Building & Entrance Photos
          </label>
          <p className="text-[11px] text-slate-500">
            Crucial for Google verification (building exterior, front door, street number sign)
          </p>
        </div>
        <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
          {photos.length} / {maxPhotos} photos
        </span>
      </div>

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center space-x-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of photos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {photos.map((src, idx) => (
          <div
            key={idx}
            className="relative aspect-video sm:aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 group shadow-xs"
          >
            <img
              src={src}
              alt={`Building photo ${idx + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <button
              type="button"
              onClick={() => removePhoto(idx)}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600 transition-colors shadow-sm"
              title="Remove photo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white font-mono">
              Photo #{idx + 1}
            </div>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-video sm:aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-gold hover:bg-amber-500/5 transition-all flex flex-col items-center justify-center space-y-1.5 text-slate-500 dark:text-slate-400 p-2"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-amber-500">
              <Camera className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              Add Photo
            </span>
            <span className="text-[9px] text-slate-400">Exterior or Door</span>
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
