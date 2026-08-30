import { useState } from "react";

interface AgreementConfirmationProps {
  agreementId: number | string;

  tenantUserId?: number | string;
  landlordUserId?: number | string;

  tenantName?: string;
  landlordName?: string;

  propertyType?: string;
  rentalAmount?: number | string;

  durationValue?: number | string;
  durationUnit?: string;

  numberOfUnits?: number | string;

  status?: string;

  serviceFee?: number | string;

  onDone?: () => void;
  onCreateAnother?: () => void;
}

function AgreementConfirmation({
  agreementId,
  tenantUserId,
  landlordUserId,
  tenantName,
  landlordName,
  propertyType,
  rentalAmount,
  durationValue,
  durationUnit,
  numberOfUnits,
  status = "COMPLETED",
  serviceFee = 50,
  onDone,
  onCreateAnother,
}: AgreementConfirmationProps) {
  const [showDetails, setShowDetails] = useState(true);

  const formatAmount = (amount?: number | string) => {
    if (amount === undefined || amount === null || amount === "") {
      return "Not provided";
    }

    const numericAmount = Number(amount);

    if (Number.isNaN(numericAmount)) {
      return String(amount);
    }

    return `${numericAmount.toLocaleString()} Birr`;
  };

  const formatStatus = (value: string) => {
    return value
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const handleDone = () => {
    if (onDone) {
      onDone();
    }
  };

  const handleCreateAnother = () => {
    if (onCreateAnother) {
      onCreateAnother();
    }
  };

  return (
    <div className="agreement-confirmation">

      {/* ============================================
          SUCCESS HEADER
      ============================================ */}

      <div className="confirmation-success">

        <div className="confirmation-success-icon">
          ✓
        </div>

        <h2>Agreement Completed Successfully</h2>

        <p>
          The rental agreement has been successfully completed.
        </p>

        <div className="confirmation-status">
          <span className="verified-badge">
            ✓ {formatStatus(status)}
          </span>
        </div>

      </div>


      {/* ============================================
          AGREEMENT REFERENCE
      ============================================ */}

      <div className="confirmation-card agreement-reference-card">

        <div className="confirmation-card-header">
          <div>
            <h3>Agreement Reference</h3>

            <p>
              Keep this reference number for future
              agreement management.
            </p>
          </div>
        </div>

        <div className="agreement-reference">

          <span>Agreement ID</span>

          <strong>
            {agreementId}
          </strong>

        </div>

      </div>


      {/* ============================================
          PARTIES
      ============================================ */}

      <div className="confirmation-card">

        <div className="confirmation-card-header">

          <div>
            <h3>Agreement Parties</h3>

            <p>
              The parties who confirmed the rental agreement.
            </p>
          </div>

        </div>


        <div className="confirmation-parties">

          {/* TENANT */}

          <div className="party-card">

            <div className="party-icon">
              T
            </div>

            <div className="party-information">

              <h4>Tenant</h4>

              <p>
                {tenantName || "Tenant"}
              </p>

              {tenantUserId !== undefined && (
                <span>
                  User ID: {tenantUserId}
                </span>
              )}

            </div>

            <div className="party-status">
              ✓ Verified
            </div>

          </div>


          {/* LANDLORD */}

          <div className="party-card">

            <div className="party-icon">
              L
            </div>

            <div className="party-information">

              <h4>Landlord</h4>

              <p>
                {landlordName || "Landlord"}
              </p>

              {landlordUserId !== undefined && (
                <span>
                  User ID: {landlordUserId}
                </span>
              )}

            </div>

            <div className="party-status">
              ✓ Verified
            </div>

          </div>

        </div>

      </div>


      {/* ============================================
          AGREEMENT DETAILS
      ============================================ */}

      <div className="confirmation-card">

        <div className="confirmation-card-header">

          <div>
            <h3>Agreement Details</h3>

            <p>
              Summary of the rental agreement.
            </p>
          </div>

          <button
            type="button"
            className="details-toggle-button"
            onClick={() =>
              setShowDetails((previous) => !previous)
            }
          >
            {showDetails ? "Hide Details" : "Show Details"}
          </button>

        </div>


        {showDetails && (

          <div className="agreement-details-grid">

            {/* PROPERTY TYPE */}

            <div className="detail-item">

              <span>Property Type</span>

              <strong>
                {propertyType || "Not provided"}
              </strong>

            </div>


            {/* RENT */}

            <div className="detail-item">

              <span>Rental Amount</span>

              <strong>
                {formatAmount(rentalAmount)}
              </strong>

            </div>


            {/* DURATION */}

            <div className="detail-item">

              <span>Rental Duration</span>

              <strong>
                {durationValue
                  ? `${durationValue} ${
                      durationUnit || ""
                    }`
                  : "Not provided"}
              </strong>

            </div>


            {/* NUMBER OF UNITS */}

            <div className="detail-item">

              <span>Number of Units</span>

              <strong>
                {numberOfUnits || "Not provided"}
              </strong>

            </div>

          </div>

        )}

      </div>


      {/* ============================================
          VERIFICATION SUMMARY
      ============================================ */}

      <div className="confirmation-card">

        <div className="confirmation-card-header">

          <div>
            <h3>Verification Summary</h3>

            <p>
              All required agreement verification steps
              have been completed.
            </p>
          </div>

        </div>


        <div className="confirmation-checklist">

          {/* NATIONAL ID */}

          <div className="confirmation-checklist-item">

            <div className="check-icon">
              ✓
            </div>

            <div>
              <strong>National ID Verification</strong>

              <p>
                Tenant and landlord identities were verified.
              </p>
            </div>

            <span className="verified-badge">
              Completed
            </span>

          </div>


          {/* AGREEMENT OTP */}

          <div className="confirmation-checklist-item">

            <div className="check-icon">
              ✓
            </div>

            <div>
              <strong>Agreement Confirmation</strong>

              <p>
                Tenant and landlord confirmed the agreement
                using their verification codes.
              </p>
            </div>

            <span className="verified-badge">
              Completed
            </span>

          </div>


          {/* SERVICE FEE */}

          <div className="confirmation-checklist-item">

            <div className="check-icon">
              ✓
            </div>

            <div>
              <strong>Telebirr Service Fee</strong>

              <p>
                The required service fee was processed.
              </p>
            </div>

            <span className="verified-badge">
              Paid
            </span>

          </div>


          {/* OFFICER APPROVAL */}

          <div className="confirmation-checklist-item">

            <div className="check-icon">
              ✓
            </div>

            <div>
              <strong>Officer Approval</strong>

              <p>
                The officer completed the final approval.
              </p>
            </div>

            <span className="verified-badge">
              Approved
            </span>

          </div>

        </div>

      </div>


      {/* ============================================
          SERVICE FEE SUMMARY
      ============================================ */}

      <div className="confirmation-card payment-summary-card">

        <div className="confirmation-card-header">

          <div>
            <h3>Payment Summary</h3>

            <p>
              Service fee transaction summary.
            </p>
          </div>

        </div>


        <div className="payment-summary-row">

          <span>
            Service Fee
          </span>

          <strong>
            {formatAmount(serviceFee)}
          </strong>

        </div>


        <div className="payment-summary-status">

          <span className="payment-success-icon">
            ✓
          </span>

          <div>
            <strong>
              Payment Completed
            </strong>

            <p>
              The Telebirr service fee was successfully
              processed.
            </p>
          </div>

        </div>

      </div>


      {/* ============================================
          FINAL MESSAGE
      ============================================ */}

      <div className="confirmation-final-message">

        <h3>
          Rental Agreement Successfully Completed
        </h3>

        <p>
          The tenant and landlord have completed the
          required verification and agreement confirmation.
          The officer has also approved the agreement.
        </p>

        <p>
          Agreement reference:
          <strong> {agreementId}</strong>
        </p>

      </div>


      {/* ============================================
          ACTION BUTTONS
      ============================================ */}

      <div className="confirmation-navigation">

        {onCreateAnother && (

          <button
            type="button"
            onClick={handleCreateAnother}
            className="secondary-button"
          >
            Create Another Agreement
          </button>

        )}


        {onDone && (

          <button
            type="button"
            onClick={handleDone}
            className="primary-button"
          >
            Done
          </button>

        )}

      </div>

    </div>
  );
}

export default AgreementConfirmation;