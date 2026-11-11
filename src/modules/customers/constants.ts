import type { BrokerCustomerSort } from "@/lib/supabase/broker.types";

export const brokerCustomerSortOptions: ReadonlyArray<{
  value: BrokerCustomerSort;
  label: string;
}> = [
  { value: "recent-enquiry", label: "Latest enquiry" },
  { value: "recent-activity", label: "Latest activity" },
  { value: "newest", label: "Newest customer" },
  { value: "name", label: "Name" },
];

export const brokerCustomerSortLabels: Record<BrokerCustomerSort, string> = {
  "recent-enquiry": "Latest enquiry",
  "recent-activity": "Latest activity",
  newest: "Newest customer",
  name: "Name",
};
