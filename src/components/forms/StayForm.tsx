import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { staySchema } from '@/domain/schemas';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

type StayFormValues = z.infer<typeof staySchema>;

interface StayFormProps {
  initialData?: Partial<StayFormValues>;
  customers: { id: string; name: string }[];
  rooms: { id: string; roomNumber: string; roomTypeId: string; name?: string }[];
  onSubmit: (data: StayFormValues) => void;
  isLoading?: boolean;
}

export function StayForm({ initialData, customers, rooms, onSubmit, isLoading }: StayFormProps) {
  const form = useForm<StayFormValues>({
    resolver: zodResolver(staySchema),
    defaultValues: {
      customerId: '',
      guests: [{ name: '', phone: '', identityDocumentType: '', identityDocumentNumber: '' }],
      adults: 1,
      children: 0,
      checkInDate: new Date().toISOString().split('T')[0],
      expectedCheckOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      status: 'In-House',
      roomAssignments: [{
        roomId: '',
        roomTypeId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        nightlyRate: 0,
        mealPlanRate: 0,
        extraBedRate: 0
      }],
      source: 'Walk-In',
      ...initialData,
    },
  });

  const { fields: guestFields, append: appendGuest, remove: removeGuest } = useFieldArray({
    control: form.control,
    name: 'guests',
  });

  const { fields: roomFields, append: appendRoom, remove: removeRoom } = useFieldArray({
    control: form.control,
    name: 'roomAssignments',
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Core Booking Info */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary Customer / Billed To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Reserved">Reserved</SelectItem>
                      <SelectItem value="In-House">Check-In (In-House)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="checkInDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Check-in Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expectedCheckOutDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Check-out Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="adults"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Adults</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 1)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="children"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Children</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Room Assignments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Room Assignments</CardTitle>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => appendRoom({
                roomId: '', roomTypeId: '', 
                startDate: form.getValues('checkInDate'), 
                endDate: form.getValues('expectedCheckOutDate'), 
                nightlyRate: 0, mealPlanRate: 0, extraBedRate: 0
              })}
            >
              <Plus className="h-4 w-4 mr-2"/> Add Room
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {roomFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-md relative grid grid-cols-1 md:grid-cols-3 gap-4">
                {index > 0 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 text-destructive"
                    onClick={() => removeRoom(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                
                <FormField
                  control={form.control}
                  name={`roomAssignments.${index}.roomId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          field.onChange(val);
                          const room = rooms.find(r => r.id === val);
                          if(room) {
                            form.setValue(`roomAssignments.${index}.roomTypeId`, room.roomTypeId);
                          }
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Room" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rooms.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.roomNumber} {r.name ? `(${r.name})` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`roomAssignments.${index}.nightlyRate`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nightly Rate (Paise)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name={`roomAssignments.${index}.mealPlanRate`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Plan Rate (Paise)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Guests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Guests</CardTitle>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => appendGuest({ name: '', phone: '', identityDocumentType: '', identityDocumentNumber: '' })}
            >
              <Plus className="h-4 w-4 mr-2"/> Add Guest
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {guestFields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-md relative grid grid-cols-1 md:grid-cols-4 gap-4">
                {index > 0 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 text-destructive"
                    onClick={() => removeGuest(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                
                <FormField
                  control={form.control}
                  name={`guests.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Guest Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`guests.${index}.phone`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`guests.${index}.identityDocumentType`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="e.g. Aadhaar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Aadhaar">Aadhaar</SelectItem>
                          <SelectItem value="Passport">Passport</SelectItem>
                          <SelectItem value="Driving License">Driving License</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`guests.${index}.identityDocumentNumber`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Number</FormLabel>
                      <FormControl>
                        <Input placeholder="ID No." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Processing...' : 'Complete Check-In'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
