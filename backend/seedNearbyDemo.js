require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");

/*
  TETHER — Nearby Demo Organization Seeder

  Creates demo organizations using the SAME User schema
  used by the real application.

  Categories:
  - Hospitals
  - Police
  - NGOs
  - Relief Camps

  Locations are intentionally spread across:
  - Guntur
  - Vadlamudi
  - Mangalagiri
  - Vijayawada
  - Eluru
  - Ongole

  Safe to run repeatedly:
  Existing demo organizations are removed first.
*/

const DEMO_PASSWORD = "TetherDemo@123";

const locations = [
  // GUNTUR
  {
    city: "Guntur",
    district: "Guntur",
    state: "Andhra Pradesh",
    latitude: 16.3067,
    longitude: 80.4365,
  },
  {
    city: "Guntur",
    district: "Guntur",
    state: "Andhra Pradesh",
    latitude: 16.2992,
    longitude: 80.4575,
  },
  {
    city: "Guntur",
    district: "Guntur",
    state: "Andhra Pradesh",
    latitude: 16.3208,
    longitude: 80.4105,
  },

  // VADLAMUDI
  {
    city: "Vadlamudi",
    district: "Guntur",
    state: "Andhra Pradesh",
    latitude: 16.2354,
    longitude: 80.5556,
  },
  {
    city: "Vadlamudi",
    district: "Guntur",
    state: "Andhra Pradesh",
    latitude: 16.2298,
    longitude: 80.5482,
  },

  // MANGALAGIRI
  {
    city: "Mangalagiri",
    district: "Guntur",
    state: "Andhra Pradesh",
    latitude: 16.4308,
    longitude: 80.5684,
  },
  {
    city: "Mangalagiri",
    district: "Guntur",
    state: "Andhra Pradesh",
    latitude: 16.4451,
    longitude: 80.5631,
  },

  // VIJAYAWADA
  {
    city: "Vijayawada",
    district: "NTR",
    state: "Andhra Pradesh",
    latitude: 16.5062,
    longitude: 80.6480,
  },
  {
    city: "Vijayawada",
    district: "NTR",
    state: "Andhra Pradesh",
    latitude: 16.5193,
    longitude: 80.6305,
  },
  {
    city: "Vijayawada",
    district: "NTR",
    state: "Andhra Pradesh",
    latitude: 16.4945,
    longitude: 80.6673,
  },

  // ELURU
  {
    city: "Eluru",
    district: "Eluru",
    state: "Andhra Pradesh",
    latitude: 16.7107,
    longitude: 81.0952,
  },
  {
    city: "Eluru",
    district: "Eluru",
    state: "Andhra Pradesh",
    latitude: 16.7139,
    longitude: 81.1012,
  },
  {
    city: "Eluru",
    district: "Eluru",
    state: "Andhra Pradesh",
    latitude: 16.7025,
    longitude: 81.0881,
  },

  // ONGOLE
  {
    city: "Ongole",
    district: "Prakasam",
    state: "Andhra Pradesh",
    latitude: 15.5057,
    longitude: 80.0499,
  },
  {
    city: "Ongole",
    district: "Prakasam",
    state: "Andhra Pradesh",
    latitude: 15.5108,
    longitude: 80.0556,
  },
  {
    city: "Ongole",
    district: "Prakasam",
    state: "Andhra Pradesh",
    latitude: 15.4942,
    longitude: 80.0412,
  },
];

const organizationTypes = [
  "hospital",
  "police",
  "ngo",
  "relief_camp",
];

const buildAddress = (location) => ({
  addressLine: `TETHER Demo Center, ${location.city}`,
  villageOrCity: location.city,
  district: location.district,
  state: location.state,
  postalCode: "000000",
});

const buildOrganization = (
  type,
  number,
  location,
  hashedPassword
) => {
  const typeLabel = {
    hospital: "Hospital",
    police: "Police",
    ngo: "NGO",
    relief_camp: "Relief Camp",
  }[type];

  const slug = `${type}${number}`;

  return {
    accountType: "organization",

    role: "user",

    name: `TETHER Demo ${typeLabel} ${String(number).padStart(
      2,
      "0"
    )}`,

    email: `demo.${slug}@tether.local`,

    password: hashedPassword,

    defaultAddress: buildAddress(location),

    mapLocation: {
      type: "Point",
      coordinates: [
        location.longitude,
        location.latitude,
      ],
    },

    organizationName: `TETHER Demo ${typeLabel} ${String(
      number
    ).padStart(2, "0")}`,

    organizationType: type,

    verificationStatus: "verified",

    isActive: true,

    lastLoginAt: null,
  };
};

async function seedNearbyDemo() {
  try {
    console.log("");
    console.log("======================================");
    console.log(" TETHER NEARBY DEMO SEED");
    console.log("======================================");
    console.log("");

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    /*
      Remove ONLY records belonging to this demo seed.

      Real users and real organizations remain untouched.
    */

    const deleteResult = await User.deleteMany({
      email: {
        $regex: /^demo\..*@tether\.local$/,
      },
    });

    console.log(
      `Removed ${deleteResult.deletedCount} old demo organizations.`
    );

    const hashedPassword = await bcrypt.hash(
      DEMO_PASSWORD,
      12
    );

    const organizations = [];

    let locationIndex = 0;

    for (const type of organizationTypes) {
      for (let number = 1; number <= 10; number++) {
        const location =
          locations[locationIndex % locations.length];

        organizations.push(
          buildOrganization(
            type,
            number,
            location,
            hashedPassword
          )
        );

        locationIndex++;
      }
    }

    const inserted =
      await User.insertMany(organizations);

    console.log("");
    console.log(
      `Inserted ${inserted.length} demo organizations.`
    );

    console.log("");

    for (const type of organizationTypes) {
      const count = inserted.filter(
        (organization) =>
          organization.organizationType === type
      ).length;

      console.log(
        `${type.padEnd(14)} : ${count}`
      );
    }

    console.log("");

    console.log(
      "Demo organization password:",
      DEMO_PASSWORD
    );

    console.log("");
    console.log(
      "All demo organizations are marked VERIFIED."
    );

    console.log(
      "All demo organizations have GeoJSON mapLocation."
    );

    console.log("");
    console.log("======================================");
    console.log(" SEED COMPLETE");
    console.log("======================================");
    console.log("");

    await mongoose.disconnect();
  } catch (error) {
    console.error("");
    console.error("SEED FAILED");
    console.error(error);
    console.error("");

    await mongoose.disconnect();
    process.exit(1);
  }
}

seedNearbyDemo();