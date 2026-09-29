"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const categories = [
  {
    key: "all",
    label: "All",
    icon: "⌖",
  },
  {
    key: "hospital",
    label: "Hospitals",
    icon: "🏥",
  },
  {
    key: "police",
    label: "Police",
    icon: "👮",
  },
  {
    key: "ngo",
    label: "NGOs",
    icon: "🤝",
  },
  {
    key: "relief_camp",
    label: "Relief Camps",
    icon: "🏕️",
  },
];

const categoryInfo = {
  hospital: {
    label: "Hospital",
    icon: "🏥",
    bg: "bg-[#E8F3F0]",
    text: "text-[#397967]",
  },

  police: {
    label: "Police",
    icon: "👮",
    bg: "bg-[#E9EFF8]",
    text: "text-[#506B91]",
  },

  ngo: {
    label: "NGO",
    icon: "🤝",
    bg: "bg-[#F5EAF8]",
    text: "text-[#79538D]",
  },

  relief_camp: {
    label: "Relief Camp",
    icon: "🏕️",
    bg: "bg-[#FFF0D9]",
    text: "text-[#A87530]",
  },

  other: {
    label: "Organization",
    icon: "⌂",
    bg: "bg-[#EEE7FA]",
    text: "text-[#6C559B]",
  },
};

