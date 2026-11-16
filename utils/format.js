const amountFormatter = new Intl.NumberFormat('en', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});
const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'
});
const monthFormatter = new Intl.DateTimeFormat('en-GB', {
  month: 'long', year: 'numeric', timeZone: 'UTC'
});

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatAmount(cents) {
  return amountFormatter.format(cents / 100);
}

function formatDate(date) {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

function formatMonth(month) {
  return monthFormatter.format(new Date(`${month}-01T00:00:00Z`));
}

module.exports = { today, formatAmount, formatDate, formatMonth };
