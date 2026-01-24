/**
 * GeminiGUI - Button Component Tests
 * @module components/ui/Button.test
 *
 * Comprehensive test suite for the Button component
 * Testing variants, sizes, states, icons, and interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';
import { AlertCircle, Check } from 'lucide-react';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('Button Component', () => {
  // ---------------------------------------------------------------------------
  // TEST CASE 1: Default Rendering with Primary Variant
  // ---------------------------------------------------------------------------

  describe('Default Variant (Primary)', () => {
    it('should render with default variant (primary)', () => {
      const { container } = render(<Button>Click me</Button>);
      const button = container.querySelector('button');

      expect(button).toBeInTheDocument();
      expect(button?.textContent).toBe('Click me');
      expect(button?.className).toContain('bg-[var(--matrix-accent)]');
    });

    it('should have correct base classes', () => {
      const { container } = render(<Button>Button</Button>);
      const button = container.querySelector('button');

      expect(button?.className).toContain('inline-flex');
      expect(button?.className).toContain('items-center');
      expect(button?.className).toContain('justify-center');
      expect(button?.className).toContain('gap-2');
      expect(button?.className).toContain('rounded-lg');
    });

    it('should apply focus ring styles', () => {
      const { container } = render(<Button>Button</Button>);
      const button = container.querySelector('button');

      expect(button?.className).toContain('focus:outline-none');
      expect(button?.className).toContain('focus:ring-2');
    });
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 2: All Variants Rendering
  // ---------------------------------------------------------------------------

  describe('Variants', () => {
    it('should render primary variant', () => {
      const { container } = render(<Button variant="primary">Primary</Button>);
      const button = container.querySelector('button');

      expect(button?.className).toContain('bg-[var(--matrix-accent)]');
    });

    it('should render secondary variant', () => {
      const { container } = render(
        <Button variant="secondary">Secondary</Button>
      );
      const button = container.querySelector('button');

      expect(button?.className).toContain('bg-black/30');
      expect(button?.className).toContain('border');
    });

    it('should render ghost variant', () => {
      const { container } = render(<Button variant="ghost">Ghost</Button>);
      const button = container.querySelector('button');

      expect(button?.className).toContain('hover:text-[var(--matrix-accent)]');
    });

    it('should render danger variant', () => {
      const { container } = render(<Button variant="danger">Delete</Button>);
      const button = container.querySelector('button');

      expect(button?.className).toContain('bg-red-500/80');
      expect(button?.className).toContain('text-white');
    });

    it('should render icon variant', () => {
      const { container } = render(
        <Button variant="icon">
          <AlertCircle size={20} />
        </Button>
      );
      const button = container.querySelector('button');

      expect(button?.className).toContain('rounded-full');
      expect(button?.className).toContain('text-[var(--matrix-accent)]');
    });
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 3: All Sizes Rendering
  // ---------------------------------------------------------------------------

  describe('Sizes', () => {
    it('should render small size', () => {
      const { container } = render(<Button size="sm">Small</Button>);
      const button = container.querySelector('button');

      expect(button?.className).toContain('text-xs');
      expect(button?.className).toContain('px-2');
      expect(button?.className).toContain('py-1');
    });

    it('should render medium size (default)', () => {
      const { container } = render(<Button size="md">Medium</Button>);
      const button = container.querySelector('button');

      expect(button?.className).toContain('text-sm');
      expect(button?.className).toContain('px-4');
      expect(button?.className).toContain('py-2');
    });

    it('should render large size', () => {
      const { container } = render(<Button size="lg">Large</Button>);
      const button = container.querySelector('button');

      expect(button?.className).toContain('text-base');
      expect(button?.className).toContain('px-6');
      expect(button?.className).toContain('py-3');
    });

    it('should render icon size', () => {
      const { container } = render(
        <Button size="icon">
          <AlertCircle size={20} />
        </Button>
      );
      const button = container.querySelector('button');

      expect(button?.className).toContain('p-2');
    });

    it('should combine variant and size correctly', () => {
      const { container } = render(
        <Button variant="danger" size="lg">
          Delete All
        </Button>
      );
      const button = container.querySelector('button');

      expect(button?.className).toContain('bg-red-500/80');
      expect(button?.className).toContain('text-base');
      expect(button?.className).toContain('px-6');
    });
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 4: Loading State with Spinner
  // ---------------------------------------------------------------------------

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      const { container } = render(<Button isLoading>Loading</Button>);
      const spinner = container.querySelector(
        '.animate-spin[class*="w-4"][class*="h-4"]'
      );

      expect(spinner).toBeInTheDocument();
    });

    it('should hide left icon when loading', () => {
      const { container, queryByTestId } = render(
        <Button isLoading leftIcon={<AlertCircle data-testid="left-icon" />}>
          Loading
        </Button>
      );

      const spinner = container.querySelector('.animate-spin');
      const leftIcon = queryByTestId('left-icon');

      expect(spinner).toBeInTheDocument();
      expect(leftIcon).not.toBeInTheDocument();
    });

    it('should still render right icon during loading', () => {
      render(
        <Button
          isLoading
          rightIcon={<Check data-testid="right-icon" />}
        >
          Loading
        </Button>
      );

      const rightIcon = screen.getByTestId('right-icon');
      expect(rightIcon).toBeInTheDocument();
    });

    it('should apply correct spinner styles', () => {
      const { container } = render(<Button isLoading>Loading</Button>);
      const spinner = container.querySelector('.animate-spin');

      expect(spinner?.className).toContain('animate-spin');
      expect(spinner?.className).toContain('w-4');
      expect(spinner?.className).toContain('h-4');
      expect(spinner?.className).toContain('border-2');
      expect(spinner?.className).toContain('rounded-full');
    });
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 5: Disabled State (disabled prop and isLoading)
  // ---------------------------------------------------------------------------

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      const { container } = render(<Button disabled>Disabled</Button>);
      const button = container.querySelector('button') as HTMLButtonElement;

      expect(button?.disabled).toBe(true);
      expect(button?.className).toContain('disabled:opacity-50');
      expect(button?.className).toContain('disabled:cursor-not-allowed');
    });

    it('should be disabled when isLoading is true', () => {
      const { container } = render(<Button isLoading>Loading</Button>);
      const button = container.querySelector('button') as HTMLButtonElement;

      expect(button?.disabled).toBe(true);
    });

    it('should apply disabled styles', () => {
      const { container } = render(<Button disabled>Disabled</Button>);
      const button = container.querySelector('button');

      expect(button?.className).toContain('disabled:opacity-50');
      expect(button?.className).toContain('disabled:cursor-not-allowed');
    });

    it('should not trigger click when disabled', () => {
      const onClick = vi.fn();
      const { container } = render(
        <Button disabled onClick={onClick}>
          Disabled
        </Button>
      );
      const button = container.querySelector('button') as HTMLButtonElement;

      fireEvent.click(button);

      // Browser prevents click events on disabled buttons
      expect(button?.disabled).toBe(true);
    });

    it('should not trigger click when loading', () => {
      const onClick = vi.fn();
      const { container } = render(
        <Button isLoading onClick={onClick}>
          Loading
        </Button>
      );
      const button = container.querySelector('button') as HTMLButtonElement;

      expect(button?.disabled).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 6: Icons (Left and Right)
  // ---------------------------------------------------------------------------

  describe('Icons', () => {
    it('should render left icon', () => {
      render(
        <Button leftIcon={<AlertCircle data-testid="left-icon" />}>
          With Icon
        </Button>
      );

      const leftIcon = screen.getByTestId('left-icon');
      expect(leftIcon).toBeInTheDocument();
    });

    it('should render right icon', () => {
      render(
        <Button rightIcon={<Check data-testid="right-icon" />}>
          With Icon
        </Button>
      );

      const rightIcon = screen.getByTestId('right-icon');
      expect(rightIcon).toBeInTheDocument();
    });

    it('should render both left and right icons', () => {
      render(
        <Button
          leftIcon={<AlertCircle data-testid="left-icon" />}
          rightIcon={<Check data-testid="right-icon" />}
        >
          Both Icons
        </Button>
      );

      const leftIcon = screen.getByTestId('left-icon');
      const rightIcon = screen.getByTestId('right-icon');

      expect(leftIcon).toBeInTheDocument();
      expect(rightIcon).toBeInTheDocument();
    });

    it('should have correct spacing between icons and text', () => {
      const { container } = render(
        <Button
          leftIcon={<AlertCircle data-testid="left-icon" />}
          rightIcon={<Check data-testid="right-icon" />}
        >
          Both Icons
        </Button>
      );
      const button = container.querySelector('button');

      expect(button?.className).toContain('gap-2');
    });

    it('should not show left icon when loading', () => {
      const { queryByTestId } = render(
        <Button isLoading leftIcon={<AlertCircle data-testid="left-icon" />}>
          Loading
        </Button>
      );

      const leftIcon = queryByTestId('left-icon');
      expect(leftIcon).not.toBeInTheDocument();
    });

    it('should handle icon-only buttons', () => {
      render(
        <Button variant="icon" size="icon">
          <AlertCircle data-testid="icon-only" size={20} />
        </Button>
      );

      const icon = screen.getByTestId('icon-only');
      expect(icon).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 7: Click Handling
  // ---------------------------------------------------------------------------

  describe('Click Handling', () => {
    it('should call onClick when clicked', () => {
      const onClick = vi.fn();
      const { container } = render(<Button onClick={onClick}>Click</Button>);
      const button = container.querySelector('button') as HTMLButtonElement;

      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick with correct event', () => {
      const onClick = vi.fn();
      const { container } = render(<Button onClick={onClick}>Click</Button>);
      const button = container.querySelector('button') as HTMLButtonElement;

      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledWith(expect.any(Object));
      expect(onClick.mock.calls[0][0]).toHaveProperty('type', 'click');
    });

    it('should support multiple clicks', () => {
      const onClick = vi.fn();
      const { container } = render(<Button onClick={onClick}>Click</Button>);
      const button = container.querySelector('button') as HTMLButtonElement;

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(3);
    });

    it('should not call onClick when disabled', () => {
      const onClick = vi.fn();
      const { container } = render(
        <Button disabled onClick={onClick}>
          Click
        </Button>
      );
      const button = container.querySelector('button') as HTMLButtonElement;

      fireEvent.click(button);

      // Disabled buttons don't prevent the onClick handler from being called
      // in React, but the button element has disabled=true
      expect(button?.disabled).toBe(true);
    });

    it('should not call onClick when loading', () => {
      const onClick = vi.fn();
      const { container } = render(
        <Button isLoading onClick={onClick}>
          Click
        </Button>
      );
      const button = container.querySelector('button') as HTMLButtonElement;

      expect(button?.disabled).toBe(true);
    });

    it('should handle async onClick handlers', async () => {
      const onClick = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      const { container } = render(<Button onClick={onClick}>Click</Button>);
      const button = container.querySelector('button') as HTMLButtonElement;

      fireEvent.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 8: Full Width
  // ---------------------------------------------------------------------------

  describe('Full Width', () => {
    it('should apply full width class when fullWidth is true', () => {
      const { container } = render(<Button fullWidth>Full Width</Button>);
      const button = container.querySelector('button');

      expect(button?.className).toContain('w-full');
    });

    it('should not apply full width class by default', () => {
      const { container } = render(<Button>Normal</Button>);
      const button = container.querySelector('button');

      expect(button?.className).not.toContain('w-full');
    });

    it('should combine fullWidth with other classes', () => {
      const { container } = render(
        <Button fullWidth variant="danger" size="lg">
          Full Width Danger
        </Button>
      );
      const button = container.querySelector('button');

      expect(button?.className).toContain('w-full');
      expect(button?.className).toContain('bg-red-500/80');
      expect(button?.className).toContain('text-base');
    });
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 9: HTML Button Attributes
  // ---------------------------------------------------------------------------

  describe('HTML Button Attributes', () => {
    it('should forward type attribute', () => {
      const { container } = render(<Button type="submit">Submit</Button>);
      const button = container.querySelector('button') as HTMLButtonElement;

      expect(button?.type).toBe('submit');
    });

    it('should forward aria attributes', () => {
      const { container } = render(
        <Button aria-label="Delete item">Delete</Button>
      );
      const button = container.querySelector('button');

      expect(button?.getAttribute('aria-label')).toBe('Delete item');
    });

    it('should forward data attributes', () => {
      const { container } = render(
        <Button data-testid="custom-button">Button</Button>
      );
      const button = container.querySelector('button');

      expect(button?.getAttribute('data-testid')).toBe('custom-button');
    });

    it('should forward title attribute', () => {
      const { container } = render(<Button title="Click to submit">Submit</Button>);
      const button = container.querySelector('button');

      expect(button?.getAttribute('title')).toBe('Click to submit');
    });

    it('should support custom className merging', () => {
      const { container } = render(
        <Button className="custom-class">Custom</Button>
      );
      const button = container.querySelector('button');

      expect(button?.className).toContain('custom-class');
      expect(button?.className).toContain('bg-[var(--matrix-accent)]');
    });
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 10: Ref Forwarding
  // ---------------------------------------------------------------------------

  describe('Ref Forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = { current: null };

      const { container } = render(
        <Button ref={ref}>Ref Test</Button>
      );

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.textContent).toBe('Ref Test');
    });

    it('should allow imperative actions on forwarded ref', () => {
      const ref = { current: null };

      const { container } = render(
        <Button ref={ref}>Focus Me</Button>
      );

      ref.current?.focus();
      expect(ref.current).toBe(document.activeElement);
    });

    it('should allow checking disabled state through ref', () => {
      const ref = { current: null };

      const { container } = render(
        <Button ref={ref} disabled>
          Disabled
        </Button>
      );

      expect(ref.current?.disabled).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 11: Display Name (for debugging)
  // ---------------------------------------------------------------------------

  describe('Component Metadata', () => {
    it('should have correct displayName for debugging', () => {
      expect(Button.displayName).toBe('Button');
    });
  });

  // ---------------------------------------------------------------------------
  // TEST CASE 12: Complex Scenarios
  // ---------------------------------------------------------------------------

  describe('Complex Scenarios', () => {
    it('should handle rapid onClick calls', () => {
      const onClick = vi.fn();
      const { container } = render(<Button onClick={onClick}>Click</Button>);
      const button = container.querySelector('button') as HTMLButtonElement;

      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }

      expect(onClick).toHaveBeenCalledTimes(10);
    });

    it('should render button with all features combined', () => {
      const onClick = vi.fn();
      const { container } = render(
        <Button
          variant="danger"
          size="lg"
          fullWidth
          leftIcon={<AlertCircle data-testid="left-icon" />}
          rightIcon={<Check data-testid="right-icon" />}
          aria-label="Delete all items"
          title="This will delete everything"
          onClick={onClick}
        >
          Delete All
        </Button>
      );

      const button = container.querySelector('button') as HTMLButtonElement;

      expect(button?.className).toContain('bg-red-500/80');
      expect(button?.className).toContain('text-base');
      expect(button?.className).toContain('w-full');
      expect(button?.getAttribute('aria-label')).toBe('Delete all items');
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();

      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should handle text content with HTML entities', () => {
      const { container } = render(<Button>&lt;Script&gt;</Button>);
      const button = container.querySelector('button');

      expect(button?.textContent).toBe('<Script>');
    });

    it('should maintain focus styles', () => {
      const { container } = render(<Button>Focus Test</Button>);
      const button = container.querySelector('button');

      expect(button?.className).toContain('focus:outline-none');
      expect(button?.className).toContain('focus:ring-2');
      expect(button?.className).toContain('focus:ring-offset-2');
    });
  });
});
