# GitHub Actions CI/CD Pipeline Notes & Revision Guide

This guide provides a reference for building, understanding, and revising GitHub Actions workflows.

---

## 1. Anatomy of a GitHub Actions Workflow

A workflow is an automated process defined by a YAML file in `.github/workflows/`. Below is the fundamental hierarchy:

```
Workflow File (.yml)
├── name: (Workflow Display Name)
├── on: (Triggers / Events)
├── env: (Global Environment Variables)
└── jobs: (Group of 1 or more jobs)
    └── <job_id>: (Unique Job Identifier, e.g. 'build')
        ├── name: (Job Display Name)
        ├── runs-on: (Runner VM OS, e.g. ubuntu-latest)
        ├── env: (Job-level Environment Variables)
        └── steps: (Sequential list of tasks)
            ├── Step 1 (Action or Shell Command)
            ├── Step 2 (Action or Shell Command)
            └── ...
```

---

## 2. Core Configuration Keys Explained

### `name`
- **What it does**: Defines the name of the workflow or step displayed in the GitHub Actions dashboard.
- **Example**:
  ```yaml
  name: todo-app-ci-cd
  ```

---

### `on` (Triggers)
- **What it does**: Specifies the event(s) that trigger the workflow execution.
- **Common triggers**:
  - `push`: Runs whenever commits are pushed to specified branches or tags.
  - `pull_request`: Runs when a PR is opened, updated, or synchronized.
  - `workflow_dispatch`: Adds a manual **"Run workflow"** button in the GitHub Actions web UI.
  - `schedule`: Runs at periodic intervals using cron syntax.
- **Example**:
  ```yaml
  on:
    workflow_dispatch:
    push:
      branches:
        - main
  ```

---

### `env` (Environment Variables)
- **What it does**: Defines key-value pairs accessible to jobs and steps.
- **Scopes**:
  - **Workflow level**: Defined at the root; accessible by all jobs.
  - **Job level**: Defined inside `<job_id>`; accessible only within that job.
  - **Step level**: Defined inside a step; accessible only within that step.
- **Example**:
  ```yaml
  env:
    IMAGE_TAG: ${{ github.sha }}
  ```

---

### `jobs`
- **What it does**: The top-level container for all pipeline jobs.
- **Execution behavior**: By default, multiple jobs inside `jobs` run in **parallel**. You can run them sequentially using `needs: <job_id>`.

---

### `<job_id>` (e.g., `build:`, `deploy:`)
- **What it does**: A unique identifier for the job within the workflow.
- **Properties inside a job**:
  - `name`: Display name shown on the GitHub Actions progress graph.
  - `runs-on`: The virtual machine environment (runner) on which the job will execute.
    - Options: `ubuntu-latest`, `windows-latest`, `macos-latest`, or custom `self-hosted`.
- **Example**:
  ```yaml
  jobs:
    build:
      name: Select the VM
      runs-on: ubuntu-latest
  ```

---

### `steps`
- **What it does**: A list of tasks executed in sequence on the runner VM. If a step fails, subsequent steps are skipped by default.
- **Inside each step**:
  - `name`: Descriptive label for the step shown in the run logs.
  - `uses`: Invokes an existing, reusable action from GitHub Marketplace (e.g., `actions/checkout@v4`).
  - `with`: Passes input parameters/options required by the action specified in `uses`.
  - `run`: Runs custom shell command(s) in the runner terminal.
- **Example**:
  ```yaml
  steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Run Maven Build
      run: |
        chmod +x ./mvnw
        ./mvnw clean package
  ```

---

## 3. GitHub Contexts: Secrets vs. Variables

| Type | Syntax | Usage | Example |
| :--- | :--- | :--- | :--- |
| **Secrets** | `${{ secrets.NAME }}` | Encrypted sensitive data (passwords, tokens, private keys). Masked automatically in logs. | `${{ secrets.DOCKERHUB_PAT }}` |
| **Variables** | `${{ vars.NAME }}` | Non-sensitive configuration values. | `${{ vars.DOCKERHUB_USERNAME }}` |
| **Contexts** | `${{ github.sha }}` | Built-in GitHub metadata (commit SHA, branch, actor, repo). | `${{ github.sha }}` |

---

## 4. `deploy.yml` Step-by-Step Breakdown

| Step # | Step Name | Directive / Action | What it accomplishes |
| :---: | :--- | :--- | :--- |
| **1** | `checkout repository` | `actions/checkout@v4` | Pulls the repository code into the runner VM `$GITHUB_WORKSPACE`. |
| **2** | `Setting up java` | `actions/setup-java@v4` | Installs JDK 21 (Temurin distribution) and enables caching for Maven dependencies. |
| **3** | `Build your app` | `run: ./mvnw clean package` | Grants execute permissions to the wrapper and compiles/packages the Spring Boot JAR file. |
| **4** | `Login in to docker hub` | `docker/login-action@v3` | Authenticates runner with Docker Hub registry using configured username and PAT. |
| **5** | `Build docker image` | `run: docker build ...` | Builds the Docker image and tags it with the commit SHA for versioning. |
| **6** | `Push docker image` | `run: docker push ...` | Uploads the Docker container image to Docker Hub repository. |
