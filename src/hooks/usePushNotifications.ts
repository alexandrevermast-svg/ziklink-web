"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const supabase = createClient();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    if (!supported) return;

    navigator.serviceWorker.register("/sw.js").then(async (registration) => {
      const existing = await registration.pushManager.getSubscription();
      setIsSubscribed(!!existing);
    });
  }, []);

  const subscribe = useCallback(async () => {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!isSupported || !vapidPublicKey) return { error: "Notifications non supportées sur cet appareil." };

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Connecte-toi pour activer les notifications." };

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return { error: "Permission refusée." };

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const json = subscription.toJSON();
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      }, { onConflict: "endpoint" });

      if (error) return { error: error.message };
      setIsSubscribed(true);
      return { error: null };
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, supabase]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe };
}
