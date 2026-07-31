// Supabase Edge Function: envoie une notification push web à tous les
// abonnements d'un utilisateur. Appelée par un trigger Postgres à chaque
// insertion dans la table `notifications` (voir scratch_push_notifications.sql).
//
// Déploiement : supabase functions deploy send-push --no-verify-jwt
// Secrets requis : supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:... PUSH_WEBHOOK_SECRET=...

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

interface Payload {
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
}

Deno.serve(async (req) => {
  const webhookSecret = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!webhookSecret || req.headers.get("x-webhook-secret") !== webhookSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await req.json()) as Payload;
  if (!payload.user_id || !payload.title) {
    return new Response("Bad request", { status: 400 });
  }

  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT")!,
    Deno.env.get("VAPID_PUBLIC_KEY")!,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", payload.user_id);

  if (!subs || subs.length === 0) {
    return new Response("No subscriptions", { status: 200 });
  }

  const notificationBody = JSON.stringify({
    title: payload.title,
    body: payload.body ?? "",
    link: payload.link ?? "/",
  });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationBody,
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // Abonnement expiré ou révoqué côté navigateur — on le supprime.
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("push send failed", sub.id, err);
        }
      }
    }),
  );

  return new Response("OK", { status: 200 });
});
