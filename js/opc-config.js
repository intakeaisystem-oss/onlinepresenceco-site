/* Online Presence Co. measurement settings. ONE place for every ID.
 * Empty string = that tag is off. Nothing loads from Google or Meta until an ID is filled in here.
 * These IDs are public by design (they appear in every page that uses them). No secrets go in this file:
 * the Meta Conversions API token lives only in the Apps Script project's Script Properties. */
window.OPC_CONFIG = {
  ga4: "",                    // Google Analytics 4 measurement ID, looks like G-XXXXXXXXXX
  googleAds: "",              // Google Ads tag ID, looks like AW-1234567890
  googleAdsLeadLabel: "",     // conversion label of the "Lead form submitted" action
  googleAdsBookLabel: "",     // conversion label of the "Booking page reached" action (secondary)
  metaPixel: "",              // Meta Pixel ID, 15 or 16 digits
  leadEndpoint: "https://script.google.com/macros/s/AKfycbw8twuCcLLaw4rgTMWBinLeOsKUYxM-Shx3cOYnxpJPcJce4XR4RiS-HhTBcfcpOpd1/exec",
  beacon: true,               // first-party, cookieless page stats sent to our own lead backend
  consent: "notice"           // "notice": tags run unless the visitor declines or the browser sends GPC / Do Not Track.
                              // "optin":  tags wait until the visitor presses OK.
};
