import React from "react";

type GoogleSignInButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  variant?: 'icon' | 'full';
};

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  label = "Sign in with Google",
  disabled,
  className,
  variant = 'icon',
  ...rest
}) => {
  if (variant === 'full') {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        className={className || ''}
        style={{
          backgroundColor: '#FFFFFF',
          backgroundImage: 'none',
          border: '1px solid #747775',
          borderRadius: 4,
          boxSizing: 'border-box',
          color: '#1f1f1f',
          cursor: 'pointer',
          fontFamily: `'Roboto', Arial, sans-serif`,
          fontSize: 14,
          height: 40,
          letterSpacing: '0.25px',
          outline: 'none',
          overflow: 'hidden',
          padding: '0 12px',
          position: 'relative',
          textAlign: 'center',
          verticalAlign: 'middle',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.6 : 1,
        }}
        {...rest}
      >
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          aria-hidden="true"
          focusable="false"
          style={{ width: 18, height: 18, display: 'block' }}
        >
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      className={`
        group
        relative
        flex items-center justify-center
        w-10 h-10 max-w-[400px] min-w-min
        bg-[#f2f2f2] text-[#1f1f1f]
        font-['Roboto',Arial,sans-serif] text-[14px] font-normal
        rounded-[20px] border-none outline-none overflow-hidden
        cursor-pointer transition duration-200 ease-in-out
        select-none whitespace-nowrap align-middle p-0 text-center shadow-none
        focus:ring-2 focus:ring-[#001d35]/20
        disabled:cursor-default disabled:bg-[#ffffff61]
        ${className || ''}
      `}
      style={{
        letterSpacing: '0.25px',
        WebkitAppearance: 'none',
      }}
      {...rest}
    >
      <span
        aria-hidden
        className={`
          pointer-events-none
          absolute inset-0
          transition-opacity duration-200
          bg-[#001d35]
          opacity-0
          rounded-[20px]
          ${disabled ? 'bg-[#1f1f1f1f] opacity-100' : ''}
          group-active:opacity-10
          group-focus:opacity-10
          group-hover:opacity-5
        `}
        data-testid="gsi-material-button-state"
      />
      <span className="flex flex-row items-center justify-center w-full h-full relative">
        <span className={`flex items-center justify-center h-7 w-7 min-w-[20px] p-0 ${disabled ? 'opacity-40' : ''}`}>
          <svg
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 48 48"
            style={{ display: 'block' }}
            className="h-7 w-7"
            aria-hidden="true"
            focusable="false"
          >
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            <path fill="none" d="M0 0h48v48H0z" />
          </svg>
        </span>
        <span className="sr-only">{label}</span>
      </span>
    </button>
  );
};

export default GoogleSignInButton;