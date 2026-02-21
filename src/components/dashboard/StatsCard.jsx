import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const variantStyles = {
    default: 'bg-card',
    success: 'bg-success/10 border-success/20',
    warning: 'bg-warning/10 border-warning/20',
    destructive: 'bg-destructive/10 border-destructive/20',
    info: 'bg-info/10 border-info/20',
};

const iconVariantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    destructive: 'bg-destructive/20 text-destructive',
    info: 'bg-info/20 text-info',
};

export function StatsCard({
    title,
    value,
    description,
    icon: Icon,
    trend,
    variant = 'default',
    className,
}) {
    return (
        <Card className={cn(variantStyles[variant], className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                {Icon && (
                    <div className={cn('rounded-lg p-2', iconVariantStyles[variant])}>
                        <Icon className="h-4 w-4" />
                    </div>
                )}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {(description || trend) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                        {trend && (
                            <span
                                className={cn(
                                    'mr-1 font-medium',
                                    trend.isPositive ? 'text-success' : 'text-destructive'
                                )}
                            >
                                {trend.isPositive ? '+' : ''}{trend.value}%
                            </span>
                        )}
                        {description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
