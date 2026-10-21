// Application constants and configuration

export const APP_NAME = 'Beacon';
export const APP_DESCRIPTION = 'Public Safety Admin Dashboard';
export const APP_LOCATION_LABEL = import.meta.env.VITE_APP_LOCATION_LABEL || '';
export const APP_TIMEZONE =
    import.meta.env.VITE_APP_TIMEZONE ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'Asia/Manila';

// API Configuration
// Note: Use src/services/api.js for all fetch requests
// These constants are informational only
export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
    TIMEOUT: parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || '10000', 10),
};

// Firebase Configuration (placeholders)
export const FIREBASE_CONFIG = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
};

// Map Configuration
export const MAP_CONFIG = {
    defaultCenter: { lat: 14.5995, lng: 120.9842 }, // Manila, Philippines
    defaultZoom: 12,
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
};

// Incident Priorities with colors
export const PRIORITY_CONFIG = {
    critical: { label: 'Critical', color: 'destructive' },
    high: { label: 'High', color: 'warning' },
    medium: { label: 'Medium', color: 'caution' },
    low: { label: 'Low', color: 'muted' },
};

// Incident Categories with icons
export const CATEGORY_CONFIG = {
    medical_emergency: { label: 'Medical Emergency', icon: 'Heart' },
    fire: { label: 'Fire', icon: 'Flame' },
    crime: { label: 'Crime', icon: 'Shield' },
    traffic_accident: { label: 'Traffic Accident', icon: 'Car' },
    natural_disaster: { label: 'Natural Disaster', icon: 'CloudLightning' },
    public_disturbance: { label: 'Public Disturbance', icon: 'Users' },
    other: { label: 'Other', icon: 'AlertCircle' },
};

// Status Configuration
export const STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'muted' },
    dispatched: { label: 'Dispatched', color: 'info' },
    in_progress: { label: 'In Progress', color: 'warning' },
    resolved: { label: 'Resolved', color: 'success' },
    closed: { label: 'Closed', color: 'muted' },
};

// The wording an operator reads for a backend value.
//
// A raw code that reaches the screen - ACKNOWLEDGED, all_clear, personnel -
// tells the operator nothing. Every one of these maps exists so the screens
// can name the value instead of printing it.

/** SOS request states, in the order an operator meets them. */
export const SOS_STATUS_CONFIG = {
    active: 'New',
    acknowledged: 'Acknowledged',
    responding: 'Responding',
    dispatched: 'Dispatched',
    cancelled: 'Cancelled',
    resolved: 'Resolved',
};
export const sosStatusLabel = (status) =>
    SOS_STATUS_CONFIG[String(status || '').toLowerCase()] || 'Unknown';

/** Account roles. */
export const ROLE_CONFIG = {
    admin: 'Administrator',
    personnel: 'Personnel',
};
export const roleLabel = (role) =>
    ROLE_CONFIG[String(role || '').toLowerCase()] || 'Personnel';

/** Account states. */
export const ACCOUNT_STATUS_CONFIG = {
    active: 'Active',
    deactivated: 'Deactivated',
};
export const accountStatusLabel = (status) =>
    ACCOUNT_STATUS_CONFIG[String(status || '').toLowerCase()] || 'Active';

/** Report ranges, in words rather than as duration codes. */
export const RANGE_CONFIG = {
    '24h': 'Last 24 hours',
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
};
export const rangeLabel = (range) => RANGE_CONFIG[range] || range;

/** The timezone the reports are counted in, by name. */
export const TIMEZONE_LABEL = 'Philippine Standard Time';

// Navigation items grouped by category
// Each item can optionally have a requiredPermission field
// If specified, the menu item will only show for users with that permission
// If not specified, the item is visible to all authenticated users
export const NAV_ITEMS = [
  {
    category: "COMMAND",
    items: [
      { path: "/dashboard", label: "Overview", icon: "LayoutDashboard" },
      { path: "/sos", label: "SOS Screen", icon: "Radio", requiredPermission: "manage_sos" },
      { path: "/incidents", label: "Incidents", icon: "AlertTriangle", requiredPermission: "view_incidents" },
      {
        path: "/broadcasts",
        label: "Broadcasts",
        icon: "Megaphone",
        requiredPermission: "view_broadcasts",
      },
    ],
  },
  {
    category: "ANALYSIS",
    items: [
      { path: "/map", label: "Map View", icon: "Map", requiredPermissions: ["manage_sos", "view_incidents"] },
      { path: "/reports", label: "Reports", icon: "FileText", requiredPermission: "manage_reports" },

      // Admin-only: Manage users
      {
        path: "/personnel",
        label: "Manage Users",
        icon: "Users",
        requiredPermission: "manage_users",
      },
    ],
  },
];

// Pagination defaults
export const PAGINATION = {
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
};
