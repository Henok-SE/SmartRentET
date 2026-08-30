import { useState } from "react";

interface AgreementApprovalProps {
  agreementId: number | string;

  tenantUserId: number | string;
  landlordUserId: number | string;

  tenantVerified: boolean;
  landlordVerified: boolean;

  tenantPhone?: string;
  landlordPhone?: string;

  onApprovalComplete: () => void;
  onBack?: () => void;
}

function AgreementApproval({
  agreementId,
  tenantUserId,
  landlordUserId,
  tenantVerified,
  landlordVerified,
  tenantPhone,
  landlordPhone,
  onApprovalComplete,
  onBack,
}: AgreementApprovalProps) {
  const [phone, setPhone] = useState(
    tenantPhone || landlordPhone || ""
  );

  const [pin, setPin] = useState("");

  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const [loadingPayment, setLoadingPayment] = useState(false);
  const [loadingApproval, setLoadingApproval] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================
  // PROCESS 50 BIRR SERVICE FEE
  // ============================================

  const processServiceFee = async () => {
    setError("");
    setSuccess("");

    if (!agreementId) {
      setError("Agreement ID is missing.");
      return;
    }

    if (!tenantUserId) {
      setError("Tenant user ID is missing.");
      return;
    }

    if (!landlordUserId) {
      setError("Landlord user ID is missing.");
      return;
    }

    if (!tenantVerified) {
      setError(
        "The tenant must complete agreement verification first."
      );
      return;
    }

    if (!landlordVerified) {
      setError(
        "The landlord must complete agreement verification first."
      );
      return;
    }

    if (!phone.trim()) {
      setError(
        "Please enter the phone number used for the Telebirr payment."
      );
      return;
    }

    if (!pin.trim()) {
      setError("Please enter the Telebirr PIN.");
      return;
    }

    try {
      setLoadingPayment(true);

      const token = localStorage.getItem("token");

      if (!token) {
        setError(
          "Authentication token is missing. Please log in again."
        );
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/agreements/process-service-fee",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            agreementId,
            phone: phone.trim(),
            pin: pin.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Service fee payment failed."
        );
      }

      setPaymentCompleted(true);
      setPin("");

      setSuccess(
        "The 50 Birr service fee was processed successfully."
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Service fee payment failed.";

      setError(message);
    } finally {
      setLoadingPayment(false);
    }
  };

  // ============================================
  // FINAL APPROVAL
  // ============================================

  const handleApproval = () => {
    setError("");
    setSuccess("");

    if (!tenantVerified || !landlordVerified) {
      setError(
        "Both tenant and landlord must complete agreement verification."
      );
      return;
    }

    if (!paymentCompleted) {
      setError(
        "Please process the 50 Birr service fee before approving the agreement."
      );
      return;
    }

    /*
     * IMPORTANT:
     *
     * We do NOT call a backend approval endpoint here yet.
     *
     * The backend team has not provided/confirmed the
     * final "approve agreement" API endpoint.
     *
     * For now, we notify the parent component that the
     * approval step is complete so it can move to
     * AgreementConfirmation.tsx.
     *
     * Once the backend team gives us the approval endpoint,
     * this function will be updated to call it.
     */

    setLoadingApproval(true);

    try {
      setSuccess("Agreement approved successfully.");

      onApprovalComplete();
    } finally {
      setLoadingApproval(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="agreement-approval">

      {/* ========================================
          HEADER
      ======================================== */}

      <div className="approval-header">
        <h2>Agreement Approval</h2>

        <p>
          Review the verification and payment status
          before completing the rental agreement.
        </p>
      </div>

      {/* ========================================
          ERROR
      ======================================== */}

      {error && (
        <div className="approval-error">
          {error}
        </div>
      )}

      {/* ========================================
          SUCCESS
      ======================================== */}

      {success && (
        <div className="approval-success">
          {success}
        </div>
      )}

      {/* ========================================
          AGREEMENT INFORMATION
      ======================================== */}

      <div className="approval-card">

        <div className="approval-card-header">
          <h3>Agreement Information</h3>
        </div>

        <div className="approval-info">

          <div className="approval-info-row">
            <span>Agreement ID</span>
            <strong>{agreementId}</strong>
          </div>

          <div className="approval-info-row">
            <span>Tenant User ID</span>
            <strong>{tenantUserId}</strong>
          </div>

          <div className="approval-info-row">
            <span>Landlord User ID</span>
            <strong>{landlordUserId}</strong>
          </div>

        </div>

      </div>

      {/* ========================================
          VERIFICATION STATUS
      ======================================== */}

      <div className="approval-card">

        <div className="approval-card-header">
          <h3>Agreement Verification</h3>
        </div>

        <div className="verification-status-list">

          <div className="verification-status-row">

            <div>
              <strong>Tenant</strong>

              <p>
                Tenant agreement confirmation
              </p>
            </div>

            <span
              className={
                tenantVerified
                  ? "verified-badge"
                  : "not-verified-badge"
              }
            >
              {tenantVerified
                ? "✓ Verified"
                : "Not Verified"}
            </span>

          </div>

          <div className="verification-status-row">

            <div>
              <strong>Landlord</strong>

              <p>
                Landlord agreement confirmation
              </p>
            </div>

            <span
              className={
                landlordVerified
                  ? "verified-badge"
                  : "not-verified-badge"
              }
            >
              {landlordVerified
                ? "✓ Verified"
                : "Not Verified"}
            </span>

          </div>

        </div>

      </div>

      {/* ========================================
          SERVICE FEE
      ======================================== */}

      <div className="approval-card">

        <div className="approval-card-header">
          <div>
            <h3>Telebirr Service Fee</h3>

            <p>
              A 50 Birr service fee must be paid before
              the officer can approve the agreement.
            </p>
          </div>

          {paymentCompleted && (
            <span className="verified-badge">
              ✓ Paid
            </span>
          )}
        </div>

        {!paymentCompleted && (
          <div className="payment-form">

            {/* PHONE */}

            <div className="form-group">

              <label htmlFor="telebirrPhone">
                Telebirr Phone Number
              </label>

              <input
                id="telebirrPhone"
                type="tel"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                placeholder="Enter Telebirr phone number"
                disabled={loadingPayment}
              />

            </div>

            {/* PIN */}

            <div className="form-group">

              <label htmlFor="telebirrPin">
                Telebirr PIN
              </label>

              <input
                id="telebirrPin"
                type="password"
                value={pin}
                onChange={(event) =>
                  setPin(event.target.value)
                }
                placeholder="Enter Telebirr PIN"
                disabled={loadingPayment}
                autoComplete="off"
              />

            </div>

            {/* PAYMENT AMOUNT */}

            <div className="payment-amount">

              <span>Service Fee</span>

              <strong>50 Birr</strong>

            </div>

            {/* PAY BUTTON */}

            <button
              type="button"
              onClick={processServiceFee}
              disabled={
                loadingPayment ||
                !tenantVerified ||
                !landlordVerified
              }
              className="payment-button"
            >
              {loadingPayment
                ? "Processing Payment..."
                : "Pay 50 Birr"}
            </button>

          </div>
        )}

        {paymentCompleted && (
          <div className="payment-complete">

            <h4>
              ✓ Payment Completed
            </h4>

            <p>
              The 50 Birr Telebirr service fee has been
              successfully processed.
            </p>

          </div>
        )}

      </div>

      {/* ========================================
          FINAL APPROVAL
      ======================================== */}

      <div className="approval-card final-approval-card">

        <div className="approval-card-header">
          <div>
            <h3>Final Approval</h3>

            <p>
              Once both parties have confirmed the
              agreement and the service fee has been
              paid, the officer can approve the agreement.
            </p>
          </div>
        </div>

        <div className="approval-checklist">

          <div className="checklist-item">
            <span>
              {tenantVerified ? "✓" : "○"}
            </span>

            <p>
              Tenant agreement verification completed
            </p>
          </div>

          <div className="checklist-item">
            <span>
              {landlordVerified ? "✓" : "○"}
            </span>

            <p>
              Landlord agreement verification completed
            </p>
          </div>

          <div className="checklist-item">
            <span>
              {paymentCompleted ? "✓" : "○"}
            </span>

            <p>
              50 Birr service fee paid
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={handleApproval}
          disabled={
            !tenantVerified ||
            !landlordVerified ||
            !paymentCompleted ||
            loadingApproval
          }
          className="approve-button"
        >
          {loadingApproval
            ? "Approving..."
            : "Approve Agreement"}
        </button>

      </div>

      {/* ========================================
          NAVIGATION
      ======================================== */}

      <div className="approval-navigation">

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="back-button"
            disabled={loadingPayment || loadingApproval}
          >
            Back
          </button>
        )}

      </div>

    </div>
  );
}

export default AgreementApproval;
