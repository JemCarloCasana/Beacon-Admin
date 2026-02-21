import { useState, useEffect } from 'react';

const mockStats = {
    activeIncidents: 12,
    activeSOS: 3,
    resolvedToday: 28,
    averageResponseTime: 4.2,
    incidentsByCategory: {
        medical_emergency: 5,
        fire: 2,
        crime: 3,
        traffic_accident: 8,
        natural_disaster: 0,
        public_disturbance: 4,
        other: 2,
    },
    incidentsByStatus: {
        pending: 4,
        dispatched: 3,
        in_progress: 5,
        resolved: 28,
        closed: 156,
    },
};

export function useDashboardStats() {
    const [stats, setStats] = useState(mockStats);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // TODO: Fetch from API
        const timer = setTimeout(() => {
            setStats(mockStats);
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const refreshStats = async () => {
        setIsLoading(true);
        // TODO: Fetch fresh stats from API
        await new Promise(resolve => setTimeout(resolve, 500));
        setStats(mockStats);
        setIsLoading(false);
    };

    return { stats, isLoading, refreshStats };
}
