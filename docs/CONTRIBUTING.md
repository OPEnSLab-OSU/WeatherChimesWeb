# Contributing Guide

How to set up, code, test, review, and release so contributions meet our Definition of Done.

## Code of Conduct

Contributors to this project are required to be open and accommodating for everyone.

**Accommodation Process:**
For major problems or concerns, communicate with the team first and foremost. Secondly, address the situation with Chet and Birat, and see to their recommendations. Finally, communicate any important information with Professor Ulbrich and Professor Winters.

**Barriers:**
Barriers should be addressed similarly to that of accommodations. We should pursue feedback from Chet and Birat to see if we can implement more inclusive strategies, if any barriers arise. 

## Getting Started

### Prerequisites
Ensure you have the following installed:
- [Node.js — Download Node.js®](https://nodejs.org/)

### Environment Setup
1. Clone this repository:
   ```sh
   git clone https://github.com/OPEnSLab-OSU/WeatherChimesWeb.git
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create the .env (secrets) file

   At the root of the repository, create a file called ".env". The Node.js server will use the credentials you place in this file to connect to the MongoDB database.
   In this file, create a secret variable called URI like so:
   ```sh
   URI="mongodb+srv://<username>:<password>@<cluster-name>.<unique-cluster-variable>.mongodb.net/?retryWrites=true&w=majority"
   ```

4. Run the server:
   ```sh
   node server.js
   ```

5. Open `http://localhost:3000` in a web browser.

> ⚠️ Note: Microsoft Edge may suffer performance issues when running on battery power. Plug in or use another browser if audio playback becomes choppy/disfunctional.

## Branching & Workflow

Default branch (automatically updates server): main
Developer branch: dev
Branch flow: <feature branch> → (Pull Request) → dev → (Review by Chet/Tess) → main 


## Issues & Planning

We implement new issues as we develop new features and encounter new challenges. We will add them to our Ear2Earth Capstone GitHub project, and update them along the backlog accordingly. Furthermore, we will establish due dates as we see fit, but we will remain open to updating them as new problems arise.


## Commit Messages

State the convention (e.g., Conventional Commits), include examples, and how to reference issues.

```bash
git commit -m "<short description of affected feature>"
```
Examples:
```bash
git commit -m "add /date-range endpoint"
git commit -m "correct timestamp parsing for ISO format"
git commit -m "update setup steps"
```
Link issues with issue number:
```bash
git commit -m "correct date aggregation query (#42)"
```

## Code Style, Linting & Formatting

### Linter
- **Tool:** ESLint
- **Config:** `eslint.config.mjs` (flat config format)
- **Check:** `npm run lint`
- **Auto-fix:** `npm run lint:fix`

### Formatter
- **Tool:** Prettier
- **Config:** `.prettierrc.json`
- **Check:** `npm run format:check`
- **Auto-format:** `npm run format`

Run both before committing:
```bash
npm run lint
npm run format:check
```

## Testing

### Test Framework
- **Tool:** Vitest
- **Location:** `tests/` directory
- **Run tests:** `npm run test`
- **Watch mode:** `npm run test:watch`
- **Coverage:** `npm run test:coverage` (minimum 80%)

* Functional Testing
   * Unit: Test individual code and feature components
   * Integrations: Data retrieval, plotting, and sonification should work together seamlessly
   * System: Test fully integrated software both locally and when deployed
   * Regression: Test after each feature integration

* Non-Functional Testing
   * Performance: Test load, stress, and user capacity
   * Security: Test and ensure safe data handling/user interaction
   * Usability: Test user friendliness (user experience testing) 

## Pull Requests & Reviews

### Checklist before opening a PR:
- Branch up to date with dev
- ESLint passes (`npm run lint`)
- Prettier formatting applied (`npm run format`)
- Tests pass (`npm run test`)
- Documentation updated
- Linked issue number included

### Approvals Required:
- At least 1 teammate review and approval from project partner
- Project partner decides when we can push to main
- All merges done via "Squash and Merge" for clean history


## CI/CD

### CI Pipeline
- **Tool:** GitHub Actions
- **Workflow:** `.github/workflows/ci.yml`
- **Config location:** Currently on `testing` branch
- **Triggers:**
  - Push to `testing` branch
  - Pull requests to `dev` and `main`

### Checks Performed
- ESLint (code quality)
- Prettier (code formatting)
- Vitest (tests)
- npm audit (security vulnerabilities)

### Viewing CI Results
Go to: https://github.com/OPEnSLab-OSU/WeatherChimesWeb/actions

### Current Status
CI configured and running on `testing` branch. Will be merged to `dev` and `main` through standard PR workflow when team is ready for production deployment.

## Security & Secrets


Required secrets:
 - MongoDB connection string in .env file stored with secret database integration methods (pending) 

Prohibited patterns:
 - Public .env file
 - Public collaborator credentials (passwords, personal account information, etc.)
 - Never commit sensitive data to repository

If secrets are accidentally exposed:
 1. Notify the team
 2. Revoke credentials (change MongoDB password)
 3. Remove from Git history if committed
 4. Update .env files with new credentials
 5. Report  to stakeholders if secrets were exposed

## Documentation Expectations

* Update relevant documentation in /docs/ or README as needed
* Add or update code comments for complex logic
* Use docstrings to explain function parameters and return values
* Maintain consistent tone and provide concise explanations
* Document any breaking changes or new features in CHANGELOG.md
* Update API documentation if endpoints or data structures change
* Include inline comments explaining "why" not just "what" for complex code



## Release Process

Our versioning scheme will be formatted as the following:
[“##”].[“##”].[“##”]
Updates to the first number will occur when we make changes to the application that are not compatible with previous versions.
Updates to the second number will occur when we make functionality changes that are compatible with the previous version of the application.
Updates to the third number will occur when we implement bug-fixes and minor changes.

We will update a changelog file upon each update to the application, detailing new features.


Our code is automatically deployed to the Ear2Earth website upon being pushed to the ‘main’ branch. The server handles the packaging and publishing steps from that point.

If any major bugs or problems arise, requiring us to re-deploy a previous version of the application, we will use git’s built-in functionality to do so. 
