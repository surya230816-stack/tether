"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const typeLabels = {
  ngo: "NGO / Relief Organization",
  police: "Police / Emergency Services",
  hospital: "Hospital / Medical Center",
  relief_camp: "Relief Camp / Shelter",
  other: "Organization",
};

const availabilityLabels = {
  available: "Currently active",
  limited: "Limited availability",
  unavailable: "Currently unavailable",
};

function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined) {
    return null;
  }

  return `${distanceKm} km away`;
}

export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [organization, setOrganization] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadOrganization() {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("tetherToken");

        if (!token) {
          router.push("/auth");
          return;
        }

        const response = await fetch(
          `${API_URL}/api/organizations/${params.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Unable to load organization."
          );
        }

        setOrganization(data.organization);

        /*
         * Distance can be supplied later by the Relief Support
         * result. For now the public organization endpoint provides
         * the organization's location and information.
         */
        if (data.distanceKm !== undefined) {
          setDistanceKm(data.distanceKm);
        }
      } catch (err) {
        console.error("Organization details error:", err);

        setError(
          err.message ||
            "Unable to load organization details."
        );
      } finally {
        setLoading(false);
      }
    }

    if (params?.id) {
      loadOrganization();
    }
  }, [params?.id, router]);

  function getDirections() {
    if (!organization?.location?.coordinates) {
      return;
    }

    const [longitude, latitude] =
      organization.location.coordinates;

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  }

  function contactOrganization() {
    if (!organization?.contactPhone) {
      return;
    }

    window.location.href = `tel:${organization.contactPhone}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFFCF9] px-5 py-6 text-[#4A3B6B]">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => router.back()}
            className="mb-6 text-sm font-semibold text-[#8A80A3]"
          >
            ← Back
          </button>

          <div className="animate-pulse space-y-4">
            <div className="h-8 w-3/4 rounded-xl bg-[#F0E9F5]" />
            <div className="h-4 w-1/2 rounded-xl bg-[#F0E9F5]" />
            <div className="h-40 rounded-3xl bg-[#F0E9F5]" />
            <div className="h-32 rounded-3xl bg-[#F0E9F5]" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !organization) {
    return (
      <main className="min-h-screen bg-[#FFFCF9] px-5 py-6 text-[#4A3B6B]">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => router.back()}
            className="mb-6 text-sm font-semibold text-[#8A80A3]"
          >
            ← Back
          </button>

          <div className="rounded-3xl border border-red-100 bg-red-50 p-6">
            <h1 className="text-xl font-bold">
              Organization unavailable
            </h1>

            <p className="mt-2 text-sm leading-6 text-red-700">
              {error ||
                "This organization could not be found."}
            </p>

            <button
              onClick={() => router.push("/relief-support")}
              className="mt-5 rounded-2xl bg-[#4A3B6B] px-5 py-3 text-sm font-bold text-white"
            >
              Back to Relief Support
            </button>
          </div>
        </div>
      </main>
    );
  }

  const address = organization.address;

  const resources = Array.isArray(organization.resources)
    ? organization.resources
    : [];

  const services = Array.isArray(organization.services)
    ? organization.services
    : [];

  const hasHours =
    organization.operatingHours?.open &&
    organization.operatingHours?.close;

  return (
    <main className="min-h-screen bg-[#FFFCF9] pb-28 text-[#4A3B6B]">
      <div className="mx-auto w-full max-w-3xl px-5 py-6 sm:px-8">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="mb-6 text-sm font-semibold text-[#8A80A3] transition hover:text-[#4A3B6B]"
        >
          ← Back
        </button>

        {/* Header */}
        <section>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#F0E8F7] px-3 py-1 text-xs font-bold text-[#4A3B6B]">
              {typeLabels[organization.organizationType] ||
                "Organization"}
            </span>

            {organization.verificationStatus ===
              "verified" && (
              <span className="rounded-full bg-[#E8F4EF] px-3 py-1 text-xs font-bold text-[#3F806D]">
                ✓ Verified
              </span>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            {organization.name}
          </h1>

          {distanceKm !== null && (
            <p className="mt-2 text-sm text-[#8A80A3]">
              📍 {formatDistance(distanceKm)}
            </p>
          )}

          {organization.description && (
            <p className="mt-5 text-sm leading-7 text-[#6F6683]">
              {organization.description}
            </p>
          )}
        </section>

        {/* Availability */}
        <section className="mt-7 rounded-3xl border border-[#E8DFEF] bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8A80A3]">
            Availability
          </p>

          <div className="mt-3 flex items-center gap-3">
            <span
              className={`h-3 w-3 rounded-full ${
                organization.availabilityStatus ===
                "available"
                  ? "bg-[#5E9C8D]"
                  : organization.availabilityStatus ===
                    "limited"
                  ? "bg-[#D99A4E]"
                  : "bg-[#A8402F]"
              }`}
            />

            <p className="font-semibold">
              {availabilityLabels[
                organization.availabilityStatus
              ] || "Availability not specified"}
            </p>
          </div>

          {hasHours && (
            <p className="mt-3 text-sm text-[#8A80A3]">
              Hours: {organization.operatingHours.open} –{" "}
              {organization.operatingHours.close}
            </p>
          )}
        </section>

        {/* Resources */}
        {resources.length > 0 && (
          <section className="mt-5 rounded-3xl border border-[#E8DFEF] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">
              Available resources
            </h2>

            <div className="mt-4 space-y-3">
              {resources.map((resource, index) => (
                <div
                  key={`${resource.name}-${index}`}
                  className="flex items-center justify-between rounded-2xl bg-[#FAF7FC] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">•</span>

                    <div>
                      <p className="text-sm font-semibold">
                        {resource.name}
                      </p>

                      {resource.category && (
                        <p className="mt-0.5 text-xs text-[#8A80A3]">
                          {resource.category}
                        </p>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold ${
                      resource.available
                        ? "text-[#3F806D]"
                        : "text-[#A8402F]"
                    }`}
                  >
                    {resource.available
                      ? "Available"
                      : "Unavailable"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Services */}
        {services.length > 0 && (
          <section className="mt-5 rounded-3xl border border-[#E8DFEF] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">
              Services
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              {services.map((service, index) => (
                <span
                  key={`${service}-${index}`}
                  className="rounded-full bg-[#F0E8F7] px-3 py-2 text-xs font-semibold text-[#4A3B6B]"
                >
                  {service}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Location */}
        <section className="mt-5 rounded-3xl border border-[#E8DFEF] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">
            Location
          </h2>

          {address && (
            <div className="mt-4 text-sm leading-6 text-[#6F6683]">
              {address.addressLine && (
                <p>{address.addressLine}</p>
              )}

              <p>
                {[
                  address.villageOrCity,
                  address.district,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>

              <p>
                {[
                  address.state,
                  address.postalCode,
                ]
                  .filter(Boolean)
                  .join(" - ")}
              </p>
            </div>
          )}

          {organization.location?.coordinates && (
            <button
              onClick={getDirections}
              className="mt-5 w-full rounded-2xl border border-[#DCCFE7] bg-[#F8F3FB] px-5 py-3.5 text-sm font-bold text-[#4A3B6B] transition hover:bg-[#F0E8F7]"
            >
              Get Directions
            </button>
          )}
        </section>

        {/* Contact */}
        {organization.contactPhone && (
          <section className="mt-5 rounded-3xl border border-[#E8DFEF] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">
              Contact
            </h2>

            <p className="mt-2 text-sm text-[#8A80A3]">
              {organization.contactPhone}
            </p>

            <button
              onClick={contactOrganization}
              className="mt-4 w-full rounded-2xl bg-[#4A3B6B] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#392D55]"
            >
              Contact / Request Help
            </button>
          </section>
        )}
      </div>

      {/* Mobile bottom action */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E8DFEF] bg-[#FFFCF9]/95 p-3 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-3xl gap-2">
          <button
            onClick={() => router.push("/relief-support")}
            className="flex-1 rounded-2xl border border-[#DCCFE7] bg-white px-4 py-3 text-sm font-bold text-[#4A3B6B]"
          >
            Back
          </button>

          {organization.contactPhone && (
            <button
              onClick={contactOrganization}
              className="flex-1 rounded-2xl bg-[#4A3B6B] px-4 py-3 text-sm font-bold text-white"
            >
              Contact
            </button>
          )}
        </div>
      </div>
    </main>
  );
}