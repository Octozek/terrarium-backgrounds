// =================== Config ===================
const BASE_W_FT = 4;
const BASE_H_FT = 2;
const BASE_PRICE = 250;  // price for 4x2 (8 sq ft)
const SHIP = 65;         // flat shipping estimate

const SAMPLE_GALLERY = [
  "/imgs/rock-1.png",
  "/imgs/rock-2.png",
  "/imgs/rock-3.png",
  "/imgs/rock-4.png",
  "/imgs/rock-5.png",
  "/imgs/rock-6.png",
  "/imgs/rock-8.png",
  "/imgs/rock-9.png",
  "/imgs/rock-10.png"
];

// =================== Helpers ===================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };

// convert feet + inches (decimals allowed) -> feet
const toFeet = (ft, inch) => Number(ft || 0) + Number(inch || 0) / 12;

// clamp whole numbers (feet, thickness, etc.)
const clampInt = (v, min, max) =>
  Math.max(min, Math.min(max, parseInt(v || 0, 10)));

// clamp decimals (fractional inches like 1.5, 10.25, etc.)
const clampNum = (v, min, max) =>
  Math.max(min, Math.min(max, parseFloat(v || 0)));

// width of hidden scrollbar = window width - root client width
function getScrollbarWidth() {
  return window.innerWidth - document.documentElement.clientWidth;
}

// --- helper: disable/enable the submit button while sending ---
function setSubmitting(isSubmitting) {
  const btn = document.querySelector('#orderForm button[type="submit"]');
  if (!btn) return;
  btn.disabled = isSubmitting;
  btn.classList.toggle('opacity-60', isSubmitting);
  btn.classList.toggle('cursor-not-allowed', isSubmitting);
}

// Footer year
$("#year") && ($("#year").textContent = new Date().getFullYear());

// =================== Gallery ===================
const gallery = $("#gallery");
if (gallery) {
  SAMPLE_GALLERY.forEach((src) => {
    // Title from filename (optional—looks nice)
    const name = src.split("/").pop().replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
    const title = name.charAt(0).toUpperCase() + name.slice(1);

    const card = el("button", "group text-left");
    card.type = "button";
    card.innerHTML = `
      <div class="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
        <img src="${src}" alt="${title}" loading="lazy"
             class="w-full h-48 object-cover group-hover:opacity-90 transition" />
      </div>
      <div class="mt-2 text-xs text-slate-300">${title}</div>
      <div class="text-xs text-slate-500">Click to add to inspo →</div>
    `;

    // If image can't load, remove the tile gracefully
    card.querySelector("img").onerror = () => card.remove();

    // On click: animate into the Inspiration tray, then add the thumb
    card.addEventListener("click", () => {
      const imgEl = card.querySelector("img");
      flyToInspo(imgEl, src, title);
    });

    gallery.appendChild(card);
  });
}

