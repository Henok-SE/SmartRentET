import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { apiRequest } from "../../services/api";

/* =========================================================
   TYPES
========================================================= */

type GovernmentOffice = {
  officeId: string;
  officeCode: string;
  officeName: string;
  region?: string | null;
  city?: string | null;
  subCity?: string | null;
  woreda?: string | null;
};

type OfficeAdmin = {
  officeAdminId: string;
  employeeId: string;
  createdAt: string;

  user: {
    userId: string;
    firstName: string;
    lastName: string;
    username?: string | null;
    phone?: string | null;
    email?: string | null;
    role: string;
    isActive: boolean;
  };

  office: {
    officeId: string;
    officeCode: string;
    officeName: string;
    region?: string | null;
    city?: string | null;
    subCity?: string | null;
    woreda?: string | null;
    status?: "ACTIVE" | "INACTIVE";
  };
};

type OfficerForm = {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId: string;
  username: string;
  position: string;
  officeId: string;
  assignedArea: string;
};

type OfficeListResponse = {
  success: boolean;
  message?: string;
  data: GovernmentOffice[];
};

type OfficeAdminListResponse = {
  success: boolean;
  message?: string;
  data: OfficeAdmin[];
};

type CreateOfficerResponse = {
  success: boolean;
  message: string;
  data?: {
    user?: {
      userId?: string;
      firstName?: string;
      lastName?: string;
      username?: string | null;
      phone?: string;
      email?: string | null;
      role?: string;
      isActive?: boolean;
    };

    generatedUsername?: string;
    passwordSent?: boolean;
  };
};

