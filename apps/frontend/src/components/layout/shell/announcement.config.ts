import { env } from "@/env";

export const isAnnouncementEnabled = env.VITE_ENABLE_ANNOUNCEMENT ?? false;
