"use client";

import { Icons } from "@repo/ui/components/icons";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { cn } from "@repo/ui/lib/utils";
import { useImportCustomers } from "../hooks/use-import-customers";
import { downloadCustomerImportTemplate } from "@/lib/export";

interface CustomerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerImportDialog({
  open,
  onOpenChange,
}: CustomerImportDialogProps) {
  const {
    isImporting,
    result,
    fileInputRef,
    openFilePicker,
    handleFileChange,
  } = useImportCustomers();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Customers</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk import customers. Download the template to
            see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <Button
            variant="outline"
            size="sm"
            className="w-full cursor-pointer"
            onClick={downloadCustomerImportTemplate}
          >
            <Icons.download className="size-4 mr-2" />
            Download CSV Template
          </Button>

          {/* File upload area */}
          <div
            onClick={openFilePicker}
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
              "hover:border-primary hover:bg-muted/50",
              isImporting && "pointer-events-none opacity-50",
            )}
          >
            {isImporting ? (
              <div className="flex flex-col items-center gap-2">
                <Icons.spinner className="size-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Importing customers…
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Icons.upload className="size-8 text-muted-foreground" />
                <p className="text-sm font-medium">Click to select CSV file</p>
                <p className="text-xs text-muted-foreground">
                  Max 1,000 rows · 5MB limit · .csv only
                </p>
              </div>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Import result */}
          {result && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-md bg-green-50 dark:bg-green-900/20">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.created}
                  </p>
                  <p className="text-xs text-muted-foreground">Created</p>
                </div>
                <div className="text-center p-2 rounded-md bg-muted">
                  <p className="text-2xl font-bold">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-destructive">
                    {result.errors.length} row
                    {result.errors.length !== 1 ? "s" : ""} had errors:
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {result.errors.slice(0, 10).map((err) => (
                      <p
                        key={err.row}
                        className="text-xs text-muted-foreground"
                      >
                        <span className="font-medium">Row {err.row}:</span>{" "}
                        {err.reason}
                      </p>
                    ))}
                    {result.errors.length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        ...and {result.errors.length - 10} more errors.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full cursor-pointer"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
