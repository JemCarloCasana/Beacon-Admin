import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Sheet, SheetContent } from '@/components/ui/sheet';

/**
 * DashboardLayout Component
 * 
 * Main layout wrapper for dashboard pages.
 * 
 * @param {Object} children - Child components to render
 */
export function DashboardLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <Sidebar />
            </div>

            {/* Mobile Sidebar */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetContent side="left" className="w-64 p-0">
                    <Sidebar />
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header
                    onMenuClick={() => setSidebarOpen(true)}
                />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
