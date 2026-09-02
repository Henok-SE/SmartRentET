import { useEffect, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
} from "lucide-react";
const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";
type PaymentRecord = {
  paymentId: number;
  agreementId: number;
  amount: number;
  dueDate: string | null;
  paidDate: string | null;
  status: string;
  method: string | null;
  provider: string | null;
  transactionReference: string | null;
  notes: string | null;
  createdAt: string;
  agreement?: {
    agreementId: number;
    referenceNumber: string;
    rentalAmount: number;
    status: string;
    tenant?: {
      user?: {
        firstName: string;
        lastName: string;
        phone: string;
      };
    };
  };
};

type PaymentResponse = {
  data: PaymentRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  message?: string;
};

function PaymentRecords() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (search.trim()) {
        params.append("search", search.trim());
      }

      const token = localStorage.getItem("token");

      const response = await fetch(
  `${API_URL}/payments?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load payment records.");
      }

      const result: PaymentResponse = await response.json();

      setPayments(result.data || []);
      setMeta(
        result.meta || {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 1,
        }
      );
    } catch (err) {
      console.error(err);
      setError("Unable to load payment records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPayments();
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount: number) => {
    return `${Number(amount).toLocaleString()} ETB`;
  };

  const getTenantName = (payment: PaymentRecord) => {
    const user = payment.agreement?.tenant?.user;

    if (!user) return "—";

    return `${user.firstName} ${user.lastName}`;
  };

  const getPaymentMethod = (payment: PaymentRecord) => {
    if (!payment.method && !payment.provider) {
      return "—";
    }

    if (payment.provider && payment.method) {
      return `${payment.provider} (${payment.method})`;
    }

    return payment.provider || payment.method || "—";
  };

  return (
    <div className="payment-records-page">
      {/* Page Header */}
      <div className="payment-records-header">
        <div>
          <span className="page-eyebrow">OFFICER PORTAL</span>

          <h1>Payment Records</h1>

          <p>
            View and search payment transactions for rental agreements.
          </p>
        </div>

        <div className="payment-records-icon">
          <CreditCard size={26} />
        </div>
      </div>

      {/* Search */}
      <div className="payment-search-section">
        <form onSubmit={handleSearch} className="payment-search-form">
          <div className="payment-search-input-wrapper">
            <Search size={20} />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by reference number, transaction ID, or tenant..."
            />
          </div>

          <button type="submit" className="primary-button">
            Search
          </button>
        </form>
      </div>

      {/* Results information */}
      <div className="payment-results-header">
        <div>
          <h2>Payment Records</h2>

          <span>
            {meta.total} {meta.total === 1 ? "record" : "records"} found
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="payment-error">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="payment-table-container">
        <table className="payment-records-table">
          <thead>
            <tr>
              <th>Reference Number</th>
              <th>Tenant</th>
              <th>Transaction ID</th>
              <th>Payment Date</th>
              <th>Payment Method</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="payment-loading">
                  <Loader2 size={22} className="loading-spinner" />
                  Loading payment records...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="payment-empty">
                  No payment records found.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.paymentId}>
                  <td>
                    <span className="agreement-reference">
                      {payment.agreement?.referenceNumber || "—"}
                    </span>
                  </td>

                  <td>
                    <div className="tenant-name">
                      {getTenantName(payment)}
                    </div>

                    {payment.agreement?.tenant?.user?.phone && (
                      <div className="tenant-phone">
                        {payment.agreement.tenant.user.phone}
                      </div>
                    )}
                  </td>

                  <td>
                    <span className="transaction-reference">
                      {payment.transactionReference || "—"}
                    </span>
                  </td>

                  <td>
                    {formatDate(payment.paidDate || payment.createdAt)}
                  </td>

                  <td>
                    {getPaymentMethod(payment)}
                  </td>

                  <td>
                    <strong>{formatAmount(payment.amount)}</strong>
                  </td>

                  <td>
                    <span
                      className={`payment-status payment-status-${payment.status
                        .toLowerCase()
                        .replace(/\s+/g, "-")}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="payment-pagination">
        <span>
          Page {meta.page} of {meta.totalPages}
        </span>

        <div className="pagination-buttons">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            disabled={page >= meta.totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentRecords;
