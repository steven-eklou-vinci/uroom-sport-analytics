
import React from 'react';
import styles from './Table.module.css';

type TableProps = {
  children: React.ReactNode;
  className?: string;
};

const Table = ({ children, className }: TableProps) => {
  return (
    <table className={className ? `${styles.table} ${className}` : styles.table}>
      {children}
    </table>
  );
};

export default Table;
