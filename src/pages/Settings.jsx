import { DashboardLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Database, Flame, Bell, Shield, Key } from 'lucide-react';

export default function Settings() {
    return (
        <DashboardLayout
            title="Settings"
            subtitle="System configuration and integrations"
        >
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Firebase Configuration */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                                    <Flame className="h-5 w-5 text-warning" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Firebase</CardTitle>
                                    <CardDescription>Real-time SOS & Authentication</CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="border-success text-success">
                                Connected
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Project ID</Label>
                            <Input placeholder="beacon-safety-prod" disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Database URL</Label>
                            <Input placeholder="https://beacon-safety-prod.firebaseio.com" disabled />
                        </div>
                        <Button variant="outline" size="sm">
                            <Key className="mr-2 h-4 w-4" />
                            Update Credentials
                        </Button>
                    </CardContent>
                </Card>

                {/* PostgreSQL Configuration */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                                    <Database className="h-5 w-5 text-info" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">PostgreSQL</CardTitle>
                                    <CardDescription>Authoritative Records Database</CardDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="border-success text-success">
                                Connected
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Host</Label>
                            <Input placeholder="db.beacon-safety.com" disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Database</Label>
                            <Input placeholder="beacon_prod" disabled />
                        </div>
                        <Button variant="outline" size="sm">
                            <Key className="mr-2 h-4 w-4" />
                            Update Credentials
                        </Button>
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <Bell className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Notifications</CardTitle>
                                <CardDescription>Alert and notification preferences</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>SOS Sound Alert</Label>
                                <p className="text-sm text-muted-foreground">Play audio on new SOS</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Desktop Notifications</Label>
                                <p className="text-sm text-muted-foreground">Browser push notifications</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Email Alerts</Label>
                                <p className="text-sm text-muted-foreground">Critical incident emails</p>
                            </div>
                            <Switch />
                        </div>
                    </CardContent>
                </Card>

                {/* Security Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                                <Shield className="h-5 w-5 text-destructive" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Security</CardTitle>
                                <CardDescription>Access control and authentication</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Two-Factor Authentication</Label>
                                <p className="text-sm text-muted-foreground">Require 2FA for all users</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Separator />
                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Session Timeout</Label>
                                <p className="text-sm text-muted-foreground">Auto-logout after inactivity</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label>Timeout Duration (minutes)</Label>
                            <Input type="number" defaultValue="30" className="w-24" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
