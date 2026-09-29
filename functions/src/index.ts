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
export * as sysadmin from './admin';
