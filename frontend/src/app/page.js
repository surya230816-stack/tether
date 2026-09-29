
"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const SLIDES = [
  {
    key: "problem",
    eyebrow: "THE REALITY",
    heading: "When the water rises, help shouldn't be hard to find.",
    body: "Across flood-prone communities, rising water can displace families, disrupt roads, and make reaching assistance difficult.",
    note: "Floods don't only change landscapes. They change how people reach one another.",
    tone: "muted",
  },
  {
    key: "solution",
    eyebrow: "THE CONNECTION",
    heading: "Help should be within reach.",
    body: "TETHER brings emergency alerts, nearby support, relief camps, and flood-risk awareness into one connected platform.",
    note: "One place to ask for help. One place to offer it.",
    tone: "bright",
  },
  {
    key: "ready",
    eyebrow: "WELCOME TO TETHER",
    heading: "Built for the moment it matters.",
    body: "Whether you need help or can give it, TETHER helps you stay connected to the people and resources around you.",
    note: "Here. Near. Within reach.",
    tone: "calm",
    cta: true,
  },
];

const TONE_BG = {
  muted: "bg-surface-2",
  bright: "bg-gradient-to-br from-lilac via-sky to-blush",
  calm: "bg-gradient-to-b from-surface to-sage/25",
};

