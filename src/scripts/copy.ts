import { showMessage } from "@/scripts/message";

// Copies the button's data-copy value and says in the status bar how it went
export function bindCopyButtons(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "button[data-copy]"
  )) {
    button.addEventListener("click", async () => {
      const text = button.dataset.copy ?? "";
      const [firstLine = ""] = text.split("\n");
      try {
        await navigator.clipboard.writeText(text);
        showMessage(`copied: ${firstLine}`);
      } catch {
        // No clipboard (an insecure page) or the browser refused
        showMessage("copy failed");
      }
    });
  }
}
