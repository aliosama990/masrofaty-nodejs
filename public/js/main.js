// After a server-side validation error, return focus to the first invalid field.
const firstInvalidField = document.querySelector('[aria-invalid="true"]');
if (firstInvalidField) firstInvalidField.focus();
