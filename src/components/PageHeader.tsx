import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

const PageHeader = ({ title, subtitle, children }: PageHeaderProps) => (
  <div className="border-b border-border bg-card/50">
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="w-8 h-0.5 bg-primary mb-3" />
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground uppercase tracking-wide">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground font-body mt-1">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  </div>
);

export default PageHeader;
