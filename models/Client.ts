import mongoose, { Schema, Document } from 'mongoose';

const CLIENT_CODE_REGEX = /^[A-Z0-9]{2,10}$/;

export interface IClient extends Document {
  name: string;
  clientCode: string;
  businessRegistrationNumber: string;
  contactPerson: string;
  googleDriveFolderId: string;
  createdAt: Date;
}

const ClientSchema = new Schema<IClient>({
  name: { type: String, required: true, index: true },
  clientCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    validate: {
      validator: (v: string) => CLIENT_CODE_REGEX.test(v),
      message: 'clientCode must match /^[A-Z0-9]{2,10}$/',
    },
  },
  businessRegistrationNumber: { type: String, required: true },
  contactPerson: { type: String, required: true },
  googleDriveFolderId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ClientModel =
  mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);
