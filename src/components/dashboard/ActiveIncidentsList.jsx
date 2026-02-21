import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ActiveIncidentsList({ incidents, selectedId, onSelect }) {
    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-6 flex items-center justify-between border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">Active Incidents</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-slate-500 border-slate-200 px-3">Filter</Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-blue-600 border-blue-100 bg-blue-50/50 px-3">Sort by Priority</Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {incidents.map((incident) => {
                    const isActive = selectedId === incident.id;
                    return (
                        <div
                            key={incident.id}
                            className={cn(
                                "p-6 cursor-pointer transition-colors border-b border-slate-50 relative",
                                isActive ? "bg-blue-50/30" : "hover:bg-slate-50/50"
                            )}
                            onClick={() => onSelect(incident)}
                        >
                            {isActive && <div className="absolute left-0 top-0 h-full w-[3px] bg-blue-600" />}

                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-tighter">
                                        #{incident.id}
                                    </span>
                                    <h3 className={cn(
                                        "text-sm font-bold",
                                        isActive ? "text-blue-600" : "text-slate-900"
                                    )}>
                                        {incident.title}
                                    </h3>
                                </div>
                                <span className="text-[10px] font-medium text-slate-400">
                                    {incident.timeAgo || '15m ago'}
                                </span>
                            </div>

                            <p className="text-xs text-slate-600 mb-2 font-medium">
                                {incident.categoryLabel || 'Cardiac Arrest'}
                            </p>

                            <div className="flex justify-between items-end">
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                                    <MapPin className="h-3 w-3" />
                                    {incident.address || '123 Main St, Manila'}
                                </div>
                                <div className="flex gap-1.5">
                                    <Badge className={cn(
                                        "px-2 py-0.5 rounded uppercase text-[9px] font-bold border-none",
                                        incident.priority === 'critical' ? "bg-red-50 text-red-500" :
                                            incident.priority === 'high' ? "bg-orange-50 text-orange-500" :
                                                "bg-slate-50 text-slate-500"
                                    )}>
                                        {incident.priority || 'CRITICAL'}
                                    </Badge>
                                    <div className={cn(
                                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold",
                                        incident.status === 'dispatched' ? "bg-blue-50 text-blue-600" :
                                            incident.status === 'on_scene' ? "bg-purple-50 text-purple-600" :
                                                incident.status === 'pending' ? "bg-amber-50 text-amber-600" :
                                                    "bg-emerald-50 text-emerald-600"
                                    )}>
                                        <div className={cn(
                                            "h-1.5 w-1.5 rounded-full",
                                            incident.status === 'dispatched' ? "bg-blue-600" :
                                                incident.status === 'on_scene' ? "bg-purple-600" :
                                                    incident.status === 'pending' ? "bg-amber-600" :
                                                        "bg-emerald-600"
                                        )} />
                                        {incident.statusLabel || 'Dispatched'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
