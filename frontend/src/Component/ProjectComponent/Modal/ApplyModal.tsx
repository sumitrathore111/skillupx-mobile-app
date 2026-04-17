// ApplicationModal.tsx
import { useCallback, useEffect, useRef, useState } from "react";

type FormData = {
    des: string;

};

type Props = {
    onClose: () => void;
    onSubmit?: (data: FormData) => Promise<void> | void;

};

export default function ApplyModal({

    onClose,
    onSubmit

}: Props) {
    const initialState: FormData = { des: "" };
    const [form, setForm] = useState<FormData>(initialState);
    const [errors, setErrors] = useState<Partial<Record<keyof FormData | "submit", string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const answerRef = useRef<HTMLTextAreaElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);



    // Close on Escape key
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const handleChange = useCallback(
        (k: keyof FormData, value: string) => {
            setForm((s) => ({ ...s, [k]: value }));
            setErrors((prev) => ({ ...prev, [k]: undefined }));
        },
        []
    );

    const validate = (data: FormData) => {
        const e: typeof errors = {};
        if (!data.des.trim()) e.des = "Please describe how you fit for this role.";
        return e;
    };

    const handleSubmit = async (ev?: React.FormEvent) => {
        ev?.preventDefault();
        setErrors({});
        const validation = validate(form);
        if (Object.keys(validation).length > 0) {
            setErrors(validation);
            answerRef.current?.focus();
            return;
        }

        setIsSubmitting(true);
        try {
            if (onSubmit) {
                await onSubmit(form);
            }
            setIsSubmitting(false);
            alert("Application submitted successfully!");
            onClose();
        } catch (err: any) {
            setIsSubmitting(false);
            setErrors({ submit: err?.message ?? "Failed to submit. Please try again." });
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            aria-modal="true"
            role="dialog"
            aria-labelledby="application-modal-title"
            onMouseDown={(e) => {
                // close when clicking the overlay (but not when clicking inside modal)
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                ref={modalRef}
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 ring-1 ring-black/5"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <header className="flex items-start justify-between gap-4">
                    <h2 id="application-modal-title" className="text-lg font-semibold text-gray-800">
                        Apply For Contribution
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label="Close"
                        title="Close"
                    >
                        ✕
                    </button>
                </header>

                <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            How do you fit for this role?
                        </label>
                        <textarea
                            ref={answerRef}
                            value={form.des}
                            onChange={(e) => handleChange("des", e.target.value)}
                            rows={5}
                            className={`w-full rounded-lg border px-3 py-2 text-gray-700 focus:ring-2 focus:outline-none ${errors.des ? "border-red-400 ring-red-100" : "border-gray-300 focus:ring-indigo-500"
                                }`}
                            placeholder="Tell us why you’re a great fit — your motivation, strengths, achievements..."
                            aria-invalid={!!errors.des}
                            aria-describedby={errors.des ? "answer-error" : undefined}
                        />
                        {errors.des && (
                            <p id="answer-error" className="mt-1 text-sm text-red-600">
                                {errors.des}    
                            </p>
                        )}
                        <label className=" text-sm font-medium text-green-700 mb-1">
                            Make Sure Your Profile Was Updated , You Profile is Visible to HR of This project , if your Prfile is not Updated than you Not get Selected for Contribution
                        </label>
                    </div>

                    {/* <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Highlight your key skills</label>
                        <input
                            value={form.skills}
                            onChange={(e) => handleChange("skills", e.target.value)}
                            type="text"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="e.g. React, Node.js, Problem Solving"
                        />
                    </div> */}

                    {/* <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Previous experience</label>
                        <textarea
                            value={form.experience}
                            onChange={(e) => handleChange("experience", e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="Briefly describe relevant experience..."
                        />
                    </div> */}

                    {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}

                    <footer className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-60 transition"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition"
                        >
                            {isSubmitting && (
                                <svg
                                    className="h-4 w-4 animate-spin"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                    />
                                </svg>
                            )}
                            <span>{isSubmitting ? "Submitting..." : "Submit Application"}</span>
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
}
