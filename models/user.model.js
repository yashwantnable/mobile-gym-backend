import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";


const userSchema = new Schema(
  {
    uid: {
      type: String,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowecase: true,
      trim: true,
    },
    user_role: {
      type: Schema.Types.ObjectId,
      ref: "UserRole",
      required: true,
    },
    first_name: {
      type: String,
      maxlength: 250,
      required: true,
    },
    last_name: {
      type: String,
      maxlength: 250,
      default: null,
    },
    phone_number: {
      type: String,
      maxlength: 15,
    },
    address: {
      type: String,
      default: null,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Others", ""],
      maxlength: 15,
      default: null,
    },
    age: {
      type: Number,
      default: 0,
    },
    profile_image: {
      type: String,
      default: null,
    },
    country: {
      type: Schema.Types.ObjectId,
      ref: "Country",
      default: null,
    },
    city: {
      type: Schema.Types.ObjectId,
      ref: "City",
      default: null,
    },
    otp: {
      type: String,
      maxlength: 250,
      default: null,
    },
    otp_time: {
      type: Date,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    password: {
      type: String,
      default : null
      // required: function () {
      //   return !(this.uid && this.uid !== "");
      // },
    },
    refreshToken: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Approved",
        "Unapproved",
        "Blocked",
        "Rejected",
      ],
      default: "Pending",
    },
    userStatus : {
      type : String,
      enum : ["BUSY", "AVAILABLE", "NOT AVAILABLE"],
      default : "AVAILABLE"
    },
    specialization :{
      type : String,
      maxlength : 100,
      default : null
    },
    experience : {
      type : String,
      enum : ["EXPERIENCE","FRESHER"],
      default : null
    },
    experienceYear : {
      type : Number,
      default : 0
    },
    serviceProvider : [
      {
        type: Schema.Types.ObjectId,
        ref: "ServiceType",
        default : null,
      }
    ],
    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], //[longitude, latitude]
      },
    },
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ location: "2dsphere" });


// userSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();

//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

//Password check
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};


// genrate Access token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      first_name: this.first_name,
      last_name: this.last_name,
      phone_number: this.phone_number,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};


//generate Refresh token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    }
  );
};


//FCM schema
const FCMDeviceSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fcm_token: {
      type: String,
      required: true,
    },
    device_type: {
      type: String,
      enum: ["android", "ios", "web"],
      required: true,
    },
    device_id: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false
  }
);

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

  make_default_address : {
    type : Boolean,
    default : false
  },
  // coordinates: {
  //   latitude: {
  //     type: Number,
  //     min: -90,
  //     max: 90,
  //     default : 0,
  //   },
  //   longitude: {
  //     type: Number,
  //     min: -180,
  //     max: 180,
  //     default: 0,
  //   }
  // },
   coordinates: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    default: null,
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
  timestamps: true
});

userAddressSchema.index({ coordinates: "2dsphere" });
userAddressSchema.pre('save', async function(next) {
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

export const User = mongoose.model("User", userSchema);
export const FCMDevice = mongoose.model("FCMDevice", FCMDeviceSchema);
export const Address = mongoose.model('Address', userAddressSchema);