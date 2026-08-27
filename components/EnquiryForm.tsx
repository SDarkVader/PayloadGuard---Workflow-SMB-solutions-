"use client";

import { useState, type FormEvent } from "react";
import { activeClient, type JobType } from "@/config/client";

type FieldErrors = Partial<
  Record<"name" | "phone" | "email" | "postcode" | "job_type" | "urgency" | "message", string[]>
>;

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; jobType: JobType; postcode?: string }
  | { status: "error"; message: string };

export default function EnquiryForm() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setState({ status: "submitting" });

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: formData.get("name"),
      phone: formData.get("phone"),
      email: formData.get("email") || undefined,
      postcode: formData.get("postcode") || undefined,
      job_type: formData.get("job_type"),
      urgency: formData.get("urgency"),
      message: formData.get("message") || undefined,
      company_website: formData.get("company_website") || undefined,
    };

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 400) {
        const data = await response.json();
        setErrors(data.errors ?? {});
        setState({ status: "idle" });
        return;
      }

      if (!response.ok) {
        setState({
          status: "error",
          message: "Something went wrong sending your enquiry. Please call us instead.",
        });
        return;
      }

      setState({
        status: "success",
        jobType: payload.job_type as JobType,
        postcode: payload.postcode as string | undefined,
      });
      form.reset();
    } catch {
      setState({
        status: "error",
        message: "Something went wrong sending your enquiry. Please call us instead.",
      });
    }
  }

  if (state.status === "success") {
    return (
      <div className="success">
        <h2>Enquiry sent</h2>
        <p>
          We&apos;ve recorded your {activeClient.jobTypes[state.jobType]} enquiry
          {state.postcode ? ` for ${state.postcode}` : ""}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="company_website">Company website</label>
        <input type="text" id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="field">
        <label htmlFor="name">Name</label>
        <input type="text" id="name" name="name" required />
        {errors.name && <p className="field-error">{errors.name[0]}</p>}
      </div>

      <div className="field">
        <label htmlFor="phone">Phone</label>
        <input type="tel" id="phone" name="phone" required />
        {errors.phone && <p className="field-error">{errors.phone[0]}</p>}
      </div>

      <div className="field">
        <label htmlFor="email">Email (optional)</label>
        <input type="email" id="email" name="email" />
        {errors.email && <p className="field-error">{errors.email[0]}</p>}
      </div>

      <div className="field">
        <label htmlFor="postcode">Postcode (optional)</label>
        <input type="text" id="postcode" name="postcode" />
      </div>

      <div className="field">
        <label htmlFor="job_type">Job type</label>
        <select id="job_type" name="job_type" required defaultValue="">
          <option value="" disabled>
            Select a job type
          </option>
          {Object.entries(activeClient.jobTypes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.job_type && <p className="field-error">{errors.job_type[0]}</p>}
      </div>

      <fieldset className="urgency">
        <legend>Urgency</legend>
        {Object.entries(activeClient.urgencyLabels).map(([value, label]) => (
          <label key={value} className="urgency-option">
            <input type="radio" name="urgency" value={value} required />
            {label}
          </label>
        ))}
        {errors.urgency && <p className="field-error">{errors.urgency[0]}</p>}
      </fieldset>

      <div className="field">
        <label htmlFor="message">Tell us what&apos;s happened (optional)</label>
        <textarea id="message" name="message" maxLength={2000} rows={4} />
        {errors.message && <p className="field-error">{errors.message[0]}</p>}
      </div>

      {state.status === "error" && <p className="form-error">{state.message}</p>}

      <button type="submit" disabled={state.status === "submitting"}>
        {state.status === "submitting" ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
