import { Skeleton } from "@/components/khushaan/ui";
import { strings } from "@/lib/khushaan/strings";

export default function SupervisorLoading() {
  return <Skeleton label={`${strings.shell.supervisorSection}: ${strings.common.loading}`} rows={6} />;
}