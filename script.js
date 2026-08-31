/* =========================================================
   TapReview — NFC Google Review Card
   All editable business settings live in PRODUCT_CONFIG below.
   ========================================================= */

const PRODUCT_CONFIG = {
  productName: "NFC Google Review Card",

  // EDIT: your WhatsApp number in international format, digits only, no + or spaces
  // e.g. 2348012345678
  whatsappNumber: "234XXXXXXXXXX",

  currency: "₦",

  // EDIT: shown in the FAQ and footer
  deliveryText: "[INSERT DELIVERY INFORMATION]",

  // EDIT: set real prices (numbers, no commas). price = total price for that package.
  packages: [
    {
      id: "single",
      name: "1 Card",
      quantity: 1,
      price: 30000,
      unitNote: "Try it at one location"
    },
    {
      id: "double",
      name: "2 Cards",
      quantity: 2,
      price: 50000,
      unitNote: "Most popular for small outlets",
      badge: "Most Popular"
    },
    {
      id: "business",
      name: "5 Cards",
      quantity: 5,
      price: 120000,
      unitNote: "Best value per card"
    },
    {
      // Not a fixed-price package — a quote-request card. Clicking it skips
      // the order form entirely and opens WhatsApp directly, since neither
      // "how many" nor "what design" has a fixed price to show.
      id: "custom",
      name: "Bulk / Custom",
      custom: true,
      unitNote: "Large quantities or your own card design — get a quote"
    }
  ]
};

/* =========================================================
   Analytics stub — wire up Meta Pixel / GA4 here
   ========================================================= */
function trackEvent(eventName, data = {}) {
  // Example:
  // if (typeof fbq === "function") fbq('trackCustom', eventName, data);
  // if (typeof gtag === "function") gtag('event', eventName, data);
  console.debug("[track]", eventName, data);
}

/* =========================================================
   Init
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  renderFooterAndFaqSettings();
  const state = { selectedPackageId: null };

  renderPackages(state);
  renderQuantityOptions();
  syncQuantityFromPackage(state);
  updateSummary(state);

  wireWhatsappLinks();
  wireScrollButtons();
  wireStickyCta();
  wireAccordion();
  wireScrollReveal();
  wireOrderForm(state);

  document.querySelectorAll("[data-track]").forEach(el => {
    el.addEventListener("click", () => trackEvent(el.dataset.track));
  });
});

function renderFooterAndFaqSettings() {
  const deliveryEls = [
    document.getElementById("deliveryFaqText"),
    document.getElementById("footerDelivery")
  ];
  deliveryEls.forEach(el => { if (el) el.textContent = PRODUCT_CONFIG.deliveryText; });

  const waEl = document.getElementById("footerWhatsapp");
  if (waEl) waEl.textContent = formatWhatsappDisplay(PRODUCT_CONFIG.whatsappNumber);
}

/* =========================================================
   Packages — render, select, price
   ========================================================= */
function formatPrice(amount) {
  return PRODUCT_CONFIG.currency + Number(amount).toLocaleString("en-NG");
}

