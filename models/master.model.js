import mongoose, { Schema } from "mongoose";

const tenureSchema = new Schema(
  {
    name: {
      type: String,
      lowercase: true,
      required: true,
    },
    duration: {
      type: Number,
      required: true, // in days
    },
    description: {
      type: String,
      default: null,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);



//country schema
const countrySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 250,
    },
    iso_2: {
      type: String,
      unique: true,
      required: true,
      maxlength: 250,
    },
    iso_3: {
      type: String,
      required: true,
      maxlength: 250,
    },
    dial_code: {
      type: String,
      required: true,
      maxlength: 250,
    },
    currencyCode: {
      type: String,
      maxlength: 50,
      default: null,
    },
    symbol: {
      type: String,
      maxlength: 50,
      default: null,
    },
    symbolNative: {
      type: String,
      maxlength: 50,
      default: null,
    },
    flag: {
      type: String,
      default: null,
    },
    latitude: {
      type: String,
      maxlength: 250,
      default: null,
    },
    longitude: {
      type: String,
      maxlength: 250,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

countrySchema.index({ name: 1 });

//city schema
const citySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      maxlength: 250,
    },
    latitude: {
      type: String,
      maxlength: 250,
      default: null,
    },
    longitude: {
      type: String,
      maxlength: 250,
      default: null,
    },
    country: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

citySchema.index({ name: 1 });



// tax schema
const taxMasterSchema = new Schema(
  {
    name: {
      type: String,
      maxlength: 250,
      required: true,
    },
    rate: {
      type: mongoose.Types.Decimal128,
      required: true,
    },
    country: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      default: null,
    },
    is_active: {
      type: Boolean,
      default: false,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to ensure only one active tax
taxMasterSchema.pre("save", async function (next) {
  const tax = this;
  if (tax.is_active) {
    await tax.constructor.updateMany(
      { _id: { $ne: tax._id } },
      { is_active: false }
    );
  }
  next();
});

taxMasterSchema.post("findOneAndUpdate", async function (doc) {
  if (doc && doc.is_active) {
    await doc.constructor.updateMany(
      { _id: { $ne: doc._id } },
      { is_active: false }
    );
  }
});

const extraChargeSchema = new Schema(
  {
    extraprice: {
      type: Number,
    },
    is_default: {
      type: Boolean,
      default: false,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);


extraChargeSchema.pre("save", async function (next) {
  const charge = this;
  if (charge.is_default) {
    await charge.constructor.updateMany(
      { _id: { $ne: charge._id } },
      { is_default: false }
    );
  }
  next();
});

extraChargeSchema.post("findOneAndUpdate", async function (doc) {
  if (doc && doc.is_default) {
    await doc.constructor.updateMany(
      { _id: { $ne: doc._id } },
      { is_default: false }
    );
  }
});

const currencySchema = new Schema(
  {
    currencyCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    currencyName: {
      type: String,
      required: true,
      trim: true,
    },
    currencySymbol: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    exchangeRate: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Inactive",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


// categorySchema 
const categorySchema = new Schema(
  {
    
    cName: {
      type: String,
      lowecase: true,
      required: true,
    },
    image: {
        type: String,
      },
    // cLevel: {
    //   type: String,
    //   lowecase: true,
    //   required: true,
    // },
   
  },
  { timestamps: true, versionKey: false }
);


const locationSchema = new Schema(
  {
    country: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    city: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      required: true,
    },
    pin: {
      type: String,
      required: true,
      trim: true,
    },
    streetName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    pinAddress: {
      type: String,
      required: true,
      trim: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
);


export const Category = mongoose.model("Category", categorySchema);
export const TenureModel = mongoose.model("TenureModel", tenureSchema);
export const LocationMaster = mongoose.model("LocationMaster", locationSchema);

export const Currency = mongoose.model("Currency", currencySchema);
export const Country = mongoose.model("Country", countrySchema);
export const City = mongoose.model("City", citySchema);
export const TaxMaster = mongoose.model("TaxMaster", taxMasterSchema);
export const ExtraCharge = mongoose.model("ExtraCharge", extraChargeSchema);
