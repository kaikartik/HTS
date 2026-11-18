export const ticketCategories = {
  "Network / IT": ["Campus Wi-Fi", "Account access", "Computer or software", "Email and printing"],
  Electrical: ["Lighting", "Fans and ventilation", "Power outlet", "Electrical safety"],
  Carpentry: ["Desk or chair repair", "Door or lock", "Cabinet or shelf", "Window or fixture"],
  Plumbing: ["Leak or pipe", "Tap or sink", "Toilet or drain", "Water supply"],
  Housekeeping: ["Room cleaning", "Washroom cleaning", "Waste collection", "Spill or sanitation"],
  "Other / Admin": ["ID card request", "Document or records", "Room or facility request", "Other administrative help"],
} as const;

export type TicketCategory = keyof typeof ticketCategories;
