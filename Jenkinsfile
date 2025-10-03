pipeline {
  agent any

  options {
    skipDefaultCheckout(true)
    timestamps()
  }

  environment {
    DEV_BRANCH  = 'origin/dev'
    MAIN_BRANCH = 'origin/main'
  }

  triggers {
    // Polling is fine for local Jenkins
    pollSCM('H/2 * * * *')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        // Helpful for debugging branch detection
        sh 'echo GIT_BRANCH="$GIT_BRANCH"'
      }
    }

    stage('Build & Test') {
      steps {
        dir('app') {
          sh 'npm ci || npm install'
          sh 'npm test'
        }
      }
    }

    stage('Deploy to TEST') {
      when { expression { env.GIT_BRANCH == env.DEV_BRANCH } }
      steps {
        sh 'chmod +x scripts/deploy.sh'
        sh './scripts/deploy.sh test'
      }
    }

    stage('Smoke Test (TEST)') {
      when { expression { env.GIT_BRANCH == env.DEV_BRANCH } }
      steps {
        sh 'curl -fsS http://localhost:3001/health | tee smoke_test_output_test.txt'
      }
    }

    stage('Approve PROD Deploy') {
      when { expression { env.GIT_BRANCH == env.MAIN_BRANCH } }
      steps {
        input message: 'Deploy to PROD?', ok: 'Ship it'
      }
    }

    stage('Deploy to PROD') {
      when { expression { env.GIT_BRANCH == env.MAIN_BRANCH } }
      steps {
        sh 'chmod +x scripts/deploy.sh'
        sh './scripts/deploy.sh prod'
      }
    }

    stage('Smoke Test (PROD)') {
      when { expression { env.GIT_BRANCH == env.MAIN_BRANCH } }
      steps {
        sh 'curl -fsS http://localhost:3002/health | tee smoke_test_output_prod.txt'
      }
    }
  }

  post {
    always {
      echo "Build finished."
      // Avoid failure when no smoke file was produced (e.g., building dev but PROD stages skipped)
      archiveArtifacts artifacts: 'smoke_test_output_*.txt', onlyIfSuccessful: false, allowEmptyArchive: true
    }
  }
}
