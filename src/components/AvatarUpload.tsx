import { useState, useRef } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  currentInitials: string;
  playerId: string;
  onUploaded: (url: string) => void;
}

const AvatarUpload = ({ currentAvatarUrl, currentInitials, playerId, onUploaded }: AvatarUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl);
  const inputRef = useRef<HTMLInputElement>(null);

  // Verify file type from magic bytes
  const verifyImageMagicBytes = async (file: File): Promise<boolean> => {
    try {
      const buffer = await file.slice(0, 12).arrayBuffer();
      const view = new Uint8Array(buffer);
      
      // Check magic bytes for valid image types
      // PNG: 89 50 4e 47
      if (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e && view[3] === 0x47) return true;
      
      // JPEG: FF D8 FF
      if (view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) return true;
      
      // WebP: RIFF ... WEBP
      if (view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 &&
          view[8] === 0x57 && view[9] === 0x45 && view[10] === 0x42 && view[11] === 0x50) return true;
      
      return false;
    } catch {
      return false;
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Błąd", description: "Wybierz plik graficzny.", variant: "destructive" });
      return;
    }

    // Verify actual file type from magic bytes
    const isValidImage = await verifyImageMagicBytes(file);
    if (!isValidImage) {
      toast({ title: "Błąd", description: "Plik nie jest prawidłowym obrazem. Dozwolone: PNG, JPEG, WebP", variant: "destructive" });
      return;
    }

    if (file.size > 512 * 1024) {
      toast({ title: "Błąd", description: "Maksymalny rozmiar avatara to 512 KB.", variant: "destructive" });
      return;
    }

    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Błąd uploadu", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

    // Update player record
    await supabase.from("players").update({ avatar_url: urlWithCacheBust }).eq("id", playerId);

    setPreviewUrl(urlWithCacheBust);
    onUploaded(urlWithCacheBust);
    setUploading(false);
    toast({ title: "Zdjęcie zapisane!", description: "Twój avatar został zaktualizowany." });
  };

  return (
    <div className="relative group">
      <div className="w-20 h-20 rounded-full border-2 border-primary/40 overflow-hidden bg-primary/20 flex items-center justify-center">
        {previewUrl ? (
          <img src={previewUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-display font-bold text-primary">{currentInitials}</span>
        )}
      </div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 text-white animate-spin" />
        ) : (
          <Camera className="h-5 w-5 text-white" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
};

export default AvatarUpload;
