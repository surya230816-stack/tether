
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const initialForm = {
  accountType: "individual",
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",

  addressLine: "",
  villageOrCity: "",
  district: "",
  state: "",
  postalCode: "",

  organizationName: "",
  organizationType: "",
};

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState("register");
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setMessage("");
  }

  function changeAccountType(type) {
    setForm((previous) => ({
      ...previous,
      accountType: type,
      organizationName: "",
      organizationType: "",
    }));

    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    // REAL LOGIN
    if (mode === "login") {
      try {
        const response = await fetch(
          `${API_URL}/api/auth/login`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: form.email,
              password: form.password,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Login failed."
          );
        }

        localStorage.setItem("tetherToken", data.token);

        localStorage.setItem(
  "tetherUser",
  JSON.stringify(data.user)
);

if (data.user.accountType === "organization") {
  router.push("/organization/dashboard");
} else {
  router.push("/home");
}
      } catch (error) {
        setError(
          error.message ||
            "Unable to connect to the TETHER server."
        );
      } finally {
        setLoading(false);
      }

      return;
    }

    // REGISTRATION VALIDATION
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const payload = {
      accountType: form.accountType,
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      password: form.password,
      confirmPassword: form.confirmPassword,

      defaultAddress: {
        addressLine: form.addressLine,
        villageOrCity: form.villageOrCity,
        district: form.district,
        state: form.state,
        postalCode: form.postalCode || undefined,
      },
    };

    if (form.accountType === "organization") {
      payload.organizationName = form.organizationName;
      payload.organizationType = form.organizationType;
    }

    // REAL REGISTRATION
    try {
      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed."
        );
      }

      setMessage(
        "Registration successful! You can now log in."
      );

      setMode("login");

      setForm((previous) => ({
        ...initialForm,
        email: previous.email,
      }));
    } catch (error) {
      setError(
        error.message ||
          "Unable to connect to the TETHER server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FFFCF9] px-5 py-8 text-[#4A3B6B]">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mb-8 text-sm text-[#8A80A3] transition hover:text-[#4A3B6B]"
        >
          ← Back to TETHER
        </button>

        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold tracking-[0.2em] text-[#A8402F]">
            TETHER
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            {mode === "register"
              ? "Create your account"
              : "Welcome back"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-[#8A80A3]">
            A hand you can reach when you need one.
          </p>
        </div>

        <div className="mb-6 flex rounded-2xl bg-[#F7F0FA] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
              setMessage("");
            }}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === "register"
                ? "bg-white text-[#4A3B6B] shadow-sm"
                : "text-[#8A80A3]"
            }`}
          >
            Register
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
              setMessage("");
            }}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              mode === "login"
                ? "bg-white text-[#4A3B6B] shadow-sm"
                : "text-[#8A80A3]"
            }`}
          >
            Login
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm leading-6 text-green-700">
            {message}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {mode === "login" && (
            <section className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Email address
                </label>

                <input
                  className="auth-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Password
                </label>

                <input
                  className="auth-input"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </section>
          )}

          {mode === "register" && (
            <>
              <section>
                <label className="mb-2 block text-sm font-semibold">
                  Account type
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      changeAccountType("individual")
                    }
                    className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
                      form.accountType === "individual"
                        ? "border-[#4A3B6B] bg-[#F7F0FA]"
                        : "border-[#E6DDED] bg-white"
                    }`}
                  >
                    Individual
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      changeAccountType("organization")
                    }
                    className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition ${
                      form.accountType === "organization"
                        ? "border-[#4A3B6B] bg-[#F7F0FA]"
                        : "border-[#E6DDED] bg-white"
                    }`}
                  >
                    Organization
                  </button>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-bold">
                  Basic details
                </h2>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Full name
                  </label>

                  <input
                    className="auth-input"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Email address
                  </label>

                  <input
                    className="auth-input"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Phone number
                  </label>

                  <input
                    className="auth-input"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Optional phone number"
                  />
                </div>
              </section>

              {form.accountType === "organization" && (
                <section className="space-y-4">
                  <h2 className="text-lg font-bold">
                    Organization details
                  </h2>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Organization name
                    </label>

                    <input
                      className="auth-input"
                      name="organizationName"
                      value={form.organizationName}
                      onChange={handleChange}
                      placeholder="Enter organization name"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Organization type
                    </label>

                    <select
                      className="auth-input"
                      name="organizationType"
                      value={form.organizationType}
                      onChange={handleChange}
                      required
                    >
                      <option value="">
                        Select organization type
                      </option>
                      <option value="ngo">
                        NGO / Relief Organization
                      </option>
                      <option value="police">
                        Police / Emergency Services
                      </option>
                      <option value="hospital">
                        Hospital / Medical Center
                      </option>
                      <option value="relief_camp">
                        Relief Camp / Shelter
                      </option>
                      <option value="other">
                        Other
                      </option>
                    </select>
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <h2 className="text-lg font-bold">
                  Default address
                </h2>

                <p className="text-sm leading-6 text-[#8A80A3]">
                  This helps TETHER understand your usual location.
                  You can update it later.
                </p>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Address line
                  </label>

                  <input
                    className="auth-input"
                    name="addressLine"
                    value={form.addressLine}
                    onChange={handleChange}
                    placeholder="House number, street, landmark"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Village / City
                  </label>

                  <input
                    className="auth-input"
                    name="villageOrCity"
                    value={form.villageOrCity}
                    onChange={handleChange}
                    placeholder="Enter village or city"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    District
                  </label>

                  <input
                    className="auth-input"
                    name="district"
                    value={form.district}
                    onChange={handleChange}
                    placeholder="Enter district"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    State
                  </label>

                  <input
                    className="auth-input"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="Enter state"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Postal code
                  </label>

                  <input
                    className="auth-input"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handleChange}
                    placeholder="Optional postal code"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-bold">
                  Security
                </h2>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Password
                  </label>

                  <input
                    className="auth-input"
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Confirm password
                  </label>

                  <input
                    className="auth-input"
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    minLength={8}
                    required
                  />
                </div>
              </section>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#4A3B6B] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#392d55] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "register"
                ? "Create TETHER account"
                : "Login to TETHER"}
          </button>
        </form>

        <p className="mt-8 text-center text-xs leading-5 text-[#8A80A3]">
          TETHER is designed to connect people, responders,
          organizations, and emergency resources.
        </p>
      </div>
    </main>
  );
}