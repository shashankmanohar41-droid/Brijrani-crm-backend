import { Schema, model, Document } from 'mongoose';

export interface IQualityParamConstraint {
  name: string;
  unit?: string;
  standardValue?: number;
  tolerance?: number;
  minLimit?: number;
  maxLimit?: number;
  direction?: 'HIGHER_IS_WORSE' | 'LOWER_IS_WORSE';
}

export interface ICommodity extends Document {
  commodityCode: string;
  name: string;
  category: 'Grains' | 'Oilseeds' | 'Pulses' | 'Other';
  unit: 'MT' | 'Qtl' | 'Kg';
  hsn: string;
  gstRate: number; // Percentage e.g. 5
  purchasePrice: number; // Default benchmark price
  sellingPrice: number; // Default benchmark price
  minimumStock: number; // Alert threshold
  maximumStock: number;
  batchTracking: boolean;
  qualityParameters: IQualityParamConstraint[];
}

const commoditySchema = new Schema<ICommodity>({
  commodityCode: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, unique: true, index: true },
  category: { type: String, enum: ['Grains', 'Oilseeds', 'Pulses', 'Other'], required: true, index: true },
  unit: { type: String, enum: ['MT', 'Qtl', 'Kg'], required: true, default: 'MT' },
  hsn: { type: String, required: true, index: true },
  gstRate: { type: Number, required: true, default: 5 },
  purchasePrice: { type: Number, required: true, default: 0 },
  sellingPrice: { type: Number, required: true, default: 0 },
  minimumStock: { type: Number, required: true, default: 10 },
  maximumStock: { type: Number, required: true, default: 10000 },
  batchTracking: { type: Boolean, default: true },
  qualityParameters: {
    type: [{
      name: { type: String, required: true },
      unit: { type: String, default: '%' },
      standardValue: { type: Number },
      tolerance: { type: Number, default: 0 },
      minLimit: { type: Number },
      maxLimit: { type: Number },
      direction: { type: String, enum: ['HIGHER_IS_WORSE', 'LOWER_IS_WORSE'], default: 'HIGHER_IS_WORSE' }
    }],
    default: []
  }
}, {
  timestamps: true
});

export const Commodity = model<ICommodity>('Commodity', commoditySchema);
