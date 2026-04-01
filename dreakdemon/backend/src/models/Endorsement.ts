import mongoose, { Document, Schema } from 'mongoose';

export interface IEndorsement extends Document {
  endorserId: string;
  endorserName: string;
  endorserAvatar: string;
  recipientId: string;
  recipientName: string;
  skill: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EndorsementSchema: Schema = new Schema({
  endorserId: { type: String, required: true },
  endorserName: { type: String, required: true },
  endorserAvatar: { type: String },
  recipientId: { type: String, required: true },
  recipientName: { type: String, required: true },
  skill: { type: String, required: true },
  message: { type: String }
}, {
  timestamps: true
});

// Index for efficient lookups
EndorsementSchema.index({ endorserId: 1 });
EndorsementSchema.index({ recipientId: 1 });

export default mongoose.model<IEndorsement>('Endorsement', EndorsementSchema);