// Wait for the next transform transition to end (ignore border-radius etc.)
async function flyToInspo(fromImgEl, src, alt) {
  const thumbsEl = $("#thumbs") || $("#dropzone");

  // ⛔️ Prevent duplicates FIRST
  if (isInInspo(src)) return;

  // If we don't have the source image or target tray, just add directly
  if (!fromImgEl || !thumbsEl) {
    addThumb(src, alt || "inspo");
    return;
  }

  // 🔒 Lock scroll without layout shift
  document.body.style.setProperty("--scrollbar-width", `${getScrollbarWidth()}px`);
  document.body.classList.add("no-scroll");

  const start = fromImgEl.getBoundingClientRect();
  const target = thumbsEl.getBoundingClientRect();

  const startX = start.left + start.width / 2;
  const startY = start.top + start.height / 2;
  const endX = target.left + 24;
  const endY = target.top + 24;

  // ghost clone
  const ghost = document.createElement("img");
  ghost.src = src;
  ghost.alt = alt || "inspo";
  ghost.className = "fly-ghost"; // ensure z-index < header
  ghost.style.left = `${startX - start.width / 2}px`;
  ghost.style.top  = `${startY - start.height / 2}px`;
  ghost.style.width  = `${start.width}px`;
  ghost.style.height = `${start.height}px`;
  ghost.style.transform = "translate(0,0) scale(1)";
  document.body.appendChild(ghost);

  // Step 1: morph to a ball at the top-right of the clicked image
  const offsetX = start.width / 2;
  const offsetY = -start.height / 2;
  requestAnimationFrame(() => {
    ghost.style.transition = "transform 600ms ease, border-radius 400ms ease";
    ghost.style.transform  = `translate(${offsetX}px, ${offsetY}px) scale(0.4)`;
    ghost.style.borderRadius = "50%";
  });

  // Wait: 600ms shrink + ~250ms pause
  await new Promise(r => setTimeout(r, 850));

  // Step 2: hop arc toward target
  const dx = endX - startX + offsetX;
  const dy = endY - startY + offsetY;

  // lift (hop start) — make it nice and high
  ghost.style.transition = "transform 300ms cubic-bezier(.4,-0.2,.6,1.4)";
  ghost.style.transform  = `translate(${dx * 0.3}px, ${dy - 250}px) scale(0.3)`;

  // then arc down to final target
  await new Promise(r => setTimeout(r, 300));
  ghost.style.transition = "transform 700ms cubic-bezier(.25,1,.5,1)";
  ghost.style.transform  = `translate(${dx}px, ${dy}px) scale(0.2)`;

  // Cleanup after last transition completes
  const onEnd = () => {
    ghost.removeEventListener("transitionend", onEnd);
    ghost.remove();
    addThumb(src, alt || "inspo");

    // 🔓 Unlock scroll & remove compensation
    document.body.classList.remove("no-scroll");
    document.body.style.removeProperty("--scrollbar-width");

    thumbsEl.classList.add("ring-2", "ring-cyan-400");
    setTimeout(() => thumbsEl.classList.remove("ring-2", "ring-cyan-400"), 300);
  };
  ghost.addEventListener("transitionend", onEnd);
}



// =================== Pricing ===================
function calcPrices() {
  // Dimensions
const wFt = clampInt($("#wFt").value, 0, 100);
const wIn = clampNum($("#wIn").value, 0, 11.99);   // decimals allowed
const hFt = clampInt($("#hFt").value, 0, 100);
const hIn = clampNum($("#hIn").value, 0, 11.99);   // decimals allowed


  $("#wFt").value = wFt; $("#wIn").value = wIn;
  $("#hFt").value = hFt; $("#hIn").value = hIn;

  const w = toFeet(wFt, wIn);
  const h = toFeet(hFt, hIn);
  const area = Math.max(0, w * h);
  const baseArea = BASE_W_FT * BASE_H_FT; // 8 sq ft

  // Back wall price scales by area
  const materialPrice = area === 0 ? 0 : BASE_PRICE * (area / baseArea);

  // ----- Thickness pricing -----
  // <input id="thickness" type="number" min="4" step="2" value="4">
const thicknessEl = $("#thickness");
let thickness = thicknessEl ? clampInt(thicknessEl.value, 4, 60) : 4;

// snap to the nearest even number ≥ 4 (4,6,8,...)
thickness = Math.max(4, Math.round(thickness / 2) * 2);
if (thicknessEl && String(thicknessEl.value) !== String(thickness)) {
  thicknessEl.value = thickness; // reflect in the UI
}

  // Every +2" over 4" adds $50
  const extraInches = Math.max(0, thickness - 4);
  const thicknessSteps = Math.floor(extraInches / 2);
  const thicknessExtra = thicknessSteps * 50;

  // Totals (thickness only)
  const options = thicknessExtra;
  const total = Math.ceil(materialPrice + SHIP + options);

  // UI
  $("#materialPrice").textContent = `$${Math.ceil(materialPrice).toLocaleString()}`;
  $("#shipPrice").textContent = `$${SHIP}`;
  $("#optionsPrice").textContent = `$${options}`;
  $("#totalPrice").textContent = `$${total.toLocaleString()}`;
}

// Hook inputs
["#wFt", "#wIn", "#hFt", "#hIn", "#thickness"].forEach(sel => {
  $(sel)?.addEventListener("input", calcPrices);
});
calcPrices();

