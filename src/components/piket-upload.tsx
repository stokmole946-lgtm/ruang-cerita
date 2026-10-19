"use client";

import { useState, useRef } from "react";
import { Camera, CheckCircle, UploadSimple, X } from "@phosphor-icons/react";
import { uploadPiketPhotoAction } from "@/app/piket-actions";

export function PiketUpload({ dayName }: { dayName: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [note, setNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Kompres gambar menggunakan canvas (maksimal 1200px)
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedData = canvas.toDataURL("image/jpeg", 0.75);
            setPreview(compressedData);
          }
          setIsProcessing(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      setIsProcessing(false);
      alert("Gagal memproses gambar. Silakan coba foto lain.");
    }
  };

  const clearPhoto = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="border-2 border-[#20201e] rounded-[10px] p-5 sm:p-6 bg-[#fffef9] shadow-[3px_3px_0_#20201e] space-y-4">
      <div className="border-b-2 border-[#20201e]/20 pb-3">
        <span className="badge !bg-[#ffa18b] text-xs font-black mb-1">DOKUMENTASI WAJIB</span>
        <h3 className="text-xl font-black">Unggah Bukti Kebersihan Kelas ({dayName})</h3>
        <p className="text-xs text-[#555951] mt-0.5">
          Regu piket hari ini wajib mengambil foto kondisi kelas setelah selesai dibersihkan.
        </p>
      </div>

      <form action={uploadPiketPhotoAction} className="space-y-4">
        <input type="hidden" name="photoData" value={preview ?? ""} />

        {!preview ? (
          <div>
            <label className="border-2 border-dashed border-[#20201e] hover:bg-[#ffdb59]/20 transition rounded-[8px] p-6 flex flex-col items-center justify-center cursor-pointer text-center space-y-2">
              <Camera size={40} className="text-[#345bdc]" weight="fill" />
              <div>
                <p className="font-extrabold text-sm">Ambil Foto / Pilih dari Galeri HP</p>
                <p className="text-xs text-[#555951]">Format JPG, PNG (otomatis dikompres)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {isProcessing && <p className="text-xs text-center text-[#555951] mt-2">Sedang memproses foto...</p>}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative border-2 border-[#20201e] rounded-[8px] overflow-hidden max-h-[350px] bg-black/5 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview Bukti Piket" className="object-contain max-h-[350px] w-full" />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-2 right-2 bg-[#ffa18b] border-2 border-[#20201e] rounded-full p-1.5 shadow-[2px_2px_0_#20201e] hover:scale-105 transition"
                title="Hapus / Ganti Foto"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-[#059669] font-bold">
              <span className="flex items-center gap-1">
                <CheckCircle size={16} weight="fill" /> Foto siap diunggah
              </span>
              <button type="button" onClick={clearPhoto} className="text-[#d94833] underline">
                Ganti foto lain
              </button>
            </div>
          </div>
        )}

        <label className="block">
          <span className="block text-xs font-bold mb-1">Catatan Tambahan (Opsional)</span>
          <input
            name="note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: Lantai sudah dipel, papan tulis bersih, sampah sudah dibuang ke TPS luar..."
            className="field w-full text-xs"
            maxLength={500}
          />
        </label>

        <button
          type="submit"
          disabled={!preview || isProcessing}
          className="btn-primary !min-h-[46px] w-full !text-sm flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <UploadSimple size={18} weight="bold" />
          Kirim Bukti Foto Piket Hari Ini
        </button>
      </form>
    </div>
  );
}
