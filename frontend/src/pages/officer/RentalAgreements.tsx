import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  FileText,
  History,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  X,
  XCircle,
} from "lucide-react";

import CreateAgreement from "./CreateAgreement";

/* =========================================================
   TYPES
========================================================= */

type AgreementStatus =
  | "Approved"
  | "Pending"
  | "Draft"
  | "Rejected"
  | "Active";

type BackendAgreement = {
  agreementId: string;
  referenceNumber: string;
  status: string;

  durationValue?: number;
  durationUnit?: string;

  rentalAmount?: number | string | null;

  effectiveDate?: string | null;
  terminationDate?: string | null;
  createdAt?: string;

  landlord?: {
    landlordId?: string;

    user?: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
    };
  };

  tenant?: {
    tenantId?: string;

    user?: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
    };
  };

  unit?: {
    unitId?: string;
    unitNumber?: string;

    property?: {
      location?: string | null;
      subCity?: string | null;
      woreda?: string | null;
    };
  };

  office?: {
    officeId?: string;
    officeCode?: string;
    officeName?: string;
  };

  createdByOfficer?: {
    officerId?: string;
    employeeId?: string;

    user?: {
      firstName?: string;
      lastName?: string;
    };
  };

  serviceFeePayment?: {
    serviceFeePaymentId?: string;
    status?: string;
    amount?: number | string | null;
    paidAt?: string | null;
  };

  payments?: Array<{
    paymentId?: string;
    amount?: number | string | null;
    status?: string;
    dueDate?: string | null;
    paidDate?: string | null;
  }>;

  verifications?: Array<{
    verificationId?: string;
    party?: string;
    phoneNumber?: string;
    status?: string;
    verifiedAt?: string | null;
  }>;
};

type ContractsResponse = {
  success: boolean;
  message?: string;
  filters?: Record<string, unknown>;
  data: BackendAgreement[];
};

type GenericResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: unknown;
};

type ApprovalHistoryItem = {
  approvalId?: string;
  agreementId?: string;
  action?: string;
  status?: string;
  comments?: string | null;
  approvalDate?: string;
  createdAt?: string;
  officer?: {
    officerId?: string;
    employeeId?: string;
    user?: {
      firstName?: string;
      lastName?: string;
      username?: string | null;
    };
  };
};

type ApprovalHistoryResponse = {
  success: boolean;
  message?: string;
  data: ApprovalHistoryItem[];
};

type RentalAgreement = {
  id: string;
  referenceNumber: string;

  landlord: string;
  tenant: string;

  property: string;
  location: string;

  monthlyRent: number;

  status: AgreementStatus;
  backendStatus: string;

  startDate?: string;
  endDate?: string;
  createdAt?: string;

  landlordPhone?: string;
  tenantPhone?: string;

  serviceFeeStatus?: string;
  serviceFeePaymentId?: string;
  serviceFeeAmount?: number;

  durationValue?: number;
  durationUnit?: string;

  verifications?: {
    landlord?: {
      status?: string;
      phoneNumber?: string;
      verifiedAt?: string | null;
    };

    tenant?: {
      status?: string;
      phoneNumber?: string;
      verifiedAt?: string | null;
    };
  };

  createdByOfficerName?: string;
  createdByOfficerEmployeeId?: string;
};

/* =========================================================
   HELPERS
========================================================= */

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const getToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken") ||
  "";

const formatDate = (
  value?: string | null
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
};

const formatDateTime = (
  value?: string | null
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );
};

const formatMoney = (
  value?: number | string | null
) => {
  const amount = Number(
    value ?? 0
  );

  if (Number.isNaN(amount)) {
    return "0";
  }

  return amount.toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );
};

const getDisplayStatus = (
  status: string
): AgreementStatus => {
  switch (status) {
    case "ACTIVE":
      return "Active";

    case "APPROVED":
      return "Approved";

    case "PENDING_VERIFICATION":
    case "PENDING_SERVICE_FEE":
      return "Pending";

    case "DRAFT":
      return "Draft";

    case "REJECTED":
    case "TERMINATED":
    case "EXPIRED":
      return "Rejected";

    default:
      return "Pending";
  }
};

const getPersonName = (
  firstName?: string,
  lastName?: string
) => {
  const name =
    `${firstName ?? ""} ${
      lastName ?? ""
    }`.trim();

  return name || "—";
};

const getApprovalActionLabel = (
  item: ApprovalHistoryItem
) => {
  const action =
    item.action ||
    item.status ||
    "—";

  return action
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
};

const getStatusClass = (
  status: AgreementStatus
) => {
  switch (status) {
    case "Active":
    case "Approved":
      return "agreement-status-approved";

    case "Rejected":
      return "agreement-status-rejected";

    case "Pending":
      return "agreement-status-pending";

    case "Draft":
    default:
      return "agreement-status-draft";
  }
};

const mapBackendAgreement = (
  agreement: BackendAgreement
): RentalAgreement => {
  const propertyLocation =
    agreement.unit?.property?.location ||
    "—";

  const subCity =
    agreement.unit?.property?.subCity;

  const woreda =
    agreement.unit?.property?.woreda;

  const locationParts = [
    propertyLocation,
    subCity,
    woreda
      ? `Woreda ${woreda}`
      : "",
  ].filter(Boolean);

  const landlordVerification =
    agreement.verifications?.find(
      (verification) =>
        String(
          verification.party
        ).toUpperCase() ===
        "LANDLORD"
    );

  const tenantVerification =
    agreement.verifications?.find(
      (verification) =>
        String(
          verification.party
        ).toUpperCase() ===
        "TENANT"
    );

  const officerName =
    getPersonName(
      agreement.createdByOfficer?.user
        ?.firstName,
      agreement.createdByOfficer?.user
        ?.lastName
    );

  return {
    id: agreement.agreementId,

    referenceNumber:
      agreement.referenceNumber ||
      "—",

    landlord:
      getPersonName(
        agreement.landlord?.user?.firstName,
        agreement.landlord?.user?.lastName
      ),

    tenant:
      getPersonName(
        agreement.tenant?.user?.firstName,
        agreement.tenant?.user?.lastName
      ),

    property:
      agreement.unit?.unitNumber
        ? `Unit ${agreement.unit.unitNumber}`
        : "Rental Property",

    location:
      locationParts.join(", ") ||
      "—",

    monthlyRent: Number(
      agreement.rentalAmount ?? 0
    ),

    status:
      getDisplayStatus(
        agreement.status
      ),

    backendStatus:
      agreement.status,

    startDate:
      agreement.effectiveDate
        ? formatDate(
            agreement.effectiveDate
          )
        : undefined,

    endDate:
      agreement.terminationDate
        ? formatDate(
            agreement.terminationDate
          )
        : undefined,

    createdAt:
      agreement.createdAt,

    landlordPhone:
      agreement.landlord?.user?.phone ??
      undefined,

    tenantPhone:
      agreement.tenant?.user?.phone ??
      undefined,

    serviceFeeStatus:
      agreement.serviceFeePayment
        ?.status,

    serviceFeePaymentId:
      agreement.serviceFeePayment
        ?.serviceFeePaymentId,

    serviceFeeAmount:
      Number(
        agreement.serviceFeePayment
          ?.amount ??
          50
      ),

    durationValue:
      agreement.durationValue,

    durationUnit:
      agreement.durationUnit,

    verifications: {
      landlord:
        landlordVerification
          ? {
              status:
                landlordVerification.status,
              phoneNumber:
                landlordVerification.phoneNumber,
              verifiedAt:
                landlordVerification.verifiedAt,
            }
          : undefined,

      tenant:
        tenantVerification
          ? {
              status:
                tenantVerification.status,
              phoneNumber:
                tenantVerification.phoneNumber,
              verifiedAt:
                tenantVerification.verifiedAt,
            }
          : undefined,
    },

    createdByOfficerName:
      officerName !== "—"
        ? officerName
        : undefined,

    createdByOfficerEmployeeId:
      agreement.createdByOfficer
        ?.employeeId,
  };
};

/* =========================================================
   COMPONENT
========================================================= */

