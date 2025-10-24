import { Handle, NodeProps, Position } from '@xyflow/react';

interface ShapeNodeData {
  shape: 'rectangle' | 'circle' | 'triangle' | 'diamond';
  width: number;
  height: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export function ShapeNode({ data }: NodeProps) {
  const nodeData = data as unknown as ShapeNodeData;

  const renderShape = () => {
    const { shape, width, height, fillColor = '#3b82f6', strokeColor = '#1e40af', strokeWidth = 2 } = nodeData;

    const commonProps = {
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth,
      className: "transition-all duration-200 hover:opacity-80"
    };

    switch (shape) {
      case 'circle':
        return (
          <circle
            cx={width / 2}
            cy={height / 2}
            r={Math.min(width, height) / 2 - strokeWidth}
            {...commonProps}
          />
        );
      case 'triangle':
        const trianglePoints = `${width / 2},${strokeWidth} ${strokeWidth},${height - strokeWidth} ${width - strokeWidth},${height - strokeWidth}`;
        return (
          <polygon
            points={trianglePoints}
            {...commonProps}
          />
        );
      case 'diamond':
        const diamondPoints = `${width / 2},${strokeWidth} ${width - strokeWidth},${height / 2} ${width / 2},${height - strokeWidth} ${strokeWidth},${height / 2}`;
        return (
          <polygon
            points={diamondPoints}
            {...commonProps}
          />
        );
      default: // rectangle
        return (
          <rect
            x={strokeWidth}
            y={strokeWidth}
            width={width - strokeWidth * 2}
            height={height - strokeWidth * 2}
            {...commonProps}
          />
        );
    }
  };

  return (
    <div className="relative group">
      <svg
        width={nodeData.width}
        height={nodeData.height}
        className="shadow-lg hover:shadow-xl transition-shadow duration-200"
      >
        {renderShape()}
      </svg>

      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Left}
        className="w-3 h-3 !bg-primary border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-primary border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </div>
  );
}