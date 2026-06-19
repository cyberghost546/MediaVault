// =============================================================================
// Button Component
// A reusable button with multiple visual variants (solid, outline, ghost)
// and sizes (sm, md, lg). Uses "class-variance-authority" (cva) to keep
// variant logic clean and readable.
// =============================================================================

// "use client" tells Next.js this component runs in the browser, not on the server.
// WHY: Components that handle user interactions (clicks) must be client components.
'use client'

// "cva" (class-variance-authority) generates Tailwind class strings based on
// props like "variant" and "size". It is much cleaner than a long chain of
// if/else statements or template literals.
import { cva, type VariantProps } from 'class-variance-authority'

// "clsx" merges multiple class strings together, ignoring falsy values.
import clsx from 'clsx'

// Import React types for typing props and children.
import type { ButtonHTMLAttributes, ReactNode } from 'react'


// =============================================================================
// buttonVariants
// Defines the Tailwind classes for each combination of variant + size.
// The first argument is the BASE classes that always apply.
// The "variants" object adds extra classes based on prop values.
// =============================================================================
const buttonVariants = cva(
  // BASE CLASSES — always present regardless of variant or size.
  // "inline-flex items-center justify-center" — centre the label and icon.
  // "rounded-lg font-medium" — rounded corners and bold text.
  // "transition-colors duration-150" — smooth color change on hover.
  // "focus-visible:outline-none focus-visible:ring-2" — accessibility: keyboard focus ring.
  // "disabled:opacity-50 disabled:cursor-not-allowed" — visual cue when button is disabled.
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium ' +
  'transition-colors duration-150 select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed',

  {
    variants: {

      // "variant" controls the button's visual style.
      variant: {

        // PRIMARY — solid blue background. Use for the main action on a page.
        primary:
          'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',

        // SECONDARY — outlined button. For secondary actions.
        secondary:
          'border border-brand-600 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950 ' +
          'dark:text-brand-400 dark:border-brand-400',

        // GHOST — no background or border. For low-emphasis actions like "Cancel".
        ghost:
          'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',

        // DANGER — red. For destructive actions like "Delete" or "Cancel Download".
        danger:
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',

        // SUCCESS — green. For positive confirmations.
        success:
          'bg-green-600 text-white hover:bg-green-700',
      },

      // "size" controls padding and font size.
      size: {
        sm:  'h-8  px-3 text-sm',   // small — for compact UIs
        md:  'h-10 px-4 text-sm',   // medium — the default
        lg:  'h-12 px-6 text-base', // large — for prominent CTAs
        icon:'h-10 w-10 p-0',       // square — for icon-only buttons
      },
    },

    // "defaultVariants" is what you get if you don't pass a variant or size prop.
    defaultVariants: {
      variant: 'primary',
      size:    'md',
    },
  }
)


// =============================================================================
// ButtonProps
// Extends the native HTML button element's attributes so our Button supports
// all standard props (onClick, type, disabled, aria-label, etc.)
// PLUS our custom "variant", "size", and "isLoading" props.
// =============================================================================
interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {

  // If true, show a spinner and disable the button.
  isLoading?: boolean

  // An optional icon rendered before the label text.
  leftIcon?: ReactNode

  // An optional icon rendered after the label text.
  rightIcon?: ReactNode
}


// =============================================================================
// Button Component
// "React.FC" means "React Function Component" — just a function that returns JSX.
// We use plain function syntax here which is equivalent.
// =============================================================================
export function Button({
  children,   // The text or elements inside the button
  className,  // Extra Tailwind classes the caller can pass in
  variant,    // Which visual style to use
  size,       // Which size to use
  isLoading,  // Whether to show a spinner
  leftIcon,   // Optional icon before text
  rightIcon,  // Optional icon after text
  disabled,   // Native disabled attribute
  ...props    // All other standard button attributes (onClick, type, etc.)
}: ButtonProps) {

  return (
    <button
      // "clsx" merges our generated classes with any extra className from the caller.
      // "buttonVariants({ variant, size })" generates the right Tailwind classes.
      className={clsx(buttonVariants({ variant, size }), className)}

      // The button is disabled if "disabled" is true OR if it is loading.
      // WHY: A loading button should not be clickable again.
      disabled={disabled ?? isLoading}

      // Spread remaining props (onClick, type, aria-*, data-*, etc.)
      {...props}
    >
      {/* Show a spinning SVG when isLoading is true */}
      {isLoading && (
        // "animate-spin" is a Tailwind utility that rotates the element 360°.
        // "shrink-0" prevents it from shrinking in flex containers.
        <svg
          className="h-4 w-4 animate-spin shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"  // Screen readers skip decorative elements
        >
          {/* Outer circle (track) */}
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4"
          />
          {/* Spinning arc */}
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}

      {/* Left icon (only shown when NOT loading — the spinner replaces it) */}
      {!isLoading && leftIcon && (
        <span className="shrink-0">{leftIcon}</span>
      )}

      {/* The button label (text or child elements) */}
      {children}

      {/* Right icon */}
      {rightIcon && (
        <span className="shrink-0">{rightIcon}</span>
      )}
    </button>
  )
}
