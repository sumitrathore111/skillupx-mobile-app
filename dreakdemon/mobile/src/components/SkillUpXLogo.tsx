import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

interface Props {
  size?: number;
}

export default function SkillUpXLogo({ size = 80 }: Props) {
  const scale = size / 145;
  const width = 181 * scale;
  const height = 145 * scale;

  return (
    <Svg width={width} height={height} viewBox="0 0 181 145" fill="none">
      <Rect x="28" y="83.001" width="102" height="35" rx="17.5" transform="rotate(-54.4625 28 83.001)" fill="url(#g1)" />
      <Rect x="56" y="124.001" width="102" height="35" rx="17.5" transform="rotate(-54.4625 56 124.001)" fill="url(#g2)" />
      <Rect y="124.481" width="35" height="35" rx="17.5" transform="rotate(-54.4625 0 124.481)" fill="url(#g3)" />
      <Rect x="132" y="123.481" width="35" height="35" rx="17.5" transform="rotate(-54.4625 132 123.481)" fill="url(#g4)" />
      <Defs>
        <LinearGradient id="g1" x1="108.785" y1="83.001" x2="92.6569" y2="132.787" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#63F6FF" />
          <Stop offset="1" stopColor="#C4C4C4" />
        </LinearGradient>
        <LinearGradient id="g2" x1="136.785" y1="124.001" x2="120.657" y2="173.787" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#63F6FF" />
          <Stop offset="1" stopColor="#C4C4C4" />
        </LinearGradient>
        <LinearGradient id="g3" x1="27.7204" y1="124.481" x2="0.260456" y2="153.567" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#63F6FF" />
          <Stop offset="1" stopColor="#C4C4C4" />
        </LinearGradient>
        <LinearGradient id="g4" x1="159.72" y1="123.481" x2="132.26" y2="152.567" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#63F6FF" />
          <Stop offset="1" stopColor="#C4C4C4" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}
