"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const ORGANIZATION_TYPES = {
  ngo: "NGO",
  police: "Police",
  hospital: "Hospital",
  relief_camp: "Relief Camp",
  other: "Organization",
};

const EMPTY_FORM = {
  organizationName: "",
  description: "",
  contactPhone: "",

  addressLine: "",
  villageOrCity: "",
  district: "",
  state: "",
  postalCode: "",

  services: [],

  resources: [],

  open: "",
  close: "",

  availabilityStatus: "available",
};

export default function OrganizationDashboard() {
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [newService, setNewService] = useState("");
  const [newResource, setNewResource] = useState("");
  const [newResourceCategory, setNewResourceCategory] =
    useState("general");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [review, setReview] = useState(null);

  // ==========================================
  // AUTH
  // ==========================================

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("tetherToken");
      const storedUser = localStorage.getItem("tetherUser");

      if (!storedToken) {
        router.replace("/auth");
        return;
      }

      const parsedUser = storedUser
        ? JSON.parse(storedUser)
        : null;

      if (
        parsedUser &&
        parsedUser.accountType &&
        parsedUser.accountType !== "organization"
      ) {
        router.replace("/home");
        return;
      }

      setToken(storedToken);
      setUser(parsedUser);
    } catch (err) {
      console.error("Organization auth error:", err);
      router.replace("/auth");
    }
  }, [router]);

  // ==========================================
  // LOAD ORGANIZATION
  // ==========================================

  useEffect(() => {
    if (!token) return;

    loadOrganization();
  }, [token]);

  async function loadOrganization() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/organizations/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to load organization profile."
        );
      }

      const organization = data.organization;

      setUser(organization);

      const address =
        organization.defaultAddress || {};

      const hours =
        organization.operatingHours || {};

      setForm({
        organizationName:
          organization.organizationName ||
          organization.name ||
          "",

        description:
          organization.description || "",

        contactPhone:
          organization.contactPhone ||
          organization.phone ||
          "",

        addressLine:
          address.addressLine || "",

        villageOrCity:
          address.villageOrCity || "",

        district:
          address.district || "",

        state:
          address.state || "",

        postalCode:
          address.postalCode || "",

        services:
          Array.isArray(organization.services)
            ? organization.services
            : [],

        resources:
          Array.isArray(organization.resources)
            ? organization.resources
            : [],

        open: hours.open || "",

        close: hours.close || "",

        availabilityStatus:
          organization.availabilityStatus ||
          "available",
      });

      await loadReview();
    } catch (err) {
      console.error("Load organization error:", err);
      setError(
        err.message ||
          "Unable to load organization profile."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // REVIEW / 3-DAY REMINDER
  // ==========================================

  async function loadReview() {
    try {
      const response = await fetch(
        `${API_URL}/api/organizations/me/review`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setReview(data);
      }
    } catch (err) {
      console.error("Review check error:", err);
    }
  }

  // ==========================================
  // FORM HELPERS
  // ==========================================

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // ==========================================
  // SERVICES
  // ==========================================

  function addService() {
    const service = newService.trim();

    if (!service) return;

    const alreadyExists = form.services.some(
      (item) =>
        item.toLowerCase() === service.toLowerCase()
    );

    if (alreadyExists) {
      setNewService("");
      return;
    }

    setForm((current) => ({
      ...current,
      services: [...current.services, service],
    }));

    setNewService("");
  }

  function removeService(index) {
    setForm((current) => ({
      ...current,
      services: current.services.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  // ==========================================
  // RESOURCES
  // ==========================================

  function addResource() {
    const name = newResource.trim();

    if (!name) return;

    setForm((current) => ({
      ...current,
      resources: [
        ...current.resources,
        {
          name,
          category:
            newResourceCategory.trim() || "general",
          available: true,
        },
      ],
    }));

    setNewResource("");
    setNewResourceCategory("general");
  }

  function removeResource(index) {
    setForm((current) => ({
      ...current,
      resources: current.resources.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  }

  function toggleResource(index) {
    setForm((current) => ({
      ...current,
      resources: current.resources.map(
        (resource, itemIndex) =>
          itemIndex === index
            ? {
                ...resource,
                available: !resource.available,
              }
            : resource
      ),
    }));
  }

  // ==========================================
  // SAVE
  // ==========================================

  async function saveProfile(event) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        organizationName:
          form.organizationName.trim(),

        description:
          form.description.trim(),

        contactPhone:
          form.contactPhone.trim(),

        defaultAddress: {
          addressLine:
            form.addressLine.trim(),

          villageOrCity:
            form.villageOrCity.trim(),

          district:
            form.district.trim(),

          state:
            form.state.trim(),

          postalCode:
            form.postalCode.trim(),
        },

        services: form.services,

        resources: form.resources,

        operatingHours: {
          open: form.open,
          close: form.close,
        },

        availabilityStatus:
          form.availabilityStatus,
      };

      const response = await fetch(
        `${API_URL}/api/organizations/me`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to save organization profile."
        );
      }

      setSuccess(
        "Organization information updated successfully."
      );

      setUser(data.organization);

      await loadReview();
    } catch (err) {
      console.error("Save organization error:", err);

      setError(
        err.message ||
          "Unable to save organization profile."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // PROFILE COMPLETION
  // ==========================================

  const completion = useMemo(() => {
    const checks = [
      form.organizationName.trim(),
      form.description.trim(),
      form.contactPhone.trim(),
      form.addressLine.trim(),
      form.villageOrCity.trim(),
      form.district.trim(),
      form.state.trim(),
      form.services.length > 0,
      form.resources.length > 0,
      form.open && form.close,
    ];

    const completed = checks.filter(Boolean).length;

    return Math.round(
      (completed / checks.length) * 100
    );
  }, [form]);

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <main className="min-h-dvh bg-[#FFFCF9] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#D9C9F0] border-t-[#4A3B6B]" />

          <p className="text-sm text-[#6F6878]">
            Loading organization dashboard...
          </p>
        </div>
      </main>
    );
  }

  // ==========================================
  // MAIN UI
  // ==========================================

  return (
    <main className="min-h-dvh bg-[#FFFCF9] text-[#2F2936]">
      {/* ================= HEADER ================= */}

      <header className="sticky top-0 z-30 border-b border-[#EEE7F1] bg-[#FFFCF9]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-[#5B5065]"
          >
            <span className="text-xl">←</span>
            Back
          </button>

          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9A90A1]">
              TETHER
            </p>

            <p className="text-sm font-semibold text-[#4A3B6B]">
              Organization
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6">
        {/* ================= TITLE ================= */}

        <section className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {form.organizationName ||
                    "Organization Dashboard"}
                </h1>

                {user?.verificationStatus ===
                  "verified" && (
                  <span className="rounded-full bg-[#E4F4EE] px-3 py-1 text-xs font-semibold text-[#397B67]">
                    ✓ Verified
                  </span>
                )}
              </div>

              <p className="max-w-xl text-sm leading-6 text-[#756D7C]">
                Keep your operational information
                accurate so people can find the right
                help when they need it.
              </p>
            </div>
          </div>
        </section>

        {/* ================= REMINDER ================= */}

        {review?.reminderDue && (
          <section className="mb-5 rounded-2xl border border-[#E9DCC4] bg-[#FFF8E9] p-4">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5E4BD] text-lg">
                ↻
              </div>

              <div>
                <h2 className="font-semibold text-[#59472A]">
                  Time to review your information
                </h2>

                <p className="mt-1 text-sm leading-5 text-[#776548]">
                  Please check your services,
                  resources and availability. Keeping
                  this information current helps people
                  know what support is actually available.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ================= SUCCESS / ERROR ================= */}

        {success && (
          <div className="mb-5 rounded-2xl border border-[#CBE8DC] bg-[#EFFAF5] px-4 py-3 text-sm text-[#397B67]">
            ✓ {success}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-[#F0D0D0] bg-[#FFF4F4] px-4 py-3 text-sm text-[#9A4141]">
            {error}
          </div>
        )}

        {/* ================= COMPLETION ================= */}

        <section className="mb-6 rounded-3xl border border-[#EAE3ED] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#4A3B6B]">
                Profile completeness
              </p>

              <p className="mt-1 text-xs text-[#857B8B]">
                Complete the operational information
                people may need during an emergency.
              </p>
            </div>

            <div className="text-2xl font-bold text-[#4A3B6B]">
              {completion}%
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#EEEAF1]">
            <div
              className="h-full rounded-full bg-[#8C76B8] transition-all"
              style={{
                width: `${completion}%`,
              }}
            />
          </div>
        </section>

        <form onSubmit={saveProfile}>
          {/* ================= BASIC INFO ================= */}

          <section className="mb-5 rounded-3xl border border-[#EAE3ED] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-bold">
                Organization information
              </h2>

              <p className="mt-1 text-sm text-[#817886]">
                Tell people what your organization does.
              </p>
            </div>

            <div className="space-y-4">
              <Field
                label="Organization name"
                value={form.organizationName}
                onChange={(value) =>
                  updateField(
                    "organizationName",
                    value
                  )
                }
                placeholder="Example: TETHER Relief Camp"
                required
              />

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Description
                </label>

                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField(
                      "description",
                      event.target.value
                    )
                  }
                  rows={4}
                  placeholder="Briefly describe the support your organization provides..."
                  className="w-full resize-none rounded-2xl border border-[#DED6E4] bg-[#FFFCF9] px-4 py-3 text-sm outline-none transition focus:border-[#8C76B8] focus:ring-2 focus:ring-[#D9C9F0]"
                />
              </div>

              <Field
                label="Contact phone"
                value={form.contactPhone}
                onChange={(value) =>
                  updateField(
                    "contactPhone",
                    value
                  )
                }
                placeholder="Phone number people can use for help"
                type="tel"
              />
            </div>
          </section>

          {/* ================= ADDRESS ================= */}

          <section className="mb-5 rounded-3xl border border-[#EAE3ED] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-bold">
                Location
              </h2>

              <p className="mt-1 text-sm text-[#817886]">
                This is the location shown to people
                looking for your organization.
              </p>
            </div>

            <div className="space-y-4">
              <Field
                label="Address"
                value={form.addressLine}
                onChange={(value) =>
                  updateField(
                    "addressLine",
                    value
                  )
                }
                placeholder="Street / building / landmark"
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Village / City"
                  value={form.villageOrCity}
                  onChange={(value) =>
                    updateField(
                      "villageOrCity",
                      value
                    )
                  }
                  placeholder="City"
                  required
                />

                <Field
                  label="District"
                  value={form.district}
                  onChange={(value) =>
                    updateField(
                      "district",
                      value
                    )
                  }
                  placeholder="District"
                  required
                />

                <Field
                  label="State"
                  value={form.state}
                  onChange={(value) =>
                    updateField(
                      "state",
                      value
                    )
                  }
                  placeholder="State"
                  required
                />

                <Field
                  label="Postal code"
                  value={form.postalCode}
                  onChange={(value) =>
                    updateField(
                      "postalCode",
                      value
                    )
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
          </section>

          {/* ================= SERVICES ================= */}

          <section className="mb-5 rounded-3xl border border-[#EAE3ED] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-bold">
                Services
              </h2>

              <p className="mt-1 text-sm text-[#817886]">
                Add the types of support your organization
                provides.
              </p>
            </div>

            {form.services.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {form.services.map(
                  (service, index) => (
                    <div
                      key={`${service}-${index}`}
                      className="flex items-center gap-2 rounded-full bg-[#F0EAF7] px-3 py-2 text-sm text-[#57466F]"
                    >
                      <span>{service}</span>

                      <button
                        type="button"
                        onClick={() =>
                          removeService(index)
                        }
                        className="text-[#8C76B8] hover:text-[#4A3B6B]"
                        aria-label={`Remove ${service}`}
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newService}
                onChange={(event) =>
                  setNewService(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addService();
                  }
                }}
                placeholder="Example: Emergency shelter"
                className="min-w-0 flex-1 rounded-2xl border border-[#DED6E4] bg-[#FFFCF9] px-4 py-3 text-sm outline-none focus:border-[#8C76B8] focus:ring-2 focus:ring-[#D9C9F0]"
              />

              <button
                type="button"
                onClick={addService}
                className="rounded-2xl bg-[#F0EAF7] px-5 py-3 text-sm font-semibold text-[#57466F]"
              >
                + Add service
              </button>
            </div>
          </section>

          {/* ================= RESOURCES ================= */}

          <section className="mb-5 rounded-3xl border border-[#EAE3ED] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-bold">
                Available resources
              </h2>

              <p className="mt-1 text-sm text-[#817886]">
                Add actual resources people may need.
                You can turn each one on or off as
                availability changes.
              </p>
            </div>

            {form.resources.length > 0 && (
              <div className="mb-5 space-y-3">
                {form.resources.map(
                  (resource, index) => (
                    <div
                      key={`${resource.name}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8E1EB] bg-[#FFFCF9] p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {resource.name}
                        </p>

                        <p className="mt-1 text-xs capitalize text-[#8B8191]">
                          {resource.category ||
                            "general"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            toggleResource(index)
                          }
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                            resource.available
                              ? "bg-[#E4F4EE] text-[#397B67]"
                              : "bg-[#F1ECEF] text-[#817886]"
                          }`}
                        >
                          {resource.available
                            ? "Available"
                            : "Unavailable"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            removeResource(index)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FFF0F0] text-[#A84040]"
                          aria-label={`Remove ${resource.name}`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
              <input
                value={newResource}
                onChange={(event) =>
                  setNewResource(
                    event.target.value
                  )
                }
                placeholder="Example: Emergency shelter"
                className="rounded-2xl border border-[#DED6E4] bg-[#FFFCF9] px-4 py-3 text-sm outline-none focus:border-[#8C76B8] focus:ring-2 focus:ring-[#D9C9F0]"
              />

              <input
                value={newResourceCategory}
                onChange={(event) =>
                  setNewResourceCategory(
                    event.target.value
                  )
                }
                placeholder="Category"
                className="rounded-2xl border border-[#DED6E4] bg-[#FFFCF9] px-4 py-3 text-sm outline-none focus:border-[#8C76B8] focus:ring-2 focus:ring-[#D9C9F0]"
              />

              <button
                type="button"
                onClick={addResource}
                className="rounded-2xl bg-[#F0EAF7] px-5 py-3 text-sm font-semibold text-[#57466F]"
              >
                + Add
              </button>
            </div>
          </section>

          {/* ================= AVAILABILITY ================= */}

          <section className="mb-5 rounded-3xl border border-[#EAE3ED] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-bold">
                Current availability
              </h2>

              <p className="mt-1 text-sm text-[#817886]">
                Let people know whether your
                organization can currently provide help.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <AvailabilityOption
                value="available"
                current={
                  form.availabilityStatus
                }
                label="Available"
                description="Currently accepting requests"
                onClick={() =>
                  updateField(
                    "availabilityStatus",
                    "available"
                  )
                }
              />

              <AvailabilityOption
                value="limited"
                current={
                  form.availabilityStatus
                }
                label="Limited"
                description="Support is currently limited"
                onClick={() =>
                  updateField(
                    "availabilityStatus",
                    "limited"
                  )
                }
              />

              <AvailabilityOption
                value="unavailable"
                current={
                  form.availabilityStatus
                }
                label="Unavailable"
                description="Not currently providing support"
                onClick={() =>
                  updateField(
                    "availabilityStatus",
                    "unavailable"
                  )
                }
              />
            </div>
          </section>

          {/* ================= HOURS ================= */}

          <section className="mb-5 rounded-3xl border border-[#EAE3ED] bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-bold">
                Operating hours
              </h2>

              <p className="mt-1 text-sm text-[#817886]">
                When can people normally reach your
                organization?
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Opening time"
                type="time"
                value={form.open}
                onChange={(value) =>
                  updateField("open", value)
                }
              />

              <Field
                label="Closing time"
                type="time"
                value={form.close}
                onChange={(value) =>
                  updateField("close", value)
                }
              />
            </div>
          </section>

          {/* ================= SAVE ================= */}

          <div className="sticky bottom-4 z-20">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-[#4A3B6B] px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#3E315C] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving changes..."
                : "Save organization information"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

// ==========================================
// REUSABLE FIELD
// ==========================================

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">
        {label}

        {required && (
          <span className="ml-1 text-[#A84040]">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        className="w-full rounded-2xl border border-[#DED6E4] bg-[#FFFCF9] px-4 py-3 text-sm outline-none transition focus:border-[#8C76B8] focus:ring-2 focus:ring-[#D9C9F0]"
      />
    </div>
  );
}

// ==========================================
// AVAILABILITY OPTION
// ==========================================

function AvailabilityOption({
  value,
  current,
  label,
  description,
  onClick,
}) {
  const selected = value === current;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-[#8C76B8] bg-[#F5F0FA]"
          : "border-[#E8E1EB] bg-[#FFFCF9]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${
            selected
              ? "bg-[#8C76B8]"
              : "border border-[#B9AFBF] bg-white"
          }`}
        />

        <span className="text-sm font-semibold">
          {label}
        </span>
      </div>

      <p className="mt-2 pl-5 text-xs leading-5 text-[#817886]">
        {description}
      </p>
    </button>
  );
}