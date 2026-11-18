"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import PriorityBadge from "../../../_components/PriorityBadge";
import PrimaryButton from "../../../_components/PrimaryButton";
import TextField from "../../../_components/TextField";
import { ticketCategories, type TicketCategory } from "../../../_lib/categories";
import { createTicket, searchKb, type CreateTicketData } from "../../../_lib/requesterApi";
import { themeClasses } from "../../../_lib/theme";
import type { Ticket, TicketImpact, TicketPriority } from "../../../_lib/types";

const maximumAttachmentSize = 10 * 1024 * 1024;
const allowedExtensions = new Set(["pdf", "png", "jpg", "jpeg", "gif", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip"]);
const impactOptions: TicketImpact[] = ["Low", "Medium", "High"];

type FormField = "subject" | "category" | "subCategory" | "description";
type FormErrors = Partial<Record<FormField, string>>;
type ExtraDetails = Pick<CreateTicketData, "employeeId" | "department" | "phone" | "location">;

function calculatePriority(impact: TicketImpact, urgency: TicketImpact): TicketPriority {
  if (impact === "High" && urgency === "High") return "Critical";
  if ((impact === "High" && urgency === "Medium") || (impact === "Medium" && urgency === "High")) return "High";
  if (impact === "Medium" && urgency === "Medium") return "Medium";
  if ((impact === "Low" && urgency !== "High") || (urgency === "Low" && impact !== "High")) return "Low";
  return "Medium";
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function getSelectClass(hasError: boolean): string {
  return `${themeClasses.authInput} ${hasError ? "border-[#b33b38] focus-visible:ring-[#b33b38]/20" : ""}`;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-[#a52d2a]" role="alert">
    <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 6.5v4.25m0 2.75h.01" strokeLinecap="round" />
    </svg>
    <span>{message}</span>
  </p>;
}

export default function RaiseTicketPage() {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState<TicketImpact>("Medium");
  const [urgency, setUrgency] = useState<TicketImpact>("Medium");
  const [details, setDetails] = useState<ExtraDetails>({ employeeId: "", department: "", phone: "", location: "" });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const subCategoryRef = useRef<HTMLSelectElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const priority = calculatePriority(impact, urgency);
  const suggestions = subject.trim().length >= 3 ? searchKb(subject).slice(0, 3) : [];
  const availableSubCategories = category ? ticketCategories[category as TicketCategory] ?? [] : [];

  function updateFieldError(field: FormField) {
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleCategoryChange(event: ChangeEvent<HTMLSelectElement>) {
    setCategory(event.target.value);
    setSubCategory("");
    setErrors((current) => ({ ...current, category: undefined, subCategory: undefined }));
  }

  function handleFileSelection(selectedFiles: FileList | File[]) {
    const nextAttachments = [...attachments];
    const nextErrors: string[] = [];

    for (const file of Array.from(selectedFiles)) {
      if (!allowedExtensions.has(getFileExtension(file.name))) {
        nextErrors.push(`${file.name} is not an allowed file type`);
      } else if (file.size > maximumAttachmentSize) {
        nextErrors.push(`${file.name} is larger than 10 MB`);
      } else if (nextAttachments.length >= 5) {
        nextErrors.push("You can attach up to 5 files");
      } else {
        nextAttachments.push(file);
      }
    }

    setAttachments(nextAttachments);
    setAttachmentErrors(nextErrors);
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.currentTarget.files) handleFileSelection(event.currentTarget.files);
    event.currentTarget.value = "";
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files);
  }

  function validateForm(): FormErrors {
    const nextErrors: FormErrors = {};
    if (!subject.trim()) nextErrors.subject = "Enter a subject";
    else if (subject.length > 150) nextErrors.subject = "Subject must be 150 characters or fewer";
    if (!category) nextErrors.category = "Choose a category";
    if (!subCategory) nextErrors.subCategory = "Choose a sub-category";
    if (!description.trim()) nextErrors.description = "Enter a description";
    else if (description.trim().length < 20) nextErrors.description = "Description must be at least 20 characters";
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateForm();
    setErrors(nextErrors);
    setSubmitError("");
    const firstInvalidField = (["subject", "category", "subCategory", "description"] as FormField[])
      .find((field) => nextErrors[field]);
    if (firstInvalidField) {
      const fieldRefs = {
        subject: subjectRef,
        category: categoryRef,
        subCategory: subCategoryRef,
        description: descriptionRef,
      };
      fieldRefs[firstInvalidField].current?.focus();
      return;
    }

    const data: CreateTicketData = {
      subject: subject.trim(),
      description: description.trim(),
      category,
      subCategory,
      impact,
      urgency,
      priority,
      ...details,
      attachments: attachments.map((file) => file.name),
    };

    setIsSubmitting(true);
    try {
      const ticket = await createTicket(data);
      setCreatedTicket(ticket);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Something went wrong while raising your ticket.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function raiseAnotherTicket() {
    setCreatedTicket(null);
    setSubject("");
    setCategory("");
    setSubCategory("");
    setDescription("");
    setImpact("Medium");
    setUrgency("Medium");
    setDetails({ employeeId: "", department: "", phone: "", location: "" });
    setAttachments([]);
    setAttachmentErrors([]);
    setErrors({});
    setSubmitError("");
  }

  if (createdTicket) {
    return (
      <section className="mx-auto max-w-[720px] rounded-xl border border-[#D9E2EF] bg-white px-5 py-10 text-center shadow-[0_8px_24px_rgba(15,31,51,0.05)] sm:px-10 sm:py-14" aria-labelledby="ticket-success-heading">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#DCFCE7] text-[#166534]">
          <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4 4L19 6" />
          </svg>
        </span>
        <h1 id="ticket-success-heading" className="mt-5 text-2xl font-semibold tracking-tight text-[#0F1F33] sm:text-3xl">Ticket raised</h1>
        <p className="mt-3 text-sm text-[#5B6B80]">Your ticket number</p>
        <p className="mt-1 break-all text-2xl font-bold tracking-wide text-[#00448E] sm:text-3xl">{createdTicket.ticketNo}</p>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#5B6B80]">We&apos;ve emailed you the ticket number. You can track it in My Tickets.</p>
        <div className="mx-auto mt-8 grid w-full max-w-sm gap-3">
          <Link href="/requester-agni/tickets" className={`${themeClasses.primaryButton} min-h-12`}>View my tickets</Link>
          <button type="button" onClick={raiseAnotherTicket} className="min-h-12 rounded-xl border border-[#D9E2EF] bg-white px-4 text-sm font-semibold text-[#00448E] transition hover:bg-[#F4F7FB] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Raise another ticket</button>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-6">
        <p className="mb-1.5 text-sm font-medium text-[#00448E]">Requester portal</p>
        <h1 className="text-[1.8rem] font-semibold leading-tight tracking-tight text-[#0F1F33] sm:text-3xl">Raise a ticket</h1>
        <p className="mt-2 text-sm leading-6 text-[#5B6B80]">Tell us what you need help with and we&apos;ll get back to you.</p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="min-w-0 rounded-xl border border-[#D9E2EF] bg-white p-4 shadow-[0_8px_24px_rgba(15,31,51,0.05)] sm:p-7">
        <div className="space-y-6">
          <div>
            <TextField
              id="ticket-subject"
              name="subject"
              label="Subject"
              inputRef={subjectRef}
              value={subject}
              maxLength={150}
              required
              error={errors.subject}
              placeholder="Briefly describe the issue"
              labelAction={<span className="text-xs text-[#5B6B80]">{subject.length}/150</span>}
              onChange={(event) => {
                setSubject(event.target.value);
                updateFieldError("subject");
              }}
            />
            {suggestions.length > 0 && (
              <section aria-label="Knowledge base suggestions" className="mt-3 rounded-lg border border-[#D9E2EF] bg-[#F4F7FB] p-3">
                <h2 className="text-sm font-semibold text-[#0F1F33]">Maybe these help</h2>
                <ul className="mt-2 space-y-2">
                  {suggestions.map((article) => (
                    <li key={article.id}>
                      <Link href={`/requester-agni/kb/${article.id}`} target="_blank" rel="noreferrer" className="block rounded-md p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E] hover:bg-white">
                        <span className="block text-sm font-semibold text-[#00448E]">{article.title}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-[#5B6B80]">{article.summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="ticket-category" className="mb-2 block text-sm font-medium text-[#0F1F33]">Category</label>
              <select
                ref={categoryRef}
                id="ticket-category"
                value={category}
                onChange={handleCategoryChange}
                aria-invalid={Boolean(errors.category)}
                aria-describedby={errors.category ? "ticket-category-error" : undefined}
                className={getSelectClass(Boolean(errors.category))}
              >
                <option value="">Select a category</option>
                {Object.keys(ticketCategories).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <FieldError id="ticket-category" message={errors.category} />
            </div>
            <div>
              <label htmlFor="ticket-sub-category" className="mb-2 block text-sm font-medium text-[#0F1F33]">Sub-category</label>
              <select
                ref={subCategoryRef}
                id="ticket-sub-category"
                value={subCategory}
                onChange={(event) => {
                  setSubCategory(event.target.value);
                  updateFieldError("subCategory");
                }}
                disabled={!category}
                aria-invalid={Boolean(errors.subCategory)}
                aria-describedby={errors.subCategory ? "ticket-sub-category-error" : undefined}
                className={`${getSelectClass(Boolean(errors.subCategory))} disabled:cursor-not-allowed disabled:bg-[#F4F7FB] disabled:text-[#5B6B80]`}
              >
                <option value="">{category ? "Select a sub-category" : "Choose a category first"}</option>
                {availableSubCategories.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <FieldError id="ticket-sub-category" message={errors.subCategory} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex min-h-5 items-center justify-between gap-3">
              <label htmlFor="ticket-description" className="block text-sm font-medium text-[#0F1F33]">Description</label>
              <span className="text-xs text-[#5B6B80]">{description.length} characters (minimum 20)</span>
            </div>
            <textarea
              ref={descriptionRef}
              id="ticket-description"
              name="description"
              rows={5}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                updateFieldError("description");
              }}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={errors.description ? "ticket-description-error" : undefined}
              placeholder="Include details that will help us understand and resolve the issue."
              className={`w-full resize-y rounded-xl border bg-white px-3.5 py-3 text-base leading-6 text-[#0F1F33] outline-none transition placeholder:text-[#5B6B80] focus-visible:border-[#00448E] focus-visible:ring-2 focus-visible:ring-[#00448E]/25 aria-invalid:border-[#b33b38] aria-invalid:focus-visible:ring-[#b33b38]/20 ${errors.description ? "border-[#b33b38]" : "border-[#D9E2EF]"}`}
            />
            <FieldError id="ticket-description" message={errors.description} />
          </div>

          <section aria-labelledby="impact-heading">
            <h2 id="impact-heading" className="mb-3 text-sm font-semibold text-[#0F1F33]">Impact and urgency</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              {(["impact", "urgency"] as const).map((field) => (
                <div key={field}>
                  <label htmlFor={`ticket-${field}`} className="mb-2 block text-sm font-medium text-[#0F1F33]">{field === "impact" ? "Impact" : "Urgency"}</label>
                  <select id={`ticket-${field}`} value={field === "impact" ? impact : urgency} onChange={(event) => field === "impact" ? setImpact(event.target.value as TicketImpact) : setUrgency(event.target.value as TicketImpact)} className={getSelectClass(false)}>
                    {impactOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-[#F4F7FB] px-4 py-3">
              <span className="text-sm font-medium text-[#0F1F33]">Priority</span>
              <PriorityBadge priority={priority} />
              <span className="text-xs text-[#5B6B80]">Calculated from impact and urgency</span>
            </div>
          </section>

          <section aria-labelledby="attachments-heading">
            <h2 id="attachments-heading" className="mb-2 text-sm font-semibold text-[#0F1F33]">Attachments <span className="font-normal text-[#5B6B80]">(optional)</span></h2>
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip" onChange={handleFileInputChange} className="sr-only" aria-label="Choose attachment files" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex min-h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E] ${isDragging ? "border-[#00448E] bg-[#E6EEF8]" : "border-[#B8C8DB] bg-[#F4F7FB] hover:border-[#00448E] hover:bg-[#E6EEF8]/60"}`}
            >
              <svg aria-hidden="true" className="mb-2 h-7 w-7 text-[#00448E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4m0 0L8 8m4-4 4 4" />
                <path d="M20 16.5v2A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-2" />
              </svg>
              <span className="text-sm font-semibold text-[#0F1F33]">Drag files here or click to browse</span>
              <span className="mt-1 text-xs leading-5 text-[#5B6B80]">Up to 5 files, 10 MB each. PDF, images, Office files, TXT or ZIP.</span>
            </button>
            {attachmentErrors.length > 0 && (
              <ul className="mt-2 space-y-1" role="alert" aria-live="polite">
                {attachmentErrors.map((message, index) => <li key={`${message}-${index}`} className="text-sm text-[#a52d2a]">{message}</li>)}
              </ul>
            )}
            {attachments.length > 0 && (
              <ul className="mt-3 space-y-2" aria-label="Selected attachments">
                {attachments.map((file, index) => (
                  <li key={`${file.name}-${file.lastModified}-${index}`} className="flex min-h-14 min-w-0 items-center gap-3 rounded-lg border border-[#D9E2EF] px-3 py-2">
                    <svg aria-hidden="true" className="h-5 w-5 shrink-0 text-[#00448E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <span className="min-w-0 flex-1">
                      <span className="block break-all text-sm font-medium text-[#0F1F33]">{file.name}</span>
                      <span className="block text-xs text-[#5B6B80]">{formatFileSize(file.size)}</span>
                    </span>
                    <button type="button" onClick={() => setAttachments((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Remove ${file.name}`} className="grid h-12 w-12 shrink-0 place-items-center rounded-lg text-[#5B6B80] transition hover:bg-[#F4F7FB] hover:text-[#a52d2a] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#00448E]">
                      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <details className="group rounded-xl border border-[#D9E2EF] px-4">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#0F1F33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E] [&::-webkit-details-marker]:hidden">
              More details (optional)
              <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-[#5B6B80] transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 7.5 5 5 5-5" /></svg>
            </summary>
            <div className="grid gap-5 border-t border-[#D9E2EF] py-5 sm:grid-cols-2">
              <TextField id="employee-id" label="Employee ID" value={details.employeeId} onChange={(event) => setDetails((current) => ({ ...current, employeeId: event.target.value }))} placeholder="Your employee ID" />
              <TextField id="department" label="Department" value={details.department} onChange={(event) => setDetails((current) => ({ ...current, department: event.target.value }))} placeholder="Your department" />
              <TextField id="phone" label="Phone" type="tel" inputMode="tel" value={details.phone} onChange={(event) => setDetails((current) => ({ ...current, phone: event.target.value }))} placeholder="A number we can reach you at" />
              <TextField id="location" label="Location" value={details.location} onChange={(event) => setDetails((current) => ({ ...current, location: event.target.value }))} placeholder="Building, floor or room" />
            </div>
          </details>
        </div>

        {submitError && <p className="mt-5 rounded-lg border border-[#f1c7c3] bg-[#fbf1ef] p-3 text-sm text-[#a52d2a]" role="alert">{submitError}</p>}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/requester-agni/dashboard" className="inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-sm font-semibold text-[#5B6B80] transition hover:bg-[#F4F7FB] hover:text-[#00448E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Cancel</Link>
          <PrimaryButton isLoading={isSubmitting} className="sm:w-auto sm:min-w-44">{isSubmitting ? "Submitting..." : "Submit ticket"}</PrimaryButton>
        </div>
      </form>
    </div>
  );
}
