import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Typed from 'typed.js';
import { Dropdown, Prompt } from './components';

declare global {
  interface Window {
    toggleMode?: () => void;
    openVideo?: () => void;
    closeVideo?: () => void;
    toggleHeader?: () => void;
  }
}

type CleanupFn = () => void;

export function initLandingPage() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const RESPONSIVE_WIDTH = 1024;
  const cleanupFns: CleanupFn[] = [];

  const collapseBtn = document.getElementById('collapse-btn');
  const collapseHeaderItems = document.getElementById('collapsed-header-items');
  const navToggle = document.querySelector<HTMLElement>('#nav-dropdown-toggle-0');
  const navDropdown = document.querySelector<HTMLElement>('#nav-dropdown-list-0');
  const themeToggleButton = document.getElementById('theme-toggle');

  if (!collapseBtn || !collapseHeaderItems || !navToggle || !navDropdown) {
    return () => {};
  }

  let isHeaderCollapsed = window.innerWidth < RESPONSIVE_WIDTH;
  let headerClickListenerBound = false;

  const onHeaderClickOutside = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (target && collapseHeaderItems.contains(target)) {
      return;
    }
    toggleHeader();
  };

  const toggleHeader = () => {
    if (isHeaderCollapsed) {
      collapseHeaderItems.classList.add('max-lg:!tw-opacity-100', 'tw-min-h-[90vh]');
      collapseHeaderItems.style.height = '90vh';
      collapseBtn.classList.remove('bi-list');
      collapseBtn.classList.add('bi-x', 'max-lg:tw-fixed');
      isHeaderCollapsed = false;

      document.body.classList.add('modal-open');

      window.setTimeout(() => {
        if (!headerClickListenerBound) {
          window.addEventListener('click', onHeaderClickOutside);
          headerClickListenerBound = true;
        }
      }, 1);
    } else {
      collapseHeaderItems.classList.remove('max-lg:!tw-opacity-100', 'tw-min-h-[90vh]');
      collapseHeaderItems.style.height = '0vh';
      collapseBtn.classList.remove('bi-x', 'max-lg:tw-fixed');
      collapseBtn.classList.add('bi-list');
      document.body.classList.remove('modal-open');

      isHeaderCollapsed = true;
      if (headerClickListenerBound) {
        window.removeEventListener('click', onHeaderClickOutside);
        headerClickListenerBound = false;
      }
    }
  };

  const openNavDropdown = () => {
    navDropdown.classList.add(
      'tw-opacity-100',
      'tw-scale-100',
      'max-lg:tw-min-h-[450px]',
      'tw-min-w-[320px]',
      'max-lg:!tw-h-fit',
    );
    navDropdown.setAttribute('data-open', 'true');
  };

  const closeNavDropdown = () => {
    if (navDropdown.matches(':hover')) {
      return;
    }
    navDropdown.classList.remove(
      'tw-opacity-100',
      'tw-scale-100',
      'max-lg:tw-min-h-[450px]',
      'tw-min-w-[320px]',
      'max-lg:!tw-h-fit',
    );
    navDropdown.setAttribute('data-open', 'false');
  };

  const navMouseLeave = () => {
    window.setTimeout(closeNavDropdown, 100);
  };

  const toggleNavDropdown = () => {
    if (navDropdown.getAttribute('data-open') === 'true') {
      closeNavDropdown();
    } else {
      openNavDropdown();
    }
  };

  const responsive = () => {
    if (!isHeaderCollapsed) {
      toggleHeader();
    }

    if (window.innerWidth > RESPONSIVE_WIDTH) {
      collapseHeaderItems.style.height = '';
      navToggle.addEventListener('mouseenter', openNavDropdown);
      navToggle.addEventListener('mouseleave', navMouseLeave);
    } else {
      isHeaderCollapsed = true;
      navToggle.removeEventListener('mouseenter', openNavDropdown);
      navToggle.removeEventListener('mouseleave', navMouseLeave);
    }
  };

  collapseBtn.addEventListener('click', toggleHeader);
  cleanupFns.push(() => collapseBtn.removeEventListener('click', toggleHeader));

  window.addEventListener('resize', responsive);
  cleanupFns.push(() => window.removeEventListener('resize', responsive));

  navToggle.addEventListener('click', toggleNavDropdown);
  cleanupFns.push(() => navToggle.removeEventListener('click', toggleNavDropdown));

  navDropdown.addEventListener('mouseleave', closeNavDropdown);
  cleanupFns.push(() => navDropdown.removeEventListener('mouseleave', closeNavDropdown));

  responsive();
  cleanupFns.push(() => {
    navToggle.removeEventListener('mouseenter', openNavDropdown);
    navToggle.removeEventListener('mouseleave', navMouseLeave);
  });

  const updateToggleModeBtn = () => {
    const toggleIcon = document.querySelector('#toggle-mode-icon');
    if (!toggleIcon) {
      return;
    }

    if (document.documentElement.classList.contains('dark')) {
      toggleIcon.classList.remove('bi-sun');
      toggleIcon.classList.add('bi-moon');
      window.localStorage.setItem('color-mode', 'dark');
    } else {
      toggleIcon.classList.add('bi-sun');
      toggleIcon.classList.remove('bi-moon');
      window.localStorage.setItem('color-mode', 'light');
    }
  };

  const toggleMode = () => {
    document.documentElement.classList.toggle('dark');
    // Also toggle tw-dark for CSS variables
    document.documentElement.classList.toggle('tw-dark');
    updateToggleModeBtn();
  };

  const storedMode = window.localStorage.getItem('color-mode');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (storedMode === 'dark' || (!storedMode && prefersDark)) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.add('tw-dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.remove('tw-dark');
  }
  updateToggleModeBtn();

  window.toggleMode = toggleMode;
  cleanupFns.push(() => {
    if (window.toggleMode === toggleMode) {
      delete window.toggleMode;
    }
  });

  if (themeToggleButton) {
    themeToggleButton.addEventListener('click', toggleMode);
    cleanupFns.push(() => themeToggleButton.removeEventListener('click', toggleMode));
  }

  const promptWindow = new Prompt('#devflow-playground');
  const dropdowns = document.querySelectorAll<HTMLElement>('.dropdown');
  const dropdownInstances = Array.from(dropdowns).map(
    (dropdown) => new Dropdown(`#${dropdown.id}`, promptWindow.setAIModel.bind(promptWindow)),
  );
  cleanupFns.push(() => dropdownInstances.forEach((instance) => instance.destroy()));

  const promptForm = document.querySelector<HTMLFormElement>('#prompt-form');
  const promptInput = promptForm?.querySelector<HTMLInputElement>("input[name='prompt']");
  const signupPrompt = document.querySelector<HTMLElement>('#signup-prompt');
  const MAX_PROMPTS = 3;

  const handlePromptSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!promptInput) {
      return;
    }

    if (promptWindow.promptList.length >= MAX_PROMPTS) {
      return;
    }

    const value = promptInput.value.trim();
    if (!value) {
      return;
    }

    promptWindow.addPrompt(value);
    promptInput.value = '';

    if (promptWindow.promptList.length >= MAX_PROMPTS) {
      signupPrompt?.classList.add('tw-scale-100');
      signupPrompt?.classList.remove('tw-scale-0');
      promptForm?.querySelectorAll('input').forEach((input) => {
        input.disabled = true;
      });
    }
  };

  if (promptForm) {
    promptForm.addEventListener('submit', handlePromptSubmit);
    cleanupFns.push(() => promptForm.removeEventListener('submit', handlePromptSubmit));
  }

  const videoBg = document.querySelector<HTMLElement>('#video-container-bg');
  const videoContainer = document.querySelector<HTMLElement>('#video-container');

  const openVideo = () => {
    videoBg?.classList.remove('tw-scale-0', 'tw-opacity-0');
    videoBg?.classList.add('tw-scale-100', 'tw-opacity-100');
    videoContainer?.classList.remove('tw-scale-0');
    videoContainer?.classList.add('tw-scale-100');
    document.body.classList.add('modal-open');
  };

  const closeVideo = () => {
    videoContainer?.classList.add('tw-scale-0');
    videoContainer?.classList.remove('tw-scale-100');

    window.setTimeout(() => {
      videoBg?.classList.remove('tw-scale-100', 'tw-opacity-100');
      videoBg?.classList.add('tw-scale-0', 'tw-opacity-0');
    }, 400);

    document.body.classList.remove('modal-open');
  };

  window.openVideo = openVideo;
  window.closeVideo = closeVideo;
  cleanupFns.push(() => {
    if (window.openVideo === openVideo) {
      delete window.openVideo;
    }
    if (window.closeVideo === closeVideo) {
      delete window.closeVideo;
    }
  });

  // Initialize Typed.js only if element exists
  const promptsElement = document.querySelector('#prompts-sample');
  if (promptsElement) {
    const typed = new Typed('#prompts-sample', {
      strings: [
        "How to solve a rubik's cube? Step by step guide",
        "What's DevFlow playground?",
        'How to build an AI SaaS App?',
        'How to integrate DevFlow API?',
      ],
      typeSpeed: 80,
      smartBackspace: true,
      loop: true,
      backDelay: 2000,
    });
    cleanupFns.push(() => typed.destroy());
  }

  gsap.registerPlugin(ScrollTrigger);
  const gsapContext = gsap.context(() => {
    gsap.to('.reveal-up', {
      opacity: 0,
      y: '100%',
    });

    // Comment out dashboard animation as element doesn't exist
    // gsap.to('#dashboard', {
    //   scale: 1,
    //   translateY: 0,
    //   rotateX: '0deg',
    //   scrollTrigger: {
    //     trigger: '#hero-section',
    //     start: window.innerWidth > RESPONSIVE_WIDTH ? 'top 95%' : 'top 70%',
    //     end: 'bottom bottom',
    //     scrub: 1,
    //   },
    // });

    const sections = gsap.utils.toArray('section') as HTMLElement[];
    sections.forEach((section) => {
      const elements = section.querySelectorAll<HTMLElement>('.reveal-up');
      if (!elements.length) {
        return;
      }

      gsap.timeline({
        paused: true,
        scrollTrigger: {
          trigger: section,
          start: '10% 80%',
          end: '20% 90%',
        },
      }).to(elements, {
        opacity: 1,
        duration: 0.8,
        y: '0%',
        stagger: 0.2,
      });
    });
  });
  cleanupFns.push(() => gsapContext.revert());

  const faqAccordion = document.querySelectorAll<HTMLElement>('.faq-accordion');
  const faqHandlers: Array<{ button: HTMLElement; handler: () => void }> = [];
  faqAccordion.forEach((button) => {
    const handler = () => {
      button.classList.toggle('active');
      const content = button.nextElementSibling;
      const icon = button.querySelector('.bi-plus');

      if (!(content instanceof HTMLElement) || !icon) {
        return;
      }

      const iconElement = icon as HTMLElement;

      if (content.style.maxHeight === '240px') {
        content.style.maxHeight = '0px';
        content.style.padding = '0px 18px';
        iconElement.style.transform = 'rotate(0deg)';
      } else {
        content.style.maxHeight = '240px';
        content.style.padding = '20px 18px';
        iconElement.style.transform = 'rotate(45deg)';
      }
    };

    faqHandlers.push({ button, handler });
    button.addEventListener('click', handler);
  });
  cleanupFns.push(() => {
    faqHandlers.forEach(({ button, handler }) => {
      button.removeEventListener('click', handler);
    });
  });

  window.toggleHeader = toggleHeader;
  cleanupFns.push(() => {
    if (window.toggleHeader === toggleHeader) {
      delete window.toggleHeader;
    }
  });

  return () => {
    if (headerClickListenerBound) {
      window.removeEventListener('click', onHeaderClickOutside);
    }
    cleanupFns.reverse().forEach((fn) => {
      try {
        fn();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(err);
      }
    });
  };
}