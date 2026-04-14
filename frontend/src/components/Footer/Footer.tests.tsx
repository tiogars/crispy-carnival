import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Footer } from './index';

describe('Footer', () => {
  it('renders the footer copy', () => {
    render(<Footer />);

    expect(screen.getByText('Copyright Tiogars 2026')).toBeTruthy();
    expect(screen.getByText('Powered by React, Vite, TypeScript, and Material UI')).toBeTruthy();
  });
});
