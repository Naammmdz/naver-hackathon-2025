type ChangeHandler = (value: string) => void;

export class Dropdown {
  private dropdown: HTMLElement;
  private toggleButton: HTMLElement | null;
  private menu: HTMLElement | null;
  private lists: NodeListOf<HTMLLIElement>;
  private dropDownInput: HTMLInputElement | null;
  private onChange?: ChangeHandler;
  private readonly handleToggle: (event: MouseEvent) => void;
  private readonly handleDocumentClick: (event: MouseEvent) => void;
  private readonly itemHandlers: Map<HTMLLIElement, () => void>;

  constructor(selector: string, onChange?: ChangeHandler) {
    const dropdown = document.querySelector<HTMLElement>(selector);
    if (!dropdown) {
      throw new Error(`Dropdown target ${selector} not found`);
    }
    this.dropdown = dropdown;
    this.toggleButton = dropdown.querySelector<HTMLElement>('.dropdown-toggle');
    this.menu = dropdown.querySelector<HTMLElement>('.dropdown-menu');
    this.lists = dropdown.querySelectorAll<HTMLLIElement>('li');
    this.dropDownInput = dropdown.querySelector<HTMLInputElement>('.dropdown-input');
    this.onChange = onChange;

    this.handleToggle = this.toggleDropdown.bind(this);
    this.handleDocumentClick = this.onDocumentClick.bind(this);
    this.itemHandlers = new Map();

    this.toggleButton?.addEventListener('click', this.handleToggle);
    document.addEventListener('click', this.handleDocumentClick);

    this.lists.forEach((item) => {
      const handler = () => this.selectItem(item);
      this.itemHandlers.set(item, handler);
      item.addEventListener('click', handler);
    });
  }

  private toggleDropdown() {
    if (!this.menu) {
      return;
    }
    this.menu.style.display = this.menu.style.display === 'block' ? 'none' : 'block';
  }

  private onDocumentClick(event: MouseEvent) {
    if (!this.dropdown) {
      return;
    }
    const target = event.target as Node | null;
    if (!target || !this.dropdown.contains(target)) {
      this.closeDropdown();
    }
  }

  private selectItem(element: HTMLLIElement) {
    const selectedInput = this.toggleButton?.querySelector<HTMLElement>('.dropdown-select-text');
    const selectIcon = this.toggleButton?.querySelector<HTMLImageElement>('.dropdown-select-icon');
    const menuIcon = element.querySelector<HTMLImageElement>('.dropdown-menu-icon');
    const label = element.querySelector<HTMLElement>('.dropdown-text')?.innerText.trim() ?? '';

    if (selectIcon) {
      if (menuIcon) {
        selectIcon.style.visibility = '';
        selectIcon.setAttribute('src', menuIcon.src);
        selectIcon.setAttribute('alt', menuIcon.getAttribute('alt') ?? label);
      } else {
        selectIcon.style.visibility = 'hidden';
      }
    }

    if (selectedInput) {
      selectedInput.innerText = label;
    }

    if (this.dropDownInput) {
      this.dropDownInput.value = label;
    }

    this.onChange?.(label);
    this.closeDropdown();
  }

  private closeDropdown() {
    if (this.menu) {
      this.menu.style.display = 'none';
    }
  }

  destroy() {
    this.toggleButton?.removeEventListener('click', this.handleToggle);
    document.removeEventListener('click', this.handleDocumentClick);

    this.itemHandlers.forEach((handler, item) => {
      item.removeEventListener('click', handler);
    });
    this.itemHandlers.clear();
  }
}

type PromptResponses = Record<string, string>;

export class Prompt {
  private readonly playground: HTMLElement | null;
  private readonly promptWindow: HTMLElement | null;
  private chatModel: string;
  readonly promptList: string[];

  constructor(target: string) {
    this.playground = document.querySelector<HTMLElement>(target);
    this.promptWindow = this.playground?.querySelector<HTMLElement>('.prompt-container') ?? null;
    this.chatModel = 'gpt 4o';
    this.promptList = [];
  }

  setAIModel(model: string) {
    this.chatModel = model.toLowerCase();
  }

  addPrompt(message: string) {
    if (!this.promptWindow || !message) {
      return;
    }

    if (this.promptList.length === 0) {
      this.promptWindow.innerHTML = '';
    }

    this.promptList.push(message);

    const text = document.createElement('div');
    text.classList.add(
      'tw-w-fit',
      'tw-ml-auto',
      'tw-p-2',
      'tw-rounded-xl',
      'tw-bg-gray-100',
      'dark:tw-bg-[#171717]',
    );
    text.innerText = message;

    const promptElement = `
      <div class="tw-w-full tw-flex tw-p-2">
        ${text.outerHTML.toString()}
      </div>
    `;

    this.promptWindow.innerHTML += promptElement;

    window.setTimeout(() => {
      if (this.promptWindow) {
        this.promptWindow.scrollTop = this.promptWindow.scrollHeight;
      }
    }, 150);

    window.setTimeout(() => this.answer(), 100);
  }

  private answer() {
    if (!this.promptWindow) {
      return;
    }

    const responses: PromptResponses = {
      'gpt 4o': 'Hello from Gpt 4o, add 3 prompts',
      gemini: 'Hello from Gemini, add 3 prompts',
      'llama 3': 'Hello from Meta Llama 3, add 3 prompts',
      claude: 'Hello from Claude, add 3 prompts',
    };

    const fallback = 'Hello from Gpt 4o, add 3 prompts';
    const reply = responses[this.chatModel] ?? fallback;

    const text = document.createElement('div');
    text.classList.add('tw-w-fit', 'tw-mr-auto', 'tw-p-2');
    text.innerText = reply;

    const promptElement = `
      <div class="tw-w-full tw-flex tw-p-2">
        ${text.outerHTML.toString()}
      </div>
    `;

    this.promptWindow.innerHTML += promptElement;
  }
}