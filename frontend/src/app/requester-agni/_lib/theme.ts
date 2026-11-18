export const themeColors = {
  primary: "#00448E",
  primaryHover: "#003470",
  lightBlue: "#E6EEF8",
  page: "#F4F7FB",
  white: "#FFFFFF",
  border: "#D9E2EF",
  text: "#0F1F33",
  muted: "#5B6B80",
} as const;

export const themeClasses = {
  page: "bg-[#F4F7FB] text-[#0F1F33]",
  surface: "bg-[#FFFFFF]",
  border: "border-[#D9E2EF]",
  mainText: "text-[#0F1F33]",
  mutedText: "text-[#5B6B80]",
  primaryText: "text-[#00448E]",
  primaryBackground: "bg-[#00448E]",
  primaryButton: "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#00448E] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,68,142,0.16)] transition hover:bg-[#003470] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E] disabled:cursor-wait disabled:bg-[#5B6B80] disabled:shadow-none",
  authPanel: "bg-[#00448E]",
  authPanelDecorationSoft: "border-[#E6EEF8]/20",
  authPanelDecoration: "border-[#E6EEF8]/40",
  authPanelFocus: "focus-visible:outline-[#E6EEF8]",
  authInput: "h-12 w-full rounded-xl border border-[#D9E2EF] bg-white px-3.5 text-base text-[#0F1F33] outline-none transition placeholder:text-[#5B6B80] hover:border-[#00448E]/50 focus-visible:border-[#00448E] focus-visible:ring-2 focus-visible:ring-[#00448E]/25 aria-invalid:border-[#b33b38] aria-invalid:focus-visible:ring-[#b33b38]/20",
  activeNavigation: "bg-[#E6EEF8] text-[#00448E]",
  softBackground: "bg-[#E6EEF8]",
  focusOutline: "focus-visible:outline-[#00448E]",
} as const;