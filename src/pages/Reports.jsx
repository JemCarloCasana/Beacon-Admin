import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, BarChart3 } from 'lucide-react';

const reportTypes = [
    {
        title: 'Daily Incident Summary',
        description: 'Overview of all incidents reported in the last 24 hours',
        icon: FileText,
        lastGenerated: '2 hours ago',
    },
    {
        title: 'Weekly Response Analysis',
        description: 'Response times and resolution rates for the past week',
        icon: BarChart3,
        lastGenerated: '1 day ago',
    },
    {
        title: 'Monthly Safety Report',
        description: 'Comprehensive monthly report with trends and insights',
        icon: Calendar,
        lastGenerated: '5 days ago',
    },
];

export default function Reports() {
    return (
        <DashboardLayout
            title="Reports"
            subtitle="Generate and export operational reports"
        >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {reportTypes.map((report) => {
                    const Icon = report.icon;
                    return (
                        <Card key={report.title}>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">{report.title}</CardTitle>
                                        <CardDescription className="text-xs">
                                            Last generated: {report.lastGenerated}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="mb-4 text-sm text-muted-foreground">
                                    {report.description}
                                </p>
                                <div className="flex gap-2">
                                    <Button size="sm" className="flex-1">
                                        Generate
                                    </Button>
                                    <Button size="sm" variant="outline">
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Placeholder for charts */}
            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Analytics Dashboard</CardTitle>
                    <CardDescription>
                        Visual analytics and trend charts will be displayed here
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex h-[300px] items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <BarChart3 className="mx-auto mb-2 h-12 w-12 opacity-50" />
                        <p>Charts powered by Recharts</p>
                        <p className="text-sm">Coming soon...</p>
                    </div>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
