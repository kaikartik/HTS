// Canned responses (FR-21). Placeholder {name} is replaced by the requester's first name.
export const CANNED_RESPONSES: { label: string; body: string }[] = [
  {
    label: "Acknowledge ticket",
    body: "Hi {name}, thank you for contacting the helpdesk. We have received your request and are looking into it. We will update you shortly.",
  },
  {
    label: "Need more information",
    body: "Hi {name}, to help us resolve this faster, could you please share more details (what you were doing, any error message, and a screenshot if possible)?",
  },
  {
    label: "Basic troubleshooting",
    body: "Hi {name}, please try restarting the device/application and check whether the problem still occurs. Let us know the result and we will take it from there.",
  },
  {
    label: "Issue resolved",
    body: "Hi {name}, the issue has been fixed. Please check and confirm that everything works for you. If the problem comes back, you can reopen this ticket within 7 days.",
  },
  {
    label: "Waiting for requester",
    body: "Hi {name}, we are waiting for your reply to continue working on this ticket. The ticket is on hold until we hear from you.",
  },
];

export function fillCanned(body: string, requesterName: string) {
  const first = requesterName.trim().split(/\s+/)[0] || "there";
  return body.replaceAll("{name}", first);
}
