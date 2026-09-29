"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const quickActions = [
  {
    icon: "⌖",
    title: "Nearby Help",
    description: "Find help around you",
    color: "bg-[#E5F2ED] text-[#397967]",
  },
  {
    icon: "♧",
    title: "My Network",
    description: "Your trusted people",
    color: "bg-[#EEE7FA] text-[#6C559B]",
  },
  {
    icon: "◌",
    title: "Community",
    description: "Support and requests",
    color: "bg-[#FCE8EF] text-[#B65C7C]",
  },
  {
    icon: "⌂",
    title: "Relief Support",
    description: "Camps and resources",
    color: "bg-[#FFF0D9] text-[#A87530]",
  },
];

const recentActivities = [
  {
    icon: "✓",
    title: "Account created",
    description: "Your TETHER account is ready",
    time: "Recently",
    color: "bg-[#E5F2ED] text-[#397967]",
  },
  {
    icon: "⌖",
    title: "Safety network",
    description: "Nearby assistance will appear here",
    time: "Upcoming",
    color: "bg-[#EEE7FA] text-[#6C559B]",
  },
];

export default function HomePage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [currentSos, setCurrentSos] = useState(null);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosError, setSosError] = useState("");
  const [locationStatus, setLocationStatus] = useState("not_started");
  const [location, setLocation] = useState(null);
  const [activeNav, setActiveNav] = useState("Home");

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
    } finally {
      setLoading(false);
    }

    // Check if the user already has an active SOS in the database
    async function checkActiveSOS() {
      try {
        const response = await fetch(`${API_URL}/api/sos/active`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.active && data.sos) {
            setSosActive(true);
            setCurrentSos(data.sos);
            if (data.sos.location) {
              setLocation({
                latitude: data.sos.location.latitude,
                longitude: data.sos.location.longitude,
              });
              setLocationStatus("success");
            }
          }
        }
      } catch (err) {
        console.warn("Could not check active SOS status:", err);
      }
    }

    checkActiveSOS();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("tetherToken");
    localStorage.removeItem("tetherUser");
    router.replace("/auth");
  };

  const handleSOSConfirm = async () => {
    const token = localStorage.getItem("tetherToken");

    if (!token) {
      router.replace("/auth");
      return;
    }

    setSosLoading(true);
    setSosError("");

    const getCoordinates = () => {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          setLocationStatus("unavailable");
          resolve(null);
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

            setLocation(coords);
            setLocationStatus("success");
            resolve(coords);
          },
          (error) => {
            console.warn("Geolocation warning:", error.message);
            setLocationStatus("denied");
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 6000,
            maximumAge: 30000,
          }
        );
      });
    };

    let coords = await getCoordinates();

    if (!coords) {
      if (
        user?.mapLocation?.coordinates &&
        user.mapLocation.coordinates.length === 2
      ) {
        coords = {
          longitude: user.mapLocation.coordinates[0],
          latitude: user.mapLocation.coordinates[1],
        };

        setLocation(coords);
        setLocationStatus("fallback");
      } else {
        coords = {
          latitude: 16.5062,
          longitude: 80.648,
        };

        setLocation(coords);
        setLocationStatus("approximate");
      }
    }

    try {
      console.log("🚨 SOS STEP 1 — About to send request");
      console.log("🚨 SOS API URL:", `${API_URL}/api/sos`);
      console.log("🚨 SOS token exists:", Boolean(token));
      console.log("🚨 SOS coordinates:", coords);

      const response = await fetch(`${API_URL}/api/sos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      });

      console.log("🚨 SOS STEP 2 — Backend responded");
      console.log("🚨 Response status:", response.status);

      const data = await response.json();

      console.log("🚨 SOS STEP 3 — Response body:", data);

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to activate SOS."
        );
      }

      console.log("🚨 SOS STEP 4 — SOS successfully activated");

      setSosActive(true);
      setCurrentSos(data.sos);
      setShowSOSModal(false);
    } catch (err) {
      console.error("🚨 SOS ACTIVATION FAILED:", err);

      setSosError(
        err.message ||
          "Failed to connect to SOS dispatch server."
      );
    } finally {
      setSosLoading(false);
    }
  };
  const cancelSOS = async () => {
    const token = localStorage.getItem("tetherToken");
    if (!token) return;

    setSosLoading(true);
    setSosError("");

    try {
      const sosId = currentSos?.id || "active";
      const response = await fetch(`${API_URL}/api/sos/${sosId}/cancel`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok && response.status !== 404) {
        throw new Error(data.message || "Failed to cancel SOS.");
      }

      setSosActive(false);
      setCurrentSos(null);
      setLocationStatus("not_started");
      setLocation(null);
    } catch (err) {
      console.error("SOS cancellation error:", err);
      setSosError(err.message || "Could not cancel SOS on server.");
    } finally {
      setSosLoading(false);
    }
  };

  const handleNavigation = (item) => {
    setActiveNav(item);

    if (item === "Home") {
      router.push("/home");
    } else if (item === "SOS") {
      setShowSOSModal(true);
    } else if (item === "Profile") {
      router.push("/profile");
    } else if (item === "Nearby") {
      router.push("/nearby");
    } else if (item === "Community") {
      router.push("/community");
    }
  };

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFFCF9]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#E8DDF5] border-t-[#6C559B]" />
          <p className="text-sm text-[#8A80A3]">Preparing your safe space...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFCF9] text-[#342B48]">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-[#EEE7F2] bg-[#FFFCF9] px-6 py-8 lg:flex">
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

          <nav className="space-y-2">
            {["Home", "SOS", "Nearby", "Community", "Profile"].map(
              (item) => (
                <button
                  key={item}
                  onClick={() => handleNavigation(item)}
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
              )
            )}
          </nav>

          <div className="mt-auto rounded-3xl bg-[#F7F0FA] p-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#8A80A3]">
              TETHER promise
            </p>
            <p className="text-sm leading-6 text-[#635778]">
              No one should have to face an emergency alone.
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <section className="flex-1 px-5 pb-28 pt-6 sm:px-8 lg:px-12 lg:pb-10 lg:pt-10">
          {/* Header */}
          <header className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-sm text-[#9A91AC]">Your safe space</p>
              <h1 className="text-2xl font-bold tracking-tight text-[#342B48] sm:text-3xl">
                Hello, {user.name?.split(" ")[0] || "there"}.
              </h1>
              <p className="mt-2 text-sm text-[#8A80A3]">
                We’re here whenever you need us.
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-full border border-[#E9E1EF] px-4 py-2 text-xs font-semibold text-[#756A89] transition hover:bg-[#F7F0FA]"
            >
              Log out
            </button>
          </header>

          {/* Safety Status */}
          <section className="mb-6 rounded-[2rem] border border-[#E9E4F0] bg-white p-5 shadow-[0_8px_30px_rgba(74,59,107,0.04)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E5F2ED] text-lg text-[#397967]">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#4B405F]">
                    Safety status
                  </p>
                  <p className="mt-1 text-xs text-[#9A91AC]">
                    Your personal dashboard
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-[#E5F2ED] px-3 py-1.5 text-xs font-semibold text-[#397967]">
                Active
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#FAF7FC] p-4">
                <p className="text-xs text-[#9A91AC]">Account</p>
                <p className="mt-1 text-sm font-semibold capitalize text-[#514465]">
                  {user.accountType || "Individual"}
                </p>
              </div>

              <div className="rounded-2xl bg-[#FAF7FC] p-4">
                <p className="text-xs text-[#9A91AC]">Verification</p>
                <p className="mt-1 text-sm font-semibold capitalize text-[#514465]">
                  {user.verificationStatus?.replaceAll("_", " ") ||
                    "Not required"}
                </p>
              </div>
            </div>
          </section>

          {/* Emergency Area */}
          <section
            className={`relative mb-8 overflow-hidden rounded-[2rem] p-6 shadow-[0_12px_40px_rgba(168,64,47,0.08)] transition sm:p-8 ${
              sosActive
                ? "bg-[#8E2E27] text-white"
                : "bg-[#FFF0EC] text-[#63302B]"
            }`}
          >
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[25px] border-white/20" />
            <div className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full border-[22px] border-white/10" />

            <div className="relative z-10">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p
                    className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                      sosActive ? "text-white/70" : "text-[#B16D64]"
                    }`}
                  >
                    Emergency assistance
                  </p>
                  <h2
                    className={`mt-2 text-2xl font-bold ${
                      sosActive ? "text-white" : "text-[#63302B]"
                    }`}
                  >
                    {sosActive ? "SOS activated" : "Need help?"}
                  </h2>
                </div>

                <span
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    sosActive
                      ? "bg-white/15 text-white"
                      : "bg-white text-[#A8402F]"
                  }`}
                >
                  {sosActive ? "Active" : "Emergency"}
                </span>
              </div>

              <p
                className={`max-w-md text-sm leading-6 ${
                  sosActive ? "text-white/80" : "text-[#96635D]"
                }`}
              >
                {sosActive
                  ? "Your emergency state is active. Keep your phone accessible and move toward a safe place if possible."
                  : "Press the SOS button when you need urgent assistance. Your location can be used to coordinate help."}
              </p>

              <div className="mt-7 flex flex-col items-center">
                <button
                  onClick={() =>
                    sosActive ? cancelSOS() : setShowSOSModal(true)
                  }
                  disabled={sosLoading}
                  className={`group relative flex h-40 w-40 items-center justify-center rounded-full border-[10px] transition hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 sm:h-48 sm:w-48 ${
                    sosActive
                      ? "animate-pulse border-white/20 bg-white text-[#8E2E27]"
                      : "border-[#F8D5CD] bg-[#A8402F] text-white shadow-[0_0_0_12px_rgba(168,64,47,0.06)]"
                  }`}
                >
                  <span className="text-center">
                    <span className="block text-4xl font-black tracking-tight">
                      {sosLoading ? "..." : "SOS"}
                    </span>
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
                      {sosLoading
                        ? "Please wait"
                        : sosActive
                          ? "Cancel SOS"
                          : "Press for help"}
                    </span>
                  </span>
                </button>

                <p
                  className={`mt-5 text-center text-xs ${
                    sosActive ? "text-white/70" : "text-[#B16D64]"
                  }`}
                >
                  {sosLoading
                    ? "Communicating with emergency network..."
                    : sosActive
                      ? "Tap to cancel active SOS emergency broadcast"
                      : "Only activate SOS when you need emergency assistance"}
                </p>
              </div>

              {sosError && (
                <div className="mt-5 rounded-2xl bg-red-100 p-4 text-xs font-semibold text-red-800">
                  {sosError}
                </div>
              )}

              {sosActive && (
                <div className="mt-6 rounded-2xl bg-white/10 p-4 text-left backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b border-white/15 pb-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      SOS Transmitted to Network
                    </div>
                    {currentSos?.id && (
                      <span className="rounded bg-black/20 px-2 py-0.5 text-[11px] font-mono tracking-wider">
                        ID: {currentSos.id.slice(-6)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 text-xs">
                    {location && (
                      <p className="text-white/90">
                        <span className="font-semibold text-white">Coordinates:</span>{" "}
                        {typeof location.latitude === "number"
                          ? location.latitude.toFixed(4)
                          : location.latitude}
                        ,{" "}
                        {typeof location.longitude === "number"
                          ? location.longitude.toFixed(4)
                          : location.longitude}
                      </p>
                    )}
                    <p className="text-white/70">
                      {locationStatus === "requesting" &&
                        "Requesting device location..."}
                      {locationStatus === "success" &&
                        "GPS location verified and saved in database."}
                      {locationStatus === "approximate" &&
                        "Approximate regional coordinates assigned."}
                      {locationStatus === "fallback" &&
                        "Using profile registered location coordinates."}
                      {locationStatus === "denied" &&
                        "Location permission denied; fallback location dispatched."}
                      {locationStatus === "unavailable" &&
                        "Location unavailable; fallback location dispatched."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="mb-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A49AB5]">
                  Explore
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#342B48]">
                  Quick actions
                </h2>
              </div>
              <span className="text-xs text-[#B0A7BC]">Your essentials</span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickActions.map((action) => (
                <button
                  key={action.title}
                  onClick={() => {
                    if (action.title === "Nearby Help") {
                      router.push("/nearby");
                    } else if (action.title === "Community") {
                      router.push("/community");
                    } else if (action.title === "My Network") {
                      router.push("/profile");
                    } else {
                      router.push("/nearby");
                    }
                  }}
                  className="rounded-3xl border border-[#EEE7F2] bg-white p-4 text-left transition hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(74,59,107,0.06)]"
                >
                  <div
                    className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${action.color}`}
                  >
                    {action.icon}
                  </div>
                  <h3 className="text-sm font-bold text-[#514465]">
                    {action.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-[#A097B1]">
                    {action.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Nearby Preview */}
          <section className="mb-8 rounded-[2rem] border border-[#EEE7F2] bg-white p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A49AB5]">
                  Around you
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#342B48]">
                  Nearby assistance
                </h2>
              </div>

              <button
                onClick={() => router.push("/nearby")}
                className="text-xs font-semibold text-[#6C559B] hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="flex items-center gap-4 rounded-2xl bg-[#F7F0FA] p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E9DDF6] text-xl text-[#6C559B]">
                ⌖
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[#514465]">
                  Discover nearby help
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#9185A6]">
                  Hospitals, police stations, relief camps and trusted
                  organizations will be available here.
                </p>
              </div>
              <span className="text-[#A49AB5]">›</span>
            </div>
          </section>

          {/* Recent Activity */}
          <section className="mb-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A49AB5]">
                  Timeline
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#342B48]">
                  Recent activity
                </h2>
              </div>
            </div>

            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.title}
                  className="flex items-center gap-4 rounded-2xl border border-[#F0EAF4] bg-white p-4"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${activity.color}`}
                  >
                    {activity.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[#514465]">
                      {activity.title}
                    </h3>
                    <p className="mt-1 text-xs text-[#9A91AC]">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#B0A7BC]">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Account Summary */}
          <section className="rounded-[2rem] bg-[#F7F0FA] p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E9DDF6] text-lg text-[#6C559B]">
                ○
              </div>
              <div>
                <h2 className="text-base font-bold text-[#514465]">
                  Your account
                </h2>
                <p className="text-xs text-[#9A91AC]">
                  Basic account information
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-[#EDE3F3] pb-3">
                <span className="text-[#9A91AC]">Name</span>
                <span className="text-right font-medium text-[#5B4D70]">
                  {user.name}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-[#EDE3F3] pb-3">
                <span className="text-[#9A91AC]">Email</span>
                <span className="max-w-[65%] break-all text-right font-medium text-[#5B4D70]">
                  {user.email}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-[#9A91AC]">Role</span>
                <span className="font-medium capitalize text-[#5B4D70]">
                  {user.role || "User"}
                </span>
              </div>
            </div>
          </section>
        </section>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#EDE6F1] bg-[#FFFCF9]/95 px-3 py-3 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {["Home", "SOS", "Nearby", "Community", "Profile"].map((item) => (
            <button
              key={item}
              onClick={() => handleNavigation(item)}
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

      {/* SOS Confirmation Modal */}
      {showSOSModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#241B35]/60 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[2rem] bg-[#FFFCF9] p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FBE2DC] text-xl text-[#A8402F]">
                !
              </div>
              <button
                onClick={() => setShowSOSModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F7F0FA] text-[#8A80A3]"
              >
                ✕
              </button>
            </div>

            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#A8402F]">
              Emergency confirmation
            </p>

            <h2 className="text-2xl font-bold text-[#342B48]">
              Do you need immediate help?
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#8A80A3]">
              Activating SOS will begin the emergency workflow on this device.
              Location permission may be requested to help identify your
              position.
            </p>

            <div className="mt-5 rounded-2xl bg-[#FFF0EC] p-4 text-xs leading-5 text-[#96635D]">
              Only activate SOS when you are facing an emergency. If you are
              in immediate danger, contact your local emergency services too.
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowSOSModal(false)}
                disabled={sosLoading}
                className="rounded-2xl border border-[#E9E1EF] px-4 py-3 text-sm font-semibold text-[#756A89] transition hover:bg-[#F7F0FA] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSOSConfirm}
                disabled={sosLoading}
                className="rounded-2xl bg-[#A8402F] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#91372A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sosLoading ? "Activating..." : "Activate SOS"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}