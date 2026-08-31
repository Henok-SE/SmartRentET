import {
  type FormEvent,
  useState,
} from "react";

import "../../App.css";

type CreateAgreementProps = {
  onClose: () => void;
};

type PartyType = "LANDLORD" | "TENANT";

type VerificationState = {
  userId: string | null;
  otp: string;
  sent: boolean;
  verified: boolean;
  loading: boolean;
};

type AgreementFormData = {
  /* =====================================================
     LANDLORD
  ===================================================== */
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

  /* =====================================================
     TENANT
  ===================================================== */
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

  /* =====================================================
     PROPERTY
  ===================================================== */
  propertyLocation: string;
  propertySubCity: string;
  propertyWoreda: string;
  propertyHouseNumber: string;
  propertyType: string;
  numberOfUnits: number;

  /* =====================================================
     UNIT
  ===================================================== */
  unitNumber: string;
  unitFloor: string;
  unitSizeSqMeters: string;
  unitBedrooms: number;
  unitBathrooms: number;
  unitRentAmountFloor: string;

  /* =====================================================
     HOUSE
  ===================================================== */
  houseType: string;
  houseNumber: string;
  numberOfRooms: number;
  numberOfBathrooms: number;
  numberOfDoors: number;
  numberOfWindows: number;

  /* =====================================================
     RENTAL CONDITIONS
  ===================================================== */
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

type ApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    referenceNumber?: string;
    [key: string]: unknown;
  };
};

