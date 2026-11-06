import { motionValue } from 'motion/react';

/** 0 = no sheet, 1 = sheet at its main detent. Drives the iOS card-modal scale of the app behind. */
export const sheetProgress = motionValue(0);
