# 🚀 Complete CI/CD & AWS EC2 Deployment Master Guide

This guide is a complete, beginner-friendly reference for understanding, configuring, and revising your **GitHub Actions CI/CD Pipeline**, **Docker Containerization**, and **AWS EC2 Deployment**.

---

## 📑 Table of Contents
1. [Big Picture Architecture](#1-big-picture-architecture)
2. [GitHub Secrets vs. Variables](#2-github-secrets-vs-variables)
3. [Docker Hub Setup & Personal Access Token (PAT)](#3-docker-hub-setup--personal-access-token-pat)
4. [AWS EC2 Complete Setup Guide](#4-aws-ec2-complete-setup-guide)
5. [AWS Security Group: Inbound Rules Explained](#5-aws-security-group-inbound-rules-explained)
6. [Mapping Credentials to GitHub (Secrets & Variables)](#6-mapping-credentials-to-github-secrets--variables)
7. [Step-by-Step CI/CD Pipeline (`deploy.yml`) Breakdown](#7-step-by-step-cicd-pipeline-deployyml-breakdown)
8. [Testing & Accessing Your Deployed App](#8-testing--accessing-your-deployed-app)
9. [Troubleshooting & Common Errors](#9-troubleshooting--common-errors)

---

## 1. Big Picture Architecture

Whenever you push code to GitHub, the automated pipeline performs the following end-to-end journey:

```
+-------------------------------------------------------------------------------+
| 1. Developer pushes code to GitHub ('main' branch)                           |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| 2. GitHub Actions Runner (Ubuntu Cloud VM)                                    |
|    - Clones your code                                                         |
|    - Installs JDK 21 & builds Spring Boot JAR (./mvnw clean package)          |
|    - Logs in to Docker Hub using DOCKER_USERNAME + DOCKER_PAT                 |
|    - Builds Docker image tagged with commit SHA                               |
|    - Pushes Docker image to Docker Hub repository                             |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| 3. SSH into AWS EC2 Instance                                                  |
|    - Connects via SSH using EC2_HOST, EC2_USERNAME, and EC2_SSH_KEY           |
|    - Stops & removes any old running container                                |
|    - Pulls new Docker image from Docker Hub                                   |
|    - Runs new container in background on port 8080                            |
|    - Prunes old unused Docker images                                          |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
| 4. User Accesses Todo App in Web Browser at http://<EC2_PUBLIC_IP>:8080      |
+-------------------------------------------------------------------------------+
```

---

## 2. GitHub Secrets vs. Variables

### What are they and why do we need them?
When building automated pipelines, your workflow needs sensitive information (like passwords, SSH private keys, and API tokens) and non-sensitive information (like usernames, IP addresses, and container names).

- **Never hardcode credentials** directly in your workflow file or source code. If your repository is public or shared, anyone could access your AWS servers and Docker accounts.
- GitHub provides **Secrets** and **Variables** to store these values securely outside your code.

| Feature | **Secrets** (`${{ secrets.NAME }}`) | **Variables** (`${{ vars.NAME }}`) |
| :--- | :--- | :--- |
| **Purpose** | For sensitive, confidential credentials. | For non-sensitive configuration values. |
| **Visibility** | **Encrypted**. Value is masked (`***`) in build logs. Once saved, you cannot view it again (only update or delete). | **Plain text**. Visible in repo settings and build logs. |
| **Examples** | Docker PAT, EC2 SSH Private Key (`.pem`), Database passwords, API keys. | Docker username, EC2 Public IP, EC2 SSH username (`ubuntu`), Port numbers. |

### How to Create Them in GitHub (Step-by-Step)

1. Open your repository on GitHub.
2. Click on **Settings** (gear icon near top right).
3. In the left sidebar, scroll down to **Secrets and variables** -> click **Actions**.
4. You will see two tabs:
   - **Secrets tab**: Click **New repository secret** -> Enter Name & Secret value -> Click **Add secret**.
   - **Variables tab**: Click **New repository variable** -> Enter Name & Value -> Click **Add variable**.

### How to Use Them in Workflow YAML
- **Secret syntax**: `${{ secrets.YOUR_SECRET_NAME }}`
- **Variable syntax**: `${{ vars.YOUR_VARIABLE_NAME }}`

---

## 3. Docker Hub Setup & Personal Access Token (PAT)

### What is Docker Hub PAT and Why Do We Need It?
- A **Personal Access Token (PAT)** is an alternative password specifically designed for automated tools, scripts, and CI/CD pipelines.
- **Why not use your normal account password?**
  1. **Security**: If a token is compromised, you can revoke just that single token without changing your main account password.
  2. **Scoped Permissions**: You can restrict the token to read-only or read/write access.
  3. **Two-Factor Authentication (2FA)**: Normal passwords fail in automated CLI logins if you have 2FA enabled; PATs bypass 2FA safely for automation.

### How to Generate a Docker Hub PAT (Step-by-Step)
1. Go to [https://hub.docker.com](https://hub.docker.com) and log in.
2. Click your **username / profile avatar** in the top right corner -> Select **Account Settings**.
3. In the left sidebar, click **Security** (or **Personal access tokens**).
4. Click the blue **New Access Token** button.
5. Fill in the details:
   - **Access Token Description**: e.g., `github-actions-todo-app`
   - **Access permissions**: Choose **Read & Write** (needed to push Docker images).
6. Click **Generate**.
7. **Important**: Copy the generated token string immediately! (You won't be able to see it again).
8. Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions** -> **Secrets** -> Add secret named `DOCKER_PAT` with this token value.

---

## 4. AWS EC2 Complete Setup Guide

### Step A: Create and Launch an EC2 Instance on AWS
1. Log in to [AWS Management Console](https://console.aws.amazon.com) and open the **EC2 Dashboard**.
2. Click **Launch instance**.
3. **Name**: `todo-app-server` (or any name you prefer).
4. **Application and OS Images (AMI)**: Choose **Ubuntu** (Ubuntu Server 22.04 LTS or 24.04 LTS).
5. **Instance type**: `t2.micro` (Free tier eligible) or `t3.micro`.
6. **Key pair (login)**:
   - Click **Create new key pair**.
   - Key pair name: `todo-app-key`
   - Key pair type: **RSA**
   - Private key file format: **`.pem`**
   - Click **Create key pair**. *The `.pem` file will be downloaded to your computer. Keep it safe!*
7. **Network settings**:
   - Check **Allow SSH traffic from Anywhere (`0.0.0.0/0`)**.
   - Check **Allow HTTP traffic from the internet**.
8. **Configure storage**: Default `8 GiB gp3` or `10 GiB` is sufficient.
9. Click **Launch instance**.

---

### Step B: Connect to Your EC2 Instance via SSH
Open your computer terminal (macOS/Linux) or PowerShell (Windows), navigate to where your `.pem` file is downloaded, and run:

```bash
# 1. Set correct read permissions on the private key (macOS/Linux)
chmod 400 todo-app-key.pem

# 2. Connect via SSH to the instance
ssh -i todo-app-key.pem ubuntu@<YOUR_EC2_PUBLIC_IP>
```

---

### Step C: Install and Start Docker on EC2
Once connected to the EC2 terminal, run these commands:

```bash
# 1. Update existing package lists
sudo apt update -y

# 2. Install Docker Engine
sudo apt install -y docker.io

# 3. Start the Docker service
sudo systemctl start docker

# 4. Enable Docker to start automatically whenever EC2 instance reboots
sudo systemctl enable docker

# 5. Add 'ubuntu' user to the docker group (allows running docker without typing 'sudo')
sudo usermod -aG docker ubuntu

# 6. Verify Docker installation and status
docker --version
sudo systemctl status docker
```

*(Optional: Run `exit` to disconnect and reconnect via SSH so that docker group permissions take effect).*

---

## 5. AWS Security Group: Inbound Rules Explained

An AWS Security Group acts as a virtual firewall controlling inbound (incoming) and outbound (outgoing) traffic.

### Which Inbound Rules Are Required?

| Type | Protocol | Port Range | Source | Why is this rule needed? |
| :--- | :--- | :--- | :--- | :--- |
| **SSH** | TCP | `22` | `0.0.0.0/0` (Anywhere) | Allows GitHub Actions runner (and your local terminal) to connect to EC2 via SSH to execute deployment commands. |
| **Custom TCP** | TCP | `8080` | `0.0.0.0/0` (Anywhere) | Your Spring Boot Todo container exposes port `8080`. This allows you, web browsers, and API clients to access the app over HTTP. |

### How to Add / Edit Inbound Rules in AWS Console:
1. In EC2 Dashboard, click on **Instances** and select your running instance.
2. Scroll down and click on the **Security** tab.
3. Click on the link under **Security groups** (e.g., `launch-wizard-1` or `sg-xxxxxx`).
4. Click **Edit inbound rules**.
5. Click **Add rule**:
   - **Rule 1**: Type `SSH` | Port `22` | Source `0.0.0.0/0`
   - **Rule 2**: Type `Custom TCP` | Port `8080` | Source `0.0.0.0/0`
6. Click **Save rules**.

---

## 6. Mapping Credentials to GitHub (Secrets & Variables)

Here is the exact checklist of variables and secrets needed for the workflow:

```
GitHub Repository -> Settings -> Secrets and variables -> Actions
```

### 1. Variables (`Variables` tab)
| Variable Name | Where to find value | Example |
| :--- | :--- | :--- |
| `EC2_HOST` | AWS EC2 Console -> Instances -> Click your instance -> Copy **Public IPv4 address** (e.g., `54.210.34.120`). | `54.210.34.120` |
| `EC2_USERNAME` | Default SSH username based on your chosen AMI: <br>• Ubuntu AMI: `ubuntu`<br>• Amazon Linux AMI: `ec2-user`<br>• Debian AMI: `admin` | `ubuntu` |
| `DOCKER_USERNAME` | Your Docker Hub account username. | `canzova` |

### 2. Secrets (`Secrets` tab)
| Secret Name | Where to find value / How to get it | What to paste |
| :--- | :--- | :--- |
| `EC2_SSH_KEY` *(or `EC2_PASSWORD`)* | Open your downloaded `.pem` key file in a text editor (e.g., VS Code, Notepad, or `cat todo-app-key.pem`). | Copy the **entire text content**, including headers: <br>`-----BEGIN RSA PRIVATE KEY-----`<br>`MIIEowIBAAKCAQEA...`<br>`-----END RSA PRIVATE KEY-----` |
| `DOCKER_PAT` | Generated from Docker Hub -> Account Settings -> Security -> Personal access tokens. | The token string generated (e.g., `dckr_pat_xxxxxx`). |

---

## 7. Step-by-Step CI/CD Pipeline (`deploy.yml`) Breakdown

Here is what happens during every step of `.github/workflows/deploy.yml`:

```yaml
# ==============================================================================
# Workflow Name & Triggers
# ==============================================================================
name: todo-app-ci-cd

on:
  workflow_dispatch:        # Allows manual trigger via 'Run workflow' button in GitHub UI
  push:
    branches:
      - main                # Automatically triggers on every git push to 'main' branch

env:
  IMAGE_TAG: ${{ github.sha }}   # Tags Docker image with unique git commit hash
  CONTAINER_NAME: todo-app       # Standard name for running container on EC2

jobs:
  build:
    name: Select the VM
    runs-on: ubuntu-latest       # Spin up a clean Ubuntu virtual machine in GitHub cloud

    steps:
      # Step 1: Checkout repository code into the runner VM workspace
      - name: checkout repository
        uses: actions/checkout@v4

      # Step 2: Install Java JDK 21 (Eclipse Temurin) and cache Maven dependencies for speed
      - name: Setting up java
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
          cache: maven

      # Step 3: Grant execute permission to wrapper and build JAR package without database dependency
      - name: Build your app
        run: |
          chmod +x ./mvnw
          ./mvnw clean package

      # Step 4: Authenticate GitHub Actions runner with Docker Hub registry
      - name: Login in to docker hub
        uses: docker/login-action@v3
        with:
          username: ${{ vars.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PAT }}

      # Step 5: Build Docker container image tagged with commit SHA
      - name: Build docker image
        run: |
          docker build -t ${{ vars.DOCKER_USERNAME }}/todo-app:${{ env.IMAGE_TAG }} .

      # Step 6: Push Docker container image to Docker Hub
      - name: Push docker image to dockerHub
        run: |
          docker push ${{ vars.DOCKER_USERNAME }}/todo-app:${{ env.IMAGE_TAG }}
          echo "Image pushed: ${{ vars.DOCKER_USERNAME }}/todo-app:${{ env.IMAGE_TAG }}"

      # Step 7: Connect to AWS EC2 via SSH and deploy container
      - name: Deploying code to EC2
        uses: appleboy/ssh-action@v1.2.2
        with:
          host: ${{ vars.EC2_HOST }}
          username: ${{ vars.EC2_USERNAME }}
          key: ${{ secrets.EC2_SSH_KEY || secrets.EC2_PASSWORD }}
          script: |
            # 1. Stop currently running container ('|| true' avoids error if container doesn't exist yet)
            sudo docker stop ${{ env.CONTAINER_NAME }} || true

            # 2. Delete stopped container to free up port 8080 and container name
            sudo docker rm ${{ env.CONTAINER_NAME }} || true

            # 3. Pull latest Docker image from Docker Hub
            sudo docker pull ${{ vars.DOCKER_USERNAME }}/todo-app:${{ env.IMAGE_TAG }}

            # 4. Run new container in background (-d), auto-restart on reboot, forward port 8080
            sudo docker run -d --name ${{ env.CONTAINER_NAME }} --restart unless-stopped -p 8080:8080 ${{ vars.DOCKER_USERNAME }}/todo-app:${{ env.IMAGE_TAG }}

            # 5. Clean up old/unused images so EC2 hard drive never runs out of space
            sudo docker image prune -f
```

---

## 8. Testing & Accessing Your Deployed App

Once the GitHub Actions workflow finishes with a green checkmark:

### 1. Access in Web Browser
Open your browser and navigate to:
```
http://<YOUR_EC2_PUBLIC_IP>:8080/api/todos
```

### 2. Test via cURL (Terminal)
```bash
# Create a new Todo
curl -X POST http://<YOUR_EC2_PUBLIC_IP>:8080/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Deploy to AWS","description":"CI/CD pipeline test","priority":"HIGH"}'

# Fetch all Todos
curl http://<YOUR_EC2_PUBLIC_IP>:8080/api/todos
```

---

## 9. Troubleshooting & Common Errors

| Error Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **`ssh: handshake failed`** or **`dial tcp: i/o timeout`** | 1. Inbound Security Group rule missing for port 22.<br>2. `EC2_HOST` contains wrong IP or private IP. | 1. Ensure EC2 Security Group has Port `22` open to `0.0.0.0/0`.<br>2. Use the **Public IPv4 address** from AWS EC2 Console. |
| **`ssh: key is invalid`** | SSH private key (`.pem`) was pasted incorrectly. | Ensure you copy the **entire** `.pem` file content including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`. Do not wrap with extra quotes. |
| **`pull access denied` on EC2** | Docker repository is **Private** and EC2 is not logged into Docker Hub. | Either make your repository **Public** on Docker Hub, or add a `docker login` step inside the SSH script on EC2. |
| **Browser cannot load `http://<IP>:8080`** | Port `8080` is blocked by AWS Security Group. | Go to AWS Security Group -> Edit Inbound Rules -> Add **Custom TCP**, Port `8080`, Source `0.0.0.0/0`. |
| **`docker: command not found` on EC2** | Docker is not installed on the EC2 instance. | Connect to EC2 via SSH and run: `sudo apt update && sudo apt install -y docker.io && sudo systemctl enable --now docker`. |
