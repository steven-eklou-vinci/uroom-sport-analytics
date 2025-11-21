
import React from 'react';
import styles from './Button.module.css';


type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
};

const Button = ({ variant = 'primary', children, className, ...props }: ButtonProps) => {
  return (
    <button
      className={[
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        className
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