function requestLocation() {
  if (typeof window === "undefined" || !navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log("Location captured:", {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    (error) => {
      console.log("Location unavailable:", error.message);
    },
    {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000,
    }
  );
}

export default function Onboarding() {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [active, setActive] = useState(0);

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;

    if (!element || !element.clientWidth) return;

    const index = Math.round(
      element.scrollLeft / element.clientWidth
    );

    setActive(Math.max(0, Math.min(index, SLIDES.length - 1)));
  }, []);

  const goToSlide = (index) => {
    const element = scrollRef.current;

    if (!element) return;

    element.scrollTo({
      left: index * element.clientWidth,
      behavior: "smooth",
    });
  };

  const continueToApp = () => {
    requestLocation();
    router.push("/auth");
  };

  const currentSlide = SLIDES[active];

  return (
    <div className="onboarding-shell relative h-dvh w-full overflow-hidden bg-surface">
      <AmbientWaves activeIndex={active} />

      {/* Top navigation */}

      <header className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-rust" />
          <span className="font-display text-sm font-semibold tracking-[0.18em] text-plum">
            TETHER
          </span>
        </div>

        <button
          type="button"
          onClick={continueToApp}
          className="rounded-full px-3 py-2 font-body text-sm font-medium text-muted transition-colors hover:text-plum"
        >
          Skip
        </button>
      </header>

      {/* Slides */}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        aria-label="TETHER introduction"
        className="no-scrollbar relative z-10 flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
      >
        {SLIDES.map((slide, index) => (
          <section
            key={slide.key}
            aria-label={`Introduction slide ${index + 1} of ${SLIDES.length}`}
            className={`relative flex h-full w-full flex-shrink-0 snap-center flex-col justify-end px-6 pb-36 pt-28 transition-colors duration-700 ${TONE_BG[slide.tone]}`}
          >
            <div className="relative z-10 mx-auto w-full max-w-[26rem]">
              <div className="content-rise" key={`${active}-${slide.key}`}>
                <p className="mb-5 font-body text-xs font-semibold tracking-[0.2em] text-muted">
                  {slide.eyebrow}
                </p>

                {slide.key === "solution" ? (
                  <div className="mb-5">
                    <h1 className="font-display text-6xl font-bold tracking-[-0.07em] text-plum">
                      TETHER
                    </h1>

                    <p className="mt-2 font-display text-lg font-medium text-plum/75">
                      Here. Near. Within reach.
                    </p>
                  </div>
                ) : (
                  <h1 className="font-display text-[2.15rem] font-semibold leading-[1.08] tracking-[-0.04em] text-plum sm:text-5xl">
                    {slide.heading}
                  </h1>
                )}

                {slide.key === "solution" && (
                  <h2 className="mb-5 font-display text-2xl font-semibold leading-tight text-plum">
                    {slide.heading}
                  </h2>
                )}

                <p className="max-w-[25rem] text-base leading-[1.75] text-plum/75">
                  {slide.body}
                </p>

                <div className="mt-5 border-l-2 border-plum/20 pl-4">
                  <p className="font-display text-sm italic leading-relaxed text-plum/65">
                    {slide.note}
                  </p>
                </div>

                {slide.cta && (
                  <button
                    type="button"
                    onClick={continueToApp}
                    className="mt-8 flex w-full items-center justify-between rounded-full bg-amber px-6 py-4 font-body text-base font-semibold text-plum shadow-[0_8px_24px_rgba(217,154,78,0.18)] transition-transform active:scale-[0.98]"
                  >
                    <span>Get started</span>
                    <span aria-hidden="true" className="text-xl">
                      →
                    </span>
                  </button>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Bottom progress navigation */}

      <div className="absolute bottom-10 left-0 right-0 z-20 flex items-center justify-between px-6">
        <span className="font-body text-xs font-medium tabular-nums text-muted">
          0{active + 1} / 0{SLIDES.length}
        </span>

        <div className="flex items-center gap-2">
          {SLIDES.map((slide, index) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={active === index ? "step" : undefined}
              className={`h-2 rounded-full transition-all duration-300 ${
                active === index
                  ? "w-8 bg-plum"
                  : "w-2 bg-plum/25"
              }`}
            />
          ))}
        </div>

        {active < SLIDES.length - 1 ? (
          <button
            type="button"
            onClick={() => goToSlide(active + 1)}
            aria-label="Next slide"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-plum/15 bg-surface/40 text-lg text-plum backdrop-blur-sm transition-transform active:scale-95"
          >
            →
          </button>
        ) : (
          <div className="h-10 w-10" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}

function AmbientWaves({ activeIndex }) {
  const showLife = activeIndex >= 1;
  const showCamp = activeIndex >= 2;

  const fade = (visible) =>
    `transition-opacity duration-700 ${
      visible ? "opacity-100" : "opacity-0"
    }`;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Water layers */}

      <svg
        className="absolute bottom-0 left-0 h-40 w-[200%] opacity-40"
        style={{ animation: "wave-drift 22s linear infinite" }}
        viewBox="0 0 1600 200"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,100 C200,150 400,50 600,100 C800,150 1000,50 1200,100 C1400,150 1600,50 1800,100 L1600,200 L0,200 Z"
          fill="#B8D4F0"
        />
      </svg>

      <svg
        className="absolute bottom-0 left-0 h-32 w-[200%] opacity-60"
        style={{ animation: "wave-drift 15s linear infinite reverse" }}
        viewBox="0 0 1600 200"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0,120 C200,80 400,160 600,120 C800,80 1000,160 1200,120 C1400,80 1600,160 1800,120 L1600,200 L0,200 Z"
          fill="#D9C9F0"
        />
      </svg>

      {/* Birds */}

      <div
        className="absolute left-0 top-16 h-4 w-6 opacity-70"
        style={{
          animation: "fly-across 14s linear infinite",
        }}
      >
        <Bird />
      </div>

      <div
        className="absolute left-0 top-28 h-3 w-5 opacity-50"
        style={{
          animation: "fly-across 19s linear infinite",
          animationDelay: "3s",
        }}
      >
        <Bird />
      </div>

      <div
        className="absolute left-0 top-20 h-3 w-5 scale-x-[-1] opacity-40"
        style={{
          animation: "fly-across 23s linear infinite reverse",
          animationDelay: "6s",
        }}
      >
        <Bird />
      </div>

      {/* SOS signal */}

      <div
        className={`absolute right-8 top-28 h-10 w-10 ${fade(showLife)}`}
        style={{ animation: "bob 4s ease-in-out infinite" }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 40 40" fill="none">
          <circle
            cx="20"
            cy="20"
            r="16"
            stroke="#A8402F"
            strokeWidth="4"
          />

          <circle
            cx="20"
            cy="20"
            r="16"
            stroke="#FFFCF9"
            strokeWidth="4"
            strokeDasharray="6 6"
          />
        </svg>
      </div>

      {/* Boat */}

      <div
        className={`absolute left-10 top-40 h-8 w-14 ${fade(showLife)}`}
        style={{
          animation: "gentle-rock 5s ease-in-out infinite",
          transformOrigin: "center",
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 56 32" fill="none">
          <path
            d="M4 20 L52 20 L44 30 L12 30 Z"
            fill="#5E9C8D"
          />

          <path
            d="M28 20 L28 4"
            stroke="#4A3B6B"
            strokeWidth="2"
          />

          <path
            d="M28 6 L40 18 L28 18 Z"
            fill="#D99A4E"
          />
        </svg>
      </div>

      {/* Fish */}

      <div
        className={`absolute bottom-16 left-1/3 h-6 w-9 ${fade(showLife)}`}
        style={{
          animation: "fish-drift 6s ease-in-out infinite",
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 36 24" fill="none">
          <path
            d="M2 12 C10 2 26 2 34 12 C26 22 10 22 2 12 Z"
            fill="#D99A4E"
          />

          <path
            d="M2 12 L-6 6 L-6 18 Z"
            fill="#D99A4E"
            transform="translate(6 0)"
          />
        </svg>
      </div>

      {/* Starfish */}

      <div
        className={`absolute bottom-24 right-12 h-6 w-6 ${fade(showLife)}`}
        style={{
          animation: "bob 4.5s ease-in-out infinite",
          animationDelay: "1s",
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" fill="#F6C9D6">
          <path d="M12 0 L15 8 L23 8 L16.5 13 L19 22 L12 16.5 L5 22 L7.5 13 L1 8 L9 8 Z" />
        </svg>
      </div>

      {/* Relief camp */}

      <div
        className={`absolute bottom-20 left-6 h-10 w-12 ${fade(showCamp)}`}
        style={{
          animation: "bob 5.5s ease-in-out infinite",
          animationDelay: "0.5s",
        }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 48 40" fill="none">
          <path
            d="M24 4 L44 36 L4 36 Z"
            fill="#B8D4F0"
          />

          <path
            d="M24 4 L34 36 L14 36 Z"
            fill="#D9C9F0"
          />

          <path
            d="M24 4 L24 36"
            stroke="#4A3B6B"
            strokeWidth="1.5"
          />

          <rect
            x="4"
            y="35"
            width="40"
            height="2"
            fill="#4A3B6B"
            opacity="0.4"
          />
        </svg>
      </div>
    </div>
  );
}

function Bird({ color = "#4A3B6B" }) {
  return (
    <svg viewBox="0 0 24 12" fill="none" aria-hidden="true">
      <path
        d="M1 6 Q6 0 12 6 Q18 0 23 6"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}