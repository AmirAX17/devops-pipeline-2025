pipeline {
  agent any

  options {
    skipDefaultCheckout(true)
    timestamps()
  }

  // Poll every 2 minutes (you can use "* * * * *" for every minute)
  triggers {
    pollSCM('H/2 * * * *')
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
        script {
          // Detect current branch name on Windows (no sed/head)
          def br = bat(
            script: 'for /f "delims=" %%i in (\'git rev-parse --abbrev-ref HEAD\') do @echo %%i',
            returnStdout: true
          ).trim()
          env.REMOTE_BRANCH = br
          echo "REMOTE_BRANCH=${env.REMOTE_BRANCH}"
        }
      }
    }

    stage('Build & Test') {
      steps {
        dir('app') {
          bat 'node -v'
          bat 'npm -v'
          bat 'npm ci || npm install'
          // Keep tests non-blocking for demo; remove "|| exit /b 0" if you want failures to stop the build
          bat 'npm test || exit /b 0'
        }
      }
    }

    stage('Deploy to TEST') {
      when { expression { env.REMOTE_BRANCH == 'dev' } }
      steps {
        // Run your Windows deploy script for TEST
        bat 'call scripts\\deploy.bat test'
      }
    }

    stage('Smoke Test (TEST)') {
      when { expression { env.REMOTE_BRANCH == 'dev' } }
      steps {
        // Health JSON check using PowerShell (expects {"status":"ok"})
        bat 'powershell -Command "$r=Invoke-RestMethod http://localhost:3001/health; if ($r.status -ne \\"ok\\") { exit 1 }"'

        // Save first 20 lines of /metrics to a file
        bat 'powershell -Command "(Invoke-WebRequest http://localhost:3001/metrics).Content -split \\\"`n\\\" | Select-Object -First 20 | Set-Content -Path metrics_head_test.txt"'

        archiveArtifacts artifacts: 'metrics_head_test.txt', onlyIfSuccessful: true
      }
    }

    stage('Approve PROD Deploy') {
      when { expression { env.REMOTE_BRANCH == 'main' } }
      steps {
        input message: 'Deploy to PROD?', ok: 'Ship it'
      }
    }

    stage('Deploy to PROD') {
      when { expression { env.REMOTE_BRANCH == 'main' } }
      steps {
        bat 'call scripts\\deploy.bat prod'
      }
    }

    stage('Smoke Test (PROD)') {
      when { expression { env.REMOTE_BRANCH == 'main' } }
      steps {
        // Health JSON check on PROD
        bat 'powershell -Command "$r=Invoke-RestMethod http://localhost:3002/health; if ($r.status -ne \\"ok\\") { exit 1 }"'

        // Capture first 20 lines of PROD metrics
        bat 'powershell -Command "(Invoke-WebRequest http://localhost:3002/metrics).Content -split \\\"`n\\\" | Select-Object -First 20 | Set-Content -Path metrics_head_prod.txt"'

        archiveArtifacts artifacts: 'metrics_head_prod.txt', onlyIfSuccessful: true
      }
    }

  } // stages

  post {
    always {
      echo "Build finished."
    }
  }
}
