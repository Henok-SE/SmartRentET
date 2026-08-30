import { useState } from "react";

interface OTPVerificationProps {
  agreementId: number | string;

  tenantUserId: number | string;
  landlordUserId: number | string;

  tenantPhone: string;
  landlordPhone: string;
  onVerificationComplete: () => void;
  onBack?: () => void;
}

function OTPVerification({
  agreementId,
  landlordUserId,
  tenantPhone,
  landlordPhone,
  onVerificationComplete,
  onBack,
}: OTPVerificationProps): import("react").JSX.Element {
  const [tenantCode, setTenantCode] = useState("");
  const [landlordCode, setLandlordCode] = useState("");

  const [tenantVerified, setTenantVerified] = useState(false);
  const [landlordVerified, setLandlordVerified] = useState(false);

  const [loadingTenant, setLoadingTenant] = useState(false);
  const [loadingLandlord, setLoadingLandlord] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * IMPORTANT:
   *
   * The exact backend endpoints for agreement/signature
   * OTP verification have not yet been confirmed.
   *
   * We will replace these endpoints when the backend team
   * confirms them.
   */

  // ============================================
  // VERIFY TENANT AGREEMENT CODE
  // ============================================

  const verifyTenantCode = async () => {
    setError("");
    setSuccess("");

    if (!tenantCode.trim()) {
      setError("Please enter the code received by the tenant.");
      return;
    }

    if (!agreementId) {
      setError("Agreement ID is missing.");
      return;
    }

    if (!tenantPhone) {
      setError("Tenant phone number is missing.");
      return;
    }

    if (!tenantPhone) {
  setError("Tenant phone number is missing.");
  return;
}
    try {
      setLoadingTenant(true);

      /*
       * TODO:
       * Replace this URL with the endpoint confirmed
       * by the backend team.
       *
       * Example:
       *
       * POST /api/agreements/verify-code
       *
       * Body:
       * {
       *   agreementId,
       *   phone,
       *   code
       * }
       */

      const response = await fetch(
        "http://localhost:5000/api/agreements/verify-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agreementId,
             phone: tenantPhone,
            code: tenantCode.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Tenant agreement verification failed."
        );
      }

      setTenantVerified(true);

      setSuccess(
        "Tenant agreement code verified successfully."
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Tenant agreement verification failed.";

      setError(message);
    } finally {
      setLoadingTenant(false);
    }
  };

  // ============================================
  // VERIFY LANDLORD AGREEMENT CODE
  // ============================================

  const verifyLandlordCode = async () => {
    setError("");
    setSuccess("");

    if (!landlordCode.trim()) {
      setError("Please enter the code received by the landlord.");
      return;
    }

    if (!agreementId) {
      setError("Agreement ID is missing.");
      return;
    }

    if (!landlordUserId) {
      setError("Landlord user ID is missing.");
      return;
    }

    try {
      setLoadingLandlord(true);

      /*
       * TODO:
       * Replace this URL/body with the exact endpoint
       * confirmed by the backend team.
       */

      const response = await fetch(
        "http://localhost:5000/api/agreements/verify-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agreementId,
            phone: landlordPhone,
            code: landlordCode.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Landlord agreement verification failed."
        );
      }

      setLandlordVerified(true);

      setSuccess(
        "Landlord agreement code verified successfully."
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Landlord agreement verification failed.";

      setError(message);
    } finally {
      setLoadingLandlord(false);
    }
  };

  // ============================================
  // CONTINUE
  // ============================================

  const handleContinue = () => {
    setError("");

    if (!tenantVerified) {
      setError(
        "Please verify the tenant's agreement code first."
      );
      return;
    }

    if (!landlordVerified) {
      setError(
        "Please verify the landlord's agreement code first."
      );
      return;
    }

    onVerificationComplete();
  };

  return (
    <div className="otp-verification">

      {/* ========================================
          HEADER
      ======================================== */}

      <div className="verification-header">
        <h2>Agreement Verification</h2>

        <p>
          Both the tenant and landlord must confirm
          the rental agreement using the verification
          code sent to their phones.
        </p>
      </div>

      {/* ========================================
          ERROR
      ======================================== */}

      {error && (
        <div className="verification-error">
          {error}
        </div>
      )}

      {/* ========================================
          SUCCESS
      ======================================== */}

      {success && (
        <div className="verification-success">
          {success}
        </div>
      )}

      {/* ========================================
          TENANT
      ======================================== */}

      <div className="verification-card">

        <div className="verification-card-header">

          <div>
            <h3>Tenant</h3>

            <p>
              Enter the agreement confirmation code
              received by the tenant.
            </p>
          </div>

          {tenantVerified && (
            <span className="verified-badge">
              ✓ Verified
            </span>
          )}

        </div>

        {!tenantVerified && (
          <div className="verification-action">

            <label htmlFor="tenantAgreementCode">
              Tenant Verification Code
            </label>

            <div className="code-input-row">

              <input
                id="tenantAgreementCode"
                type="text"
                value={tenantCode}
                onChange={(event) =>
                  setTenantCode(event.target.value)
                }
                placeholder="Enter code"
                autoComplete="one-time-code"
              />

              <button
                type="button"
                onClick={verifyTenantCode}
                disabled={loadingTenant}
                className="verify-button"
              >
                {loadingTenant
                  ? "Verifying..."
                  : "Verify"}
              </button>

            </div>

          </div>
        )}

      </div>

      {/* ========================================
          LANDLORD
      ======================================== */}

      <div className="verification-card">

        <div className="verification-card-header">

          <div>
            <h3>Landlord</h3>

            <p>
              Enter the agreement confirmation code
              received by the landlord.
            </p>
          </div>

          {landlordVerified && (
            <span className="verified-badge">
              ✓ Verified
            </span>
          )}

        </div>

        {!tenantVerified ? (

          <div className="verification-disabled">
            Please complete tenant verification first.
          </div>

        ) : !landlordVerified ? (

          <div className="verification-action">

            <label htmlFor="landlordAgreementCode">
              Landlord Verification Code
            </label>

            <div className="code-input-row">

              <input
                id="landlordAgreementCode"
                type="text"
                value={landlordCode}
                onChange={(event) =>
                  setLandlordCode(event.target.value)
                }
                placeholder="Enter code"
                autoComplete="one-time-code"
              />

              <button
                type="button"
                onClick={verifyLandlordCode}
                disabled={loadingLandlord}
                className="verify-button"
              >
                {loadingLandlord
                  ? "Verifying..."
                  : "Verify"}
              </button>

            </div>

          </div>

        ) : null}

      </div>

      {/* ========================================
          STATUS
      ======================================== */}

      {tenantVerified && landlordVerified && (
        <div className="verification-complete">

          <h3>
            ✓ Agreement Confirmed
          </h3>

          <p>
            Both the tenant and landlord have confirmed
            the rental agreement.
          </p>

          <p>
            The next step is to process the
            <strong> 50 Birr service fee </strong>
            through Telebirr.
          </p>

        </div>
      )}

      {/* ========================================
          NAVIGATION
      ======================================== */}

      <div className="verification-navigation">

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="back-button"
          >
            Back
          </button>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={
            !tenantVerified ||
            !landlordVerified
          }
          className="continue-button"
        >
          Continue
        </button>

      </div>

    </div>
  );
}

export default OTPVerification;
