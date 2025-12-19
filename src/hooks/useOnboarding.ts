import { useEffect, useState } from 'react';
import introJs from 'intro.js';
import 'intro.js/introjs.css';
import '../introjs-custom.css';

export interface OnboardingStep {
  element?: string;
  intro: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'top-middle-aligned' | 'bottom-middle-aligned';
  title?: string;
}

export const useOnboarding = (steps: OnboardingStep[], tourId: string, options?: { onComplete?: () => void; onExit?: () => void }) => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  useEffect(() => {
    // Check if user has completed this tour before
    const completedTours = JSON.parse(localStorage.getItem('completedOnboardingTours') || '[]');
    setIsOnboardingComplete(completedTours.includes(tourId));
  }, [tourId]);

  const startTour = () => {
    const intro = introJs();

    intro.setOptions({
      steps,
      showProgress: true,
      showBullets: true,
      exitOnOverlayClick: false,
      exitOnEsc: true,
      nextLabel: 'Next',
      prevLabel: 'Back',
      doneLabel: tourId === 'simulation' ? 'Start' : 'Done',
      skipLabel: 'Skip',
      hidePrev: false, // Changed from true to allow going back
      hideNext: false, // Changed from true to ensure 'Start' button shows on last step
      tooltipClass: 'custom-intro-tooltip',
      highlightClass: 'custom-intro-highlight',
      scrollToElement: true,
      scrollPadding: 50,
    });

    intro.oncomplete(() => {
      // Mark this tour as completed
      const completedTours = JSON.parse(localStorage.getItem('completedOnboardingTours') || '[]');
      if (!completedTours.includes(tourId)) {
        completedTours.push(tourId);
        localStorage.setItem('completedOnboardingTours', JSON.stringify(completedTours));
        setIsOnboardingComplete(true);
      }
      if (options?.onComplete) options.onComplete();
    });

    intro.onexit(() => {
      // Mark as completed even if skipped
      const completedTours = JSON.parse(localStorage.getItem('completedOnboardingTours') || '[]');
      if (!completedTours.includes(tourId)) {
        completedTours.push(tourId);
        localStorage.setItem('completedOnboardingTours', JSON.stringify(completedTours));
        setIsOnboardingComplete(true);
      }
      if (options?.onExit) options.onExit();
    });

    intro.start();
  };

  const resetTour = () => {
    const completedTours = JSON.parse(localStorage.getItem('completedOnboardingTours') || '[]');
    const filteredTours = completedTours.filter((id: string) => id !== tourId);
    localStorage.setItem('completedOnboardingTours', JSON.stringify(filteredTours));
    setIsOnboardingComplete(false);
  };

  return {
    startTour,
    resetTour,
    isOnboardingComplete,
  };
};