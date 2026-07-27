"use client";

interface Props {
  targetName: string;
  formId: string;
}

// Toggles every checkbox with `form="formId"` and `name="targetName"` — those
// checkboxes live inside <details> rows, not inside the bulk-action <form>
// itself (HTML forms can't nest), so they're linked via the `form` attribute.
export function SelectAllCheckbox({ targetName, formId }: Props) {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      className="h-4 w-4 rounded border-gray-300"
      onChange={(e) => {
        const checked = e.currentTarget.checked;
        document
          .querySelectorAll<HTMLInputElement>(`input[form="${formId}"][name="${targetName}"]`)
          .forEach((box) => { box.checked = checked; });
      }}
    />
  );
}
