"use client";

import { Fragment, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ChevronRight, Search } from "lucide-react";

interface Column {
  header: string;
  accessorKey: string;
  cell?: (row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  isLoading?: boolean;
  searchKey?: string;
  /**
   * When provided, a leading arrow column is rendered on the left. Clicking
   * the arrow expands the row and shows this content underneath it.
   */
  renderRowDetails?: (row: any) => React.ReactNode;
  /** Only rows where this returns true get an expand arrow (defaults to all rows). */
  isRowExpandable?: (row: any) => boolean;
}

export default function DataTable({
  columns,
  data,
  isLoading,
  searchKey,
  renderRowDetails,
  isRowExpandable,
}: DataTableProps) {
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const expandable = !!renderRowDetails;
  const toggleRow = (key: string) =>
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));

  const items = Array.isArray(data) ? data : [];

  const filteredData = searchKey
    ? items.filter((row) =>
        String(row[searchKey]).toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const getNestedValue = (obj: any, path: string) => {
    return path.split(".").reduce((acc, part) => acc?.[part], obj);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-10 flex-1" />
          ))}
        </div>
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {searchKey && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {expandable && <TableHead className="w-10" />}
              {columns.map((col) => (
                <TableHead key={col.accessorKey}>{col.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row, i) => {
                const rowKey = String(row._id ?? i);
                const canExpand =
                  expandable && (!isRowExpandable || isRowExpandable(row));
                const isOpen = !!expandedRows[rowKey];
                return (
                  <Fragment key={rowKey}>
                    <TableRow>
                      {expandable && (
                        <TableCell className="w-10 px-2">
                          {canExpand && (
                            <button
                              type="button"
                              aria-label={isOpen ? "Collapse row" : "Expand row"}
                              onClick={() => toggleRow(rowKey)}
                              className="rounded p-1 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <ChevronRight
                                className={`h-4 w-4 transition-transform ${
                                  isOpen ? "rotate-90" : ""
                                }`}
                              />
                            </button>
                          )}
                        </TableCell>
                      )}
                      {columns.map((col) => (
                        <TableCell key={col.accessorKey}>
                          {col.cell
                            ? col.cell(row)
                            : getNestedValue(row, col.accessorKey) ?? "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                    {isOpen && renderRowDetails && (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length + 1}
                          className="bg-muted/40"
                        >
                          {renderRowDetails(row)}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
