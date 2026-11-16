function field(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function positiveId(value) {
  const id = Number(value);
  return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(id) ? id : null;
}

function validMonth(value) {
  return /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !validMonth(value.slice(0, 7))) return false;

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateExpense(body, categories) {
  const values = {
    title: field(body.title),
    amount: field(body.amount),
    categoryId: field(body.categoryId),
    date: field(body.date),
    description: field(body.description)
  };
  const errors = {};

  if (!values.title || values.title.length > 100) {
    errors.title = 'Enter a title between 1 and 100 characters.';
  }

  // Convert the whole and fractional parts separately to avoid float rounding.
  const decimal = values.amount.replace(/^\./, '0.');
  const amountParts = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(decimal);
  const amountCents = amountParts
    ? Number(amountParts[1]) * 100 + Number((amountParts[2] || '').padEnd(2, '0'))
    : 0;
  if (amountCents <= 0) {
    errors.amount = 'Enter an amount from 0.01 to 9,999,999.99 with up to two decimal places.';
  }

  const categoryId = positiveId(values.categoryId);
  if (!categories.some((category) => category.id === categoryId)) {
    errors.categoryId = 'Choose an existing category.';
  }
  if (!validDate(values.date)) errors.date = 'Enter a valid expense date.';
  if (values.description.length > 500 || Array.isArray(body.description)) {
    errors.description = 'Enter one description of up to 500 characters.';
  }

  const expense = {
    title: values.title,
    amountCents,
    categoryId,
    date: values.date,
    description: values.description
  };
  return { values, errors, expense };
}

module.exports = { field, positiveId, validMonth, validateExpense };
