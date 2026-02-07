const statusConfig: Record<
  string,
  { label: string; className: string }
> = {
  confirmed: {
    label: "Confirmed",
    className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  processing: {
    label: "Processing",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  shipped: {
    label: "Shipped",
    className: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  delivered: {
    label: "Delivered",
    className: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

export function OrderStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.confirmed;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium border ${config.className}`}
    >
      {config.label}
    </span>
  );
}
