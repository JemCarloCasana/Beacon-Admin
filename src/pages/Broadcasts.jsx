import { useBroadcastsController } from "@/controllers/useBroadcastsController";
import BroadcastsView from "@/views/broadcasts/BroadcastsView";

export default function Broadcasts() {
  const vm = useBroadcastsController();
  return <BroadcastsView {...vm} />;
}

