const express = require("express");
const SOS = require("../models/SOS");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
  CREATE SOS

  POST /api/sos

  Requires:
  Authorization: Bearer <JWT>

  Body:
  {
    "latitude": 16.5062,
    "longitude": 80.6480
  }
*/

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    // Validate that both coordinates were provided.
    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return res.status(400).json({
        message: "Valid latitude and longitude are required.",
      });
    }

    // Validate latitude range.
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        message: "Latitude must be between -90 and 90.",
      });
    }

    // Validate longitude range.
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        message: "Longitude must be between -180 and 180.",
      });
    }

    /*
      GeoJSON uses:

      [longitude, latitude]

      NOT:

      [latitude, longitude]
    */

    const sos = await SOS.create({
      userId: req.user.userId,

      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },

      status: "active",
    });

    /*
      Diagnostic log.

      This confirms that the SOS document was actually
      created successfully in MongoDB.
    */

    console.log("=================================");
    console.log("🚨 SOS CREATED SUCCESSFULLY");
    console.log("SOS ID:", sos._id.toString());
    console.log("User ID:", sos.userId.toString());
    console.log("Latitude:", latitude);
    console.log("Longitude:", longitude);
    console.log("Status:", sos.status);
    console.log("Created At:", sos.createdAt);
    console.log("=================================");

    const io = req.app.get("io");
    if (io) {
      io.emit("sos:new", {
        id: sos._id,
        userId: sos.userId,
        location: { latitude, longitude },
        status: sos.status,
        createdAt: sos.createdAt,
      });
    }

    return res.status(201).json({
      message: "SOS activated successfully.",
      sos: {
        id: sos._id,
        userId: sos.userId,
        location: {
          latitude,
          longitude,
        },
        status: sos.status,
        createdAt: sos.createdAt,
      },
    });
  } catch (error) {
    console.error("Create SOS error:", error);

    return res.status(500).json({
      message: "Something went wrong while activating SOS.",
    });
  }
});


/*
  GET CURRENT USER'S ACTIVE SOS

  GET /api/sos/active

  Requires:
  Authorization: Bearer <JWT>
*/

router.get("/active", authMiddleware, async (req, res) => {
  try {
    const sos = await SOS.findOne({
      userId: req.user.userId,
      status: "active",
    }).sort({
      createdAt: -1,
    });

    if (!sos) {
      return res.status(200).json({
        active: false,
        sos: null,
      });
    }

    return res.status(200).json({
      active: true,
      sos: {
        id: sos._id,
        location: {
          latitude: sos.location.coordinates[1],
          longitude: sos.location.coordinates[0],
        },
        status: sos.status,
        createdAt: sos.createdAt,
      },
    });
  } catch (error) {
    console.error("Get active SOS error:", error);

    return res.status(500).json({
      message: "Something went wrong while checking SOS status.",
    });
  }
});


/*
  RESOLVE SOS

  PATCH /api/sos/:id/resolve

  Requires:
  Authorization: Bearer <JWT>
*/

router.patch("/:id/resolve", authMiddleware, async (req, res) => {
  try {
    const query =
      req.params.id === "active"
        ? { userId: req.user.userId, status: "active" }
        : { _id: req.params.id, userId: req.user.userId, status: "active" };

    const sos = await SOS.findOne(query);

    if (!sos) {
      return res.status(404).json({
        message: "Active SOS not found.",
      });
    }

    sos.status = "resolved";
    sos.resolvedAt = new Date();

    await sos.save();

    console.log("=================================");
    console.log("✅ SOS RESOLVED");
    console.log("SOS ID:", sos._id.toString());
    console.log("User ID:", sos.userId.toString());
    console.log("Resolved At:", sos.resolvedAt);
    console.log("=================================");

    const io = req.app.get("io");
    if (io) {
      io.emit("sos:resolved", {
        id: sos._id,
        userId: sos.userId,
        resolvedAt: sos.resolvedAt,
      });
    }

    return res.status(200).json({
      message: "SOS resolved successfully.",
      sos: {
        id: sos._id,
        status: sos.status,
        resolvedAt: sos.resolvedAt,
      },
    });
  } catch (error) {
    console.error("Resolve SOS error:", error);

    return res.status(500).json({
      message: "Something went wrong while resolving SOS.",
    });
  }
});


/*
  CANCEL SOS

  PATCH /api/sos/:id/cancel

  Requires:
  Authorization: Bearer <JWT>
*/

router.patch("/:id/cancel", authMiddleware, async (req, res) => {
  try {
    const query =
      req.params.id === "active"
        ? { userId: req.user.userId, status: "active" }
        : { _id: req.params.id, userId: req.user.userId, status: "active" };

    const sos = await SOS.findOne(query);

    if (!sos) {
      return res.status(404).json({
        message: "Active SOS not found.",
      });
    }

    sos.status = "cancelled";
    sos.cancelledAt = new Date();

    await sos.save();

    console.log("=================================");
    console.log("❌ SOS CANCELLED");
    console.log("SOS ID:", sos._id.toString());
    console.log("User ID:", sos.userId.toString());
    console.log("Cancelled At:", sos.cancelledAt);
    console.log("=================================");

    const io = req.app.get("io");
    if (io) {
      io.emit("sos:cancelled", {
        id: sos._id,
        userId: sos.userId,
        cancelledAt: sos.cancelledAt,
      });
    }

    return res.status(200).json({
      message: "SOS cancelled successfully.",
      sos: {
        id: sos._id,
        status: sos.status,
        cancelledAt: sos.cancelledAt,
      },
    });
  } catch (error) {
    console.error("Cancel SOS error:", error);

    return res.status(500).json({
      message: "Something went wrong while cancelling SOS.",
    });
  }
});


module.exports = router;