import mongoose, { Schema } from 'mongoose';


const userAddressSchema = new Schema({
  name: {
    type: String,
    maxlength: 250,
    required: true,
  },
  phone_number: {
    type: String,
    maxlength: 15,
    required: true,
  },
  country: {
    type: Schema.Types.ObjectId,
    ref: 'Country',
    default: null,
  },
  city: {
    type: Schema.Types.ObjectId,
    ref: 'City',
    default: null,
  },
  flat_no: {
    type: String,
    maxlength: 250
  },
  street: {
    type: String,
    maxlength: 250
  },
  landmark: {
    type: String,
    maxlength: 250
  },
  pin_code: {
    type: Number,
    required: true
  },
  make_default_address: {
    type: Boolean,
    default: false
  },
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      default: 0,
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
      default: 0,
    }
  },
  created_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updated_by: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  versionKey: false
});

userAddressSchema.pre('save', async function (next) {
  const address = this;
  if (address.make_default_address) {
    await address.constructor.updateMany(
      { created_by: address.created_by, _id: { $ne: address._id } },
      { make_default_address: false }
    );
  }
  next();
});

userAddressSchema.post('findOneAndUpdate', async function (doc) {
  if (doc && doc.make_default_address) {
    await doc.constructor.updateMany(
      { created_by: doc.created_by, _id: { $ne: doc._id } },
      { make_default_address: false }
    );
  }
});


export const DeliveryAddress = mongoose.model('DeliveryAddress', userAddressSchema);



