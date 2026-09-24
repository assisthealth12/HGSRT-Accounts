import { setGlobalOptions } from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for 2nd Gen Functions
setGlobalOptions({
  region: 'asia-south1',
  maxInstances: 10,
});

// Export domains
export * as financial from './financial';
export * as stays from './stays';
export * as restaurant from './restaurant';
export * as expenses from './expenses';
export * as payroll from './payroll';
export * as reports from './reports';
export * as sysadmin from './admin';
// export * from './pdf';
// export * from './imports';
