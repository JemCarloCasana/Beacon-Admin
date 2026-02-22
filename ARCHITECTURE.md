# Beacon Admin MVVC Architecture

This frontend now follows MVVC in React:

- Model: shape/normalize raw backend data into stable UI-ready objects.
- View: pure presentational components that render from props + callbacks only.
- ViewController: hooks that bind auth, permissions, React Query/data hooks, transforms, and actions.
- Pages: thin route-level components that call a controller and spread the returned VM into a view.

## Folder Mapping

- `src/models/`
  - `admin.model.js`
  - `incident.model.js`
  - `user.model.js`
- `src/views/`
  - `layout/SidebarView.jsx`
  - `users/UsersView.jsx`
  - `dashboard/DashboardView.jsx`
- `src/controllers/`
  - `useSidebarController.js`
  - `useUsersController.js`
  - `useDashboardController.js`
- `src/pages/`
  - `Users.jsx` (thin)
  - `Dashboard.jsx` (thin)

## Single Source of Truth

- Auth identity/permissions come from `useAdminAuth()` only.
- `useAdminAuth()` is backed by `/admin/me` in `AdminAuthProvider`.
- Route protection remains in `src/auth/ProtectedRoute.jsx`.

## Responsibility Split (Implemented)

- Sidebar:
  - Controller computes permission-filtered nav items and profile data.
  - View renders nav/profile only.
- Users:
  - Controller handles auth/permission gate, query enablement, search filtering, and actions.
  - View renders search, loading/error states, and table from props.
- Dashboard:
  - Controller handles incident transformation, SOS shaping, selection state, permission flags, and navigation actions.
  - View renders layout/content from props and callbacks only.

## Rules Enforced

- No API calls in View files under `src/views`.
- No permission computation in View files under `src/views`.
- No localStorage access in View files under `src/views`.
- Views do not call `useAdminAuth`, `useQuery`, or `apiGet`.
