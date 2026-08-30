import { type FormEvent, useState } from "react";

import "../../App.css";

type InventoryItem = {
  item: string;
  quantity: number;
};

type AgreementFormData = {
  // Landlord
  landlordFirstName: string;
  landlordLastName: string;
  landlordPhone: string;
  landlordNationalId: string;
  landlordAddress: string;
  landlordSubCity: string;
  landlordWoreda: string;
  landlordHouseNumber: string;
  landlordBusinessLicense: string;
  landlordBankAccount: string;

  // Tenant
  tenantFirstName: string;
  tenantLastName: string;
  tenantPhone: string;
  tenantNationalId: string;
  tenantAddress: string;
  tenantSubCity: string;
  tenantWoreda: string;
  tenantHouseNumber: string;
  tenantEmergencyContactName: string;
  tenantEmergencyContactPhone: string;
  tenantEmployer: string;

  // Property
  propertyLocation: string;
  propertySubCity: string;
  propertyWoreda: string;
  propertyHouseNumber: string;
  propertyType: string;
  numberOfUnits: number;

  // Unit
  unitNumber: string;
  unitFloor: string;
  unitSizeSqMeters: string;
  unitBedrooms: number;
  unitBathrooms: number;
  unitRentAmountFloor: string;

  // House condition
  houseType: string;
  houseNumber: string;
  numberOfRooms: number;
  numberOfBathrooms: number;
  numberOfDoors: number;
  numberOfWindows: number;

  // Rental conditions
  durationValue: number;
  durationUnit: "MONTH" | "YEAR";
  effectiveDate: string;
  terminationDate: string;
  rentalAmount: string;
  paymentTerms: string;
  advancePayment: string;
  paymentFrequencyName: string;
  notes: string;
};

const initialFormData: AgreementFormData = {
  // Landlord
  landlordFirstName: "",
  landlordLastName: "",
  landlordPhone: "",
  landlordNationalId: "",
  landlordAddress: "",
  landlordSubCity: "",
  landlordWoreda: "",
  landlordHouseNumber: "",
  landlordBusinessLicense: "",
  landlordBankAccount: "",

  // Tenant
  tenantFirstName: "",
  tenantLastName: "",
  tenantPhone: "",
  tenantNationalId: "",
  tenantAddress: "",
  tenantSubCity: "",
  tenantWoreda: "",
  tenantHouseNumber: "",
  tenantEmergencyContactName: "",
  tenantEmergencyContactPhone: "",
  tenantEmployer: "",

  // Property
  propertyLocation: "",
  propertySubCity: "",
  propertyWoreda: "",
  propertyHouseNumber: "",
  propertyType: "RESIDENTIAL",
  numberOfUnits: 1,

  // Unit
  unitNumber: "",
  unitFloor: "",
  unitSizeSqMeters: "",
  unitBedrooms: 0,
  unitBathrooms: 0,
  unitRentAmountFloor: "",

  // House condition
  houseType: "",
  houseNumber: "",
  numberOfRooms: 0,
  numberOfBathrooms: 0,
  numberOfDoors: 0,
  numberOfWindows: 0,

  // Rental conditions
  durationValue: 12,
  durationUnit: "MONTH",
  effectiveDate: "",
  terminationDate: "",
  rentalAmount: "",
  paymentTerms: "",
  advancePayment: "0",
  paymentFrequencyName: "MONTHLY",
  notes: "",
};
type CreateAgreementProps = {
  onClose: () => void;
};

