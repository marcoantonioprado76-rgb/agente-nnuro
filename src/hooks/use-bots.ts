'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Bot } from '@/types';

export function useBots() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchBots = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('bots')
      .select('*')
      .order('created_at', { ascending: false });
    setBots(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchBots();
  }, [fetchBots]);

  const createBot = async (name: string, description?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    const { data, error } = await supabase
      .from('bots')
      .insert({ name, description, tenant_id: profile.tenant_id })
      .select()
      .single();

    if (!error && data) {
      await fetchBots();
    }
    return data;
  };

  const deleteBot = async (id: string) => {
    const { error } = await supabase.from('bots').delete().eq('id', id);
    if (!error) await fetchBots();
    return !error;
  };

  const toggleBot = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('bots')
      .update({ is_active: isActive })
      .eq('id', id);
    if (!error) await fetchBots();
    return !error;
  };

  return { bots, loading, fetchBots, createBot, deleteBot, toggleBot };
}
