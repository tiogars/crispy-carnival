import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';

type FilmSequenceCompositionProps = {
  frameUrls: string[];
};

export const FilmSequenceComposition = ({ frameUrls }: FilmSequenceCompositionProps) => {
  const frame = useCurrentFrame();

  if (frameUrls.length === 0) {
    return (
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f1114',
          color: '#f5f7fa',
          fontSize: 36,
          fontFamily: 'sans-serif',
        }}
      >
        No frame available for this reel.
      </AbsoluteFill>
    );
  }

  const frameIndex = Math.min(frame, frameUrls.length - 1);
  const opacity = interpolate(frame % 12, [0, 11], [0.88, 1]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <Img
        src={frameUrls[frameIndex]}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          opacity,
        }}
      />
    </AbsoluteFill>
  );
};
