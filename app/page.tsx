"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

// December 5, 2026 at 11 AM (UTC+1), matching the church ceremony.
const eventDate = new Date("2026-12-05T11:00:00+01:00").getTime();
// Paste the external gallery URL here when it is ready.
const galleryUrl = "";

const moments = [
  "Sage Brown",
  "Beige",
  "Ivory White",
  "Lemon",
];

const schedule = [
  ["11:00 AM", "Church ceremony · St. Dominic Catholic Church, Yaba"],
  ["2:00 PM", "Reception · The SIG Lagos, Victoria Island"],
];

function getCountdown() {
  const distance = Math.max(eventDate - Date.now(), 0);
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((distance / (1000 * 60)) % 60);
  const seconds = Math.floor((distance / 1000) % 60);
  return { days, hours, minutes, seconds };
}

export default function Home() {
  const [phase, setPhase] = useState<"closed" | "opening" | "opened">("closed");
  const opened = phase === "opened";
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (opened) {
      headingRef.current?.focus({ preventScroll: true });
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [opened]);

  useEffect(() => {
    if (phase !== "opening") return;
    const timer = window.setTimeout(() => setPhase("opened"), 3800);
    return () => window.clearTimeout(timer);
  }, [phase]);

  function openInvitation() {
    if (phase !== "closed") return;
    window.scrollTo({ top: 0, behavior: "instant" });
    setPhase(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "opened" : "opening");
  }
  // Keep server and first browser render identical; start the clock after mount.
  const [countdown, setCountdown] = useState<ReturnType<typeof getCountdown> | null>(null);
  const [musicOn, setMusicOn] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [rsvpName, setRsvpName] = useState("");
  const [savedRsvpName, setSavedRsvpName] = useState("");
  const pendingRsvp = useRef<{ payload: string; id: string } | null>(null);
  const [attending, setAttending] = useState("");
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setCountdown(getCountdown()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!opened) return;
    const timer = window.setInterval(() => setHeroSlide((current) => (current + 1) % 2), 3500);
    return () => window.clearInterval(timer);
  }, [opened]);

  useEffect(() => {
    try {
      const storedName = window.localStorage.getItem("chidinma-ugochukwu-rsvp-name");
      if (storedName) {
        setRsvpName(storedName);
        setSavedRsvpName(storedName);
      }
    } catch {
      // Some private browsing modes block local storage; the form still works.
    }
  }, []);

  const countdownItems = useMemo(
    () => [
      ["Days", countdown?.days ?? "--"],
      ["Hours", countdown?.hours ?? "--"],
      ["Minutes", countdown?.minutes ?? "--"],
      ["Seconds", countdown?.seconds ?? "--"],
    ],
    [countdown],
  );

  async function copyAccountNumber(accountNumber: string) {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedAccount(accountNumber);
      window.setTimeout(() => setCopiedAccount((current) => current === accountNumber ? null : current), 1800);
    } catch {
      setCopiedAccount(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || submitted) return;
    const form = new FormData(event.currentTarget);
    const data = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? "").trim(),
      attending,
      guests: attending === "Sadly, no" ? 0 : 1,
      note: String(form.get("note") ?? ""), website: String(form.get("website") ?? ""),
    };
    const payload = JSON.stringify(data);
    if (pendingRsvp.current?.payload !== payload) {
      pendingRsvp.current = { payload, id: crypto.randomUUID() };
    }
    setSending(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/rsvp", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, id: pendingRsvp.current.id }),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || result.ok !== true) throw new Error(result.error || "Unable to save your RSVP. Please retry.");
      const submittedName = data.name.trim();
      setRsvpName(submittedName);
      setSavedRsvpName(submittedName);
      try {
        window.localStorage.setItem("jane-john-rsvp-name", submittedName);
      } catch {
        // The RSVP has already been saved; storage is only a convenience for this device.
      }
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error && error.name !== "TimeoutError" ? error.message : "We could not confirm your RSVP. Please retry.");
    } finally { setSending(false); }
  }

  return (
    <main className={`invite invite--${phase}`}>
      {!opened && (
        <section className={`cover cover--${phase}`} aria-label="Wedding invitation cover" aria-busy={phase === "opening"}>
          <div className="envelope" aria-hidden="true">
            <div className="envelope__panel envelope__panel--left" />
            <div className="envelope__panel envelope__panel--right" />
            <div className="envelope__panel envelope__panel--bottom" />
            <div className="envelope__panel envelope__panel--top" />
            <svg className="envelope__seams" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 0 L50 50 L100 0 M0 100 L50 50 L100 100" />
            </svg>
            <div className="envelope__glow" />
            <div className="wax-seal"><span>C<span className="wax-seal__amp">&amp;</span>U</span></div>
          </div>
          <div className="cover__intro">
            <p className="eyebrow">A little love, sealed for you</p>
            <h1>Chidinma &amp; Ugochukwu</h1>
            <p className="cover__date">5th December 2026</p>
          </div>
          <div className="cover__action">
            <p>You are warmly invited</p>
            <button className="primary-button" onClick={openInvitation} disabled={phase !== "closed"}>
              Open invitation <span aria-hidden="true">↗</span>
            </button>
          </div>
          {phase === "opening" && (
            <button className="cover__skip" onClick={() => setPhase("opened")}>Skip animation</button>
          )}
        </section>
      )}

      <div className="invitation-content" inert={!opened} aria-hidden={!opened}>
      <section className={`hero ${phase !== "closed" ? "hero--open" : ""}`}>
        <div className="hero__slides" aria-hidden="true">
          <div className={`hero__slide ${heroSlide === 0 ? "hero__slide--active" : ""}`}>
            <img src="/images/wedding/hycie-image-5.jpeg" alt="" />
          </div>
          <div className={`hero__slide ${heroSlide === 1 ? "hero__slide--active" : ""}`}>
            <img src="/images/wedding/hycie-image-2.jpeg" alt="" />
          </div>
        </div>
        <nav className="topbar" aria-label="Invitation navigation">
          <a href="#story">Story</a>
          <a href="#details">Details</a>
          <a href="#gifting-rsvp">RSVP &amp; Gifting</a>
        </nav>

        <div className="hero__content">
          <p className="eyebrow">Together with their families</p>
          <h1 ref={headingRef} tabIndex={-1}>Chidinma &amp; Ugochukwu</h1>
          <p className="hero__hashtag">#UCLoveStory</p>
          <p className="hero__copy">
            Request the pleasure of your company as they celebrate their wedding
            at The SIG Lagos, 7/9 Molade Okoya Thomas Street, Victoria Island, Lagos.
          </p>
          <div className="hero__actions">
            <a className="primary-button" href="#gifting-rsvp">
              RSVP &amp; Gifting
            </a>
            {/* <button className="primary-button gallery-trigger" type="button" onClick={() => setGalleryOpen(true)}>
              View gallery <span aria-hidden="true">↗</span>
            </button> */}
            <button
              className="icon-button"
              onClick={() => setMusicOn((current) => !current)}
              aria-pressed={musicOn}
              aria-label={musicOn ? "Pause music" : "Play music"}
              title={musicOn ? "Pause music" : "Play music"}
            >
              {musicOn ? "II" : "♪"}
            </button>
          </div>
        </div>

        <div className="hero__carousel-controls" aria-label="Hero photo carousel">
          {["Hero photo 1", "Hero photo 2"].map((label, index) => (
            <button
              key={label}
              type="button"
              className={heroSlide === index ? "is-active" : ""}
              onClick={() => setHeroSlide(index)}
              aria-label={`Show ${label}`}
              aria-pressed={heroSlide === index}
            />
          ))}
        </div>

        <div className="hero__card" aria-label="Wedding date and venue">
          <span>December</span>
          <strong>5</strong>
          <span>2026</span>
          <p>The SIG Lagos</p>
        </div>
      </section>

      <section className="countdown" aria-label="Countdown to wedding">
        {countdownItems.map(([label, value]) => (
          <div key={label}>
            <strong>{String(value).padStart(2, "0")}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section id="story" className="story section">
        <div className="story__intro">
          <p className="eyebrow">Our story</p>
          <h2>From Friendship to Forever</h2>
          <figure className="story__feature-photo">
            <img src="/images/wedding/hycie-image-10.jpeg" alt="Jane and John smiling together" loading="lazy" />
          </figure>
        </div>
        <div className="story__copy">
          <p>
            Our story started back in 2018 at the Federal University of Technology,
            Owerri (FUTO). Before there was ever a spark of romance, there was just
            a really good friendship. We were the people who showed up for each
            other; sharing everything from stressful exam seasons to late-night
            conversations about what we wanted out of life. Somewhere in the middle
            of all that everyday chaos and laughter, we realized we didn’t want to
            do life with anyone else.
          </p>
          <p>
            Falling in love didn’t happen all at once; it happened quietly, the way
            the best things usually do. Loving someone who is already your best
            friend feels like finally coming home. Over the years, we’ve watched
            each other grow, weathered different seasons, and built a life rooted in
            patience, inside jokes, and genuine care.
          </p>
          <p>
            When it came time to ask her to marry me, it didn’t feel like a leap into
            the unknown; instead, it just felt like the most natural next step in a
            story we had already been writing for years. We are beyond grateful to
            be stepping into this new season together, and we would love nothing
            more than to have you there with us as we celebrate our love and make it
            official.
          </p>
          <div className="story__photos" aria-label="Photos of the couple">
            <figure>
              <img src="/images/wedding/hycie-image-7.jpeg" alt="Jane and John together by the ocean" loading="lazy" />
            </figure>
          </div>
        </div>
      </section>

      <section className="moments section" aria-labelledby="colors-title">
        <div className="moments__heading">
          <p className="eyebrow">Dress code</p>
          <h2 id="colors-title">Colors of the day</h2>
        </div>
        <div className="moments__grid">
          {moments.map((moment, index) => (
            <article key={moment} className={`moment moment--${index + 1}`}>
              <span>0{index + 1}</span>
              <h3>{moment}</h3>
            </article>
          ))}
        </div>
      </section>

      <section id="details" className="details section">
        <div className="details__main">
          <p className="eyebrow">Wedding day</p>
          <h2>Saturday, 5th December 2026</h2>
          <p>
            <strong>Church ceremony:</strong> 11:00 AM at St. Dominic Catholic Church, Yaba.
            <br />
            <strong>Reception:</strong> 2:00 PM at The SIG Lagos, 7/9 Molade Okoya Thomas Street, Victoria Island, Lagos.
          </p>
          <div className="map-frame">
            <iframe
              title="The SIG Lagos location"
              src="https://www.google.com/maps?q=The+SIG+Lagos,+7%2F9+Molade+Okoya+Thomas+Street,+Victoria+Island,+Lagos&output=embed"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
        <div className="timeline">
          {schedule.map(([time, item]) => (
            <div key={time}>
              <span>{time}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* <section className="note section">
        <p className="eyebrow">Kindly note</p>
        <h2>Your presence is our favorite gift.</h2>
        <p>
          If you would like to bless the couple, a wishing well will be
          available at the reception. Adults-only celebration after 7 PM.
        </p>
      </section> */}

      <div id="gifting-rsvp" className="gifting-rsvp">
      <section id="gifts" className="gifts section">
        <div className="gifts__intro">
          <p className="eyebrow">Cash gift & sponsorship</p>
          <h2>Your presence is the greatest gift of all.</h2>
          <p>
            But if you would like to give something, we would appreciate your
            cash gifts as we begin our journey together.
          </p>
        </div>
        <div className="gift-cards">
          <div className="gift-card">
            <div className="gift-card__heading">
              <h1><span><b>Bank Name</b></span></h1>
              {/* <span className="gift-card__mark" aria-hidden="true">J&J</span> */}
              <h1><span><b>FIDELITY BANK</b></span></h1>
            </div>
            <dl>
              <div><dt>Account name</dt><dd>Chidinma Iwuoha</dd></div>
              <div>
                <dt>Account number</dt>
                <dd className="account-number">
                  <span>6560114709</span>
                  <button className="copy-account" type="button" onClick={() => copyAccountNumber("656011470")} aria-label="Copy generic account number" title="Copy account number">
                    {copiedAccount === "656011470" ? "✓" : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>}
                  </button>
                </dd>
              </div>
            </dl>
            <p className="gift-card__note">Please use your name as the transfer reference.</p>
          </div>
          <div className="gift-card gift-card--secondary">
            <div className="gift-card__heading">
              <span><b>Bank Name</b></span>
              {/* <span className="gift-card__mark" aria-hidden="true">J&J</span> */}
              <span><b>Zenith Bank</b></span>
            </div>
            <dl>
              <div><dt>Account name</dt><dd>Hyacienth Ugochukwu</dd></div>
              <div>
                <dt>Account number</dt>
                <dd className="account-number">
                  <span>2117782338</span>
                  <button className="copy-account" type="button" onClick={() => copyAccountNumber("2117782338")} aria-label="Copy generic account number" title="Copy account number">
                    {copiedAccount === "2117782338" ? "✓" : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0 2 2h2" /></svg>}
                  </button>
                </dd>
              </div>
            </dl>
            <p className="gift-card__note">Please use your name as the transfer reference.</p>
          </div>
        </div>
      </section>

      <section id="rsvp" className="rsvp section">
        <div>
          <p className="eyebrow">RSVP</p>
          <h2>Let us know if you can make it.</h2>
          <p>
            Your response will be shared privately with Chidinma &amp; Ugochukwu to help
            plan the celebration.
          </p>
          {savedRsvpName && (
            <p className="rsvp-returning-note" role="status">
              Welcome back, {savedRsvpName}. You have already RSVP&apos;d on this device.
            </p>
          )}
          <div className="contact-enquiries">
            <p className="eyebrow">Contact &amp; enquiries</p>
            <p>For questions about the celebration, please reach us on:</p>
            <a href="tel:+2340000000000">08084688777, 09044264242</a>
          </div>
        </div>

        <form className="rsvp__form" onSubmit={handleSubmit} aria-busy={sending}>
          <fieldset disabled={sending || submitted} className="rsvp__fields">
          <label className="rsvp__honeypot" aria-hidden="true">
            Leave this empty
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <label>
            Full name
            <input name="name" value={rsvpName} onChange={(event) => setRsvpName(event.target.value)} maxLength={120} required placeholder="Your first & last name" />
          </label>
          <label>
            Email address <span className="field-hint">Optional — used for reminders and updates before the event.</span>
            <input name="email" type="email" maxLength={254} autoComplete="email" placeholder="you@example.com" />
          </label>
          <label>
            Attendance
            <select
              value={attending}
              onChange={(event) => setAttending(event.target.value)}
              required
            >
              <option value="" disabled>Select your response</option>
              <option>Yes, joyfully</option>
              <option>Sadly, no</option>
            </select>
          </label>
          <p className="single-invite-note">This invite admits one guest.</p>
          <label>
            Message
            <textarea name="note" maxLength={2000} placeholder="Leave a sweet note" />
          </label>
          <button className="primary-button" type="submit">
            {sending ? "Sending…" : submitted ? "RSVP saved" : "Send RSVP"}
          </button>
          </fieldset>
          {submitError && <p role="alert" className="rsvp__error">{submitError}</p>}
          {submitted && (
            <p className="success" role="status">
              Thank you. Your RSVP has been saved and shared with the couple.
            </p>
          )}
        </form>
      </section>
      </div>
      {galleryOpen && (
        <div className="gallery-modal" role="dialog" aria-modal="true" aria-labelledby="gallery-modal-title" onClick={() => setGalleryOpen(false)}>
          <div className="gallery-modal__panel" onClick={(event) => event.stopPropagation()}>
            <div className="gallery-modal__header">
              <h2 id="gallery-modal-title">Photo gallery</h2>
              <button className="gallery-modal__close" type="button" onClick={() => setGalleryOpen(false)} aria-label="Close photo gallery">×</button>
            </div>
            {galleryUrl ? (
              <>
                <iframe src={galleryUrl} title="Wedding photo gallery" loading="lazy" allowFullScreen />
                <a href={galleryUrl} target="_blank" rel="noreferrer">Open gallery in a new tab</a>
              </>
            ) : (
              <p className="gallery-modal__empty">Add your gallery link to <code>galleryUrl</code> in <code>app/page.tsx</code> to display it here.</p>
            )}
          </div>
        </div>
      )}
      </div>
    </main>
  );
}
