import { useUsersController } from "@/controllers/useUsersController";
import UsersView from "@/views/users/UsersView";

export default function Users() {
  const vm = useUsersController();
  return <UsersView {...vm} />;
}
