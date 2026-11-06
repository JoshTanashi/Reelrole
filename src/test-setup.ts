import '@testing-library/jest-dom/vitest';

// jsdom lacks element scrolling.
if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
