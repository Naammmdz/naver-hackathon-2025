interface LogoProps {
  size?: number;
  className?: string;
}

export function DevHolicLogo({ size = 32, className = "" }: LogoProps) {
  return (
    <img 
      src="/DevHolic-demo.png" 
      alt="DevHolic Logo" 
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
    />
  );
}

interface IconProps {
  size?: number;
  className?: string;
}

export function DevHolicIcon({ size = 32, className = "" }: IconProps) {
  return (
    <img 
      src="/DevHolic-demo.png" 
      alt="DevHolic Icon" 
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

interface LogoWithTextProps {
  className?: string;
}

export function DevHolicLogoWithText({ className = "" }: LogoWithTextProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DevHolicIcon size={32} />
      <span className="text-lg font-semibold text-primary">DevHolic</span>
    </div>
  );
}
