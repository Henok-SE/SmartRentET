import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../App.css";

type InventoryItem = {
  item: string;
  quantity: number;
};

type FormData = {
  // =========================
  // Tenant
  // =========================
  tenantFirstName: string;
  tenantLastName: string;
  tenantNationalId: string;
  tenantAddress: string;
  tenantSubCity: string;
  tenantWoreda: string;
  tenantHouseNumber: string;
  tenantPhone: string;
  tenantIdVerified: boolean;

  // =========================
  // Landlord
  // =========================
  landlordFirstName: string;
  landlordLastName: string;
  landlordNationalId: string;
  landlordAddress: string;
  landlordSubCity: string;
  landlordWoreda: string;
  landlordHouseNumber: string;
  landlordPhone: string;
  landlordIdVerified: boolean;

  // =========================
  // Property / House
  // =========================
  houseType: string;
  houseNumber: string;
  numberOfRooms: string;
  numberOfBathrooms: string;
  numberOfWindows: string;
  numberOfDoors: string;
  // =========================
  // Rental
  // =========================
  rentalAmount: string;
  durationValue: string;
  durationUnit: string;
  startDate: string;
  endDate: string;
  paymentTerms: string;
  amountPaidInAdvance: string;
};

type PartyUserIds = {
  tenantUserId: string | null;
  landlordUserId: string | null;
};

type AgreementResponse = {
  success?: boolean;
  message?: string;
  error?: string;

  data?: {
    agreementId?: string;
    status?: string;
    tenantUserId?: string;
    landlordUserId?: string;
  };

  agreementId?: string;
  tenantUserId?: string;
  landlordUserId?: string;
};

const API_BASE_URL = "http://localhost:5000/api";

