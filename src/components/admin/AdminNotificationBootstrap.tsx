"use client";

import { useEffect } from "react";

export default function AdminNotificationBootstrap({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, [enabled]);

  return null;
}
