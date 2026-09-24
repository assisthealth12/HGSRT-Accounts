import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { propertySchema } from '@/domain/schemas';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type PropertyFormValues = z.infer<typeof propertySchema>;

interface PropertySettingsFormProps {
  initialData?: Partial<PropertyFormValues>;
  onSubmit: (data: PropertyFormValues) => void;
  isLoading?: boolean;
}

export function PropertySettingsForm({ initialData, onSubmit, isLoading }: PropertySettingsFormProps) {
  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: 'Hotel GSR',
      address: 'Main Street',
      phone: '9876543210',
      email: 'contact@hotelgsr.com',
      gstin: '27AADCB2230M1Z2',
      settings: {
        financialYearStartMonth: 4,
        invoicePrefix: 'INV',
        receiptPrefix: 'RCPT',
        defaultDueDays: 7,
        businessDate: '2026-09-24',
        nightAuditTime: '02:00',
        defaultCheckInTime: '12:00',
        defaultCheckOutTime: '11:00',
        timezone: 'Asia/Kolkata',
      },
      active: true,
      ...initialData,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        <Card>
          <CardHeader>
            <CardTitle>Hotel Information</CardTitle>
            <CardDescription>Basic details about your property.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="gstin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GSTIN</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="col-span-1 md:col-span-2">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operations & Configuration</CardTitle>
            <CardDescription>Configure business dates and prefixes.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="settings.businessDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Business Date</FormLabel>
                  <FormDescription>The operational date for reports and night audit.</FormDescription>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.nightAuditTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Night Audit Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.invoicePrefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invoice Prefix</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.receiptPrefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt Prefix</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.defaultCheckInTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Check-in Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="settings.defaultCheckOutTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default Check-out Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
