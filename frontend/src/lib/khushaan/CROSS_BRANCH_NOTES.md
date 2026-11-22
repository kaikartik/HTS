# Cross-Branch Integration Notes

## Integration owner
- Kartik Saxena: replace `auth-stub.ts` with the real session and role guard. Preserve `/admin-khus/**` Admin-only protection.
- Ketan Tripathi: implement the REST endpoints below. Integration should primarily change `api.ts` and leave page components unchanged.
- Shared frontend owner: official IPEC logo asset and shared navigation links are outside this branch.

## API contract table

| api.ts function | Future REST endpoint | Method | Request shape | Response shape |
|---|---|---|---|---|
| `getDashboardStats()` | `/api/supervisor/dashboard` | GET | None | `DashboardStats` |
| `listTickets(filters)` | `/api/tickets` | GET | `TicketFilters` query parameters | `TicketPage` |
| `getTicket(ticketNo)` | `/api/tickets/:ticketNo` | GET | `ticketNo` path | `Ticket \| null` |
| `assignTicket(ticketNo, assigneeId, teamId?)` | `/api/tickets/:ticketNo/assign` | PATCH | `{ assignee_id, team_id }` | `Ticket` |
| `mergeTickets(primaryTicketNo, duplicateTicketNos)` | `/api/tickets/:ticketNo/merge` | POST | `{ duplicate_ticket_nos: string[] }` | `Ticket` |
| `listUsers()` | `/api/users` | GET | Optional role/team/active/search filters | `User[]` |
| `saveUser(user)` | `/api/users/:userId` | POST/PATCH | `User`; omit `user_id` for create | `User` |
| `setUserActive(userId, isActive)` | `/api/users/:userId/active` | PATCH | `{ is_active: boolean }` | `User` |
| `listTeams()` | `/api/teams` | GET | Optional active/search filters | `Team[]` |
| `saveTeam(team)` | `/api/teams/:teamId` | POST/PATCH | `Team` including lead/members | `Team` |
| `listCategories()` | `/api/categories` | GET | Optional active/parent filters | `Category[]` |
| `saveCategory(category)` | `/api/categories/:categoryId` | POST/PATCH | `Category` with parent/default team | `Category` |
| `listSlaPolicies()` | `/api/sla-policies` | GET | None | `SlaPolicy[]` |
| `saveSlaPolicy(policy)` | `/api/sla-policies/:policyId` | POST/PATCH | `SlaPolicy` | `SlaPolicy` |
| `listAuditEntries()` | `/api/audit-log` | GET | Optional user/action/from/to/page/sort | `AuditEntry[]` |
| `getReport(range)` | `/api/reports` | GET | `{ from, to }` | `ReportData` |
| `getBusinessHours()` | `/api/business-hours` | GET | None | `BusinessHours` |
| `saveBusinessHours(hours)` | `/api/business-hours` | PUT/PATCH | `BusinessHours` | `BusinessHours` |
| `listHolidays()` | `/api/holidays` | GET | Optional from/to | `Holiday[]` |
| `saveHoliday(holiday)` | `/api/holidays` | POST/PATCH | `Holiday` | `Holiday` |
| `deleteHoliday(holidayId)` | `/api/holidays/:holidayId` | DELETE | `holidayId` path | `204 No Content` |
| `listNotificationTemplates()` | `/api/notification-templates` | GET | Optional event_key/active | `NotificationTemplate[]` |
| `saveNotificationTemplate(template)` | `/api/notification-templates/:templateId` | POST/PATCH | `NotificationTemplate` | `NotificationTemplate` |
| `getSettings()` | `/api/settings` | GET | None | `SystemSettings` with password booleans only |
| `saveSettings(settings)` | `/api/settings` | PUT/PATCH | `SystemSettings` plus optional password fields | `SystemSettings` with password booleans only |
| `listTicketComments(ticketNo)` | `/api/tickets/:ticketNo/comments` | GET | `ticketNo` path | `Comment[]` |
| `listTicketHistory(ticketNo)` | `/api/tickets/:ticketNo/history` | GET | `ticketNo` path | `TicketHistory[]` |

## Common integration rules
- Mutable operations require Supervisor or Admin authorization; Admin-only operations require the Admin role.
- Never return SMTP, LDAP or bind passwords. Use `smtp_password_configured` and `ldap_bind_password_configured` booleans.
- Audit records are immutable: expose only GET/filter/export operations.
- Keep `USE_MOCK = true` until backend routes are available.
- Times are ISO 8601 strings; dates are `YYYY-MM-DD`; preserve first-response and resolution due/pause fields.
- Pagination is 25 rows for ticket/audit pages. Preserve existing filter and sort query names.

## Scope
- No new dependencies or assets were added.
- CSV export uses native escaping and spreadsheet formula protection.
- PDF export uses `window.print()` and print styles.