import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

/** HANDOVER §5.6. Native via Capacitor; Android web falls back to vibrate; iOS Safari has no haptics API (no-op). */
const native = Capacitor.isNativePlatform();
let enabled = true;
export const setHapticsEnabled = (v: boolean) => {
  enabled = v;
};

const vib = (ms: number | number[]) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(ms);
};

export const haptics = {
  selection() {
    if (!enabled) return;
    if (native) void Haptics.selectionChanged();
    else vib(4);
  },
  light() {
    if (!enabled) return;
    if (native) void Haptics.impact({ style: ImpactStyle.Light });
    else vib(8);
  },
  medium() {
    if (!enabled) return;
    if (native) void Haptics.impact({ style: ImpactStyle.Medium });
    else vib(14);
  },
  heavy() {
    if (!enabled) return;
    if (native) void Haptics.impact({ style: ImpactStyle.Heavy });
    else vib(24);
  },
  success() {
    if (!enabled) return;
    if (native) void Haptics.notification({ type: NotificationType.Success });
    else vib([10, 40, 18]);
  },
};
