import { PERMISSION_LABELS } from "@/config/permissions";

/**
 * A controlled group of permission checkboxes.
 *
 * One component for every place the console offers permissions, so the
 * invite popup, the Add User dialog and the Edit User dialog all show
 * the same thing the same way.
 *
 * Each permission is shown twice: the human label the operator reads,
 * and the raw code that actually reaches the server. An operator who
 * cannot see the code cannot tell what they are handing over.
 *
 * @param {object} props
 * @param {string[]} props.permissions The permissions to offer.
 * @param {string[]} props.value The permissions currently selected.
 * @param {(next: string[]) => void} props.onChange Called with the next selection.
 * @param {boolean} [props.disabled] When true the group cannot be changed.
 * @param {string} [props.idPrefix] Keeps control ids unique when two pickers share a page.
 */
export default function PermissionPicker({
  permissions = [],
  value = [],
  onChange,
  disabled = false,
  idPrefix = "permission",
}) {
  const selected = Array.isArray(value) ? value : [];

  const handleToggle = (permission, checked) => {
    if (disabled || typeof onChange !== "function") return;
    const next = checked
      ? [...selected, permission]
      : selected.filter((item) => item !== permission);
    onChange(next);
  };

  return (
    <div className="max-h-48 space-y-2 overflow-y-auto rounded border p-2">
      {permissions.map((permission) => {
        const inputId = `${idPrefix}-${permission}`;
        return (
          <label
            key={permission}
            htmlFor={inputId}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              id={inputId}
              type="checkbox"
              className="h-4 w-4 shrink-0 accent-primary"
              aria-label={permission}
              checked={selected.includes(permission)}
              disabled={disabled}
              onChange={(event) => handleToggle(permission, event.target.checked)}
            />
            <span>{PERMISSION_LABELS[permission] || permission}</span>
            <span className="font-mono text-xs text-muted-foreground">{permission}</span>
          </label>
        );
      })}
    </div>
  );
}
