import { useState } from "react";
import "./NationalIdVerification.css";

interface NationalIdVerificationProps {
  tenantUserId: number | string;
  landlordUserId: number | string;

  onVerificationComplete: () => void;
  onBack?: () => void;
}

const API_BASE_URL = "http://localhost:5000/api";

function NationalIdVerification({
  tenantUserId,
  landlordUserId,
  onVerificationComplete,
  onBack,
}: NationalIdVerificationProps) {
  const [tenantCode, setTenantCode] = useState("");
  const [landlordCode, setLandlordCode] = useState("");

  const [tenantCodeSent, setTenantCodeSent] = useState(false);
  const [landlordCodeSent, setLandlordCodeSent] = useState(false);

  const [tenantVerified, setTenantVerified] = useState(false);
  const [landlordVerified, setLandlordVerified] = useState(false);

  const [loadingTenant, setLoadingTenant] = useState(false);
  const [loadingLandlord, setLoadingLandlord] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================
  // SEND TENANT NATIONAL ID VERIFICATION CODE
  // ============================================
  const sendTenantVerification = async () => {
    setError("");
    setSuccess("");

    if (!tenantUserId) {
      setError("Tenant user ID is missing.");
      return;
    }

    try {
      setLoadingTenant(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/send-national-id-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: tenantUserId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to send verification code to tenant."
        );
      }

      setTenantCodeSent(true);
      setSuccess("National ID verification code sent to the tenant.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to send tenant verification code.";

      setError(message);
    } finally {
      setLoadingTenant(false);
    }
  };

  // ============================================
  // VERIFY TENANT NATIONAL ID OTP
  // ============================================
  const verifyTenantCode = async () => {
    setError("");
    setSuccess("");

    if (!tenantCode.trim()) {
      setError("Please enter the verification code received by the tenant.");
      return;
    }

    if (!tenantUserId) {
      setError("Tenant user ID is missing.");
      return;
    }

    try {
      setLoadingTenant(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/verify-national-id`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: tenantUserId,
            code: tenantCode.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Tenant National ID verification failed."
        );
      }

      setTenantVerified(true);
      setSuccess("Tenant National ID verified successfully.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Tenant National ID verification failed.";

      setError(message);
    } finally {
      setLoadingTenant(false);
    }
  };

  // ============================================
  // SEND LANDLORD NATIONAL ID VERIFICATION CODE
  // ============================================
  const sendLandlordVerification = async () => {
    setError("");
    setSuccess("");

    if (!landlordUserId) {
      setError("Landlord user ID is missing.");
      return;
    }

    try {
      setLoadingLandlord(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/send-national-id-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: landlordUserId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to send verification code to landlord."
        );
      }

      setLandlordCodeSent(true);
      setSuccess("National ID verification code sent to the landlord.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to send landlord verification code.";

      setError(message);
    } finally {
      setLoadingLandlord(false);
    }
  };

  // ============================================
  // VERIFY LANDLORD NATIONAL ID OTP
  // ============================================
  const verifyLandlordCode = async () => {
    setError("");
    setSuccess("");

    if (!landlordCode.trim()) {
      setError(
        "Please enter the verification code received by the landlord."
      );
      return;
    }

    if (!landlordUserId) {
      setError("Landlord user ID is missing.");
      return;
    }

    try {
      setLoadingLandlord(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/verify-national-id`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: landlordUserId,
            code: landlordCode.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Landlord National ID verification failed."
        );
      }

      setLandlordVerified(true);
      setSuccess("Landlord National ID verified successfully.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Landlord National ID verification failed.";

      setError(message);
    } finally {
      setLoadingLandlord(false);
    }
  };

  // ============================================
  // CONTINUE AFTER BOTH ARE VERIFIED
  // ============================================
  const handleContinue = () => {
    setError("");

    if (!tenantVerified) {
      setError("Please verify the tenant's National ID first.");
      return;
    }

    if (!landlordVerified) {
      setError("Please verify the landlord's National ID first.");
      return;
    }

    onVerificationComplete();
  };

  return (
    <div className="national-id-verification">
      <div className="verification-header">
        <h2>National ID Verification</h2>

        <p>
          Both the tenant and landlord must verify their National IDs before
          the rental agreement can be created.
        </p>
      </div>

      {/* ============================================
          ERROR MESSAGE
      ============================================ */}
      {error && (
        <div className="verification-error">
          {error}
        </div>
      )}

      {/* ============================================
          SUCCESS MESSAGE
      ============================================ */}
      {success && (
        <div className="verification-success">
          {success}
        </div>
      )}

      {/* ============================================
          TENANT VERIFICATION
      ============================================ */}
      <div className="verification-card">
        <div className="verification-card-header">
          <div>
            <h3>Tenant</h3>
            <p>Verify the tenant's National ID</p>
          </div>

          {tenantVerified && (
            <span className="verified-badge">
              ✓ Verified
            </span>
          )}
        </div>

        {!tenantVerified && (
          <>
            {!tenantCodeSent ? (
              <div className="verification-action">
                <p>
                  Click the button below to send a verification code to the
                  tenant.
                </p>

                <button
                  type="button"
                  onClick={sendTenantVerification}
                  disabled={loadingTenant}
                  className="verify-button"
                >
                  {loadingTenant
                    ? "Sending..."
                    : "Send Tenant Verification Code"}
                </button>
              </div>
            ) : (
              <div className="verification-action">
                <p>
                  A verification code has been sent to the tenant.
                </p>

                <label htmlFor="tenantCode">
                  Tenant Verification Code
                </label>

                <div className="code-input-row">
                  <input
                    id="tenantCode"
                    type="text"
                    value={tenantCode}
                    onChange={(e) => setTenantCode(e.target.value)}
                    placeholder="Enter code"
                    maxLength={10}
                    autoComplete="one-time-code"
                  />

                  <button
                    type="button"
                    onClick={verifyTenantCode}
                    disabled={loadingTenant}
                    className="verify-button"
                  >
                    {loadingTenant ? "Verifying..." : "Verify"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={sendTenantVerification}
                  disabled={loadingTenant}
                  className="resend-button"
                >
                  Resend Code
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ============================================
          LANDLORD VERIFICATION
      ============================================ */}
      <div className="verification-card">
        <div className="verification-card-header">
          <div>
            <h3>Landlord</h3>
            <p>Verify the landlord's National ID</p>
          </div>

          {landlordVerified && (
            <span className="verified-badge">
              ✓ Verified
            </span>
          )}
        </div>

        {/* Only allow landlord verification after tenant verification */}
        {!tenantVerified ? (
          <div className="verification-disabled">
            Please complete tenant verification first.
          </div>
        ) : !landlordVerified ? (
          <>
            {!landlordCodeSent ? (
              <div className="verification-action">
                <p>
                  Click the button below to send a verification code to the
                  landlord.
                </p>

                <button
                  type="button"
                  onClick={sendLandlordVerification}
                  disabled={loadingLandlord}
                  className="verify-button"
                >
                  {loadingLandlord
                    ? "Sending..."
                    : "Send Landlord Verification Code"}
                </button>
              </div>
            ) : (
              <div className="verification-action">
                <p>
                  A verification code has been sent to the landlord.
                </p>

                <label htmlFor="landlordCode">
                  Landlord Verification Code
                </label>

                <div className="code-input-row">
                  <input
                    id="landlordCode"
                    type="text"
                    value={landlordCode}
                    onChange={(e) => setLandlordCode(e.target.value)}
                    placeholder="Enter code"
                    maxLength={10}
                    autoComplete="one-time-code"
                  />

                  <button
                    type="button"
                    onClick={verifyLandlordCode}
                    disabled={loadingLandlord}
                    className="verify-button"
                  >
                    {loadingLandlord ? "Verifying..." : "Verify"}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={sendLandlordVerification}
                  disabled={loadingLandlord}
                  className="resend-button"
                >
                  Resend Code
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* ============================================
          NAVIGATION
      ============================================ */}
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
          disabled={!tenantVerified || !landlordVerified}
          className="continue-button"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default NationalIdVerification;
