"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const reliefCategories = [
  {
    type: "relief_camp",
    icon: "⌂",
    title: "Relief Camps",
    description: "Shelter and temporary assistance",
    color: "bg-[#FFF0D9] text-[#A87530]",
  },
  {
    type: "ngo",
    icon: "♧",
    title: "Relief Organizations",
    description: "NGOs providing disaster support",
    color: "bg-[#EEE7FA] text-[#6C559B]",
  },
  {
    type: "hospital",
    icon: "✚",
    title: "Medical Relief",
    description: "Medical assistance and care",
    color: "bg-[#E5F2ED] text-[#397967]",
  },
];

const getCategoryName = (type) => {
  if (type === "relief_camp") return "Relief Camps";
  if (type === "ngo") return "Relief Organizations";
  if (type === "hospital") return "Medical Relief";
  return "Relief Support";
};

const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }

  return `${distanceKm.toFixed(1)} km away`;
};

export default function ReliefSupportPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState("loading");

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [organizations, setOrganizations] = useState([]);

  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("tetherToken");
    const storedUser = localStorage.getItem("tetherUser");

    if (!token || !storedUser) {
      router.replace("/auth");
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error("Unable to read saved user:", error);

      localStorage.removeItem("tetherToken");
      localStorage.removeItem("tetherUser");

      router.replace("/auth");
      return;
    }

    getLocation();
  }, [router]);

  const getLocation = () => {
    setLocationStatus("loading");
    setError("");

    if (!navigator.geolocation) {
      useSavedLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        };

        console.log(
          "📍 Relief current location:",
          currentLocation
        );

        setLocation(currentLocation);
        setLocationStatus("ready");
      },
      (geoError) => {
        console.warn(
          "Relief location unavailable:",
          geoError.message
        );

        useSavedLocation();
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  };

  const useSavedLocation = () => {
    try {
      const storedUser = localStorage.getItem("tetherUser");

      if (!storedUser) {
        setLocationStatus("error");
        setError("Unable to determine your location.");
        return;
      }

      const parsedUser = JSON.parse(storedUser);

      const savedLocation = parsedUser?.mapLocation;

      if (
        savedLocation?.coordinates &&
        savedLocation.coordinates.length === 2
      ) {
        const [longitude, latitude] =
          savedLocation.coordinates;

        const fallbackLocation = {
          latitude,
          longitude,
          accuracy: null,
        };

        console.log(
          "📍 Using saved relief location:",
          fallbackLocation
        );

        setLocation(fallbackLocation);
        setLocationStatus("ready");
        return;
      }

      setLocationStatus("error");
      setError(
        "Location is unavailable. Please allow location access and try again."
      );
    } catch (error) {
      console.error(
        "Unable to read saved location:",
        error
      );

      setLocationStatus("error");
      setError("Unable to determine your location.");
    }
  };

  const fetchReliefOrganizations = async (type) => {
    if (!location) {
      setError(
        "Your location is required to find nearby relief support."
      );
      return;
    }

    const token = localStorage.getItem("tetherToken");

    if (!token) {
      router.replace("/auth");
      return;
    }

    setSelectedCategory(type);
    setLoadingResults(true);
    setError("");
    setOrganizations([]);

    try {
      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        radius: "50000",
        type,
      });

      const url = `${API_URL}/api/nearby?${params.toString()}`;

      console.log("📍 Relief request:", url);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      console.log("📍 Relief response:", data);

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to find relief support."
        );
      }

      setOrganizations(data.organizations || []);
    } catch (error) {
      console.error(
        "Relief support error:",
        error
      );

      setError(
        error.message ||
          "Unable to load relief support."
      );
    } finally {
      setLoadingResults(false);
    }
  };

  const goBackToCategories = () => {
    setSelectedCategory(null);
    setOrganizations([]);
    setError("");
  };

  const handleNavigation = (item) => {
    if (item === "Home") {
      router.push("/home");
    }

    if (item === "SOS") {
      router.push("/home");
    }

    if (item === "Nearby") {
      router.push("/nearby");
    }

    if (item === "Community") {
      router.push("/community");
    }

    if (item === "Profile") {
      router.push("/profile");
    }
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FFFCF9]" />
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFCF9] pb-24 text-[#342B48]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-5 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-7 flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedCategory) {
                goBackToCategories();
              } else {
                router.push("/home");
              }
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4EDF8] text-lg text-[#6C559B] transition hover:bg-[#EDE3F3] active:scale-95"
            aria-label="Go back"
          >
            ←
          </button>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A87530]">
              TETHER support
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Relief Support
            </h1>
          </div>
        </header>

        {!selectedCategory ? (
          <>
            {/* Intro */}
            <section className="mb-6 rounded-[2rem] border border-[#F0E5D8] bg-[#FFF7EA] p-5 sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FBE7C8] text-xl text-[#A87530]">
                  ♡
                </div>

                <div>
                  <h2 className="text-lg font-bold text-[#60472A]">
                    Looking for support?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-[#8A6E4E]">
                    Choose the kind of assistance you need.
                    TETHER will look for verified organizations
                    near your current location.
                  </p>
                </div>
              </div>
            </section>

            {/* Categories */}
            <section>
              <div className="mb-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A91AC]">
                  Find assistance
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  What do you need?
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reliefCategories.map((category) => (
                  <button
                    key={category.type}
                    onClick={() =>
                      fetchReliefOrganizations(
                        category.type
                      )
                    }
                    disabled={
                      locationStatus !== "ready"
                    }
                    className="group flex w-full items-center gap-4 rounded-[1.6rem] border border-[#EEE6F1] bg-white p-4 text-left shadow-[0_6px_24px_rgba(75,55,100,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(75,55,100,0.08)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ${category.color}`}
                    >
                      {category.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[#4B405C]">
                        {category.title}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-[#9990A7]">
                        {category.description}
                      </p>
                    </div>

                    <span className="text-lg text-[#B2A9BC] transition group-hover:translate-x-1">
                      →
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Location status */}
            <section className="mt-6 rounded-[1.5rem] border border-[#EDE6F1] bg-white p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    locationStatus === "ready"
                      ? "bg-[#E5F2ED] text-[#397967]"
                      : "bg-[#F4EDF8] text-[#6C559B]"
                  }`}
                >
                  {locationStatus === "ready"
                    ? "✓"
                    : "⌖"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#51465F]">
                    {locationStatus === "ready"
                      ? "Location ready"
                      : "Finding your location..."}
                  </p>

                  <p className="mt-0.5 text-xs text-[#9A91AC]">
                    {locationStatus === "ready"
                      ? location?.accuracy
                        ? `Accuracy about ${location.accuracy} m`
                        : "Using your saved location"
                      : "Used only to find nearby support"}
                  </p>
                </div>

                <button
                  onClick={getLocation}
                  className="rounded-xl bg-[#F7F1FA] px-3 py-2 text-xs font-bold text-[#6C559B]"
                >
                  Refresh
                </button>
              </div>
            </section>

            {error && (
              <div className="mt-4 rounded-2xl bg-[#FBE2DC] p-4 text-sm font-medium text-[#8E2E27]">
                {error}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Results header */}
            <section className="mb-5 rounded-[2rem] bg-[#F7F1FA] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A80A3]">
                Nearby assistance
              </p>

              <div className="mt-2 flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">
                    {getCategoryName(
                      selectedCategory
                    )}
                  </h2>

                  <p className="mt-1 text-sm text-[#8A80A3]">
                    Verified organizations within 50 km
                  </p>
                </div>

                <button
                  onClick={goBackToCategories}
                  className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#6C559B] shadow-sm"
                >
                  Change
                </button>
              </div>
            </section>

            {/* Loading */}
            {loadingResults && (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-[1.6rem] border border-[#EEE6F1] bg-white p-5"
                  >
                    <div className="h-4 w-2/3 rounded bg-[#EEE6F1]" />
                    <div className="mt-3 h-3 w-1/3 rounded bg-[#F3EDF5]" />
                    <div className="mt-5 h-3 w-full rounded bg-[#F3EDF5]" />
                    <div className="mt-2 h-3 w-4/5 rounded bg-[#F3EDF5]" />
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {!loadingResults && error && (
              <div className="rounded-[1.6rem] bg-[#FBE2DC] p-5 text-sm text-[#8E2E27]">
                <p className="font-bold">
                  Could not find support
                </p>

                <p className="mt-1 leading-6">
                  {error}
                </p>

                <button
                  onClick={() =>
                    fetchReliefOrganizations(
                      selectedCategory
                    )
                  }
                  className="mt-4 rounded-xl bg-white px-4 py-2 text-xs font-bold text-[#8E2E27]"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Empty */}
            {!loadingResults &&
              !error &&
              organizations.length === 0 && (
                <div className="rounded-[2rem] border border-[#EEE6F1] bg-white p-7 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF0D9] text-2xl text-[#A87530]">
                    ⌂
                  </div>

                  <h3 className="mt-4 text-lg font-bold">
                    No verified support found nearby
                  </h3>

                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#948AA1]">
                    There are currently no verified
                    organizations of this type within
                    the search area.
                  </p>

                  <button
                    onClick={goBackToCategories}
                    className="mt-5 rounded-xl bg-[#6C559B] px-5 py-3 text-sm font-bold text-white"
                  >
                    Explore other support
                  </button>
                </div>
              )}

            {/* Results */}
            {!loadingResults &&
              !error &&
              organizations.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#665B75]">
                      {organizations.length} found
                    </p>

                    <span className="rounded-full bg-[#E5F2ED] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#397967]">
                      Verified only
                    </span>
                  </div>

                  <div className="space-y-3">
                    {organizations.map(
                      (organization) => (
                        <article
                          key={organization.id}
                          className="rounded-[1.6rem] border border-[#EEE6F1] bg-white p-5 shadow-[0_5px_20px_rgba(75,55,100,0.035)]"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF0D9] text-lg text-[#A87530]">
                              {selectedCategory ===
                              "hospital"
                                ? "✚"
                                : selectedCategory ===
                                    "ngo"
                                  ? "♧"
                                  : "⌂"}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold text-[#4B405C]">
                                  {
                                    organization.name
                                  }
                                </h3>

                                <span className="rounded-full bg-[#E5F2ED] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#397967]">
                                  Verified
                                </span>
                              </div>

                              <p className="mt-1 text-xs font-semibold text-[#6C559B]">
                                {formatDistance(
                                  organization.distanceKm
                                )}
                              </p>
                            </div>
                          </div>

                          {organization.address && (
                            <div className="mt-4 rounded-xl bg-[#FAF7FC] p-3">
                              <p className="text-xs leading-5 text-[#837990]">
                                {organization.address
                                  .addressLine &&
                                  `${organization.address.addressLine}, `}
                                {organization.address
                                  .villageOrCity &&
                                  `${organization.address.villageOrCity}, `}
                                {organization.address
                                  .district &&
                                  `${organization.address.district}, `}
                                {organization.address
                                  .state || ""}
                              </p>
                            </div>
                          )}

                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() =>
                                router.push(
                                  `/nearby?type=${selectedCategory}`
                                )
                              }
                              className="flex-1 rounded-xl bg-[#F4EDF8] px-3 py-2.5 text-xs font-bold text-[#6C559B]"
                            >
                              View nearby
                            </button>

                            <button
                              onClick={() =>
                              router.push(
                              `/organization/${organization.id}`
                            )
                          }
                        className="flex-1 rounded-xl bg-[#6C559B] px-3 py-2.5 text-xs font-bold text-white"
                        >
                      Open details
                        </button>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </section>
              )}
          </>
        )}
      </div>

      {/* Mobile bottom navigation */}
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
              onClick={() => handleNavigation(item)}
              className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold text-[#A49AB5] transition active:scale-95"
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