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
      steps {
        sh 'chmod +x scripts/deploy.sh'
        sh './scripts/deploy.sh test'
      }
    }

    stage('Smoke Test (TEST)') {
      steps {
        sh 'curl -fsS http://localhost:3001/health | tee smoke_test_output.txt'
      }
    }
  }

  post {
    always {
      echo "Build finished."
      archiveArtifacts artifacts: 'smoke_test_output.txt', onlyIfSuccessful: false
    }
  }
}
