const mongoose = require("mongoose");

const sosSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
        default: "Point",
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
          message:
            "Location coordinates must be [longitude, latitude].",
        },
      },
    },

    status: {
      type: String,
      enum: ["active", "resolved", "cancelled"],
      default: "active",
      index: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Allows MongoDB to perform nearby-location searches.
sosSchema.index({
  location: "2dsphere",
});

module.exports = mongoose.model("SOS", sosSchema);