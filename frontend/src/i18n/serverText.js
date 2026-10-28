import { T } from "./mark.js";

// English text the backend sends for display. `{name}` marks a value the backend fills
// in (a percentage, a number of days…). `tServer(t, text)` recognises an incoming
// sentence against these templates, pulls the values back out, and shows it in the
// chosen language with each value placed where that language's grammar wants it.
// Anything not listed is shown as received, so a new backend message is never lost —
// it just stays in English until it is added here.
const TEMPLATES = [
  // Sell-decision engine: reasons
  T("Expected price rise is the key reason to hold your produce."),
  T("Expected price drop is pushing toward selling now."),
  T("Available storage is enabling the hold/aggregate option."),
  T("Lack of storage is limiting your options."),
  T("High chance of rain is a risk to stored produce."),
  T("Good buyer demand in your area supports selling now."),
  T("Low buyer demand in your area suggests waiting."),
  T("Crop has been harvested recently — holding is feasible."),
  T("Crop has been harvested a while ago — selling sooner is safer."),
  T("Based on current market conditions and farm data."),
  T("Rain probability is high ({pct}%) and you have no storage."),
  T("Selling now protects you from crop spoilage risk."),
  T("Buyer demand in your area is strong right now."),
  T("Current price is fair — take advantage of the demand."),
  T("Price is expected to rise by {pct}% in 7 days."),
  T("You have enough storage ({kg} kg available)."),
  T("Holding now will earn more per kg after accounting for storage cost."),
  T("Price is expected to rise {pct}% but your storage is insufficient."),
  T("Pooling with your local FPO unlocks shared storage and bulk buyer access."),
  T("FPO aggregation also gives you stronger negotiating power."),
  T("Price is forecast to fall {pct}% this week."),
  T("Selling now secures today's better margin."),
  T("Crop harvested {days} days ago — perishability risk is increasing."),
  T("Selling now prevents quality deterioration and price penalty."),
  T("Market prices are stable with minor expected fluctuation."),
  T("Short wait recommended to observe buyer demand trends before committing."),

  // Sell-decision engine: action, engine, drivers
  T("SELL NOW"), T("WAIT"), T("STORE"), T("AGGREGATE"),
  T("XGBoost"), T("Rule-based engine"),
  T("price change pct"), T("has storage"), T("rain probability pct"), T("demand score"),
  T("days since harvest"), T("current price"), T("predicted price"), T("quantity kg"),
  T("storage capacity kg"), T("price volatility 30d"), T("distance to nearest buyer km"),
  T("transport cost per kg"), T("storage cost per kg"), T("predicted price 7d"), T("expected gain per kg"),

  // Levels and weather
  T("High"), T("Medium"), T("Moderate"), T("Low"),
  T("HIGH"), T("MEDIUM"), T("LOW"),
  T("Favourable"), T("Favourable / Clear Skies"), T("Light Rain Expected"), T("Heavy Rain Warning"), T("Clear"),
  // Quality grading, storage and loan results
  T("{value}% (Max Permissible: {max}%)"), T("{value} mm"),
  T("{from}°C to {to}°C"), T("{from}°C to {to}°C (Controlled Atmosphere)"),
];

// Plain backend phrases (no values in them): shown with `t(text)` or `tServer(t, text)`.
// Listed here so they are part of the translation tables.
T("Buyer Escrow Funded"); T("Dispatched / Logistics Pickup"); T("Gate Quality Verified"); T("Payout Released to Farmer");
T("KISANSETU AGRICULTURAL TRADE INVOICE & ESCROW RECEIPT"); T("100% KisanSetu Escrow Protected");
T("Automated Escrow Bank Settlement / Instant UPI");
T("Grade A"); T("Grade B"); T("Grade C");
T("Grade A (Export)"); T("Grade B (Wholesale)"); T("Grade C (Local Processing)");
T("Grade A (Aggregated Bulk)"); T("Grade A (Export / Premium)");
T("Grade B (Domestic Wholesale / Food Grade)"); T("Grade C (Processing / Feed Grade)");
T("Premium produce with high color uniformity and negligible defects.");
T("Good quality suitable for wholesale and processing.");
T("Fair quality lot. Recommend discount selling or industrial processor buyer.");
T("Minor size variation"); T("Surface discoloration"); T("Slight mechanical abrasion");
T("Sprouting"); T("High size heterogeneity"); T("Minor pest marks");
T("Eligible for Corporate/Export B2B Procurement at premium rates.");
T("Ready for APMC Mandi or Food Processor Procurement.");
T("Suitable for Animal Feed or Industrial Distilleries.");
T("WDRA Accredited Cold Storage"); T("Multi-Temperature Controlled Facility");
T("Scientific Grain Storage Silos"); T("FPO Owned Cold Storage Hub");
T("Ambient / Aerated");
T("Fruits"); T("Vegetables"); T("Spices");
T("State Bank of India"); T("NABARD"); T("Bank of Baroda"); T("HDFC Rural");
T("100% Protected");
T("Today (Current)"); T("3 Days"); T("7 Days"); T("15 Days"); T("30 Days");
T("Normal"); T("High Arrivals"); T("Stabilizing"); T("Lean Season Spike");
T("UPWARD"); T("DOWNWARD"); T("STABLE");
T("Hold for 30 Days (Lean Season)"); T("Sell within 3-7 Days");
T("AGMARKNET live feed"); T("KisanSetu local historical reference"); T("Local historical reference");
T("Transaction not found"); T("Grievance ticket not found");
T("This mobile number is already used by another account."); T("Profile not found. Finish registration first.");

