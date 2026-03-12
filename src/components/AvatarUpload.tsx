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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Błąd", description: "Wybierz plik graficzny.", variant: "destructive" });
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
