import { Siren, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ActiveSOSAlert({ alert, onDispatch, onAcknowledge, onClose }) {
    if (!alert) return null;

    return (
        <div className="flex items-center justify-between border-l-4 border-l-red-500 bg-red-50 p-4 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <Siren className="h-6 w-6" />
                </div>
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-red-600">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                        </span>
                        ACTIVE SOS • {alert.timestamp || '2m ago'}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 leading-tight">
                        {alert.name || 'Maria Santos'}
                    </h3>
                    <p className="text-xs font-semibold text-slate-500">
                        {typeof alert.location === 'object' ? alert.location.address : (alert.location || 'Ermita, Manila (Near Rizal Park)')}
                    </p>
                    <p className="mt-1 text-xs italic text-orange-600 font-medium tracking-tight">
                        "{alert.description || 'Need help immediately! Unresponsive male found on sidewalk.'}"
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    onClick={() => onDispatch(alert.id)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold h-9 px-6"
                >
                    Dispatch Unit
                </Button>
                <Button
                    variant="outline"
                    onClick={() => onAcknowledge(alert.id)}
                    className="border-red-200 text-red-600 hover:bg-red-50 h-9 font-bold"
                >
                    Acknowledge
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}
