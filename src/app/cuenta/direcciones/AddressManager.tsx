"use client";

import { useState, useTransition } from "react";
import { MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import { createAddress, updateAddress, deleteAddress, setDefaultAddress } from "@/app/actions/cuenta";
import { COUNTRIES, countryName } from "@/lib/countries";
import type { Address } from "@prisma/client";

type FormData = {
  name:      string;
  phone:     string;
  street:    string;
  city:      string;
  state:     string;
  zip:       string;
  country:   string;
  isDefault: boolean;
};

const empty: FormData = { name: "", phone: "", street: "", city: "", state: "", zip: "", country: "CL", isDefault: false };

export default function AddressManager({ addresses: initial }: { addresses: Address[] }) {
  const [addresses, setAddresses] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setEditId(null);
    setForm(empty);
    setError(null);
    setShowForm(true);
  }

  function openEdit(addr: Address) {
    setEditId(addr.id);
    setForm({
      name:      addr.name,
      phone:     addr.phone ?? "",
      street:    addr.street,
      city:      addr.city,
      state:     addr.state,
      zip:       addr.zip,
      country:   addr.country ?? "CL",
      isDefault: addr.isDefault,
    });
    setError(null);
    setShowForm(true);
  }

  function handleField(field: keyof FormData, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editId
        ? await updateAddress(editId, form)
        : await createAddress(form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      // Refresh by reload (revalidatePath handles server state)
      window.location.reload();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta dirección?")) return;
    startTransition(async () => {
      await deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    });
  }

  function handleSetDefault(id: string) {
    startTransition(async () => {
      await setDefaultAddress(id);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === id }))
      );
    });
  }

  return (
    <div>
      {/* Address list */}
      {addresses.length === 0 && !showForm ? (
        <div className="border-t border-brand-beige pt-8 text-center py-12">
          <MapPin size={32} strokeWidth={1} className="text-brand-beige mx-auto mb-3" />
          <p className="text-sm text-brand-taupe font-light">Aún no tienes direcciones guardadas.</p>
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`border p-5 flex items-start justify-between gap-4 ${
                addr.isDefault ? "border-brand-sand bg-brand-beige-light/50" : "border-brand-beige"
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm text-brand-dark font-medium">{addr.name}</p>
                  {addr.isDefault && (
                    <span className="text-[9px] tracking-[0.1em] uppercase bg-brand-sand text-white px-2 py-0.5">
                      Predeterminada
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-taupe leading-relaxed">
                  {addr.street}<br />
                  {addr.city}, {addr.state} {addr.zip}<br />
                  {countryName(addr.country ?? "CL")}
                </p>
                {addr.phone && (
                  <p className="text-xs text-brand-taupe mt-1">{addr.phone}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    disabled={pending}
                    title="Establecer como predeterminada"
                    className="text-brand-taupe hover:text-brand-sand transition-colors"
                  >
                    <Star size={14} strokeWidth={1.5} />
                  </button>
                )}
                <button
                  onClick={() => openEdit(addr)}
                  title="Editar"
                  className="text-brand-taupe hover:text-brand-dark transition-colors"
                >
                  <Pencil size={14} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  disabled={pending}
                  title="Eliminar"
                  className="text-brand-taupe hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={openNew}
          className="flex items-center gap-2 text-xs tracking-[0.12em] uppercase text-brand-sand hover:text-brand-taupe transition-colors"
        >
          <Plus size={14} strokeWidth={1.5} />
          Agregar dirección
        </button>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border border-brand-beige p-6 space-y-4 max-w-md mt-4">
          <h3 className="text-[10px] tracking-[0.2em] uppercase text-brand-dark">
            {editId ? "Editar dirección" : "Nueva dirección"}
          </h3>

          {[
            { id: "name",   label: "Nombre de quien recibe",  type: "text",  placeholder: "Nombre completo" },
            { id: "phone",  label: "Teléfono (opcional)",      type: "tel",   placeholder: "+56 9 1234 5678" },
            { id: "street", label: "Calle y número",           type: "text",  placeholder: "Ej: Av. Providencia 1234, Depto 5" },
            { id: "city",   label: "Ciudad",                    type: "text",  placeholder: "Santiago" },
            { id: "state",  label: "Región",                    type: "text",  placeholder: "Región Metropolitana" },
            { id: "zip",    label: "Código postal",             type: "text",  placeholder: "7500000" },
          ].map(({ id, label, type, placeholder }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">
                {label}
              </label>
              <input
                id={id}
                type={type}
                value={form[id as keyof FormData] as string}
                onChange={(e) => handleField(id as keyof FormData, e.target.value)}
                required={id !== "phone"}
                placeholder={placeholder}
                className="w-full bg-brand-cream border border-brand-beige text-brand-dark placeholder:text-brand-taupe text-xs px-3 py-3 outline-none focus:border-brand-sand transition-colors"
              />
            </div>
          ))}

          {/* País */}
          <div>
            <label htmlFor="country" className="block text-[10px] tracking-[0.15em] uppercase text-brand-taupe mb-1.5">
              País *
            </label>
            <select
              id="country"
              value={form.country}
              onChange={(e) => handleField("country", e.target.value)}
              required
              className="w-full bg-brand-cream border border-brand-beige text-brand-dark text-xs px-3 py-3 outline-none focus:border-brand-sand transition-colors"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => handleField("isDefault", e.target.checked)}
              className="accent-[#CDA78F]"
            />
            <span className="text-xs text-brand-taupe">Establecer como dirección predeterminada</span>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="bg-brand-sand hover:bg-brand-taupe disabled:opacity-60 text-white text-[10px] tracking-[0.2em] uppercase px-6 py-3 transition-colors"
            >
              {pending ? "Guardando…" : editId ? "Actualizar" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-[10px] tracking-[0.15em] uppercase text-brand-taupe hover:text-brand-dark transition-colors px-4"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
