import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BedDouble, UtensilsCrossed, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStays } from '@/hooks/useStays';
import { useActiveStays } from '@/hooks/useActiveStays';
import { useRestaurantTables } from '@/hooks/useRestaurantTables';
import { useKots } from '@/hooks/useKots';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardPage() {
  const navigate = useNavigate();

  const { data: stays = [] } = useStays();
  const { data: activeStays = [] } = useActiveStays();
  const { data: tables = [] } = useRestaurantTables();
  const { data: kots = [] } = useKots();

  const today = todayISO();
  const arrivals = stays.filter(s => s.checkInDate === today && s.status !== 'Cancelled').length;
  const departures = stays.filter(s => s.expectedCheckOutDate === today && s.status === 'In-House').length;

  const occupiedTables = tables.filter(t => t.status === 'Occupied').length;
  const kotsToday = kots.filter(k => new Date(k.createdAt).toISOString().slice(0, 10) === today).length;

  const inHouseCount = activeStays.filter(s => s.status === 'In-House').length;
  const reservedCount = activeStays.filter(s => s.status === 'Reserved').length;

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
            <div className="text-2xl font-bold">{arrivals} Arrivals</div>
            <p className="text-xs text-muted-foreground mt-1">{departures} Departures pending</p>
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
            <div className="text-2xl font-bold">{occupiedTables} Active Tables</div>
            <p className="text-xs text-muted-foreground mt-1">{kotsToday} KOTs today</p>
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
            <div className="text-2xl font-bold">{inHouseCount} In-House</div>
            <p className="text-xs text-muted-foreground mt-1">{reservedCount} Reserved</p>
            <Button variant="link" className="px-0 mt-4 h-auto flex items-center">
              View Directory <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
