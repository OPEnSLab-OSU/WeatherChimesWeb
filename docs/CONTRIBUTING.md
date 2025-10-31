# Contributing Guide

How to set up, code, test, review, and release so contributions meet our Definition of Done.

## Code of Conduct

Contributors to this project are required to be open and accommodating for everyone. 

Accommodation Process:
For major problems or concerns, communicate with the team first and foremost. Secondly, address the situation with Chet and Birat, and see to their recommendations. Finally, communicate any important information with Professor Ulbrich and Professor Winters.
Barriers:
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

Describe the workflow (e.g., trunk-based or GitFlow), default branch, branch naming, and when to rebase vs. merge.

Default branch (automatically updates server): main
Developer branch: dev
Branch flow: <feature branch> → (Pull Request) → dev → (Review by Chet/Tess) → main 


## Issues & Planning

Explain how to file issues, required templates/labels, estimation, and triage/assignment practices.

We implement new issues as we develop new features and encounter new challenges. We will add them to our Ear2Earth Capstone GitHub project, and update them along the backlog accordingly. Furthermore, we will establish due dates as we see fit, but we will remain open to updating them as new problems arise.


## Commit Messages

State the convention (e.g., Conventional Commits), include examples, and how to reference issues.

```bash
short description of affected feature
```
Examples:
```bash
add /date-range endpoint
correct timestamp parsing for ISO format
update setup steps
```
Link issues with issue number:
```bash
correct date aggregation query (#42)
```

## Code Style, Linting & Formatting

Name the formatter/linter, config file locations, and the exact commands to check/fix locally.

Linter in progress, we expect to complete this within the next month.

## Testing

Define required test types, how to run tests, expected coverage thresholds, and when new/updated tests are mandatory.
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

Outline PR requirements (template, checklist, size limits), reviewer expectations, approval rules, and required status checks.

Checklist before opening a PR:
Branch up to date with dev
Documentation updated
Linked issue number included
Approvals Required: at least 1 teammate review and approval from project partner
Project partner decides when we can push to main
All merges done via “Squash and Merge” for clean history

## CI/CD

We are currently in the process of establishing our CI/CD pipeline. We expect to be completed with the process by November 7, 2025.

## Security & Secrets

State how to report vulnerabilities, prohibited patterns (hard-coded secrets), dependency update policy, and scanning tools.


Required secrets:
MongoDB connection string in .env file stored with secret database integration methods (pending) 

Prohibited patterns:
Public .env file
Public collaborator credentials (passwords, personal account information, etc.)
Never commit sensitive data to repository

If secrets are accidentally exposed:
Notify the team
Revoke credentials (change MongoDB password)
Remove from Git history if committed
Update .env files with new credentials
Report  to stakeholders if secrets were exposed

## Documentation Expectations

Specify what must be updated (README, docs/, API refs, CHANGELOG) and docstring/comment standards.

Update relevant docs (/docs/ or README)
Add or update code comments and docstrings
Use consistent tone and concise explanations
Include any changes or additions to the application in CHANGELOG.md




## Release Process

Our versioning scheme will be formatted as the following:
[“##”].[“##”].[“##”]
Updates to the first number will occur when we make changes to the application that are not compatible with previous versions.
Updates to the second number will occur when we make functionality changes that are compatible with the previous version of the application.
Updates to the third number will occur when we implement bug-fixes and minor changes.

We will update a changelog file upon each update to the application, detailing new features.


Our code is automatically deployed to the Ear2Earth website upon being pushed to the ‘main’ branch. The server handles the packaging and publishing steps from that point.

If any major bugs or problems arise, requiring us to re-deploy a previous version of the application, we will use git’s built-in functionality to do so. 