// Place and market names the backend sends from its built-in reference lists.
T("Central Warehousing Corporation (CWC) Agro Hub"); T("Indore Agri-Logistics & Multi-Chamber Cold Chain");
T("Dewas State Warehousing Corporation Dry Silos"); T("Ratlam Krishak Samriddhi Cold Storage");
T("Agra APMC"); T("Ahmednagar Mandi"); T("Aligarh Market Yard"); T("Amreli APMC"); T("Bangalore Yeshwanthpur");
T("Bellary APMC"); T("Chintamani Mandi"); T("Davangere APMC"); T("Dewas Krishi Upaj Mandi"); T("Dewas Mandi");
T("Farrukhabad Mandi"); T("Gondal Marketing Yard"); T("Hathras Mandi"); T("Hosur Mandi"); T("Hubli APMC");
T("Indore Main Mandi"); T("Indore Mandi (Choithram)"); T("Kadi Cotton Yard"); T("Kanpur Mandi"); T("Kolar APMC");
T("Lasalgaon APMC"); T("Latur APMC"); T("Madanapalle APMC"); T("Neemuch Mandi"); T("Pimpalgaon Mandi");
T("Pune Gultekdi Market"); T("Rajkot APMC"); T("Ranebennur Mandi"); T("Ratlam Anaj Mandi"); T("Shajapur Mandi");
T("Shimoga Market"); T("Surendranagar Mandi"); T("Ujjain APMC"); T("Ujjain Mandi"); T("Vashi APMC (Navi Mumbai)");
T("Agra"); T("Ahmednagar"); T("Aligarh"); T("Amreli"); T("Annamayya"); T("Bangalore"); T("Bellary"); T("Chikkaballapur");
T("Davangere"); T("Dewas"); T("Dharwad"); T("Farrukhabad"); T("Hathras"); T("Haveri"); T("Indore"); T("Kanpur"); T("Kolar");
T("Krishnagiri"); T("Latur"); T("Mehsana"); T("Nashik"); T("Neemuch"); T("Pune"); T("Rajkot"); T("Ratlam"); T("Shajapur");
T("Shimoga"); T("Surendranagar"); T("Thane"); T("Ujjain");
T("Andhra Pradesh"); T("Gujarat"); T("Karnataka"); T("Madhya Pradesh"); T("Maharashtra"); T("Tamil Nadu"); T("Uttar Pradesh");

// Status / stage / party codes the backend stores (UPPER_SNAKE_CASE) and the readable
// wording shown for each. `tStatus(t, code)` translates that wording.
const STATUS_LABELS = {
  OFFER_SUBMITTED: T("Offer submitted"),
  COUNTER_OFFERED: T("Counter-offer sent"),
  ACCEPTED: T("Accepted"),
  ESCROW_PREAUTH_READY: T("Escrow pre-authorized"),
  FUNDS_LOCKED: T("Funds locked in escrow"),
  LISTED: T("Listed"),
  MATCHED: T("Matched"),
  SOLD: T("Sold"),
  OPEN: T("Open"),
  ACTIVE: T("Active"),
  FULFILLED: T("Fulfilled"),
  CLOSED: T("Closed"),
  RESOLVED: T("Resolved"),
  UNDER_MEDIATION: T("Under mediation"),
  COMPLETED: T("Completed"),
  ESCROWED: T("In escrow"),
  DISPUTED: T("Disputed"),
  PENDING: T("Pending"),
  FUNDS_ESCROWED: T("Funds escrowed"),
  FUNDS_LOCKED_IN_ESCROW: T("Funds locked in escrow"),
  READY_FOR_PICKUP: T("Ready for pickup"),
  DISPATCHED_IN_TRANSIT: T("Dispatched, in transit"),
  IN_TRANSIT: T("In transit"),
  DISPATCHED: T("Dispatched"),
  QUALITY_GATE_VERIFIED: T("Quality gate verified"),
  VERIFIED: T("Verified"),
  QUALITY_PASSED: T("Quality passed"),
  PAYOUT_DISBURSED: T("Payout disbursed"),
  PAID_RAZORPAY_SETTLED: T("Paid and settled"),
  DELIVERED_AND_VERIFIED: T("Delivered and verified"),
  READY_FOR_DISBURSEMENT: T("Ready for disbursement"),
  FARMER: T("Farmer"),
  BUYER: T("Buyer"),
  FPO: T("FPO"),
};

// Buyer categories and similar short labels that arrive as plain English words.
T("Wholesaler"); T("Processor"); T("Retailer"); T("Institutional"); T("Bulk"); T("Food Processor"); T("Retail Chain");
T("Institutional Buyer"); T("Bulk Exporter"); T("Land Owner"); T("Tenant");

/** Shows a backend status/stage/party code (e.g. FUNDS_LOCKED) as readable text in the current language. */
export function tStatus(t, code) {
  if (!code) return code;
  const known = STATUS_LABELS[code];
  if (known) return t(known);
  const readable = String(code).replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
  return t(readable);
}

function compile(template) {
  const names = [];
  let pattern = "";
  template.split(/\{(\w+)\}/).forEach((part, i) => {
    if (i % 2 === 0) pattern += part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    else {
      names.push(part);
      pattern += "(.+?)";
    }
  });
  return { template, names, regex: new RegExp(`^${pattern}$`) };
}

// Only templates that actually contain a value need pattern matching; the rest are
// plain phrases that `t()` finds by exact text.
const MATCHERS = TEMPLATES.filter((tpl) => tpl.includes("{")).map(compile);

/** Shows a backend-supplied English message in the current language. */
export function tServer(t, text) {
  if (typeof text !== "string" || !text) return text;
  for (const { template, names, regex } of MATCHERS) {
    const hit = regex.exec(text);
    if (hit) {
      const vars = {};
      names.forEach((name, i) => {
        vars[name] = hit[i + 1];
      });
      return t(template, vars);
    }
  }
  return t(text);
}
