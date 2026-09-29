const express = require("express");
const mongoose = require("mongoose");

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const REVIEW_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const isOrganization = (user) => {
  return user && user.accountType === "organization";
};

const cleanStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
};

const cleanResources = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((resource) => ({
      name: String(resource?.name || "").trim(),
      category: String(resource?.category || "general").trim(),
      available: Boolean(resource?.available),
    }))
    .filter((resource) => resource.name);
};

const getReviewState = (organization) => {
  const now = Date.now();

  const lastUpdated = organization.lastInfoUpdatedAt
    ? new Date(organization.lastInfoUpdatedAt).getTime()
    : null;

  const lastReminder = organization.lastInfoReminderAt
    ? new Date(organization.lastInfoReminderAt).getTime()
    : null;

  // No operational profile update yet.
  if (!lastUpdated) {
    return {
      profileUpdated: false,
      reviewDue: true,
      reminderDue: !lastReminder ||
        now - lastReminder >= REVIEW_INTERVAL_MS,
      lastInfoUpdatedAt: null,
      nextReviewAt: null,
      daysUntilReview: 0,
    };
  }

  const nextReviewAt =
    lastUpdated + REVIEW_INTERVAL_MS;

  const reviewDue = now >= nextReviewAt;

  const reminderDue =
    reviewDue &&
    (!lastReminder ||
      now - lastReminder >= REVIEW_INTERVAL_MS);

  const remainingMs = Math.max(
    0,
    nextReviewAt - now
  );

  const daysUntilReview = Math.ceil(
    remainingMs / (24 * 60 * 60 * 1000)
  );

  return {
    profileUpdated: true,
    reviewDue,
    reminderDue,
    lastInfoUpdatedAt: organization.lastInfoUpdatedAt,
    nextReviewAt: new Date(nextReviewAt),
    daysUntilReview,
  };
};

// --------------------------------------------------
// GET /api/organizations/me
// Organization's own profile
// --------------------------------------------------

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        message: "Invalid authenticated user.",
      });
    }

    const organization = await User.findById(userId).select(
      "-password"
    );

    if (!organization) {
      return res.status(404).json({
        message: "Organization account not found.",
      });
    }

    if (!isOrganization(organization)) {
      return res.status(403).json({
        message: "This endpoint is only for organization accounts.",
      });
    }

    const review = getReviewState(organization);

    return res.json({
      success: true,

      organization: {
        id: organization._id,
        name:
          organization.organizationName ||
          organization.name,

        organizationName:
          organization.organizationName || "",

        contactName:
          organization.name || "",

        email:
          organization.email || "",

        organizationType:
          organization.organizationType,

        verificationStatus:
          organization.verificationStatus,

        description:
          organization.description || "",

        contactPhone:
          organization.contactPhone || "",

        defaultAddress:
          organization.defaultAddress || null,

        mapLocation:
          organization.mapLocation || null,

        services:
          organization.services || [],

        resources:
          organization.resources || [],

        operatingHours:
          organization.operatingHours || {
            open: "",
            close: "",
          },

        availabilityStatus:
          organization.availabilityStatus ||
          "available",
      },

      review,
    });
  } catch (error) {
    console.error(
      "Organization profile error:",
      error
    );

    return res.status(500).json({
      message: "Unable to load organization profile.",
    });
  }
});

// --------------------------------------------------
// PATCH /api/organizations/me
// Update organization operational information
// --------------------------------------------------

