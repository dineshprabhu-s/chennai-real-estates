"use client";

import {
  Inbox,
  Repeat2,
  RotateCcw,
  Search,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { loadBrokerCustomerHistory } from "./history-actions";
import { AdminDataTable, type AdminTableColumn } from "@/components/admin/data-table";
import { StatCard } from "@/components/admin/stat-card";
import { EmptyState } from "@/components/common/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatDate } from "@/lib/format";
import type {
  BrokerCustomer,
  BrokerCustomerPage,
  BrokerCustomerSort,
  BrokerCustomerStats,
} from "@/lib/supabase/broker.types";
import { brokerCustomerSortOptions } from "@/modules/customers/constants";

interface AdminCustomersClientProps {
  initialPage: BrokerCustomerPage;
  stats: BrokerCustomerStats;
}

const filterLabelClass =
  "text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

export function AdminCustomersClient({
  initialPage,
  stats,
}: AdminCustomersClientProps) {
  const [data, setData] = useState(initialPage);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<BrokerCustomerSort>("recent-enquiry");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const skipInitial = useRef(true);
  const customers = data.customers;
  const hasFilters = query.trim().length > 0 || sort !== "recent-enquiry";
  const totalPages = Math.max(1, Math.ceil(data.matchingTotal / data.pageSize));

  useEffect(() => {
    if (skipInitial.current) {
      skipInitial.current = false;
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = await loadBrokerCustomerHistory({ page, query, sort });
        if (cancelled) return;
        if (result.ok) setData(result.data);
        else setLoadError(result.message);
      } catch {
        if (!cancelled) setLoadError("Unable to load customers. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page, query, sort, revision]);

  function clearFilters() {
    setLoading(true);
    setQuery("");
    setSort("recent-enquiry");
    setPage(1);
  }

  const columns: Array<AdminTableColumn<BrokerCustomer>> = [
    {
      id: "customer",
      header: "Customer",
      headerClassName: "pl-5",
      className: "pl-5 align-top",
      cell: (customer) => (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{customer.name}</p>
            {customer.isDemo ? <Badge variant="outline">Demo</Badge> : null}
          </div>
          <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {customer.id}
          </p>
        </div>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      className: "align-top whitespace-nowrap",
      cell: (customer) => (
        <a
          href={`tel:${customer.phone.replace(/\s+/g, "")}`}
          className="text-foreground hover:text-primary"
        >
          {customer.phone}
        </a>
      ),
    },
    {
      id: "email",
      header: "Email",
      className: "align-top text-muted-foreground",
      cell: (customer) => customer.email ?? "Not provided",
    },
    {
      id: "enquiries",
      header: "Enquiries",
      className: "align-top",
      cell: (customer) => (
        <div>
          <p className="font-medium text-foreground">{customer.enquiryCount}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {customer.activeEnquiryCount} active
          </p>
        </div>
      ),
    },
    {
      id: "latest",
      header: "Latest enquiry",
      className: "align-top whitespace-nowrap text-muted-foreground",
      cell: (customer) =>
        customer.latestEnquiryAt ? formatDate(customer.latestEnquiryAt) : "—",
    },
    {
      id: "activity",
      header: "Latest activity",
      className: "align-top",
      cell: (customer) =>
        customer.latestActivityAt ? (
          <div>
            <p className="text-foreground">{customer.latestActivityLabel ?? "Activity"}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDate(customer.latestActivityAt)}
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground">No activity yet</span>
        ),
    },
    {
      id: "actions",
      header: "Actions",
      headerClassName: "pr-5 text-right sticky right-0 z-10 bg-card",
      className: "pr-5 text-right align-top sticky right-0 bg-card",
      cell: (customer) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/customers/${customer.id}`}>
            Open
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="mt-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Customers"
          value={stats.total}
          description="Distinct customer records matched by normalized phone."
          icon={UsersRound}
        />
        <StatCard
          label="With active enquiries"
          value={stats.withActiveEnquiries}
          description="Customers with at least one enquiry still in progress."
          icon={Inbox}
        />
        <StatCard
          label="Repeat customers"
          value={stats.repeatCustomers}
          description="Customers with two or more linked enquiries."
          icon={Repeat2}
        />
        <StatCard
          label="New in 30 days"
          value={stats.newLast30Days}
          description="Customer records created in the last 30 days."
          icon={UserPlus}
        />
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{customers.length}</span>{" "}
            of <span className="font-semibold text-foreground">{data.matchingTotal}</span>{" "}
            matching {data.matchingTotal === 1 ? "customer" : "customers"} ·{" "}
            {data.total} total customers
          </p>
          <p className="text-xs text-muted-foreground">
            {loading ? "Loading customers…" : "Seeded demo customers are labelled individually"}
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <label htmlFor="customer-search" className={filterLabelClass}>
              Search
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="customer-search"
                type="search"
                maxLength={100}
                value={query}
                onChange={(event) => {
                  setLoading(true);
                  setPage(1);
                  setQuery(event.target.value);
                }}
                placeholder="Search name, phone, email or customer ID"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="customer-sort" className={filterLabelClass}>
              Sort
            </label>
            <NativeSelect
              id="customer-sort"
              value={sort}
              onChange={(event) => {
                setLoading(true);
                setPage(1);
                setSort(event.target.value as BrokerCustomerSort);
              }}
            >
              {brokerCustomerSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="w-full"
            >
              <RotateCcw aria-hidden="true" />
              Clear filters
            </Button>
          </div>
        </div>
      </div>

      {loadError ? (
        <div role="alert" className="mt-4 text-sm text-destructive">
          {loadError}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setRevision((value) => value + 1)}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm" aria-label="Customer pages">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page <= 1}
          onClick={() => {
            setLoading(true);
            setPage((value) => Math.max(1, value - 1));
          }}
        >
          Previous
        </Button>
        <span>
          Page {data.page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || data.page >= totalPages}
          onClick={() => {
            setLoading(true);
            setPage((value) => value + 1);
          }}
        >
          Next
        </Button>
      </div>

      {!loading && !loadError && customers.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={Search}
          title="No customers match these filters"
          description="Try a different name, phone number, email or customer ID, or clear the filters."
          action={
            <Button type="button" variant="outline" onClick={clearFilters}>
              <RotateCcw aria-hidden="true" />
              Clear filters
            </Button>
          }
        />
      ) : !loadError ? (
        <>
          <div className="mt-4 space-y-3 lg:hidden">
            {customers.map((customer) => (
              <Card key={customer.id} className="gap-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[11px] font-semibold text-muted-foreground">
                        {customer.id}
                      </p>
                      {customer.isDemo ? <Badge variant="outline">Demo</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {customer.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {customer.phone}
                    </p>
                  </div>
                  <Badge variant={customer.activeEnquiryCount > 0 ? "success" : "secondary"}>
                    {customer.enquiryCount} {customer.enquiryCount === 1 ? "enquiry" : "enquiries"}
                  </Badge>
                </div>

                <div className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                  <p>{customer.email ?? "No email provided"}</p>
                  <p>
                    Latest enquiry:{" "}
                    {customer.latestEnquiryAt ? formatDate(customer.latestEnquiryAt) : "—"}
                  </p>
                  <p>
                    Latest activity:{" "}
                    {customer.latestActivityAt
                      ? `${customer.latestActivityLabel ?? "Activity"} · ${formatDate(customer.latestActivityAt)}`
                      : "None yet"}
                  </p>
                </div>

                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/customers/${customer.id}`}>Open customer</Link>
                </Button>
              </Card>
            ))}
          </div>

          <Card className="mt-4 hidden gap-0 overflow-hidden lg:block">
            <AdminDataTable
              rows={customers}
              columns={columns}
              getRowKey={(customer) => customer.id}
              caption="Customers"
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}
