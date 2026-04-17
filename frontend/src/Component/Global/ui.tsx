import * as React from "react";

// ---------- Button ----------
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "primary";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "default",
  size = "md",
  className = "",
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900";
  const variants: Record<string, string> = {
    default:
      "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:opacity-50",
    ghost: "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300",
    primary:
      "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:opacity-50",
  };
  const sizes: Record<string, string> = {
    sm: "px-2 py-1 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// ---------- Input ----------
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// ---------- Label ----------
export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label: React.FC<LabelProps> = ({ className = "", ...props }) => {
  return (
    <label
      className={`block text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
      {...props}
    />
  );
};

// ---------- Badge ----------
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "secondary";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "secondary",
  className = "",
  ...props
}) => {
  const variants: Record<string, string> = {
    primary: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-400",
    secondary: "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

// ---------- Textarea ----------
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// ---------- Card ----------
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = "",
  ...props
}) => (
  <div
    className={`rounded-xl shadow-sm p-4 bg-white dark:bg-gray-800 ${className}`}
    {...props}
  />
);

export const CardHeader: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className = "", ...props }) => (
  <div className={`mb-2 ${className}`} {...props} />
);

export const CardTitle: React.FC<
  React.HTMLAttributes<HTMLHeadingElement>
> = ({ className = "", ...props }) => (
  <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`} {...props} />
);

export const CardContent: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className = "", ...props }) => (
  <div className={`space-y-2 ${className}`} {...props} />
);
