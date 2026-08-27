import { z } from "zod";
import { activeClient, type JobType, type Urgency } from "@/config/client";

const jobTypeValues = Object.keys(activeClient.jobTypes) as [JobType, ...JobType[]];
const urgencyValues = Object.keys(activeClient.urgencyLabels) as [Urgency, ...Urgency[]];

export const enquirySchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z
    .union([z.string().trim().email("Enter a valid email"), z.literal("")])
    .optional(),
  postcode: z
    .string()
    .trim()
    .toUpperCase()
    .optional(),
  job_type: z.enum(jobTypeValues, {
    errorMap: () => ({ message: "Select a valid job type" }),
  }),
  urgency: z.enum(urgencyValues, {
    errorMap: () => ({ message: "Select a valid urgency" }),
  }),
  message: z
    .string()
    .trim()
    .max(2000, "Message must be 2000 characters or fewer")
    .optional(),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
