const mongoose = require("mongoose");

// Optional GeoJSON location
const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },

    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (value) {
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            value[0] >= -180 &&
            value[0] <= 180 &&
            value[1] >= -90 &&
            value[1] <= 90
          );
        },
        message: "Invalid map coordinates.",
      },
    },
  },
  {
    _id: false,
  }
);

const userSchema = new mongoose.Schema(
  {
    accountType: {
      type: String,
      enum: ["individual", "organization"],
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    defaultAddress: {
      addressLine: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200,
      },

      villageOrCity: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      district: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      state: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100,
      },

      postalCode: {
        type: String,
        trim: true,
        maxlength: 20,
        default: null,
      },
    },

    // Optional map pin
    mapLocation: {
      type: geoPointSchema,
      default: undefined,
    },

    organizationName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: null,
    },

    organizationType: {
      type: String,
      enum: [
        "ngo",
        "police",
        "hospital",
        "relief_camp",
        "other",
      ],
      default: null,
    },

    verificationStatus: {
      type: String,
      enum: [
        "not_required",
        "pending",
        "verified",
        "rejected",
      ],
      default: "not_required",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    // ================================
    // ORGANIZATION OPERATIONAL PROFILE
    // ================================

    description: {
      type: String,
      default: "",
      trim: true,
    },

    contactPhone: {
      type: String,
      default: "",
      trim: true,
    },

    services: {
      type: [String],
      default: [],
    },

    resources: {
      type: [
        {
          name: {
            type: String,
            required: true,
            trim: true,
          },

          category: {
            type: String,
            default: "general",
            trim: true,
          },

          available: {
            type: Boolean,
            default: true,
          },
        },
      ],
      default: [],
    },

    operatingHours: {
      open: {
        type: String,
        default: "",
      },

      close: {
        type: String,
        default: "",
      },
    },

    availabilityStatus: {
      type: String,
      enum: ["available", "limited", "unavailable"],
      default: "available",
    },

    // When the organization last confirmed
    // that its operational information is correct.
    lastInfoUpdatedAt: {
      type: Date,
      default: null,
    },

    // Used to avoid showing the exact same
    // reminder on every dashboard refresh.
    lastInfoReminderAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Enables future nearby-location queries
userSchema.index({ mapLocation: "2dsphere" });

const User = mongoose.model("User", userSchema);

module.exports = User;