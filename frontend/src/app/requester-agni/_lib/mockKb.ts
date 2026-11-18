export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  content: string;
}

export const mockKbArticles: KnowledgeBaseArticle[] = [
  {
    id: "campus-wifi",
    title: "Connect to campus Wi-Fi",
    summary: "Set up your student or staff device on the campus wireless network.",
    category: "Network / IT",
    tags: ["wifi", "wireless", "network", "internet", "connect"],
    content: "Choose the campus network on your device and sign in with your college credentials. Forget any old campus network profile before trying again. If sign-in keeps failing, reset your password and reconnect.",
  },
  {
    id: "reset-password",
    title: "Reset your college account password",
    summary: "Recover access to your college account and connected services.",
    category: "Network / IT",
    tags: ["password", "account", "login", "sign in", "reset"],
    content: "Use the password reset link on the sign-in page and follow the instructions sent to your registered email. After resetting, update saved passwords on your devices to avoid repeated lockouts.",
  },
  {
    id: "printer-help",
    title: "Troubleshoot a campus printer",
    summary: "Check printer connection, paper, queue and account balance.",
    category: "Network / IT",
    tags: ["printer", "printing", "paper", "queue", "print"],
    content: "Confirm the printer is powered on and connected to the campus network. Check for paper or error messages, then clear and resend any stuck jobs. Include the printer location when contacting the helpdesk.",
  },
  {
    id: "new-id-card",
    title: "Request a replacement or new ID card",
    summary: "Find out what information to include when requesting an ID card.",
    category: "Other / Admin",
    tags: ["id card", "identity", "replacement", "student card", "admin"],
    content: "Submit your full name, employee or student ID, department, and whether the card is new, damaged, or lost. Do not include sensitive payment information in your request.",
  },
  {
    id: "projector-setup",
    title: "Connect a laptop to a classroom projector",
    summary: "Try the display input and cable checks before requesting AV support.",
    category: "Network / IT",
    tags: ["projector", "classroom", "display", "hdmi", "av"],
    content: "Connect the HDMI cable securely and select the matching input on the projector. Use your device's display settings to mirror or extend the screen. If the projector remains blank, note the room and equipment label.",
  },
  {
    id: "room-cleaning",
    title: "Request classroom or washroom cleaning",
    summary: "Share the building, room number and type of cleaning needed.",
    category: "Housekeeping",
    tags: ["cleaning", "housekeeping", "washroom", "classroom", "spill"],
    content: "For routine cleaning, provide the building and room number and a suitable time. For a spill or sanitation concern, describe the material and whether the area needs to be cordoned off.",
  },
  {
    id: "report-water-leak",
    title: "Report a water leak or blocked drain",
    summary: "Help the facilities team locate plumbing problems quickly.",
    category: "Plumbing",
    tags: ["water", "leak", "plumbing", "drain", "tap"],
    content: "Include the building, floor and nearest room or landmark. Mention whether water is actively flowing, when you first noticed it, and any nearby equipment at risk.",
  },
  {
    id: "electrical-safety",
    title: "Report an electrical or lighting problem",
    summary: "What to include for flickering lights, outlets or electrical hazards.",
    category: "Electrical",
    tags: ["electrical", "light", "lighting", "outlet", "power", "safety"],
    content: "Provide the exact room and location of the fault and describe what you observed. If you see sparks, smell burning, or notice exposed wiring, keep away from the area and contact campus security immediately.",
  },
];
