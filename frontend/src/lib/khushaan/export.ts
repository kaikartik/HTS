export function toCSV<T extends object>(rows: T[], columns: Array<keyof T>): string {
  const escapeCell = (value: unknown) => {
    const text = value == null ? "" : String(value);
    const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return /[",\r\n]/.test(safeText) ? `"${safeText.replaceAll('"', '""')}"` : safeText;
  };
  const header = columns.map((column) => escapeCell(String(column))).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCell(row[column])).join(","));
  return [header, ...body].join("\r\n");
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function printToPDF(): void {
  window.print();
}