"use client";

import { useEffect, useState } from "react";

const photos = [
  "OZOR6911-Edit.jpg", "OZOR6938-Edit.jpg", "OZOR6945-Edit.jpg",
  "OZOR7120-Edit.jpg", "OZOR7128-Edit.jpg", "OZOR7197-Edit.jpg",
  "OZOR7204-Edit-2.jpg", "OZOR7223-Edit.jpg", "OZOR7340-Edit.jpg",
  "OZOR7346-Edit.jpg", "OZOR7360-Edit.jpg", "OZOR7391-Edit.jpg",
  "OZOR7413-Edit.jpg", "OZOR7431-Edit.jpg", "OZOR7457-Edit.jpg",
];

export default function PhotoLibrary() {
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (selected === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowRight") setSelected((index) => index === null ? null : (index + 1) % photos.length);
      if (event.key === "ArrowLeft") setSelected((index) => index === null ? null : (index - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [selected]);

  return (
    <main className="photo-library">
      <header className="photo-library__topbar">
        <a className="photo-library__back" href="/">← <span>Back to invitation</span></a>
        <span className="photo-library__brand">C <i>♥</i> U</span>
      </header>
      <section className="photo-library__intro">
        <p className="eyebrow">The moments we keep</p>
        <h1>Our Photo Library</h1>
        <p>A little collection of love, laughter, and the beginning of forever.</p>
        <span className="photo-library__count">{photos.length} photographs <b>·</b> Chidinma &amp; Ugochukwu</span>
      </section>
      <section className="photo-library__grid" aria-label="Wedding photographs">
        {photos.map((photo, index) => (
          <button className="photo-library__tile" key={photo} type="button" onClick={() => setSelected(index)} aria-label={`View photograph ${index + 1}`}>
            <img src={`/images/wedding/${photo}`} alt={`Chidinma and Ugochukwu, photograph ${index + 1}`} loading={index < 3 ? "eager" : "lazy"} />
            <span className="photo-library__zoom" aria-hidden="true">↗</span>
          </button>
        ))}
      </section>
      <footer className="photo-library__footer">Made with love <span>♥</span> for Chidinma &amp; Ugochukwu</footer>
      {selected !== null && (
        <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={`Photograph ${selected + 1} of ${photos.length}`} onClick={() => setSelected(null)}>
          <button className="photo-lightbox__close" type="button" aria-label="Close photo" onClick={() => setSelected(null)}>×</button>
          <button className="photo-lightbox__arrow photo-lightbox__arrow--left" type="button" aria-label="Previous photo" onClick={(event) => { event.stopPropagation(); setSelected((selected - 1 + photos.length) % photos.length); }}>‹</button>
          <figure onClick={(event) => event.stopPropagation()}>
            <img src={`/images/wedding/${photos[selected]}`} alt={`Chidinma and Ugochukwu, photograph ${selected + 1}`} />
            <figcaption>{String(selected + 1).padStart(2, "0")} <span>/</span> {String(photos.length).padStart(2, "0")}</figcaption>
          </figure>
          <button className="photo-lightbox__arrow photo-lightbox__arrow--right" type="button" aria-label="Next photo" onClick={(event) => { event.stopPropagation(); setSelected((selected + 1) % photos.length); }}>›</button>
        </div>
      )}
    </main>
  );
}
