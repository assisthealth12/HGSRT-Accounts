import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BedDouble, UtensilsCrossed, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-muted-foreground">Here's what's happening at Hotel GSR today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/room-board')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Front Desk</CardTitle>
            <BedDouble className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12 Arrivals</div>
            <p className="text-xs text-muted-foreground mt-1">4 Departures pending</p>
            <Button variant="link" className="px-0 mt-4 h-auto flex items-center">
              Go to Room Board <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/restaurant-pos')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Restaurant</CardTitle>
            <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4 Active Tables</div>
            <p className="text-xs text-muted-foreground mt-1">15 KOTs today</p>
            <Button variant="link" className="px-0 mt-4 h-auto flex items-center">
              Open POS <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-primary transition-colors cursor-pointer" onClick={() => navigate('/customers')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Guests</CardTitle>
            <Users className="w-5 h-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45 In-House</div>
            <p className="text-xs text-muted-foreground mt-1">2 VIPs present</p>
            <Button variant="link" className="px-0 mt-4 h-auto flex items-center">
              View Directory <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
