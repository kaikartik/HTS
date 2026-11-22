import { Skeleton } from "@/components/khushaan/ui";
import { strings } from "@/lib/khushaan/strings";

export default function AdminLoading() {
  return <Skeleton label={`${strings.shell.adminSection}: ${strings.common.loading}`} rows={6} />;
}