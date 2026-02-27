import { useMapController } from "@/controllers/useMapController";
import MapViewScreen from "@/views/map/MapViewScreen";

export default function MapView() {
  const vm = useMapController();
  return <MapViewScreen {...vm} />;
}
