export interface Message {
  id: string;
  reportId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
}

export interface CaseMember {
  id: string;
  reportId: string;
  userId: string;
  role: 'owner' | 'rescuer' | 'member';
  createdAt: string;
}
