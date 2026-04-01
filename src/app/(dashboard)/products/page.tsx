'use client';

import { useEffect } from 'react';

// Products are now managed within each bot's configuration.
// Redirect users to the bots page.
export default function ProductsRedirectPage() {
  useEffect(() => {
    window.location.href = '/bots';
  }, []);

  return null;
}
