import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  recipient?: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ default: false })
  edited: boolean;

  @Prop({ required: true })
  room: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);