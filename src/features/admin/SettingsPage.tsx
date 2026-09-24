import React from 'react';
import { PropertySettingsForm } from '@/components/forms/PropertySettingsForm';

export function SettingsPage() {
  const handleSubmit = (data: any) => {
    console.log('Settings updated:', data);
    // TODO: Wire up mutation to update property settings in Firestore
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Property Settings</h2>
        <p className="text-muted-foreground">
          Manage your hotel's general information and operational configuration.
        </p>
      </div>

      <PropertySettingsForm onSubmit={handleSubmit} />
    </div>
  );
}
