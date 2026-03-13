import { cdnUrl } from "@/lib/cdnUrl";

interface PlayerAvatarProps {
  avatarUrl?: string | null;
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-9 h-9 text-xs",
  md: "w-14 h-14 text-lg",
  lg: "w-20 h-20 text-2xl",
};

const PlayerAvatar = ({ avatarUrl, initials, size = "md", className = "" }: PlayerAvatarProps) => {
  return (
    <div className={`rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center font-display font-bold text-primary overflow-hidden ${sizeMap[size]} ${className}`}>
      {avatarUrl ? (
        <img src={cdnUrl(avatarUrl) ?? avatarUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />
      ) : (
        initials
      )}
    </div>
  );
};

export default PlayerAvatar;
