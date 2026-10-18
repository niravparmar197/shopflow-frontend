export function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} ShopFlow. A demo shop built on microservices.</p>
        <p>Prices in INR (₹), including GST.</p>
      </div>
    </footer>
  );
}
