# Continuous Integration (CI)

This repository uses GitHub Actions. On every push and pull request, CI:

1. Runs the backend tests and packages the application with Java 17.
2. Installs frontend dependencies, runs the tests, and builds the frontend with Node.js 22.
3. Rejects tracked local configuration, `.env` files, and credential text files.

CI does not deploy the application or connect to a production database. The database and JWT values in the workflow are test placeholders; no repository secrets are required to run these checks.

## Enable CI

The workflow starts automatically after a push or pull request if GitHub Actions is enabled for the repository. If GitHub prompts you to enable Actions, do so on the repository's **Actions** page.

## Run the same checks locally

From the repository root, run these commands in PowerShell:

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd package -DskipTests

cd ..\frontend
npm ci --legacy-peer-deps
$env:CI = 'true'
npm test -- --watchAll=false
npm run build
```

## Future deployment automation

If deployment is added later, keep database credentials, JWT secrets, and administrator passwords in GitHub Secrets or the destination server's `.env` file. Do not commit them to the repository.