// Presets (inches only, common tanks)
$$("[data-preset]").forEach(btn => {
  btn.addEventListener("click", () => {
    const [w, h] = btn.dataset.preset.split("x").map(Number);
    const wFt = Math.floor(w / 12), wIn = w % 12;
    const hFt = Math.floor(h / 12), hIn = h % 12;
    $("#wFt").value = wFt; $("#wIn").value = wIn;
    $("#hFt").value = hFt; $("#hIn").value = hIn;
    calcPrices();
  });
});


// =================== Drag & Drop ===================
const drop = $("#dropzone");
const fileInput = $("#fileInput");
const thumbs = $("#thumbs");

// helper: check if an image is already in inspo
function isInInspo(src) {
  return [...thumbs.querySelectorAll("img[data-src]")].some(img => img.dataset.src === src);
}

function addThumb(src, alt = "inspo") {
  if (isInInspo(src)) return; // prevent duplicates

  const wrapper = el("div", "relative");
  const img = el("img", "h-16 w-16 object-cover rounded-lg border border-white/10");
  img.src = src;
  img.alt = alt;
  img.dataset.src = src; // store the exact source for duplicate checks

  const x = el("button", "absolute -top-2 -right-2 h-6 w-6 rounded-full bg-black/70 border border-white/20 text-xs");
  x.type = "button";
  x.textContent = "×";
  x.addEventListener("click", () => wrapper.remove());

  wrapper.appendChild(img);
  wrapper.appendChild(x);
  thumbs.appendChild(wrapper);
}

function handleFiles(files) {
  [...files].forEach(f => {
    const url = URL.createObjectURL(f);
    addThumb(url, f.name);
  });
}

if (drop) {
  drop.addEventListener("click", () => fileInput.click());
  ["dragenter", "dragover"].forEach(ev =>
    drop.addEventListener(ev, e => {
      e.preventDefault();
      drop.classList.add("ring-2", "ring-cyan-400");
    })
  );
  ["dragleave", "drop"].forEach(ev =>
    drop.addEventListener(ev, e => {
      e.preventDefault();
      drop.classList.remove("ring-2", "ring-cyan-400");
    })
  );
  drop.addEventListener("drop", e => handleFiles(e.dataTransfer.files));
  fileInput.addEventListener("change", e => handleFiles(e.target.files));
}

// =================== Submit ===================

const API_BASE = import.meta?.env?.VITE_API_BASE || "http://localhost:3000";
console.log("API_BASE =", API_BASE);

$("#orderForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!$("#terms")?.checked) {
    alert("Please confirm you measured the inside of the tank and agree to the terms.");
    return;
  }

  const data = {
    width: { ft: $("#wFt").value, in: $("#wIn").value },
    height: { ft: $("#hFt").value, in: $("#hIn").value },
    options: { thicknessInches: parseFloat($("#thickness")?.value || "4") },
    prices: {
      material: $("#materialPrice").textContent,
      shipping: $("#shipPrice").textContent,
      options: $("#optionsPrice").textContent,
      total: $("#totalPrice").textContent,
    },
    contact: {
      name: $("#name").value,
      email: $("#email").value,
      addr: $("#addr").value,
      city: $("#city").value,
      state: $("#state").value,
      zip: $("#zip").value,
      notes: $("#notes").value,
    },
    inspo: [...document.querySelectorAll('#thumbs img')].map(img => img.src),
  };

  try {
    const resp = await fetch(`${API_BASE}/order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    let json = null;
    try { json = await resp.json(); } catch {}

    if (!resp.ok || !json?.ok || json?.sent !== true) {
      console.error("❌ Order send failed", {
        status: resp.status,
        json,
      });
      alert(
        `Sorry, the email didn’t send.\n` +
        `Status: ${resp.status}\n` +
        (json?.resendError ? `Resend: ${JSON.stringify(json.resendError)}` : "")
      );
      return;
    }

    console.log("✅ Order accepted by Resend:", json);
    alert("✅ Thanks! Your order was sent. I’ll email you an invoice & timeline.");
    e.target.reset();
    $("#thumbs").innerHTML = "";
    calcPrices();
  } catch (err) {
    console.error("🌐 Network error:", err);
    alert("Network error. Please try again later.");
  }
});




