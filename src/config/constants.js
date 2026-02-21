// Application constants and configuration

export const APP_NAME = 'Beacon';
export const APP_DESCRIPTION = 'Public Safety Admin Dashboard';

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

// Navigation items grouped by category
// Each item can optionally have a requiredPermission field
// If specified, the menu item will only show for users with that permission
// If not specified, the item is visible to all authenticated users
export const NAV_ITEMS = [
  {
    category: "COMMAND",
    items: [
      { path: "/dashboard", label: "Overview", icon: "LayoutDashboard" },
      { path: "/sos", label: "Live Operations", icon: "Radio" },
      { path: "/incidents", label: "Incidents", icon: "AlertTriangle" },
    ],
  },
  {
    category: "ANALYSIS",
    items: [
      { path: "/map", label: "Map View", icon: "Map" },
      { path: "/reports", label: "Reports", icon: "FileText" },

      // ✅ Admin-only: Personnel management
      {
        path: "/personnel",
        label: "Personnel",
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
