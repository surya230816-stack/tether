
const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const User = require("../models/User");

const router = express.Router();

// Registration validation
const registrationSchema = z
  .object({
    accountType: z.enum(["individual", "organization"]),

    name: z.string().trim().min(2).max(100),

    email: z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase()),

    phone: z
      .string()
      .trim()
      .max(20)
      .optional(),

    password: z.string().min(8).max(72),

    confirmPassword: z.string(),

    defaultAddress: z.object({
      addressLine: z.string().trim().min(2).max(200),

      villageOrCity: z.string().trim().min(2).max(100),

      district: z.string().trim().min(2).max(100),

      state: z.string().trim().min(2).max(100),

      postalCode: z
        .string()
        .trim()
        .max(20)
        .optional(),
    }),

    // Optional map pin
    mapLocation: z
      .object({
        type: z.literal("Point"),

        coordinates: z
          .array(z.number())
          .length(2),
      })
      .optional(),

    organizationName: z
      .string()
      .trim()
      .max(150)
      .optional(),

    organizationType: z
      .enum([
        "ngo",
        "police",
        "hospital",
        "relief_camp",
        "other",
      ])
      .optional(),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    }
  )
  .superRefine((data, context) => {
    if (data.accountType === "organization") {
      if (
        !data.organizationName ||
        data.organizationName.length < 2
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Organization name is required.",
          path: ["organizationName"],
        });
      }

      if (!data.organizationType) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Organization type is required.",
          path: ["organizationType"],
        });
      }
    }
  });

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const validation = registrationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid registration details.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const data = validation.data;

    const existingUser = await User.findOne({
      email: data.email,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(
      data.password,
      12
    );

    const userData = {
      accountType: data.accountType,
      role: "user",
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      password: hashedPassword,
      defaultAddress: data.defaultAddress,

      organizationName:
        data.accountType === "organization"
          ? data.organizationName
          : null,

      organizationType:
        data.accountType === "organization"
          ? data.organizationType
          : null,

      verificationStatus:
        data.accountType === "organization"
          ? "pending"
          : "not_required",
    };

    // Add map location only if supplied
    if (data.mapLocation) {
      const [longitude, latitude] =
        data.mapLocation.coordinates;

      if (
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid map coordinates.",
        });
      }

      userData.mapLocation = data.mapLocation;
    }

    const user = await User.create(userData);

    return res.status(201).json({
      success: true,

      message:
        data.accountType === "organization"
          ? "Registration successful. Your organization is awaiting verification."
          : "Registration successful.",

      user: {
        id: user._id,
        accountType: user.accountType,
        name: user.name,
        email: user.email,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      success: false,
      message: "Something went wrong during registration.",
    });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        message: "This account is currently inactive.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        accountType: user.accountType,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        accountType: user.accountType,
        role: user.role,
        name: user.name,
        email: user.email,
        verificationStatus: user.verificationStatus,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Something went wrong during login.",
    });
  }
});

module.exports = router;