const initialFormData: AgreementFormData = {
  /* Landlord */
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

  /* Tenant */
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

  /* Property */
  propertyLocation: "",
  propertySubCity: "",
  propertyWoreda: "",
  propertyHouseNumber: "",
  propertyType: "RESIDENTIAL",
  numberOfUnits: 1,

  /* Unit */
  unitNumber: "",
  unitFloor: "",
  unitSizeSqMeters: "",
  unitBedrooms: 0,
  unitBathrooms: 0,
  unitRentAmountFloor: "",

  /* House */
  houseType: "",
  houseNumber: "",
  numberOfRooms: 0,
  numberOfBathrooms: 0,
  numberOfDoors: 0,
  numberOfWindows: 0,

  /* Rental */
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

const getApiUrl = () =>
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken") ||
  "";

/*
 * Backend currently reports verification User IDs inside
 * the error message returned by POST /agreements.
 */
const extractVerificationUserId = (
  message: string,
  party: PartyType
): string | null => {
  const label =
    party === "LANDLORD"
      ? "Landlord User ID:"
      : "Tenant User ID:";

  const regex = new RegExp(
    `${label}\\s*([^\\s|.]+)`
  );

  const match = message.match(regex);

  return match?.[1] ?? null;
};

const getErrorMessage = (
  response: ApiResponse,
  fallback: string
) =>
  response.error ||
  response.message ||
  fallback;

function CreateAgreement({
  onClose,
}: CreateAgreementProps) {
  /* =====================================================
     FORM
  ===================================================== */

  const [formData, setFormData] =
    useState<AgreementFormData>(
      initialFormData
    );

  /* =====================================================
     WIZARD
  ===================================================== */

  const [currentStep, setCurrentStep] =
    useState(1);

  /* =====================================================
     LANDLORD VERIFICATION
  ===================================================== */

  const [landlordVerification, setLandlordVerification] =
    useState<VerificationState>({
      userId: null,
      otp: "",
      sent: false,
      verified: false,
      loading: false,
    });

  /* =====================================================
     TENANT VERIFICATION
  ===================================================== */

  const [tenantVerification, setTenantVerification] =
    useState<VerificationState>({
      userId: null,
      otp: "",
      sent: false,
      verified: false,
      loading: false,
    });

  /* =====================================================
     GENERAL STATE
  ===================================================== */

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [referenceNumber, setReferenceNumber] =
    useState("");

  /* =====================================================
     INPUT HANDLING
  ===================================================== */

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement |
        HTMLSelectElement |
        HTMLTextAreaElement
    >
  ) => {
    const { name, value } =
      event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleNumberChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } =
      event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        value === ""
          ? 0
          : Number(value),
    }));
  };

  const handleNationalIdChange = (
    party: PartyType,
    value: string
  ) => {
    const cleaned = value
      .replace(/\D/g, "")
      .slice(0, 16);

    if (party === "LANDLORD") {
      setFormData((previous) => ({
        ...previous,
        landlordNationalId:
          cleaned,
      }));

      setLandlordVerification(
        (previous) => ({
          ...previous,
          userId: null,
          sent: false,
          verified: false,
          otp: "",
        })
      );
    } else {
      setFormData((previous) => ({
        ...previous,
        tenantNationalId:
          cleaned,
      }));

      setTenantVerification(
        (previous) => ({
          ...previous,
          userId: null,
          sent: false,
          verified: false,
          otp: "",
        })
      );
    }
  };

  /* =====================================================
     VALIDATION
  ===================================================== */

  const validateLandlord = (): string | null => {
    if (
      !formData.landlordFirstName.trim()
    ) {
      return "Landlord first name is required.";
    }

    if (
      !formData.landlordLastName.trim()
    ) {
      return "Landlord last name is required.";
    }

    if (
      !formData.landlordPhone.trim()
    ) {
      return "Landlord phone number is required.";
    }

    if (
      !/^\d{16}$/.test(
        formData.landlordNationalId
      )
    ) {
      return "Landlord National ID must be exactly 16 digits.";
    }

    return null;
  };

  const validateTenant = (): string | null => {
    if (
      !formData.tenantFirstName.trim()
    ) {
      return "Tenant first name is required.";
    }

    if (
      !formData.tenantLastName.trim()
    ) {
      return "Tenant last name is required.";
    }

    if (
      !formData.tenantPhone.trim()
    ) {
      return "Tenant phone number is required.";
    }

    if (
      !/^\d{16}$/.test(
        formData.tenantNationalId
      )
    ) {
      return "Tenant National ID must be exactly 16 digits.";
    }

    return null;
  };

  const validateAgreement = (): string | null => {
    if (
      !formData.houseType.trim()
    ) {
      return "House type is required.";
    }

    if (
      !formData.houseNumber.trim()
    ) {
      return "House number is required.";
    }

    if (
      formData.numberOfRooms < 0 ||
      formData.numberOfBathrooms < 0 ||
      formData.numberOfDoors < 0 ||
      formData.numberOfWindows < 0
    ) {
      return "House measurements cannot be negative.";
    }

    if (
      !formData.durationValue ||
      formData.durationValue <= 0
    ) {
      return "Rental duration must be greater than zero.";
    }

    if (
      !formData.effectiveDate
    ) {
      return "Start date is required.";
    }

    if (
      !formData.rentalAmount ||
      Number(formData.rentalAmount) <= 0
    ) {
      return "Rental amount must be greater than zero.";
    }

    if (
      formData.terminationDate &&
      new Date(
        formData.terminationDate
      ) <=
        new Date(
          formData.effectiveDate
        )
    ) {
      return "End date must be after the start date.";
    }

    return null;
  };

  /* =====================================================
     BUILD AGREEMENT PAYLOAD
  ===================================================== */

  const buildPayload = () => {
    return {
      /* Landlord */
      landlordFirstName:
        formData.landlordFirstName.trim(),

      landlordLastName:
        formData.landlordLastName.trim(),

      landlordPhone:
        formData.landlordPhone.trim(),

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

      landlordBusinessLicense:
        formData.landlordBusinessLicense.trim(),

      landlordBankAccount:
        formData.landlordBankAccount.trim(),

      /* Tenant */
      tenantFirstName:
        formData.tenantFirstName.trim(),

      tenantLastName:
        formData.tenantLastName.trim(),

      tenantPhone:
        formData.tenantPhone.trim(),

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

      tenantEmergencyContactName:
        formData.tenantEmergencyContactName.trim(),

      tenantEmergencyContactPhone:
        formData.tenantEmergencyContactPhone.trim(),

      tenantEmployer:
        formData.tenantEmployer.trim(),

      /* Property */
      propertyLocation:
        formData.propertyLocation.trim(),

      propertySubCity:
        formData.propertySubCity.trim(),

      propertyWoreda:
        formData.propertyWoreda.trim(),

      propertyHouseNumber:
        formData.propertyHouseNumber.trim(),

      propertyType:
        formData.propertyType,

      numberOfUnits:
        Number(formData.numberOfUnits),

      /* Unit */
      unitNumber:
        formData.unitNumber.trim(),

      unitFloor:
        formData.unitFloor === ""
          ? null
          : Number(
              formData.unitFloor
            ),

      unitSizeSqMeters:
        formData.unitSizeSqMeters === ""
          ? 0
          : Number(
              formData.unitSizeSqMeters
            ),

      unitBedrooms:
        Number(formData.unitBedrooms),

      unitBathrooms:
        Number(formData.unitBathrooms),

      unitRentAmountFloor:
        formData.unitRentAmountFloor === ""
          ? Number(
              formData.rentalAmount
            )
          : Number(
              formData.unitRentAmountFloor
            ),

      /* House */
      houseType:
        formData.houseType.trim(),

      houseNumber:
        formData.houseNumber.trim(),

      numberOfRooms:
        Number(formData.numberOfRooms),

      numberOfBathrooms:
        Number(
          formData.numberOfBathrooms
        ),

      numberOfDoors:
        Number(formData.numberOfDoors),

      numberOfWindows:
        Number(
          formData.numberOfWindows
        ),

      /* Rental */
      durationValue:
        Number(
          formData.durationValue
        ),

      durationUnit:
        formData.durationUnit,

      effectiveDate:
        formData.effectiveDate,

      terminationDate:
        formData.terminationDate ||
        undefined,

      rentalAmount:
        Number(formData.rentalAmount),

      paymentTerms:
        formData.paymentTerms.trim(),

      advancePayment:
        formData.advancePayment === ""
          ? 0
          : Number(
              formData.advancePayment
            ),

      paymentFrequencyName:
        formData.paymentFrequencyName,

      notes:
        formData.notes.trim(),
    };
  };

  /* =====================================================
     SEND NATIONAL ID CODE
  ===================================================== */

  const sendNationalIdCode = async (
    party: PartyType,
    userId: string
  ) => {
    const token = getToken();

    if (!token) {
      throw new Error(
        "You are not logged in. Please login again."
      );
    }

    const response =
      await fetch(
        `${getApiUrl()}/auth/send-national-id-verification`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
          }),
        }
      );

    const result =
      (await response.json()) as ApiResponse;

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        getErrorMessage(
          result,
          `Failed to send ${party.toLowerCase()} verification code.`
        )
      );
    }

    return result;
  };

  /* =====================================================
     VERIFY NATIONAL ID CODE
  ===================================================== */

  const verifyNationalIdCode = async (
    party: PartyType,
    userId: string,
    code: string
  ) => {
    const token = getToken();

    if (!token) {
      throw new Error(
        "You are not logged in. Please login again."
      );
    }

    const response =
      await fetch(
        `${getApiUrl()}/auth/verify-national-id`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
            code,
          }),
        }
      );

    const result =
      (await response.json()) as ApiResponse;

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        getErrorMessage(
          result,
          `Failed to verify ${party.toLowerCase()} National ID.`
        )
      );
    }

    return result;
  };

  /* =====================================================
     INITIAL AGREEMENT REQUEST

     This uses the ACTUAL agreement endpoint.

     If verification is required, the backend returns
     the generated Landlord/Tenant User IDs in the
     error message. We capture those IDs instead of
     inventing data.
  ===================================================== */

  const requestAgreementVerification =
    async (): Promise<{
      landlordUserId: string | null;
      tenantUserId: string | null;
    }> => {
      const token = getToken();

      if (!token) {
        throw new Error(
          "You are not logged in. Please login again."
        );
      }

      const response =
        await fetch(
          `${getApiUrl()}/agreements`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(
              buildPayload()
            ),
          }
        );

      const result =
        (await response.json()) as ApiResponse;

      /*
       * If backend somehow created the agreement,
       * return success without needing verification.
       */
      if (
        response.ok &&
        result.success
      ) {
        if (
          result.data?.referenceNumber
        ) {
          setReferenceNumber(
            result.data.referenceNumber
          );
        }

        setSuccess(
          result.message ||
            "Rental agreement created successfully."
        );

        return {
          landlordUserId: null,
          tenantUserId: null,
        };
      }

      const message =
        getErrorMessage(
          result,
          "The agreement could not be processed."
        );

      return {
        landlordUserId:
          extractVerificationUserId(
            message,
            "LANDLORD"
          ),

        tenantUserId:
          extractVerificationUserId(
            message,
            "TENANT"
          ),
      };
    };

  /* =====================================================
     STEP 1
     LANDLORD
  ===================================================== */

  const handleLandlordContinue =
    async () => {
      setError("");
      setSuccess("");

      const validationError =
        validateLandlord();

      if (validationError) {
        setError(validationError);
        return;
      }

      /*
       * If already verified, continue.
       */
      if (
        landlordVerification.verified
      ) {
        setCurrentStep(2);
        return;
      }

      setSubmitting(true);

      try {
        /*
         * Ask current backend flow for the
         * landlord User ID.
         */
        const ids =
          await requestAgreementVerification();

        if (!ids.landlordUserId) {
          /*
           * It may be an existing verified landlord
           * or the backend accepted the request.
           */
          setLandlordVerification(
            (previous) => ({
              ...previous,
              verified: true,
            })
          );

          setCurrentStep(2);
          return;
        }

        setLandlordVerification(
          (previous) => ({
            ...previous,
            userId:
              ids.landlordUserId,
            loading: true,
          })
        );

        await sendNationalIdCode(
          "LANDLORD",
          ids.landlordUserId
        );

        setLandlordVerification(
          (previous) => ({
            ...previous,
            userId:
              ids.landlordUserId,
            sent: true,
            loading: false,
          })
        );

        setSuccess(
          "A verification code has been sent to the landlord's phone."
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start landlord verification."
        );

        setLandlordVerification(
          (previous) => ({
            ...previous,
            loading: false,
          })
        );
      } finally {
        setSubmitting(false);
      }
    };

  /* =====================================================
     VERIFY LANDLORD
  ===================================================== */

  const handleLandlordVerify =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      const userId =
        landlordVerification.userId;

      if (!userId) {
        setError(
          "Landlord verification session is missing."
        );
        return;
      }

      if (
        !/^\d{6}$/.test(
          landlordVerification.otp
        )
      ) {
        setError(
          "Please enter the 6-digit landlord verification code."
        );
        return;
      }

      setLandlordVerification(
        (previous) => ({
          ...previous,
          loading: true,
        })
      );

      try {
        await verifyNationalIdCode(
          "LANDLORD",
          userId,
          landlordVerification.otp
        );

        setLandlordVerification(
          (previous) => ({
            ...previous,
            verified: true,
            loading: false,
            otp: "",
          })
        );

        setCurrentStep(2);

        setSuccess(
          "Landlord National ID verified successfully."
        );
      } catch (err) {
        setLandlordVerification(
          (previous) => ({
            ...previous,
            loading: false,
          })
        );

        setError(
          err instanceof Error
            ? err.message
            : "Landlord National ID verification failed."
        );
      }
    };

  /* =====================================================
     STEP 2
     TENANT
  ===================================================== */

  const handleTenantContinue =
    async () => {
      setError("");
      setSuccess("");

      const validationError =
        validateTenant();

      if (validationError) {
        setError(validationError);
        return;
      }

      if (
        !landlordVerification.verified
      ) {
        setError(
          "Please verify the landlord's National ID first."
        );
        return;
      }

      if (
        tenantVerification.verified
      ) {
        setCurrentStep(3);
        return;
      }

      setSubmitting(true);

      try {
        /*
         * Submit through the same backend flow.
         *
         * At this point the landlord is already
         * verified, so the backend should either:
         * - ask for tenant verification and return
         *   Tenant User ID, or
         * - proceed if tenant is already verified.
         */
        const ids =
          await requestAgreementVerification();

        if (!ids.tenantUserId) {
          /*
           * If no tenant verification ID came back,
           * the backend did not require tenant
           * verification at this point.
           */
          setTenantVerification(
            (previous) => ({
              ...previous,
              verified: true,
            })
          );

          setCurrentStep(3);
          return;
        }

        setTenantVerification(
          (previous) => ({
            ...previous,
            userId:
              ids.tenantUserId,
            loading: true,
          })
        );

        await sendNationalIdCode(
          "TENANT",
          ids.tenantUserId
        );

        setTenantVerification(
          (previous) => ({
            ...previous,
            userId:
              ids.tenantUserId,
            sent: true,
            loading: false,
          })
        );

        setSuccess(
          "A verification code has been sent to the tenant's phone."
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to start tenant verification."
        );

        setTenantVerification(
          (previous) => ({
            ...previous,
            loading: false,
          })
        );
      } finally {
        setSubmitting(false);
      }
    };

  /* =====================================================
     VERIFY TENANT
  ===================================================== */

  const handleTenantVerify =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      const userId =
        tenantVerification.userId;

      if (!userId) {
        setError(
          "Tenant verification session is missing."
        );
        return;
      }

      if (
        !/^\d{6}$/.test(
          tenantVerification.otp
        )
      ) {
        setError(
          "Please enter the 6-digit tenant verification code."
        );
        return;
      }

      setTenantVerification(
        (previous) => ({
          ...previous,
          loading: true,
        })
      );

      try {
        await verifyNationalIdCode(
          "TENANT",
          userId,
          tenantVerification.otp
        );

        setTenantVerification(
          (previous) => ({
            ...previous,
            verified: true,
            loading: false,
            otp: "",
          })
        );

        setCurrentStep(3);

        setSuccess(
          "Tenant National ID verified successfully."
        );
      } catch (err) {
        setTenantVerification(
          (previous) => ({
            ...previous,
            loading: false,
          })
        );

        setError(
          err instanceof Error
            ? err.message
            : "Tenant National ID verification failed."
        );
      }
    };

  /* =====================================================
     FINAL SUBMIT
  ===================================================== */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setReferenceNumber("");

    const validationError =
      validateAgreement();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (
      !landlordVerification.verified
    ) {
      setError(
        "Please verify the landlord's National ID."
      );
      setCurrentStep(1);
      return;
    }

    if (
      !tenantVerification.verified
    ) {
      setError(
        "Please verify the tenant's National ID."
      );
      setCurrentStep(2);
      return;
    }

    const token = getToken();

    if (!token) {
      setError(
        "You are not logged in. Please login again."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response =
        await fetch(
          `${getApiUrl()}/agreements`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(
              buildPayload()
            ),
          }
        );

      const result =
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          getErrorMessage(
            result,
            "Failed to create rental agreement."
          )
        );
      }

      setSuccess(
        result.message ||
          "Rental agreement created successfully."
      );

      if (
        result.data?.referenceNumber
      ) {
        setReferenceNumber(
          result.data.referenceNumber
        );
      }

      setCurrentStep(4);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating the rental agreement."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* =====================================================
     STEP NAVIGATION
  ===================================================== */

  const canOpenStep = (
    step: number
  ) => {
    if (step === 1) {
      return true;
    }

    if (
      step === 2 &&
      landlordVerification.verified
    ) {
      return true;
    }

    if (
      step === 3 &&
      landlordVerification.verified &&
      tenantVerification.verified
    ) {
      return true;
    }

    return false;
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
    >
      <div
        className="agreement-modal"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="page-header">
          <div>
            <span className="agreement-form-eyebrow">
              RENTAL REGISTRATION
            </span>

            <h1>
              Create Rental Agreement
            </h1>

            <p>
              Complete the standard rental
              registration form and verify both
              parties before submitting.
            </p>
          </div>

          <button
            type="button"
            className="agreement-close-button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* =================================================
            STEPPER
        ================================================= */}

        <div className="agreement-stepper">
          <button
            type="button"
            className={`agreement-step ${
              currentStep === 1
                ? "active"
                : ""
            } ${
              landlordVerification.verified
                ? "completed"
                : ""
            }`}
            onClick={() =>
              setCurrentStep(1)
            }
          >
            <span>
              {landlordVerification.verified
                ? "✓"
                : "1"}
            </span>

            <div>
              <strong>
                Landlord
              </strong>

              <small>
                Identity verification
              </small>
            </div>
          </button>

          <div className="agreement-step-line" />

          <button
            type="button"
            className={`agreement-step ${
              currentStep === 2
                ? "active"
                : ""
            } ${
              tenantVerification.verified
                ? "completed"
                : ""
            }`}
            onClick={() => {
              if (
                canOpenStep(2)
              ) {
                setCurrentStep(2);
              }
            }}
            disabled={!canOpenStep(2)}
          >
            <span>
              {tenantVerification.verified
                ? "✓"
                : "2"}
            </span>

            <div>
              <strong>
                Tenant
              </strong>

              <small>
                Identity verification
              </small>
            </div>
          </button>

          <div className="agreement-step-line" />

          <button
            type="button"
            className={`agreement-step ${
              currentStep === 3
                ? "active"
                : ""
            }`}
            onClick={() => {
              if (
                canOpenStep(3)
              ) {
                setCurrentStep(3);
              }
            }}
            disabled={!canOpenStep(3)}
          >
            <span>3</span>

            <div>
              <strong>
                Agreement
              </strong>

              <small>
                Property & rental terms
              </small>
            </div>
          </button>

          <div className="agreement-step-line" />

          <div
            className={`agreement-step ${
              currentStep === 4
                ? "active"
                : ""
            }`}
          >
            <span>4</span>

            <div>
              <strong>
                Complete
              </strong>

              <small>
                Confirmation
              </small>
            </div>
          </div>
        </div>

        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (
          <div
            className="alert alert-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="alert alert-success"
            role="status"
          >
            <strong>
              Success:
            </strong>{" "}
            {success}

            {referenceNumber && (
              <div
                style={{
                  marginTop:
                    "8px",
                }}
              >
                <strong>
                  Agreement Reference:
                </strong>{" "}
                {referenceNumber}
              </div>
            )}
          </div>
        )}

        {/* =================================================
            STEP 1: LANDLORD
        ================================================= */}

        {currentStep === 1 && (
          <section className="form-section">
            <div className="section-header">
              <div>
                <span className="section-number">
                  01
                </span>

                <h2>
                  Landlord / Lessor
                </h2>

                <p>
                  Enter the landlord's
                  information and verify the
                  National ID.
                </p>
              </div>

              {landlordVerification.verified && (
                <span className="verification-status verified">
                  ✓ Verified
                </span>
              )}
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
                  value={
                    formData.landlordFirstName
                  }
                  onChange={handleChange}
                  disabled={
                    landlordVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.landlordLastName
                  }
                  onChange={handleChange}
                  disabled={
                    landlordVerification.verified ||
                    submitting
                  }
                  required
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
                  value={
                    formData.landlordPhone
                  }
                  onChange={handleChange}
                  disabled={
                    landlordVerification.verified ||
                    submitting
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="landlordNationalId">
                  National ID *
                </label>

                <input
                  id="landlordNationalId"
                  name="landlordNationalId"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  value={
                    formData.landlordNationalId
                  }
                  onChange={(event) =>
                    handleNationalIdChange(
                      "LANDLORD",
                      event.target.value
                    )
                  }
                  placeholder="Enter 16-digit National ID"
                  disabled={
                    landlordVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.landlordAddress
                  }
                  onChange={handleChange}
                  disabled={
                    landlordVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.landlordSubCity
                  }
                  onChange={handleChange}
                  disabled={
                    landlordVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.landlordWoreda
                  }
                  onChange={handleChange}
                  disabled={
                    landlordVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.landlordHouseNumber
                  }
                  onChange={handleChange}
                  disabled={
                    landlordVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.landlordBusinessLicense
                  }
                  onChange={handleChange}
                  disabled={
                    landlordVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.landlordBankAccount
                  }
                  onChange={handleChange}
                  disabled={
                    landlordVerification.verified ||
                    submitting
                  }
                />
              </div>
            </div>

            {/* -------------------------------------------------
                LANDLORD OTP
            ------------------------------------------------- */}

            {landlordVerification.sent &&
              !landlordVerification.verified && (
                <form
                  className="national-id-otp-panel"
                  onSubmit={
                    handleLandlordVerify
                  }
                >
                  <div>
                    <span className="verification-eyebrow">
                      IDENTITY VERIFICATION
                    </span>

                    <h3>
                      Verify Landlord National ID
                    </h3>

                    <p>
                      A 6-digit verification code
                      has been sent to the
                      landlord's phone.
                    </p>
                  </div>

                  <div className="otp-inline-form">
                    <div className="form-group">
                      <label htmlFor="landlordOtp">
                        Verification Code
                      </label>

                      <input
                        id="landlordOtp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={
                          landlordVerification.otp
                        }
                        onChange={(event) =>
                          setLandlordVerification(
                            (previous) => ({
                              ...previous,
                              otp: event.target.value
                                .replace(
                                  /\D/g,
                                  ""
                                )
                                .slice(
                                  0,
                                  6
                                ),
                            })
                          )
                        }
                        placeholder="Enter 6-digit code"
                        autoComplete="one-time-code"
                        autoFocus
                        disabled={
                          landlordVerification.loading
                        }
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={
                        landlordVerification.loading ||
                        landlordVerification.otp.length !==
                          6
                      }
                    >
                      {landlordVerification.loading
                        ? "Verifying..."
                        : "Verify Landlord"}
                    </button>
                  </div>
                </form>
              )}

            {!landlordVerification.sent &&
              !landlordVerification.verified && (
                <div className="verification-action">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      handleLandlordContinue
                    }
                    disabled={submitting}
                  >
                    {submitting
                      ? "Checking..."
                      : "Verify Landlord National ID"}
                  </button>
                </div>
              )}

            {landlordVerification.verified && (
              <div className="verification-success-box">
                ✓ Landlord National ID verified successfully.
              </div>
            )}
          </section>
        )}

        {/* =================================================
            STEP 2: TENANT
        ================================================= */}

        {currentStep === 2 && (
          <section className="form-section">
            <div className="section-header">
              <div>
                <span className="section-number">
                  02
                </span>

                <h2>
                  Tenant / Lessee
                </h2>

                <p>
                  Enter the tenant's information
                  and verify the National ID.
                </p>
              </div>

              {tenantVerification.verified && (
                <span className="verification-status verified">
                  ✓ Verified
                </span>
              )}
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
                  value={
                    formData.tenantFirstName
                  }
                  onChange={handleChange}
                  disabled={
                    !landlordVerification.verified ||
                    tenantVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.tenantLastName
                  }
                  onChange={handleChange}
                  disabled={
                    !landlordVerification.verified ||
                    tenantVerification.verified ||
                    submitting
                  }
                  required
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
                  value={
                    formData.tenantPhone
                  }
                  onChange={handleChange}
                  disabled={
                    !landlordVerification.verified ||
                    tenantVerification.verified ||
                    submitting
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tenantNationalId">
                  National ID *
                </label>

                <input
                  id="tenantNationalId"
                  name="tenantNationalId"
                  type="text"
                  inputMode="numeric"
                  maxLength={16}
                  value={
                    formData.tenantNationalId
                  }
                  onChange={(event) =>
                    handleNationalIdChange(
                      "TENANT",
                      event.target.value
                    )
                  }
                  placeholder="Enter 16-digit National ID"
                  disabled={
                    !landlordVerification.verified ||
                    tenantVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.tenantAddress
                  }
                  onChange={handleChange}
                  disabled={
                    !landlordVerification.verified ||
                    tenantVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.tenantSubCity
                  }
                  onChange={handleChange}
                  disabled={
                    !landlordVerification.verified ||
                    tenantVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.tenantWoreda
                  }
                  onChange={handleChange}
                  disabled={
                    !landlordVerification.verified ||
                    tenantVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.tenantHouseNumber
                  }
                  onChange={handleChange}
                  disabled={
                    !landlordVerification.verified ||
                    tenantVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.tenantEmergencyContactName
                  }
                  onChange={handleChange}
                  disabled={
                    !landlordVerification.verified ||
                    tenantVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.tenantEmergencyContactPhone
                  }
                  onChange={handleChange}
                  disabled={
                    !landlordVerification.verified ||
                    tenantVerification.verified ||
                    submitting
                  }
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
                  value={
                    formData.tenantEmployer
                  }
                  onChange={handleChange}
                  disabled={
                    !landlordVerification.verified ||
                    tenantVerification.verified ||
                    submitting
                  }
                />
              </div>
            </div>

            {tenantVerification.sent &&
              !tenantVerification.verified && (
                <form
                  className="national-id-otp-panel"
                  onSubmit={
                    handleTenantVerify
                  }
                >
                  <div>
                    <span className="verification-eyebrow">
                      IDENTITY VERIFICATION
                    </span>

                    <h3>
                      Verify Tenant National ID
                    </h3>

                    <p>
                      A 6-digit verification code
                      has been sent to the
                      tenant's phone.
                    </p>
                  </div>

                  <div className="otp-inline-form">
                    <div className="form-group">
                      <label htmlFor="tenantOtp">
                        Verification Code
                      </label>

                      <input
                        id="tenantOtp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={
                          tenantVerification.otp
                        }
                        onChange={(event) =>
                          setTenantVerification(
                            (previous) => ({
                              ...previous,
                              otp: event.target.value
                                .replace(
                                  /\D/g,
                                  ""
                                )
                                .slice(
                                  0,
                                  6
                                ),
                            })
                          )
                        }
                        placeholder="Enter 6-digit code"
                        autoComplete="one-time-code"
                        autoFocus
                        disabled={
                          tenantVerification.loading
                        }
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="primary-button"
                      disabled={
                        tenantVerification.loading ||
                        tenantVerification.otp.length !==
                          6
                      }
                    >
                      {tenantVerification.loading
                        ? "Verifying..."
                        : "Verify Tenant"}
                    </button>
                  </div>
                </form>
              )}

            {!tenantVerification.sent &&
              !tenantVerification.verified && (
                <div className="verification-action">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      handleTenantContinue
                    }
                    disabled={submitting}
                  >
                    {submitting
                      ? "Checking..."
                      : "Verify Tenant National ID"}
                  </button>
                </div>
              )}

            {tenantVerification.verified && (
              <div className="verification-success-box">
                ✓ Tenant National ID verified successfully.
              </div>
            )}
          </section>
        )}

        {/* =================================================
            STEP 3: AGREEMENT
        ================================================= */}

        {currentStep === 3 && (
          <form
            onSubmit={handleSubmit}
          >
            {/* =================================================
                PROPERTY
            ================================================= */}

            <section className="form-section">
              <div className="section-header">
                <div>
                  <span className="section-number">
                    03
                  </span>

                  <h2>
                    Property Information
                  </h2>

                  <p>
                    Enter the property where the
                    rental unit is located.
                  </p>
                </div>
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
                    value={
                      formData.propertyLocation
                    }
                    onChange={handleChange}
                    required
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
                    value={
                      formData.propertySubCity
                    }
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
                    value={
                      formData.propertyWoreda
                    }
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
                    value={
                      formData.propertyHouseNumber
                    }
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
                    value={
                      formData.propertyType
                    }
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
                    value={
                      formData.numberOfUnits
                    }
                    onChange={
                      handleNumberChange
                    }
                  />
                </div>
              </div>
            </section>

            {/* =================================================
                UNIT
            ================================================= */}

            <section className="form-section">
              <div className="section-header">
                <div>
                  <span className="section-number">
                    04
                  </span>

                  <h2>
                    Unit Information
                  </h2>

                  <p>
                    Enter details for the
                    specific rental unit.
                  </p>
                </div>
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
                    value={
                      formData.unitNumber
                    }
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
                    value={
                      formData.unitFloor
                    }
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
                    value={
                      formData.unitSizeSqMeters
                    }
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
                    value={
                      formData.unitBedrooms
                    }
                    onChange={
                      handleNumberChange
                    }
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
                    value={
                      formData.unitBathrooms
                    }
                    onChange={
                      handleNumberChange
                    }
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
                    value={
                      formData.unitRentAmountFloor
                    }
                    onChange={handleChange}
                  />
                </div>
              </div>
            </section>

            {/* =================================================
                HOUSE
            ================================================= */}

            <section className="form-section">
              <div className="section-header">
                <div>
                  <span className="section-number">
                    05
                  </span>

                  <h2>
                    House Type & Condition
                  </h2>

                  <p>
                    Record the physical details
                    of the rental property.
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="houseType">
                    Type of House *
                  </label>

                  <select
                    id="houseType"
                    name="houseType"
                    value={
                      formData.houseType
                    }
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
                    value={
                      formData.houseNumber
                    }
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
                    value={
                      formData.numberOfRooms
                    }
                    onChange={
                      handleNumberChange
                    }
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
                    value={
                      formData.numberOfBathrooms
                    }
                    onChange={
                      handleNumberChange
                    }
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
                    value={
                      formData.numberOfDoors
                    }
                    onChange={
                      handleNumberChange
                    }
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
                    value={
                      formData.numberOfWindows
                    }
                    onChange={
                      handleNumberChange
                    }
                  />
                </div>
              </div>
            </section>

            {/* =================================================
                RENTAL TERMS
            ================================================= */}

            <section className="form-section">
              <div className="section-header">
                <div>
                  <span className="section-number">
                    06
                  </span>

                  <h2>
                    Rental Amount & Conditions
                  </h2>

                  <p>
                    Enter duration, rental amount,
                    dates, and payment conditions.
                  </p>
                </div>
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
                    value={
                      formData.durationValue
                    }
                    onChange={
                      handleNumberChange
                    }
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
                    value={
                      formData.durationUnit
                    }
                    onChange={handleChange}
                    required
                  >
                    <option value="MONTH">
                      Month(s)
                    </option>

                    <option value="YEAR">
                      Year(s)
                    </option>
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
                    value={
                      formData.effectiveDate
                    }
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
                    value={
                      formData.terminationDate
                    }
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
                    value={
                      formData.rentalAmount
                    }
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
                    value={
                      formData.advancePayment
                    }
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
                    value={
                      formData.paymentFrequencyName
                    }
                    onChange={handleChange}
                  >
                    <option value="MONTHLY">
                      Monthly
                    </option>

                    <option value="QUARTERLY">
                      Quarterly
                    </option>

                    <option value="SEMI_ANNUALLY">
                      Semi-annually
                    </option>

                    <option value="ANNUALLY">
                      Annually
                    </option>
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
                    value={
                      formData.paymentTerms
                    }
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
                    value={
                      formData.notes
                    }
                    onChange={handleChange}
                    placeholder="Enter any additional notes..."
                  />
                </div>
              </div>
            </section>

            {/* =================================================
                FINAL ACTIONS
            ================================================= */}

            <div className="form-actions">
              <button
                type="button"
                className="cancel-button"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={
                  submitting ||
                  !landlordVerification.verified ||
                  !tenantVerification.verified
                }
              >
                {submitting
                  ? "Creating Agreement..."
                  : "Create Rental Agreement"}
              </button>
            </div>
          </form>
        )}

        {/* =================================================
            STEP 4: COMPLETE
        ================================================= */}

        {currentStep === 4 && (
          <div className="agreement-complete-state">
            <div className="agreement-complete-icon">
              ✓
            </div>

            <h2>
              Rental Agreement Created
            </h2>

            <p>
              The rental agreement has been
              registered successfully and is now
              proceeding through the SmartRent ET
              verification workflow.
            </p>

            {referenceNumber && (
              <div className="agreement-reference-card">
                <span>
                  Agreement Reference
                </span>

                <strong>
                  {referenceNumber}
                </strong>
              </div>
            )}

            <button
              type="button"
              className="primary-button"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateAgreement;