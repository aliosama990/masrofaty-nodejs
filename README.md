# Masrofaty — Expense Tracker

Masrofaty is a personal expense tracker and an intermediate Node.js course project. It uses Express to handle requests, better-sqlite3 to store expenses and categories, and EJS to render HTML on the server. Bootstrap 5, custom CSS, and a small vanilla JavaScript file handle the interface.

## Features

- **Dashboard** with the current month's spending, all-time expense total, transaction count, five most recent expenses, and all-time spending by category.
- **Expense management** with add, list, edit, and confirmed delete. Every expense has an ID, title, amount, category, date, and optional description.
- **Categories** with Food, Transportation, Shopping, Bills, Entertainment, and Other available on startup. You can add your own categories.
- **Search and filters** with partial title matching, category and month filters, and newest- or oldest-first ordering. The filters can be used together.
- **Server-side validation** with field-level errors, escaped text in the rendered pages, and a friendly 404 for missing expenses.

## Run locally

Install [Node.js 22 or newer](https://nodejs.org/en/download), preferably an LTS release. In the project directory, run:

```sh
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). The first start creates `db/masrofaty.sqlite` and inserts the six default categories. The expense ledger starts empty. Your data remains in the same file across restarts. Bootstrap and the font are served locally.

## Project structure

| Path | Purpose |
| --- | --- |
| `app.js` | Configures Express, mounts the routes, and starts the local server. |
| `routes/` | Maps HTTP methods and paths to controllers. |
| `controllers/` | Reads requests, validates input, and chooses a view or redirect. |
| `db/` | Initializes SQLite and runs parameterized queries. |
| `views/` | Renders the pages and shared navigation with EJS. |
| `public/` | Contains the custom styles and validation focus script. |
| `utils/` | Validates input and formats amounts and dates. |
| `test/` | Tests the app through HTTP requests and isolated SQLite databases. |

## How it works

An expense has one category, and a category can contain many expenses. SQLite enforces this relationship through `expenses.category_id` and a foreign key to `categories.id`. Amounts use EGP and are stored as integer hundredths, so `0.10 + 0.20` adds up to exactly `0.30`. Dates are stored as `YYYY-MM-DD`. The current month uses the server's local calendar.

For example, the add-expense form submits to `POST /expenses`. The controller validates the fields and hands the expense to a prepared SQLite statement. On success, it sends an HTTP 303 redirect to the list. Reloading the list then repeats the read request. Edit uses the same form and validation. The delete link opens a confirmation page, and only its POST action removes the record.

## Verify

```sh
npm test
```

The tests cover initialization, persistence, foreign keys, expense CRUD, category creation, validation, filtering, sorting, and dashboard totals. To try the same flow in the browser, add a category and create expenses dated in two different months. Combine the title, category, and month filters, edit one expense, then open and cancel its delete confirmation before confirming the deletion.

## Publish to GitHub

From the project directory, use [GitHub CLI](https://cli.github.com/) to publish the source:

```sh
gh auth login
git init -b main
git add .
git commit -m "Add Masrofaty expense tracker"
gh repo create masrofaty-nodejs --public --source=. --remote=origin --push
```

The `.gitignore` excludes installed packages, SQLite files and their sidecars, and local environment files. Commit `package-lock.json` so other users can install the same dependency versions.
