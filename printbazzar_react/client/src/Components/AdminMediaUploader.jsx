import React, { useState } from 'react';
import { Button, Spinner, TextInput } from 'flowbite-react';
import {
  HiUpload,
  HiOutlinePhotograph,
  HiOutlineVideoCamera,
  HiTrash,
  HiOutlineRefresh,
  HiLink,
} from 'react-icons/hi';
import { api } from '../services/api';

/**
 * AdminMediaUploader
 * Direct Local File Upload & Live Preview Component for Admin CMS
 * Supports Images (JPG, PNG, WEBP, SVG) & Videos (MP4, WEBM, MOV)
 */
export default function AdminMediaUploader({
  label = 'Upload Media',
  value = '',
  onChange,
  type = 'image', // 'image' | 'video' | 'both'
  accept,
  aspectHint = '',
  required = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  const defaultAccept =
    accept ||
    (type === 'video'
      ? 'video/mp4,video/webm,video/ogg,video/quicktime,video/*'
      : type === 'both'
      ? 'image/*,video/*'
      : 'image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/*');

  const isVideo =
    type === 'video' ||
    (value && (value.endsWith('.mp4') || value.endsWith('.webm') || value.endsWith('.mov') || value.includes('youtube') || value.includes('vimeo')));

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const res = await api.uploadMedia(file);
      if (res.success && (res.url || res.imageUrl)) {
        const uploadedUrl = res.url || res.imageUrl;
        onChange(uploadedUrl);
      } else {
        throw new Error(res.message || 'Upload returned invalid response');
      }
    } catch (err) {
      console.error('Media upload error:', err);
      setError(err.message || 'Failed to upload media file. Please try again.');
    } finally {
      setUploading(false);
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleRemove = () => {
    onChange('');
    setError('');
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="font-bold text-gray-700 text-xs flex items-center gap-1">
          {type === 'video' ? (
            <HiOutlineVideoCamera className="w-4 h-4 text-purple-600" />
          ) : (
            <HiOutlinePhotograph className="w-4 h-4 text-blue-600" />
          )}
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-1 font-semibold underline"
        >
          <HiLink className="w-3 h-3" />
          {showUrlInput ? 'Hide URL Box' : 'Paste External URL'}
        </button>
      </div>

      {aspectHint && <p className="text-[11px] text-gray-500">{aspectHint}</p>}

      {error && (
        <div className="p-2 text-xs text-red-700 bg-red-50 rounded-lg border border-red-200">
          ❌ {error}
        </div>
      )}

      {/* Preview Card if File Exists */}
      {value ? (
        <div className="relative border-2 border-gray-200 rounded-2xl overflow-hidden bg-gray-50 p-2 shadow-xs">
          {isVideo ? (
            <div className="rounded-xl overflow-hidden bg-black flex items-center justify-center max-h-56">
              <video
                src={value}
                controls
                className="w-full max-h-56 object-contain"
                preload="metadata"
              >
                Your browser does not support HTML5 video preview.
              </video>
            </div>
          ) : (
            <div className="flex items-center justify-center bg-white rounded-xl border p-1 max-h-56 overflow-hidden">
              <img
                src={value}
                alt="Preview"
                className="w-full max-h-52 object-contain rounded-lg"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/src/assets/images/logo_white.png';
                }}
              />
            </div>
          )}

          {/* Action Overlay Toolbar */}
          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] text-gray-600 font-mono truncate max-w-[200px] sm:max-w-[280px]">
              {value}
            </span>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept={defaultAccept}
                  disabled={uploading}
                />
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 shadow-2xs">
                  <HiOutlineRefresh className="w-3.5 h-3.5 text-blue-600" /> Replace
                </span>
              </label>

              <button
                type="button"
                onClick={handleRemove}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
              >
                <HiTrash className="w-3.5 h-3.5" /> Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div className="relative border-2 border-dashed border-gray-300 hover:border-yellow-400 bg-gray-50/70 hover:bg-yellow-50/30 transition-all rounded-2xl p-6 text-center cursor-pointer group">
          <input
            type="file"
            id={`uploader-${label.replace(/\s+/g, '-').toLowerCase()}`}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={handleFileSelect}
            accept={defaultAccept}
            disabled={uploading}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            {uploading ? (
              <div className="py-3 flex flex-col items-center gap-2">
                <Spinner size="md" color="warning" />
                <span className="text-xs font-bold text-gray-700">Uploading media to server...</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border flex items-center justify-center text-gray-400 group-hover:text-yellow-500 group-hover:scale-110 transition-all">
                  {type === 'video' ? (
                    <HiOutlineVideoCamera className="w-6 h-6 text-purple-600" />
                  ) : (
                    <HiUpload className="w-6 h-6 text-yellow-500" />
                  )}
                </div>

                <div>
                  <span className="text-xs font-extrabold text-gray-800 block">
                    Click to browse or drag & drop file here
                  </span>
                  <span className="text-[11px] text-gray-500 block mt-0.5">
                    {type === 'video'
                      ? 'MP4, WEBM, MOV (Max 100MB HD Video)'
                      : 'PNG, JPG, WEBP, SVG (Auto-compressed for web)'}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Manual URL TextInput Option (Toggleable) */}
      {showUrlInput && (
        <div className="pt-1">
          <TextInput
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              type === 'video'
                ? 'https://example.com/video.mp4 or /uploads/video.mp4'
                : 'https://example.com/image.jpg or /uploads/image.png'
            }
            size="sm"
          />
        </div>
      )}
    </div>
  );
}
