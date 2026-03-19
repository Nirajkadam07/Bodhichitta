//   Gallery behaviour:
//   - Each .card has a .gallery with a .main-img and multiple .thumb buttons. Clicking a thumb replaces the main image.
//   - Thumbnails use data-src attribute to avoid duplicating large images in the DOM.
//   - This is vanilla JS and tiny — easy to expand into a carousel later.

document.addEventListener("click", function (e) {
  const btn = e.target.closest(".thumb");
  if (!btn) return;
  const thumbs = btn.parentElement; // .thumbs
  const card = thumbs.closest(".card");
  const main = card.querySelector(".main-img");

  // update main image src and active state
  const src = btn.getAttribute("data-src");
  if (src) main.src = src;

  // manage active classes
  thumbs
    .querySelectorAll(".thumb")
    .forEach((t) => t.classList.remove("active"));
  btn.classList.add("active");
});

// Optional: make thumbnails keyboard-accessible
document.querySelectorAll(".thumb").forEach((btn) => {
  btn.setAttribute("tabindex", "0");
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") btn.click();
  });
});
