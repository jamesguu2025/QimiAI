// components/Reports/ReportUploader.tsx - Drag & drop file upload

import React, { useState, useRef } from 'react';

interface ReportUploaderProps {
  onUpload: (file: File, title: string) => void;
  isLoading: boolean;
  userTier: 'free' | 'pro';
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];
const MAX_SIZE = { free: 5 * 1024 * 1024, pro: 20 * 1024 * 1024 };

const ReportUploader: React.FC<ReportUploaderProps> = ({ onUpload, isLoading, userTier }) => {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Only JPG and PNG images are accepted.';
    }
    const limit = MAX_SIZE[userTier];
    if (f.size > limit) {
      return `File too large. ${userTier === 'free' ? 'Free' : 'Pro'} plan limit is ${limit / (1024 * 1024)}MB.`;
    }
    return null;
  };

  const handleFile = (f: File) => {
    const err = validateFile(f);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = () => {
    if (!file) return;
    onUpload(file, title);
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Report title (optional)"
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00D4AA]"
      />

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-[#00D4AA] bg-teal-50' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="mx-auto max-h-48 object-contain rounded-lg"
          />
        ) : (
          <div className="space-y-2">
            <svg className="mx-auto" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm text-slate-500">Drop image here or click to browse</p>
            <p className="text-xs text-slate-400">JPG or PNG, max {userTier === 'free' ? '5' : '20'}MB</p>
          </div>
        )}
      </div>

      {file && (
        <p className="text-xs text-slate-500 text-center">
          {file.name} ({(file.size / (1024 * 1024)).toFixed(1)}MB)
        </p>
      )}

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!file || isLoading}
        className="w-full py-2.5 bg-[#00D4AA] text-white font-medium rounded-xl hover:bg-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Uploading...' : 'Upload & Analyze'}
      </button>
    </div>
  );
};

export default ReportUploader;
