import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
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
    subCity?: string | null;
    woreda?: string | null;
  };
};

type OfficerForm = {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId: string;
  username: string;
  password: string;
  confirmPassword: string;
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
  data?: unknown;
};

type StoredUser = {
  userId?: number | string;
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
  password: "",
  confirmPassword: "",
  position: "",
  assignedArea: "",
  officeId: "",
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

  const [officeLoading, setOfficeLoading] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [currentUser, setCurrentUser] =
    useState<StoredUser>({});

  const [currentOffice, setCurrentOffice] =
    useState<GovernmentOffice | null>(
      null
    );

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
           * Get the current Office Admin and
           * automatically determine their office.
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
                subCity:
                  admin.office.subCity,
                woreda:
                  admin.office.woreda,
              };

            setCurrentOffice(
              office
            );

            /*
             * Automatically assign the
             * Office Admin's office.
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
           * Super Admin can choose any office.
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
                      response
                        .data[0]
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
          if (
            err instanceof Error
          ) {
            setError(
              err.message
            );
          } else {
            setError(
              "Failed to load office information."
            );
          }
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
     DISPLAY OFFICE LIST
  ======================================================= */

  const availableOffices =
    useMemo(() => {
      if (
        isOfficeAdmin &&
        currentOffice
      ) {
        return [
          currentOffice,
        ];
      }

      return offices;
    }, [
      isOfficeAdmin,
      currentOffice,
      offices,
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
     * Office Admin must never manually
     * change their office.
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
     SUBMIT
  ======================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    /* -----------------------------------------------
       VALIDATION
    ----------------------------------------------- */

    if (
      !form.firstName.trim()
    ) {
      setError(
        "First name is required."
      );
      return;
    }

    if (
      !form.lastName.trim()
    ) {
      setError(
        "Last name is required."
      );
      return;
    }

    if (
      !form.username.trim()
    ) {
      setError(
        "Username is required."
      );
      return;
    }

    if (
      !form.phone.trim()
    ) {
      setError(
        "Phone number is required."
      );
      return;
    }

    if (
      !form.nationalId.trim()
    ) {
      setError(
        "National ID is required."
      );
      return;
    }

    if (
      !form.password.trim()
    ) {
      setError(
        "Password is required."
      );
      return;
    }

    if (
      form.password.length <
      6
    ) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    /*
     * Office Admin must have their
     * automatically assigned office.
     */
    if (
      isOfficeAdmin &&
      !currentOffice
    ) {
      setError(
        "Your Government Office could not be determined."
      );
      return;
    }

    if (!form.officeId) {
      setError(
        "Please select a Government Office."
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
       * Use the automatically determined
       * office for Office Admin.
       */
      const selectedOfficeId =
        isOfficeAdmin &&
        currentOffice
          ? currentOffice.officeId
          : form.officeId;

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

            position:
              form.position.trim(),

            assignedArea:
              form.assignedArea.trim(),

            officeId:
              selectedOfficeId,

            password:
              form.password,
          }),
        }
      );

      setSuccess(
        "Officer created successfully."
      );

      setForm(
        createEmptyForm()
      );

      /*
       * Preserve Office Admin's office
       * after clearing the form.
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

      window.setTimeout(() => {
        onClose(true);
      }, 1200);
    } catch (err) {
      if (
        err instanceof Error
      ) {
        setError(
          err.message
        );
      } else {
        setError(
          "Failed to create officer."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="auth-page">

      <div className="auth-card">

        {/* HEADER */}

        <div className="auth-header">

          <h1>
            Create Officer
          </h1>

          <p>
            {isOfficeAdmin
              ? "Create an Officer for your Government Office."
              : "Create an Officer and assign an existing Government Office."}
          </p>

        </div>

        {/* ERROR */}

        {error && (
          <div
            className="auth-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div
            style={{
              background:
                "#ecfdf5",
              color: "#047857",
              border:
                "1px solid #a7f3d0",
              padding:
                "12px 16px",
              borderRadius: "8px",
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

          {/* NAME */}

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

          {/* USERNAME / POSITION */}

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

          {/* PHONE */}

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

          </div>

          {/* NATIONAL ID */}

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

          {/* ASSIGNED AREA */}

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
              OFFICE
          ================================================= */}

          <div
            style={{
              marginTop: "24px",
              marginBottom: "20px",
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
                ? "The officer will be assigned to your Government Office."
                : "Assign this officer to an existing Government Office."}
            </p>

          </div>

          {isOfficeAdmin ? (

            /* OFFICE ADMIN */

            <div className="form-group">

              <label>
                Government Office
              </label>

              <input
                type="text"
                value={
                  currentOffice
                    ? `${currentOffice.officeCode} — ${currentOffice.officeName}`
                    : officeLoading
                    ? "Loading Government Office..."
                    : "Government Office not available"
                }
                readOnly
                disabled
              />

              <small>
                Your office is assigned automatically.
              </small>

            </div>

          ) : (

            /* SUPER ADMIN */

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

          {/* NO OFFICES */}

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
              >
                No Government Offices are
                available. Create a
                Government Office first.
              </div>
            )}

          {/* PASSWORD */}

          <div className="form-group">

            <label htmlFor="password">
              Temporary Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={
                form.password
              }
              onChange={
                handleChange
              }
              placeholder="Create password"
              autoComplete="new-password"
              minLength={6}
              disabled={loading}
              required
            />

            <small>
              Minimum 6 characters.
            </small>

          </div>

          {/* CONFIRM PASSWORD */}

          <div className="form-group">

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={
                form.confirmPassword
              }
              onChange={
                handleChange
              }
              placeholder="Confirm password"
              autoComplete="new-password"
              minLength={6}
              disabled={loading}
              required
            />

          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              loading ||
              officeLoading ||
              !form.officeId
            }
          >
            {loading
              ? "Creating Officer..."
              : "Create Officer"}
          </button>

          {/* CANCEL */}

          <button
            type="button"
            onClick={() =>
              onClose(false)
            }
            disabled={loading}
            style={{
              marginTop: "10px",
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