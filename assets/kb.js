/*
 * Customer Support Assistant: the sample company's settings.
 *
 * Company profile, escalation and frustration triggers, out-of-scope topics,
 * and the list of help articles in /kb. The company "Northwind Outdoors" is
 * invented for the demo. Answers do not live here: they come from the help
 * articles in /kb, ranked by BM25 in assets/core.js.
 *
 * Loaded as a plain script in the browser (window.SUPPORT_KB) and with
 * require() in tests.
 */
var SUPPORT_KB = (function () {
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
        hours: "Mon to Fri, 8am to 6pm PT",
      },
      message:
        "Let me bring in a teammate. Below is the summary they would get, so you would not have to repeat anything.",
    },
  };

  // Escalation triggers: a request for a person, or a high-stakes topic.
  // Matched as whole words (SupportCore.matchPhrase), checked before answering.
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

  // Frustration cues. The research finding: don't make an
  // upset customer keep typing at a bot. Detect it, show specific empathy, and
  // escalate immediately rather than answering on.
  var frustrationTriggers = [
    "frustrated", "frustrating", "ridiculous", "unacceptable", "terrible",
    "awful", "furious", "angry", "fed up", "this is crazy", "annoyed",
    "annoying", "the worst", "useless", "sick of", "horrible", "disappointed",
    "waste of time", "no one will help", "still not", "again",
  ];

  // Out-of-scope topics: the assistant declines these instead of guessing.
  var outOfScope = [
    { kw: ["wholesale", "b2b", "bulk pricing", "reseller", "trade account"], topic: "wholesale / B2B pricing" },
    { kw: ["credit card number", "card details", "cvv", "card number"], topic: "payment-card details" },
  ];

  // The help articles in /kb. The widget fetches these files and indexes them
  // in the browser (assets/core.js); api/answer.js reads the same files.
  var articles = [
    "returns-policy.md",
    "shipping-policy.md",
    "warranty.md",
    "account-and-orders.md",
    "product-faq.md",
    "contact-and-hours.md",
  ];

  return {
    company: company,
    articles: articles,
    escalationTriggers: escalationTriggers,
    frustrationTriggers: frustrationTriggers,
    outOfScope: outOfScope,
  };
})();

if (typeof module === "object" && module.exports) module.exports = SUPPORT_KB;
else window.SUPPORT_KB = SUPPORT_KB;