router.patch("/me", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({
        message: "Invalid authenticated user.",
      });
    }

    const organization = await User.findById(userId);

    if (!organization) {
      return res.status(404).json({
        message: "Organization account not found.",
      });
    }

    if (!isOrganization(organization)) {
      return res.status(403).json({
        message: "This endpoint is only for organization accounts.",
      });
    }

    const {
      organizationName,
      description,
      contactPhone,
      defaultAddress,
      mapLocation,
      services,
      resources,
      operatingHours,
      availabilityStatus,
    } = req.body;

    // --------------------------------------------
    // Organization name
    // --------------------------------------------

    if (organizationName !== undefined) {
      const cleanedName =
        String(organizationName).trim();

      if (!cleanedName) {
        return res.status(400).json({
          message: "Organization name cannot be empty.",
        });
      }

      organization.organizationName =
        cleanedName;
    }

    // --------------------------------------------
    // Description
    // --------------------------------------------

    if (description !== undefined) {
      organization.description =
        String(description).trim();
    }

    // --------------------------------------------
    // Contact
    // --------------------------------------------

    if (contactPhone !== undefined) {
      organization.contactPhone =
        String(contactPhone).trim();
    }

    // --------------------------------------------
    // Address
    // --------------------------------------------

    if (defaultAddress !== undefined) {
      if (
        typeof defaultAddress !== "object" ||
        defaultAddress === null
      ) {
        return res.status(400).json({
          message: "Invalid organization address.",
        });
      }

      organization.defaultAddress = {
        addressLine:
          String(
            defaultAddress.addressLine || ""
          ).trim(),

        villageOrCity:
          String(
            defaultAddress.villageOrCity || ""
          ).trim(),

        district:
          String(
            defaultAddress.district || ""
          ).trim(),

        state:
          String(
            defaultAddress.state || ""
          ).trim(),

        postalCode:
          String(
            defaultAddress.postalCode || ""
          ).trim(),
      };
    }

    // --------------------------------------------
    // Map location
    // --------------------------------------------

    if (mapLocation !== undefined) {
      if (
        mapLocation === null
      ) {
        organization.mapLocation = undefined;
      } else {
        const coordinates =
          mapLocation?.coordinates;

        if (
          mapLocation?.type !== "Point" ||
          !Array.isArray(coordinates) ||
          coordinates.length !== 2
        ) {
          return res.status(400).json({
            message:
              "mapLocation must be a GeoJSON Point.",
          });
        }

        const longitude =
          Number(coordinates[0]);

        const latitude =
          Number(coordinates[1]);

        if (
          !Number.isFinite(longitude) ||
          !Number.isFinite(latitude) ||
          longitude < -180 ||
          longitude > 180 ||
          latitude < -90 ||
          latitude > 90
        ) {
          return res.status(400).json({
            message:
              "Invalid map coordinates.",
          });
        }

        organization.mapLocation = {
          type: "Point",
          coordinates: [
            longitude,
            latitude,
          ],
        };
      }
    }

    // --------------------------------------------
    // Services
    // --------------------------------------------

    if (services !== undefined) {
      organization.services =
        cleanStringArray(services);
    }

    // --------------------------------------------
    // Resources
    // --------------------------------------------

    if (resources !== undefined) {
      organization.resources =
        cleanResources(resources);
    }

    // --------------------------------------------
    // Operating hours
    // --------------------------------------------

    if (operatingHours !== undefined) {
      if (
        typeof operatingHours !== "object" ||
        operatingHours === null
      ) {
        return res.status(400).json({
          message:
            "Invalid operating hours.",
        });
      }

      organization.operatingHours = {
        open:
          String(
            operatingHours.open || ""
          ).trim(),

        close:
          String(
            operatingHours.close || ""
          ).trim(),
      };
    }

    // --------------------------------------------
    // Availability
    // --------------------------------------------

    if (availabilityStatus !== undefined) {
      const allowedStatuses = [
        "available",
        "limited",
        "unavailable",
      ];

      if (
        !allowedStatuses.includes(
          availabilityStatus
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid availability status.",
          allowedStatuses,
        });
      }

      organization.availabilityStatus =
        availabilityStatus;
    }

    // --------------------------------------------
    // IMPORTANT:
    // Every successful operational update
    // resets the 3-day review cycle.
    // --------------------------------------------

    organization.lastInfoUpdatedAt = new Date();

    // Clear the reminder because the organization
    // has just reviewed its information.
    organization.lastInfoReminderAt = null;

    await organization.save();

    const review =
      getReviewState(organization);

    return res.json({
      success: true,

      message:
        "Organization information updated successfully.",

      organization: {
        id: organization._id,

        name:
          organization.organizationName ||
          organization.name,

        organizationName:
          organization.organizationName || "",

        description:
          organization.description || "",

        contactPhone:
          organization.contactPhone || "",

        organizationType:
          organization.organizationType,

        verificationStatus:
          organization.verificationStatus,

        defaultAddress:
          organization.defaultAddress || null,

        mapLocation:
          organization.mapLocation || null,

        services:
          organization.services || [],

        resources:
          organization.resources || [],

        operatingHours:
          organization.operatingHours || {
            open: "",
            close: "",
          },

        availabilityStatus:
          organization.availabilityStatus ||
          "available",
      },

      review,
    });
  } catch (error) {
    console.error(
      "Organization profile update error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to update organization information.",
    });
  }
});