type StoredUser = {
  userId?: string | number;
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

type CreateOfficerProps = {
  onClose: (created: boolean) => void;
};

/* =========================================================
   FORM
========================================================= */

const createEmptyForm = (): OfficerForm => ({
  firstName: "",
  lastName: "",
  phone: "",
  nationalId: "",
  username: "",
  position: "",
  officeId: "",
  assignedArea: "",
});

/* =========================================================
   COMPONENT
========================================================= */

function CreateOfficer({
  onClose,
}: CreateOfficerProps) {
  const [form, setForm] =
    useState<OfficerForm>(
      createEmptyForm()
    );

  const [offices, setOffices] =
    useState<GovernmentOffice[]>(
      []
    );

  const [currentUser, setCurrentUser] =
    useState<StoredUser>({});

  const [currentOffice, setCurrentOffice] =
    useState<GovernmentOffice | null>(
      null
    );

  const [officeLoading, setOfficeLoading] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /* =======================================================
     CURRENT USER
  ======================================================= */

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user");

    if (!storedUser) {
      return;
    }

    try {
      setCurrentUser(
        JSON.parse(
          storedUser
        ) as StoredUser
      );
    } catch {
      setCurrentUser({});
    }
  }, []);

  const isOfficeAdmin =
    currentUser.role ===
    "OFFICE_ADMIN";

  const isSuperAdmin =
    currentUser.role ===
    "SUPER_ADMIN";

  /* =======================================================
     LOAD OFFICE INFORMATION
  ======================================================= */

  useEffect(() => {
    if (!currentUser.userId) {
      return;
    }

    const loadOfficeInformation =
      async () => {
        setOfficeLoading(true);
        setError("");

        try {
          const token =
            localStorage.getItem(
              "token"
            );

          /*
           * =================================================
           * OFFICE ADMIN
           * =================================================
           *
           * Office Admin must be restricted to their own
           * Government Office.
           */

          if (isOfficeAdmin) {
            const response =
              await apiRequest<OfficeAdminListResponse>(
                "/dashboard/office-admins",
                {
                  method: "GET",
                  cache: "no-store",
                  headers: token
                    ? {
                        Authorization:
                          `Bearer ${token}`,
                      }
                    : undefined,
                }
              );

            if (!response.success) {
              throw new Error(
                response.message ||
                  "Failed to load Office Admin information."
              );
            }

            const currentUserId =
              String(
                currentUser.userId
              );

            const admin =
              response.data.find(
                (item) =>
                  String(
                    item.user.userId
                  ) ===
                  currentUserId
              );

            if (!admin) {
              throw new Error(
                "Your Office Admin record could not be found."
              );
            }

            if (
              !admin.office ||
              !admin.office.officeId
            ) {
              throw new Error(
                "Your account is not assigned to a Government Office."
              );
            }

            const office: GovernmentOffice =
              {
                officeId:
                  admin.office.officeId,
                officeCode:
                  admin.office.officeCode,
                officeName:
                  admin.office.officeName,
                region:
                  admin.office.region ??
                  null,
                city:
                  admin.office.city ??
                  null,
                subCity:
                  admin.office.subCity ??
                  null,
                woreda:
                  admin.office.woreda ??
                  null,
              };

            setCurrentOffice(
              office
            );

            /*
             * Automatically assign the Office Admin's
             * office to the officer.
             */
            setForm(
              (previous) => ({
                ...previous,
                officeId:
                  String(
                    office.officeId
                  ),
              })
            );

            return;
          }

          /*
           * =================================================
           * SUPER ADMIN
           * =================================================
           *
           * Super Admin can create an officer in any
           * existing Government Office.
           */

          if (isSuperAdmin) {
            const response =
              await apiRequest<OfficeListResponse>(
                "/dashboard/offices",
                {
                  method: "GET",
                  cache: "no-store",
                  headers: token
                    ? {
                        Authorization:
                          `Bearer ${token}`,
                      }
                    : undefined,
                }
              );

            if (!response.success) {
              throw new Error(
                response.message ||
                  "Failed to load Government Offices."
              );
            }

            setOffices(
              response.data ?? []
            );

            if (
              response.data.length ===
              1
            ) {
              setForm(
                (previous) => ({
                  ...previous,
                  officeId:
                    String(
                      response.data[0]
                        .officeId
                    ),
                })
              );
            }

            return;
          }

          throw new Error(
            "You are not authorized to create an officer."
          );
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load office information."
          );
        } finally {
          setOfficeLoading(
            false
          );
        }
      };

    void loadOfficeInformation();
  }, [
    currentUser.userId,
    currentUser.role,
    isOfficeAdmin,
    isSuperAdmin,
  ]);

  /* =======================================================
     FORM HANDLING
  ======================================================= */

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  const handleOfficeChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    /*
     * Office Admin cannot change their assigned office.
     */

    if (isOfficeAdmin) {
      return;
    }

    setForm(
      (previous) => ({
        ...previous,
        officeId:
          event.target.value,
      })
    );
  };

  /* =======================================================
     VALIDATION
  ======================================================= */

  const validateForm = (): string | null => {
    if (!form.firstName.trim()) {
      return "First name is required.";
    }

    if (!form.lastName.trim()) {
      return "Last name is required.";
    }

    if (!form.username.trim()) {
      return "Username is required.";
    }

    if (!form.phone.trim()) {
      return "Phone number is required.";
    }

    if (!form.nationalId.trim()) {
      return "National ID is required.";
    }

    if (!form.officeId) {
      return "Government Office is required.";
    }

    if (
      isOfficeAdmin &&
      !currentOffice
    ) {
      return "Your Government Office could not be determined.";
    }

    return null;
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError =
      validateForm();

    if (validationError) {
      setError(
        validationError
      );
      return;
    }

    setLoading(true);

    try {
      const token =
        localStorage.getItem(
          "token"
        );

      /*
       * Office Admin always uses the automatically
       * determined office.
       *
       * Super Admin uses the selected office.
       */
      const selectedOfficeId =
        isOfficeAdmin &&
        currentOffice
          ? currentOffice.officeId
          : form.officeId;

      /*
       * IMPORTANT:
       *
       * Do NOT send password or confirmPassword.
       * The backend generates the password automatically
       * and sends it to the officer by SMS.
       */
      const response =
        await apiRequest<CreateOfficerResponse>(
          "/auth/officer",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              ...(token
                ? {
                    Authorization:
                      `Bearer ${token}`,
                  }
                : {}),
            },

            body: JSON.stringify({
              firstName:
                form.firstName.trim(),

              lastName:
                form.lastName.trim(),

              username:
                form.username.trim(),

              phone:
                form.phone.trim(),

              nationalId:
                form.nationalId.trim(),

              employeeId:
                `OFF-${Date.now()}`,

              officeId:
                selectedOfficeId,

              position:
                form.position.trim(),

              assignedArea:
                form.assignedArea.trim(),
            }),
          }
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to create officer."
        );
      }

      setSuccess(
        response.message ||
          "Officer created successfully. Login credentials have been sent by SMS."
      );

      setForm(
        createEmptyForm()
      );

      /*
       * Preserve Office Admin's assigned office after reset.
       */
      if (
        isOfficeAdmin &&
        currentOffice
      ) {
        setForm(
          (previous) => ({
            ...previous,
            officeId:
              currentOffice.officeId,
          })
        );
      }

      /*
       * Close the modal and refresh the officer list
       * after successful creation.
       */
      window.setTimeout(() => {
        onClose(true);
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create officer."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     CANCEL
  ======================================================= */

  const handleCancel = () => {
    if (loading) {
      return;
    }

    onClose(false);
  };

  /* =======================================================
     OFFICE OPTIONS
  ======================================================= */

  const availableOffices =
    isOfficeAdmin
      ? currentOffice
        ? [currentOffice]
        : []
      : offices;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="auth-page"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-officer-title"
    >
      <div className="auth-card">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="auth-header">
          <h1 id="create-officer-title">
            Create Officer
          </h1>

          <p>
            {isOfficeAdmin
              ? "Create an Officer for your Government Office. The system will generate and send the temporary password automatically."
              : "Create an Officer and assign an existing Government Office. The system will generate and send the temporary password automatically."}
          </p>
        </div>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div
            className="auth-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* =================================================
            SUCCESS
        ================================================= */}

        {success && (
          <div
            style={{
              background:
                "#ecfdf5",
              color:
                "#047857",
              border:
                "1px solid #a7f3d0",
              padding:
                "12px 16px",
              borderRadius:
                "8px",
              marginBottom:
                "20px",
            }}
            role="status"
          >
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
        >
          {/* =================================================
              NAME
          ================================================= */}

          <div className="form-row">

            <div className="form-group">
              <label htmlFor="firstName">
                First Name
              </label>

              <input
                id="firstName"
                name="firstName"
                type="text"
                value={
                  form.firstName
                }
                onChange={
                  handleChange
                }
                placeholder="First name"
                autoComplete="given-name"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">
                Last Name
              </label>

              <input
                id="lastName"
                name="lastName"
                type="text"
                value={
                  form.lastName
                }
                onChange={
                  handleChange
                }
                placeholder="Last name"
                autoComplete="family-name"
                disabled={loading}
                required
              />
            </div>

          </div>

          {/* =================================================
              USERNAME / POSITION
          ================================================= */}

          <div className="form-row">

            <div className="form-group">
              <label htmlFor="username">
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                value={
                  form.username
                }
                onChange={
                  handleChange
                }
                placeholder="Choose username"
                autoComplete="username"
                disabled={loading}
                required
              />

              <small>
                Username must be unique.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="position">
                Position
              </label>

              <input
                id="position"
                name="position"
                type="text"
                value={
                  form.position
                }
                onChange={
                  handleChange
                }
                placeholder="e.g. Rental Officer"
                disabled={loading}
              />
            </div>

          </div>

          {/* =================================================
              PHONE
          ================================================= */}

          <div className="form-group">
            <label htmlFor="phone">
              Phone Number
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              value={
                form.phone
              }
              onChange={
                handleChange
              }
              placeholder="Phone number"
              autoComplete="tel"
              disabled={loading}
              required
            />

            <small>
              The generated password will be sent to this
              phone number by SMS.
            </small>
          </div>

          {/* =================================================
              NATIONAL ID
          ================================================= */}

          <div className="form-group">
            <label htmlFor="nationalId">
              National ID
            </label>

            <input
              id="nationalId"
              name="nationalId"
              type="text"
              value={
                form.nationalId
              }
              onChange={
                handleChange
              }
              placeholder="National ID"
              disabled={loading}
              required
            />
          </div>

          {/* =================================================
              ASSIGNED AREA
          ================================================= */}

          <div className="form-group">
            <label htmlFor="assignedArea">
              Assigned Area
            </label>

            <input
              id="assignedArea"
              name="assignedArea"
              type="text"
              value={
                form.assignedArea
              }
              onChange={
                handleChange
              }
              placeholder="e.g. Bole"
              disabled={loading}
            />
          </div>

          {/* =================================================
              GOVERNMENT OFFICE
          ================================================= */}

          <div
            style={{
              marginTop:
                "24px",
              marginBottom:
                "20px",
            }}
          >
            <h2
              style={{
                marginBottom:
                  "6px",
              }}
            >
              Government Office
            </h2>

            <p
              style={{
                margin: 0,
                color:
                  "#6b7280",
              }}
            >
              {isOfficeAdmin
                ? "The officer will automatically be assigned to your Government Office."
                : "Assign the officer to an existing Government Office."}
            </p>
          </div>

          {isOfficeAdmin ? (
            /* =================================================
               OFFICE ADMIN OFFICE
            ================================================= */

            <div className="form-group">
              <label htmlFor="office-display">
                Government Office
              </label>

              <input
                id="office-display"
                type="text"
                value={
                  currentOffice
                    ? `${currentOffice.officeCode} — ${currentOffice.officeName}`
                    : officeLoading
                    ? "Loading Government Office..."
                    : "Government Office unavailable"
                }
                readOnly
                disabled
              />

              <small>
                Your office is assigned automatically and
                cannot be changed.
              </small>
            </div>
          ) : (
            /* =================================================
               SUPER ADMIN OFFICE
            ================================================= */

            <div className="form-group">
              <label htmlFor="officeId">
                Government Office
              </label>

              <select
                id="officeId"
                name="officeId"
                value={
                  form.officeId
                }
                onChange={
                  handleOfficeChange
                }
                disabled={
                  loading ||
                  officeLoading ||
                  availableOffices.length ===
                    0
                }
                required
              >
                <option value="">
                  {officeLoading
                    ? "Loading Government Offices..."
                    : availableOffices.length ===
                      0
                    ? "No Government Offices available"
                    : "Select a Government Office"}
                </option>

                {availableOffices.map(
                  (office) => (
                    <option
                      key={
                        office.officeId
                      }
                      value={
                        office.officeId
                      }
                    >
                      {
                        office.officeCode
                      }{" "}
                      —{" "}
                      {
                        office.officeName
                      }
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          {/* =================================================
              NO OFFICES
          ================================================= */}

          {isSuperAdmin &&
            availableOffices.length ===
              0 &&
            !officeLoading && (
              <div
                style={{
                  background:
                    "#fffbeb",
                  color:
                    "#92400e",
                  border:
                    "1px solid #fde68a",
                  padding:
                    "12px 16px",
                  borderRadius:
                    "8px",
                  marginBottom:
                    "20px",
                }}
                role="status"
              >
                No Government Offices are available.
                Create a Government Office first.
              </div>
            )}

          {/* =================================================
              AUTO PASSWORD NOTICE
          ================================================= */}

          <div
            style={{
              marginTop:
                "20px",
              padding:
                "14px 16px",
              background:
                "#f0fdfa",
              border:
                "1px solid #b7e4db",
              borderRadius:
                "8px",
            }}
          >
            <strong
              style={{
                display:
                  "block",
                color:
                  "#006f60",
                fontSize:
                  "13px",
              }}
            >
              Automatic Password Generation
            </strong>

            <p
              style={{
                margin:
                  "6px 0 0",
                color:
                  "#52736d",
                fontSize:
                  "12px",
                lineHeight:
                  "1.5",
              }}
            >
              You do not need to create a password.
              SmartRent ET will generate a secure temporary
              password and send it to the officer by SMS.
            </p>
          </div>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <button
            type="submit"
            disabled={
              loading ||
              officeLoading ||
              !form.officeId
            }
            style={{
              marginTop:
                "20px",
            }}
          >
            {loading
              ? "Creating Officer..."
              : "Create Officer"}
          </button>

          <button
            type="button"
            onClick={
              handleCancel
            }
            disabled={loading}
            style={{
              marginTop:
                "10px",
              background:
                "#e5e7eb",
              color:
                "#111827",
            }}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateOfficer;