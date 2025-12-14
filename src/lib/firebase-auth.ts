'use client';

import { getAuth } from 'firebase/auth';
import { app } from './firebase'; // Import the initialized app

const auth = getAuth(app);

export { auth };
