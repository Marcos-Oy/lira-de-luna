import { getPushSettings, getPushHistory, getSubscriberCount } from "@/app/actions/admin/push";
import NotificacionesClient from "./NotificacionesClient";

export default async function NotificacionesPage() {
  const [settings, history, subscriberCount] = await Promise.all([
    getPushSettings(),
    getPushHistory(),
    getSubscriberCount(),
  ]);

  return (
    <NotificacionesClient
      settings={{
        pushEnabled:          settings?.pushEnabled          ?? false,
        pushVapidPublicKey:   settings?.pushVapidPublicKey   ?? null,
        pushNotifNewProduct:  settings?.pushNotifNewProduct  ?? true,
        pushNotifLowStock:    settings?.pushNotifLowStock    ?? true,
        pushNotifOffers:      settings?.pushNotifOffers      ?? true,
        pushNotifPromo:       settings?.pushNotifPromo       ?? true,
        pushFrequencyPerWeek: settings?.pushFrequencyPerWeek ?? 2,
        pushHourStart:        settings?.pushHourStart        ?? 9,
        pushHourEnd:          settings?.pushHourEnd          ?? 20,
        pushLastSentAt:       settings?.pushLastSentAt?.toISOString() ?? null,
        pwaCustomerIconUrl:   settings?.pwaCustomerIconUrl   ?? null,
        pwaAdminIconUrl:      settings?.pwaAdminIconUrl      ?? null,
      }}
      history={history.map((h) => ({
        id:        h.id,
        type:      h.type,
        title:     h.title,
        body:      h.body,
        url:       h.url ?? null,
        sentCount: h.sentCount,
        createdAt: h.createdAt.toISOString(),
      }))}
      subscriberCount={subscriberCount}
    />
  );
}
