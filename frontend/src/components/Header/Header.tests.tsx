import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Header } from './index';

afterEach(cleanup);

describe('Header', () => {
  it('calls the theme toggle handler', () => {
    const handleToggleTheme = vi.fn();

    render(
      <Header
        themeMode="light"
        showSeededFavorite={true}
        onToggleTheme={handleToggleTheme}
        onToggleSeededFavorite={() => undefined}
      />,
    );

    fireEvent.click(screen.getByLabelText('Toggle theme'));

    expect(handleToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('calls the seeded favorite toggle handler when the mobile switch is changed', () => {
    const handleToggleSeededFavorite = vi.fn();

    render(
      <Header
        themeMode="light"
        showSeededFavorite={true}
        onToggleTheme={() => undefined}
        onToggleSeededFavorite={handleToggleSeededFavorite}
      />,
    );

    fireEvent.click(screen.getByLabelText('Toggle seeded favorite'));

    expect(handleToggleSeededFavorite).toHaveBeenCalledTimes(1);
  });

  it('renders the GitHub repository and issue actions in the header', () => {
    render(
      <Header
        themeMode="light"
        showSeededFavorite={true}
        onToggleTheme={() => undefined}
        onToggleSeededFavorite={() => undefined}
      />,
    );

    expect(screen.getByLabelText('Open GitHub repository').getAttribute('href')).toBe(
      'https://github.com/tiogars/crispy-carnival',
    );
    expect(screen.getByLabelText('Create GitHub issue').getAttribute('href')).toBe(
      'https://github.com/tiogars/crispy-carnival/issues/new',
    );
  });
});
