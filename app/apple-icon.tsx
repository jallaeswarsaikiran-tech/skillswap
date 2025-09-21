// Never use @iconify/react inside this file.
import { ImageResponse } from 'next/og';

// Image metadata
export const size = {
  width: 180,
  height: 180,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #f59e0b 100%)',
          color: 'white',
          fontSize: 96,
          fontWeight: 800,
          letterSpacing: '-0.04em',
        }}
      >
        SS
      </div>
    ),
    {
      ...size,
    }
  );
} 