import * as React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ value, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={`relative h-2 w-full rounded-full bg-muted overflow-hidden ${className ?? ""}`}
      {...props}
    >
      <div
        className="absolute left-0 top-0 h-full bg-indigo-700 transition-all duration-300"
        style={{ width: `${value}%` }}
      />
    </div>
  );
});
Progress.displayName = "Progress";

export default Progress; 