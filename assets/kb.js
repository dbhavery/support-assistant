/*
 * Customer Support Assistant, static showcase knowledge base.
 *
 * This is the grounded-answer source for the public demo. In the real app
 * (apps/customer-assistant, local RAG + Ollama) these same six help articles
 * are chunked into ChromaDB, retrieved by MiniLM embeddings, and handed to a
 * local LLM that writes the answer. Here, for an always-on $0 static demo, the
 * answers are pre-baked from the SAME articles and matched client-side, so
 * what a visitor reads is still grounded in (and cited to) the real docs.
 *
 * Company profile mirrors companies/northwind-outdoors/company.yaml.
 */
window.SUPPORT_KB = (function () {
  "use strict";

  var company = {
    id: "northwind-outdoors",
    display_name: "Northwind Outdoors",
    tagline: "Gear for people who'd rather be outside",
    greeting:
      "Hi, I'm Northwind's virtual assistant. I can help with orders, returns, shipping, gear care, and warranties, and I'll bring in a human the moment you'd rather talk to one.",
    colors: {
      primary: "#1f6f54",
      accent: "#f4a23b",
      background: "#0f1411",
      surface: "#161d18",
      text: "#e8efe9",
    },
    escalation: {
      contact: {
        email: "support@northwind-outdoors.example.com",
        phone: "1-800-555-0142",
        hours: "Mon–Fri, 8am–6pm PT",
      },
      message:
        "Let me bring in a teammate. I'm passing them this whole conversation so you won't have to repeat anything.",
    },
  };

  // Escalation triggers, verbatim from company.yaml. Checked before answering.
  var escalationTriggers = [
    "speak to a human",
    "talk to a human",
    "talk to a person",
    "real person",
    "agent",
    "representative",
    "refund over $300",
    "lost package",
    "lost parcel",
    "package is lost",
    "damaged on arrival",
    "arrived damaged",
    "damaged shipment",
    "legal",
    "lawyer",
    "chargeback",
    "dispute the charge",
  ];

  // Frustration / negative-sentiment cues. The research finding: don't make an
  // upset customer keep typing at a bot. Detect it, show specific empathy, and
  // escalate immediately rather than answering on.
  var frustrationTriggers = [
    "frustrated", "frustrating", "ridiculous", "unacceptable", "terrible",
    "awful", "furious", "angry", "fed up", "this is crazy", "annoyed",
    "annoying", "the worst", "useless", "sick of", "horrible", "disappointed",
    "waste of time", "no one will help", "still not", "again",
  ];

  // Out-of-scope topics, from company.yaml out_of_scope.
  var outOfScope = [
    { kw: ["wholesale", "b2b", "bulk pricing", "reseller", "trade account"], topic: "wholesale / B2B pricing" },
    { kw: ["credit card number", "card details", "cvv", "card number"], topic: "payment-card details" },
  ];

  // Grounded intents. Each answer is drawn from the cited help article.
  // keywords are matched (with light stemming) against the user's message.
  var intents = [
    {
      id: "returns-window",
      source: "returns-policy.md",
      keywords: ["return", "return window", "return policy", "send back", "send it back", "money back", "refund policy", "how long to return", "60 days"],
      answer:
        "You can return most items within 60 days of delivery for a full refund to your original payment method. Items need to be unused, with original tags attached, and in their original packaging. Worn or washed apparel and used gear can't be returned unless it's covered by warranty.",
    },
    {
      id: "start-return",
      source: "returns-policy.md",
      keywords: ["how do i return", "start a return", "start return", "return label", "begin a return", "initiate return", "return an item"],
      answer:
        "To start a return: go to Account → Orders, select the order, choose Start a Return, and pick the items and a reason. We'll email you a prepaid label, drop the package at any carrier location within 14 days. Returns are free for US orders; for Canadian orders the customer pays return shipping.",
    },
    {
      id: "refund-timing",
      source: "returns-policy.md",
      keywords: ["refund take", "how long refund", "when refund", "refund time", "get my money", "refund timing", "money back when"],
      answer:
        "Once our warehouse receives and inspects your return (usually 2–3 business days), we issue the refund. It then posts to your original payment method within 5–7 business days. We'll email you when the refund is issued.",
    },
    {
      id: "non-returnable",
      source: "returns-policy.md",
      keywords: ["non returnable", "cannot return", "can't return", "not returnable", "final sale", "clearance return", "exchange size", "exchange"],
      answer:
        "A few things can't be returned: gift cards, final-sale/clearance items marked \"no returns,\" used climbing safety gear (harnesses, ropes, carabiners), and custom-engraved products. For exchanges, the fastest path is to return the original for a refund and place a new order, or ask support for a direct size exchange with free reshipping if the item's in stock.",
    },
    {
      id: "shipping-cost",
      source: "shipping-policy.md",
      keywords: ["shipping cost", "how much shipping", "shipping price", "free shipping", "delivery cost", "shipping options", "shipping rates", "expedited", "overnight", "ship to canada", "international shipping"],
      answer:
        "Shipping options: Standard Ground is free on orders over $75 (otherwise $6.95, 3–7 business days); Expedited is $14.95 (2 business days); Overnight is $29.95 (next business day if ordered before 12pm PT). We ship to all 50 US states and to Canada, Canada Standard is $19.95 (7–12 business days). We currently ship internationally only to Canada.",
    },
    {
      id: "ship-time",
      source: "shipping-policy.md",
      keywords: ["when ship", "how fast ship", "processing time", "same day", "when will it ship", "order processing", "how long to ship"],
      answer:
        "Orders placed before 12:00pm Pacific Time on a business day ship the same day; orders after that, or on weekends/holidays, ship the next business day. Most in-stock orders process within one business day, during major sales it can take up to three. You'll get a shipping confirmation email with tracking when it leaves our Bend, Oregon warehouse.",
    },
    {
      id: "tracking",
      source: "shipping-policy.md",
      keywords: ["track", "tracking", "where is my order", "where's my order", "track my order", "tracking number", "order status"],
      answer:
        "Every shipment includes a tracking number sent to the email on your order, you can also see it under Account → Orders. If your tracking hasn't updated in more than three business days, contact support and we'll open a trace with the carrier.",
    },
    {
      id: "warranty",
      source: "warranty.md",
      keywords: ["warranty", "northwind promise", "defect", "guarantee", "broken zipper", "seam failed", "lifetime warranty", "warranty claim", "file a claim"],
      answer:
        "Every product is covered by the Northwind Promise, a limited warranty against defects in materials and workmanship for the practical lifetime of the product (failed seams, zippers that break under normal use, delaminating membranes, hardware that cracks without misuse). Normal wear and tear, accident, and misuse aren't covered. To file: email warranty@northwind-outdoors.example.com or use Account → Warranty Claim with your order number and clear photos. Most claims are reviewed within 5 business days.",
    },
    {
      id: "password",
      source: "account-and-orders.md",
      keywords: ["password", "reset password", "forgot password", "can't log in", "cant log in", "sign in", "login", "locked out"],
      answer:
        "On the sign-in page, choose Forgot password and enter your email. We'll send a reset link that's valid for 60 minutes. If it doesn't arrive, check spam, then contact support.",
    },
    {
      id: "change-order",
      source: "account-and-orders.md",
      keywords: ["change my order", "cancel order", "cancel my order", "edit order", "modify order", "add item", "wrong address order"],
      answer:
        "Orders can be changed or canceled only before they ship, and in-stock orders often ship within an hour, so contact support as soon as possible. Once an order has a tracking number it can't be canceled, but you can refuse delivery or return it. We can't add items to an existing order; place a second order and we'll refund the extra shipping if both ship the same day.",
    },
    {
      id: "payment",
      source: "account-and-orders.md",
      keywords: ["payment methods", "how do i pay", "what cards", "apple pay", "google pay", "gift card", "promo code", "when am i charged"],
      answer:
        "We accept Visa, Mastercard, American Express, Discover, Apple Pay, Google Pay, and Northwind gift cards (no checks, wires, or crypto). Your card is authorized at checkout and charged when the order ships. Promo codes go in the cart before checkout, one code per order, not combinable with final-sale pricing.",
    },
    {
      id: "wrong-missing-item",
      source: "account-and-orders.md",
      keywords: ["wrong item", "missing item", "received the wrong", "didn't get everything", "item missing", "incomplete order"],
      answer:
        "Received the wrong item? Contact support within 30 days with your order number and a photo, we'll send the correct item plus a prepaid label for the wrong one at no cost. Missing an item? Sometimes things ship separately, so check for multiple tracking numbers first; if it's still missing after all packages arrive, contact support.",
    },
    {
      id: "sizing",
      source: "product-faq.md",
      keywords: ["size", "sizing", "fit", "run large", "run small", "true to size", "boots fit", "jacket fit", "between sizes"],
      answer:
        "Our shell jackets fit true to size with room for a midlayer, if you're between sizes and layer heavily, size up. Hiking boots run about a half size large (a true 10 is usually happiest in our 9.5). Every product page has a size chart with chest, waist, and sleeve measurements.",
    },
    {
      id: "waterproof-care",
      source: "product-faq.md",
      keywords: ["waterproof", "rain shell", "wash jacket", "dwr", "care", "wash waterproof", "down sleeping bag", "how to wash"],
      answer:
        "Our rain shells use a 3-layer waterproof-breathable membrane rated to a 20,000mm water column. Wash with a technical wash (not regular detergent) on a gentle cycle and tumble dry low to reactivate the DWR, skip fabric softener, it clogs the membrane. Reapply a spray-on DWR once water stops beading. Down bags: store uncompressed, wash rarely with down-specific soap, dry low with clean tennis balls.",
    },
    {
      id: "restock",
      source: "product-faq.md",
      keywords: ["restock", "sold out", "out of stock", "back in stock", "notify me", "when available"],
      answer:
        "Popular items usually restock within 2–4 weeks. Use the \"Notify me\" button on the product page and we'll email you when your size is back.",
    },
    {
      id: "hours",
      source: "contact-and-hours.md",
      keywords: ["hours", "open", "support hours", "when are you open", "what time", "weekend"],
      answer:
        "Support is available Monday–Friday 8:00am–6:00pm PT, Saturday 9:00am–2:00pm PT, and closed Sunday and major US holidays. Outside those hours you can still browse help articles or start a return/warranty claim online, and we'll follow up the next business day.",
    },
    {
      id: "contact",
      source: "contact-and-hours.md",
      keywords: ["contact", "phone number", "email", "how to reach", "get in touch", "customer service number", "call you"],
      answer:
        "You can reach us by email at support@northwind-outdoors.example.com (replies within 1 business day), by phone at 1-800-555-0142, or via live chat during support hours. Warranty claims go to warranty@northwind-outdoors.example.com.",
    },
    {
      id: "returns-address",
      source: "contact-and-hours.md",
      keywords: ["return address", "where to send return", "warehouse address", "mail my return", "shipping address for returns"],
      answer:
        "Returns go to: Northwind Outdoors, Returns Department, 1450 Cascade Way, Bend, OR 97701. Please don't send a return without a label from Account → Orders, unlabeled packages can't be matched to your order and may delay your refund.",
    },
  ];

  return {
    company: company,
    intents: intents,
    escalationTriggers: escalationTriggers,
    frustrationTriggers: frustrationTriggers,
    outOfScope: outOfScope,
  };
})();
