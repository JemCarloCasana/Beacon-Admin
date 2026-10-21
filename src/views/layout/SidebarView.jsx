import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/config/constants";
import { ScrollArea } from "@/components/ui/scroll-area";
import beaconLogo from "../../../img/beacon_logo.png";
import {
  LayoutDashboard,
  AlertTriangle,
  Radio,
  Map,
  Users,
  UserCog,
  FileText,
  Shield,
  Activity,
  Megaphone,
} from "lucide-react";

const iconMap = {
  LayoutDashboard,
  AlertTriangle,
  Radio,
  Map,
  Users,
  UserCog,
  FileText,
  Activity,
  Megaphone,
};

export default function SidebarView({ pathname, visibleNavItems, profile }) {
  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground/80">
      <div className="flex h-16 items-center gap-3 px-6">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-sidebar-primary">
          <img
            src={beaconLogo}
            alt="Beacon logo"
            className="h-full w-full scale-[1.5] object-cover object-[center_66%]"
          />
        </div>
        <h1 className="text-xl font-bold tracking-wider text-white">
          BEACON
        </h1>
      </div>

      <ScrollArea className="flex-1 px-0 py-4">
        <nav className="space-y-6">
          {(visibleNavItems || []).map((group) => (
            <div key={group.category} className="space-y-1">
              {group.category && (
                <h2 className="mb-2 px-6 text-xs font-semibold tracking-[0.2em] text-sidebar-foreground/60">
                  {group.category}
                </h2>
              )}

              <div className="space-y-[2px]">
                {(group.items || []).map((item) => {
                  const Icon = iconMap[item.icon] || Shield;
                  const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-all group",
                        isActive
                          ? "bg-sidebar-primary/10 text-white"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      )}
                    >
                      {isActive && <div className="absolute left-0 top-0 h-full w-[3px] bg-sidebar-primary" />}
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground/80"
                        )}
                      />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="mt-auto border-t border-sidebar-border bg-sidebar-accent/40 p-4">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-sidebar-accent text-xs font-bold text-sidebar-foreground/80">
            {profile?.initials || "OP"}
          </div>

          <div className="flex-1 overflow-hidden text-xs">
            <p className="font-bold text-sidebar-foreground">{profile?.fullName || "Operator"}</p>
            <p className="text-sidebar-foreground/60">{profile?.role ? roleLabel(profile.role) : ""}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
