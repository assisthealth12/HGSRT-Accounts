import React, { useMemo, useState } from 'react';
import { useRooms } from '@/hooks/useRooms';
import { useRoomTypes } from '@/hooks/useRoomTypes';
import { useActiveBookingsAround } from '@/hooks/useBookings';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { Hotel, User, BedDouble } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function RoomsPage() {
  const [date, setDate] = useState(todayISO());
  const { data: rooms = [], isLoading: isLoadingRooms } = useRooms();
  const { data: roomTypes = [], isLoading: isLoadingTypes } = useRoomTypes();
  const { data: bookings = [], isLoading: isLoadingBookings } = useActiveBookingsAround(date);

  const isLoading = isLoadingRooms || isLoadingTypes || isLoadingBookings;

  const roomTypeName = (id: string) => roomTypes.find(t => t.id === id)?.name || id;

  const roomsWithStatus = useMemo(() => {
    // A room is occupied if there's a booking where date falls between checkIn and checkOut (exclusive of checkOut for overnight stays).
    // If date == checkOut, the guest is leaving that day, so the room is available for the next check-in.
    return rooms.map(room => {
      const activeBooking = bookings.find(b =>
        b.roomIds?.includes(room.id) && date >= b.checkIn && date < b.checkOut
      );
      return {
        ...room,
        isOccupied: !!activeBooking,
        guestName: activeBooking?.guestName,
        checkOut: activeBooking?.checkOut,
      };
    }).sort((a, b) => {
      // Sort by floor, then by room number (as strings or ints if possible)
      const fCmp = (a.floor || '').localeCompare(b.floor || '');
      if (fCmp !== 0) return fCmp;
      return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
    });
  }, [rooms, bookings, date]);

  const totalOccupied = roomsWithStatus.filter(r => r.isOccupied).length;
  const totalAvailable = roomsWithStatus.length - totalOccupied;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          icon={Hotel}
          title="Live Room Status"
          description="Real-time view of room occupancy and availability."
        />
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-end gap-6">
          <div>
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Status Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48 text-lg rounded-xl h-11" />
          </div>
          <div className="flex gap-4 pb-1">
            <div className="text-center px-4 border-r border-gray-100">
              <div className="text-2xl font-bold text-gray-800">{totalAvailable}</div>
              <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mt-1">Available</div>
            </div>
            <div className="text-center px-2">
              <div className="text-2xl font-bold text-gray-800">{totalOccupied}</div>
              <div className="text-xs font-semibold text-orange-600 uppercase tracking-wider mt-1">Occupied</div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState label="Loading live status..." />
      ) : rooms.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <BedDouble className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No rooms configured</h3>
          <p className="text-gray-500 mt-2">Go to Admin Settings to add your physical rooms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {roomsWithStatus.map(room => (
            <div 
              key={room.id}
              className={cn(
                "rounded-2xl overflow-hidden shadow-sm border transition-transform hover:-translate-y-1 bg-white",
                room.isOccupied ? "border-orange-200" : "border-emerald-200"
              )}
            >
              <div className={cn(
                "h-2 w-full",
                room.isOccupied ? "bg-orange-400" : "bg-emerald-400"
              )} />
              
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                      {room.roomNumber}
                    </h3>
                    <p className="text-sm font-semibold text-gray-500 mt-1">
                      {roomTypeName(room.roomTypeId)}
                    </p>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                    room.isOccupied ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
                  )}>
                    {room.isOccupied ? 'Occupied' : 'Available'}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50 h-16 flex items-center">
                  {room.isOccupied ? (
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{room.guestName}</p>
                        <p className="text-xs text-gray-500">Out: {room.checkOut}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-emerald-600">Ready for booking</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
