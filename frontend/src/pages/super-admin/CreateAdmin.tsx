import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../services/api";

type GovernmentOffice = {
  officeId: string;
  officeCode: string;
  officeName: string;
  region?: string | null;
  city?: string | null;
  subCity?: string | null;
  woreda?: string | null;
};

type AdminForm = {
  firstName: string;
  lastName: string;
  phone: string;
  nationalId: string;
  username: string;
  employeeId: string;
  officeId: string;
};

type OfficeListResponse = {
  success: boolean;
  message?: string;
  filters?: {
    status?: string;
    subCity?: string;
    city?: string;
  };
  data: GovernmentOffice[];
};

type CreateAdminResponse = {
  success: boolean;
  message: string;
  data?: {
    user?: {
      userId: string;
      firstName: string;
      lastName: string;
      username?: string | null;
      phone: string;
      email?: string | null;
      role: string;
      isActive: boolean;
      isNationalIdVerified: boolean;
    };
    generatedUsername?: string;
    passwordSent?: boolean;
  };
};

const createEmptyForm = (): AdminForm => ({
  firstName: "",
  lastName: "",
  phone: "",
  nationalId: "",
  username: "",
  employeeId: "",
  officeId: "",
});

function CreateAdmin() {
  const navigate = useNavigate();

  const [form, setForm] = useState<AdminForm>(
    createEmptyForm()
  );

  const [offices, setOffices] = useState<GovernmentOffice[]>(
    []
  );

  const [loading, setLoading] = useState(false);
  const [officeLoading, setOfficeLoading] = useState(true);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * ---------------------------------------------------------
   * LOAD GOVERNMENT OFFICES
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const loadOffices = async () => {
      setOfficeLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token");

        const response =
          await apiRequest<OfficeListResponse>(
            "/dashboard/offices",
            {
              method: "GET",
              cache: "no-store",
              headers: token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : undefined,
            }
          );

        setOffices(response.data);

        if (response.data.length === 1) {
          setForm((previous) => ({
            ...previous,
            officeId: response.data[0].officeId,
          }));
        }
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            "Failed to load government offices."
          );
        }
      } finally {
        setOfficeLoading(false);
      }
    };

    void loadOffices();
  }, []);

  /*
   * ---------------------------------------------------------
   * FORM HANDLING
   * ---------------------------------------------------------
   */

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleOfficeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setForm((previous) => ({
      ...previous,
      officeId: event.target.value,
    }));
  };

  /*
   * ---------------------------------------------------------
   * VALIDATION
   * ---------------------------------------------------------
   */

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

    if (!form.employeeId.trim()) {
      return "Employee ID is required.";
    }

    if (!form.officeId) {
      return "Please select a Government Office.";
    }

    return null;
  };

  /*
   * ---------------------------------------------------------
   * SUBMIT
   * ---------------------------------------------------------
   */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("token");

      const response =
        await apiRequest<CreateAdminResponse>(
          "/auth/office-admin",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token
                ? {
                    Authorization: `Bearer ${token}`,
                  }
                : {}),
            },
            body: JSON.stringify({
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              username: form.username.trim(),
              phone: form.phone.trim(),
              nationalId: form.nationalId.trim(),
              employeeId: form.employeeId.trim(),
              officeId: form.officeId,
            }),
          }
        );

      const generatedUsername =
        response.data?.generatedUsername ||
        form.username.trim();

      const passwordSent =
        response.data?.passwordSent;

      setSuccess(
        passwordSent
          ? `Administrator created successfully. Username: ${generatedUsername}. A generated password has been sent via SMS.`
          : `Administrator created successfully. Username: ${generatedUsername}.`
      );

      setForm(createEmptyForm());

      window.setTimeout(() => {
        navigate("/super-admin/administrators");
      }, 1800);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to create administrator."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-header">
          <h1>Create Administrator</h1>

          <p>
            Create an Office Administrator and assign an
            existing Government Office.
          </p>
        </div>

        {error && (
          <div
            className="auth-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              background: "#ecfdf5",
              color: "#047857",
              border: "1px solid #a7f3d0",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              lineHeight: 1.5,
            }}
            role="status"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="form-row">

            <div className="form-group">
              <label htmlFor="firstName">
                First Name
              </label>

              <input
                id="firstName"
                name="firstName"
                type="text"
                value={form.firstName}
                onChange={handleChange}
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
                value={form.lastName}
                onChange={handleChange}
                placeholder="Last name"
                autoComplete="family-name"
                disabled={loading}
                required
              />
            </div>

          </div>

          <div className="form-row">

            <div className="form-group">
              <label htmlFor="username">
                Username
              </label>

              <input
                id="username"
                name="username"
                type="text"
                value={form.username}
                onChange={handleChange}
                placeholder="Choose username"
                autoComplete="username"
                disabled={loading}
                required
              />

              <small>
                This username will be used by the
                administrator to log in.
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="employeeId">
                Employee ID
              </label>

              <input
                id="employeeId"
                name="employeeId"
                type="text"
                value={form.employeeId}
                onChange={handleChange}
                placeholder="e.g. EMP-001"
                disabled={loading}
                required
              />
            </div>

          </div>

          <div className="form-group">
            <label htmlFor="phone">
              Phone Number
            </label>

            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              placeholder="Phone number"
              autoComplete="tel"
              disabled={loading}
              required
            />

            <small>
              The generated password will be sent to
              this number by SMS.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="nationalId">
              National ID
            </label>

            <input
              id="nationalId"
              name="nationalId"
              type="text"
              value={form.nationalId}
              onChange={handleChange}
              placeholder="National ID"
              disabled={loading}
              required
            />
          </div>

          <div
            style={{
              marginTop: "24px",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                marginBottom: "6px",
              }}
            >
              Government Office
            </h2>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
              }}
            >
              Assign this administrator to an existing
              Government Office.
            </p>
          </div>

          <div className="form-group">

            <label htmlFor="officeId">
              Government Office
            </label>

            <select
              id="officeId"
              name="officeId"
              value={form.officeId}
              onChange={handleOfficeChange}
              disabled={
                loading ||
                officeLoading ||
                offices.length === 0
              }
              required
            >
              <option value="">
                {officeLoading
                  ? "Loading Government Offices..."
                  : offices.length === 0
                  ? "No Government Offices available"
                  : "Select a Government Office"}
              </option>

              {offices.map((office) => (
                <option
                  key={office.officeId}
                  value={office.officeId}
                >
                  {office.officeCode} —{" "}
                  {office.officeName}
                </option>
              ))}
            </select>

          </div>

          {offices.length === 0 &&
            !officeLoading && (
              <div
                style={{
                  background: "#fffbeb",
                  color: "#92400e",
                  border: "1px solid #fde68a",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                }}
              >
                No Government Offices are available.
                Create a Government Office first.
              </div>
            )}

          <div
            style={{
              marginTop: "10px",
              marginBottom: "20px",
              padding: "14px 16px",
              border: "1px solid #dbeee7",
              borderRadius: "8px",
              background: "#f8fffc",
              color: "#52645d",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: "4px",
                color: "#047857",
              }}
            >
              Password handling
            </strong>

            The system automatically generates a secure
            password and sends it to the administrator by
            SMS. You do not need to create a password here.
          </div>

          <button
            type="submit"
            disabled={
              loading ||
              officeLoading ||
              offices.length === 0
            }
          >
            {loading
              ? "Creating Administrator..."
              : "Create Administrator"}
          </button>

          <button
            type="button"
            onClick={() =>
              navigate("/super-admin/administrators")
            }
            disabled={loading}
            style={{
              marginTop: "10px",
              background: "#e5e7eb",
              color: "#111827",
            }}
          >
            Cancel
          </button>

        </form>
      </div>
    </div>
  );
}

export default CreateAdmin;