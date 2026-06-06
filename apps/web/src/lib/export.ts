/**
 * Triggers a CSV file download from a raw CSV string.
 * Works in all modern browsers without any external library.
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a blank CSV template for customer import.
 */
export function downloadCustomerImportTemplate(): void {
  const headers = "phone,name,email,notes,tags";
  const example =
    "+9779801234567,Ram Sharma,ram@example.com,VIP customer,vip;regular";
  const csv = `${headers}\n${example}`;
  downloadCsv(csv, "customer-import-template.csv");
}
