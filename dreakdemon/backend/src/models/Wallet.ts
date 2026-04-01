import mongoose, { Document, Schema } from 'mongoose';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  coins: number;
  transactions: {
    type: 'credit' | 'debit';
    amount: number;
    reason: string;
    createdAt: Date;
  }[];
  achievements: {
    problemsSolved: number;
    battlesWon: number;
    currentStreak: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  coins: { type: Number, default: 1000 }, // Start with 100 coins
  transactions: [{
    type: { type: String, enum: ['credit', 'debit'], required: true },
    amount: { type: Number, required: true },
    reason: { type: String, default: 'Transaction' },
    createdAt: { type: Date, default: Date.now }
  }],
  achievements: {
    problemsSolved: { type: Number, default: 0 },
    battlesWon: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 }
  }
}, { timestamps: true });

export default mongoose.model<IWallet>('Wallet', WalletSchema);
