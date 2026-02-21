import { Bell, Search, MapPin, Clock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

export function Header({ onMenuClick }) {
    const navigate = useNavigate();
    const { logout } = useAuth();

    const handleLogout = async () => {
        await logout();
        localStorage.removeItem('admin_token');
        // admin_me is never stored in localStorage, only token
        navigate('/');
    };

    return (
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
            {/* Left: System Status & Info */}
            <div className="flex items-center gap-8">
                {/* System Status */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <div className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </div>
                    SYSTEM ONLINE
                </div>

                <div className="h-4 w-[1px] bg-slate-200" />

                {/* Location */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    Manila, NCR
                </div>

                <div className="h-4 w-[1px] bg-slate-200" />

                {/* Response Time */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    Avg Response: <span className="font-bold text-slate-900">4m 12s</span>
                </div>
            </div>

            {/* Right: Search & Notifications */}
            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Search logs, units..."
                        className="w-72 pl-9 bg-slate-100 border-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                </div>

                {/* Notifications */}
                <div className="relative">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border-2 border-white"></span>
                    </Button>
                </div>

                {/* Logout Button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogout}
                    className="ml-2 flex items-center gap-2"
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </Button>
            </div>
        </header>
    );
}

