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
  filters?: {
    status?: string;
    subCity?: string;
    city?: string;
  };
  data: GovernmentOffice[];
};

type CreateOfficerResponse = {
  success: boolean;
  message: string;
  data?: unknown;
};

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

function CreateOfficer() {
  const navigate = useNavigate();

  const [form, setForm] = useState<OfficerForm>(
    createEmptyForm
  );

  const [offices, setOffices] = useState<
    GovernmentOffice[]
  >([]);

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
            officeId: String(response.data[0].officeId),
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
   * SUBMIT
   * ---------------------------------------------------------
   */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }

    if (!form.lastName.trim()) {
      setError("Last name is required.");
      return;
    }

    if (!form.username.trim()) {
      setError("Username is required.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!form.nationalId.trim()) {
      setError("National ID is required.");
      return;
    }

    if (form.password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
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
      const token = localStorage.getItem("token");

      await apiRequest<CreateOfficerResponse>(
        "/auth/officer",
        {
          method: "POST",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
          body: JSON.stringify({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            username: form.username.trim(),
            phone: form.phone.trim(),
            nationalId: form.nationalId.trim(),
            position: form.position.trim(),
            assignedArea: form.assignedArea.trim(),
            officeId: form.officeId,
            password: form.password,
          }),
        }
      );

      setSuccess(
        "Officer created successfully."
      );

      setForm(createEmptyForm());

      window.setTimeout(() => {
        navigate("/super-admin");
      }, 1200);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          "Failed to create officer."
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
          <h1>Create Officer</h1>

          <p>
            Create an Officer and assign an
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
              Assign this officer to an existing
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

          <div className="form-group">

            <label htmlFor="password">
              Temporary Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
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

          <div className="form-group">

            <label htmlFor="confirmPassword">
              Confirm Password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm password"
              autoComplete="new-password"
              minLength={6}
              disabled={loading}
              required
            />

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
              ? "Creating Officer..."
              : "Create Officer"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/OfficeAdminDashboard")}
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

export default CreateOfficer;