function renderPackages(state) {
  const container = document.getElementById("packages");
  if (!container) return;

  const unitPrices = PRODUCT_CONFIG.packages.map(p => p.price / p.quantity);
  const baseUnit = Math.max(...unitPrices.filter(n => !isNaN(n) && isFinite(n)));

  container.innerHTML = "";
  PRODUCT_CONFIG.packages.forEach(pkg => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = pkg.custom ? "package package-custom" : "package";
    card.setAttribute("data-package-id", pkg.id);
    card.setAttribute("aria-pressed", "false");

    if (pkg.custom) {
      card.innerHTML = `
        <span class="package-name">${pkg.name}</span>
        <span class="package-price package-price-custom">Get a quote</span>
        <span class="package-unit">${pkg.unitNote || ""}</span>
      `;
      card.addEventListener("click", () => {
        trackEvent("whatsapp_click", { source: "custom_package_card" });
        const message = `Hello, I'm interested in a bulk order or a custom card design for the ${PRODUCT_CONFIG.productName}. Please advise on options and pricing.`;
        const url = `https://wa.me/${PRODUCT_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank", "noopener");
      });
      container.appendChild(card);
      return;
    }

    const unitPrice = pkg.price / pkg.quantity;
    const savingsPct = baseUnit > 0 ? Math.round((1 - unitPrice / baseUnit) * 100) : 0;

    card.innerHTML = `
      ${pkg.badge ? `<span class="package-badge">${pkg.badge}</span>` : ""}
      <span class="package-name">${pkg.name}</span>
      <span class="package-price">${formatPrice(pkg.price)}</span>
      <span class="package-unit">${pkg.unitNote || ""}${savingsPct > 0 ? ` · Save ${savingsPct}%` : ""}</span>
    `;

    card.addEventListener("click", () => {
      state.selectedPackageId = pkg.id;
      container.querySelectorAll(".package").forEach(el => {
        el.classList.remove("is-selected");
        el.setAttribute("aria-pressed", "false");
      });
      card.classList.add("is-selected");
      card.setAttribute("aria-pressed", "true");
      syncQuantityFromPackage(state);
      updateSummary(state);
      trackEvent("package_selected", { package: pkg.id });
    });

    container.appendChild(card);
  });

  // Default to the recommended (badged) package, or the first one
  const recommended = PRODUCT_CONFIG.packages.find(p => p.badge) || PRODUCT_CONFIG.packages[0];
  state.selectedPackageId = recommended.id;
  const defaultCard = container.querySelector(`[data-package-id="${recommended.id}"]`);
  if (defaultCard) {
    defaultCard.classList.add("is-selected");
    defaultCard.setAttribute("aria-pressed", "true");
  }
}

function getSelectedPackage(state) {
  return PRODUCT_CONFIG.packages.find(p => p.id === state.selectedPackageId) || PRODUCT_CONFIG.packages[0];
}

function renderQuantityOptions() {
  const select = document.getElementById("quantity");
  if (!select) return;
  select.innerHTML = "";
  PRODUCT_CONFIG.packages.forEach(pkg => {
    if (pkg.custom) return; // has its own direct-to-WhatsApp card, not part of this form
    const opt = document.createElement("option");
    opt.value = pkg.id;
    opt.textContent = `${pkg.name} — ${formatPrice(pkg.price)}`;
    select.appendChild(opt);
  });
}

function syncQuantityFromPackage(state) {
  const select = document.getElementById("quantity");
  if (select) select.value = state.selectedPackageId;
}

function updateSummary(state) {
  const pkg = getSelectedPackage(state);
  const productEl = document.getElementById("summaryProduct");
  const qtyEl = document.getElementById("summaryQty");
  const totalEl = document.getElementById("summaryTotal");
  const savingsEl = document.getElementById("summarySavings");

  if (productEl) productEl.textContent = PRODUCT_CONFIG.productName;
  if (qtyEl) qtyEl.textContent = `${pkg.quantity} card${pkg.quantity > 1 ? "s" : ""} (${pkg.name})`;
  if (totalEl) totalEl.textContent = formatPrice(pkg.price);

  if (savingsEl) {
    const unitPrices = PRODUCT_CONFIG.packages.map(p => p.price / p.quantity);
    const baseUnit = Math.max(...unitPrices.filter(n => !isNaN(n) && isFinite(n)));
    const unitPrice = pkg.price / pkg.quantity;
    const savingsPct = baseUnit > 0 ? Math.round((1 - unitPrice / baseUnit) * 100) : 0;
    savingsEl.textContent = savingsPct > 0 ? `You save ${savingsPct}% per card with this package.` : "";
  }
}

/* =========================================================
   Order form — validation + WhatsApp handoff
   ========================================================= */
function wireOrderForm(state) {
  const form = document.getElementById("orderForm");
  if (!form) return;

  const quantitySelect = document.getElementById("quantity");
  quantitySelect.addEventListener("change", () => {
    state.selectedPackageId = quantitySelect.value;
    document.querySelectorAll(".package").forEach(el => {
      const isMatch = el.getAttribute("data-package-id") === state.selectedPackageId;
      el.classList.toggle("is-selected", isMatch);
      el.setAttribute("aria-pressed", String(isMatch));
    });
    updateSummary(state);
  });

  let formStarted = false;
  form.addEventListener("input", () => {
    if (!formStarted) {
      formStarted = true;
      trackEvent("order_form_start");
    }
  }, { once: false });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const values = {
      fullName: form.fullName.value.trim(),
      businessName: form.businessName.value.trim(),
      phone: form.phone.value.trim(),
      businessType: form.businessType.value,
      quantity: form.quantity.value,
      reviewLink: form.reviewLink.value.trim(),
      notes: form.notes.value.trim()
    };

    const errors = validateOrder(values);
    renderErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstErrorField = form.querySelector(".field.has-error input, .field.has-error select");
      if (firstErrorField) firstErrorField.focus();
      return;
    }

    state.selectedPackageId = values.quantity;
    const pkg = getSelectedPackage(state);

    const confirmState = document.getElementById("confirmState");
    if (confirmState) confirmState.hidden = false;

    trackEvent("order_form_submit", { package: pkg.id });

    const message = buildWhatsappMessage(values, pkg);
    const url = `https://wa.me/${PRODUCT_CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;

    trackEvent("whatsapp_click", { source: "order_form" });
    window.open(url, "_blank", "noopener");
  });
}

function validateOrder(values) {
  const errors = {};

  if (!values.fullName) errors.fullName = "Please enter your full name.";
  if (!values.businessName) errors.businessName = "Please enter your business name.";

  const phoneDigits = values.phone.replace(/[\s-]/g, "");
  const ngPhonePattern = /^(0\d{10}|\+?234\d{10})$/;
  if (!values.phone) {
    errors.phone = "Please enter your phone number.";
  } else if (!ngPhonePattern.test(phoneDigits)) {
    errors.phone = "Enter a valid Nigerian number, e.g. 08012345678.";
  }

  if (!values.businessType) errors.businessType = "Please select your business type.";
  if (!values.quantity) errors.quantity = "Please choose how many cards you need.";

  if (!values.reviewLink) {
    errors.reviewLink = "Please add your Google review link.";
  } else {
    try {
      const parsed = new URL(values.reviewLink);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
    } catch {
      errors.reviewLink = "Enter a valid link starting with https://";
    }
  }

  return errors;
}

function renderErrors(errors) {
  document.querySelectorAll(".field").forEach(field => field.classList.remove("has-error"));
  document.querySelectorAll(".field-error").forEach(el => { el.textContent = ""; });

  Object.entries(errors).forEach(([name, message]) => {
    const errorEl = document.querySelector(`[data-error-for="${name}"]`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.closest(".field").classList.add("has-error");
    }
  });
}

function buildWhatsappMessage(values, pkg) {
  const lines = [
    `Hello, I want to order the ${PRODUCT_CONFIG.productName}.`,
    "",
    `Name: ${values.fullName}`,
    `Business: ${values.businessName}`,
    `Business Type: ${values.businessType}`,
    `Phone: ${values.phone}`,
    `Package: ${pkg.name} (${formatPrice(pkg.price)})`,
    `Google Review Link: ${values.reviewLink}`
  ];
  if (values.notes) lines.push(`Notes: ${values.notes}`);
  lines.push("", "Please help me complete my order.");
  return lines.join("\n");
}

/* =========================================================
   WhatsApp links (header, hero, sticky, final CTA)
   ========================================================= */
function wireWhatsappLinks() {
  const defaultMessage = `Hello, I'd like to know more about the ${PRODUCT_CONFIG.productName}.`;
  const url = `https://wa.me/${PRODUCT_CONFIG.whatsappNumber}?text=${encodeURIComponent(defaultMessage)}`;
  document.querySelectorAll("[data-whatsapp]").forEach(el => {
    el.setAttribute("href", url);
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener");
  });
}

function formatWhatsappDisplay(number) {
  if (!number || number.includes("X")) return "[INSERT WHATSAPP NUMBER]";
  return "+" + number;
}

/* =========================================================
   Smooth scroll buttons
   ========================================================= */
function wireScrollButtons() {
  document.querySelectorAll("[data-scroll]").forEach(el => {
    el.addEventListener("click", () => {
      const target = document.querySelector(el.getAttribute("data-scroll"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* =========================================================
   Sticky mobile CTA — appears after hero
   ========================================================= */
function wireStickyCta() {
  const sticky = document.getElementById("stickyCta");
  const hero = document.querySelector(".hero");
  if (!sticky || !hero) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      sticky.classList.toggle("is-visible", !entry.isIntersecting);
    },
    { threshold: 0 }
  );
  observer.observe(hero);
}

/* =========================================================
   FAQ accordion
   ========================================================= */
function wireAccordion() {
  document.querySelectorAll(".accordion-trigger").forEach(trigger => {
    const panel = trigger.nextElementSibling;
    trigger.addEventListener("click", () => {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!isOpen));
      panel.style.maxHeight = isOpen ? "0px" : panel.scrollHeight + "px";
    });
  });
}

/* =========================================================
   Scroll reveal (subtle, respects prefers-reduced-motion via CSS)
   ========================================================= */
function wireScrollReveal() {
  const targets = document.querySelectorAll(
    ".problem-card, .step, .benefit, .usecase, .package, .proof-card, .value-step, .dashboard-stat, .stack-item, .ecosystem-item"
  );
  targets.forEach(el => el.setAttribute("data-reveal", ""));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  targets.forEach(el => observer.observe(el));

  // Hero star animation replay
  const heroStars = document.getElementById("heroStars");
  const tapDemo = document.getElementById("tapDemo");
  if (heroStars && tapDemo) {
    const cycle = () => {
      heroStars.classList.remove("lit");
      void heroStars.offsetWidth; // restart animation
      heroStars.classList.add("lit");
    };
    cycle();
    setInterval(cycle, 3200);
  }
}
