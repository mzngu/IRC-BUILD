import { Types } from 'mongoose';

export interface Message {
  content: string;
  room?: string;
  sender: {
    username: string;
    _id: string;
  };
  createdAt: Date;
  recipient?: string;
}