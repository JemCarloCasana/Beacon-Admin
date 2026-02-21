/**
 * usePermissions Hook
 * 
 * Provides permission-checking utilities based on the user's me object.
 * Safe defaults: assumes no permissions when me is undefined.
 * 
 * Usage:
 * const { permissions, hasPermission } = usePermissions(me);
 * if (hasPermission('manage_users')) { ... }
 */

export function usePermissions(me) {
    // Safe default: no permissions when me is undefined
    const permissions = me?.permissions ?? [];

    /**
     * Check if user has a specific permission
     * @param {string} permissionName - The permission to check (e.g., 'manage_users')
     * @returns {boolean} True if user has the permission, false otherwise
     */
    const hasPermission = (permissionName) => {
        if (!permissionName) return false;
        return permissions.includes(permissionName);
    };

    /**
     * Check if user has any of the provided permissions
     * @param {string[]} permissionNames - Array of permissions to check
     * @returns {boolean} True if user has at least one permission
     */
    const hasAnyPermission = (permissionNames) => {
        if (!Array.isArray(permissionNames) || permissionNames.length === 0) return false;
        return permissionNames.some((perm) => permissions.includes(perm));
    };

    /**
     * Check if user has all of the provided permissions
     * @param {string[]} permissionNames - Array of permissions to check
     * @returns {boolean} True if user has all permissions
     */
    const hasAllPermissions = (permissionNames) => {
        if (!Array.isArray(permissionNames) || permissionNames.length === 0) return false;
        return permissionNames.every((perm) => permissions.includes(perm));
    };

    return {
        permissions,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        me,
    };
}
