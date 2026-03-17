export function confirmDeleteRecord(): boolean {
  return window.confirm(
    "Are you sure you want to delete this record? This action cannot be undone.",
  );
}

