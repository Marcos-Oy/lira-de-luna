import { redirect } from "next/navigation";

export default function NuevoEventoPage() {
  redirect("/admin/landing-pages/nueva?type=evento");
}