export default function NearbyPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);

  const [organizations, setOrganizations] = useState([]);

  const [selectedType, setSelectedType] = useState("all");

  const [location, setLocation] = useState(null);

  const [locationStatus, setLocationStatus] =
    useState("loading");

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [activeNav, setActiveNav] = useState("Nearby");

  /*
    Load the logged-in user and start location detection.
  */

  useEffect(() => {
    const token =
      localStorage.getItem("tetherToken");

    const storedUser =
      localStorage.getItem("tetherUser");

    if (!token || !storedUser) {
      router.replace("/auth");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      setUser(parsedUser);

      getUserLocation(parsedUser);
    } catch (error) {
      console.error(
        "Unable to read saved user:",
        error
      );

      localStorage.removeItem("tetherToken");
      localStorage.removeItem("tetherUser");

      router.replace("/auth");
    }
  }, [router]);

  /*
    Get the current browser location.

    If browser location is unavailable/denied,
    fall back to the organization's/user's saved
    GeoJSON mapLocation if one exists.
  */

  const getUserLocation = (storedUser) => {
    if (!navigator.geolocation) {
      useSavedLocation(storedUser);
      return;
    }

    setLocationStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        console.log(
          "📍 Nearby current location:",
          coords
        );

        setLocation(coords);
        setLocationStatus("success");
      },

      (geoError) => {
        console.warn(
          "Nearby location warning:",
          geoError.message
        );

        useSavedLocation(storedUser);
      },

      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30000,
      }
    );
  };

  /*
    Fallback to the user's saved mapLocation.
  */

  const useSavedLocation = (storedUser) => {
    const savedCoordinates =
      storedUser?.mapLocation?.coordinates;

    if (
      Array.isArray(savedCoordinates) &&
      savedCoordinates.length === 2
    ) {
      const fallbackLocation = {
        longitude: savedCoordinates[0],
        latitude: savedCoordinates[1],
      };

      console.log(
        "📍 Nearby using saved location:",
        fallbackLocation
      );

      setLocation(fallbackLocation);
      setLocationStatus("fallback");

      return;
    }

    setLocationStatus("denied");
    setLoading(false);

    setError(
      "Location access is needed to find help near you."
    );
  };

  /*
    Fetch nearby organizations whenever:
    - location changes
    - category changes
  */

  useEffect(() => {
    if (!location) return;

    fetchNearbyOrganizations();
  }, [location, selectedType]);

  const fetchNearbyOrganizations = async () => {
    const token =
      localStorage.getItem("tetherToken");

    if (!token) {
      router.replace("/auth");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),

        /*
          Backend caps this at 50 km.
          50 km makes the demo useful because
          Guntur/Vijayawada/nearby seeded locations
          can be seen when appropriate.
        */

        radius: "50000",

        type: selectedType,
      });

      console.log(
        "📍 Nearby request:",
        `${API_URL}/api/nearby?${params.toString()}`
      );

      const response = await fetch(
        `${API_URL}/api/nearby?${params.toString()}`,
        {
          method: "GET",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      console.log(
        "📍 Nearby response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to find nearby organizations."
        );
      }

      setOrganizations(
        Array.isArray(data.organizations)
          ? data.organizations
          : []
      );
    } catch (err) {
      console.error(
        "Nearby organizations error:",
        err
      );

      setError(
        err.message ||
          "Unable to load nearby assistance."
      );

      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  /*
    Retry browser location.
  */

  const retryLocation = () => {
    if (!navigator.geolocation) {
      setError(
        "Your browser does not support location services."
      );

      return;
    }

    setError("");
    setLoading(true);
    setLocationStatus("requesting");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setLocation(coords);
        setLocationStatus("success");
      },

      (geoError) => {
        console.warn(
          "Location retry failed:",
          geoError.message
        );

        setLocationStatus("denied");
        setLoading(false);

        setError(
          "Location permission was not available."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  };

  /*
    Navigation
  */

  const handleNavigation = (item) => {
    setActiveNav(item);

    if (item === "Home") {
      router.push("/home");
    } else if (item === "SOS") {
      router.push("/home");
    } else if (item === "Nearby") {
      router.push("/nearby");
    } else if (item === "Community") {
      router.push("/community");
    } else if (item === "Profile") {
      router.push("/profile");
    }
  };

  /*
    Format organization type.
  */

  const getCategoryInfo = (type) => {
    return (
      categoryInfo[type] ||
      categoryInfo.other
    );
  };

  /*
    Location status text
  */

  const getLocationText = () => {
    if (locationStatus === "requesting") {
      return "Finding your location...";
    }

    if (locationStatus === "success") {
      return "Using your current location";
    }

    if (locationStatus === "fallback") {
      return "Using your saved location";
    }

    if (locationStatus === "denied") {
      return "Location unavailable";
    }

    return "Preparing nearby search...";
  };

  /*
    Loading screen
  */

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFCF9]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#E8DDF5] border-t-[#6C559B]" />

          <p className="text-sm text-[#8A80A3]">
            Finding nearby help...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFCF9] text-[#342B48]">
      <div className="mx-auto flex min-h-screen max-w-7xl">

        {/* =====================================================
            DESKTOP SIDEBAR
        ====================================================== */}

        <aside className="hidden w-64 flex-col border-r border-[#EEE7F2] bg-[#FFFCF9] px-6 py-8 lg:flex">

          {/* Logo */}

          <div className="mb-12">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4A3B6B] text-lg text-white">
                ⌁
              </div>

              <span className="text-xl font-bold tracking-tight text-[#4A3B6B]">
                TETHER
              </span>
            </div>

            <p className="pl-1 text-xs text-[#9A91AC]">
              Here. Near. Within Reach.
            </p>
          </div>

          {/* Navigation */}

          <nav className="space-y-2">
            {[
              "Home",
              "SOS",
              "Nearby",
              "Community",
              "Profile",
            ].map((item) => (
              <button
                key={item}
                onClick={() =>
                  handleNavigation(item)
                }
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  activeNav === item
                    ? "bg-[#EEE7FA] text-[#5E478C]"
                    : "text-[#8A80A3] hover:bg-[#F7F0FA]"
                }`}
              >
                <span className="w-5 text-center">
                  {item === "Home" && "⌂"}
                  {item === "SOS" && "✦"}
                  {item === "Nearby" && "⌖"}
                  {item === "Community" && "◌"}
                  {item === "Profile" && "○"}
                </span>

                {item}
              </button>
            ))}
          </nav>

          {/* Promise */}

          <div className="mt-auto rounded-3xl bg-[#F7F0FA] p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A80A3]">
              TETHER promise
            </p>

            <p className="text-sm leading-6 text-[#635778]">
              No one should have to face an emergency alone.
            </p>
          </div>
        </aside>

        {/* =====================================================
            MAIN CONTENT
        ====================================================== */}

        <section className="flex-1 px-5 pb-28 pt-6 sm:px-8 lg:px-12 lg:pb-10 lg:pt-10">

          {/* Header */}

          <header className="mb-7">
            <p className="mb-1 text-sm text-[#9A91AC]">
              Help around you
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-[#342B48]">
                  Nearby
                </h1>

                <p className="mt-2 max-w-xl text-sm leading-6 text-[#8A80A3]">
                  Find verified hospitals, police,
                  NGOs and relief camps close to you.
                </p>
              </div>

              {/* Location status */}

              <div className="flex items-center gap-2 rounded-full border border-[#E9E1EF] bg-white px-4 py-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    locationStatus === "success"
                      ? "bg-[#5E9C8D]"
                      : locationStatus === "fallback"
                      ? "bg-[#D99A4E]"
                      : "bg-[#B8AFC2]"
                  }`}
                />

                <span className="text-xs font-medium text-[#756A89]">
                  {getLocationText()}
                </span>
              </div>
            </div>
          </header>

          {/* =====================================================
              LOCATION CARD
          ====================================================== */}

          <section className="mb-6 overflow-hidden rounded-[2rem] border border-[#E9E3EF] bg-white shadow-[0_8px_30px_rgba(74,59,107,0.04)]">

            <div className="bg-gradient-to-br from-[#EEE7FA] via-[#F6F0FA] to-[#E8F3F0] p-5 sm:p-6">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                    📍
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-[#4B405F]">
                      Your search area
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#8A80A3]">
                      {location
                        ? `${location.latitude.toFixed(
                            4
                          )}, ${location.longitude.toFixed(
                            4
                          )}`
                        : "Location not available"}
                    </p>

                    {location?.accuracy && (
                      <p className="mt-1 text-[11px] text-[#A49AB5]">
                        Accuracy approximately{" "}
                        {Math.round(
                          location.accuracy
                        )}
                        m
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={retryLocation}
                  className="rounded-2xl border border-white bg-white px-4 py-2.5 text-xs font-semibold text-[#5E478C] shadow-sm transition hover:bg-[#F7F0FA]"
                >
                  Refresh location
                </button>
              </div>
            </div>
          </section>

          {/* =====================================================
              CATEGORY FILTERS
          ====================================================== */}

          <section className="mb-7">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#4B405F]">
                  What do you need?
                </p>

                <p className="mt-1 text-xs text-[#9A91AC]">
                  Filter the help available nearby.
                </p>
              </div>

              {!loading && !error && (
                <span className="text-xs font-medium text-[#9A91AC]">
                  {organizations.length} found
                </span>
              )}
            </div>

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
              {categories.map((category) => {
                const selected =
                  selectedType === category.key;

                return (
                  <button
                    key={category.key}
                    onClick={() =>
                      setSelectedType(
                        category.key
                      )
                    }
                    className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-semibold transition ${
                      selected
                        ? "border-[#6C559B] bg-[#EEE7FA] text-[#5E478C]"
                        : "border-[#E9E1EF] bg-white text-[#8A80A3] hover:bg-[#F7F0FA]"
                    }`}
                  >
                    <span className="text-base">
                      {category.icon}
                    </span>

                    {category.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* =====================================================
              ERROR
          ====================================================== */}

          {error && (
            <section className="mb-6 rounded-[2rem] border border-[#F1D8D2] bg-[#FFF7F5] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FBE2DC] text-[#A8402F]">
                  !
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#7F392E]">
                    Nearby search unavailable
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#9A6259]">
                    {error}
                  </p>

                  <button
                    onClick={retryLocation}
                    className="mt-3 rounded-xl bg-[#A8402F] px-3 py-2 text-xs font-semibold text-white"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* =====================================================
              LOADING
          ====================================================== */}

          {loading && !error && (
            <section className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-[2rem] border border-[#EEE7F2] bg-white p-5"
                  >
                    <div className="flex gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-[#F0EBF5]" />

                      <div className="flex-1">
                        <div className="mb-2 h-4 w-3/4 rounded bg-[#F0EBF5]" />

                        <div className="mb-2 h-3 w-1/2 rounded bg-[#F5F1F7]" />

                        <div className="h-3 w-1/3 rounded bg-[#F5F1F7]" />
                      </div>
                    </div>
                  </div>
                )
              )}
            </section>
          )}

          {/* =====================================================
              NO RESULTS
          ====================================================== */}

          {!loading &&
            !error &&
            organizations.length === 0 && (
              <section className="rounded-[2rem] border border-[#E9E1EF] bg-white p-8 text-center shadow-[0_8px_30px_rgba(74,59,107,0.03)]">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F7F0FA] text-2xl">
                  ⌖
                </div>

                <h2 className="text-lg font-bold text-[#4B405F]">
                  Nothing nearby yet
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#9A91AC]">
                  We couldn't find a verified{" "}
                  {selectedType === "all"
                    ? "organization"
                    : getCategoryInfo(
                        selectedType
                      ).label.toLowerCase()}{" "}
                  within the current search area.
                </p>

                {selectedType !== "all" && (
                  <button
                    onClick={() =>
                      setSelectedType("all")
                    }
                    className="mt-5 rounded-2xl bg-[#6C559B] px-5 py-3 text-xs font-semibold text-white"
                  >
                    Show all nearby help
                  </button>
                )}
              </section>
            )}

          {/* =====================================================
              ORGANIZATION RESULTS
          ====================================================== */}

          {!loading &&
            !error &&
            organizations.length > 0 && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#4B405F]">
                      Nearby assistance
                    </h2>

                    <p className="mt-1 text-xs text-[#9A91AC]">
                      Results are sorted by distance.
                    </p>
                  </div>

                  <span className="rounded-full bg-[#E5F2ED] px-3 py-1.5 text-[11px] font-semibold text-[#397967]">
                    Verified only
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  {organizations.map(
                    (organization) => {
                      const info =
                        getCategoryInfo(
                          organization.organizationType
                        );

                      return (
                        <article
                          key={organization.id}
                          className="group rounded-[2rem] border border-[#E9E3EF] bg-white p-5 shadow-[0_8px_30px_rgba(74,59,107,0.035)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(74,59,107,0.07)]"
                        >
                          <div className="flex items-start gap-4">

                            {/* Icon */}

                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${info.bg} ${info.text}`}
                            >
                              {info.icon}
                            </div>

                            {/* Main */}

                            <div className="min-w-0 flex-1">

                              <div className="flex items-start justify-between gap-3">

                                <div className="min-w-0">
                                  <h3 className="truncate text-sm font-bold text-[#4B405F]">
                                    {organization.name}
                                  </h3>

                                  <p
                                    className={`mt-1 text-[11px] font-semibold ${info.text}`}
                                  >
                                    {info.label}
                                  </p>
                                </div>

                                {/* Distance */}

                                <div className="shrink-0 rounded-xl bg-[#F7F0FA] px-2.5 py-1.5 text-right">
                                  <p className="text-xs font-bold text-[#5E478C]">
                                    {
                                      organization.distanceKm
                                    }{" "}
                                    km
                                  </p>

                                  <p className="text-[9px] text-[#A49AB5]">
                                    away
                                  </p>
                                </div>
                              </div>

                              {/* Address */}

                              <div className="mt-4 flex items-start gap-2">
                                <span className="mt-0.5 text-xs">
                                  📍
                                </span>

                                <p className="text-xs leading-5 text-[#8A80A3]">
                                  {organization
                                    .address
                                    ?.addressLine ||
                                    "Address available in profile"}
                                  {organization
                                    .address
                                    ?.villageOrCity
                                    ? `, ${organization.address.villageOrCity}`
                                    : ""}
                                </p>
                              </div>

                              {/* Verification */}

                              <div className="mt-4 flex items-center gap-2 border-t border-[#F0EBF3] pt-4">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#E5F2ED] text-[10px] font-bold text-[#397967]">
                                  ✓
                                </span>

                                <span className="text-[11px] font-medium text-[#7B708C]">
                                  Verified TETHER organization
                                </span>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}

                </div>
              </section>
            )}

          {/* =====================================================
              SEARCH INFO
          ====================================================== */}

          {!loading &&
            !error &&
            location && (
              <section className="mt-7 rounded-[2rem] border border-[#E9E1EF] bg-[#F7F0FA] p-5">
                <div className="flex items-start gap-3">
                  <div className="text-lg">
                    ✦
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#635778]">
                      About your nearby results
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-[#9A91AC]">
                      TETHER is using your location
                      to search a maximum radius of
                      50 km. Organizations are
                      returned from the verified
                      organization directory and
                      ordered by geographic distance.
                    </p>
                  </div>
                </div>
              </section>
            )}

        </section>
      </div>

      {/* =====================================================
          MOBILE BOTTOM NAVIGATION
      ====================================================== */}

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#EDE6F1] bg-[#FFFCF9]/95 px-3 py-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">

          {[
            "Home",
            "SOS",
            "Nearby",
            "Community",
            "Profile",
          ].map((item) => (
            <button
              key={item}
              onClick={() =>
                handleNavigation(item)
              }
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition ${
                activeNav === item
                  ? "text-[#6C559B]"
                  : "text-[#A49AB5]"
              }`}
            >
              <span className="text-lg">
                {item === "Home" && "⌂"}
                {item === "SOS" && "✦"}
                {item === "Nearby" && "⌖"}
                {item === "Community" && "◌"}
                {item === "Profile" && "○"}
              </span>

              {item}
            </button>
          ))}

        </div>
      </nav>
    </main>
  );
}