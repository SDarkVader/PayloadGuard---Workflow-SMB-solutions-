"use client";

import { useState, type FormEvent } from "react";
import { activeClient, type JobType } from "@/config/client";
import PhotoInput from "./PhotoInput";

type FieldErrors = Partial<
  Record<"name" | "phone" | "email" | "postcode" | "job_type" | "urgency" | "message" | "photos", string[]>
>;

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; jobType: JobType; postcode?: string; photoCount: number }
  | { status: "error"; message: string };

export default function EnquiryForm() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [photos, setPhotos] = useState<File[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setState({ status: "submitting" });

    const form = event.currentTarget;
    const formData = new FormData(form);
    photos.forEach((photo) => formData.append("photos", photo));

    const jobType = formData.get("job_type") as JobType;
    const postcode = (formData.get("postcode") as string) || undefined;

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        body: formData,
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

      // Trust what the server actually stored, not what we tried to send —
      // an upload can fail server-side and still return 200 (see spec: a
      // lost photo must not lose the lead), so the success state must
      // reflect reality, not intent.
      const data = await response.json();
      setState({ status: "success", jobType, postcode, photoCount: data.photoCount ?? 0 });
      form.reset();
      setPhotos([]);
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
          {state.postcode ? ` for ${state.postcode}` : ""}
          {state.photoCount > 0
            ? `, with ${state.photoCount} photo${state.photoCount === 1 ? "" : "s"} received`
            : ""}
          .
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

      <PhotoInput photos={photos} onChange={setPhotos} />
      {errors.photos && <p className="field-error">{errors.photos[0]}</p>}

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
