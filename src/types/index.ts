import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];

export type Profile = Tables["profiles"]["Row"];
export type ProfileInsert = Tables["profiles"]["Insert"];
export type ProfileUpdate = Tables["profiles"]["Update"];

export type JamSession = Tables["jam_sessions"]["Row"];
export type JamSessionInsert = Tables["jam_sessions"]["Insert"];
export type JamSessionUpdate = Tables["jam_sessions"]["Update"];

export type JamParticipant = Tables["jam_participants"]["Row"];
export type JamMessage = Tables["jam_messages"]["Row"];
export type JamSlot = Tables["jam_slots"]["Row"];
export type JamInterested = Tables["jam_interested"]["Row"];

export type Concert = Tables["concerts"]["Row"];
export type ConcertInsert = Tables["concerts"]["Insert"];
export type ConcertUpdate = Tables["concerts"]["Update"];
export type ConcertInterested = Tables["concert_interested"]["Row"];

export type Group = Tables["groups"]["Row"];
export type GroupInsert = Tables["groups"]["Insert"];
export type GroupUpdate = Tables["groups"]["Update"];
export type GroupMember = Tables["group_members"]["Row"];

export type Conversation = Tables["conversations"]["Row"];
export type ConversationParticipant = Tables["conversation_participants"]["Row"];
export type Message = Tables["messages"]["Row"];

export type Notification = Tables["notifications"]["Row"];

export type Service = Tables["services"]["Row"];
export type ServiceInsert = Tables["services"]["Insert"];
export type ServiceUpdate = Tables["services"]["Update"];

export type { Database } from "./database.types";
