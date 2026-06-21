import { supabase } from '../../lib/supabase';
import type { CaseMember, Message } from '../../types/chat';

export type ChatErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'NETWORK';

export class ChatError extends Error {
  constructor(
    public code: ChatErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

interface MessageRow {
  id: string;
  report_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles: { display_name: string } | null;
}

interface CaseMemberRow {
  id: string;
  report_id: string;
  user_id: string;
  role: 'owner' | 'rescuer' | 'member';
  created_at: string;
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    reportId: row.report_id,
    senderId: row.sender_id,
    senderName: row.profiles?.display_name ?? 'Usuario',
    body: row.body,
    createdAt: row.created_at,
  };
}

function mapCaseMember(row: CaseMemberRow): CaseMember {
  return {
    id: row.id,
    reportId: row.report_id,
    userId: row.user_id,
    role: row.role,
    createdAt: row.created_at,
  };
}

function mapError(error: { code?: string; message: string }): ChatError {
  const msg = error.message;
  if (error.code === '42501' || msg.includes('RLS')) {
    return new ChatError('FORBIDDEN', 'Sin permiso para esta operación');
  }
  if (msg.includes('JWT') || msg.includes('not authenticated')) {
    return new ChatError('UNAUTHENTICATED', 'Debes iniciar sesión');
  }
  return new ChatError('NETWORK', msg);
}

export const chatService = {
  async getCaseMessages(reportId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*, profiles(display_name)')
      .eq('report_id', reportId)
      .order('created_at', { ascending: true });

    if (error) throw mapError(error);
    return (data as MessageRow[]).map(mapMessage);
  },

  async sendCaseMessage(reportId: string, body: string): Promise<Message> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new ChatError('UNAUTHENTICATED', 'Debes iniciar sesión');
    if (!body.trim()) throw new ChatError('VALIDATION', 'El mensaje no puede estar vacío');

    const { data, error } = await supabase
      .from('messages')
      .insert({ report_id: reportId, sender_id: user.id, body: body.trim() })
      .select('*, profiles(display_name)')
      .single();

    if (error) throw mapError(error);
    return mapMessage(data as MessageRow);
  },

  async joinCase(reportId: string): Promise<CaseMember> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new ChatError('UNAUTHENTICATED', 'Debes iniciar sesión');

    const { data, error } = await supabase
      .from('case_members')
      .insert({ report_id: reportId, user_id: user.id, role: 'member' })
      .select()
      .single();

    if (error) {
      // 23505 = unique_violation → ya es miembro, devolver el existente
      if (error.code === '23505') {
        const { data: existing, error: fetchError } = await supabase
          .from('case_members')
          .select()
          .eq('report_id', reportId)
          .eq('user_id', user.id)
          .single();
        if (fetchError) throw mapError(fetchError);
        return mapCaseMember(existing as CaseMemberRow);
      }
      throw mapError(error);
    }
    return mapCaseMember(data as CaseMemberRow);
  },

  async takeCase(reportId: string): Promise<CaseMember> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) throw new ChatError('UNAUTHENTICATED', 'Debes iniciar sesión');

    const { data, error } = await supabase
      .from('case_members')
      .insert({ report_id: reportId, user_id: user.id, role: 'rescuer' })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: existing, error: fetchError } = await supabase
          .from('case_members')
          .select()
          .eq('report_id', reportId)
          .eq('user_id', user.id)
          .single();
        if (fetchError) throw mapError(fetchError);
        return mapCaseMember(existing as CaseMemberRow);
      }
      throw mapError(error);
    }
    return mapCaseMember(data as CaseMemberRow);
  },

  async isMember(reportId: string): Promise<boolean> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('case_members')
      .select('id')
      .eq('report_id', reportId)
      .eq('user_id', user.id)
      .maybeSingle();

    return data != null;
  },

  subscribeToCaseMessages(
    reportId: string,
    callback: (message: Message) => void,
  ): () => void {
    const channel = supabase
      .channel(`messages-${reportId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `report_id=eq.${reportId}`,
        },
        (payload) => {
          const row = payload.new as Omit<MessageRow, 'profiles'>;
          void (async () => {
            let senderName = 'Usuario';
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('id', row.sender_id)
                .single();
              senderName = (profile?.display_name as string | null) ?? 'Usuario';
            } catch { /* usa nombre por defecto */ }
            callback({
              id: row.id,
              reportId: row.report_id,
              senderId: row.sender_id,
              senderName,
              body: row.body,
              createdAt: row.created_at,
            });
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};