function CreateAgreement() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);

  // =========================
  // FORM DATA
  // =========================

  const [formData, setFormData] = useState<FormData>({
    // Tenant
    tenantFirstName: "",
    tenantLastName: "",
    tenantNationalId: "",
    tenantAddress: "",
    tenantSubCity: "",
    tenantWoreda: "",
    tenantHouseNumber: "",
    tenantPhone: "",
    tenantIdVerified: false,

    // Landlord
    landlordFirstName: "",
    landlordLastName: "",
    landlordNationalId: "",
    landlordAddress: "",
    landlordSubCity: "",
    landlordWoreda: "",
    landlordHouseNumber: "",
    landlordPhone: "",
    landlordIdVerified: false,

    // House
    houseType: "",
    houseNumber: "",
    numberOfRooms: "",
    numberOfBathrooms: "",
    numberOfWindows: "",
    numberOfDoors: "",

    // Rental
    rentalAmount: "",
    durationValue: "",
    durationUnit: "Month",
    startDate: "",
    endDate: "",
    paymentTerms: "",
    amountPaidInAdvance: "",
  });

  // =========================
  // INVENTORY
  // =========================

  const [inventory, setInventory] = useState<InventoryItem[]>([
    {
      item: "",
      quantity: 1,
    },
  ]);

  // =========================
  // VERIFICATION STATE
  // =========================

  const [tenantIdVerified, setTenantIdVerified] = useState(false);
  const [landlordIdVerified, setLandlordIdVerified] = useState(false);

  const [userIds, setUserIds] = useState<PartyUserIds>({
    tenantUserId: null,
    landlordUserId: null,
  });

  const [loading, setLoading] = useState(false);
  const [verifyingTenantId, setVerifyingTenantId] = useState(false);
  const [verifyingLandlordId, setVerifyingLandlordId] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================
  // UPDATE FORM FIELD
  // =========================

  const updateField = (
    field: keyof FormData,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    // If National ID changes,
    // previous verification is no longer valid.
    if (field === "tenantNationalId") {
      setTenantIdVerified(false);

      setUserIds((previous) => ({
        ...previous,
        tenantUserId: null,
      }));
    }

    if (field === "landlordNationalId") {
      setLandlordIdVerified(false);

      setUserIds((previous) => ({
        ...previous,
        landlordUserId: null,
      }));
    }

    setError("");
    setSuccess("");
  };

  // ============================================================
  // INVENTORY
  // ============================================================

  const addInventoryItem = () => {
    setInventory((previous) => [
      ...previous,
      {
        item: "",
        quantity: 1,
      },
    ]);
  };

  const removeInventoryItem = (index: number) => {
    setInventory((previous) =>
      previous.filter(
        (_, itemIndex) => itemIndex !== index
      )
    );
  };

  const handleInventoryChange = (
    index: number,
    field: keyof InventoryItem,
    value: string
  ) => {
    setInventory((previous) =>
      previous.map((inventoryItem, itemIndex) => {
        if (itemIndex !== index) {
          return inventoryItem;
        }

        if (field === "quantity") {
          return {
            ...inventoryItem,
            quantity: Number(value),
          };
        }

        return {
          ...inventoryItem,
          item: value,
        };
      })
    );

    setError("");
    setSuccess("");
  };

  // ============================================================
  // VALIDATION
  // ============================================================

  const validateCurrentStep = (): boolean => {
    setError("");

    // =========================
    // STEP 1 - TENANT
    // =========================

    if (currentStep === 1) {
  if (!formData.tenantFirstName.trim()) {
    setError("Please enter the tenant's first name.");
    return false;
  }

  if (!formData.tenantLastName.trim()) {
    setError("Please enter the tenant's last name.");
    return false;
  }

  if (!formData.tenantPhone.trim()) {
    setError("Please enter the tenant's phone number.");
    return false;
  }
  return true;
    }
    // =========================
    // STEP 2 - LANDLORD
    // =========================

    if (currentStep === 2) {
  if (!formData.landlordFirstName.trim()) {
    setError("Please enter the landlord's first name.");
    return false;
  }

  if (!formData.landlordLastName.trim()) {
    setError("Please enter the landlord's last name.");
    return false;
  }

  if (!formData.landlordPhone.trim()) {
    setError("Please enter the landlord's phone number.");
    return false;
  }

  if (!formData.landlordNationalId.trim()) {
    setError("Please enter the landlord's National ID.");
    return false;
  }
}

    // =========================
    // STEP 3 - PROPERTY
    // =========================

    if (currentStep === 3) {
      if (!formData.houseType) {
        setError("Please select the property type.");
        return false;
      }

      if (!formData.houseNumber.trim()) {
        setError(
          "Please enter the property house number."
        );
        return false;
      }

      if (!formData.numberOfRooms) {
        setError(
          "Please enter the number of rooms."
        );
        return false;
      }

      if (Number(formData.numberOfRooms) <= 0) {
        setError(
          "Number of rooms must be greater than zero."
        );
        return false;
      }

      if (!formData.numberOfBathrooms) {
        setError(
          "Please enter the number of bathrooms."
        );
        return false;
      }

      if (Number(formData.numberOfBathrooms) < 0) {
        setError(
          "Number of bathrooms cannot be negative."
        );
        return false;
      }

      if (!formData.rentalAmount) {
        setError(
          "Please enter the rental amount."
        );
        return false;
      }

      if (Number(formData.rentalAmount) <= 0) {
        setError(
          "Rental amount must be greater than zero."
        );
        return false;
      }

      if (!formData.durationValue) {
        setError(
          "Please enter the rental duration."
        );
        return false;
      }

      if (Number(formData.durationValue) <= 0) {
        setError(
          "Rental duration must be greater than zero."
        );
        return false;
      }

      if (!formData.startDate) {
        setError(
          "Please select the rental start date."
        );
        return false;
      }
    }

    // =========================
    // STEP 4 - INVENTORY
    // =========================

    if (currentStep === 4) {
      const invalidItem = inventory.some(
        (inventoryItem) =>
          !inventoryItem.item.trim() ||
          inventoryItem.quantity <= 0
      );

      if (invalidItem) {
        setError(
          "Please complete all inventory items and enter valid quantities."
        );
        return false;
      }
    }

    return true;
  };

  // ============================================================
  // NATIONAL ID VERIFICATION
  // ============================================================

  const sendNationalIdVerification = async (
    userId: string,
    party: "tenant" | "landlord"
  ) => {
    try {
      if (party === "tenant") {
        setVerifyingTenantId(true);
      } else {
        setVerifyingLandlordId(true);
      }

      setError("");
      setSuccess("");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please login again."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/auth/send-national-id-verification`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            userId,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to send National ID verification code."
        );
      }

      setSuccess(
        `National ID verification code sent to the ${party}.`
      );
    } catch (verificationError) {
      const message =
        verificationError instanceof Error
          ? verificationError.message
          : "Failed to send National ID verification code.";

      setError(message);
    } finally {
      if (party === "tenant") {
        setVerifyingTenantId(false);
      } else {
        setVerifyingLandlordId(false);
      }
    }
  };

  // ============================================================
  // REQUEST TENANT VERIFICATION
  // ============================================================

  const requestTenantNationalIdVerification = async () => {
    setError("");
    setSuccess("");

    if (!formData.tenantNationalId.trim()) {
      setError(
        "Please enter the tenant's National ID first."
      );
      return;
    }

    if (!userIds.tenantUserId) {
      setError(
        "Tenant user ID has not been received from the backend yet."
      );
      return;
    }

    await sendNationalIdVerification(
      userIds.tenantUserId,
      "tenant"
    );
  };

  // ============================================================
  // REQUEST LANDLORD VERIFICATION
  // ============================================================

  const requestLandlordNationalIdVerification =
    async () => {
      setError("");
      setSuccess("");

      if (!formData.landlordNationalId.trim()) {
        setError(
          "Please enter the landlord's National ID first."
        );
        return;
      }

      if (!userIds.landlordUserId) {
        setError(
          "Landlord user ID has not been received from the backend yet."
        );
        return;
      }

      await sendNationalIdVerification(
        userIds.landlordUserId,
        "landlord"
      );
    };

  // ============================================================
  // NAVIGATION
  // ============================================================

  const handleNext = () => {
  if (!validateCurrentStep()) {
    return;
  }

  setCurrentStep((previous) =>
    Math.min(5, previous + 1)
  );

  setError("");
};

  const handlePrevious = () => {
    setError("");
    setSuccess("");

    setCurrentStep((previous) =>
      Math.max(1, previous - 1)
    );
  };

  // ============================================================
  // BUILD AGREEMENT PAYLOAD
  // ============================================================

  const buildAgreementPayload = () => {
    return {
      // Tenant
      tenantFirstName:
        formData.tenantFirstName.trim(),

      tenantLastName:
        formData.tenantLastName.trim(),

      tenantNationalId:
        formData.tenantNationalId.trim(),

      tenantAddress:
        formData.tenantAddress.trim(),

      tenantSubCity:
        formData.tenantSubCity.trim(),

      tenantWoreda:
        formData.tenantWoreda.trim(),

      tenantHouseNumber:
        formData.tenantHouseNumber.trim(),

      tenantPhone:
        formData.tenantPhone.trim(),

      // Landlord
      landlordFirstName:
        formData.landlordFirstName.trim(),

      landlordLastName:
        formData.landlordLastName.trim(),

      landlordNationalId:
        formData.landlordNationalId.trim(),

      landlordAddress:
        formData.landlordAddress.trim(),

      landlordSubCity:
        formData.landlordSubCity.trim(),

      landlordWoreda:
        formData.landlordWoreda.trim(),

      landlordHouseNumber:
        formData.landlordHouseNumber.trim(),

      landlordPhone:
        formData.landlordPhone.trim(),

      // Property
      houseType: formData.houseType,

      houseNumber:
        formData.houseNumber.trim(),

      numberOfRooms:
        Number(formData.numberOfRooms),

      numberOfBathrooms:
        Number(formData.numberOfBathrooms),

      numberOfDoors:
        Number(formData.numberOfDoors || 0),

      numberOfWindows:
        Number(formData.numberOfWindows || 0),

      // Rental
      rentalAmount:
        Number(formData.rentalAmount),

      durationValue:
        Number(formData.durationValue),

      durationUnit:
        formData.durationUnit,

      startDate:
        formData.startDate,

      endDate:
        formData.endDate || undefined,

      paymentTerms:
        formData.paymentTerms.trim(),

      amountPaidInAdvance:
        Number(formData.amountPaidInAdvance || 0),

      // Inventory
      inventory: inventory.map(
        (inventoryItem) => ({
          item: inventoryItem.item.trim(),
          quantity: Number(
            inventoryItem.quantity
          ),
        })
      ),
    };
  };

  // ============================================================
  // CREATE AGREEMENT
  // ============================================================

  const handleCreateAgreement = async () => {
    setError("");
    setSuccess("");

    // Validate every step before submitting.
    const originalStep = currentStep;

    for (let step = 1; step <= 4; step++) {
      setCurrentStep(step);

      // We cannot reliably use the state immediately after
      // setCurrentStep(), so validation is handled explicitly below.
    }

    setCurrentStep(originalStep);

    // Tenant validation
    if (
      !formData.tenantFirstName.trim() ||
      !formData.tenantLastName.trim() ||
      !formData.tenantPhone.trim() ||
      !formData.tenantNationalId.trim()
    ) {
      setCurrentStep(1);
      setError(
        "Please complete all required tenant information."
      );
      return;
    }

    if (!tenantIdVerified) {
      setCurrentStep(1);
      setError(
        "Please verify the tenant's National ID before creating the agreement."
      );
      return;
    }

    // Landlord validation
    if (
      !formData.landlordFirstName.trim() ||
      !formData.landlordLastName.trim() ||
      !formData.landlordPhone.trim() ||
      !formData.landlordNationalId.trim()
    ) {
      setCurrentStep(2);
      setError(
        "Please complete all required landlord information."
      );
      return;
    }

    if (!landlordIdVerified) {
      setCurrentStep(2);
      setError(
        "Please verify the landlord's National ID before creating the agreement."
      );
      return;
    }

    // Property validation
    if (!formData.houseType) {
      setCurrentStep(3);
      setError(
        "Please select the property type."
      );
      return;
    }

    if (!formData.houseNumber.trim()) {
      setCurrentStep(3);
      setError(
        "Please enter the property house number."
      );
      return;
    }

    if (
      !formData.numberOfRooms ||
      Number(formData.numberOfRooms) <= 0
    ) {
      setCurrentStep(3);
      setError(
        "Please enter a valid number of rooms."
      );
      return;
    }

    if (
      !formData.numberOfBathrooms ||
      Number(formData.numberOfBathrooms) < 0
    ) {
      setCurrentStep(3);
      setError(
        "Please enter a valid number of bathrooms."
      );
      return;
    }

    if (
      !formData.rentalAmount ||
      Number(formData.rentalAmount) <= 0
    ) {
      setCurrentStep(3);
      setError(
        "Please enter a valid rental amount."
      );
      return;
    }

    if (
      !formData.durationValue ||
      Number(formData.durationValue) <= 0
    ) {
      setCurrentStep(3);
      setError(
        "Please enter a valid rental duration."
      );
      return;
    }

    if (!formData.startDate) {
      setCurrentStep(3);
      setError(
        "Please select the rental start date."
      );
      return;
    }

    // Inventory validation
    const invalidInventory = inventory.some(
      (inventoryItem) =>
        !inventoryItem.item.trim() ||
        inventoryItem.quantity <= 0
    );

    if (invalidInventory) {
      setCurrentStep(4);
      setError(
        "Please complete all inventory items and enter valid quantities."
      );
      return;
    }

    setCurrentStep(5);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Authentication token not found. Please login again."
        );
      }

      const payload =
        buildAgreementPayload();

      console.log(
        "=============================="
      );
      console.log("CREATE AGREEMENT");
      console.log(
        "=============================="
      );

      console.log(
        "Agreement payload:",
        payload
      );

      const response = await fetch(
        `${API_BASE_URL}/agreements`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify(payload),
        }
      );

      const result: AgreementResponse =
        await response.json();

      console.log(
        "Agreement response:",
        result
      );

      // ========================================================
      // BACKEND RETURNED AN ERROR
      // ========================================================

      if (!response.ok) {
        const returnedTenantUserId =
          result.tenantUserId ||
          result.data?.tenantUserId;

        const returnedLandlordUserId =
          result.landlordUserId ||
          result.data?.landlordUserId;

        // The backend may return user IDs when
        // National ID verification is required.
        if (
          returnedTenantUserId ||
          returnedLandlordUserId
        ) {
          setUserIds((previous) => ({
            tenantUserId:
              returnedTenantUserId ||
              previous.tenantUserId,

            landlordUserId:
              returnedLandlordUserId ||
              previous.landlordUserId,
          }));

          setSuccess(
            "Agreement information received. National ID verification is required."
          );

          return;
        }

        throw new Error(
          result.error ||
            result.message ||
            "Failed to create agreement."
        );
      }

      // ========================================================
      // AGREEMENT CREATED SUCCESSFULLY
      // ========================================================

      const agreementId =
        result.data?.agreementId ||
        result.agreementId;

      console.log(
        "Agreement ID:",
        agreementId
      );

      console.log(
        "Agreement status:",
        result.data?.status
      );

      setSuccess(
        "Agreement created successfully. USSD verification codes have been sent."
      );

      /*
       * IMPORTANT:
       *
       * Do NOT reset the form here if the next screen
       * needs agreementId, tenantUserId or landlordUserId.
       *
       * Once OTPVerification.tsx is ready, navigate to it
       * here and pass the necessary information.
       *
       * Example:
       *
       * navigate("/otp-verification", {
       *   state: {
       *     agreementId,
       *     tenantUserId: userIds.tenantUserId,
       *     landlordUserId: userIds.landlordUserId
       *   }
       * });
       */
    } catch (creationError) {
      const message =
        creationError instanceof Error
          ? creationError.message
          : "Failed to create agreement.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  
  // RENDER
  // ============================================================

  return (
    <div className="page-container agreement-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="page-header">
        <div>
          <h1>Create Rental Agreement</h1>

          <p>
            Complete the tenant, landlord, property
            and rental information.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="secondary-button"
        >
          Back
        </button>
      </div>

      {/* =====================================================
          STEP INDICATOR
      ===================================================== */}

      <div className="step-indicator">

        <div
          className={
            currentStep >= 1
              ? "step active"
              : "step"
          }
        >
          <span>1</span>
          <p>Tenant</p>
        </div>

        <div
          className={
            currentStep >= 2
              ? "step active"
              : "step"
          }
        >
          <span>2</span>
          <p>Landlord</p>
        </div>

        <div
          className={
            currentStep >= 3
              ? "step active"
              : "step"
          }
        >
          <span>3</span>
          <p>Property</p>
        </div>

        <div
          className={
            currentStep >= 4
              ? "step active"
              : "step"
          }
        >
          <span>4</span>
          <p>Inventory</p>
        </div>

        <div
          className={
            currentStep >= 5
              ? "step active"
              : "step"
          }
        >
          <span>5</span>
          <p>Review</p>
        </div>

      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* =====================================================
          SUCCESS
      ===================================================== */}

      {success && (
        <div className="success-message">
          {success}
        </div>
      )}

      <div className="agreement-card agreement-card-large">

        {/* ===================================================
            STEP 1 - TENANT
        =================================================== */}

        {currentStep === 1 && (
          <section>

            <h2>Tenant Information</h2>

            <div className="form-grid">

              <div className="form-group">
                <label>First Name</label>

                <input
                  type="text"
                  value={
                    formData.tenantFirstName
                  }
                  onChange={(event) =>
                    updateField(
                      "tenantFirstName",
                      event.target.value
                    )
                  }
                  placeholder="Enter first name"
                />
              </div>

              <div className="form-group">
                <label>Last Name</label>

                <input
                  type="text"
                  value={
                    formData.tenantLastName
                  }
                  onChange={(event) =>
                    updateField(
                      "tenantLastName",
                      event.target.value
                    )
                  }
                  placeholder="Enter last name"
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>

                <input
                  type="tel"
                  value={
                    formData.tenantPhone
                  }
                  onChange={(event) =>
                    updateField(
                      "tenantPhone",
                      event.target.value
                    )
                  }
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group">
                <label>National ID</label>

                <input
                  type="text"
                  value={
                    formData.tenantNationalId
                  }
                  onChange={(event) =>
                    updateField(
                      "tenantNationalId",
                      event.target.value
                    )
                  }
                  placeholder="Enter National ID"
                />

                <button
                  type="button"
                  className="verify-button"
                  onClick={
                    requestTenantNationalIdVerification
                  }
                  disabled={
                    verifyingTenantId ||
                    tenantIdVerified ||
                    !userIds.tenantUserId
                  }
                >
                  {tenantIdVerified
                    ? "✓ National ID Verified"
                    : verifyingTenantId
                    ? "Sending..."
                    : "Verify National ID"}
                </button>

                {!userIds.tenantUserId && (
                  <small>
                    Tenant verification ID is not
                    available yet.
                  </small>
                )}

              </div>

              <div className="form-group">
                <label>Address</label>

                <input
                  type="text"
                  value={
                    formData.tenantAddress
                  }
                  onChange={(event) =>
                    updateField(
                      "tenantAddress",
                      event.target.value
                    )
                  }
                  placeholder="Enter address"
                />
              </div>

              <div className="form-group">
                <label>Sub-city</label>

                <input
                  type="text"
                  value={
                    formData.tenantSubCity
                  }
                  onChange={(event) =>
                    updateField(
                      "tenantSubCity",
                      event.target.value
                    )
                  }
                  placeholder="Enter sub-city"
                />
              </div>

              <div className="form-group">
                <label>Woreda</label>

                <input
                  type="text"
                  value={
                    formData.tenantWoreda
                  }
                  onChange={(event) =>
                    updateField(
                      "tenantWoreda",
                      event.target.value
                    )
                  }
                  placeholder="Enter woreda"
                />
              </div>

              <div className="form-group">
                <label>House Number</label>

                <input
                  type="text"
                  value={
                    formData.tenantHouseNumber
                  }
                  onChange={(event) =>
                    updateField(
                      "tenantHouseNumber",
                      event.target.value
                    )
                  }
                  placeholder="Enter house number"
                />
              </div>

            </div>

            <div className="step-actions">

              <button
                type="button"
                className="primary-button"
                onClick={handleNext}
              >
                Next →
              </button>

            </div>

          </section>
        )}

        {/* ===================================================
            STEP 2 - LANDLORD
        =================================================== */}

        {currentStep === 2 && (
          <section>

            <h2>Landlord Information</h2>

            <div className="form-grid">

              <div className="form-group">
                <label>First Name</label>

                <input
                  type="text"
                  value={
                    formData.landlordFirstName
                  }
                  onChange={(event) =>
                    updateField(
                      "landlordFirstName",
                      event.target.value
                    )
                  }
                  placeholder="Enter first name"
                />
              </div>

              <div className="form-group">
                <label>Last Name</label>

                <input
                  type="text"
                  value={
                    formData.landlordLastName
                  }
                  onChange={(event) =>
                    updateField(
                      "landlordLastName",
                      event.target.value
                    )
                  }
                  placeholder="Enter last name"
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>

                <input
                  type="tel"
                  value={
                    formData.landlordPhone
                  }
                  onChange={(event) =>
                    updateField(
                      "landlordPhone",
                      event.target.value
                    )
                  }
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group">
                <label>National ID</label>

                <input
                  type="text"
                  value={
                    formData.landlordNationalId
                  }
                  onChange={(event) =>
                    updateField(
                      "landlordNationalId",
                      event.target.value
                    )
                  }
                  placeholder="Enter National ID"
                />

                <button
                  type="button"
                  className="verify-button"
                  onClick={
                    requestLandlordNationalIdVerification
                  }
                  disabled={
                    verifyingLandlordId ||
                    landlordIdVerified ||
                    !userIds.landlordUserId
                  }
                >
                  {landlordIdVerified
                    ? "✓ National ID Verified"
                    : verifyingLandlordId
                    ? "Sending..."
                    : "Verify National ID"}
                </button>

                {!userIds.landlordUserId && (
                  <small>
                    Landlord verification ID is
                    not available yet.
                  </small>
                )}

              </div>

              <div className="form-group">
                <label>Address</label>

                <input
                  type="text"
                  value={
                    formData.landlordAddress
                  }
                  onChange={(event) =>
                    updateField(
                      "landlordAddress",
                      event.target.value
                    )
                  }
                  placeholder="Enter address"
                />
              </div>

              <div className="form-group">
                <label>Sub-city</label>

                <input
                  type="text"
                  value={
                    formData.landlordSubCity
                  }
                  onChange={(event) =>
                    updateField(
                      "landlordSubCity",
                      event.target.value
                    )
                  }
                  placeholder="Enter sub-city"
                />
              </div>

              <div className="form-group">
                <label>Woreda</label>

                <input
                  type="text"
                  value={
                    formData.landlordWoreda
                  }
                  onChange={(event) =>
                    updateField(
                      "landlordWoreda",
                      event.target.value
                    )
                  }
                  placeholder="Enter woreda"
                />
              </div>

              <div className="form-group">
                <label>House Number</label>

                <input
                  type="text"
                  value={
                    formData.landlordHouseNumber
                  }
                  onChange={(event) =>
                    updateField(
                      "landlordHouseNumber",
                      event.target.value
                    )
                  }
                  placeholder="Enter house number"
                />
              </div>

            </div>

            <div className="step-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={handlePrevious}
              >
                ← Previous
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleNext}
              >
                Next →
              </button>

            </div>

          </section>
        )}

        {/* ===================================================
            STEP 3 - PROPERTY & RENTAL
        =================================================== */}

        {currentStep === 3 && (
          <section>

            <h2>
              Property & Rental Information
            </h2>

            <div className="form-grid">

              <div className="form-group">
                <label>Property Type</label>

                <select
                  value={formData.houseType}
                  onChange={(event) =>
                    updateField(
                      "houseType",
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    Select property type
                  </option>

                  <option value="RESIDENTIAL">
                    Residential
                  </option>

                  <option value="COMMERCIAL">
                    Commercial
                  </option>

                  <option value="OFFICE">
                    Office
                  </option>

                  <option value="OTHER">
                    Other
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>House Number</label>

                <input
                  type="text"
                  value={
                    formData.houseNumber
                  }
                  onChange={(event) =>
                    updateField(
                      "houseNumber",
                      event.target.value
                    )
                  }
                  placeholder="Enter house number"
                />
              </div>

              <div className="form-group">
                <label>Number of Rooms</label>

                <input
                  type="number"
                  min="1"
                  value={
                    formData.numberOfRooms
                  }
                  onChange={(event) =>
                    updateField(
                      "numberOfRooms",
                      event.target.value
                    )
                  }
                  placeholder="Enter number of rooms"
                />
              </div>

              <div className="form-group">
                <label>Number of Bathrooms</label>

                <input
                  type="number"
                  min="0"
                  value={
                    formData.numberOfBathrooms
                  }
                  onChange={(event) =>
                    updateField(
                      "numberOfBathrooms",
                      event.target.value
                    )
                  }
                  placeholder="Enter number of bathrooms"
                />
              </div>

              <div className="form-group">
                <label>Number of Doors</label>

                <input
                  type="number"
                  min="0"
                  value={
                    formData.numberOfDoors
                  }
                  onChange={(event) =>
                    updateField(
                      "numberOfDoors",
                      event.target.value
                    )
                  }
                  placeholder="Enter number of doors"
                />
              </div>

              <div className="form-group">
                <label>Number of Windows</label>

                <input
                  type="number"
                  min="0"
                  value={
                    formData.numberOfWindows
                  }
                  onChange={(event) =>
                    updateField(
                      "numberOfWindows",
                      event.target.value
                    )
                  }
                  placeholder="Enter number of windows"
                />
              </div>

              <div className="form-group">
                <label>Rental Amount</label>

                <input
                  type="number"
                  min="0"
                  value={
                    formData.rentalAmount
                  }
                  onChange={(event) =>
                    updateField(
                      "rentalAmount",
                      event.target.value
                    )
                  }
                  placeholder="Enter rental amount"
                />
              </div>

              <div className="form-group">
                <label>Duration</label>

                <input
                  type="number"
                  min="1"
                  value={
                    formData.durationValue
                  }
                  onChange={(event) =>
                    updateField(
                      "durationValue",
                      event.target.value
                    )
                  }
                  placeholder="Enter duration"
                />
              </div>

              <div className="form-group">
                <label>Duration Unit</label>

                <select
                  value={
                    formData.durationUnit
                  }
                  onChange={(event) =>
                    updateField(
                      "durationUnit",
                      event.target.value
                    )
                  }
                >
                  <option value="MONTHS">
                    Months
                  </option>

                  <option value="YEARS">
                    Years
                  </option>

                  <option value="DAYS">
                    Days
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>Start Date</label>

                <input
                  type="date"
                  value={
                    formData.startDate
                  }
                  onChange={(event) =>
                    updateField(
                      "startDate",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>End Date</label>

                <input
                  type="date"
                  value={
                    formData.endDate
                  }
                  onChange={(event) =>
                    updateField(
                      "endDate",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>Payment Terms</label>

                <textarea
                  value={
                    formData.paymentTerms
                  }
                  onChange={(event) =>
                    updateField(
                      "paymentTerms",
                      event.target.value
                    )
                  }
                  placeholder="Enter payment terms"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>
                  Amount Paid in Advance
                </label>

                <input
                  type="number"
                  min="0"
                  value={
                    formData.amountPaidInAdvance
                  }
                  onChange={(event) =>
                    updateField(
                      "amountPaidInAdvance",
                      event.target.value
                    )
                  }
                  placeholder="Enter advance amount"
                />
              </div>

            </div>

            <div className="step-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={handlePrevious}
              >
                ← Previous
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleNext}
              >
                Next →
              </button>

            </div>

          </section>
        )}

        {/* ===================================================
            STEP 4 - INVENTORY
        =================================================== */}

        {currentStep === 4 && (
          <section>

            <h2>Inventory Management</h2>

            <p>
              Add the furniture and other items
              included in the rental property.
            </p>

            <div className="inventory-container">

              {inventory.map(
                (inventoryItem, index) => (
                  <div
                    className="inventory-row"
                    key={index}
                  >

                    <div className="form-group">
                      <label>Item</label>

                      <input
                        type="text"
                        value={
                          inventoryItem.item
                        }
                        onChange={(event) =>
                          handleInventoryChange(
                            index,
                            "item",
                            event.target.value
                          )
                        }
                        placeholder="e.g. Bed"
                      />
                    </div>

                    <div className="form-group">
                      <label>Quantity</label>

                      <input
                        type="number"
                        min="1"
                        value={
                          inventoryItem.quantity
                        }
                        onChange={(event) =>
                          handleInventoryChange(
                            index,
                            "quantity",
                            event.target.value
                          )
                        }
                      />
                    </div>

                    {inventory.length > 1 && (
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() =>
                          removeInventoryItem(
                            index
                          )
                        }
                      >
                        Remove
                      </button>
                    )}

                  </div>
                )
              )}

            </div>

            <button
              type="button"
              className="secondary-button"
              onClick={addInventoryItem}
            >
              + Add Item
            </button>

            <div className="step-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={handlePrevious}
              >
                ← Previous
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleNext}
              >
                Review →
              </button>

            </div>

          </section>
        )}

        {/* ===================================================
            STEP 5 - REVIEW
        =================================================== */}

        {currentStep === 5 && (
          <section>

            <h2>Review Agreement</h2>

            {/* TENANT */}

            <div className="review-section">

              <h3>Tenant</h3>

              <p>
                <strong>Name:</strong>{" "}
                {formData.tenantFirstName}{" "}
                {formData.tenantLastName}
              </p>

              <p>
                <strong>Phone:</strong>{" "}
                {formData.tenantPhone}
              </p>

              <p>
                <strong>National ID:</strong>{" "}
                {formData.tenantNationalId}
              </p>

              <p>
                <strong>Address:</strong>{" "}
                {formData.tenantAddress}
              </p>

              <p>
                <strong>Sub-city:</strong>{" "}
                {formData.tenantSubCity}
              </p>

              <p>
                <strong>Woreda:</strong>{" "}
                {formData.tenantWoreda}
              </p>

              <p>
                <strong>House Number:</strong>{" "}
                {formData.tenantHouseNumber}
              </p>

              <p>
                <strong>Verification:</strong>{" "}
                {tenantIdVerified
                  ? "✓ Verified"
                  : "Not verified"}
              </p>

            </div>

            {/* LANDLORD */}

            <div className="review-section">

              <h3>Landlord</h3>

              <p>
                <strong>Name:</strong>{" "}
                {formData.landlordFirstName}{" "}
                {formData.landlordLastName}
              </p>

              <p>
                <strong>Phone:</strong>{" "}
                {formData.landlordPhone}
              </p>

              <p>
                <strong>National ID:</strong>{" "}
                {formData.landlordNationalId}
              </p>

              <p>
                <strong>Address:</strong>{" "}
                {formData.landlordAddress}
              </p>

              <p>
                <strong>Sub-city:</strong>{" "}
                {formData.landlordSubCity}
              </p>

              <p>
                <strong>Woreda:</strong>{" "}
                {formData.landlordWoreda}
              </p>

              <p>
                <strong>House Number:</strong>{" "}
                {formData.landlordHouseNumber}
              </p>

              <p>
                <strong>Verification:</strong>{" "}
                {landlordIdVerified
                  ? "✓ Verified"
                  : "Not verified"}
              </p>

            </div>

            {/* PROPERTY */}

            <div className="review-section">

              <h3>Property</h3>

              <p>
                <strong>Type:</strong>{" "}
                {formData.houseType}
              </p>

              <p>
                <strong>House Number:</strong>{" "}
                {formData.houseNumber}
              </p>

              <p>
                <strong>Rooms:</strong>{" "}
                {formData.numberOfRooms}
              </p>

              <p>
                <strong>Bathrooms:</strong>{" "}
                {formData.numberOfBathrooms}
              </p>

              <p>
                <strong>Number of door:</strong>{" "}
                {formData.numberOfDoors}
              </p>

              <p>
                <strong>Windows:</strong>{" "}
                {formData.numberOfWindows}
              </p>

              <p>
                <strong>Rental Amount:</strong>{" "}
                {formData.rentalAmount} Birr
              </p>

              <p>
                <strong>Duration:</strong>{" "}
                {formData.durationValue}{" "}
                {formData.durationUnit}
              </p>

              <p>
                <strong>Start Date:</strong>{" "}
                {formData.startDate}
              </p>

              {formData.endDate && (
                <p>
                  <strong>End Date:</strong>{" "}
                  {formData.endDate}
                </p>
              )}

              {formData.paymentTerms && (
                <p>
                  <strong>Payment Terms:</strong>{" "}
                  {formData.paymentTerms}
                </p>
              )}

              <p>
                <strong>
                  Amount Paid in Advance:
                </strong>{" "}
                {formData.amountPaidInAdvance ||
                  "0"}{" "}
                Birr
              </p>

            </div>

            {/* INVENTORY */}

            <div className="review-section">

              <h3>Inventory</h3>

              {inventory.map(
                (inventoryItem, index) => (
                  <p key={index}>
                    {inventoryItem.item} —{" "}
                    {inventoryItem.quantity}
                  </p>
                )
              )}

            </div>

            {/* ACTIONS */}

            <div className="step-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={handlePrevious}
                disabled={loading}
              >
                ← Previous
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={
                  handleCreateAgreement
                }
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : "Create Agreement"}
              </button>

            </div>

            {/* SUCCESS MESSAGE */}

            {success && (
              <div className="agreement-next-step">

                <p>{success}</p>

                <p>
                  The next step will be National
                  ID OTP verification and will be
                  connected to{" "}
                  <strong>
                    OTPVerification.tsx
                  </strong>
                  .
                </p>

              </div>
            )}

          </section>
        )}

      </div>
    </div>
  );
}

export default CreateAgreement;