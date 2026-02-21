import { MapPin, Send, Phone, MoreHorizontal, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function IncidentDetailPanel({ incident }) {
    if (!incident) return (
        <div className="flex flex-1 items-center justify-center p-8 text-slate-400 bg-white border-l">
            Select an incident to view details
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-white border-l overflow-y-auto">
            {/* Header */}
            <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                        Incident #{incident.id || '101'}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{incident.title || 'Medical Emergency'}</h2>
                <div className="flex gap-2 mb-6">
                    <Badge className="bg-red-100 text-red-600 hover:bg-red-100 border-none font-bold uppercase text-[10px] px-2 py-0.5 rounded">
                        {incident.priority || 'CRITICAL'}
                    </Badge>
                    <Badge variant="outline" className="text-slate-500 border-slate-200 font-medium text-[10px] px-2 py-0.5 rounded">
                        {incident.categoryLabel || 'Cardiac Arrest'}
                    </Badge>
                </div>

                <div className="flex gap-2">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 gap-2">
                        <Send className="h-4 w-4" />
                        Dispatch Unit
                    </Button>
                    <Button variant="outline" className="flex-1 border-slate-200 text-slate-600 font-bold h-10 gap-2">
                        <Phone className="h-4 w-4" />
                        Contact Reporter
                    </Button>
                </div>
            </div>

            <Separator className="bg-slate-100" />

            {/* Content */}
            <div className="p-6 space-y-8">
                {/* Location & Context */}
                <div>
                    <h3 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4">Location & Context</h3>
                    <div className="flex gap-3 mb-4">
                        <div className="bg-slate-100 p-2 rounded h-fit">
                            <MapPin className="h-4 w-4 text-slate-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">{incident.address || '123 Main St, Manila'}</p>
                            <p className="text-[11px] text-slate-500">Cross St: Rizal Ave • Dist: 1.2km from HQ</p>
                        </div>
                    </div>
                    {/* Map Preview Placeholder */}
                    <div className="aspect-video w-full bg-slate-100 rounded-lg border border-slate-200 flex flex-col items-center justify-center text-slate-400">
                        <MapPin className="h-6 w-6 mb-2 opacity-20" />
                        <span className="text-xs font-medium opacity-50">Map Preview (Leaflet/Mapbox)</span>
                    </div>
                </div>

                {/* Operational Details */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h3 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">Operational Details</h3>
                        <div>
                            <p className="text-[10px] font-medium text-slate-400 mb-1">Assigned Unit</p>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-xs font-bold text-slate-900">{incident.assignedUnit || 'Amb-01'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col justify-end">
                        <p className="text-[10px] font-medium text-slate-400 mb-1">Reported By</p>
                        <p className="text-xs font-bold text-slate-900">{incident.reportedBy || 'John Doe'}</p>
                    </div>
                </div>

                {/* Dispatcher Notes */}
                <div>
                    <h3 className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4">Dispatcher Notes</h3>
                    <div className="bg-amber-50 border border-amber-100 rounded p-4 mb-4">
                        <p className="text-xs text-amber-900 leading-relaxed font-medium">
                            {incident.notes || 'Elderly male, 72yo, history of heart failure. CPR in progress by bystander.'}
                        </p>
                    </div>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Add a note..."
                            className="w-full text-xs py-2 border-b border-slate-200 focus:outline-none focus:border-blue-500 bg-transparent text-slate-600"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
