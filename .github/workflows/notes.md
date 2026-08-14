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
| **6** | `Push docker image to dockerHub` | `run: docker push ...` | Uploads the Docker container image to Docker Hub repository. |
| **7** | `Deploying code to EC2` | `appleboy/ssh-action@v1.2.2` | Connects via SSH to EC2, stops old container, pulls new image, and runs the updated container on port 8080. |

---

## 5. EC2 Setup Checklist

To make this CI/CD deployment work smoothly on your AWS EC2 instance, complete the following setup steps:

### Checklist Overview

- [ ] **1. Launch EC2 Instance** (Ubuntu 22.04/24.04 LTS or Amazon Linux 2023).
- [ ] **2. Configure AWS Security Group (Inbound Rules)**:
  - **Port 22 (SSH)**: Source `0.0.0.0/0` (or GitHub runner IPs / your IP) to allow SSH connection from GitHub Actions.
  - **Port 8080 (Custom TCP)**: Source `0.0.0.0/0` so users can access your Spring Boot Todo application in a browser.
- [ ] **3. Install Docker on EC2**:
  ```bash
  # For Ubuntu:
  sudo apt update
  sudo apt install -y docker.io
  sudo systemctl start docker
  sudo systemctl enable docker

  # For Amazon Linux:
  # sudo dnf install -y docker
  # sudo systemctl start docker
  # sudo systemctl enable docker
  ```
- [ ] **4. Add EC2 User to Docker Group (Optional but recommended)**:
  ```bash
  sudo usermod -aG docker ubuntu   # Use 'ec2-user' if on Amazon Linux
  # Log out and log back in for changes to take effect:
  # exit
  ```
- [ ] **5. Test Docker on EC2**:
  ```bash
  docker --version
  docker ps
  ```

---

## 6. GitHub Repository Configuration (Secrets & Variables)

Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**:

### A. Repository Variables (`Variables` tab)
| Variable Name | Example Value | Purpose |
| :--- | :--- | :--- |
| `EC2_HOST` | `54.210.xx.xx` | Public IPv4 address or Public DNS of your EC2 instance. |
| `EC2_USERNAME` | `ubuntu` (or `ec2-user`) | The SSH login user for your EC2 instance AMI. |
| `DOCKER_USERNAME` | `yourdockerhubusername` | Your Docker Hub account username. |

### B. Repository Secrets (`Secrets` tab -> `New repository secret`)
| Secret Name | Content / Value | Purpose |
| :--- | :--- | :--- |
| `EC2_SSH_KEY` *(or `EC2_PASSWORD`)* | Raw content of your `.pem` private key file | Used by `appleboy/ssh-action` to authenticate SSH connection. Must include the header and footer (`-----BEGIN RSA PRIVATE KEY-----` ... `-----END RSA PRIVATE KEY-----`). |
| `DOCKER_PAT` | Docker Hub Personal Access Token | Used by `docker/login-action` to push images. |

---

## 7. Deep Dive: `appleboy/ssh-action` Script Explained

```bash
# 1. Stop currently running container
# '|| true' ensures that if the container doesn't exist yet (e.g. first run), the workflow continues instead of failing
sudo docker stop todo-app || true

# 2. Delete the old container to free up the container name ('todo-app') and port 8080
sudo docker rm todo-app || true

# 3. Download the newly built image tagged with the commit SHA from Docker Hub
sudo docker pull yourusername/todo-app:commit-sha

# 4. Run the container:
#    -d: detached mode (runs in background)
#    --name: assign friendly container name 'todo-app'
#    --restart unless-stopped: container starts automatically if EC2 instance reboots
#    -p 8080:8080: map EC2 port 8080 to container port 8080
sudo docker run -d --name todo-app --restart unless-stopped -p 8080:8080 yourusername/todo-app:commit-sha

# 5. Remove dangling/unused Docker images to prevent EC2 storage from filling up over time
sudo docker image prune -f
```

---

## 8. Common Troubleshooting & Gotchas

1. **`ssh: handshake failed` or `connection timed out`**:
   - Verify EC2 Security Group allows Inbound TCP traffic on **Port 22**.
   - Check if `EC2_HOST` contains the **Public** IPv4 address (not the Private IP `172.x.x.x` or `10.x.x.x`).
   - If using Elastic IP, ensure it hasn't changed.
2. **`key is invalid` or SSH authentication failed**:
   - Ensure you copied the **entire** private key file (`.pem`), including `-----BEGIN ...-----` and `-----END ...-----` with newlines.
   - Do not wrap the secret in quotes when adding it to GitHub Secrets.
3. **`pull access denied` on EC2**:
   - If your Docker Hub repository is **private**, run `echo "${{ secrets.DOCKER_PAT }}" | sudo docker login -u "${{ vars.DOCKER_USERNAME }}" --password-stdin` before pulling on EC2, or make the repository **public** on Docker Hub.
4. **App not accessible in browser (`http://<EC2_PUBLIC_IP>:8080`)**:
   - Ensure Inbound Security Group rule on AWS allows port `8080` from `0.0.0.0/0`.
