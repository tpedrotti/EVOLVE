import { useEffect, useRef, type RefObject } from 'react';

export interface UseA11yDialogOptions {
  isOpen: boolean;
  onClose: () => void;
  onEscape?: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  isActive?: boolean; // For nested dialogs: only the topmost active dialog traps focus & handles Escape
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Custom hook to provide accessible modal dialog behavior:
 * - Focus trapping (Tab & Shift+Tab within container)
 * - Initial focus management
 * - Focus restoration to the opening trigger on close
 * - Body scroll locking
 * - Escape key interception with support for nested/stacked dialogs
 */
export function useA11yDialog<T extends HTMLElement = HTMLDivElement>({
  isOpen,
  onClose,
  onEscape,
  initialFocusRef,
  returnFocusRef,
  isActive = true,
}: UseA11yDialogOptions) {
  const containerRef = useRef<T>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  // 1. Remember triggering element on open, restore on close
  useEffect(() => {
    if (isOpen) {
      if (returnFocusRef?.current) {
        triggerElementRef.current = returnFocusRef.current;
      } else if (document.activeElement instanceof HTMLElement) {
        triggerElementRef.current = document.activeElement;
      }
    }
    return () => {
      // When modal closes, return focus to trigger
      if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        // Small delay to ensure DOM updates and no race conditions
        setTimeout(() => {
          triggerElementRef.current?.focus();
        }, 10);
      }
    };
  }, [isOpen, returnFocusRef]);

  // 2. Lock body scroll while dialog is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // 3. Initial focus on open
  useEffect(() => {
    if (!isOpen || !isActive) return;

    const timer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }

      if (containerRef.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          containerRef.current.focus();
        }
      }
    }, 30);

    return () => clearTimeout(timer);
  }, [isOpen, isActive, initialFocusRef]);

  // 4. Focus trapping and Escape key handler
  useEffect(() => {
    if (!isOpen || !isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        if (onEscape) {
          onEscape();
        } else {
          onClose();
        }
        return;
      }

      // Tab key navigation trapping
      if (e.key === 'Tab' && containerRef.current) {
        const focusables = Array.from(
          containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter((el) => {
          // Verify element is visible and not display:none
          return el.offsetParent !== null || el.getClientRects().length > 0;
        });

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !containerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !containerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, isActive, onClose, onEscape]);

  return { containerRef, triggerElementRef };
}
