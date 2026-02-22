import { useSidebarController } from "@/controllers/useSidebarController";
import SidebarView from "@/views/layout/SidebarView";

export function Sidebar() {
  const vm = useSidebarController();
  return <SidebarView {...vm} />;
}
