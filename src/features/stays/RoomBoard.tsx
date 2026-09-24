import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRooms } from '@/hooks/useRooms';
import { useActiveStays } from '@/hooks/useActiveStays';
import { useNavigate } from 'react-router-dom';

export function RoomBoard() {
  const { data: rooms = [], isLoading: isLoadingRooms } = useRooms();
  const { data: activeStays = [], isLoading: isLoadingStays } = useActiveStays();
  const navigate = useNavigate();

  // Group rooms by floor
  const floors = useMemo(() => {
    return Array.from(new Set(rooms.map(r => r.floor || 'Unassigned'))).sort();
  }, [rooms]);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-success text-success-foreground hover:bg-success/90';
      case 'Occupied': return 'bg-primary text-primary-foreground hover:bg-primary/90';
      case 'Reserved': return 'bg-warning text-warning-foreground hover:bg-warning/90';
      case 'Dirty': return 'bg-orange-500 text-white hover:bg-orange-600'; 
      case 'Maintenance': 
      case 'Blocked': return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
      default: return 'bg-muted text-muted-foreground hover:bg-muted/80';
    }
  };

  const getRoomGuest = (roomId: string) => {
    const stay = activeStays.find(s => 
      s.roomAssignments?.some((ra: any) => ra.roomId === roomId)
    );
    if (stay && stay.guests?.[0]) {
      return stay.guests[0].name;
    }
    return null;
  };

  if (isLoadingRooms || isLoadingStays) {
    return <div className="flex h-64 items-center justify-center">Loading Room Board...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Room Board</h2>
        <p className="text-muted-foreground">
          Real-time visual status of all physical rooms.
        </p>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <Badge variant="outline" className="bg-success text-success-foreground">Available</Badge>
        <Badge variant="outline" className="bg-primary text-primary-foreground">Occupied</Badge>
        <Badge variant="outline" className="bg-warning text-warning-foreground">Reserved</Badge>
        <Badge variant="outline" className="bg-orange-500 text-white">Dirty</Badge>
        <Badge variant="outline" className="bg-destructive text-destructive-foreground">Maintenance</Badge>
      </div>

      <div className="space-y-8">
        {floors.map(floor => (
          <div key={floor}>
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">{floor}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {rooms.filter(r => (r.floor || 'Unassigned') === floor).map(room => {
                const guestName = getRoomGuest(room.id);
                // If it's occupied or reserved, we might want to click it to go to the folio
                const activeStay = activeStays.find(s => s.roomAssignments?.some((ra: any) => ra.roomId === room.id));
                
                return (
                  <Card 
                    key={room.id} 
                    className={`cursor-pointer transition-colors border-2 border-transparent ${getStatusColor(room.status)}`}
                    onClick={() => {
                       if (activeStay) {
                         navigate(`/stays/${activeStay.id}`);
                       } else {
                         // Open Check-in Modal pre-filled with this room
                       }
                    }}
                  >
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-2xl text-center">{room.roomNumber}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-center">
                      <div className="text-sm font-medium opacity-90">{room.status}</div>
                      {guestName && (
                        <div className="text-xs mt-2 truncate font-semibold">
                          {guestName}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No rooms have been configured yet. Please add rooms in the settings.
          </div>
        )}
      </div>
    </div>
  );
}
