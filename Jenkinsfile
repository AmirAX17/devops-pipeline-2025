pipeline {
  agent any

  options {
    skipDefaultCheckout(true)
    timestamps()
  }

  triggers {
    // Polling is fine for local Jenkins
    pollSCM('H/2 * * * *')
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script {
          // Determine the current branch name in a single-branch Pipeline job
          env.CURRENT_BRANCH = sh(
            script: 'git rev-parse --abbrev-ref HEAD',
            returnStdout: true
          ).trim()
          echo "CURRENT_BRANCH=${env.CURRENT_BRANCH}"
        }
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
      when { expression { env.CURRENT_BRANCH == 'dev' } }
      steps {
        sh 'chmod +x scripts/deploy.sh'
        sh './scripts/deploy.sh test'
      }
    }

    stage('Smoke Test (TEST)') {
      when { expression { env.CURRENT_BRANCH == 'dev' } }
      steps {
        sh 'curl -fsS http://localhost:3001/health | tee smoke_test_output_test.txt'
        archiveArtifacts artifacts: 'smoke_test_output_test.txt', onlyIfSuccessful: false, allowEmptyArchive: true
      }
    }

    // Manual approval only on main
    stage('Approve PROD Deploy') {
      when { expression { env.CURRENT_BRANCH == 'main' } }
      steps {
        input message: 'Deploy to PROD?', ok: 'Ship it'
      }
    }

    stage('Deploy to PROD') {
      when { expression { env.CURRENT_BRANCH == 'main' } }
      steps {
        sh 'chmod +x scripts/deploy.sh'
        sh './scripts/deploy.sh prod'
      }
    }

    stage('Smoke Test (PROD)') {
      when { expression { env.CURRENT_BRANCH == 'main' } }
      steps {
        sh 'curl -fsS http://localhost:3002/health | tee smoke_test_output_prod.txt'
        archiveArtifacts artifacts: 'smoke_test_output_prod.txt', onlyIfSuccessful: false, allowEmptyArchive: true
      }
    }
  }

  post {
    always {
      echo "Build finished."
    }
  }
}
