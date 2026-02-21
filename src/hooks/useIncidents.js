import { useState, useCallback } from 'react';

// Mock data for demonstration
const mockIncidents = [
    {
        id: '1',
        title: 'Medical Emergency - Cardiac Arrest',
        description: 'Elderly male experiencing chest pain and difficulty breathing',
        category: 'medical_emergency',
        priority: 'critical',
        status: 'dispatched',
        location: { latitude: 14.5995, longitude: 120.9842, address: '123 Main St, Manila' },
        createdAt: new Date(Date.now() - 1000 * 60 * 15),
        updatedAt: new Date(Date.now() - 1000 * 60 * 5),
    },
    {
        id: '2',
        title: 'Traffic Accident - Multi-vehicle',
        description: 'Three-car collision on EDSA northbound',
        category: 'traffic_accident',
        priority: 'high',
        status: 'in_progress',
        location: { latitude: 14.5547, longitude: 121.0244, address: 'EDSA cor. Ortigas Ave' },
        createdAt: new Date(Date.now() - 1000 * 60 * 30),
        updatedAt: new Date(Date.now() - 1000 * 60 * 10),
    },
    {
        id: '3',
        title: 'Fire Report - Residential',
        description: 'Smoke coming from apartment building, 5th floor',
        category: 'fire',
        priority: 'critical',
        status: 'pending',
        location: { latitude: 14.6091, longitude: 120.9799, address: 'Sampaloc, Manila' },
        createdAt: new Date(Date.now() - 1000 * 60 * 5),
        updatedAt: new Date(Date.now() - 1000 * 60 * 5),
    },
];

export function useIncidents() {
    const [incidents, setIncidents] = useState(mockIncidents);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchIncidents = useCallback(async (page = 1, pageSize = 20) => {
        setIsLoading(true);
        setError(null);

        try {
            // TODO: Replace with actual API call to PostgreSQL backend
            await new Promise(resolve => setTimeout(resolve, 500));

            return {
                data: incidents,
                total: incidents.length,
                page,
                pageSize,
                totalPages: Math.ceil(incidents.length / pageSize),
            };
        } catch (err) {
            setError('Failed to fetch incidents');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [incidents]);

    const createIncident = useCallback(async (incident) => {
        setIsLoading(true);
        try {
            // TODO: Replace with actual API call
            const newIncident = {
                ...incident,
                id: Date.now().toString(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            setIncidents(prev => [newIncident, ...prev]);
            return newIncident;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateIncident = useCallback(async (id, updates) => {
        setIsLoading(true);
        try {
            // TODO: Replace with actual API call
            setIncidents(prev =>
                prev.map(inc =>
                    inc.id === id ? { ...inc, ...updates, updatedAt: new Date() } : inc
                )
            );
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        incidents,
        isLoading,
        error,
        fetchIncidents,
        createIncident,
        updateIncident,
    };
}
