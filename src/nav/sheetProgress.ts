import { motionValue } from 'motion/react';

/** 0 = no sheet, 1 = sheet at its main detent. Drives the iOS card-modal scale of the app behind. */
export const sheetProgress = motionValue(0);
/** Live top edge of the open sheet in px (viewport coords). Lets the poster flight land *with* the sheet. */
export const sheetTop = motionValue(typeof window === 'undefined' ? 844 : window.innerHeight);
