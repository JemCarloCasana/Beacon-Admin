import { useState, useEffect, useCallback } from 'react';

// Mock SOS alerts - will be replaced with Firebase Realtime Database
const mockSOSAlerts = [
    {
        id: 'sos-1',
        userId: 'user-1',
        userName: 'Maria Santos',
        userPhone: '+63 917 123 4567',
        location: { latitude: 14.5995, longitude: 120.9842, address: 'Ermita, Manila' },
        status: 'active',
        message: 'Need help immediately!',
        timestamp: new Date(Date.now() - 1000 * 60 * 2),
    },
    {
        id: 'sos-2',
        userId: 'user-2',
        userName: 'Juan dela Cruz',
        userPhone: '+63 918 765 4321',
        location: { latitude: 14.5547, longitude: 121.0244, address: 'Ortigas Center' },
        status: 'acknowledged',
        timestamp: new Date(Date.now() - 1000 * 60 * 8),
        acknowledgedBy: 'admin-1',
        acknowledgedAt: new Date(Date.now() - 1000 * 60 * 5),
    },
];

export function useSOS() {
    const [sosAlerts, setSOSAlerts] = useState(mockSOSAlerts);
    const [isConnected, setIsConnected] = useState(true);

    // TODO: Replace with Firebase Realtime Database subscription
    useEffect(() => {
        // Simulating real-time connection
        const connectionCheck = setInterval(() => {
            setIsConnected(true);
        }, 5000);

        return () => clearInterval(connectionCheck);
    }, []);

    const acknowledgeAlert = useCallback(async (alertId, userId) => {
        // TODO: Update in Firebase
        setSOSAlerts(prev =>
            prev.map(alert =>
                alert.id === alertId
                    ? {
                        ...alert,
                        status: 'acknowledged',
                        acknowledgedBy: userId,
                        acknowledgedAt: new Date(),
                    }
                    : alert
            )
        );
    }, []);

    const resolveAlert = useCallback(async (alertId) => {
        // TODO: Update in Firebase and create incident in PostgreSQL
        setSOSAlerts(prev =>
            prev.map(alert =>
                alert.id === alertId ? { ...alert, status: 'resolved' } : alert
            )
        );
    }, []);

    const activeAlerts = sosAlerts.filter(a => a.status === 'active');
    const acknowledgedAlerts = sosAlerts.filter(a => a.status === 'acknowledged');

    return {
        sosAlerts,
        activeAlerts,
        acknowledgedAlerts,
        isConnected,
        acknowledgeAlert,
        resolveAlert,
    };
}
