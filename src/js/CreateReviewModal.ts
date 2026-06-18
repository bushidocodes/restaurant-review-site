import type { ReviewDraft } from "./types";

export interface CreateReviewModalOptions {
  restaurantID: string | null;
  onSubmit: (postBody: ReviewDraft) => void | Promise<void>;
}

export default class CreateReviewModal {
  onSubmit: (postBody: ReviewDraft) => void | Promise<void>;
  restaurantID: string | null;
  modal: HTMLElement;
  form: HTMLFormElement;
  closeBtn: HTMLElement;
  internalFocusableEls: NodeListOf<HTMLElement>;
  firstFocusableEl: HTMLElement | undefined;
  lastFocusableEl: HTMLElement | undefined;
  focusedElBeforeOpen: HTMLElement | null = null;

  constructor({ restaurantID, onSubmit }: CreateReviewModalOptions) {
    // args
    this.onSubmit = onSubmit;
    this.restaurantID = restaurantID;
    // (handlers passed to addEventListener are arrow-function class fields, so
    // they're already bound to `this` — no manual .bind() needed.)
    // grab DOM
    this.modal = document.querySelector("#create-review") as HTMLElement;
    this.form = document.querySelector("#create-review-form") as HTMLFormElement;
    this.closeBtn = document.querySelector("#close-create-review-modal-btn") as HTMLElement;
    this.internalFocusableEls = this.modal.querySelectorAll<HTMLElement>(
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
    );
    this.firstFocusableEl = this.internalFocusableEls[0];
    this.lastFocusableEl = this.internalFocusableEls[
      this.internalFocusableEls.length - 1
    ];

    // wire up event listeners
    this.internalFocusableEls.forEach(el =>
      el.addEventListener("keydown", this.handleKeyDown)
    );
    this.closeBtn.addEventListener("click", this.closeBtnHandler);
    this.form.addEventListener("submit", this.formSubmissionHandler);
  }
  getFormState() {
    const name = (document.querySelector("#name") as HTMLInputElement).value;
    const rating = (document.querySelector("#rating") as HTMLInputElement).value;
    const comments = (document.querySelector("#comments") as HTMLTextAreaElement).value;
    return {
      name,
      restaurant_id: Number(this.restaurantID),
      rating: Number(rating),
      comments
    };
  }

  clearFormState(): void {
    (document.querySelector("#name") as HTMLInputElement).value = "";
    (document.querySelector("#rating") as HTMLInputElement).value = "";
    (document.querySelector("#comments") as HTMLTextAreaElement).value = "";
  }

  open(): void {
    this.modal.removeAttribute("hidden");
    window.setTimeout(() => {
      this.focusedElBeforeOpen = document.activeElement as HTMLElement | null;
      this.modal.style.transform = "translateY(0)";
      this.firstFocusableEl?.focus();
    }, 50);
  }

  close(): void {
    this.modal.style.transform = "translateY(100vh)";
    this.focusedElBeforeOpen?.focus();
    window.setTimeout(() => {
      this.modal.setAttribute("hidden", "true");
    }, 150);
  }

  closeBtnHandler = (evt: Event): void => {
    evt.preventDefault();
    this.close();
  };

  submitForm(): void {
    const postBody = this.getFormState();
    const nameEl = document.querySelector("#name") as HTMLInputElement;
    const ratingEl = document.querySelector("#rating") as HTMLInputElement;
    const commentsEl = document.querySelector("#comments") as HTMLTextAreaElement;

    if (!postBody.name.trim()) {
      nameEl.setCustomValidity("Please enter your name.");
      nameEl.reportValidity();
      return;
    }
    nameEl.setCustomValidity("");

    if (!postBody.rating || postBody.rating < 1 || postBody.rating > 5) {
      ratingEl.setCustomValidity("Please enter a rating between 1 and 5.");
      ratingEl.reportValidity();
      return;
    }
    ratingEl.setCustomValidity("");

    if (!postBody.comments.trim()) {
      commentsEl.setCustomValidity("Please enter a comment.");
      commentsEl.reportValidity();
      return;
    }
    commentsEl.setCustomValidity("");

    this.close();
    console.log(`[App] Submitting post data`, postBody);
    void this.onSubmit(postBody);
    this.clearFormState();
  }

  formSubmissionHandler = (evt: Event): void => {
    evt.preventDefault();
    this.submitForm();
  };

  // Based on https://bitsofco.de/accessible-modal-dialog/
  handleKeyDown = (e: KeyboardEvent): void => {
    const KEY_TAB = 9;
    const KEY_ESC = 27;
    const KEY_ENTER = 13;

    const handleBackwardTab = () => {
      if (document.activeElement === this.firstFocusableEl) {
        e.preventDefault();
        this.lastFocusableEl?.focus();
      }
    };
    const handleForwardTab = () => {
      if (document.activeElement === this.lastFocusableEl) {
        e.preventDefault();
        this.firstFocusableEl?.focus();
      }
    };

    switch (e.keyCode) {
      case KEY_TAB:
        if (this.internalFocusableEls.length === 1) {
          e.preventDefault();
          break;
        }
        if (e.shiftKey) {
          handleBackwardTab();
        } else {
          handleForwardTab();
        }
        break;
      case KEY_ESC:
        this.close();
        break;
      case KEY_ENTER:
        e.preventDefault();
        this.submitForm();
        break;
      default:
        break;
    }
  };
}
