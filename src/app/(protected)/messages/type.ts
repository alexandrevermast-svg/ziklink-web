// app/(protected)/messages/type.ts
export type ParticipantWithProfile = {
  user_id: string;
  profiles: MinimalProfile | null;
};

export type ConversationType = 'direct' | 'group';

export type GroupParticipant = {
  user_id: string;
  is_admin: boolean;
  has_left: boolean;
  joined_at: string;
  last_read_at: string | null;
  profiles: MinimalProfile | null;
};

export type Conversation = {
  id: string;
  title: string | null;
  type: ConversationType;
  created_at: string;
  updated_at: string;
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
};

export type Participant = {
  user_id: string;
  profiles: {
    username: string;
  } | null;
};

export type ConversationWithParticipants = {
  id: string;
  type: 'direct' | 'group';
  title: string | null;
  participants: Participant[];
};

export type MinimalProfile = {
  username: string;
};

export type MessageWithProfile = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: MinimalProfile; // ✅ Un seul objet (pas un tableau)
};