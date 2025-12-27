# Standard Operating Procedures

## Quick Links
- [Main Site](https://ear2earth.com/)
- [Dev Site](https://dev.ear2earth.com/)


## Communication

| Venue | Channel | Purpose |
|---|---|---|
| Discord | [Group Server](https://discord.gg/uEd292tN6k) | For all implementation related discussions |
| Email | [Dr. Chet Udell](udellc@oregonstate.edu) | Project Owner - Please reach out to Dr. Udell for all contribution permissions and feature questions |
| Email | [Tess Ellis](elliste@oregonstate.edu) | If Dr. Udell is unavailable, feel free to reach out with any questions |


## Planning & Communication (Before Coding)
| Step | Action |
|---|---|
| **1.1** | Get necessary contribution permissions from Dr. Udell 
| **1.2** | Communicate with the team (in Discord) about the feature you plan to implement
| **1.3** | Open a new feature branch for contribution

## Technical Workflow (During Coding)
| Step | Action |
|---|---|
| **2.1** | Avoid file overlaps and merge conflicts by communicating to the team when and on which files you are actively working on
| **2.2** | Make **frequent pull requests** (during each work cycle) to avoid merge conflicts
| **2.3** | Commit changes in small logical parts with clear commit messages
| **2.4** | Document your code with detailed comments so that other contributors can understand the logic behind your implementation
| **2.5** | Feature branches should not be active for more than 2-3 days to avoid merge conflicts

## Code Review and Merging (After Coding)
| Step | Action |
|---|---|
| **3.1** | Once the feature is complete, submit a pull request to the **dev branch only** (features can only be pushed to main after Dr. Chet's approval)
| **3.2** | The PR must receive at least one approval from a peer and pass all Continuous Integration (CI) tests before merging to the dev branch
| **3.3** | Communicate with the team once the PR has been approved so the dev site may be tested and approval can be given for merges to main