function CreateAgreement({ onClose }: CreateAgreementProps) {

  const [formData, setFormData] =
    useState<AgreementFormData>(initialFormData);

  const [inventory, setInventory] = useState<InventoryItem[]>([
    { item: "", quantity: 1 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleNumberChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value === "" ? 0 : Number(value),
    }));
  };

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
      previous.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const updateInventoryItem = (
    index: number,
    field: keyof InventoryItem,
    value: string | number
  ) => {
    setInventory((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const validateForm = (): string | null => {
    if (!formData.landlordFirstName.trim()) {
      return "Landlord first name is required.";
    }

    if (!formData.landlordLastName.trim()) {
      return "Landlord last name is required.";
    }

    if (!formData.landlordPhone.trim()) {
      return "Landlord phone number is required.";
    }

    if (
      formData.landlordNationalId &&
      !/^\d{16}$/.test(formData.landlordNationalId)
    ) {
      return "Landlord National ID must be exactly 16 digits.";
    }

    if (!formData.tenantFirstName.trim()) {
      return "Tenant first name is required.";
    }

    if (!formData.tenantLastName.trim()) {
      return "Tenant last name is required.";
    }

    if (!formData.tenantPhone.trim()) {
      return "Tenant phone number is required.";
    }

    if (
      formData.tenantNationalId &&
      !/^\d{16}$/.test(formData.tenantNationalId)
    ) {
      return "Tenant National ID must be exactly 16 digits.";
    }

    if (!formData.houseType.trim()) {
      return "House type is required.";
    }

    if (!formData.houseNumber.trim()) {
      return "House number is required.";
    }

    if (formData.numberOfRooms < 0) {
      return "Number of rooms cannot be negative.";
    }

    if (formData.numberOfBathrooms < 0) {
      return "Number of bathrooms cannot be negative.";
    }

    if (formData.numberOfDoors < 0) {
      return "Number of doors cannot be negative.";
    }

    if (formData.numberOfWindows < 0) {
      return "Number of windows cannot be negative.";
    }

    if (!formData.durationValue || formData.durationValue <= 0) {
      return "Rental duration must be greater than zero.";
    }

    if (!formData.effectiveDate) {
      return "Start date is required.";
    }

    if (!formData.rentalAmount || Number(formData.rentalAmount) <= 0) {
      return "Rental amount must be greater than zero.";
    }

    if (
      formData.terminationDate &&
      new Date(formData.terminationDate) <=
        new Date(formData.effectiveDate)
    ) {
      return "End date must be after the start date.";
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setReferenceNumber("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    setLoading(true);

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("accessToken");

      if (!token) {
        setError("You are not logged in. Please login again.");
        setLoading(false);
        return;
      }

      /*
       * Remove empty inventory rows.
       */
      const validInventory = inventory.filter(
        (item) => item.item.trim() !== ""
      );

      /*
       * Backend currently expects houseItems as String?.
       *
       * We keep the inventory structured and serialize it into JSON
       * because RentalAgreement.houseItems is currently a String.
       */
      const houseItems =
        validInventory.length > 0
          ? JSON.stringify(validInventory)
          : null;

      /*
       * IMPORTANT:
       * These names exactly match agreementService.js.
       */
      const payload = {
        // --------------------------------
        // LANDLORD
        // --------------------------------
        landlordFirstName: formData.landlordFirstName.trim(),
        landlordLastName: formData.landlordLastName.trim(),
        landlordPhone: formData.landlordPhone.trim(),
        landlordNationalId:
          formData.landlordNationalId.trim() || undefined,
        landlordAddress: formData.landlordAddress.trim(),
        landlordSubCity: formData.landlordSubCity.trim(),
        landlordWoreda: formData.landlordWoreda.trim(),
        landlordHouseNumber: formData.landlordHouseNumber.trim(),
        landlordBusinessLicense:
          formData.landlordBusinessLicense.trim(),
        landlordBankAccount: formData.landlordBankAccount.trim(),

        // --------------------------------
        // TENANT
        // --------------------------------
        tenantFirstName: formData.tenantFirstName.trim(),
        tenantLastName: formData.tenantLastName.trim(),
        tenantPhone: formData.tenantPhone.trim(),
        tenantNationalId:
          formData.tenantNationalId.trim() || undefined,
        tenantAddress: formData.tenantAddress.trim(),
        tenantSubCity: formData.tenantSubCity.trim(),
        tenantWoreda: formData.tenantWoreda.trim(),
        tenantHouseNumber: formData.tenantHouseNumber.trim(),
        tenantEmergencyContactName:
          formData.tenantEmergencyContactName.trim(),
        tenantEmergencyContactPhone:
          formData.tenantEmergencyContactPhone.trim(),
        tenantEmployer: formData.tenantEmployer.trim(),

        // --------------------------------
        // PROPERTY
        // --------------------------------
        propertyLocation: formData.propertyLocation.trim(),
        propertySubCity: formData.propertySubCity.trim(),
        propertyWoreda: formData.propertyWoreda.trim(),
        propertyHouseNumber:
          formData.propertyHouseNumber.trim(),
        propertyType: formData.propertyType,
        numberOfUnits: Number(formData.numberOfUnits),

        // --------------------------------
        // UNIT
        // --------------------------------
        unitNumber: formData.unitNumber.trim(),
        unitFloor:
          formData.unitFloor === ""
            ? null
            : Number(formData.unitFloor),
        unitSizeSqMeters:
          formData.unitSizeSqMeters === ""
            ? 0
            : Number(formData.unitSizeSqMeters),
        unitBedrooms: Number(formData.unitBedrooms),
        unitBathrooms: Number(formData.unitBathrooms),
        unitRentAmountFloor:
          formData.unitRentAmountFloor === ""
            ? Number(formData.rentalAmount)
            : Number(formData.unitRentAmountFloor),

        // --------------------------------
        // HOUSE CONDITION
        // --------------------------------
        houseType: formData.houseType.trim(),
        houseNumber: formData.houseNumber.trim(),
        numberOfRooms: Number(formData.numberOfRooms),
        numberOfBathrooms: Number(formData.numberOfBathrooms),
        numberOfDoors: Number(formData.numberOfDoors),
        numberOfWindows: Number(formData.numberOfWindows),
        houseItems,

        // --------------------------------
        // RENTAL CONDITIONS
        // --------------------------------
        durationValue: Number(formData.durationValue),
        durationUnit: formData.durationUnit,
        effectiveDate: formData.effectiveDate,
        terminationDate:
          formData.terminationDate || undefined,
        rentalAmount: Number(formData.rentalAmount),
        paymentTerms: formData.paymentTerms.trim(),
        advancePayment:
          formData.advancePayment === ""
            ? 0
            : Number(formData.advancePayment),
        paymentFrequencyName:
          formData.paymentFrequencyName,
        notes: formData.notes.trim(),
      };

      console.log("=== SENDING AGREEMENT ===");
      console.log(payload);

      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";

      const response = await fetch(
        `${API_URL}/agreements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      console.log("Agreement response:", result);

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            result.message ||
            "Failed to create rental agreement."
        );
      }

      setSuccess(
        result.message ||
          "Rental agreement created successfully."
      );

      if (result.data?.referenceNumber) {
        setReferenceNumber(result.data.referenceNumber);
      }

      /*
       * Keep the response visible so the user can see the
       * reference number before moving to verification.
       */
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    } catch (err) {
      console.error("Create agreement error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the agreement."
      );

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } finally {
      setLoading(false);
    }
  };

  

 return (
  <div className="modal-overlay" onClick={onClose}>
    <div
      className="agreement-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="page-header">
        <div>
          <h1>Create Rental Agreement</h1>
          <p>
            Enter the landlord, tenant, property, and rental
            agreement information.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <strong>Success:</strong> {success}

          {referenceNumber && (
            <div style={{ marginTop: "8px" }}>
              <strong>Agreement Reference:</strong>{" "}
              {referenceNumber}
            </div>
          )}
        </div>
        
      )}

      <form onSubmit={handleSubmit}>
        {/* =====================================================
            1. LANDLORD
        ====================================================== */}

        <section className="form-section">
          <div className="section-header">
            <h2>1. Landlord / Lessor</h2>
            <p>Enter the landlord's personal information.</p>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="landlordFirstName">
                First Name *
              </label>
              <input
                id="landlordFirstName"
                name="landlordFirstName"
                type="text"
                value={formData.landlordFirstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="landlordLastName">
                Last Name *
              </label>
              <input
                id="landlordLastName"
                name="landlordLastName"
                type="text"
                value={formData.landlordLastName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="landlordNationalId">
                National ID
              </label>
              <input
                id="landlordNationalId"
                name="landlordNationalId"
                type="text"
                inputMode="numeric"
                maxLength={16}
                value={formData.landlordNationalId}
                onChange={handleChange}
                placeholder="16 digits"
              />
            </div>

            <div className="form-group">
              <label htmlFor="landlordPhone">
                Phone Number *
              </label>
              <input
                id="landlordPhone"
                name="landlordPhone"
                type="tel"
                value={formData.landlordPhone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="landlordAddress">
                Address
              </label>
              <input
                id="landlordAddress"
                name="landlordAddress"
                type="text"
                value={formData.landlordAddress}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="landlordSubCity">
                Sub-city
              </label>
              <input
                id="landlordSubCity"
                name="landlordSubCity"
                type="text"
                value={formData.landlordSubCity}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="landlordWoreda">
                Woreda
              </label>
              <input
                id="landlordWoreda"
                name="landlordWoreda"
                type="text"
                value={formData.landlordWoreda}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="landlordHouseNumber">
                House Number
              </label>
              <input
                id="landlordHouseNumber"
                name="landlordHouseNumber"
                type="text"
                value={formData.landlordHouseNumber}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="landlordBusinessLicense">
                Business License
              </label>
              <input
                id="landlordBusinessLicense"
                name="landlordBusinessLicense"
                type="text"
                value={formData.landlordBusinessLicense}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="landlordBankAccount">
                Bank Account
              </label>
              <input
                id="landlordBankAccount"
                name="landlordBankAccount"
                type="text"
                value={formData.landlordBankAccount}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            2. TENANT
        ====================================================== */}

        <section className="form-section">
          <div className="section-header">
            <h2>2. Tenant / Lessee</h2>
            <p>Enter the tenant's personal information.</p>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="tenantFirstName">
                First Name *
              </label>
              <input
                id="tenantFirstName"
                name="tenantFirstName"
                type="text"
                value={formData.tenantFirstName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenantLastName">
                Last Name *
              </label>
              <input
                id="tenantLastName"
                name="tenantLastName"
                type="text"
                value={formData.tenantLastName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenantNationalId">
                National ID
              </label>
              <input
                id="tenantNationalId"
                name="tenantNationalId"
                type="text"
                inputMode="numeric"
                maxLength={16}
                value={formData.tenantNationalId}
                onChange={handleChange}
                placeholder="16 digits"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenantPhone">
                Phone Number *
              </label>
              <input
                id="tenantPhone"
                name="tenantPhone"
                type="tel"
                value={formData.tenantPhone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="tenantAddress">
                Address
              </label>
              <input
                id="tenantAddress"
                name="tenantAddress"
                type="text"
                value={formData.tenantAddress}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenantSubCity">
                Sub-city
              </label>
              <input
                id="tenantSubCity"
                name="tenantSubCity"
                type="text"
                value={formData.tenantSubCity}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenantWoreda">
                Woreda
              </label>
              <input
                id="tenantWoreda"
                name="tenantWoreda"
                type="text"
                value={formData.tenantWoreda}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenantHouseNumber">
                House Number
              </label>
              <input
                id="tenantHouseNumber"
                name="tenantHouseNumber"
                type="text"
                value={formData.tenantHouseNumber}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenantEmergencyContactName">
                Emergency Contact Name
              </label>
              <input
                id="tenantEmergencyContactName"
                name="tenantEmergencyContactName"
                type="text"
                value={formData.tenantEmergencyContactName}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenantEmergencyContactPhone">
                Emergency Contact Phone
              </label>
              <input
                id="tenantEmergencyContactPhone"
                name="tenantEmergencyContactPhone"
                type="tel"
                value={formData.tenantEmergencyContactPhone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tenantEmployer">
                Employer
              </label>
              <input
                id="tenantEmployer"
                name="tenantEmployer"
                type="text"
                value={formData.tenantEmployer}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            3. PROPERTY
        ====================================================== */}

        <section className="form-section">
          <div className="section-header">
            <h2>3. Property Information</h2>
            <p>Enter the property information.</p>
          </div>

          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="propertyLocation">
                Property Address / Location
              </label>
              <input
                id="propertyLocation"
                name="propertyLocation"
                type="text"
                value={formData.propertyLocation}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="propertySubCity">
                Sub-city
              </label>
              <input
                id="propertySubCity"
                name="propertySubCity"
                type="text"
                value={formData.propertySubCity}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="propertyWoreda">
                Woreda
              </label>
              <input
                id="propertyWoreda"
                name="propertyWoreda"
                type="text"
                value={formData.propertyWoreda}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="propertyHouseNumber">
                House Number
              </label>
              <input
                id="propertyHouseNumber"
                name="propertyHouseNumber"
                type="text"
                value={formData.propertyHouseNumber}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="propertyType">
                Property Type
              </label>
              <select
                id="propertyType"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
              >
                <option value="RESIDENTIAL">
                  Residential
                </option>
                <option value="COMMERCIAL">
                  Commercial
                </option>
                <option value="MIXED">
                  Mixed
                </option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="numberOfUnits">
                Number of Units
              </label>
              <input
                id="numberOfUnits"
                name="numberOfUnits"
                type="number"
                min="1"
                value={formData.numberOfUnits}
                onChange={handleNumberChange}
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            4. UNIT
        ====================================================== */}

        <section className="form-section">
          <div className="section-header">
            <h2>4. Unit Information</h2>
            <p>Enter the specific rental unit information.</p>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="unitNumber">
                Unit Number
              </label>
              <input
                id="unitNumber"
                name="unitNumber"
                type="text"
                value={formData.unitNumber}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="unitFloor">
                Floor
              </label>
              <input
                id="unitFloor"
                name="unitFloor"
                type="number"
                value={formData.unitFloor}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="unitSizeSqMeters">
                Size (m²)
              </label>
              <input
                id="unitSizeSqMeters"
                name="unitSizeSqMeters"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitSizeSqMeters}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="unitBedrooms">
                Bedrooms
              </label>
              <input
                id="unitBedrooms"
                name="unitBedrooms"
                type="number"
                min="0"
                value={formData.unitBedrooms}
                onChange={handleNumberChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="unitBathrooms">
                Bathrooms
              </label>
              <input
                id="unitBathrooms"
                name="unitBathrooms"
                type="number"
                min="0"
                value={formData.unitBathrooms}
                onChange={handleNumberChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="unitRentAmountFloor">
                Minimum Rent Amount
              </label>
              <input
                id="unitRentAmountFloor"
                name="unitRentAmountFloor"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitRentAmountFloor}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            5. HOUSE TYPE AND CONDITION
        ====================================================== */}

        <section className="form-section">
          <div className="section-header">
            <h2>5. House Type and Condition</h2>
            <p>Record the physical condition of the rental house.</p>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="houseType">
                Type of House *
              </label>
              <select
                id="houseType"
                name="houseType"
                value={formData.houseType}
                onChange={handleChange}
                required
              >
                <option value="">
                  Select house type
                </option>
                <option value="Apartment">
                  Apartment
                </option>
                <option value="Condominium">
                  Condominium
                </option>
                <option value="Villa">
                  Villa
                </option>
                <option value="Single House">
                  Single House
                </option>
                <option value="Compound">
                  Compound
                </option>
                <option value="Other">
                  Other
                </option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="houseNumber">
                House Number *
              </label>
              <input
                id="houseNumber"
                name="houseNumber"
                type="text"
                value={formData.houseNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="numberOfRooms">
                Number of Rooms
              </label>
              <input
                id="numberOfRooms"
                name="numberOfRooms"
                type="number"
                min="0"
                value={formData.numberOfRooms}
                onChange={handleNumberChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="numberOfBathrooms">
                Number of Bathrooms / Service Rooms
              </label>
              <input
                id="numberOfBathrooms"
                name="numberOfBathrooms"
                type="number"
                min="0"
                value={formData.numberOfBathrooms}
                onChange={handleNumberChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="numberOfDoors">
                Number of Doors
              </label>
              <input
                id="numberOfDoors"
                name="numberOfDoors"
                type="number"
                min="0"
                value={formData.numberOfDoors}
                onChange={handleNumberChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="numberOfWindows">
                Number of Windows
              </label>
              <input
                id="numberOfWindows"
                name="numberOfWindows"
                type="number"
                min="0"
                value={formData.numberOfWindows}
                onChange={handleNumberChange}
              />
            </div>
          </div>

          {/* INVENTORY */}

          <div className="inventory-section">
            <div className="inventory-header">
              <div>
                <h3>Items Inside the House</h3>
                <p>
                  Add each item and its quantity.
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={addInventoryItem}
              >
                + Add Item
              </button>
            </div>

            {inventory.map((item, index) => (
              <div
                className="inventory-row"
                key={index}
              >
                <div className="form-group">
                  <label>
                    Item {index + 1}
                  </label>
                  <input
                    type="text"
                    value={item.item}
                    onChange={(e) =>
                      updateInventoryItem(
                        index,
                        "item",
                        e.target.value
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
                    value={item.quantity}
                    onChange={(e) =>
                      updateInventoryItem(
                        index,
                        "quantity",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>

                {inventory.length > 1 && (
                  <button
                    type="button"
                    className="remove-button"
                    onClick={() =>
                      removeInventoryItem(index)
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* =====================================================
            6. RENTAL AMOUNT AND CONDITIONS
        ====================================================== */}

        <section className="form-section">
          <div className="section-header">
            <h2>6. Rental Amount and Conditions</h2>
            <p>
              Enter the duration, rental amount, dates, and
              payment conditions.
            </p>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="durationValue">
                Rental Duration *
              </label>
              <input
                id="durationValue"
                name="durationValue"
                type="number"
                min="1"
                value={formData.durationValue}
                onChange={handleNumberChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="durationUnit">
                Duration Unit *
              </label>
              <select
                id="durationUnit"
                name="durationUnit"
                value={formData.durationUnit}
                onChange={handleChange}
                required
              >
                <option value="MONTH">Month(s)</option>
                <option value="YEAR">Year(s)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="effectiveDate">
                Start Date *
              </label>
              <input
                id="effectiveDate"
                name="effectiveDate"
                type="date"
                value={formData.effectiveDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="terminationDate">
                End Date
              </label>
              <input
                id="terminationDate"
                name="terminationDate"
                type="date"
                value={formData.terminationDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="rentalAmount">
                Rental Amount *
              </label>
              <input
                id="rentalAmount"
                name="rentalAmount"
                type="number"
                min="0"
                step="0.01"
                value={formData.rentalAmount}
                onChange={handleChange}
                placeholder="ETB"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="advancePayment">
                Amount Paid in Advance
              </label>
              <input
                id="advancePayment"
                name="advancePayment"
                type="number"
                min="0"
                step="0.01"
                value={formData.advancePayment}
                onChange={handleChange}
                placeholder="ETB"
              />
            </div>

            <div className="form-group">
              <label htmlFor="paymentFrequencyName">
                Payment Frequency
              </label>
              <select
                id="paymentFrequencyName"
                name="paymentFrequencyName"
                value={formData.paymentFrequencyName}
                onChange={handleChange}
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="SEMI_ANNUALLY">
                  Semi-annually
                </option>
                <option value="ANNUALLY">Annually</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label htmlFor="paymentTerms">
                Rental Payment Terms / Conditions
              </label>
              <textarea
                id="paymentTerms"
                name="paymentTerms"
                rows={4}
                value={formData.paymentTerms}
                onChange={handleChange}
                placeholder="Enter payment terms and conditions..."
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="notes">
                Additional Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                value={formData.notes}
                onChange={handleChange}
                placeholder="Enter any additional notes..."
              />
            </div>
          </div>
        </section>

        {/* =====================================================
            ACTIONS
        ====================================================== */}

        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading
              ? "Creating Agreement..."
              : "Create Agreement"}
          </button>
        </div>
      </form>
    </div>
  </div>
  );
}

export default CreateAgreement;