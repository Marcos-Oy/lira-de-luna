export type SocialLink = { platform: string; url: string };

type IconProps = { size?: number };

function InstagramIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

function FacebookIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function TwitterXIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M4 4 L20 20 M20 4 L4 20" />
    </svg>
  );
}

function YouTubeIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <polygon points="10,9 16,12 10,15" fill="currentColor" stroke="none" />
    </svg>
  );
}

function PinterestIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 15c.5-1.5 1-3 1.5-4.5-.3-.6-.5-1.3-.5-2a2 2 0 0 1 4 0c0 1.5-1 2.5-1 3.5 0 .8.6 1.5 1.5 1.5 1.8 0 3-2 3-4a5 5 0 1 0-9.9 1.2c.1.5.5 1 .4 1.3L7 19" />
    </svg>
  );
}

function WhatsAppIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function LinkedInIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function ThreadsIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.5 2 4 6 4 9.5c0 4 2.5 6.5 8 6.5 1.5 0 3-.3 4-1" />
      <path d="M16 14.5c.5 1.5.5 3-.5 4.5s-3 2-5 2-4-1-4-3c0-1.5 1-2.5 3-3" />
      <ellipse cx="14" cy="10" rx="2" ry="3" />
    </svg>
  );
}

function SpotifyIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 13.5c2.5-1 5.5-1 8 0" />
      <path d="M7 10.5c3-1.5 7-1.5 10 0" />
      <path d="M9 16.5c2-0.7 4-0.7 6 0" />
    </svg>
  );
}

export type SocialIconComponent = React.FC<IconProps>;

export const SOCIAL_ICON_MAP: Record<string, { Icon: SocialIconComponent; label: string }> = {
  instagram: { Icon: InstagramIcon, label: "Instagram" },
  tiktok:    { Icon: TikTokIcon,    label: "TikTok" },
  facebook:  { Icon: FacebookIcon,  label: "Facebook" },
  twitter:   { Icon: TwitterXIcon,  label: "Twitter / X" },
  youtube:   { Icon: YouTubeIcon,   label: "YouTube" },
  pinterest: { Icon: PinterestIcon, label: "Pinterest" },
  whatsapp:  { Icon: WhatsAppIcon,  label: "WhatsApp" },
  linkedin:  { Icon: LinkedInIcon,  label: "LinkedIn" },
  threads:   { Icon: ThreadsIcon,   label: "Threads" },
  spotify:   { Icon: SpotifyIcon,   label: "Spotify" },
};

export function parseSocialLinks(value: string): SocialLink[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as SocialLink[];
  } catch {}
  return [];
}

export const DEFAULT_SOCIAL_LINKS = JSON.stringify([
  { platform: "instagram", url: "https://instagram.com" },
  { platform: "tiktok",    url: "https://tiktok.com" },
]);
