import {
  type ChangeEvent,
  type FormEvent,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import "../../App.css";

/* =========================================================
   TYPES
========================================================= */

type CreateAgreementProps = {
  onClose: () => void;
};

type PartyType =
  | "LANDLORD"
  | "TENANT";

type VerificationState = {
  userId: string | null;
  otp: string;
  sent: boolean;
  verified: boolean;
  loading: boolean;
};

type AgreementFormData = {
  /* LANDLORD */
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

  /* TENANT */
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

  /* PROPERTY */
  propertyLocation: string;
  propertySubCity: string;
  propertyWoreda: string;
  propertyHouseNumber: string;
  propertyType: string;
  numberOfUnits: number;

  /* UNIT */
  unitNumber: string;
  unitFloor: string;
  unitSizeSqMeters: string;
  unitBedrooms: number;
  unitBathrooms: number;
  unitRentAmountFloor: string;

  /* HOUSE */
  houseType: string;
  houseNumber: string;
  numberOfRooms: number;
  numberOfBathrooms: number;
  numberOfDoors: number;
  numberOfWindows: number;

  /* RENTAL */
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

type AgreementData = {
  agreementId?: string;
  referenceNumber?: string;
};

type AgreementCreationData = {
  agreementId?: string;
  referenceNumber?: string;
  requiresVerification?: boolean;
  parties?: string[];
  userIds?: {
    landlordUserId?: string | null;
    tenantUserId?: string | null;
  };
  verificationSent?: boolean;
  agreement?: AgreementData;
  [key: string]: unknown;
};

type ApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: AgreementCreationData;
};

/* =========================================================
   INITIAL FORM
========================================================= */

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

/* =========================================================
   HELPERS
========================================================= */

const getApiUrl = () =>
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken") ||
  "";

const getErrorMessage = (
  response: ApiResponse,
  fallback: string
) =>
  response.error ||
  response.message ||
  fallback;

/* =========================================================
   COMPONENT
========================================================= */

function CreateAgreement({
  onClose,
}: CreateAgreementProps) {
  const navigate = useNavigate();

  const [formData, setFormData] =
    useState<AgreementFormData>(
      initialFormData
    );

  /*
   * 1 = Landlord
   * 2 = Tenant
   * 3 = Agreement
   * 4 = National ID Verification
   * 5 = Complete
   */
  const [currentStep, setCurrentStep] =
    useState(1);

  /* =======================================================
     VERIFICATION STATE
  ======================================================= */

  const [
    landlordVerification,
    setLandlordVerification,
  ] = useState<VerificationState>({
    userId: null,
    otp: "",
    sent: false,
    verified: false,
    loading: false,
  });

  const [
    tenantVerification,
    setTenantVerification,
  ] = useState<VerificationState>({
    userId: null,
    otp: "",
    sent: false,
    verified: false,
    loading: false,
  });

  /*
   * First POST /agreements has been completed and
   * verification is now in progress.
   */
  const [
    verificationInitialized,
    setVerificationInitialized,
  ] = useState(false);

  /*
   * Prevent duplicate final POST /agreements.
   */
  const [
    agreementFinalized,
    setAgreementFinalized,
  ] = useState(false);

  /* =======================================================
     LOADING
  ======================================================= */

  const [submitting, setSubmitting] =
    useState(false);

  const [finalizing, setFinalizing] =
    useState(false);

  /* =======================================================
     MESSAGES
  ======================================================= */

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    referenceNumber,
    setReferenceNumber,
  ] = useState("");

  /* =======================================================
     AUTH
  ======================================================= */

  const requireToken = () => {
    const token = getToken();

    if (!token) {
      throw new Error(
        "Your session has expired. Please login again."
      );
    }

    return token;
  };

  const handleUnauthorized = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("accessToken");

    navigate("/login", {
      replace: true,
    });
  };

  /* =======================================================
     INPUT HANDLING
  ======================================================= */

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement |
        HTMLSelectElement |
        HTMLTextAreaElement
    >
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleNumberChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const {
      name,
      value,
    } = event.target;

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
    const cleaned =
      value
        .replace(/\D/g, "")
        .slice(0, 16);

    if (
      party === "LANDLORD"
    ) {
      setFormData((previous) => ({
        ...previous,
        landlordNationalId:
          cleaned,
      }));
    } else {
      setFormData((previous) => ({
        ...previous,
        tenantNationalId:
          cleaned,
      }));
    }
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateLandlord =
    (): string | null => {
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

      if (
        !formData.landlordAddress.trim()
      ) {
        return "Landlord address is required.";
      }

      if (
        !formData.landlordSubCity.trim()
      ) {
        return "Landlord sub-city is required.";
      }

      if (
        !formData.landlordWoreda.trim()
      ) {
        return "Landlord woreda is required.";
      }

      if (
        !formData.landlordHouseNumber.trim()
      ) {
        return "Landlord house number is required.";
      }

      if (
        !formData.landlordBusinessLicense.trim()
      ) {
        return "Landlord business license is required.";
      }

      if (
        !formData.landlordBankAccount.trim()
      ) {
        return "Landlord bank account is required.";
      }

      return null;
    };

  const validateTenant =
    (): string | null => {
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

      if (
        !formData.tenantAddress.trim()
      ) {
        return "Tenant address is required.";
      }

      if (
        !formData.tenantSubCity.trim()
      ) {
        return "Tenant sub-city is required.";
      }

      if (
        !formData.tenantWoreda.trim()
      ) {
        return "Tenant woreda is required.";
      }

      if (
        !formData.tenantHouseNumber.trim()
      ) {
        return "Tenant house number is required.";
      }

      if (
        !formData.tenantEmergencyContactName.trim()
      ) {
        return "Tenant emergency contact name is required.";
      }

      if (
        !formData.tenantEmergencyContactPhone.trim()
      ) {
        return "Tenant emergency contact phone is required.";
      }

      if (
        !formData.tenantEmployer.trim()
      ) {
        return "Tenant employer is required.";
      }

      return null;
    };

  const validateAgreement =
    (): string | null => {
      if (
        !formData.propertyLocation.trim()
      ) {
        return "Property location is required.";
      }

      if (
        !formData.propertySubCity.trim()
      ) {
        return "Property sub-city is required.";
      }

      if (
        !formData.propertyWoreda.trim()
      ) {
        return "Property woreda is required.";
      }

      if (
        !formData.propertyHouseNumber.trim()
      ) {
        return "Property house number is required.";
      }

      if (
        !formData.unitNumber.trim()
      ) {
        return "Unit number is required.";
      }

      if (
        formData.unitFloor === "" ||
        !Number.isFinite(
          Number(formData.unitFloor)
        )
      ) {
        return "Unit floor must be a valid number.";
      }

      if (
        Number(formData.unitFloor) <= 0
      ) {
        return "Unit floor must be greater than zero.";
      }

      if (
        formData.unitSizeSqMeters === "" ||
        !Number.isFinite(
          Number(
            formData.unitSizeSqMeters
          )
        )
      ) {
        return "Unit size must be a valid number.";
      }

      if (
        Number(
          formData.unitSizeSqMeters
        ) <= 0
      ) {
        return "Unit size must be greater than zero.";
      }

      if (
        formData.unitRentAmountFloor !==
          "" &&
        Number(
          formData.unitRentAmountFloor
        ) <= 0
      ) {
        return "Minimum rent amount must be greater than zero.";
      }

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

      if (
        !formData.paymentTerms.trim()
      ) {
        return "Payment terms are required.";
      }

      if (
        !formData.notes.trim()
      ) {
        return "Additional notes are required.";
      }

      return null;
    };

  /* =======================================================
     PAYLOAD
  ======================================================= */

  const buildPayload = () => ({
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

    unitNumber:
      formData.unitNumber.trim(),

    unitFloor:
      Number(formData.unitFloor),

    unitSizeSqMeters:
      Number(
        formData.unitSizeSqMeters
      ),

    unitBedrooms:
      Number(formData.unitBedrooms),

    unitBathrooms:
      Number(formData.unitBathrooms),

    unitRentAmountFloor:
      formData.unitRentAmountFloor === ""
        ? Number(formData.rentalAmount)
        : Number(
            formData.unitRentAmountFloor
          ),

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

    durationValue:
      Number(formData.durationValue),

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
  });

  /* =======================================================
     SEND NATIONAL ID CODE
  ======================================================= */

  const sendNationalIdCode =
    async (
      party: PartyType,
      userId: string
    ) => {
      const token =
        requireToken();

      const response =
        await fetch(
          `${getApiUrl()}/auth/send-national-id-verification`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId,
            }),
          }
        );

      if (
        response.status === 401
      ) {
        handleUnauthorized();

        throw new Error(
          "Your session has expired. Please login again."
        );
      }

      const result =
        (await response.json()) as ApiResponse;

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          getErrorMessage(
            result,
            `Failed to send ${party.toLowerCase()} National ID verification code.`
          )
        );
      }

      return result;
    };

  /* =======================================================
     VERIFY NATIONAL ID CODE
  ======================================================= */

  const verifyNationalIdCode =
    async (
      party: PartyType,
      userId: string,
      code: string
    ) => {
      const token =
        requireToken();

      const response =
        await fetch(
          `${getApiUrl()}/auth/verify-national-id`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId,
              code,
            }),
          }
        );

      if (
        response.status === 401
      ) {
        handleUnauthorized();

        throw new Error(
          "Your session has expired. Please login again."
        );
      }

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

  /* =======================================================
     INITIALIZE AGREEMENT
  ======================================================= */

  const initializeAgreement =
    async () => {
      const token =
        requireToken();

      if (
        verificationInitialized ||
        agreementFinalized
      ) {
        return;
      }

      const response =
        await fetch(
          `${getApiUrl()}/agreements`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${token}`,
            },
            body: JSON.stringify(
              buildPayload()
            ),
          }
        );

      if (
        response.status === 401
      ) {
        handleUnauthorized();

        throw new Error(
          "Your session has expired. Please login again."
        );
      }

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

      const data =
        result.data;

      /* ===================================================
         BOTH PARTIES ALREADY VERIFIED
      =================================================== */

      if (
        data &&
        !data.requiresVerification
      ) {
        const agreement =
          data.agreement;

        const reference =
          data.referenceNumber ||
          agreement?.referenceNumber ||
          "";

        setReferenceNumber(
          reference
        );

        setAgreementFinalized(
          true
        );

        setSuccess(
          result.message ||
            "Rental agreement created successfully. USSD verification codes have been sent to the landlord and tenant."
        );

        setCurrentStep(5);

        return;
      }

      /* ===================================================
         NATIONAL ID VERIFICATION REQUIRED
      =================================================== */

      if (
        data?.requiresVerification
      ) {
        const parties =
          data.parties ?? [];

        const landlordNeedsVerification =
          parties.includes(
            "Landlord"
          );

        const tenantNeedsVerification =
          parties.includes(
            "Tenant"
          );

        const landlordUserId =
          data.userIds
            ?.landlordUserId ??
          null;

        const tenantUserId =
          data.userIds
            ?.tenantUserId ??
          null;

        if (
          landlordNeedsVerification &&
          !landlordUserId
        ) {
          throw new Error(
            "The backend requested landlord verification but did not return a landlord user ID."
          );
        }

        if (
          tenantNeedsVerification &&
          !tenantUserId
        ) {
          throw new Error(
            "The backend requested tenant verification but did not return a tenant user ID."
          );
        }

        setLandlordVerification({
          userId:
            landlordUserId,
          otp: "",
          sent: false,
          verified:
            !landlordNeedsVerification,
          loading: false,
        });

        setTenantVerification({
          userId:
            tenantUserId,
          otp: "",
          sent: false,
          verified:
            !tenantNeedsVerification,
          loading: false,
        });

        setVerificationInitialized(
          true
        );

        setCurrentStep(4);

        setSuccess(
          result.message ||
            "National ID verification is required before the agreement can be created."
        );

        /*
         * Send landlord code.
         */
        if (
          landlordNeedsVerification &&
          landlordUserId
        ) {
          await sendNationalIdCode(
            "LANDLORD",
            landlordUserId
          );

          setLandlordVerification(
            (previous) => ({
              ...previous,
              sent: true,
            })
          );
        }

        /*
         * Send tenant code.
         */
        if (
          tenantNeedsVerification &&
          tenantUserId
        ) {
          await sendNationalIdCode(
            "TENANT",
            tenantUserId
          );

          setTenantVerification(
            (previous) => ({
              ...previous,
              sent: true,
            })
          );
        }

        return;
      }

      throw new Error(
        result.message ||
          "Unable to process rental agreement."
      );
    };

  /* =======================================================
     FINALIZE AGREEMENT
     
     IMPORTANT:
     The current verification values are passed in
     explicitly. This avoids React asynchronous state
     timing problems.
  ======================================================= */

  const finalizeAgreement =
    async (
      landlordIsVerified: boolean,
      tenantIsVerified: boolean
    ) => {
      if (
        agreementFinalized ||
        finalizing
      ) {
        return;
      }

      if (
        !landlordIsVerified ||
        !tenantIsVerified
      ) {
        return;
      }

      const token =
        getToken();

      if (!token) {
        handleUnauthorized();
        return;
      }

      setFinalizing(true);
      setError("");
      setSuccess("");

      try {
        const response =
          await fetch(
            `${getApiUrl()}/agreements`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify(
                buildPayload()
              ),
            }
          );

        if (
          response.status === 401
        ) {
          handleUnauthorized();

          throw new Error(
            "Your session has expired. Please login again."
          );
        }

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

        /*
         * If the backend still says verification
         * is required, do not claim success.
         */
        if (
          result.data?.requiresVerification
        ) {
          throw new Error(
            "National ID verification is still incomplete."
          );
        }

        /*
         * Your backend returns:
         *
         * data: {
         *   agreement: {
         *     referenceNumber: "..."
         *   }
         * }
         *
         * Support both nested and direct response forms.
         */
        const agreement =
          result.data?.agreement;

        const reference =
          result.data
            ?.referenceNumber ||
          agreement?.referenceNumber ||
          "";

        setReferenceNumber(
          reference
        );

        setAgreementFinalized(
          true
        );

        setSuccess(
          result.message ||
            "Rental agreement created successfully. USSD verification codes have been sent to the landlord and tenant."
        );

        setCurrentStep(5);
      } catch (err) {
        console.error(
          "Final agreement creation error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to create rental agreement."
        );
      } finally {
        setFinalizing(false);
      }
    };

  /* =======================================================
     VERIFY LANDLORD
  ======================================================= */

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
          "Landlord verification user ID is missing."
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

        /*
         * The backend has just confirmed landlord.
         *
         * We capture tenant state BEFORE calling
         * setLandlordVerification because React state
         * updates are asynchronous.
         */
        const tenantAlreadyVerified =
          tenantVerification.verified;

        setLandlordVerification(
          (previous) => ({
            ...previous,
            verified: true,
            loading: false,
            otp: "",
          })
        );

        setSuccess(
          "Landlord National ID verified successfully."
        );

        /*
         * If tenant was already verified, both are now
         * verified, so finalize immediately.
         */
        if (
          tenantAlreadyVerified
        ) {
          await finalizeAgreement(
            true,
            true
          );
        }
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

  /* =======================================================
     VERIFY TENANT
  ======================================================= */

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
          "Tenant verification user ID is missing."
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

        /*
         * The backend has just confirmed tenant.
         *
         * Capture landlord state before updating
         * tenant state.
         */
        const landlordAlreadyVerified =
          landlordVerification.verified;

        setTenantVerification(
          (previous) => ({
            ...previous,
            verified: true,
            loading: false,
            otp: "",
          })
        );

        setSuccess(
          "Tenant National ID verified successfully."
        );

        /*
         * If landlord was already verified, both
         * parties are now verified.
         */
        if (
          landlordAlreadyVerified
        ) {
          await finalizeAgreement(
            true,
            true
          );
        }
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

  /* =======================================================
     RESEND LANDLORD CODE
  ======================================================= */

  const resendLandlordCode =
    async () => {
      const userId =
        landlordVerification.userId;

      if (!userId) {
        setError(
          "Landlord verification user ID is missing."
        );
        return;
      }

      setError("");
      setSuccess("");

      setLandlordVerification(
        (previous) => ({
          ...previous,
          loading: true,
        })
      );

      try {
        await sendNationalIdCode(
          "LANDLORD",
          userId
        );

        setLandlordVerification(
          (previous) => ({
            ...previous,
            sent: true,
            loading: false,
          })
        );

        setSuccess(
          "A new landlord National ID verification code has been sent."
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
            : "Failed to resend landlord verification code."
        );
      }
    };

  /* =======================================================
     RESEND TENANT CODE
  ======================================================= */

  const resendTenantCode =
    async () => {
      const userId =
        tenantVerification.userId;

      if (!userId) {
        setError(
          "Tenant verification user ID is missing."
        );
        return;
      }

      setError("");
      setSuccess("");

      setTenantVerification(
        (previous) => ({
          ...previous,
          loading: true,
        })
      );

      try {
        await sendNationalIdCode(
          "TENANT",
          userId
        );

        setTenantVerification(
          (previous) => ({
            ...previous,
            sent: true,
            loading: false,
          })
        );

        setSuccess(
          "A new tenant National ID verification code has been sent."
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
            : "Failed to resend tenant verification code."
        );
      }
    };

  /* =======================================================
     STEP NAVIGATION
  ======================================================= */

  const canOpenStep = (
    step: number
  ) => {
    if (step === 1) {
      return true;
    }

    if (
      step === 2 &&
      validateLandlord() === null
    ) {
      return true;
    }

    if (
      step === 3 &&
      validateLandlord() === null &&
      validateTenant() === null
    ) {
      return true;
    }

    return false;
  };

  const handleClose = () => {
    if (
      submitting ||
      finalizing
    ) {
      return;
    }

    onClose();
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="modal-overlay"
      onClick={() => {
        if (
          !submitting &&
          !finalizing
        ) {
          onClose();
        }
      }}
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
              Complete the agreement information,
              then verify National IDs when required.
            </p>
          </div>

          <button
            type="button"
            className="agreement-close-button"
            onClick={handleClose}
            disabled={
              submitting ||
              finalizing
            }
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
            }`}
            onClick={() =>
              setCurrentStep(1)
            }
            disabled={
              verificationInitialized ||
              agreementFinalized
            }
          >
            <span>1</span>

            <div>
              <strong>
                Landlord
              </strong>

              <small>
                Information
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
            }`}
            onClick={() => {
              if (
                canOpenStep(2)
              ) {
                setCurrentStep(2);
              }
            }}
            disabled={
              !canOpenStep(2) ||
              verificationInitialized ||
              agreementFinalized
            }
          >
            <span>2</span>

            <div>
              <strong>
                Tenant
              </strong>

              <small>
                Information
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
            disabled={
              !canOpenStep(3) ||
              verificationInitialized ||
              agreementFinalized
            }
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
                Verify
              </strong>

              <small>
                National IDs
              </small>
            </div>
          </div>

          <div className="agreement-step-line" />

          <div
            className={`agreement-step ${
              currentStep === 5
                ? "active"
                : ""
            }`}
          >
            <span>5</span>

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
                  marginTop: "8px",
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
            STEP 1 - LANDLORD
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
                  Enter the complete landlord
                  information.
                </p>
              </div>

            </div>

            <div className="form-grid">

              <div className="form-group">
                <label htmlFor="landlordFirstName">
                  First Name *
                </label>

                <input
                  id="landlordFirstName"
                  name="landlordFirstName"
                  value={
                    formData.landlordFirstName
                  }
                  onChange={handleChange}
                  disabled={
                    submitting ||
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="landlordLastName">
                  Last Name *
                </label>

                <input
                  id="landlordLastName"
                  name="landlordLastName"
                  value={
                    formData.landlordLastName
                  }
                  onChange={handleChange}
                  disabled={
                    submitting ||
                    verificationInitialized
                  }
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
                    submitting ||
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="landlordNationalId">
                  National ID *
                </label>

                <input
                  id="landlordNationalId"
                  name="landlordNationalId"
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
                  placeholder="16-digit National ID"
                  disabled={
                    submitting ||
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="landlordAddress">
                  Address *
                </label>

                <input
                  id="landlordAddress"
                  name="landlordAddress"
                  value={
                    formData.landlordAddress
                  }
                  onChange={handleChange}
                  disabled={
                    submitting ||
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="landlordSubCity">
                  Sub-city *
                </label>

                <input
                  id="landlordSubCity"
                  name="landlordSubCity"
                  value={
                    formData.landlordSubCity
                  }
                  onChange={handleChange}
                  disabled={
                    submitting ||
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="landlordWoreda">
                  Woreda *
                </label>

                <input
                  id="landlordWoreda"
                  name="landlordWoreda"
                  value={
                    formData.landlordWoreda
                  }
                  onChange={handleChange}
                  disabled={
                    submitting ||
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="landlordHouseNumber">
                  House Number *
                </label>

                <input
                  id="landlordHouseNumber"
                  name="landlordHouseNumber"
                  value={
                    formData.landlordHouseNumber
                  }
                  onChange={handleChange}
                  disabled={
                    submitting ||
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="landlordBusinessLicense">
                  Business License *
                </label>

                <input
                  id="landlordBusinessLicense"
                  name="landlordBusinessLicense"
                  value={
                    formData.landlordBusinessLicense
                  }
                  onChange={handleChange}
                  disabled={
                    submitting ||
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="landlordBankAccount">
                  Bank Account *
                </label>

                <input
                  id="landlordBankAccount"
                  name="landlordBankAccount"
                  value={
                    formData.landlordBankAccount
                  }
                  onChange={handleChange}
                  disabled={
                    submitting ||
                    verificationInitialized
                  }
                />
              </div>

            </div>

            <div className="form-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setError("");
                  setSuccess("");

                  const validationError =
                    validateLandlord();

                  if (
                    validationError
                  ) {
                    setError(
                      validationError
                    );
                    return;
                  }

                  setCurrentStep(2);
                }}
                disabled={submitting}
              >
                Continue to Tenant
              </button>

            </div>
          </section>
        )}

        {/* =================================================
            STEP 2 - TENANT
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
                  Enter the complete tenant
                  information.
                </p>
              </div>

            </div>

            <div className="form-grid">

              <div className="form-group">
                <label htmlFor="tenantFirstName">
                  First Name *
                </label>

                <input
                  id="tenantFirstName"
                  name="tenantFirstName"
                  value={
                    formData.tenantFirstName
                  }
                  onChange={handleChange}
                  disabled={
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="tenantLastName">
                  Last Name *
                </label>

                <input
                  id="tenantLastName"
                  name="tenantLastName"
                  value={
                    formData.tenantLastName
                  }
                  onChange={handleChange}
                  disabled={
                    verificationInitialized
                  }
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
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="tenantNationalId">
                  National ID *
                </label>

                <input
                  id="tenantNationalId"
                  name="tenantNationalId"
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
                  placeholder="16-digit National ID"
                  disabled={
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="tenantAddress">
                  Address *
                </label>

                <input
                  id="tenantAddress"
                  name="tenantAddress"
                  value={
                    formData.tenantAddress
                  }
                  onChange={handleChange}
                  disabled={
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="tenantSubCity">
                  Sub-city *
                </label>

                <input
                  id="tenantSubCity"
                  name="tenantSubCity"
                  value={
                    formData.tenantSubCity
                  }
                  onChange={handleChange}
                  disabled={
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="tenantWoreda">
                  Woreda *
                </label>

                <input
                  id="tenantWoreda"
                  name="tenantWoreda"
                  value={
                    formData.tenantWoreda
                  }
                  onChange={handleChange}
                  disabled={
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="tenantHouseNumber">
                  House Number *
                </label>

                <input
                  id="tenantHouseNumber"
                  name="tenantHouseNumber"
                  value={
                    formData.tenantHouseNumber
                  }
                  onChange={handleChange}
                  disabled={
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="tenantEmergencyContactName">
                  Emergency Contact Name *
                </label>

                <input
                  id="tenantEmergencyContactName"
                  name="tenantEmergencyContactName"
                  value={
                    formData.tenantEmergencyContactName
                  }
                  onChange={handleChange}
                  disabled={
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="tenantEmergencyContactPhone">
                  Emergency Contact Phone *
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
                    verificationInitialized
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="tenantEmployer">
                  Employer *
                </label>

                <input
                  id="tenantEmployer"
                  name="tenantEmployer"
                  value={
                    formData.tenantEmployer
                  }
                  onChange={handleChange}
                  disabled={
                    verificationInitialized
                  }
                />
              </div>

            </div>

            <div className="form-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setCurrentStep(1)
                }
              >
                Back
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setError("");
                  setSuccess("");

                  const validationError =
                    validateTenant();

                  if (
                    validationError
                  ) {
                    setError(
                      validationError
                    );
                    return;
                  }

                  setCurrentStep(3);
                }}
              >
                Continue to Agreement
              </button>

            </div>
          </section>
        )}

        {/* =================================================
            STEP 3 - AGREEMENT
        ================================================= */}

        {currentStep === 3 && (
          <form
            onSubmit={async (
              event
            ) => {
              event.preventDefault();

              setError("");
              setSuccess("");
              setReferenceNumber("");

              const validationError =
                validateAgreement();

              if (
                validationError
              ) {
                setError(
                  validationError
                );
                return;
              }

              setSubmitting(true);

              try {
                await initializeAgreement();
              } catch (err) {
                console.error(
                  "Agreement submission error:",
                  err
                );

                setError(
                  err instanceof Error
                    ? err.message
                    : "Failed to create rental agreement."
                );
              } finally {
                setSubmitting(false);
              }
            }}
          >

            {/* PROPERTY */}

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
                    Enter the property details.
                  </p>
                </div>

              </div>

              <div className="form-grid">

                <div className="form-group full-width">

                  <label htmlFor="propertyLocation">
                    Property Address / Location *
                  </label>

                  <input
                    id="propertyLocation"
                    name="propertyLocation"
                    value={
                      formData.propertyLocation
                    }
                    onChange={handleChange}
                  />

                </div>

                <div className="form-group">

                  <label htmlFor="propertySubCity">
                    Sub-city *
                  </label>

                  <input
                    id="propertySubCity"
                    name="propertySubCity"
                    value={
                      formData.propertySubCity
                    }
                    onChange={handleChange}
                  />

                </div>

                <div className="form-group">

                  <label htmlFor="propertyWoreda">
                    Woreda *
                  </label>

                  <input
                    id="propertyWoreda"
                    name="propertyWoreda"
                    value={
                      formData.propertyWoreda
                    }
                    onChange={handleChange}
                  />

                </div>

                <div className="form-group">

                  <label htmlFor="propertyHouseNumber">
                    House Number *
                  </label>

                  <input
                    id="propertyHouseNumber"
                    name="propertyHouseNumber"
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

            {/* UNIT */}

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
                    Enter the rental unit details.
                  </p>
                </div>

              </div>

              <div className="form-grid">

                <div className="form-group">

                  <label htmlFor="unitNumber">
                    Unit Number *
                  </label>

                  <input
                    id="unitNumber"
                    name="unitNumber"
                    value={
                      formData.unitNumber
                    }
                    onChange={handleChange}
                  />

                </div>

                <div className="form-group">

                  <label htmlFor="unitFloor">
                    Floor *
                  </label>

                  <input
                    id="unitFloor"
                    name="unitFloor"
                    type="number"
                    min="1"
                    value={
                      formData.unitFloor
                    }
                    onChange={handleChange}
                  />

                </div>

                <div className="form-group">

                  <label htmlFor="unitSizeSqMeters">
                    Size (m²) *
                  </label>

                  <input
                    id="unitSizeSqMeters"
                    name="unitSizeSqMeters"
                    type="number"
                    min="0.01"
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

            {/* HOUSE */}

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
                    Record physical property details.
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
                    value={
                      formData.houseNumber
                    }
                    onChange={handleChange}
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

            {/* RENTAL TERMS */}

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
                    Enter the rental terms and
                    payment conditions.
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
                    min="0.01"
                    step="0.01"
                    value={
                      formData.rentalAmount
                    }
                    onChange={handleChange}
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
                    Rental Payment Terms / Conditions *
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
                    Additional Notes *
                  </label>

                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    value={
                      formData.notes
                    }
                    onChange={handleChange}
                    placeholder="Enter additional notes..."
                  />

                </div>

              </div>

            </section>

            <div className="form-actions">

              <button
                type="button"
                className="cancel-button"
                onClick={() =>
                  setCurrentStep(2)
                }
                disabled={
                  submitting
                }
              >
                Back
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={
                  submitting
                }
              >
                {submitting
                  ? "Processing..."
                  : "Create Rental Agreement"}
              </button>

            </div>

          </form>
        )}

        {/* =================================================
            STEP 4 - NATIONAL ID VERIFICATION
        ================================================= */}

        {currentStep === 4 && (
          <section className="form-section">

            <div className="section-header">

              <div>
                <span className="section-number">
                  04
                </span>

                <h2>
                  National ID Verification
                </h2>

                <p>
                  Verify only the parties whose National
                  IDs are not already verified.
                </p>
              </div>

            </div>

            <div
              style={{
                marginBottom: "20px",
                padding: "14px 16px",
                border:
                  "1px solid #dceae6",
                borderRadius: "9px",
                background:
                  "#f8fcfb",
                color: "#53636c",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              The verification code is sent to the
              party's registered phone number. Enter
              the 6-digit code provided to the landlord
              or tenant.
            </div>

            {/* LANDLORD */}

            <div
              className="national-id-otp-panel"
              style={{
                marginBottom: "20px",
                opacity:
                  landlordVerification.verified
                    ? 0.8
                    : 1,
              }}
            >

              <div>

                <span className="verification-eyebrow">
                  LANDLORD
                </span>

                <h3>
                  Verify Landlord National ID
                </h3>

                {landlordVerification.verified ? (
                  <p
                    style={{
                      color: "#047857",
                      fontWeight: 600,
                    }}
                  >
                    ✓ Landlord National ID verified.
                  </p>
                ) : landlordVerification.sent ? (
                  <p>
                    A 6-digit code was sent to the
                    landlord's registered phone.
                  </p>
                ) : (
                  <p>
                    Waiting for the landlord verification
                    code to be sent.
                  </p>
                )}

              </div>

              {!landlordVerification.verified &&
                landlordVerification.sent && (

                  <form
                    onSubmit={
                      handleLandlordVerify
                    }
                  >

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
                                otp:
                                  event.target.value
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
                          disabled={
                            landlordVerification.loading ||
                            finalizing
                          }
                          autoFocus
                        />

                      </div>

                      <button
                        type="submit"
                        className="primary-button"
                        disabled={
                          landlordVerification.loading ||
                          finalizing ||
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

              {!landlordVerification.verified &&
                landlordVerification.userId && (

                  <button
                    type="button"
                    onClick={
                      resendLandlordCode
                    }
                    disabled={
                      landlordVerification.loading ||
                      finalizing
                    }
                    style={{
                      marginTop: "12px",
                      background:
                        "transparent",
                      border: "none",
                      color: "#008f78",
                      cursor:
                        "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Resend landlord code
                  </button>

                )}

            </div>

            {/* TENANT */}

            <div
              className="national-id-otp-panel"
              style={{
                marginBottom: "20px",
                opacity:
                  tenantVerification.verified
                    ? 0.8
                    : 1,
              }}
            >

              <div>

                <span className="verification-eyebrow">
                  TENANT
                </span>

                <h3>
                  Verify Tenant National ID
                </h3>

                {tenantVerification.verified ? (
                  <p
                    style={{
                      color: "#047857",
                      fontWeight: 600,
                    }}
                  >
                    ✓ Tenant National ID verified.
                  </p>
                ) : tenantVerification.sent ? (
                  <p>
                    A 6-digit code was sent to the
                    tenant's registered phone.
                  </p>
                ) : (
                  <p>
                    Waiting for the tenant verification
                    code to be sent.
                  </p>
                )}

              </div>

              {!tenantVerification.verified &&
                tenantVerification.sent && (

                  <form
                    onSubmit={
                      handleTenantVerify
                    }
                  >

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
                                otp:
                                  event.target.value
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
                          disabled={
                            tenantVerification.loading ||
                            finalizing
                          }
                        />

                      </div>

                      <button
                        type="submit"
                        className="primary-button"
                        disabled={
                          tenantVerification.loading ||
                          finalizing ||
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

              {!tenantVerification.verified &&
                tenantVerification.userId && (

                  <button
                    type="button"
                    onClick={
                      resendTenantCode
                    }
                    disabled={
                      tenantVerification.loading ||
                      finalizing
                    }
                    style={{
                      marginTop: "12px",
                      background:
                        "transparent",
                      border: "none",
                      color: "#008f78",
                      cursor:
                        "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Resend tenant code
                  </button>

                )}

            </div>

            {/* BOTH VERIFIED */}

            {landlordVerification.verified &&
              tenantVerification.verified &&
              !finalizing &&
              !agreementFinalized && (

                <div
                  className="verification-success-box"
                  style={{
                    marginTop: "20px",
                  }}
                >
                  ✓ Both National IDs have been verified.
                  The rental agreement will now be created.
                </div>

              )}

            {/* FINALIZING */}

            {finalizing && (

              <div
                style={{
                  marginTop: "20px",
                  padding: "24px",
                  textAlign: "center",
                  border:
                    "1px solid #dceae6",
                  borderRadius: "10px",
                  background:
                    "#f8fcfb",
                }}
              >

                <h3>
                  Creating Rental Agreement
                </h3>

                <p>
                  Both identities are verified.
                  Finalizing the rental agreement
                  and sending USSD consent codes...
                </p>

              </div>

            )}

          </section>
        )}

        {/* =================================================
            STEP 5 - COMPLETE
        ================================================= */}

        {currentStep === 5 && (

          <div className="agreement-complete-state">

            <div className="agreement-complete-icon">
              ✓
            </div>

            <h2>
              Rental Agreement Created
            </h2>

            <p>
              The rental agreement has been registered
              successfully. The parties can now complete
              the USSD consent verification process.
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

            <div
              style={{
                marginTop: "18px",
                padding: "14px 16px",
                border:
                  "1px solid #dceae6",
                borderRadius: "9px",
                background:
                  "#f8fcfb",
                color:
                  "#53636c",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              <strong>
                Next step:
              </strong>{" "}
              The landlord and tenant will use the
              USSD verification codes sent to their
              registered phones to consent to the
              agreement.
            </div>

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