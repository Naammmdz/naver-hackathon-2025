interface LogoProps {
  size?: number;
  className?: string;
}

export function DevFlowLogo({ size = 32, className = "" }: LogoProps) {
  return (
    <img 
      src="/src/assets/logos/devflow-logo.png" 
      alt="DevFlow Logo" 
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

interface IconProps {
  size?: number;
  className?: string;
}

export function DevFlowIcon({ size = 32, className = "" }: IconProps) {
  return (
    <img 
      src="/src/assets/logos/devflow-icon.png" 
      alt="DevFlow Icon" 
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

export function DevFlowLogoWithText({ className = "" }: LogoWithTextProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <DevFlowIcon size={32} />
      <span className="text-lg font-semibold text-primary">DevFlow</span>
    </div>
  );
}