// --------------------------------------------------
// GET /api/organizations/me/review
// Dashboard checks whether a reminder is due.
// --------------------------------------------------

router.get(
  "/me/review",
  authMiddleware,
  async (req, res) => {
    try {
      const userId =
        req.user?.userId || req.user?.id;

      if (
        !userId ||
        !mongoose.Types.ObjectId.isValid(userId)
      ) {
        return res.status(401).json({
          message:
            "Invalid authenticated user.",
        });
      }

      const organization =
        await User.findById(userId);

      if (!organization) {
        return res.status(404).json({
          message:
            "Organization account not found.",
        });
      }

      if (!isOrganization(organization)) {
        return res.status(403).json({
          message:
            "This endpoint is only for organization accounts.",
        });
      }

      const review =
        getReviewState(organization);

      // If the reminder is due, mark this reminder
      // as delivered so it isn't repeated on every
      // dashboard refresh.
      if (review.reminderDue) {
        organization.lastInfoReminderAt =
          new Date();

        await organization.save();
      }

      return res.json({
        success: true,

        notification: {
          show:
            review.reminderDue ||
            !review.profileUpdated,

          type:
            !review.profileUpdated
              ? "profile_incomplete"
              : review.reviewDue
                ? "information_review"
                : null,

          title:
            !review.profileUpdated
              ? "Complete your organization profile"
              : "Time to review your information",

          message:
            !review.profileUpdated
              ? "Add your services, resources, contact details and availability so people can rely on your organization information."
              : "It has been 3 days since your last information review. Please check that your services, resources and availability are still accurate.",
        },

        review,
      });
    } catch (error) {
      console.error(
        "Organization review error:",
        error
      );

      return res.status(500).json({
        message:
          "Unable to check organization review status.",
      });
    }
  }
);

// --------------------------------------------------
// GET /api/organizations/:id
// Public organization details
// --------------------------------------------------

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        message:
          "Invalid organization ID.",
      });
    }

    const organization =
      await User.findOne({
        _id: id,
        accountType: "organization",
        verificationStatus: "verified",
        isActive: true,
      }).select(
        "_id name organizationName organizationType verificationStatus description contactPhone defaultAddress mapLocation services resources operatingHours availabilityStatus"
      );

    if (!organization) {
      return res.status(404).json({
        message:
          "Verified organization not found.",
      });
    }

    return res.json({
      success: true,

      organization: {
        id: organization._id,

        name:
          organization.organizationName ||
          organization.name,

        organizationName:
          organization.organizationName || "",

        organizationType:
          organization.organizationType,

        verificationStatus:
          organization.verificationStatus,

        description:
          organization.description || "",

        contactPhone:
          organization.contactPhone || "",

        defaultAddress:
          organization.defaultAddress || null,

        mapLocation:
          organization.mapLocation || null,

        services:
          organization.services || [],

        resources:
          organization.resources || [],

        operatingHours:
          organization.operatingHours || {
            open: "",
            close: "",
          },

        availabilityStatus:
          organization.availabilityStatus ||
          "available",
      },
    });
  } catch (error) {
    console.error(
      "Organization details error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to load organization details.",
    });
  }
});

module.exports = router;