const RentalAgreements: React.FC =
  () => {
    const navigate =
      useNavigate();

    const location =
      useLocation();

    /* =====================================================
       CREATE
    ===================================================== */

    const [
      isCreateModalOpen,
      setIsCreateModalOpen,
    ] = useState(false);

    /* =====================================================
       SEARCH
    ===================================================== */

    const [
      searchQuery,
      setSearchQuery,
    ] = useState("");

    /* =====================================================
       MOBILE
    ===================================================== */

    const [
      isMobileMenuOpen,
      setIsMobileMenuOpen,
    ] = useState(false);

    /* =====================================================
       DATA
    ===================================================== */

    const [
      agreements,
      setAgreements,
    ] = useState<RentalAgreement[]>(
      []
    );

    /* =====================================================
       SELECTED AGREEMENT
    ===================================================== */

    const [
      selectedAgreement,
      setSelectedAgreement,
    ] =
      useState<RentalAgreement | null>(
        null
      );

    /* =====================================================
       LOADING
    ===================================================== */

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [
      refreshing,
      setRefreshing,
    ] = useState(false);

    const [
      error,
      setError,
    ] = useState("");

    /* =====================================================
       VERIFICATION MODAL
    ===================================================== */

    const [
      verificationModalOpen,
      setVerificationModalOpen,
    ] = useState(false);

    const [
      verificationAgreement,
      setVerificationAgreement,
    ] =
      useState<RentalAgreement | null>(
        null
      );

    const [
      verificationParty,
      setVerificationParty,
    ] = useState<
      "LANDLORD" | "TENANT"
    >("LANDLORD");

    const [
      verificationCode,
      setVerificationCode,
    ] = useState("");

    const [
      verificationLoading,
      setVerificationLoading,
    ] = useState(false);

    const [
      verificationError,
      setVerificationError,
    ] = useState("");

    const [
      verificationMessage,
      setVerificationMessage,
    ] = useState("");

    /* =====================================================
       PAYMENT MODAL
    ===================================================== */

    const [
      paymentModalOpen,
      setPaymentModalOpen,
    ] = useState(false);

    const [
      paymentAgreement,
      setPaymentAgreement,
    ] =
      useState<RentalAgreement | null>(
        null
      );

    const [
      paymentPin,
      setPaymentPin,
    ] = useState("");

    const [
      paymentLoading,
      setPaymentLoading,
    ] = useState(false);

    const [
      paymentError,
      setPaymentError,
    ] = useState("");

    const [
      paymentMessage,
      setPaymentMessage,
    ] = useState("");

    /* =====================================================
       APPROVAL MODAL
    ===================================================== */

    const [
      approvalModalOpen,
      setApprovalModalOpen,
    ] = useState(false);

    const [
      approvalAgreement,
      setApprovalAgreement,
    ] =
      useState<RentalAgreement | null>(
        null
      );

    const [
      approvalComments,
      setApprovalComments,
    ] = useState("");

    const [
      approvalAction,
      setApprovalAction,
    ] = useState<
      "APPROVE" | "REJECT"
    >("APPROVE");

    const [
      approvalLoading,
      setApprovalLoading,
    ] = useState(false);

    const [
      approvalError,
      setApprovalError,
    ] = useState("");

    /* =====================================================
       HISTORY MODAL
    ===================================================== */

    const [
      historyModalOpen,
      setHistoryModalOpen,
    ] = useState(false);

    const [
      historyAgreement,
      setHistoryAgreement,
    ] =
      useState<RentalAgreement | null>(
        null
      );

    const [
      approvalHistory,
      setApprovalHistory,
    ] = useState<
      ApprovalHistoryItem[]
    >([]);

    const [
      historyLoading,
      setHistoryLoading,
    ] = useState(false);

    const [
      historyError,
      setHistoryError,
    ] = useState("");

    /* =====================================================
       USER
    ===================================================== */

    const currentUser =
      useMemo(() => {
        try {
          const stored =
            localStorage.getItem(
              "user"
            );

          if (!stored) {
            return {
              firstName: "",
              lastName: "",
              username:
                "Officer",
            };
          }

          return JSON.parse(
            stored
          ) as {
            firstName?: string;
            lastName?: string;
            username?: string;
          };
        } catch {
          return {
            firstName: "",
            lastName: "",
            username:
              "Officer",
          };
        }
      }, []);

    const displayName =
      `${currentUser.firstName ?? ""} ${
        currentUser.lastName ?? ""
      }`.trim() ||
      currentUser.username ||
      "Officer";

    const initials =
      currentUser.firstName &&
      currentUser.lastName
        ? `${currentUser.firstName.charAt(
            0
          )}${currentUser.lastName.charAt(
            0
          )}`.toUpperCase()
        : displayName
            .slice(0, 2)
            .toUpperCase();

    /* =====================================================
       AUTH
    ===================================================== */

    const handleLogout =
      useCallback(() => {
        localStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "accessToken"
        );

        localStorage.removeItem(
          "user"
        );

        sessionStorage.removeItem(
          "token"
        );

        sessionStorage.removeItem(
          "accessToken"
        );

        navigate(
          "/login",
          {
            replace: true,
          }
        );
      }, [navigate]);

    /* =====================================================
       LOAD AGREEMENTS
    ===================================================== */

    const loadAgreements =
      useCallback(
        async (
          showLoader = true
        ) => {
          const token =
            getToken();

          if (!token) {
            handleLogout();
            return;
          }

          if (showLoader) {
            setLoading(true);
          }

          setRefreshing(true);
          setError("");

          try {
            const response =
              await fetch(
                `${API_URL}/dashboard/contracts`,
                {
                  method: "GET",
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                  cache:
                    "no-store",
                }
              );

            const result =
              (await response.json()) as ContractsResponse & {
                error?: string;
              };

            if (
              response.status ===
              401
            ) {
              handleLogout();
              return;
            }

            if (
              !response.ok ||
              !result.success
            ) {
              throw new Error(
                result.error ||
                  result.message ||
                  "Failed to load rental agreements."
              );
            }

            const mapped =
              (
                result.data ??
                []
              ).map(
                mapBackendAgreement
              );

            setAgreements(
              mapped
            );
          } catch (err) {
            console.error(
              "Failed to load agreements:",
              err
            );

            setError(
              err instanceof Error
                ? err.message
                : "Failed to load rental agreements."
            );
          } finally {
            setLoading(false);
            setRefreshing(false);
          }
        },
        [handleLogout]
      );

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
      void loadAgreements(true);
    }, [loadAgreements]);

    /* =====================================================
       OPEN CREATE FROM DASHBOARD
    ===================================================== */

    useEffect(() => {
      const state =
        location.state as
          | {
              openCreateAgreement?: boolean;
            }
          | null;

      if (
        state?.openCreateAgreement
      ) {
        setIsCreateModalOpen(
          true
        );

        navigate(
          location.pathname,
          {
            replace: true,
            state: {},
          }
        );
      }
    }, [
      location.state,
      location.pathname,
      navigate,
    ]);

    /* =====================================================
       CLOSE CREATE + REFRESH
    ===================================================== */

    const handleCreateClose =
      useCallback(() => {
        setIsCreateModalOpen(
          false
        );

        void loadAgreements(
          false
        );
      }, [loadAgreements]);

    /* =====================================================
       SEARCH
    ===================================================== */

    const filteredAgreements =
      useMemo(() => {
        const query =
          searchQuery
            .trim()
            .toLowerCase();

        if (!query) {
          return agreements;
        }

        return agreements.filter(
          (agreement) =>
            agreement.referenceNumber
              .toLowerCase()
              .includes(query) ||
            agreement.landlord
              .toLowerCase()
              .includes(query) ||
            agreement.tenant
              .toLowerCase()
              .includes(query) ||
            agreement.property
              .toLowerCase()
              .includes(query) ||
            agreement.location
              .toLowerCase()
              .includes(query) ||
            agreement.backendStatus
              .toLowerCase()
              .includes(query)
        );
      }, [
        agreements,
        searchQuery,
      ]);

    /* =====================================================
       STATUS ICON
    ===================================================== */

    const getStatusIcon = (
      status: AgreementStatus
    ) => {
      switch (status) {
        case "Active":
        case "Approved":
          return (
            <CheckCircle2
              size={14}
            />
          );

        case "Pending":
          return (
            <Clock3
              size={14}
            />
          );

        case "Rejected":
          return (
            <XCircle
              size={14}
            />
          );

        default:
          return (
            <FileText
              size={14}
            />
          );
      }
    };

    /* =====================================================
       OPEN VERIFICATION
    ===================================================== */

    const openVerificationModal =
      (
        agreement: RentalAgreement,
        party:
          | "LANDLORD"
          | "TENANT"
      ) => {
        setVerificationAgreement(
          agreement
        );

        setVerificationParty(
          party
        );

        setVerificationCode(
          ""
        );

        setVerificationError(
          ""
        );

        setVerificationMessage(
          ""
        );

        setVerificationModalOpen(
          true
        );
      };

    /* =====================================================
       VERIFY USSD
    ===================================================== */

    const handleVerifyConsent =
      async (
        event: React.FormEvent
      ) => {
        event.preventDefault();

        if (
          !verificationAgreement
        ) {
          return;
        }

        const phone =
          verificationParty ===
          "LANDLORD"
            ? verificationAgreement.landlordPhone
            : verificationAgreement.tenantPhone;

        if (!phone) {
          setVerificationError(
            `The ${verificationParty.toLowerCase()} phone number is not available.`
          );

          return;
        }

        const code =
          verificationCode
            .replace(
              /\D/g,
              ""
            )
            .slice(
              0,
              6
            );

        if (
          code.length !== 6
        ) {
          setVerificationError(
            "Please enter the 6-digit USSD verification code."
          );

          return;
        }

        const token =
          getToken();

        if (!token) {
          handleLogout();
          return;
        }

        setVerificationLoading(
          true
        );

        setVerificationError(
          ""
        );

        setVerificationMessage(
          ""
        );

        try {
          const response =
            await fetch(
              `${API_URL}/agreements/${verificationAgreement.id}/verify`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${token}`,
                },

                /*
                 * Your controller reads these
                 * values from req.body.
                 */
                body: JSON.stringify({
                  agreementId:
                    verificationAgreement.id,
                  phone,
                  code,
                }),
              }
            );

          const result =
            (await response.json()) as GenericResponse;

          if (
            response.status ===
            401
          ) {
            handleLogout();
            return;
          }

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.error ||
                result.message ||
                "USSD verification failed."
            );
          }

          const responseData =
            result.data;

          const backendMessage =
            responseData &&
            typeof responseData ===
              "object" &&
            "message" in
              responseData
              ? String(
                  (
                    responseData as {
                      message?: unknown;
                    }
                  ).message ??
                    ""
                )
              : result.message ||
                "";

          setVerificationMessage(
            backendMessage ||
              "USSD verification completed successfully."
          );

          setVerificationCode(
            ""
          );

          await loadAgreements(
            false
          );

          window.setTimeout(
            () => {
              setVerificationModalOpen(
                false
              );

              setVerificationAgreement(
                null
              );
            },
            900
          );
        } catch (err) {
          console.error(
            "USSD verification error:",
            err
          );

          setVerificationError(
            err instanceof Error
              ? err.message
              : "USSD verification failed."
          );
        } finally {
          setVerificationLoading(
            false
          );
        }
      };

    /* =====================================================
       OPEN PAYMENT
    ===================================================== */

    const openPaymentModal =
      (
        agreement: RentalAgreement
      ) => {
        setPaymentAgreement(
          agreement
        );

        setPaymentPin(
          ""
        );

        setPaymentError(
          ""
        );

        setPaymentMessage(
          ""
        );

        setPaymentModalOpen(
          true
        );
      };

    /* =====================================================
       PAY SERVICE FEE
    ===================================================== */

    const handlePayServiceFee =
      async (
        event: React.FormEvent
      ) => {
        event.preventDefault();

        if (
          !paymentAgreement
        ) {
          return;
        }

        const token =
          getToken();

        if (!token) {
          handleLogout();
          return;
        }

        const pin =
          paymentPin
            .replace(
              /\D/g,
              ""
            );

        if (!pin) {
          setPaymentError(
            "Please enter the payment PIN."
          );

          return;
        }

        if (
          !paymentAgreement
            .tenantPhone
        ) {
          setPaymentError(
            "The tenant phone number is not available."
          );

          return;
        }

        setPaymentLoading(
          true
        );

        setPaymentError(
          ""
        );

        setPaymentMessage(
          ""
        );

        try {
          const response =
            await fetch(
              `${API_URL}/agreements/${paymentAgreement.id}/pay-service-fee`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${token}`,
                },

                /*
                 * Your controller expects:
                 * agreementId, phone, pin
                 */
                body: JSON.stringify({
                  agreementId:
                    paymentAgreement.id,

                  phone:
                    paymentAgreement.tenantPhone,

                  pin,
                }),
              }
            );

          const result =
            (await response.json()) as GenericResponse;

          if (
            response.status ===
            401
          ) {
            handleLogout();
            return;
          }

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.error ||
                result.message ||
                "Service fee payment failed."
            );
          }

          const responseData =
            result.data;

          const backendMessage =
            responseData &&
            typeof responseData ===
              "object" &&
            "message" in
              responseData
              ? String(
                  (
                    responseData as {
                      message?: unknown;
                    }
                  ).message ??
                    ""
                )
              : result.message ||
                "";

          setPaymentMessage(
            backendMessage ||
              "50 ETB service fee paid successfully."
          );

          setPaymentPin(
            ""
          );

          await loadAgreements(
            false
          );

          window.setTimeout(
            () => {
              setPaymentModalOpen(
                false
              );

              setPaymentAgreement(
                null
              );
            },
            1100
          );
        } catch (err) {
          console.error(
            "Service fee payment error:",
            err
          );

          setPaymentError(
            err instanceof Error
              ? err.message
              : "Service fee payment failed."
          );
        } finally {
          setPaymentLoading(
            false
          );
        }
      };

    /* =====================================================
       OPEN APPROVAL / REJECTION
    ===================================================== */

    const openApprovalModal =
      (
        agreement: RentalAgreement,
        action:
          | "APPROVE"
          | "REJECT"
      ) => {
        setApprovalAgreement(
          agreement
        );

        setApprovalAction(
          action
        );

        setApprovalComments(
          ""
        );

        setApprovalError(
          ""
        );

        setApprovalModalOpen(
          true
        );
      };

    /* =====================================================
       APPROVE / REJECT
    ===================================================== */

    const handleApprovalAction =
      async (
        event: React.FormEvent
      ) => {
        event.preventDefault();

        if (
          !approvalAgreement
        ) {
          return;
        }

        const token =
          getToken();

        if (!token) {
          handleLogout();
          return;
        }

        const route =
          approvalAction ===
          "APPROVE"
            ? "approve"
            : "reject";

        setApprovalLoading(
          true
        );

        setApprovalError(
          ""
        );

        try {
          const response =
            await fetch(
              `${API_URL}/approval/${approvalAgreement.id}/${route}`,
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${token}`,
                },

                body: JSON.stringify({
                  comments:
                    approvalComments.trim() ||
                    null,
                }),
              }
            );

          const result =
            (await response.json()) as GenericResponse;

          if (
            response.status ===
            401
          ) {
            handleLogout();
            return;
          }

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.error ||
                result.message ||
                `Failed to ${
                  approvalAction ===
                  "APPROVE"
                    ? "approve"
                    : "reject"
                } agreement.`
            );
          }

          await loadAgreements(
            false
          );

          setApprovalModalOpen(
            false
          );

          setApprovalAgreement(
            null
          );

          setApprovalComments(
            ""
          );

          /*
           * Refresh selected agreement
           * by closing its view first.
           */
          setSelectedAgreement(
            null
          );
        } catch (err) {
          console.error(
            "Approval action error:",
            err
          );

          setApprovalError(
            err instanceof Error
              ? err.message
              : `Failed to ${
                  approvalAction ===
                  "APPROVE"
                    ? "approve"
                    : "reject"
                } agreement.`
          );
        } finally {
          setApprovalLoading(
            false
          );
        }
      };

    /* =====================================================
       LOAD APPROVAL HISTORY
    ===================================================== */

    const openHistoryModal =
      async (
        agreement: RentalAgreement
      ) => {
        setHistoryAgreement(
          agreement
        );

        setHistoryModalOpen(
          true
        );

        setHistoryLoading(
          true
        );

        setHistoryError("");

        setApprovalHistory([]);

        const token =
          getToken();

        if (!token) {
          handleLogout();
          return;
        }

        try {
          const response =
            await fetch(
              `${API_URL}/approval/${agreement.id}/history`,
              {
                method: "GET",
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as ApprovalHistoryResponse & {
              error?: string;
            };

          if (
            response.status ===
            401
          ) {
            handleLogout();
            return;
          }

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.error ||
                result.message ||
                "Failed to load approval history."
            );
          }

          setApprovalHistory(
            result.data ??
              []
          );
        } catch (err) {
          console.error(
            "Approval history error:",
            err
          );

          setHistoryError(
            err instanceof Error
              ? err.message
              : "Failed to load approval history."
          );
        } finally {
          setHistoryLoading(
            false
          );
        }
      };

    /* =====================================================
       CLOSE MODALS
    ===================================================== */

    const closeVerificationModal =
      () => {
        if (
          verificationLoading
        ) {
          return;
        }

        setVerificationModalOpen(
          false
        );

        setVerificationAgreement(
          null
        );
      };

    const closePaymentModal =
      () => {
        if (
          paymentLoading
        ) {
          return;
        }

        setPaymentModalOpen(
          false
        );

        setPaymentAgreement(
          null
        );
      };

    const closeApprovalModal =
      () => {
        if (
          approvalLoading
        ) {
          return;
        }

        setApprovalModalOpen(
          false
        );

        setApprovalAgreement(
          null
        );
      };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
      <div className="officer-layout">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside
          className={`officer-sidebar ${
            isMobileMenuOpen
              ? "officer-sidebar-open"
              : ""
          }`}
        >

          <div className="officer-sidebar-brand">

            <img
              src="/smartrent-logo.png"
              alt="SmartRent ET"
              className="officer-brand-logo"
            />

            <div>
              <h2>
                SmartRent ET
              </h2>

              <span>
                RENTAL MONITORING
              </span>
            </div>

          </div>

          <nav className="officer-sidebar-navigation">

            <button
              type="button"
              className="officer-nav-item"
              onClick={() =>
                navigate(
                  "/officer/dashboard"
                )
              }
            >
              <Building2
                size={
                  19
                }
              />

              <span>
                Dashboard
              </span>
            </button>

            <button
              type="button"
              className="officer-nav-item officer-nav-item-active"
              onClick={() =>
                navigate(
                  "/officer/rental-agreements"
                )
              }
            >
              <FileText
                size={
                  19
                }
              />

              <span>
                Rental Agreements
              </span>
            </button>

          </nav>

          <div className="officer-sidebar-bottom">

            <div className="officer-profile-card">

              <div className="officer-avatar">
                <User
                  size={
                    18
                  }
                />
              </div>

              <div className="officer-profile-details">

                <strong>
                  {displayName}
                </strong>

                <span>
                  Rental Monitoring Officer
                </span>

              </div>

            </div>

            <button
              type="button"
              className="officer-logout-button"
              onClick={
                handleLogout
              }
            >
              <LogOut
                size={
                  18
                }
              />

              <span>
                Logout
              </span>
            </button>

          </div>

        </aside>

        {/* =================================================
            MOBILE OVERLAY
        ================================================= */}

        {isMobileMenuOpen && (
          <div
            className="officer-mobile-overlay"
            onClick={() =>
              setIsMobileMenuOpen(
                false
              )
            }
          />
        )}

        {/* =================================================
            MAIN
        ================================================= */}

        <div className="officer-main">

          {/* TOP BAR */}

          <header className="officer-topbar">

            <div className="officer-topbar-left">

              <button
                type="button"
                className="officer-mobile-menu-button"
                onClick={() =>
                  setIsMobileMenuOpen(
                    true
                  )
                }
                aria-label="Open menu"
              >
                <Menu
                  size={
                    21
                  }
                />
              </button>

              <div className="officer-search">

                <Search
                  size={
                    18
                  }
                />

                <input
                  type="search"
                  placeholder="Search agreements..."
                  value={
                    searchQuery
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchQuery(
                      event.target.value
                    )
                  }
                />

              </div>

            </div>

            <div className="officer-account">

              <div className="officer-account-avatar">
                {initials}
              </div>

              <div>

                <strong>
                  {displayName}
                </strong>

                <span>
                  Rental Officer
                </span>

              </div>

            </div>

          </header>

          {/* CONTENT */}

          <main className="officer-page-content">

            {/* PAGE HEADER */}

            <div className="agreements-page-header">

              <div className="agreements-page-title">

                <button
                  type="button"
                  className="agreements-back-button"
                  onClick={() =>
                    navigate(
                      "/officer/dashboard"
                    )
                  }
                  aria-label="Back to dashboard"
                >
                  <ArrowLeft
                    size={
                      18
                    }
                  />
                </button>

                <div>

                  <span className="officer-eyebrow">
                    RENTAL MANAGEMENT
                  </span>

                  <h1>
                    Rental Agreements
                  </h1>

                  <p>
                    View, verify, process,
                    approve, and manage rental
                    agreements registered in
                    SmartRent ET.
                  </p>

                </div>

              </div>

              <div className="agreements-header-actions">

                <button
                  type="button"
                  className="agreement-secondary-button"
                  onClick={() =>
                    void loadAgreements(
                      true
                    )
                  }
                  disabled={
                    refreshing
                  }
                >
                  <RefreshCw
                    size={
                      16
                    }
                    className={
                      refreshing
                        ? "refresh-spinning"
                        : ""
                    }
                  />

                  Refresh
                </button>

                <button
                  type="button"
                  className="agreement-primary-button agreements-create-button"
                  onClick={() =>
                    setIsCreateModalOpen(
                      true
                    )
                  }
                >
                  <FileText
                    size={
                      17
                    }
                  />

                  Create Agreement
                </button>

              </div>

            </div>

            {/* ERROR */}

            {error && (
              <div
                className="alert alert-error"
                role="alert"
              >
                {error}

                <button
                  type="button"
                  onClick={() =>
                    void loadAgreements(
                      true
                    )
                  }
                  style={{
                    marginLeft:
                      "12px",
                  }}
                >
                  Try again
                </button>
              </div>
            )}

            {/* TABLE */}

            <section className="agreements-table-card">

              <div className="agreements-table-header">

                <div>

                  <h2>
                    All Rental Agreements
                  </h2>

                  <p>
                    Review agreement details
                    and continue the verification,
                    payment, and approval workflow.
                  </p>

                </div>

                <div className="agreements-count">

                  {loading
                    ? "Loading..."
                    : `${filteredAgreements.length} ${
                        filteredAgreements.length ===
                        1
                          ? "Agreement"
                          : "Agreements"
                      }`}

                </div>

              </div>

              <div className="agreements-table-wrapper">

                <table className="agreements-table">

                  <thead>

                    <tr>

                      <th>
                        Reference
                      </th>

                      <th>
                        Landlord
                      </th>

                      <th>
                        Tenant
                      </th>

                      <th>
                        Property
                      </th>

                      <th>
                        Location
                      </th>

                      <th>
                        Rent
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {loading ? (

                      <tr>

                        <td
                          colSpan={
                            8
                          }
                          className="agreements-empty-cell"
                        >

                          <div className="agreements-empty-state">

                            <div className="agreements-empty-icon">

                              <RefreshCw
                                size={
                                  27
                                }
                                className="refresh-spinning"
                              />

                            </div>

                            <h3>
                              Loading rental agreements
                            </h3>

                            <p>
                              Retrieving the latest
                              agreement records.
                            </p>

                          </div>

                        </td>

                      </tr>

                    ) : filteredAgreements.length >
                      0 ? (

                      filteredAgreements.map(
                        (
                          agreement
                        ) => (

                          <tr
                            key={
                              agreement.id
                            }
                          >

                            {/* REFERENCE */}

                            <td>

                              <span className="agreement-reference">
                                {
                                  agreement.referenceNumber
                                }
                              </span>

                              {agreement.createdAt && (
                                <small
                                  style={{
                                    display:
                                      "block",
                                    marginTop:
                                      "5px",
                                    color:
                                      "#7b8a91",
                                  }}
                                >
                                  Created{" "}
                                  {formatDate(
                                    agreement.createdAt
                                  )}
                                </small>
                              )}

                            </td>

                            {/* LANDLORD */}

                            <td>
                              {
                                agreement.landlord
                              }

                              {agreement.landlordPhone && (
                                <small
                                  style={{
                                    display:
                                      "block",
                                    marginTop:
                                      "4px",
                                    color:
                                      "#7b8a91",
                                  }}
                                >
                                  {
                                    agreement.landlordPhone
                                  }
                                </small>
                              )}
                            </td>

                            {/* TENANT */}

                            <td>
                              {
                                agreement.tenant
                              }

                              {agreement.tenantPhone && (
                                <small
                                  style={{
                                    display:
                                      "block",
                                    marginTop:
                                      "4px",
                                    color:
                                      "#7b8a91",
                                  }}
                                >
                                  {
                                    agreement.tenantPhone
                                  }
                                </small>
                              )}
                            </td>

                            {/* PROPERTY */}

                            <td>
                              {
                                agreement.property
                              }
                            </td>

                            {/* LOCATION */}

                            <td>
                              {
                                agreement.location
                              }
                            </td>

                            {/* RENT */}

                            <td>

                              <span className="agreement-rent">
                                {formatMoney(
                                  agreement.monthlyRent
                                )}{" "}
                                ETB
                              </span>

                            </td>

                            {/* STATUS */}

                            <td>

                              <span
                                className={`agreement-status-badge ${getStatusClass(
                                  agreement.status
                                )}`}
                              >
                                {getStatusIcon(
                                  agreement.status
                                )}

                                {
                                  agreement.status
                                }
                              </span>

                              <small
                                style={{
                                  display:
                                    "block",
                                  marginTop:
                                    "5px",
                                  color:
                                    "#7b8a91",
                                  fontSize:
                                    "11px",
                                  maxWidth:
                                    "190px",
                                }}
                              >
                                {
                                  agreement.backendStatus
                                }
                              </small>

                            </td>

                            {/* ACTIONS */}

                            <td>

                              <div
                                style={{
                                  display:
                                    "flex",
                                  flexDirection:
                                    "column",
                                  gap:
                                    "7px",
                                }}
                              >

                                <button
                                  type="button"
                                  className="agreement-view-button"
                                  onClick={() =>
                                    setSelectedAgreement(
                                      agreement
                                    )
                                  }
                                >
                                  <Eye
                                    size={
                                      16
                                    }
                                  />

                                  View
                                </button>

                                {agreement.backendStatus ===
                                  "PENDING_VERIFICATION" && (

                                  <button
                                    type="button"
                                    className="agreement-secondary-button"
                                    style={{
                                      height:
                                        "36px",
                                      padding:
                                        "0 10px",
                                    }}
                                    onClick={() =>
                                      openVerificationModal(
                                        agreement,
                                        "LANDLORD"
                                      )
                                    }
                                  >
                                    <ShieldCheck
                                      size={
                                        15
                                      }
                                    />

                                    USSD Verify
                                  </button>

                                )}

                                {agreement.backendStatus ===
                                  "PENDING_SERVICE_FEE" && (

                                  <button
                                    type="button"
                                    className="agreement-primary-button"
                                    style={{
                                      height:
                                        "36px",
                                      padding:
                                        "0 10px",
                                    }}
                                    onClick={() =>
                                      openPaymentModal(
                                        agreement
                                      )
                                    }
                                  >
                                    <CreditCard
                                      size={
                                        15
                                      }
                                    />

                                    50 ETB Fee
                                  </button>

                                )}

                                {(agreement.backendStatus ===
                                  "APPROVED" ||
                                  agreement.backendStatus ===
                                    "ACTIVE") && (

                                  <button
                                    type="button"
                                    className="agreement-secondary-button"
                                    style={{
                                      height:
                                        "36px",
                                      padding:
                                        "0 10px",
                                    }}
                                    onClick={() =>
                                      void openHistoryModal(
                                        agreement
                                      )
                                    }
                                  >
                                    <History
                                      size={
                                        15
                                      }
                                    />

                                    History
                                  </button>

                                )}

                              </div>

                            </td>

                          </tr>

                        )
                      )

                    ) : (

                      <tr>

                        <td
                          colSpan={
                            8
                          }
                          className="agreements-empty-cell"
                        >

                          <div className="agreements-empty-state">

                            <div className="agreements-empty-icon">

                              <FileText
                                size={
                                  27
                                }
                              />

                            </div>

                            <h3>

                              {searchQuery
                                ? "No agreements found"
                                : "No rental agreements yet"}

                            </h3>

                            <p>

                              {searchQuery
                                ? `No agreement matches "${searchQuery}".`
                                : "Create your first rental agreement to start managing rental records."}

                            </p>

                            {!searchQuery && (

                              <button
                                type="button"
                                className="agreement-primary-button"
                                onClick={() =>
                                  setIsCreateModalOpen(
                                    true
                                  )
                                }
                              >
                                <FileText
                                  size={
                                    17
                                  }
                                />

                                Create Agreement
                              </button>

                            )}

                          </div>

                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>

            </section>

          </main>

        </div>

        {/* =================================================
            CREATE AGREEMENT
        ================================================= */}

        {isCreateModalOpen && (
          <CreateAgreement
            onClose={
              handleCreateClose
            }
          />
        )}

        {/* =================================================
            VIEW AGREEMENT
        ================================================= */}

        {selectedAgreement && (

          <div
            className="agreement-modal-overlay"
            role="dialog"
            aria-modal="true"
          >

            <div className="agreement-view-modal">

              <div className="agreement-modal-header">

                <div>

                  <span className="agreement-modal-eyebrow">
                    AGREEMENT DETAILS
                  </span>

                  <h2>
                    Rental Agreement
                  </h2>

                  <p>
                    {
                      selectedAgreement.referenceNumber
                    }
                  </p>

                </div>

                <button
                  type="button"
                  className="modal-close-button"
                  onClick={() =>
                    setSelectedAgreement(
                      null
                    )
                  }
                  aria-label="Close"
                >
                  <X
                    size={
                      21
                    }
                  />
                </button>

              </div>

              <div className="agreement-view-body">

                {/* STATUS */}

                <div className="agreement-view-status-row">

                  <span>
                    Agreement Status
                  </span>

                  <span
                    className={`agreement-status-badge ${getStatusClass(
                      selectedAgreement.status
                    )}`}
                  >
                    {getStatusIcon(
                      selectedAgreement.status
                    )}

                    {
                      selectedAgreement.status
                    }
                  </span>

                </div>

                {/* WORKFLOW */}

                <div
                  style={{
                    marginBottom:
                      "20px",
                    padding:
                      "15px 16px",
                    background:
                      "#f8fcfb",
                    border:
                      "1px solid #dceae6",
                    borderRadius:
                      "10px",
                  }}
                >

                  <span
                    style={{
                      display:
                        "block",
                      fontSize:
                        "11px",
                      fontWeight:
                        700,
                      color:
                        "#788991",
                      letterSpacing:
                        "0.06em",
                    }}
                  >
                    WORKFLOW
                  </span>

                  <strong
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                      color:
                        "#25343a",
                    }}
                  >
                    {selectedAgreement.backendStatus ===
                    "PENDING_VERIFICATION"
                      ? "Waiting for landlord and tenant USSD consent."
                      : selectedAgreement.backendStatus ===
                          "PENDING_SERVICE_FEE"
                        ? "USSD consent completed. Service fee is required."
                        : selectedAgreement.backendStatus ===
                            "APPROVED"
                          ? "Agreement approved and awaiting activation workflow."
                          : selectedAgreement.backendStatus ===
                              "ACTIVE"
                            ? "Agreement is active."
                            : selectedAgreement.backendStatus ===
                                "REJECTED"
                              ? "Agreement was rejected."
                              : "Agreement workflow in progress."}
                  </strong>

                </div>

                {/* DETAILS */}

                <div className="agreement-detail-grid">

                  <div>

                    <span>
                      Reference Number
                    </span>

                    <strong>
                      {
                        selectedAgreement.referenceNumber
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      Monthly Rent
                    </span>

                    <strong>
                      {formatMoney(
                        selectedAgreement.monthlyRent
                      )}{" "}
                      ETB
                    </strong>

                  </div>

                  <div>

                    <span>
                      Landlord
                    </span>

                    <strong>
                      {
                        selectedAgreement.landlord
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      Landlord Phone
                    </span>

                    <strong>
                      {
                        selectedAgreement.landlordPhone ||
                        "—"
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      Tenant
                    </span>

                    <strong>
                      {
                        selectedAgreement.tenant
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      Tenant Phone
                    </span>

                    <strong>
                      {
                        selectedAgreement.tenantPhone ||
                        "—"
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      Property
                    </span>

                    <strong>
                      {
                        selectedAgreement.property
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      Location
                    </span>

                    <strong>
                      {
                        selectedAgreement.location
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      Duration
                    </span>

                    <strong>
                      {selectedAgreement.durationValue
                        ? `${selectedAgreement.durationValue} ${
                            selectedAgreement.durationUnit ||
                            ""
                          }`
                        : "—"}
                    </strong>

                  </div>

                  <div>

                    <span>
                      Start Date
                    </span>

                    <strong>
                      {
                        selectedAgreement.startDate ||
                        "—"
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      End Date
                    </span>

                    <strong>
                      {
                        selectedAgreement.endDate ||
                        "—"
                      }
                    </strong>

                  </div>

                  <div>

                    <span>
                      Created
                    </span>

                    <strong>
                      {formatDateTime(
                        selectedAgreement.createdAt
                      )}
                    </strong>

                  </div>

                  {selectedAgreement.createdByOfficerName && (

                    <div>

                      <span>
                        Processed By
                      </span>

                      <strong>
                        {
                          selectedAgreement.createdByOfficerName
                        }
                      </strong>

                    </div>

                  )}

                  {selectedAgreement.createdByOfficerEmployeeId && (

                    <div>

                      <span>
                        Employee ID
                      </span>

                      <strong>
                        {
                          selectedAgreement.createdByOfficerEmployeeId
                        }
                      </strong>

                    </div>

                  )}

                </div>

                {/* USSD STATUS */}

                <div
                  style={{
                    marginTop:
                      "20px",
                    padding:
                      "16px",
                    border:
                      "1px solid #e4ebe8",
                    borderRadius:
                      "10px",
                  }}
                >

                  <span
                    style={{
                      display:
                        "block",
                      fontSize:
                        "11px",
                      fontWeight:
                        700,
                      color:
                        "#788991",
                      letterSpacing:
                        "0.06em",
                    }}
                  >
                    USSD CONSENT
                  </span>

                  <div
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap:
                        "12px",
                      marginTop:
                        "12px",
                    }}
                  >

                    {/* LANDLORD */}

                    <div
                      style={{
                        padding:
                          "12px",
                        border:
                          "1px solid #edf1ef",
                        borderRadius:
                          "8px",
                      }}
                    >

                      <strong>
                        Landlord
                      </strong>

                      <span
                        style={{
                          display:
                            "block",
                          marginTop:
                            "5px",
                          fontSize:
                            "12px",
                          color:
                            "#788991",
                        }}
                      >
                        {
                          selectedAgreement
                            .verifications
                            ?.landlord
                            ?.status ||
                          "Not available"
                        }
                      </span>

                      {selectedAgreement.backendStatus ===
                        "PENDING_VERIFICATION" && (

                        <button
                          type="button"
                          className="agreement-secondary-button"
                          style={{
                            marginTop:
                              "10px",
                            height:
                              "34px",
                            padding:
                              "0 10px",
                          }}
                          onClick={() => {
                            setSelectedAgreement(
                              null
                            );

                            openVerificationModal(
                              selectedAgreement,
                              "LANDLORD"
                            );
                          }}
                        >
                          <ShieldCheck
                            size={
                              14
                            }
                          />

                          Verify
                        </button>

                      )}

                    </div>

                    {/* TENANT */}

                    <div
                      style={{
                        padding:
                          "12px",
                        border:
                          "1px solid #edf1ef",
                        borderRadius:
                          "8px",
                      }}
                    >

                      <strong>
                        Tenant
                      </strong>

                      <span
                        style={{
                          display:
                            "block",
                          marginTop:
                            "5px",
                          fontSize:
                            "12px",
                          color:
                            "#788991",
                        }}
                      >
                        {
                          selectedAgreement
                            .verifications
                            ?.tenant
                            ?.status ||
                          "Not available"
                        }
                      </span>

                      {selectedAgreement.backendStatus ===
                        "PENDING_VERIFICATION" && (

                        <button
                          type="button"
                          className="agreement-secondary-button"
                          style={{
                            marginTop:
                              "10px",
                            height:
                              "34px",
                            padding:
                              "0 10px",
                          }}
                          onClick={() => {
                            setSelectedAgreement(
                              null
                            );

                            openVerificationModal(
                              selectedAgreement,
                              "TENANT"
                            );
                          }}
                        >
                          <ShieldCheck
                            size={
                              14
                            }
                          />

                          Verify
                        </button>

                      )}

                    </div>

                  </div>

                </div>

                {/* SERVICE FEE */}

                <div
                  style={{
                    marginTop:
                      "20px",
                    padding:
                      "16px",
                    border:
                      "1px solid #e4ebe8",
                    borderRadius:
                      "10px",
                    background:
                      "#fbfdfc",
                  }}
                >

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap:
                        "12px",
                    }}
                  >

                    <div>

                      <span
                        style={{
                          display:
                            "block",
                          fontSize:
                            "11px",
                          fontWeight:
                            700,
                          color:
                            "#788991",
                        }}
                      >
                        SERVICE FEE
                      </span>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop:
                            "5px",
                          fontSize:
                            "18px",
                          color:
                            "#008f78",
                        }}
                      >
                        {formatMoney(
                          selectedAgreement.serviceFeeAmount ??
                            50
                        )}{" "}
                        ETB
                      </strong>

                    </div>

                    <span
                      className={`agreement-status-badge ${
                        selectedAgreement.serviceFeeStatus ===
                        "PAID"
                          ? "agreement-status-approved"
                          : "agreement-status-pending"
                      }`}
                    >
                      {
                        selectedAgreement.serviceFeeStatus ||
                        "N/A"
                      }
                    </span>

                  </div>

                  {selectedAgreement.backendStatus ===
                    "PENDING_SERVICE_FEE" && (

                    <button
                      type="button"
                      className="agreement-primary-button"
                      style={{
                        marginTop:
                          "14px",
                      }}
                      onClick={() => {
                        setSelectedAgreement(
                          null
                        );

                        openPaymentModal(
                          selectedAgreement
                        );
                      }}
                    >
                      <CreditCard
                        size={
                          16
                        }
                      />

                      Process 50 ETB Service Fee
                    </button>

                  )}

                </div>

              </div>

              <div className="agreement-modal-footer">

                <div
                  style={{
                    display:
                      "flex",
                    gap:
                      "8px",
                    flexWrap:
                      "wrap",
                  }}
                >

                  {(selectedAgreement.backendStatus ===
                    "APPROVED" ||
                    selectedAgreement.backendStatus ===
                      "ACTIVE") && (

                    <button
                      type="button"
                      className="agreement-secondary-button"
                      onClick={() =>
                        void openHistoryModal(
                          selectedAgreement
                        )
                      }
                    >
                      <History
                        size={
                          15
                        }
                      />

                      Approval History
                    </button>

                  )}

                  {selectedAgreement.backendStatus ===
                    "APPROVED" && (

                    <button
                      type="button"
                      className="agreement-primary-button"
                      onClick={() =>
                        openApprovalModal(
                          selectedAgreement,
                          "APPROVE"
                        )
                      }
                    >
                      <CheckCircle2
                        size={
                          15
                        }
                      />

                      Approve
                    </button>

                  )}

                  {selectedAgreement.backendStatus !==
                    "REJECTED" &&
                    selectedAgreement.backendStatus !==
                      "ACTIVE" && (

                    <button
                      type="button"
                      className="agreement-secondary-button"
                      onClick={() =>
                        openApprovalModal(
                          selectedAgreement,
                          "REJECT"
                        )
                      }
                    >
                      <XCircle
                        size={
                          15
                        }
                      />

                      Reject
                    </button>

                  )}

                </div>

                <button
                  type="button"
                  className="agreement-secondary-button"
                  onClick={() =>
                    setSelectedAgreement(
                      null
                    )
                  }
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}

        {/* =================================================
            USSD VERIFICATION MODAL
        ================================================= */}

        {verificationModalOpen &&
          verificationAgreement && (

          <div
            className="agreement-modal-overlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeVerificationModal();
              }
            }}
          >

            <div className="agreement-view-modal">

              <div className="agreement-modal-header">

                <div>

                  <span className="agreement-modal-eyebrow">
                    USSD CONSENT
                  </span>

                  <h2>
                    Verify{" "}
                    {
                      verificationParty ===
                      "LANDLORD"
                        ? "Landlord"
                        : "Tenant"
                    }
                  </h2>

                  <p>
                    {
                      verificationAgreement.referenceNumber
                    }
                  </p>

                </div>

                <button
                  type="button"
                  className="modal-close-button"
                  onClick={
                    closeVerificationModal
                  }
                  disabled={
                    verificationLoading
                  }
                >
                  <X
                    size={
                      21
                    }
                  />
                </button>

              </div>

              <div className="agreement-view-body">

                <div
                  style={{
                    padding:
                      "16px",
                    border:
                      "1px solid #dceae6",
                    borderRadius:
                      "10px",
                    background:
                      "#f8fcfb",
                    marginBottom:
                      "18px",
                  }}
                >

                  <span
                    style={{
                      display:
                        "block",
                      fontSize:
                        "11px",
                      fontWeight:
                        700,
                      color:
                        "#788991",
                    }}
                  >
                    REGISTERED PHONE
                  </span>

                  <strong
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                      color:
                        "#25343a",
                    }}
                  >
                    {verificationParty ===
                    "LANDLORD"
                      ? verificationAgreement.landlordPhone ||
                        "Not available"
                      : verificationAgreement.tenantPhone ||
                        "Not available"}
                  </strong>

                  <p
                    style={{
                      margin:
                        "8px 0 0",
                      color:
                        "#53636c",
                      fontSize:
                        "13px",
                      lineHeight:
                        1.6,
                    }}
                  >
                    Enter the 6-digit USSD
                    consent code provided to the{" "}
                    {verificationParty.toLowerCase()}.
                  </p>

                </div>

                <form
                  onSubmit={
                    handleVerifyConsent
                  }
                >

                  <div className="form-group">

                    <label htmlFor="ussd-code">
                      Verification Code
                    </label>

                    <input
                      id="ussd-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={
                        6
                      }
                      autoFocus
                      value={
                        verificationCode
                      }
                      onChange={(
                        event
                      ) =>
                        setVerificationCode(
                          event.target.value
                            .replace(
                              /\D/g,
                              ""
                            )
                            .slice(
                              0,
                              6
                            )
                        )
                      }
                      placeholder="Enter 6-digit code"
                      disabled={
                        verificationLoading
                      }
                    />

                  </div>

                  {verificationError && (

                    <div
                      className="alert alert-error"
                      role="alert"
                    >
                      {
                        verificationError
                      }
                    </div>

                  )}

                  {verificationMessage && (

                    <div
                      className="alert alert-success"
                      role="status"
                    >
                      {
                        verificationMessage
                      }
                    </div>

                  )}

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap:
                        "10px",
                      marginTop:
                        "20px",
                    }}
                  >

                    <button
                      type="button"
                      className="agreement-secondary-button"
                      onClick={
                        closeVerificationModal
                      }
                      disabled={
                        verificationLoading
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="agreement-primary-button"
                      disabled={
                        verificationLoading ||
                        verificationCode.length !==
                          6
                      }
                    >
                      <ShieldCheck
                        size={
                          16
                        }
                      />

                      {verificationLoading
                        ? "Verifying..."
                        : "Verify Consent"}
                    </button>

                  </div>

                </form>

              </div>

            </div>

          </div>

        )}

        {/* =================================================
            SERVICE FEE MODAL
        ================================================= */}

        {paymentModalOpen &&
          paymentAgreement && (

          <div
            className="agreement-modal-overlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closePaymentModal();
              }
            }}
          >

            <div className="agreement-view-modal">

              <div className="agreement-modal-header">

                <div>

                  <span className="agreement-modal-eyebrow">
                    SERVICE FEE
                  </span>

                  <h2>
                    Process Payment
                  </h2>

                  <p>
                    {
                      paymentAgreement.referenceNumber
                    }
                  </p>

                </div>

                <button
                  type="button"
                  className="modal-close-button"
                  onClick={
                    closePaymentModal
                  }
                  disabled={
                    paymentLoading
                  }
                >
                  <X
                    size={
                      21
                    }
                  />
                </button>

              </div>

              <div className="agreement-view-body">

                <div
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "20px",
                    border:
                      "1px solid #dceae6",
                    borderRadius:
                      "12px",
                    background:
                      "#f8fcfb",
                    marginBottom:
                      "20px",
                  }}
                >

                  <span
                    style={{
                      display:
                        "block",
                      fontSize:
                        "11px",
                      fontWeight:
                        700,
                      color:
                        "#788991",
                    }}
                  >
                    GOVERNMENT SERVICE FEE
                  </span>

                  <strong
                    style={{
                      display:
                        "block",
                      marginTop:
                        "6px",
                      fontSize:
                        "32px",
                      color:
                        "#008f78",
                    }}
                  >
                    {formatMoney(
                      paymentAgreement.serviceFeeAmount ??
                        50
                    )}{" "}
                    ETB
                  </strong>

                  <p
                    style={{
                      margin:
                        "8px 0 0",
                      color:
                        "#53636c",
                      fontSize:
                        "13px",
                    }}
                  >
                    Enter the payment PIN for the
                    service-fee transaction.
                  </p>

                </div>

                <div
                  style={{
                    marginBottom:
                      "18px",
                    padding:
                      "14px 16px",
                    border:
                      "1px solid #e7ecea",
                    borderRadius:
                      "9px",
                  }}
                >

                  <span
                    style={{
                      display:
                        "block",
                      fontSize:
                        "11px",
                      fontWeight:
                        700,
                      color:
                        "#788991",
                    }}
                  >
                    TENANT
                  </span>

                  <strong
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                    }}
                  >
                    {
                      paymentAgreement.tenant
                    }
                  </strong>

                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        "4px",
                      color:
                        "#788991",
                    }}
                  >
                    {
                      paymentAgreement.tenantPhone ||
                      "Phone not available"
                    }
                  </small>

                </div>

                <form
                  onSubmit={
                    handlePayServiceFee
                  }
                >

                  <div className="form-group">

                    <label htmlFor="payment-pin">
                      Payment PIN
                    </label>

                    <input
                      id="payment-pin"
                      type="password"
                      inputMode="numeric"
                      value={
                        paymentPin
                      }
                      onChange={(
                        event
                      ) =>
                        setPaymentPin(
                          event.target.value
                            .replace(
                              /\D/g,
                              ""
                            )
                            .slice(
                              0,
                              10
                            )
                        )
                      }
                      placeholder="Enter payment PIN"
                      autoFocus
                      disabled={
                        paymentLoading
                      }
                    />

                    <small
                      style={{
                        display:
                          "block",
                        marginTop:
                          "6px",
                        color:
                          "#788991",
                      }}
                    >
                      For your current development
                      backend, the configured test
                      PIN is 1234.
                    </small>

                  </div>

                  {paymentError && (

                    <div
                      className="alert alert-error"
                      role="alert"
                    >
                      {
                        paymentError
                      }
                    </div>

                  )}

                  {paymentMessage && (

                    <div
                      className="alert alert-success"
                      role="status"
                    >
                      {
                        paymentMessage
                      }
                    </div>

                  )}

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap:
                        "10px",
                      marginTop:
                        "20px",
                    }}
                  >

                    <button
                      type="button"
                      className="agreement-secondary-button"
                      onClick={
                        closePaymentModal
                      }
                      disabled={
                        paymentLoading
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="agreement-primary-button"
                      disabled={
                        paymentLoading ||
                        !paymentPin
                      }
                    >
                      <CreditCard
                        size={
                          16
                        }
                      />

                      {paymentLoading
                        ? "Processing..."
                        : "Pay 50 ETB"}
                    </button>

                  </div>

                </form>

              </div>

            </div>

          </div>

        )}

        {/* =================================================
            APPROVAL / REJECTION MODAL
        ================================================= */}

        {approvalModalOpen &&
          approvalAgreement && (

          <div
            className="agreement-modal-overlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeApprovalModal();
              }
            }}
          >

            <div className="agreement-view-modal">

              <div className="agreement-modal-header">

                <div>

                  <span className="agreement-modal-eyebrow">
                    AGREEMENT DECISION
                  </span>

                  <h2>
                    {approvalAction ===
                    "APPROVE"
                      ? "Approve Agreement"
                      : "Reject Agreement"}
                  </h2>

                  <p>
                    {
                      approvalAgreement.referenceNumber
                    }
                  </p>

                </div>

                <button
                  type="button"
                  className="modal-close-button"
                  onClick={
                    closeApprovalModal
                  }
                  disabled={
                    approvalLoading
                  }
                >
                  <X
                    size={
                      21
                    }
                  />
                </button>

              </div>

              <div className="agreement-view-body">

                <div
                  style={{
                    padding:
                      "15px 16px",
                    border:
                      "1px solid #e7ecea",
                    borderRadius:
                      "10px",
                    background:
                      "#fafcfb",
                    marginBottom:
                      "18px",
                  }}
                >

                  <strong>
                    {
                      approvalAgreement.referenceNumber
                    }
                  </strong>

                  <p
                    style={{
                      margin:
                        "7px 0 0",
                      color:
                        "#53636c",
                      fontSize:
                        "13px",
                      lineHeight:
                        1.6,
                    }}
                  >
                    {approvalAction ===
                    "APPROVE"
                      ? "Confirm that you want to approve this rental agreement."
                      : "Confirm that you want to reject this rental agreement."}
                  </p>

                </div>

                <form
                  onSubmit={
                    handleApprovalAction
                  }
                >

                  <div className="form-group">

                    <label htmlFor="approval-comments">
                      Comments
                      {approvalAction ===
                      "REJECT"
                        ? " *"
                        : ""}
                    </label>

                    <textarea
                      id="approval-comments"
                      rows={
                        5
                      }
                      value={
                        approvalComments
                      }
                      onChange={(
                        event
                      ) =>
                        setApprovalComments(
                          event.target.value
                        )
                      }
                      placeholder={
                        approvalAction ===
                        "REJECT"
                          ? "Enter the reason for rejection..."
                          : "Add approval comments (optional)..."
                      }
                      disabled={
                        approvalLoading
                      }
                    />

                  </div>

                  {approvalAction ===
                    "REJECT" &&
                    !approvalComments.trim() && (

                    <p
                      style={{
                        margin:
                          "-8px 0 15px",
                        fontSize:
                          "12px",
                        color:
                          "#b45309",
                      }}
                    >
                      A rejection reason is
                      recommended.
                    </p>

                  )}

                  {approvalError && (

                    <div
                      className="alert alert-error"
                      role="alert"
                    >
                      {
                        approvalError
                      }
                    </div>

                  )}

                  <div
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      gap:
                        "10px",
                      marginTop:
                        "20px",
                    }}
                  >

                    <button
                      type="button"
                      className="agreement-secondary-button"
                      onClick={
                        closeApprovalModal
                      }
                      disabled={
                        approvalLoading
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className={
                        approvalAction ===
                        "APPROVE"
                          ? "agreement-primary-button"
                          : "agreement-secondary-button"
                      }
                      disabled={
                        approvalLoading
                      }
                    >

                      {approvalAction ===
                      "APPROVE" ? (
                        <CheckCircle2
                          size={
                            16
                          }
                        />
                      ) : (
                        <XCircle
                          size={
                            16
                          }
                        />
                      )}

                      {approvalLoading
                        ? "Processing..."
                        : approvalAction ===
                            "APPROVE"
                          ? "Approve Agreement"
                          : "Reject Agreement"}

                    </button>

                  </div>

                </form>

              </div>

            </div>

          </div>

        )}

        {/* =================================================
            APPROVAL HISTORY MODAL
        ================================================= */}

        {historyModalOpen &&
          historyAgreement && (

          <div
            className="agreement-modal-overlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(
              event
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setHistoryModalOpen(
                  false
                );

                setHistoryAgreement(
                  null
                );
              }
            }}
          >

            <div className="agreement-view-modal">

              <div className="agreement-modal-header">

                <div>

                  <span className="agreement-modal-eyebrow">
                    APPROVAL HISTORY
                  </span>

                  <h2>
                    Agreement History
                  </h2>

                  <p>
                    {
                      historyAgreement.referenceNumber
                    }
                  </p>

                </div>

                <button
                  type="button"
                  className="modal-close-button"
                  onClick={() => {
                    setHistoryModalOpen(
                      false
                    );

                    setHistoryAgreement(
                      null
                    );
                  }}
                >
                  <X
                    size={
                      21
                    }
                  />
                </button>

              </div>

              <div className="agreement-view-body">

                {historyLoading ? (

                  <div
                    style={{
                      padding:
                        "45px 20px",
                      textAlign:
                        "center",
                      color:
                        "#6b7280",
                    }}
                  >

                    <RefreshCw
                      size={
                        28
                      }
                      className="refresh-spinning"
                    />

                    <h3>
                      Loading approval history...
                    </h3>

                  </div>

                ) : historyError ? (

                  <div
                    className="alert alert-error"
                    role="alert"
                  >
                    {
                      historyError
                    }
                  </div>

                ) : approvalHistory.length ===
                  0 ? (

                  <div
                    style={{
                      padding:
                        "45px 20px",
                      textAlign:
                        "center",
                      color:
                        "#6b7280",
                    }}
                  >

                    <div
                      style={{
                        width:
                          "65px",
                        height:
                          "65px",
                        margin:
                          "0 auto 15px",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        borderRadius:
                          "50%",
                        background:
                          "#f0f7f5",
                        color:
                          "#008f78",
                      }}
                    >
                      <History
                        size={
                          28
                        }
                      />
                    </div>

                    <h3>
                      No approval history
                    </h3>

                    <p>
                      No approval or rejection
                      actions have been recorded
                      for this agreement yet.
                    </p>

                  </div>

                ) : (

                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      gap:
                        "12px",
                    }}
                  >

                    {approvalHistory.map(
                      (
                        item,
                        index
                      ) => (

                        <div
                          key={
                            item.approvalId ||
                            `${historyAgreement.id}-${index}`
                          }
                          style={{
                            padding:
                              "15px 16px",
                            border:
                              "1px solid #e5ebe9",
                            borderRadius:
                              "10px",
                            background:
                              "#fbfdfc",
                          }}
                        >

                          <div
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                "space-between",
                              alignItems:
                                "center",
                              gap:
                                "12px",
                            }}
                          >

                            <strong>
                              {getApprovalActionLabel(
                                item
                              )}
                            </strong>

                            <span
                              style={{
                                fontSize:
                                  "12px",
                                color:
                                  "#788991",
                              }}
                            >
                              {formatDateTime(
                                item.approvalDate ||
                                  item.createdAt
                              )}
                            </span>

                          </div>

                          {item.officer?.user && (

                            <div
                              style={{
                                marginTop:
                                  "9px",
                              }}
                            >

                              <span
                                style={{
                                  fontSize:
                                    "11px",
                                  fontWeight:
                                    700,
                                  color:
                                    "#88969c",
                                }}
                              >
                                OFFICER
                              </span>

                              <strong
                                style={{
                                  display:
                                    "block",
                                  marginTop:
                                    "3px",
                                  color:
                                    "#25343a",
                                }}
                              >
                                {
                                  getPersonName(
                                    item
                                      .officer
                                      .user
                                      .firstName,
                                    item
                                      .officer
                                      .user
                                      .lastName
                                  )
                                }
                              </strong>

                              {item.officer
                                .employeeId && (

                                <small
                                  style={{
                                    color:
                                      "#788991",
                                  }}
                                >
                                  Employee ID:{" "}
                                  {
                                    item
                                      .officer
                                      .employeeId
                                  }
                                </small>

                              )}

                            </div>

                          )}

                          {item.comments && (

                            <div
                              style={{
                                marginTop:
                                  "10px",
                                padding:
                                  "10px 12px",
                                borderRadius:
                                  "7px",
                                background:
                                  "#f4f7f6",
                                color:
                                  "#53636c",
                                fontSize:
                                  "13px",
                                lineHeight:
                                  1.5,
                              }}
                            >
                              {
                                item.comments
                              }
                            </div>

                          )}

                        </div>

                      )
                    )}

                  </div>

                )}

              </div>

              <div className="agreement-modal-footer">

                <button
                  type="button"
                  className="agreement-secondary-button"
                  onClick={() => {
                    setHistoryModalOpen(
                      false
                    );

                    setHistoryAgreement(
                      null
                    );
                  }}
                >
                  Close
                </button>

              </div>

            </div>

          </div>

        )}

      </div>
    );
  };

export default RentalAgreements;