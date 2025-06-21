import mongoose, { Schema } from 'mongoose';

const ExchangeRateSchema = new Schema({
    country: {
      type: Schema.Types.ObjectId,
      ref: 'Country',
    },
    baseCurrencyId: {
      type: Schema.Types.ObjectId,
      ref: 'Currency',
    },
    exchangeRateDetails: [{
      exchangeCurrencyId: {
        type: Schema.Types.ObjectId,
        ref: 'Currency'
      },
      exchangeRate: {
        type: Number
      }
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
  },
  { timestamps: true,
    versionKey: false
})


export const Exchange = mongoose.model('Exchange', ExchangeRateSchema);