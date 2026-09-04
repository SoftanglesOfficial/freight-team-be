import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document as MongooseDocument } from 'mongoose';
import type { EmailBlockType } from '../email-blocks.util';

@Schema({ _id: false })
export class EmailTemplateBlock {
  @Prop({ type: String, required: true, enum: ['paragraph', 'heading', 'list'] })
  type: EmailBlockType;

  @Prop({ type: String, required: false })
  text?: string;

  @Prop({ type: [String], required: false })
  items?: string[];
}

@Schema({ timestamps: true })
export class EmailTemplate {
  @Prop({ type: String, required: true, unique: true, index: true })
  key: string;

  @Prop({ type: String, required: true })
  subject: string;

  @Prop({ type: [EmailTemplateBlock], required: true })
  blocks: EmailTemplateBlock[];
}

export type EmailTemplateDocument = EmailTemplate & MongooseDocument;
export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplate);
