'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Profile } from '@/types';

const PROFILE_UPDATED_EVENT = 'profile-updated';

export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading]  = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) { setProfile(null); return; }
      setProfile(await res.json());
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    const handler = () => fetchProfile();
    window.addEventListener(PROFILE_UPDATED_EVENT, handler);
    return () => window.removeEventListener(PROFILE_UPDATED_EVENT, handler);
  }, [fetchProfile]);

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  const refreshProfile = useCallback(() => {
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
    return fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    signOut,
    isAdmin: profile?.role === 'admin',
    refreshProfile,
  };
}
