import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Sheet, SheetContent } from '@/components/ui/sheet';

/**
 * DashboardLayout Component
 *
 * Main layout wrapper for dashboard pages.
 *
 * @param {Object} title - Page title, rendered as the page's only h1
 * @param {Object} subtitle - Optional supporting line under the title
 * @param {Object} children - Child components to render
 */
export function DashboardLayout({ title, subtitle, children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
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
                    title={title}
                    onMenuClick={() => setSidebarOpen(true)}
                />
                {title ? (
                    <div className="flex items-center justify-between gap-4 border-b bg-card px-4 py-3 md:px-6">
                        <div>
                            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                            {subtitle ? (
                                <p className="text-sm text-muted-foreground">{subtitle}</p>
                            ) : null}
                        </div>
                    </div>
                ) : null}
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
