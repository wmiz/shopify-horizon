import { Component } from "@theme/component";
import { ThemeEvents, CartUpdateEvent } from "@theme/events";

/**
 * A custom element that displays and updates a shipping progress bar.
 *
 * @typedef {object} Refs
 * @property {HTMLElement} message - The progress message element.
 * @property {HTMLElement} fill - The progress bar fill element.
 *
 * @extends {Component<Refs>}
 */
class ShippingProgressBar extends Component {
  requiredRefs = ["message", "fill"];

  /** @type {number} */
  #threshold = 0;

  /** @type {string} */
  #messageTemplate = "";

  connectedCallback() {
    super.connectedCallback();

    this.#threshold = parseInt(this.dataset.threshold || "0", 10);

    // Store the initial message as a template (contains translation)
    if (this.refs.message) {
      const initialMessage = this.refs.message.textContent || "";
      // Extract template by replacing the amount with a placeholder
      // This assumes the amount appears in the message
      this.#messageTemplate = initialMessage;
    }

    this.#updateProgress(parseInt(this.dataset.currentTotal || "0", 10));

    document.addEventListener(ThemeEvents.cartUpdate, this.#handleCartUpdate);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener(
      ThemeEvents.cartUpdate,
      this.#handleCartUpdate
    );
  }

  /**
   * Handles the cart update event.
   * @param {CartUpdateEvent} event - The cart update event.
   */
  #handleCartUpdate = (event) => {
    // @ts-ignore - resource type is not fully defined
    const cartTotal = event.detail.resource?.total_price;
    if (cartTotal !== undefined && typeof cartTotal === "number") {
      this.#updateProgress(cartTotal);
    }
  };

  /**
   * Updates the progress bar based on the current cart total.
   * @param {number} currentTotal - The current cart total in cents.
   */
  #updateProgress(currentTotal) {
    if (!this.#threshold || this.#threshold <= 0) {
      this.classList.add("hidden");
      return;
    }

    const remaining = this.#threshold - currentTotal;
    const progressPercentage = Math.min(
      100,
      (currentTotal / this.#threshold) * 100
    );
    const thresholdReached = remaining <= 0;

    // Update progress bar fill
    if (this.refs.fill) {
      this.refs.fill.style.setProperty("--progress", `${progressPercentage}%`);
      this.refs.fill.setAttribute(
        "aria-valuenow",
        String(Math.round(progressPercentage))
      );
    }

    // Update message
    if (this.refs.message) {
      if (thresholdReached) {
        this.refs.message.textContent = this.#getSuccessMessage();
        this.refs.message.classList.add(
          "shipping-progress-bar__message--success"
        );
        this.setAttribute("data-threshold-reached", "");
      } else {
        this.refs.message.textContent = this.#getProgressMessage(remaining);
        this.refs.message.classList.remove(
          "shipping-progress-bar__message--success"
        );
        this.removeAttribute("data-threshold-reached");
      }
    }

    // Show/hide based on cart state
    if (currentTotal === 0) {
      this.classList.add("hidden");
    } else {
      this.classList.remove("hidden");
    }
  }

  /**
   * Gets the success message when threshold is reached.
   * @returns {string} The success message.
   */
  #getSuccessMessage() {
    // Get from data attribute (set by Liquid with translation)
    const successMessage = this.dataset.successMessage;
    if (successMessage) {
      return successMessage;
    }
    // Fallback
    return "You've unlocked free shipping!";
  }

  /**
   * Gets the progress message showing remaining amount.
   * @param {number} remaining - The remaining amount in cents.
   * @returns {string} The progress message.
   */
  #getProgressMessage(remaining) {
    // Format remaining amount as currency
    const formattedAmount = this.#formatMoney(remaining);

    // Try to use the stored template, replacing the old amount with the new one
    if (this.#messageTemplate) {
      // Find and replace any money amount in the template with the new amount
      // This regex matches common money formats ($X.XX, X.XX, etc.)
      const moneyPattern = /[\$]?[\d,]+\.?\d*/g;
      const updatedMessage = this.#messageTemplate.replace(
        moneyPattern,
        formattedAmount
      );
      return updatedMessage;
    }

    // Fallback if no template available
    return `Add ${formattedAmount} more for free shipping`;
  }

  /**
   * Formats a money value in cents to a currency string.
   * @param {number} cents - The amount in cents.
   * @returns {string} The formatted currency string.
   */
  #formatMoney(cents) {
    // Use Shopify's money format if available
    // @ts-ignore - Shopify global is not in type definitions
    if (window.Shopify && typeof window.Shopify.formatMoney === "function") {
      // @ts-ignore - money_format is not in type definitions
      const moneyFormat =
        window.money_format || window.Shopify.money_format || "${{amount}}";
      // @ts-ignore - formatMoney is not in type definitions
      return window.Shopify.formatMoney(cents, moneyFormat);
    }

    // Fallback formatting - basic dollar formatting
    const dollars = (cents / 100).toFixed(2);
    return `$${dollars}`;
  }
}

if (!customElements.get("shipping-progress-bar")) {
  customElements.define("shipping-progress-bar", ShippingProgressBar);
}
