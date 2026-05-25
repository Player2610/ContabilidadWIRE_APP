import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { Toaster } from "sonner";
import { LayoutDashboard, ArrowLeftRight, Clock, FolderOpen } from "lucide-react";

const navLinks = [
  { href: "/",            label: "Dashboard",    icon: LayoutDashboard },
  { href: "/movimientos", label: "Movimientos",  icon: ArrowLeftRight  },
  { href: "/pendientes",  label: "Pendientes",   icon: Clock           },
  { href: "/proyectos",   label: "Proyectos",    icon: FolderOpen      },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Barra superior */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-bold text-lg">Control de Cuentas</span>
          {/* Navegación desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 text-sm rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Navegación inferior móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-40">
        <div className="grid grid-cols-4">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 py-2 text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </div>
      </nav>
      {/* Espaciado para nav inferior en móvil */}
      <div className="md:hidden h-16" />
      <Toaster richColors position="top-right" />
    </div>
  );
}
