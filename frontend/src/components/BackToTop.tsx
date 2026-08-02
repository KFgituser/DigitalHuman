import { useEffect, useRef, useState } from 'react';
import '../styles/back-to-top.css';
import { useI18n } from '../i18n';

const THRESHOLD = 200;

type BackToTopProps = {
  containerRef?: React.RefObject<HTMLElement | null>;
};

export default function BackToTop({ containerRef }: BackToTopProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const rafRef = useRef(0);

  useEffect(() => {
    const getScrollTop = () => {
      if (containerRef?.current) {
        return containerRef.current.scrollTop;
      }
      return window.scrollY;
    };

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setVisible(getScrollTop() > THRESHOLD);
      });
    };

    const target = containerRef?.current ?? window;
    target.addEventListener('scroll', onScroll as EventListener, { passive: true });
    onScroll();

    return () => {
      target.removeEventListener('scroll', onScroll as EventListener);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef]);

  const scrollTop = () => {
    try {
      if (containerRef?.current) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      if (containerRef?.current) {
        containerRef.current.scrollTop = 0;
      } else {
        window.scrollTo(0, 0);
      }
    }
  };

  if (!visible) return null;

  return (
    <button className="back-to-top" onClick={scrollTop} aria-label={t('backToTop.label')} type="button">
      <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 5h10v2H7z" />
        <path d="M12 6l-6 6h4v6h4v-6h4z" />
      </svg>
    </button>
  );
}
