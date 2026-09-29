const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const DEFAULT_RADIUS_METERS = 30000;
const MAX_RADIUS_METERS = 50000;

const allowedOrganizationTypes = [
  "ngo",
  "police",
  "hospital",
  "relief_camp",
  "other",
];

/*
  GET /api/nearby

  Example:
  /api/nearby?latitude=16.2317&longitude=80.5528

  Optional:
  ?radius=10000
  ?type=hospital
*/

router.get("/", authMiddleware, async (req, res) => {
  try {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);

    const requestedRadius = Number(req.query.radius);

    const radius =
      Number.isFinite(requestedRadius) && requestedRadius > 0
        ? Math.min(requestedRadius, MAX_RADIUS_METERS)
        : DEFAULT_RADIUS_METERS;

    const type = req.query.type || "all";

    // Validate coordinates
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        message: "Valid latitude and longitude are required.",
      });
    }

    // Validate organization type
    if (
      type !== "all" &&
      !allowedOrganizationTypes.includes(type)
    ) {
      return res.status(400).json({
        message: "Invalid organization type.",
        allowedTypes: allowedOrganizationTypes,
      });
    }

    const organizationQuery = {
      accountType: "organization",
      verificationStatus: "verified",
      isActive: true,
    };

    if (type !== "all") {
      organizationQuery.organizationType = type;
    }

    /*
      GeoJSON coordinates are always:

      [longitude, latitude]

      NOT:

      [latitude, longitude]
    */

    const nearbyOrganizations = await User.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [longitude, latitude],
          },

          key: "mapLocation",

          distanceField: "distanceMeters",

          maxDistance: radius,

          spherical: true,

          query: organizationQuery,
        },
      },

      {
        $project: {
          _id: 1,

          name: 1,

          organizationName: 1,

          organizationType: 1,

          verificationStatus: 1,

          defaultAddress: 1,

          mapLocation: 1,

          distanceMeters: 1,
        },
      },

      {
        $limit: 100,
      },
    ]);

    const results = nearbyOrganizations.map((organization) => ({
      id: organization._id,

      name:
        organization.organizationName ||
        organization.name,

      organizationType:
        organization.organizationType,

      verificationStatus:
        organization.verificationStatus,

      distanceMeters: Math.round(
        organization.distanceMeters
      ),

      distanceKm: Number(
        (organization.distanceMeters / 1000).toFixed(2)
      ),

      address: organization.defaultAddress || null,

      location: organization.mapLocation || null,
    }));

    return res.json({
      success: true,

      search: {
        latitude,
        longitude,
        radiusMeters: radius,
        type,
      },

      count: results.length,

      organizations: results,
    });
  } catch (error) {
    console.error(
      "Nearby organizations error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to find nearby organizations.",
    });
  }
});

module.exports = router;