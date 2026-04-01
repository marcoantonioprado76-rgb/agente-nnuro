'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

const PROFILE_UPDATED_EVENT = 'profile-updated';

export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    // Listen for profile updates from any component
    const handleProfileUpdate = () => {
      fetchProfile();
    };
    window.addEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(PROFILE_UPDATED_EVENT, handleProfileUpdate);
    };
  }, [supabase, fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const refreshProfile = useCallback(() => {
    // Dispatch event so ALL useAuth instances re-fetch
    window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT));
    return fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, signOut, isAdmin: profile?.role === 'admin', refreshProfile };
}
