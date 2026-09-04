import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
    // Prevent browser from restoring previous scroll position
    window.history.scrollRestoration = 'manual';

    // Scroll to the top of the page
    window.scrollTo(0, 0);

    return () => {
      // Restore default behavior when component unmounts
      window.history.scrollRestoration = 'auto';
    };
  }, [pathname]);

  return null;
};

export default ScrollToTop;