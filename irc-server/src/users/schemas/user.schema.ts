import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: Types.ObjectId, auto: true }) 
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true, minlength: 3 })
  username: string;

  @Prop({ required: true, unique: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop()
  profilePicture?: string;

  @Prop()
  bio?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);