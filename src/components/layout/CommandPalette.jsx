import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useIncidentsAPI } from "@/api/useIncidentsAPI";
import { useSOSLiveQueue } from "@/api/useSosAPI";
import { toIncidentListViewModel } from "@/models/incident.model";
import { toSosFeedAlert } from "@/models/sos-live.model";
import { NAV_ITEMS } from "@/config/constants";
import { useAuth } from "@/hooks/useAuth";

/**
 * A command palette for jumping straight to a page, an incident or a live SOS
 * thread. It opens with Cmd/Ctrl+K.
 *
 * The queries are only enabled while the palette is open and the operator holds
 * the matching permission, so a page that does not otherwise need the incident
 * or SOS lists does not pay for them.
 */
export function CommandPalette() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const canViewIncidents = hasPermission("view_incidents");
  const canManageSos = hasPermission("manage_sos");

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key?.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((previous) => !previous);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const incidentsQuery = useIncidentsAPI(
    { page: 1, limit: 50 },
    { enabled: open && canViewIncidents }
  );
  const sosQuery = useSOSLiveQueue(
    { status: "open", limit: 50 },
    { enabled: open && canManageSos }
  );

  const pages = useMemo(
    () =>
      NAV_ITEMS.flatMap((group) => group.items || []).filter((item) => {
        if (item.requiredPermissions) return item.requiredPermissions.some(hasPermission);
        if (!item.requiredPermission) return true;
        return hasPermission(item.requiredPermission);
      }),
    [hasPermission]
  );
  const incidents = useMemo(
    () => toIncidentListViewModel(incidentsQuery.data || []),
    [incidentsQuery.data]
  );
  const threads = useMemo(
    () => (Array.isArray(sosQuery.data) ? sosQuery.data : []).map(toSosFeedAlert),
    [sosQuery.data]
  );

  const go = (path) => {
    setOpen(false);
    setSearch("");
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder="Search pages, incidents and SOS requests..."
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Pages">
          {pages.map((item) => (
            <CommandItem
              key={item.path}
              value={`page ${item.label}`}
              onSelect={() => go(item.path)}
            >
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {canViewIncidents && (
          <CommandGroup heading="Incidents">
            {incidents.map((incident) => (
              <CommandItem
                key={incident.id}
                value={`incident ${incident.title} ${incident.id}`}
                onSelect={() => go(`/incidents/${incident.id}`)}
              >
                {incident.title || `Incident #${incident.id}`}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {canManageSos && (
          <CommandGroup heading="SOS requests">
            {threads.map((thread) => (
              <CommandItem
                key={thread.id}
                value={`sos ${thread.userName} ${thread.id}`}
                onSelect={() => go(`/sos/${thread.id}`)}
              >
                {thread.userName} - SOS request #{thread.id}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
