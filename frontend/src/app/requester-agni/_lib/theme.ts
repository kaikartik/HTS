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
  mutedText: "text-[#5B6B80]",
  primaryText: "text-[#00448E]",
  primaryBackground: "bg-[#00448E]",
  primaryButton: "bg-[#00448E] text-white hover:bg-[#003470]",
  activeNavigation: "bg-[#E6EEF8] text-[#00448E]",
  softBackground: "bg-[#E6EEF8]",
  focusOutline: "focus-visible:outline-[#00448E]",
} as const;