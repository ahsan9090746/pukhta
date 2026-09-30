import type { ComponentType } from "react";
import {
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
} from "lucide-react";
import {
  PinterestIcon,
  TiktokIcon,
  WhatsappIcon,
} from "@/components/common/social-icons";
import type { Settings } from "@/types";

/** Lucide icons and the brand icons behave the same for our usage. */
type SocialIcon = ComponentType<{ className?: string }>;

export interface SocialLink {
  key: string;
  label: string;
  icon: SocialIcon;
  url: string;
}

/**
 * Single source of truth for the store's social platforms — the keys must match
 * `socialMedia` in the admin panel (Admin → Settings → Social Media) and the
 * backend settings model. Order is the render order in the storefront.
 */
const SOCIAL_PLATFORMS: { key: keyof Settings["socialMedia"]; label: string; icon: SocialIcon }[] = [
  { key: "facebook", label: "Facebook", icon: Facebook },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "twitter", label: "Twitter", icon: Twitter },
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "pinterest", label: "Pinterest", icon: PinterestIcon },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
  { key: "whatsapp", label: "WhatsApp", icon: WhatsappIcon },
  { key: "tiktok", label: "TikTok", icon: TiktokIcon },
];

/** Example URLs shown as placeholders inside the admin settings form. */
const SOCIAL_PLACEHOLDERS: Record<keyof Settings["socialMedia"], string> = {
  facebook: "https://facebook.com/your-page",
  instagram: "https://instagram.com/your-handle",
  twitter: "https://twitter.com/your-handle",
  youtube: "https://youtube.com/@your-channel",
  pinterest: "https://pinterest.com/your-handle",
  linkedin: "https://linkedin.com/company/your-page",
  whatsapp: "https://wa.me/923001234567",
  tiktok: "https://tiktok.com/@your-handle",
};

/** Label shown for each platform field inside the admin settings form. */
export const SOCIAL_FIELDS: { key: keyof Settings["socialMedia"]; label: string; placeholder: string }[] =
  SOCIAL_PLATFORMS.map(({ key, label }) => ({
    key,
    label,
    placeholder: SOCIAL_PLACEHOLDERS[key],
  }));

/**
 * Social links the admin has actually filled in — platforms with an empty URL
 * are dropped so the storefront never renders an empty icon.
 */
export const getSocialLinks = (
  socialMedia?: Partial<Settings["socialMedia"]> | null
): SocialLink[] =>
  SOCIAL_PLATFORMS.filter(({ key }) => socialMedia?.[key]).map(({ key, label, icon }) => ({
    key,
    label,
    icon,
    url: socialMedia![key] as string,
  }));
