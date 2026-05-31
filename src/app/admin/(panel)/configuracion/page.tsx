import { Truck, CreditCard, Bell, Globe, ShoppingBag, PackageSearch, Shield, Mail } from "lucide-react";
import { getStoreSettings } from "@/app/actions/admin/settings";
import WholesaleToggle from "./WholesaleToggle";
import RetailToggle from "./RetailToggle";
import ShippingClient from "./ShippingClient";
import PaymentsClient from "./PaymentsClient";
import NotificationsClient from "./NotificationsClient";
import SeoClient from "./SeoClient";
import EmailConfigClient from "./EmailConfigClient";

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#F7F4F1] border border-[#D8BFAE]">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#D8BFAE]">
        <Icon size={15} strokeWidth={1.5} className="text-[#CDA78F]" />
        <div>
          <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">{title}</h2>
          {subtitle && <p className="text-[10px] text-[#8E7A6B] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default async function AdminConfiguracionPage() {
  const s = await getStoreSettings();

  return (
    <div className="space-y-8 max-w-3xl">

      {/* Venta minorista */}
      <div className="bg-[#F7F4F1] border-2 border-[#CDA78F]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#D8BFAE]">
          <ShoppingBag size={15} strokeWidth={1.5} className="text-[#CDA78F]" />
          <div className="flex-1">
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Venta minorista</h2>
            <p className="text-[10px] text-[#8E7A6B] mt-0.5">Activa o desactiva la tienda y colecciones para clientes individuales</p>
          </div>
          <RetailToggle enabled={s.retailEnabled} />
        </div>
        <div className="px-6 py-5">
          <div className={`flex items-start gap-3 p-3 text-xs ${s.retailEnabled ? "bg-emerald-50 border border-emerald-200" : "bg-[#EDE2D8] border border-[#D8BFAE]"}`}>
            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${s.retailEnabled ? "bg-emerald-400" : "bg-[#D8BFAE]"}`} />
            <p className={s.retailEnabled ? "text-emerald-700" : "text-[#8E7A6B]"}>
              {s.retailEnabled
                ? "Módulo activo — los clientes pueden acceder a /tienda y /colecciones."
                : "Módulo inactivo — /tienda y /colecciones muestran aviso de no disponibilidad."}
            </p>
          </div>
        </div>
      </div>

      {/* Venta al por mayor */}
      <div className="bg-[#F7F4F1] border-2 border-[#CDA78F]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#D8BFAE]">
          <PackageSearch size={15} strokeWidth={1.5} className="text-[#CDA78F]" />
          <div className="flex-1">
            <h2 className="text-[11px] tracking-[0.2em] uppercase text-[#5C4A3E] font-medium">Venta al por mayor</h2>
            <p className="text-[10px] text-[#8E7A6B] mt-0.5">Activa o desactiva el módulo mayorista</p>
          </div>
          <WholesaleToggle enabled={s.wholesaleEnabled} />
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className={`flex items-start gap-3 p-3 text-xs ${s.wholesaleEnabled ? "bg-emerald-50 border border-emerald-200" : "bg-[#EDE2D8] border border-[#D8BFAE]"}`}>
            <div className={`w-2 h-2 rounded-full mt-1 shrink-0 ${s.wholesaleEnabled ? "bg-emerald-400" : "bg-[#D8BFAE]"}`} />
            <p className={s.wholesaleEnabled ? "text-emerald-700" : "text-[#8E7A6B]"}>
              {s.wholesaleEnabled
                ? "Módulo activo — los clientes pueden ver y comprar en /mayorista."
                : "Módulo inactivo — /mayorista está oculto. Puedes configurar productos mayoristas igualmente."}
            </p>
          </div>
          <p className="text-[10px] text-[#8E7A6B]">
            Para configurar un producto como mayorista ve a{" "}
            <a href="/admin/productos" className="text-[#CDA78F] underline underline-offset-2">Productos</a>
            {" "}y selecciona el tipo <strong>Por cantidad</strong> o <strong>Por peso</strong>.
          </p>
        </div>
      </div>

      {/* Envíos */}
      <SectionCard icon={Truck} title="Envíos" subtitle="Umbrales y costos de envío mostrados en la tienda">
        <ShippingClient
          freeShippingFrom={s.freeShippingFrom}
          standardShipping={s.standardShipping}
          processingDays={s.processingDays}
        />
      </SectionCard>

      {/* Métodos de pago */}
      <SectionCard icon={CreditCard} title="Métodos de pago" subtitle="Activa uno o varios métodos simultáneamente">
        <PaymentsClient
          mercadoPagoEnabled={s.mercadoPagoEnabled}
          mercadoPagoPublicKey={s.mercadoPagoPublicKey}
          mercadoPagoAccessToken={s.mercadoPagoAccessToken}
          flowPayEnabled={s.flowPayEnabled}
          flowPayApiKey={s.flowPayApiKey}
          flowPaySecretKey={s.flowPaySecretKey}
          transferEnabled={s.transferEnabled}
          transferBankName={s.transferBankName}
          transferAccountName={s.transferAccountName}
          transferAccountNumber={s.transferAccountNumber}
          transferAccountType={s.transferAccountType}
          transferRut={s.transferRut}
          transferInstructions={s.transferInstructions}
        />
      </SectionCard>

      {/* Notificaciones */}
      <SectionCard icon={Bell} title="Notificaciones" subtitle="Email y alertas del navegador (solo panel de administración)">
        <NotificationsClient
          notifyNewOrder={s.notifyNewOrder}
          notifyPaymentFail={s.notifyPaymentFail}
          notifyLowStock={s.notifyLowStock}
          notifyWeeklySummary={s.notifyWeeklySummary}
          notifyBrowserEnabled={s.notifyBrowserEnabled}
        />
      </SectionCard>

      {/* SEO */}
      <SectionCard icon={Globe} title="SEO y Metadatos" subtitle="Información visible en buscadores y al compartir en redes sociales">
        <SeoClient
          seoTitle={s.seoTitle}
          seoDescription={s.seoDescription}
          seoOgImage={s.seoOgImage}
        />
      </SectionCard>

      {/* Correo electrónico */}
      <SectionCard icon={Mail} title="Correo electrónico" subtitle="Servidor SMTP para notificaciones, campañas y recuperación de contraseña">
        <EmailConfigClient
          emailHost={s.emailHost}
          emailPort={s.emailPort}
          emailSecure={s.emailSecure}
          emailUser={s.emailUser}
          emailPassword={s.emailPassword}
          emailFromName={s.emailFromName}
          emailFromAddr={s.emailFromAddr}
        />
      </SectionCard>

      <div className="flex items-center justify-end pt-2">
        <div className="flex items-center gap-2 text-[10px] text-[#8E7A6B]">
          <Shield size={12} strokeWidth={1.5} className="text-[#CDA78F]" />
          Cada sección guarda de forma independiente.
        </div>
      </div>
    </div>
  );
}
