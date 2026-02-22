import { useDashboardController } from "@/controllers/useDashboardController";
import DashboardView from "@/views/dashboard/DashboardView";

export default function Dashboard() {
  const vm = useDashboardController();
  return <DashboardView {...vm} />;
}
